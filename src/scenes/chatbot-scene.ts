import { Scenes, Markup } from "telegraf";
import { ScraperSceneSessionData, StorageAdapter } from "../types";
import { logger } from "../logger";
import { EmbeddingsService } from "../services/embeddings-service";
import { ChatbotService } from "../services/chatbot-service";
import { registerButtons } from "../utils/button-handler";

/**
 * Сцена для чат-бота, работающего с расшифровками видео
 */
export class ChatbotScene extends Scenes.BaseScene<Scenes.SceneContext> {
  private embeddingsService: EmbeddingsService;
  private chatbotService: ChatbotService;

  /**
   * Конструктор сцены
   * @param storage Адаптер хранилища
   * @param apiKey API ключ OpenAI (опционально)
   */
  constructor(storage: StorageAdapter, apiKey?: string) {
    super("chatbot_scene");
    this.embeddingsService = new EmbeddingsService(storage, apiKey);
    this.chatbotService = new ChatbotService(
      storage,
      this.embeddingsService,
      apiKey
    );

    // Обработчики для сцены
    this.enter(this.onSceneEnter.bind(this));
    this.leave(this.onSceneLeave.bind(this));

    // Регистрация обработчиков кнопок с использованием централизованного обработчика
    registerButtons(this, [
      {
        id: /^chat_with_reel_(\d+)$/,
        handler: this.onChatWithReel.bind(this),
        errorMessage:
          "Произошла ошибка при начале чата с видео. Попробуйте еще раз.",
        verbose: true,
      },
      {
        id: "clear_chat_history",
        handler: this.onClearChatHistory.bind(this),
        errorMessage:
          "Произошла ошибка при очистке истории чата. Попробуйте еще раз.",
        verbose: true,
      },
      {
        id: "back_to_reel",
        handler: this.onBackToReel.bind(this),
        errorMessage:
          "Произошла ошибка при возврате к видео. Попробуйте еще раз.",
        verbose: true,
      },
      {
        id: "back_to_reels",
        handler: this.onBackToReels.bind(this),
        errorMessage:
          "Произошла ошибка при возврате к списку видео. Попробуйте еще раз.",
        verbose: true,
      },
    ]);

    // Обработчики для ввода текста
    this.on("text", this.onText.bind(this));
  }

  /**
   * Обработчик входа в сцену
   * @param ctx Контекст сцены
   */
  private async onSceneEnter(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    // Если есть ID Reel, начинаем чат с этим Reel
    if (session.currentReelId) {
      await this.startChatWithReel(ctx, session.currentReelId);
    } else {
      // Иначе показываем список Reels с расшифровками
      await this.showReelsWithTranscripts(ctx);
    }
  }

  /**
   * Обработчик выхода из сцены
   * @param ctx Контекст сцены
   */
  private async onSceneLeave(ctx: Scenes.SceneContext) {
    // Очищаем данные сессии, связанные с чатом
    const session = ctx.scene.session as ScraperSceneSessionData;
    session.currentReelId = undefined;
  }

  /**
   * Отображение списка Reels с расшифровками
   * @param ctx Контекст сцены
   */
  private async showReelsWithTranscripts(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    try {
      await ctx.storage.initialize();

      // Получаем список Reels с расшифровками
      const reels = await ctx.storage.executeQuery(
        `SELECT r.id, r.instagram_id, r.caption, r.url, r.transcript
         FROM reels r
         WHERE r.project_id = $1 AND r.transcript IS NOT NULL
         ORDER BY r.published_at DESC
         LIMIT 10`,
        [session.currentProjectId]
      );

      if (!reels || reels.rows.length === 0) {
        await ctx.reply(
          "У вас пока нет Reels с расшифровками. Сначала расшифруйте видео в разделе просмотра Reels.",
          Markup.inlineKeyboard([
            [Markup.button.callback("🔙 К просмотру Reels", "back_to_reels")],
          ])
        );
        return;
      }

      // Формируем сообщение
      let message = "📝 *Reels с расшифровками*\n\n";
      message += "Выберите Reel для общения с чат-ботом:\n\n";

      // Формируем клавиатуру
      const buttons = [];

      for (const reel of reels.rows) {
        const caption = reel.caption
          ? reel.caption.length > 30
            ? reel.caption.substring(0, 30) + "..."
            : reel.caption
          : "Без описания";

        buttons.push([
          Markup.button.callback(
            `💬 ${caption}`,
            `chat_with_reel_${reel.instagram_id}`
          ),
        ]);
      }

      // Кнопка возврата
      buttons.push([
        Markup.button.callback("🔙 К просмотру Reels", "back_to_reels"),
      ]);

      const keyboard = Markup.inlineKeyboard(buttons);

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } catch (error) {
      logger.error(
        "[ChatbotScene] Error showing reels with transcripts:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при получении списка Reels с расшифровками."
      );
    } finally {
      await ctx.storage.close();
    }
  }

  /**
   * Начало чата с Reel
   * @param ctx Контекст сцены
   * @param reelId ID Reel
   */
  private async startChatWithReel(ctx: Scenes.SceneContext, reelId: string) {
    const session = ctx.scene.session as ScraperSceneSessionData;
    session.currentReelId = reelId;

    try {
      await ctx.storage.initialize();

      // Получаем информацию о Reel
      const reel = await ctx.storage.getReelById(reelId);

      if (!reel) {
        await ctx.reply("Reel не найден. Возможно, он был удален.");
        await this.showReelsWithTranscripts(ctx);
        return;
      }

      if (!reel.transcript) {
        await ctx.reply(
          "У этого Reel нет расшифровки. Сначала расшифруйте видео в разделе просмотра Reels.",
          Markup.inlineKeyboard([
            [Markup.button.callback("🔙 К просмотру Reels", "back_to_reels")],
          ])
        );
        return;
      }

      // Проверяем, есть ли эмбеддинг для этого Reel
      const embedding =
        await this.embeddingsService.getEmbeddingByReelId(reelId);

      if (!embedding) {
        // Если эмбеддинга нет, создаем его
        await ctx.reply("Подготовка чат-бота для этого видео...");

        const embeddingId = await this.embeddingsService.createAndSaveEmbedding(
          reelId,
          reel.transcript
        );

        if (!embeddingId) {
          await ctx.reply(
            "Не удалось подготовить чат-бот для этого видео. Пожалуйста, попробуйте позже.",
            Markup.inlineKeyboard([
              [Markup.button.callback("🔙 К списку Reels", "back_to_reels")],
            ])
          );
          return;
        }
      }

      // Формируем сообщение
      let message = `💬 *Чат с видео*\n\n`;
      message += `Вы можете задать вопросы о содержании этого видео, и я постараюсь ответить на основе его расшифровки.\n\n`;
      message += `*Описание видео:*\n${reel.caption || "Без описания"}\n\n`;
      message += `Просто отправьте ваш вопрос в чат.`;

      // Формируем клавиатуру
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "🗑️ Очистить историю чата",
            "clear_chat_history"
          ),
        ],
        [Markup.button.callback("🔙 К списку Reels", "back_to_reels")],
      ]);

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...keyboard,
      });
    } catch (error) {
      logger.error("[ChatbotScene] Error starting chat with reel:", error);
      await ctx.reply("Произошла ошибка при подготовке чата с видео.");
    } finally {
      await ctx.storage.close();
    }
  }

  /**
   * Обработчик выбора Reel для чата
   * @param ctx Контекст сцены
   */
  private async onChatWithReel(ctx: Scenes.SceneContext) {
    const match = ctx.match as RegExpMatchArray;
    const reelId = match[1];

    await this.startChatWithReel(ctx, reelId);
  }

  /**
   * Обработчик очистки истории чата
   * @param ctx Контекст сцены
   */
  private async onClearChatHistory(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    if (!session.currentReelId) {
      await ctx.answerCbQuery("Нет активного чата для очистки.");
      return;
    }

    try {
      const userId = ctx.from?.id.toString() || "";
      const success = await this.chatbotService.clearChatHistory(
        userId,
        session.currentReelId
      );

      if (success) {
        await ctx.answerCbQuery("История чата очищена.");
        await ctx.reply("История чата очищена. Можете начать новый разговор.");
      } else {
        await ctx.answerCbQuery("Не удалось очистить историю чата.");
      }
    } catch (error) {
      logger.error("[ChatbotScene] Error clearing chat history:", error);
      await ctx.answerCbQuery("Произошла ошибка при очистке истории чата.");
    }
  }

  /**
   * Обработчик возврата к деталям Reel
   * @param ctx Контекст сцены
   */
  private async onBackToReel(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    if (!session.currentReelId || !session.currentProjectId) {
      await ctx.scene.leave();
      await ctx.scene.enter("reels_scene");
      return;
    }

    // Выходим из сцены
    await ctx.scene.leave();

    // Переходим к деталям Reel
    ctx.scene.session.currentReelId = session.currentReelId;
    ctx.scene.session.currentProjectId = session.currentProjectId;
    await ctx.scene.enter("reels_scene");
  }

  /**
   * Обработчик возврата к списку Reels
   * @param ctx Контекст сцены
   */
  private async onBackToReels(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;

    // Выходим из сцены
    await ctx.scene.leave();

    // Переходим к списку Reels
    if (session.currentProjectId) {
      ctx.scene.session.currentProjectId = session.currentProjectId;
    }
    await ctx.scene.enter("reels_scene");
  }

  /**
   * Обработчик ввода текста
   * @param ctx Контекст сцены
   */
  private async onText(ctx: Scenes.SceneContext) {
    const session = ctx.scene.session as ScraperSceneSessionData;
    const text = ctx.message.text;

    if (!session.currentReelId) {
      await ctx.reply(
        "Пожалуйста, сначала выберите Reel для чата.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 К списку Reels", "back_to_reels")],
        ])
      );
      return;
    }

    try {
      // Отправляем индикатор набора текста
      await ctx.sendChatAction("typing");

      // Генерируем ответ
      const userId = ctx.from?.id.toString() || "";
      const response = await this.chatbotService.generateResponse(
        userId,
        session.currentReelId,
        text
      );

      if (response) {
        await ctx.reply(response, {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "🗑️ Очистить историю чата",
                "clear_chat_history"
              ),
            ],
            [Markup.button.callback("🔙 К списку Reels", "back_to_reels")],
          ]),
        });
      } else {
        await ctx.reply(
          "Извините, не удалось сгенерировать ответ. Пожалуйста, попробуйте еще раз или выберите другой Reel.",
          Markup.inlineKeyboard([
            [Markup.button.callback("🔙 К списку Reels", "back_to_reels")],
          ])
        );
      }
    } catch (error) {
      logger.error("[ChatbotScene] Error generating response:", error);
      await ctx.reply(
        "Произошла ошибка при генерации ответа. Пожалуйста, попробуйте еще раз."
      );
    }
  }
}
