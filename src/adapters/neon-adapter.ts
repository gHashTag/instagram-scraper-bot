import { Pool, QueryResult } from "pg";
import { StorageAdapter } from "../types";
import {
  User,
  Project,
  Competitor,
  Hashtag,
  ReelContent,
  ReelsFilter,
  ParsingRunLog,
  NotificationSettings,
} from "../schemas";
import {
  validateUser,
  validateProject,
  validateCompetitors,
  validateCompetitor,
} from "../utils/validation-zod";

/**
 * Адаптер для работы с базой данных Neon (PostgreSQL)
 * Реализует интерфейс StorageAdapter
 */
export class NeonAdapter implements StorageAdapter {
  private pool?: Pool;

  constructor() {
    // Инициализация пула подключений к Neon с дополнительными настройками
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || "",
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
      // Добавляем настройки для более стабильной работы
      max: 10, // максимальное количество соединений в пуле
      idleTimeoutMillis: 30000, // таймаут для неактивных соединений
      connectionTimeoutMillis: 10000, // таймаут подключения
    });
    console.log("Neon адаптер инициализирован");
  }

  async initialize(): Promise<void> {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL || "",
        ssl: process.env.DATABASE_URL
          ? { rejectUnauthorized: false }
          : undefined,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }

    try {
      // Проверяем соединение
      const client = await this.pool.connect();
      client.release();
      console.log("Подключение к Neon успешно");
    } catch (error) {
      console.error("Ошибка при подключении к Neon:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await this.pool.end();
      console.log("Neon адаптер закрыт");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Called end on pool more than once")
      ) {
        console.log("Соединение с Neon уже закрыто");
      } else {
        console.error("Ошибка при закрытии соединения с Neon:", error);
      }
    } finally {
      this.pool = undefined; // Сбрасываем пул после закрытия
    }
  }

  private ensureConnection(): Pool {
    if (!this.pool) {
      throw new Error(
        "Нет подключения к Neon базе данных. Вызовите initialize() перед использованием адаптера."
      );
    }
    return this.pool;
  }

  /**
   * Безопасно выполняет SQL-запрос, проверяя наличие соединения
   * @param query SQL-запрос
   * @param params Параметры запроса
   * @returns Результат запроса
   */
  private async safeQuery(query: string, params?: any[]): Promise<QueryResult> {
    const pool = this.ensureConnection();
    try {
      return await pool.query(query, params);
    } catch (error) {
      // Логируем ошибку с контекстом
      console.error(
        `[NeonAdapter] Ошибка при выполнении SQL-запроса: ${query}`,
        {
          params,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      // Если это ошибка соединения, пробуем переподключиться
      if (
        error instanceof Error &&
        (error.message.includes("Connection terminated") ||
          error.message.includes("connection closed") ||
          error.message.includes("Connection ended") ||
          error.message.includes("Client has encountered a connection error") ||
          error.message.includes("Cannot use a pool after calling end"))
      ) {
        console.log(
          "[NeonAdapter] Обнаружена ошибка соединения, попытка переподключения..."
        );
        try {
          // Пересоздаем пул соединений
          this.pool = undefined;
          await this.initialize();
          console.log(
            "[NeonAdapter] Переподключение успешно, повторяем запрос"
          );
          return await this.pool!.query(query, params);
        } catch (retryError) {
          console.error(
            "[NeonAdapter] Ошибка при переподключении:",
            retryError
          );
          throw error; // Бросаем оригинальную ошибку
        }
      }

      throw error;
    }
  }

  /**
   * Выполняет произвольный SQL-запрос
   * @param query SQL-запрос
   * @param params Параметры запроса
   * @returns Результат запроса
   */
  async executeQuery(query: string, params?: any[]): Promise<any> {
    const pool = this.ensureConnection();
    try {
      const result = await pool.query(query, params);
      return result;
    } catch (error) {
      console.error("Ошибка при выполнении SQL-запроса:", error);
      return null;
    }
  }

  async getProjectsByUserId(userId: string | number): Promise<Project[]> {
    try {
      // Получаем проекты пользователя
      const pool = this.ensureConnection();
      let res;

      if (typeof userId === "string") {
        // Если userId - это UUID (string), ищем напрямую по user_id
        res = await pool.query("SELECT * FROM projects WHERE user_id = $1", [
          userId,
        ]);
      } else {
        // Если userId - это integer, ищем через telegram_id (для обратной совместимости)
        res = await pool.query(
          `SELECT p.* FROM projects p
           JOIN users u ON p.user_id = u.id
           WHERE u.telegram_id = $1`,
          [userId]
        );
      }

      // Преобразуем данные вручную, без использования Zod
      const projects: Project[] = [];

      for (const row of res.rows) {
        try {
          const project: Project = {
            id:
              typeof row.id === "string"
                ? parseInt(row.id, 10)
                : Number(row.id),
            user_id: row.user_id, // Сохраняем оригинальный тип (UUID или number)
            name: String(row.name),
            description: row.description || null,
            created_at:
              row.created_at instanceof Date
                ? row.created_at.toISOString()
                : String(row.created_at),
            is_active:
              row.is_active === undefined ? true : Boolean(row.is_active),
          };
          projects.push(project);
        } catch (err) {
          console.error(`Ошибка при обработке проекта: ${err}`);
          // Пропускаем проблемный проект
        }
      }

      return projects;
    } catch (error) {
      console.error("Ошибка при получении проектов из Neon:", error);
      return [];
    }
  }

  async getProjectById(projectId: number): Promise<Project | null> {
    const pool = this.ensureConnection();
    try {
      const res = await pool.query("SELECT * FROM Projects WHERE id = $1", [
        projectId,
      ]);

      if (!res.rows[0]) {
        return null;
      }

      // Валидируем данные с помощью Zod
      // return validateProject(res.rows[0]);
      return res.rows[0] as Project; // Приводим к типу Project напрямую
    } catch (error) {
      console.error("Ошибка при получении проекта из Neon:", error);
      return null;
    }
  }

  async createProject(userId: string, name: string): Promise<Project> {
    try {
      const res = await this.safeQuery(
        "INSERT INTO projects (user_id, name) VALUES ($1, $2) RETURNING *",
        [userId, name]
      );

      // Валидируем данные с помощью Zod
      // const validatedProject = validateProject(res.rows[0]);
      // if (!validatedProject) {
      //   throw new Error("Не удалось валидировать созданный проект");
      // }
      // return validatedProject;
      return res.rows[0] as Project; // Приводим к типу Project напрямую
    } catch (error) {
      console.error("Ошибка при создании проекта в Neon:", error);
      throw new Error(
        `Ошибка при создании проекта: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getCompetitorAccounts(
    projectId: number,
    activeOnly: boolean = true
  ): Promise<Competitor[]> {
    const pool = this.ensureConnection();
    try {
      const query = activeOnly
        ? "SELECT * FROM Competitors WHERE project_id = $1 AND is_active = true"
        : "SELECT * FROM Competitors WHERE project_id = $1";
      const res = await pool.query(query, [projectId]);

      // Валидируем данные с помощью Zod
      return validateCompetitors(res.rows);
    } catch (error) {
      console.error("Ошибка при получении конкурентов из Neon:", error);
      return [];
    }
  }

  async getCompetitorsByProjectId(projectId: number): Promise<Competitor[]> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Получение конкурентов для проекта с ID: ${projectId}`
      );

      // Проверяем структуру таблицы competitors
      try {
        const tableInfo = await this.safeQuery(
          "SELECT column_name FROM information_schema.columns WHERE table_name = 'competitors'"
        );
        console.log(
          `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Структура таблицы competitors:`,
          tableInfo.rows.map((row: any) => row.column_name)
        );
      } catch (schemaError) {
        console.error(
          `[ERROR] NeonAdapter.getCompetitorsByProjectId: Ошибка при получении структуры таблицы:`,
          schemaError
        );
      }

      // Проверяем существование таблицы competitors
      try {
        const tableExists = await this.safeQuery(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'competitors')"
        );
        console.log(
          `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Таблица competitors существует: ${tableExists.rows[0].exists}`
        );
      } catch (tableError) {
        console.error(
          `[ERROR] NeonAdapter.getCompetitorsByProjectId: Ошибка при проверке существования таблицы:`,
          tableError
        );
      }

      const pool = this.ensureConnection();

      // Формируем SQL-запрос
      const query = "SELECT * FROM competitors WHERE project_id = $1";
      console.log(
        `[DEBUG] NeonAdapter.getCompetitorsByProjectId: SQL-запрос: ${query}, параметры: [${projectId}]`
      );

      // Выполняем запрос
      const res = await pool.query(query, [projectId]);

      console.log(
        `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Получено строк из БД: ${res.rows.length}`
      );
      if (res.rows.length > 0) {
        console.log(
          `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Первый конкурент:`,
          JSON.stringify(res.rows[0], null, 2)
        );
      } else {
        console.log(
          `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Конкуренты не найдены для проекта ${projectId}`
        );

        // Проверяем, есть ли вообще записи в таблице
        try {
          const allCompetitors = await pool.query(
            "SELECT COUNT(*) FROM competitors"
          );
          console.log(
            `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Всего записей в таблице competitors: ${allCompetitors.rows[0].count}`
          );

          if (parseInt(allCompetitors.rows[0].count) > 0) {
            const sampleCompetitors = await pool.query(
              "SELECT * FROM competitors LIMIT 1"
            );
            console.log(
              `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Пример записи из таблицы:`,
              JSON.stringify(sampleCompetitors.rows[0], null, 2)
            );
          }
        } catch (countError) {
          console.error(
            `[ERROR] NeonAdapter.getCompetitorsByProjectId: Ошибка при подсчете записей:`,
            countError
          );
        }
      }

      // Валидируем данные с помощью Zod
      console.log(
        `[DEBUG] NeonAdapter.getCompetitorsByProjectId: Начинаем валидацию данных...`
      );
      const validatedCompetitors = validateCompetitors(res.rows);
      console.log(
        `[DEBUG] NeonAdapter.getCompetitorsByProjectId: После валидации получено конкурентов: ${validatedCompetitors.length}`
      );

      return validatedCompetitors;
    } catch (error) {
      console.error("[ERROR] Ошибка при получении конкурентов из Neon:", error);
      return [];
    }
  }

  /**
   * Добавление нового конкурента в проект
   * @param projectId ID проекта
   * @param username Имя пользователя (логин) конкурента в Instagram
   * @param instagramUrl URL профиля конкурента
   */
  async addCompetitorAccount(
    projectId: number,
    username: string,
    instagramUrl: string
  ): Promise<Competitor> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.addCompetitorAccount: Добавление конкурента для проекта ${projectId}, username: ${username}, url: ${instagramUrl}`
      );

      const res = await this.safeQuery(
        "INSERT INTO competitors (project_id, username, profile_url) VALUES ($1, $2, $3) RETURNING *",
        [projectId, username, instagramUrl]
      );

      if (!res.rows[0]) {
        throw new Error("Не удалось добавить конкурента");
      }

      console.log(
        `[DEBUG] NeonAdapter.addCompetitorAccount: Конкурент успешно добавлен:`,
        JSON.stringify(res.rows[0], null, 2)
      );

      // Валидируем данные с помощью Zod
      const validatedCompetitor = validateCompetitor(res.rows[0]);
      if (!validatedCompetitor) {
        throw new Error("Не удалось валидировать созданного конкурента");
      }

      return validatedCompetitor;
    } catch (error) {
      console.error("[ERROR] Ошибка при добавлении конкурента в Neon:", error);
      throw new Error(
        `Ошибка при добавлении конкурента: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Удаление конкурента из проекта
   * @param projectId ID проекта
   * @param username Имя пользователя конкурента
   */
  async deleteCompetitorAccount(
    projectId: number,
    username: string
  ): Promise<boolean> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.deleteCompetitorAccount: Удаление конкурента ${username} из проекта ${projectId}`
      );

      const res = await this.safeQuery(
        "DELETE FROM competitors WHERE project_id = $1 AND username = $2",
        [projectId, username]
      );

      const success = res.rowCount !== null && res.rowCount > 0;
      console.log(
        `[DEBUG] NeonAdapter.deleteCompetitorAccount: Результат удаления: ${success}, затронуто строк: ${res.rowCount}`
      );

      return success;
    } catch (error) {
      console.error("[ERROR] Ошибка при удалении конкурента из Neon:", error);
      return false;
    }
  }

  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    try {
      const res = await this.safeQuery(
        "SELECT * FROM users WHERE telegram_id = $1",
        [telegramId]
      );

      if (!res.rows[0]) {
        return null;
      }

      // Добавляем is_active, если его нет
      if (res.rows[0].is_active === undefined) {
        res.rows[0].is_active = true;
      }

      // Преобразуем данные вручную, без использования Zod
      const user: User = {
        id: String(res.rows[0].id), // ID должен быть строкой (UUID)
        telegram_id: Number(res.rows[0].telegram_id),
        username: res.rows[0].username || null,
        first_name: res.rows[0].first_name || null,
        last_name: res.rows[0].last_name || null,
        created_at:
          res.rows[0].created_at instanceof Date
            ? res.rows[0].created_at.toISOString()
            : String(res.rows[0].created_at),
        is_bot: res.rows[0].is_bot || false,
        language_code: res.rows[0].language_code || null,
      };

      console.log(
        `[DEBUG] getUserByTelegramId: Пользователь найден и валидирован: ${JSON.stringify(user)}`
      );
      return user;
    } catch (error) {
      console.error("Ошибка при получении пользователя из Neon:", error);
      return null;
    }
  }

  async createUser(
    telegramId: number,
    username?: string,
    firstName?: string,
    lastName?: string,
    isBot?: boolean,
    languageCode?: string
  ): Promise<User> {
    try {
      const res = await this.safeQuery(
        "INSERT INTO users (telegram_id, username, first_name, last_name, is_bot, language_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [
          telegramId,
          username || null,
          firstName || null,
          lastName || null,
          isBot || false,
          languageCode || null,
        ]
      );

      // Валидируем данные с помощью Zod
      const validatedUser = validateUser(res.rows[0]);
      if (!validatedUser) {
        throw new Error("Не удалось валидировать созданного пользователя");
      }

      return validatedUser;
    } catch (error) {
      console.error("Ошибка при создании пользователя в Neon:", error);
      throw new Error(
        `Ошибка при создании пользователя: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Сохраняет пользователя в базе данных
   * @param userData Данные пользователя
   * @returns Сохраненный пользователь
   */
  async saveUser(userData: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    console.log(
      `[DEBUG] NeonAdapter.saveUser: Сохранение пользователя с telegramId=${userData.telegramId}`
    );
    try {
      // Проверяем, существует ли пользователь
      const existingUser = await this.getUserByTelegramId(userData.telegramId);

      if (existingUser) {
        console.log(
          `[DEBUG] NeonAdapter.saveUser: Пользователь с telegramId=${userData.telegramId} уже существует, обновляем данные`
        );
        // Если пользователь существует, обновляем его данные
        const res = await this.safeQuery(
          "UPDATE users SET username = $2, first_name = $3, last_name = $4 WHERE telegram_id = $1 RETURNING *",
          [
            userData.telegramId,
            userData.username || null,
            userData.firstName || null,
            userData.lastName || null,
          ]
        );

        // Валидируем данные с помощью Zod
        const validatedUser = validateUser(res.rows[0]);
        if (!validatedUser) {
          throw new Error("Не удалось валидировать обновленного пользователя");
        }

        return validatedUser;
      } else {
        console.log(
          `[DEBUG] NeonAdapter.saveUser: Пользователь с telegramId=${userData.telegramId} не найден, создаем нового`
        );
        // Если пользователь не существует, создаем нового
        return this.createUser(
          userData.telegramId,
          userData.username,
          userData.firstName,
          userData.lastName
        );
      }
    } catch (error) {
      console.error(
        "[ERROR] Ошибка при сохранении пользователя в Neon:",
        error
      );
      throw new Error(
        `Ошибка при сохранении пользователя: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Находит пользователя по Telegram ID или создает нового
   * @param telegramId Telegram ID пользователя
   * @param username Имя пользователя (опционально)
   * @param firstName Имя (опционально)
   * @param lastName Фамилия (опционально)
   */
  async findUserByTelegramIdOrCreate(
    telegramId: number,
    username?: string,
    firstName?: string,
    lastName?: string,
    isBot?: boolean,
    languageCode?: string
  ): Promise<User> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.findUserByTelegramIdOrCreate: Поиск пользователя с telegramId=${telegramId}`
      );

      let user = await this.getUserByTelegramId(telegramId);
      if (user) {
        console.log(
          `[DEBUG] NeonAdapter.findUserByTelegramIdOrCreate: Пользователь найден: ${user.id}`
        );
        return user;
      }

      console.log(
        `[DEBUG] NeonAdapter.findUserByTelegramIdOrCreate: Пользователь не найден, создаем нового`
      );
      // Если пользователь не найден, создаем нового
      user = await this.createUser(
        telegramId,
        username,
        firstName,
        lastName,
        isBot,
        languageCode
      );
      return user;
    } catch (error) {
      console.error(
        "[ERROR] Ошибка в findUserByTelegramIdOrCreate в Neon:",
        error
      );
      throw new Error(
        `Ошибка при поиске или создании пользователя: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async getTrackingHashtags(
    projectId: number,
    activeOnly?: boolean
  ): Promise<Hashtag[]> {
    let query = "SELECT * FROM hashtags WHERE project_id = $1";
    const params: any[] = [projectId];
    if (activeOnly) {
      query += " AND is_active = true";
    }
    const res = await this.safeQuery(query, params);
    return res.rows;
  }

  /**
   * Добавление нового хештега в проект
   * @param projectId ID проекта
   * @param name Название хештега (без символа #)
   */
  async addHashtag(projectId: number, name: string): Promise<Hashtag> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.addHashtag: Добавление хештега для проекта ${projectId}, name: ${name}`
      );

      // Убираем символ # в начале, если он есть
      const cleanName = name.startsWith("#") ? name.substring(1) : name;

      const res = await this.safeQuery(
        "INSERT INTO hashtags (project_id, tag_name) VALUES ($1, $2) RETURNING *",
        [projectId, cleanName]
      );

      if (!res.rows[0]) {
        throw new Error("Не удалось добавить хештег");
      }

      console.log(
        `[DEBUG] NeonAdapter.addHashtag: Хештег успешно добавлен:`,
        JSON.stringify(res.rows[0], null, 2)
      );

      // Преобразуем данные в формат Hashtag
      const hashtag: Hashtag = {
        id: res.rows[0].id,
        project_id: res.rows[0].project_id,
        hashtag: res.rows[0].tag_name, // Маппинг tag_name -> hashtag
        created_at: res.rows[0].created_at || new Date().toISOString(),
        is_active:
          res.rows[0].is_active === undefined ? true : res.rows[0].is_active,
      };

      return hashtag;
    } catch (error) {
      console.error("[ERROR] Ошибка при добавлении хештега в Neon:", error);
      throw new Error(
        `Ошибка при добавлении хештега: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Получение списка хештегов для проекта
   * @param projectId ID проекта
   */
  async getHashtagsByProjectId(projectId: number): Promise<Hashtag[]> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.getHashtagsByProjectId: Получение хештегов для проекта ${projectId}`
      );

      const res = await this.safeQuery(
        "SELECT * FROM hashtags WHERE project_id = $1 AND is_active = true ORDER BY created_at DESC",
        [projectId]
      );

      console.log(
        `[DEBUG] NeonAdapter.getHashtagsByProjectId: Получено хештегов: ${res.rows.length}`
      );

      // Преобразуем данные в формат Hashtag
      const hashtags: Hashtag[] = res.rows.map((row: any) => ({
        id: row.id,
        project_id: row.project_id,
        hashtag: row.tag_name, // Маппинг tag_name -> hashtag
        created_at: row.created_at || new Date().toISOString(),
        is_active: row.is_active === undefined ? true : row.is_active,
      }));

      return hashtags;
    } catch (error) {
      console.error("[ERROR] Ошибка при получении хештегов из Neon:", error);
      return [];
    }
  }

  /**
   * Удаление хештега из проекта
   * @param projectId ID проекта
   * @param hashtag Название хештега
   */
  async removeHashtag(projectId: number, hashtag: string): Promise<void> {
    try {
      console.log(
        `[DEBUG] NeonAdapter.removeHashtag: Удаление хештега ${hashtag} из проекта ${projectId}`
      );

      // Убираем символ # в начале, если он есть
      const cleanName = hashtag.startsWith("#")
        ? hashtag.substring(1)
        : hashtag;

      const res = await this.safeQuery(
        "UPDATE hashtags SET is_active = false WHERE project_id = $1 AND tag_name = $2",
        [projectId, cleanName]
      );

      console.log(
        `[DEBUG] NeonAdapter.removeHashtag: Результат удаления: затронуто строк: ${res.rowCount}`
      );
    } catch (error) {
      console.error("[ERROR] Ошибка при удалении хештега из Neon:", error);
      throw new Error(
        `Ошибка при удалении хештега: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async saveReelsContent(content: any): Promise<void> {
    await this.safeQuery(
      "INSERT INTO reels_content (competitor_id, reel_id, content_url, description, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
      [
        content.competitorId,
        content.reelId,
        content.contentUrl,
        content.description || null,
        content.createdAt,
      ]
    );
  }

  // Устаревший метод, оставлен для обратной совместимости
  // Используйте новую версию метода с поддержкой ReelsFilter
  async getReelsByCompetitorId_deprecated(
    competitorId: number,
    filter: any
  ): Promise<any[]> {
    let query = "SELECT * FROM reels_content WHERE competitor_id = $1";
    const params: any[] = [competitorId];
    if (filter.from) {
      query += " AND created_at >= $2";
      params.push(filter.from);
    }
    if (filter.to) {
      query += " AND created_at <= $3";
      params.push(filter.to);
    }
    const res = await this.safeQuery(query, params);
    return res.rows;
  }

  async saveReels(
    reels: Partial<ReelContent>[],
    projectId: number,
    sourceType: string,
    sourceId: string | number
  ): Promise<number> {
    // Подавляем ошибку TS6133 для неиспользуемых параметров
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectId;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sourceType;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sourceId;
    let savedCount = 0;
    for (const reel of reels) {
      await this.saveReelsContent(reel);
      savedCount++;
    }
    return savedCount;
  }

  async getReels(filter?: ReelsFilter): Promise<ReelContent[]> {
    const pool = this.ensureConnection();
    let query = "SELECT * FROM reels_content";
    const params: any[] = [];
    let whereAdded = false;

    if (filter) {
      // Фильтр по ID проекта
      if (filter.projectId) {
        query += " WHERE project_id = $" + (params.length + 1);
        params.push(filter.projectId);
        whereAdded = true;
      }

      // Фильтр по типу источника
      if (filter.sourceType) {
        query += whereAdded ? " AND" : " WHERE";
        query += " source_type = $" + (params.length + 1);
        params.push(filter.sourceType);
        whereAdded = true;
      }

      // Фильтр по ID источника
      if (filter.sourceId) {
        query += whereAdded ? " AND" : " WHERE";
        query += " source_id = $" + (params.length + 1);
        params.push(filter.sourceId);
        whereAdded = true;
      }

      // Фильтр по минимальному количеству просмотров
      if (filter.minViews) {
        query += whereAdded ? " AND" : " WHERE";
        query += " views >= $" + (params.length + 1);
        params.push(filter.minViews);
        whereAdded = true;
      }

      // Фильтр по дате публикации (после)
      if (filter.afterDate) {
        query += whereAdded ? " AND" : " WHERE";
        query += " published_at >= $" + (params.length + 1);
        params.push(filter.afterDate);
        whereAdded = true;
      }

      // Фильтр по дате публикации (до)
      if (filter.beforeDate) {
        query += whereAdded ? " AND" : " WHERE";
        query += " published_at <= $" + (params.length + 1);
        params.push(filter.beforeDate);
        whereAdded = true;
      }

      // Фильтр по статусу обработки
      if (filter.is_processed !== undefined) {
        query += whereAdded ? " AND" : " WHERE";
        query += " is_processed = $" + (params.length + 1);
        params.push(filter.is_processed);
        whereAdded = true;
      }

      // Сортировка
      if (filter.orderBy) {
        query += " ORDER BY " + filter.orderBy;
        if (filter.orderDirection) {
          query += " " + filter.orderDirection;
        } else {
          query += " DESC"; // По умолчанию сортируем по убыванию
        }
      } else {
        query += " ORDER BY published_at DESC"; // По умолчанию сортируем по дате публикации
      }

      // Пагинация
      if (filter.limit) {
        query += " LIMIT $" + (params.length + 1);
        params.push(filter.limit);

        if (filter.offset) {
          query += " OFFSET $" + (params.length + 1);
          params.push(filter.offset);
        }
      }
    } else {
      // Если фильтр не указан, сортируем по дате публикации и ограничиваем 20 записями
      query += " ORDER BY published_at DESC LIMIT 20";
    }

    try {
      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error("Ошибка при получении Reels из Neon:", error);
      return [];
    }
  }

  /**
   * Получает Reels по ID проекта
   * @param projectId ID проекта
   * @param filter Фильтр для Reels
   * @returns Массив Reels
   */
  async getReelsByProjectId(
    projectId: number,
    filter?: ReelsFilter
  ): Promise<ReelContent[]> {
    const combinedFilter: ReelsFilter = {
      ...filter,
      projectId,
    };
    return this.getReels(combinedFilter);
  }

  /**
   * Получает Reels конкретного конкурента
   * @param projectId ID проекта
   * @param competitorId ID конкурента
   * @param filter Фильтр для Reels
   * @returns Массив Reels
   */
  async getReelsByCompetitorId(
    competitorId: number,
    filter?: ReelsFilter
  ): Promise<ReelContent[]> {
    const pool = this.ensureConnection();
    try {
      // Сначала получаем информацию о конкуренте, чтобы узнать ID проекта
      const competitorResult = await pool.query(
        "SELECT project_id FROM competitors WHERE id = $1",
        [competitorId]
      );

      if (competitorResult.rows.length === 0) {
        throw new Error(`Конкурент с ID ${competitorId} не найден`);
      }

      const projectId = competitorResult.rows[0].project_id;

      // Затем получаем Reels с фильтрацией по проекту, типу источника и ID источника
      const combinedFilter: ReelsFilter = {
        ...filter,
        projectId,
        sourceType: "competitor",
        sourceId: competitorId.toString(),
      };

      return this.getReels(combinedFilter);
    } catch (error) {
      console.error("Ошибка при получении Reels конкурента из Neon:", error);
      return [];
    }
  }

  /**
   * Получает Reels по хештегу
   * @param projectId ID проекта
   * @param hashtagId ID хештега
   * @param filter Фильтр для Reels
   * @returns Массив Reels
   */
  async getReelsByHashtagId(
    hashtagId: number,
    filter?: ReelsFilter
  ): Promise<ReelContent[]> {
    const pool = this.ensureConnection();
    try {
      // Сначала получаем информацию о хештеге, чтобы узнать ID проекта
      const hashtagResult = await pool.query(
        "SELECT project_id FROM hashtags WHERE id = $1",
        [hashtagId]
      );

      if (hashtagResult.rows.length === 0) {
        throw new Error(`Хештег с ID ${hashtagId} не найден`);
      }

      const projectId = hashtagResult.rows[0].project_id;

      // Затем получаем Reels с фильтрацией по проекту, типу источника и ID источника
      const combinedFilter: ReelsFilter = {
        ...filter,
        projectId,
        sourceType: "hashtag",
        sourceId: hashtagId.toString(),
      };

      return this.getReels(combinedFilter);
    } catch (error) {
      console.error("Ошибка при получении Reels хештега из Neon:", error);
      return [];
    }
  }

  /**
   * Получает детальную информацию о Reel по ID
   * @param reelId ID Reel
   * @returns Детальная информация о Reel или null, если Reel не найден
   */
  async getReelById(reelId: string): Promise<ReelContent | null> {
    const pool = this.ensureConnection();
    try {
      const result = await pool.query(
        "SELECT * FROM reels_content WHERE instagram_id = $1",
        [reelId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при получении Reel из Neon:", error);
      return null;
    }
  }

  /**
   * Обновляет данные Reel
   * @param reelId ID Reel (instagram_id)
   * @param data Данные для обновления
   * @returns Обновленный Reel или null, если не найден
   */
  async updateReel(
    reelId: string,
    data: Partial<ReelContent>
  ): Promise<ReelContent | null> {
    const pool = this.ensureConnection();
    try {
      // Строим динамический запрос UPDATE
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Добавляем поля для обновления
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "id" && key !== "instagram_id") {
          // Исключаем ID поля
          updateFields.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        // Нет полей для обновления
        return await this.getReelById(reelId);
      }

      // Добавляем reelId как последний параметр
      params.push(reelId);

      const query = `
        UPDATE reels_content 
        SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE instagram_id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Ошибка при обновлении Reel в Neon:", error);
      return null;
    }
  }

  /**
   * Получает количество Reels по фильтру
   * @param filter Фильтр для Reels
   * @returns Количество Reels
   */
  async getReelsCount(filter?: ReelsFilter): Promise<number> {
    const pool = this.ensureConnection();
    let query = "SELECT COUNT(*) FROM reels_content";
    const params: any[] = [];
    let whereAdded = false;

    if (filter) {
      // Фильтр по ID проекта
      if (filter.projectId) {
        query += " WHERE project_id = $" + (params.length + 1);
        params.push(filter.projectId);
        whereAdded = true;
      }

      // Фильтр по типу источника
      if (filter.sourceType) {
        query += whereAdded ? " AND" : " WHERE";
        query += " source_type = $" + (params.length + 1);
        params.push(filter.sourceType);
        whereAdded = true;
      }

      // Фильтр по ID источника
      if (filter.sourceId) {
        query += whereAdded ? " AND" : " WHERE";
        query += " source_type = $" + (params.length + 1);
        params.push(filter.sourceId);
        whereAdded = true;
      }

      // Фильтр по минимальному количеству просмотров
      if (filter.minViews) {
        query += whereAdded ? " AND" : " WHERE";
        query += " views >= $" + (params.length + 1);
        params.push(filter.minViews);
        whereAdded = true;
      }

      // Фильтр по дате публикации (после)
      if (filter.afterDate) {
        query += whereAdded ? " AND" : " WHERE";
        query += " published_at >= $" + (params.length + 1);
        params.push(filter.afterDate);
        whereAdded = true;
      }

      // Фильтр по дате публикации (до)
      if (filter.beforeDate) {
        query += whereAdded ? " AND" : " WHERE";
        query += " published_at <= $" + (params.length + 1);
        params.push(filter.beforeDate);
        whereAdded = true;
      }

      // Фильтр по статусу обработки
      if (filter.is_processed !== undefined) {
        query += whereAdded ? " AND" : " WHERE";
        query += " is_processed = $" + (params.length + 1);
        params.push(filter.is_processed);
      }
    }

    try {
      const result = await pool.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error("Ошибка при получении количества Reels из Neon:", error);
      return 0;
    }
  }

  /**
   * Генерирует UUID для использования в качестве run_id
   */
  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  async logParsingRun(log: Partial<ParsingRunLog>): Promise<ParsingRunLog> {
    const res = await this.safeQuery(
      "INSERT INTO parsing_run_logs (run_id, target_type, target_id, status, message, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        log.run_id || this.generateUUID(),
        log.source_type || "unknown",
        log.source_id || "unknown",
        log.status || "unknown",
        log.error_message || null,
        log.started_at || new Date().toISOString(),
      ]
    );
    return res.rows[0];
  }

  /**
   * Получает настройки уведомлений пользователя
   * @param userId ID пользователя
   * @returns Настройки уведомлений или null, если не найдены
   */
  async getNotificationSettings(
    userId: number
  ): Promise<NotificationSettings | null> {
    try {
      const res = await this.safeQuery(
        "SELECT * FROM notification_settings WHERE user_id = $1",
        [userId]
      );

      if (!res.rows[0]) {
        return null;
      }

      return res.rows[0] as NotificationSettings;
    } catch (error) {
      console.error(
        "Ошибка при получении настроек уведомлений из Neon:",
        error
      );
      return null;
    }
  }

  /**
   * Сохраняет настройки уведомлений пользователя
   * @param settings Настройки уведомлений
   * @returns Сохраненные настройки уведомлений
   */
  async saveNotificationSettings(
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const res = await this.safeQuery(
        "INSERT INTO notification_settings (user_id, new_reels_enabled, trends_enabled, weekly_report_enabled, min_views_threshold, notification_time, notification_days) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          settings.user_id,
          settings.new_reels_enabled !== undefined
            ? settings.new_reels_enabled
            : true,
          settings.trends_enabled !== undefined
            ? settings.trends_enabled
            : true,
          settings.weekly_report_enabled !== undefined
            ? settings.weekly_report_enabled
            : true,
          settings.min_views_threshold || 1000,
          settings.notification_time || "09:00",
          settings.notification_days || [1, 2, 3, 4, 5, 6, 7],
        ]
      );

      return res.rows[0] as NotificationSettings;
    } catch (error) {
      console.error(
        "Ошибка при сохранении настроек уведомлений в Neon:",
        error
      );
      throw new Error(
        `Ошибка при сохранении настроек уведомлений в Neon: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deleteProject(projectId: number): Promise<boolean> {
    const pool = this.ensureConnection();
    try {
      // Сначала проверяем, существует ли проект
      const projectExists = await pool.query(
        "SELECT id FROM projects WHERE id = $1",
        [projectId]
      );

      if (projectExists.rowCount === 0) {
        console.log(`Проект с ID ${projectId} не найден для удаления`);
        return false; // Проект не найден
      }

      await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);
      console.log(`Проект с ID ${projectId} успешно удален`);
      return true;
    } catch (error) {
      console.error("[ERROR] Ошибка при удалении проекта из Neon:", error);
      // Оборачиваем ошибку, чтобы передать ее дальше
      throw new Error(
        `Ошибка при удалении проекта: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ЗАГЛУШКИ ДЛЯ НЕДОСТАЮЩИХ МЕТОДОВ ИНТЕРФЕЙСА
  async getParsingRunLogs(
    targetType: "competitor" | "hashtag",
    targetId: string
  ): Promise<ParsingRunLog[]> {
    console.warn(
      `[NeonAdapter STUB] getParsingRunLogs called with targetType: ${targetType}, targetId: ${targetId}. NOT IMPLEMENTED.`
    );
    return [];
  }

  async updateNotificationSettings(
    userId: number,
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    console.warn(
      `[NeonAdapter STUB] updateNotificationSettings called for userId: ${userId} with settings: ${JSON.stringify(settings)}. NOT IMPLEMENTED.`
    );
    // Возвращаем заглушку или бросаем ошибку
    const existingSettings = await this.getNotificationSettings(userId);
    if (existingSettings) {
      return { ...existingSettings, ...settings };
    }
    // Если настроек нет, создаем новые (это поведение saveNotificationSettings, можно адаптировать)
    return this.saveNotificationSettings({ user_id: userId, ...settings });
  }

  async getUserById(userId: number | string): Promise<User | null> {
    console.warn(
      `[NeonAdapter STUB] getUserById called with userId: ${userId}. NOT IMPLEMENTED.`
    );
    // Попробуем найти по telegram_id если это число, или по id если строка (UUID)
    if (typeof userId === "number") {
      return this.getUserByTelegramId(userId);
    } else if (typeof userId === "string") {
      try {
        const res = await this.safeQuery("SELECT * FROM users WHERE id = $1", [
          userId,
        ]);
        if (!res.rows[0]) return null;
        // Добавляем is_active, если его нет
        if (res.rows[0].is_active === undefined) {
          res.rows[0].is_active = true;
        }
        const user: User = {
          id: String(res.rows[0].id),
          telegram_id: Number(res.rows[0].telegram_id),
          username: res.rows[0].username || null,
          first_name: res.rows[0].first_name || null,
          last_name: res.rows[0].last_name || null,
          created_at:
            res.rows[0].created_at instanceof Date
              ? res.rows[0].created_at.toISOString()
              : String(res.rows[0].created_at),
          is_bot: res.rows[0].is_bot || false,
          language_code: res.rows[0].language_code || null,
        };
        return user;
      } catch (error) {
        console.error(
          "Ошибка при получении пользователя по UUID из Neon (getUserById STUB):",
          error
        );
        return null;
      }
    }
    return null;
  }

  async getNewReels(
    projectId: number,
    afterDate: string
  ): Promise<ReelContent[]> {
    console.warn(
      `[NeonAdapter STUB] getNewReels called for projectId: ${projectId}, afterDate: ${afterDate}. NOT IMPLEMENTED.`
    );
    return this.getReels({
      projectId,
      afterDate,
      orderBy: "published_at",
      orderDirection: "ASC",
    });
  }
}
