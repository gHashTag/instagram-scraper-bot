/**
 * Сцена для транскрибации видео по URL
 */

import { Scenes, Markup } from "telegraf";
import { ScraperBotContext, ScraperSceneStep, StorageAdapter } from "../types";
import {
  downloadVideo,
  extractAudio,
  cleanupFiles,
} from "../utils/video-utils";
import { transcribeAudio } from "../utils/transcription-utils";
import { logger } from "../logger";

/**
 * Сцена для транскрибации видео по URL
 */
export class TranscribeUrlScene extends Scenes.BaseScene<ScraperBotContext> {
  /**
   * Конструктор сцены
   * @param adapter Адаптер хранилища
   */
  constructor(_adapter: StorageAdapter) {
    super("transcribe_url_scene");

    // Добавляем обработчики
    this.enter(async (ctx) => await this.enterScene(ctx));
    this.on("text", async (ctx) => await this.handleUrl(ctx));
    this.action(
      "transcribe_another",
      async (ctx) => await this.handleTranscribeAnother(ctx)
    );

    // Добавляем обработчик для выхода из сцены
    this.command("exit", async (ctx) => await this.leaveScene(ctx));
    this.action("exit_transcribe", async (ctx) => await this.leaveScene(ctx));
  }

  /**
   * Обработчик входа в сцену
   * @param ctx Контекст бота
   */
  async enterScene(ctx: ScraperBotContext): Promise<void> {
    logger.info("Вход в сцену транскрибации URL");

    // Устанавливаем шаг сцены
    ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_ENTER_URL;

    // Отправляем приветственное сообщение
    await ctx.reply(
      "🎬 *Транскрибация Instagram Reels* 🎬\n\n" +
        "Отправьте ссылку на Instagram Reel, который вы хотите транскрибировать.\n\n" +
        "🔄 Я скачаю видео\n" +
        "🔊 Извлеку аудио\n" +
        "📝 Преобразую речь в текст",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("❌ Отмена", "exit_transcribe"),
        ]),
      }
    );
  }

  /**
   * Обработчик URL
   * @param ctx Контекст бота
   */
  async handleUrl(ctx: ScraperBotContext): Promise<void> {
    // Проверяем, что мы на правильном шаге
    if (ctx.scene.session.step !== ScraperSceneStep.TRANSCRIBE_ENTER_URL) {
      return;
    }

    // Проверяем, что сообщение содержит текст
    if (!ctx.message || !("text" in ctx.message) || !ctx.message.text) {
      await ctx.reply(
        "⚠️ Пожалуйста, отправьте ссылку на Instagram Reel.",
        Markup.inlineKeyboard([
          Markup.button.callback("❌ Отмена", "exit_transcribe"),
        ])
      );
      return;
    }

    const url = ctx.message.text.trim();

    // Проверяем, что URL валидный
    if (!this.isValidInstagramUrl(url)) {
      await ctx.reply(
        "❌ *Некорректная ссылка*\n\n" +
          "Пожалуйста, отправьте ссылку на Instagram Reel.\n\n" +
          "✅ Пример: https://www.instagram.com/reel/ABC123/",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            Markup.button.callback("❌ Отмена", "exit_transcribe"),
          ]),
        }
      );
      return;
    }

    // Сохраняем URL в сессии
    ctx.scene.session.transcriptionUrl = url;
    ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_PROCESSING;

    // Отправляем сообщение о начале обработки
    await ctx.reply(
      "🔄 *Начинаю обработку видео*\n\n" +
        "⏳ Это может занять некоторое время...\n\n" +
        "🔍 Скачиваю видео...",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("❌ Отменить", "exit_transcribe"),
        ]),
      }
    );

    // Запускаем обработку видео
    await this.processVideo(ctx);
  }

  /**
   * Обработчик обработки видео
   * @param ctx Контекст бота
   */
  async processVideo(ctx: ScraperBotContext): Promise<void> {
    // Проверяем, что мы на правильном шаге
    if (ctx.scene.session.step !== ScraperSceneStep.TRANSCRIBE_PROCESSING) {
      return;
    }

    // Получаем URL из сессии
    const url = ctx.scene.session.transcriptionUrl;
    if (!url) {
      await ctx.reply(
        "Ошибка: URL не найден в сессии. Пожалуйста, попробуйте снова.",
        Markup.inlineKeyboard([
          Markup.button.callback("Выйти", "exit_transcribe"),
        ])
      );
      ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_ENTER_URL;
      return ctx.wizard.back();
    }

    try {
      // Скачиваем видео
      const videoPath = await downloadVideo(url);
      ctx.scene.session.videoPath = videoPath;

      // Извлекаем аудио
      const audioPath = await extractAudio(videoPath);

      // Транскрибируем аудио
      const transcription = await transcribeAudio(audioPath);
      ctx.scene.session.transcriptionResult = transcription;

      // Устанавливаем шаг сцены
      ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_RESULT;

      // Отправляем видео с улучшенными параметрами
      await ctx.replyWithVideo(
        { source: videoPath },
        {
          caption: "🎬 *Видео успешно скачано*",
          parse_mode: "Markdown",
          width: 640,
          height: 640,
          supports_streaming: true,
          thumb: { source: videoPath }, // Используем первый кадр видео как превью
        }
      );

      // Отправляем транскрипцию
      await ctx.replyWithMarkdown(
        `📝 *Транскрипция:*\n\n${transcription}\n\n` +
          "✨ Хотите транскрибировать еще одно видео?",
        Markup.inlineKeyboard([
          Markup.button.callback("✅ Да, еще одно", "transcribe_another"),
          Markup.button.callback("❌ Нет, выйти", "exit_transcribe"),
        ])
      );

      // Очищаем временные файлы
      await cleanupFiles([audioPath]);
    } catch (error) {
      logger.error(`Ошибка при обработке видео: ${error}`);

      // Отправляем сообщение об ошибке
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Подробная ошибка при обработке видео: ${errorMessage}`);

      // Проверяем тип ошибки
      if (
        errorMessage.includes("Connection error") ||
        errorMessage.includes("network")
      ) {
        await ctx.reply(
          "🔌 *Ошибка подключения*\n\n" +
            "Не удалось подключиться к серверу транскрибации. Пожалуйста, попробуйте еще раз через несколько минут.\n\n" +
            "💡 Это может быть связано с временными проблемами сети или перегрузкой серверов.",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              Markup.button.callback(
                "🔄 Попробовать снова",
                "transcribe_another"
              ),
              Markup.button.callback("❌ Выйти", "exit_transcribe"),
            ]),
          }
        );
      } else if (
        errorMessage.includes("API ключ") ||
        errorMessage.includes("API key")
      ) {
        await ctx.reply(
          "🔑 *Ошибка авторизации*\n\n" +
            "Не удалось авторизоваться в сервисе транскрибации.\n\n" +
            "👨‍💻 Пожалуйста, сообщите администратору бота об этой проблеме.",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              Markup.button.callback(
                "🔄 Попробовать снова",
                "transcribe_another"
              ),
              Markup.button.callback("❌ Выйти", "exit_transcribe"),
            ]),
          }
        );
      } else {
        await ctx.reply(
          `❌ *Ошибка при обработке видео*\n\n` +
            `${errorMessage}\n\n` +
            "💡 Пожалуйста, попробуйте другую ссылку или повторите попытку позже.",
          {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
              Markup.button.callback(
                "🔄 Попробовать снова",
                "transcribe_another"
              ),
              Markup.button.callback("❌ Выйти", "exit_transcribe"),
            ]),
          }
        );
      }

      // Устанавливаем шаг сцены
      ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_ENTER_URL;
    }
  }

  /**
   * Обработчик кнопки "Транскрибировать еще одно видео"
   * @param ctx Контекст бота
   */
  async handleTranscribeAnother(ctx: ScraperBotContext): Promise<void> {
    logger.info("Транскрибация еще одного видео");

    // Очищаем данные сессии
    delete ctx.scene.session.transcriptionUrl;
    delete ctx.scene.session.transcriptionResult;

    // Очищаем временные файлы
    if (ctx.scene.session.videoPath) {
      await cleanupFiles([ctx.scene.session.videoPath]);
      delete ctx.scene.session.videoPath;
    }

    // Устанавливаем шаг сцены
    ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_ENTER_URL;

    // Отправляем сообщение
    await ctx.reply(
      "🎬 *Транскрибация нового видео* 🎬\n\n" +
        "Отправьте ссылку на Instagram Reel, который вы хотите транскрибировать.\n\n" +
        "🔄 Я скачаю видео\n" +
        "🔊 Извлеку аудио\n" +
        "📝 Преобразую речь в текст",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          Markup.button.callback("❌ Отмена", "exit_transcribe"),
        ]),
      }
    );
  }

  /**
   * Обработчик выхода из сцены
   * @param ctx Контекст бота
   */
  async leaveScene(ctx: ScraperBotContext): Promise<void> {
    logger.info("Выход из сцены транскрибации URL");

    // Очищаем временные файлы
    if (ctx.scene.session.videoPath) {
      await cleanupFiles([ctx.scene.session.videoPath]);
    }

    // Очищаем данные сессии
    delete ctx.scene.session.transcriptionUrl;
    delete ctx.scene.session.transcriptionResult;
    delete ctx.scene.session.videoPath;
    delete ctx.scene.session.step;

    // Отправляем прощальное сообщение
    await ctx.reply(
      "👋 *Вы вышли из режима транскрибации видео*\n\n" +
        "Возвращаемся в главное меню. Чтобы снова транскрибировать видео, нажмите кнопку '🎤 Транскрибировать видео' или используйте команду /transcribe",
      {
        parse_mode: "Markdown",
        ...Markup.keyboard([
          ["📊 Проекты", "🔍 Конкуренты"],
          ["#️⃣ Хэштеги", "🎬 Запустить скрапинг"],
          ["👀 Просмотр Reels", "📈 Аналитика"],
          ["🔔 Уведомления", "📋 Коллекции Reels"],
          ["🤖 Чат-бот", "🎤 Транскрибировать видео"],
          ["ℹ️ Помощь"],
        ]).resize(),
      }
    );

    // Выходим из сцены
    return ctx.scene.leave();
  }

  /**
   * Проверяет, является ли URL валидной ссылкой на Instagram Reel
   * @param url URL для проверки
   * @returns true, если URL валидный, иначе false
   */
  private isValidInstagramUrl(url: string): boolean {
    // Проверяем, что URL содержит instagram.com
    if (!url.includes("instagram.com")) {
      return false;
    }

    // Проверяем, что URL содержит /reel/ или /p/
    if (!url.includes("/reel/") && !url.includes("/p/")) {
      return false;
    }

    return true;
  }
}
