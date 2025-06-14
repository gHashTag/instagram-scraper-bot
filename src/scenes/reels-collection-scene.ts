import { Scenes, Markup } from "telegraf";
import {
  ScraperSceneStep,
  ScraperSceneSessionData,
  StorageAdapter,
} from "../types";
import { ReelsCollection, ReelsFilter } from "../schemas";
import { ReelsCollectionService } from "../services/reels-collection-service";
import { logger } from "../logger";

/**
 * Сцена для работы с коллекциями Reels
 */
export class ReelsCollectionScene extends Scenes.BaseScene<Scenes.SceneContext> {
  private collectionService: ReelsCollectionService;

  /**
   * Конструктор сцены
   * @param storage Адаптер хранилища
   */
  constructor(storage: StorageAdapter) {
    super("reels_collection_scene");
    this.collectionService = new ReelsCollectionService(storage);

    // Обработчики для сцены
    this.enter(this.onSceneEnter.bind(this));
    this.leave(this.onSceneLeave.bind(this));

    // Обработчики для шагов сцены
    this.action(
      /^collection_list_page_(\d+)$/,
      this.onCollectionListPage.bind(this)
    );
    this.action("create_collection", this.onCreateCollection.bind(this));
    this.action(/^view_collection_(\d+)$/, this.onViewCollection.bind(this));
    this.action(
      /^process_collection_(\d+)_(.+)$/,
      this.onProcessCollection.bind(this)
    );
    this.action(
      /^delete_collection_(\d+)$/,
      this.onDeleteCollection.bind(this)
    );
    this.action("back_to_project", this.onBackToProject.bind(this));
    this.action("back_to_collections", this.onBackToCollections.bind(this));
    this.action("confirm_delete", this.onConfirmDelete.bind(this));
    this.action("cancel_delete", this.onCancelDelete.bind(this));

    // Обработчики для ввода текста
    this.on("text", this.onText.bind(this));
  }

  /**
   * Обработчик входа в сцену
   * @param ctx Контекст сцены
   */
  private async onSceneEnter(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    // Устанавливаем шаг сцены
    session.step = ScraperSceneStep.REELS_COLLECTIONS;

    // Отображаем список коллекций
    await this.showCollectionsList(ctx);
  }

  /**
   * Обработчик выхода из сцены
   * @param ctx Контекст сцены
   */
  private async onSceneLeave(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    // Очищаем данные сессии, связанные с коллекциями
    session.currentCollectionId = undefined;
    session.collectionName = undefined;
    session.collectionDescription = undefined;
    session.selectedReelsIds = undefined;
    session.contentFormat = undefined;
    session.contentData = undefined;
  }

  /**
   * Отображение списка коллекций
   * @param ctx Контекст сцены
   * @param page Номер страницы
   */
  private async showCollectionsList(
    ctx: Scenes.SceneContext,
    page: number = 1
  ) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    try {
      // Получаем коллекции для текущего проекта
      const collections =
        await this.collectionService.getCollectionsByProjectId(
          session.currentProjectId || 0
        );

      // Если коллекций нет, отображаем сообщение
      if (collections.length === 0) {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback("➕ Создать коллекцию", "create_collection")],
          [Markup.button.callback("⬅️ Назад к проекту", "back_to_project")],
        ]);

        await ctx.reply(
          "У вас пока нет коллекций Reels. Создайте первую коллекцию!",
          keyboard
        );
        return;
      }

      // Пагинация
      const itemsPerPage = 5;
      const totalPages = Math.ceil(collections.length / itemsPerPage);
      const currentPage = Math.min(Math.max(page, 1), totalPages);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, collections.length);
      const pageCollections = collections.slice(startIndex, endIndex);

      // Формируем сообщение
      let message = "📋 *Коллекции Reels*\n\n";

      pageCollections.forEach((collection, index) => {
        message += `*${startIndex + index + 1}. ${collection.name}*\n`;
        if (collection.description) {
          message += `📝 ${collection.description}\n`;
        }
        message += `📅 Создана: ${new Date(collection.created_at || "").toLocaleDateString()}\n`;
        message += `🔄 Статус: ${collection.is_processed ? "Обработана" : "Не обработана"}\n\n`;
      });

      // Формируем клавиатуру
      const buttons = [];

      // Кнопки для коллекций
      pageCollections.forEach((collection) => {
        buttons.push([
          Markup.button.callback(
            `👁️ ${collection.name}`,
            `view_collection_${collection.id}`
          ),
        ]);
      });

      // Кнопки пагинации
      const paginationButtons = [];

      if (currentPage > 1) {
        paginationButtons.push(
          Markup.button.callback(
            "⬅️ Назад",
            `collection_list_page_${currentPage - 1}`
          )
        );
      }

      if (currentPage < totalPages) {
        paginationButtons.push(
          Markup.button.callback(
            "➡️ Вперед",
            `collection_list_page_${currentPage + 1}`
          )
        );
      }

      if (paginationButtons.length > 0) {
        buttons.push(paginationButtons);
      }

      // Кнопки действий
      buttons.push([
        Markup.button.callback("➕ Создать коллекцию", "create_collection"),
      ]);
      buttons.push([
        Markup.button.callback("⬅️ Назад к проекту", "back_to_project"),
      ]);

      const keyboard = Markup.inlineKeyboard(buttons);

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } catch (error) {
      logger.error(
        "[ReelsCollectionScene] Ошибка при отображении списка коллекций:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при получении списка коллекций. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик перехода на страницу списка коллекций
   * @param ctx Контекст сцены
   */
  private async onCollectionListPage(ctx: Scenes.SceneContext) {
    const match = ctx.match as RegExpMatchArray;
    const page = parseInt(match[1], 10);

    await this.showCollectionsList(ctx, page);
  }

  /**
   * Обработчик создания коллекции
   * @param ctx Контекст сцены
   */
  private async onCreateCollection(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    // Устанавливаем шаг сцены
    session.step = ScraperSceneStep.CREATE_COLLECTION;

    // Запрашиваем название коллекции
    await ctx.reply("Введите название для новой коллекции:");
  }

  /**
   * Обработчик просмотра коллекции
   * @param ctx Контекст сцены
   */
  private async onViewCollection(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;
    const match = ctx.match as RegExpMatchArray;
    const collectionId = parseInt(match[1], 10);

    try {
      // Получаем коллекцию
      const collection =
        await this.collectionService.getCollectionById(collectionId);

      if (!collection) {
        await ctx.reply("Коллекция не найдена. Возможно, она была удалена.");
        await this.showCollectionsList(ctx);
        return;
      }

      // Устанавливаем шаг сцены и ID коллекции
      session.step = ScraperSceneStep.COLLECTION_DETAILS;
      session.currentCollectionId = collectionId;

      // Формируем сообщение
      let message = `📋 *Коллекция: ${collection.name}*\n\n`;

      if (collection.description) {
        message += `📝 *Описание:* ${collection.description}\n\n`;
      }

      message += `📅 *Создана:* ${new Date(collection.created_at || "").toLocaleDateString()}\n`;
      message += `🔄 *Статус:* ${collection.is_processed ? "Обработана" : "Не обработана"}\n`;

      if (collection.processing_status) {
        message += `📊 *Статус обработки:* ${collection.processing_status}\n`;
      }

      if (collection.content_format) {
        message += `📄 *Формат контента:* ${collection.content_format}\n`;
      }

      // Формируем клавиатуру
      const buttons = [];

      // Кнопки для обработки коллекции
      if (!collection.is_processed) {
        buttons.push([
          Markup.button.callback(
            "📝 Обработать как текст",
            `process_collection_${collectionId}_text`
          ),
          Markup.button.callback(
            "📊 Обработать как CSV",
            `process_collection_${collectionId}_csv`
          ),
        ]);
        buttons.push([
          Markup.button.callback(
            "📋 Обработать как JSON",
            `process_collection_${collectionId}_json`
          ),
        ]);
      } else if (collection.content_data) {
        // Если коллекция уже обработана и есть данные, показываем их
        message += "\n\n*Результат обработки:*\n";

        if (collection.content_format === "text") {
          // Для текстового формата показываем первые 500 символов
          message +=
            "```\n" +
            collection.content_data.substring(0, 500) +
            (collection.content_data.length > 500 ? "...\n(сокращено)" : "") +
            "\n```";
        } else {
          message +=
            "Данные доступны в формате " +
            collection.content_format.toUpperCase();
        }
      }

      // Кнопки действий
      buttons.push([
        Markup.button.callback(
          "🗑️ Удалить коллекцию",
          `delete_collection_${collectionId}`
        ),
      ]);
      buttons.push([
        Markup.button.callback(
          "⬅️ Назад к списку коллекций",
          "back_to_collections"
        ),
      ]);

      const keyboard = Markup.inlineKeyboard(buttons);

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } catch (error) {
      logger.error(
        "[ReelsCollectionScene] Ошибка при просмотре коллекции:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при получении информации о коллекции. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик обработки коллекции
   * @param ctx Контекст сцены
   */
  private async onProcessCollection(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;
    const match = ctx.match as RegExpMatchArray;
    const collectionId = parseInt(match[1], 10);
    const format = match[2] as "text" | "csv" | "json";

    try {
      // Устанавливаем шаг сцены
      session.step = ScraperSceneStep.EXPORT_COLLECTION;

      // Отправляем сообщение о начале обработки
      await ctx.reply(
        `Начинаем обработку коллекции в формате ${format.toUpperCase()}...`
      );

      // Обрабатываем коллекцию
      const processedCollection =
        await this.collectionService.processCollection(collectionId, format);

      if (!processedCollection) {
        await ctx.reply(
          "Не удалось обработать коллекцию. Пожалуйста, попробуйте позже."
        );
        return;
      }

      // Отправляем сообщение об успешной обработке
      await ctx.reply(
        `Коллекция успешно обработана в формате ${format.toUpperCase()}!`
      );

      // Показываем детали коллекции
      await this.onViewCollection(ctx);
    } catch (error) {
      logger.error(
        "[ReelsCollectionScene] Ошибка при обработке коллекции:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при обработке коллекции. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик удаления коллекции
   * @param ctx Контекст сцены
   */
  private async onDeleteCollection(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;
    const match = ctx.match as RegExpMatchArray;
    const collectionId = parseInt(match[1], 10);

    try {
      // Получаем коллекцию
      const collection =
        await this.collectionService.getCollectionById(collectionId);

      if (!collection) {
        await ctx.reply("Коллекция не найдена. Возможно, она была удалена.");
        await this.showCollectionsList(ctx);
        return;
      }

      // Сохраняем ID коллекции в сессии
      session.currentCollectionId = collectionId;

      // Запрашиваем подтверждение удаления
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Да, удалить", "confirm_delete"),
          Markup.button.callback("❌ Нет, отмена", "cancel_delete"),
        ],
      ]);

      await ctx.reply(
        `Вы уверены, что хотите удалить коллекцию "${collection.name}"?`,
        keyboard
      );
    } catch (error) {
      logger.error(
        "[ReelsCollectionScene] Ошибка при удалении коллекции:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при удалении коллекции. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик подтверждения удаления коллекции
   * @param ctx Контекст сцены
   */
  private async onConfirmDelete(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    try {
      // Удаляем коллекцию
      const result = await this.collectionService.deleteCollection(
        session.currentCollectionId || 0
      );

      if (result) {
        await ctx.reply("Коллекция успешно удалена!");
      } else {
        await ctx.reply(
          "Не удалось удалить коллекцию. Пожалуйста, попробуйте позже."
        );
      }

      // Показываем список коллекций
      await this.showCollectionsList(ctx);
    } catch (error) {
      logger.error(
        "[ReelsCollectionScene] Ошибка при подтверждении удаления коллекции:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при удалении коллекции. Пожалуйста, попробуйте позже."
      );
    }
  }

  /**
   * Обработчик отмены удаления коллекции
   * @param ctx Контекст сцены
   */
  private async onCancelDelete(ctx: Scenes.SceneContext) {
    // Показываем детали коллекции
    await this.onViewCollection(ctx);
  }

  /**
   * Обработчик возврата к проекту
   * @param ctx Контекст сцены
   */
  private async onBackToProject(ctx: Scenes.SceneContext) {
    // Выходим из сцены
    await ctx.scene.leave();

    // Переходим к сцене проекта
    await ctx.scene.enter("project_scene");
  }

  /**
   * Обработчик возврата к списку коллекций
   * @param ctx Контекст сцены
   */
  private async onBackToCollections(ctx: Scenes.SceneContext) {
    // Показываем список коллекций
    await this.showCollectionsList(ctx);
  }

  /**
   * Обработчик ввода текста
   * @param ctx Контекст сцены
   */
  private async onText(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;
    const text = ctx.message.text;

    // Обрабатываем ввод в зависимости от шага сцены
    switch (session.step) {
      case ScraperSceneStep.CREATE_COLLECTION:
        // Сохраняем название коллекции
        session.collectionName = text;

        // Запрашиваем описание коллекции
        await ctx.reply(
          "Введите описание для коллекции (или отправьте '-' для пропуска):"
        );

        // Переходим к шагу ввода описания
        session.step = ScraperSceneStep.COLLECTION_DETAILS;
        break;

      case ScraperSceneStep.COLLECTION_DETAILS:
        // Если у нас есть название коллекции, но нет описания, значит это ввод описания
        if (session.collectionName && !session.collectionDescription) {
          // Сохраняем описание коллекции
          session.collectionDescription = text === "-" ? undefined : text;

          try {
            // Создаем коллекцию
            const collection = await this.collectionService.createCollection(
              session.currentProjectId || 0,
              session.collectionName,
              session.collectionDescription,
              session.reelsFilter // Используем текущий фильтр Reels, если он есть
            );

            // Очищаем данные сессии
            session.collectionName = undefined;
            session.collectionDescription = undefined;

            // Отправляем сообщение об успешном создании
            await ctx.reply(`Коллекция "${collection.name}" успешно создана!`);

            // Показываем список коллекций
            await this.showCollectionsList(ctx);
          } catch (error) {
            logger.error(
              "[ReelsCollectionScene] Ошибка при создании коллекции:",
              error
            );
            await ctx.reply(
              "Произошла ошибка при создании коллекции. Пожалуйста, попробуйте позже."
            );
          }
        }
        break;

      default:
        // Для других шагов просто игнорируем ввод
        break;
    }
  }
}
