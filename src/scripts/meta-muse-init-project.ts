/**
 * 🕉️ Meta Muse Project Initialization
 *
 * **"आरम्भो हि प्रपञ्चस्य सर्वस्य प्रतिष्ठा"**
 * "Начало - это основа всего сущего"
 *
 * Инициализирует проект Meta Muse в базе данных:
 * - Создает запись проекта (ID: 2)
 * - Добавляет все 151 хэштега
 * - Настраивает связи между таблицами
 */

import { initializeDBConnection, NeonDB } from "../db/neonDB";
import { projectsTable, hashtagsTable, usersTable } from "../db/schema";
import { MetaMuseHashtagStrategy } from "../strategy/meta-muse-hashtag-strategy";
import { NeonAdapter } from "../adapters/neon-adapter";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

interface InitStats {
  projectCreated: boolean;
  hashtagsCreated: number;
  hashtagsSkipped: number;
  errors: string[];
}

/**
 * 🐭 Meta Muse Project Initializer
 */
export class MetaMuseProjectInitializer {
  private db: NeonDB;
  private stats: InitStats;

  constructor() {
    this.stats = {
      projectCreated: false,
      hashtagsCreated: 0,
      hashtagsSkipped: 0,
      errors: [],
    };
  }

  /**
   * Создание или получение пользователя для проекта
   */
  private async ensureUser(): Promise<string> {
    try {
      // Ищем существующего пользователя
      const existingUsers = await this.db.select().from(usersTable).limit(1);

      if (existingUsers.length > 0) {
        console.log(
          `👤 Используем существующего пользователя: ${existingUsers[0].id}`
        );
        return existingUsers[0].id;
      }

      // Создаем нового пользователя для Meta Muse
      const newUser = await this.db
        .insert(usersTable)
        .values({
          telegram_id: 999999999, // Фиктивный ID для Meta Muse
          username: "meta_muse_client",
          first_name: "Meta",
          last_name: "Muse",
          subscription_level: "premium",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning({ id: usersTable.id });

      console.log(
        `👤 Создан новый пользователь для Meta Muse: ${newUser[0].id}`
      );
      return newUser[0].id;
    } catch (error) {
      console.error("❌ Ошибка создания пользователя:", error);
      this.stats.errors.push(`Создание пользователя: ${error}`);
      throw error;
    }
  }

  /**
   * Создание или обновление проекта Meta Muse
   */
  private async ensureProject(userId: string): Promise<number> {
    try {
      // Проверяем существующий проект с ID = 2
      const existingProject = await this.db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, 2))
        .limit(1);

      if (existingProject.length > 0) {
        console.log(`📊 Проект Meta Muse уже существует (ID: 2)`);
        console.log(`   Название: ${existingProject[0].name}`);
        console.log(`   Описание: ${existingProject[0].description}`);
        return 2;
      }

      // Создаем новый проект
      const newProject = await this.db
        .insert(projectsTable)
        .values({
          id: 2, // Явно указываем ID = 2
          user_id: userId,
          name: "Meta Muse",
          description:
            "Аниме мышь - AI-инфлюенсер проект с анализом 151 хэштега в 6 категориях",
          industry: "AI & Digital Influencers",
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning({ id: projectsTable.id });

      this.stats.projectCreated = true;
      console.log(`📊 Создан проект Meta Muse (ID: ${newProject[0].id})`);
      return newProject[0].id;
    } catch (error) {
      console.error("❌ Ошибка создания проекта:", error);
      this.stats.errors.push(`Создание проекта: ${error}`);
      throw error;
    }
  }

  /**
   * Добавление хэштегов в базу данных
   */
  private async addHashtagsToDatabase(projectId: number): Promise<void> {
    try {
      // Получаем конфигурацию хэштегов из стратегии
      const adapter = new NeonAdapter(this.db);
      const strategy = new MetaMuseHashtagStrategy(adapter, projectId);
      const config = strategy.createHashtagConfig();

      console.log(
        `\n🏷️ Добавление ${config.totalHashtags} хэштегов в базу данных...`
      );

      for (const category of config.categories) {
        console.log(
          `\n📂 Категория: ${category.name} (${category.hashtags.length} хэштегов)`
        );

        for (const hashtag of category.hashtags) {
          try {
            // Проверяем существование хэштега
            const existingHashtag = await this.db
              .select()
              .from(hashtagsTable)
              .where(eq(hashtagsTable.tag_name, hashtag))
              .where(eq(hashtagsTable.project_id, projectId))
              .limit(1);

            if (existingHashtag.length > 0) {
              console.log(`   ⚠️ ${hashtag} уже существует`);
              this.stats.hashtagsSkipped++;
              continue;
            }

            // Добавляем новый хэштег
            await this.db.insert(hashtagsTable).values({
              project_id: projectId,
              tag_name: hashtag,
              notes: `Категория: ${category.name}`,
              is_active: true,
              added_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            });

            console.log(`   ✅ ${hashtag} добавлен`);
            this.stats.hashtagsCreated++;
          } catch (error: any) {
            if (
              error.message?.includes("duplicate") ||
              error.message?.includes("unique")
            ) {
              console.log(`   ⚠️ ${hashtag} уже существует (дубликат)`);
              this.stats.hashtagsSkipped++;
            } else {
              console.error(`   ❌ Ошибка добавления ${hashtag}:`, error);
              this.stats.errors.push(`Хэштег ${hashtag}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Ошибка добавления хэштегов:", error);
      this.stats.errors.push(`Добавление хэштегов: ${error}`);
      throw error;
    }
  }

  /**
   * Генерация отчета инициализации
   */
  private generateInitReport(): void {
    console.log(`\n🎉 ОТЧЕТ ИНИЦИАЛИЗАЦИИ Meta Muse`);
    console.log(`═══════════════════════════════════════`);
    console.log(`🆔 Project ID: 2`);
    console.log(
      `📊 Проект создан: ${this.stats.projectCreated ? "Да" : "Нет (уже существовал)"}`
    );
    console.log(`🏷️ Хэштегов добавлено: ${this.stats.hashtagsCreated}`);
    console.log(`⚠️ Хэштегов пропущено: ${this.stats.hashtagsSkipped}`);
    console.log(`❌ Ошибок: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ ОШИБКИ:`);
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log(`\n✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ:`);
    console.log(`1. 🧪 Демо-запуск: bun run src/scripts/meta-muse-demo.ts`);
    console.log(
      `2. 🕷️ Полный запуск: bun run src/scripts/meta-muse-automated-scraper.ts`
    );
    console.log(
      `3. ⏰ Автоматизация: bun run src/scripts/meta-muse-scheduler.ts generate`
    );
  }

  /**
   * Основная инициализация
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🕉️ Meta Muse Project Initialization - ЗАПУСК`);
      console.log(`═══════════════════════════════════════════════`);
      console.log(`📅 Дата: ${new Date().toLocaleString()}`);
      console.log(`🆔 Target Project ID: 2`);

      // Подключение к базе данных
      this.db = await initializeDBConnection();
      console.log(`🔗 База данных подключена`);

      // Создание/получение пользователя
      const userId = await this.ensureUser();

      // Создание/получение проекта
      const projectId = await this.ensureProject(userId);

      // Добавление хэштегов
      await this.addHashtagsToDatabase(projectId);

      // Финальный отчет
      this.generateInitReport();

      console.log(`\n🎉 Meta Muse Project инициализирован успешно! 🐭⚡`);
    } catch (error) {
      console.error(`\n💥 КРИТИЧЕСКАЯ ОШИБКА:`, error);
      this.stats.errors.push(`Критическая ошибка: ${error}`);
      this.generateInitReport();
      process.exit(1);
    }
  }

  /**
   * Проверка статуса проекта
   */
  async checkStatus(): Promise<void> {
    try {
      console.log(`🕉️ Meta Muse Project Status Check`);
      console.log(`═══════════════════════════════════`);

      this.db = await initializeDBConnection();

      // Проверяем проект
      const project = await this.db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, 2))
        .limit(1);

      if (project.length === 0) {
        console.log(`❌ Проект Meta Muse (ID: 2) не найден`);
        console.log(
          `💡 Запустите инициализацию: bun run src/scripts/meta-muse-init-project.ts`
        );
        return;
      }

      console.log(`✅ Проект найден:`);
      console.log(`   ID: ${project[0].id}`);
      console.log(`   Название: ${project[0].name}`);
      console.log(`   Описание: ${project[0].description}`);
      console.log(`   Активен: ${project[0].is_active}`);

      // Проверяем хэштеги
      const hashtags = await this.db
        .select()
        .from(hashtagsTable)
        .where(eq(hashtagsTable.project_id, 2));

      console.log(`\n🏷️ Хэштеги: ${hashtags.length} шт.`);

      if (hashtags.length > 0) {
        console.log(
          `   Примеры: ${hashtags
            .slice(0, 5)
            .map((h) => h.tag_name)
            .join(", ")}...`
        );
      }

      // Проверяем данные
      const reels = await this.db
        .select()
        .from(hashtagsTable)
        .where(eq(hashtagsTable.project_id, 2));

      console.log(`📱 Собранные данные: ${reels.length} записей`);

      console.log(`\n🚀 ГОТОВ К ЗАПУСКУ!`);
    } catch (error) {
      console.error(`❌ Ошибка проверки статуса:`, error);
    }
  }
}

/**
 * CLI интерфейс
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const initializer = new MetaMuseProjectInitializer();

  switch (command) {
    case "init":
      await initializer.initialize();
      break;

    case "status":
      await initializer.checkStatus();
      break;

    case "help":
    default:
      console.log(`🕉️ Meta Muse Project Initializer Commands:

📋 Доступные команды:
  init    - Инициализировать проект и хэштеги в базе
  status  - Проверить статус проекта
  help    - Показать эту справку

🚀 Примеры использования:
  bun run src/scripts/meta-muse-init-project.ts init
  bun run src/scripts/meta-muse-init-project.ts status

🕉️ Да пребудет порядок в данных! 🐭⚡`);
      break;
  }
}

// Запуск CLI
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  });
}
