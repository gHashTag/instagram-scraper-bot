import * as dotenv from "dotenv";
import { Telegraf, session, Markup } from "telegraf";
import { NeonAdapter } from "./adapters/neon-adapter";
import { setupInstagramScraperBot, createScenesStage } from "../index";
import { logger, LogLevel, LogType } from "./utils/logger";
import {
  projectContextMiddleware,
  handleGotoProjects,
} from "./middleware/project-context-middleware";
import type {
  ScraperBotContext,
  InstagramScraperBotConfig,
  StorageAdapter,
} from "./types";

// Переносим объявление storageAdapter в область видимости модуля
let storageAdapter: NeonAdapter | undefined;

async function ensureUserMiddleware(
  ctx: ScraperBotContext,
  next: () => Promise<void>
) {
  console.log("[DEBUG] ensureUserMiddleware: Запуск...");
  if (!ctx.from?.id) {
    console.warn("[DEBUG] ensureUserMiddleware: Обновление без ctx.from.id.");
    return;
  }
  const telegramId = ctx.from.id;
  console.log(
    `[DEBUG] ensureUserMiddleware: Обработка пользователя ${telegramId}.`
  );
  if (!ctx.storage) {
    console.error(
      "[ERROR] ensureUserMiddleware: Middleware вызвано до инициализации ctx.storage"
    );
    // Попытка ответить пользователю, если это возможно
    if (ctx.reply) {
      await ctx
        .reply(
          "Произошла внутренняя ошибка конфигурации. Пожалуйста, сообщите администратору."
        )
        .catch(() => {});
    }
    return;
  }
  try {
    console.log(
      `[DEBUG] ensureUserMiddleware: Поиск пользователя ${telegramId}...`
    );
    let user = await ctx.storage.getUserByTelegramId(telegramId);
    if (!user) {
      console.log(
        `[INFO] ensureUserMiddleware: Пользователь ${telegramId} не найден, попытка создания...`
      );
      const username =
        ctx.from.username || ctx.from.first_name || `User_${telegramId}`;
      console.log(
        `[DEBUG] ensureUserMiddleware: Вызов createUser для ${telegramId} с username \"${username}\"...`
      );
      user = await ctx.storage.createUser(
        telegramId,
        username,
        ctx.from.first_name,
        ctx.from.last_name,
        ctx.from.is_bot,
        ctx.from.language_code
      );
      if (user) {
        console.log(
          `[INFO] ensureUserMiddleware: Пользователь ${telegramId} (${username}) успешно создан. ID в базе: ${user.id}`
        );
      } else {
        console.error(
          `[ERROR] ensureUserMiddleware: createUser для ${telegramId} вернул ${user}. Пользователь НЕ создан.`
        );
        if (ctx.reply) {
          await ctx
            .reply(
              "Не удалось создать вашу учетную запись в системе. Попробуйте позже."
            )
            .catch(() => {});
        }
        return;
      }
    } else {
      console.log(
        `[INFO] ensureUserMiddleware: Пользователь ${telegramId} (${user.username || "без username"}) найден. ID в базе: ${user.id}.`
      );
    }
    console.log(
      `[DEBUG] ensureUserMiddleware: Присвоение ctx.session.user для ${telegramId}. Пользователь:`,
      JSON.stringify(user)
    );
    if (!ctx.session) {
      console.warn(
        "[DEBUG] ensureUserMiddleware: ctx.session отсутствует перед присвоением user, инициализируем."
      );
      ctx.session = {};
    }
    ctx.session.user = user;
    console.log(
      `[DEBUG] ensureUserMiddleware: ctx.session.user успешно присвоено для ${telegramId}.`
    );
  } catch (error) {
    console.error(
      `[ERROR] ensureUserMiddleware: Ошибка при поиске/создании пользователя ${telegramId}:`,
      error
    );
    if (ctx.reply) {
      await ctx
        .reply(
          "Произошла ошибка при проверке вашей учетной записи. Попробуйте позже."
        )
        .catch(() => {});
    }
    return;
  }
  console.log(
    `[DEBUG] ensureUserMiddleware: Вызов next() для пользователя ${telegramId}.`
  );
  return next();
}

async function startBot() {
  dotenv.config();
  logger.configure({
    logToConsole: true,
    minLevel: LogLevel.DEBUG,
  });
  logger.info("Запуск бота", { type: LogType.SYSTEM });

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!BOT_TOKEN) {
    console.error("Ошибка: BOT_TOKEN не найден в .env файле.");
    process.exit(1);
  }
  if (!DATABASE_URL) {
    console.error("Ошибка: DATABASE_URL не найден в .env файле.");
    process.exit(1);
  }

  try {
    console.log("Запуск бота из src/bot.ts...");
    const bot = new Telegraf<ScraperBotContext>(BOT_TOKEN);

    // 1. Middleware для сессий (Telegraf)
    console.log("[DEBUG] Регистрация Telegraf session middleware...");
    bot.use(session());

    // 2. Инициализация и добавление адаптера хранилища в контекст
    console.log("[DEBUG] Инициализация NeonAdapter...");
    storageAdapter = new NeonAdapter();
    console.log("[DEBUG] Попытка инициализации соединения с БД...");
    await storageAdapter.initialize(); // Инициализируем адаптер здесь
    console.log("[DEBUG] Соединение с БД успешно инициализировано.");
    console.log(
      "[DEBUG] Регистрация middleware для добавления storageAdapter в ctx..."
    );
    bot.use((ctx, next) => {
      ctx.storage = storageAdapter as StorageAdapter;
      return next();
    });

    // 3. Middleware для проверки/создания пользователя
    console.log("[DEBUG] Регистрация ensureUserMiddleware...");
    bot.use(ensureUserMiddleware);

    // 4. Middleware для контекста проекта
    console.log("[DEBUG] Регистрация projectContextMiddleware...");
    bot.use(projectContextMiddleware);

    // 5. Глобальный middleware для логирования (USER_SCENARIO_DEBUG)
    console.log(
      "[DEBUG] Регистрация глобального middleware для логирования USER_SCENARIO_DEBUG..."
    );
    bot.use(async (ctx, next) => {
      console.log(
        "[USER_SCENARIO_DEBUG] >>> Global Detailed Log Middleware: START"
      );
      if (
        ctx.updateType === "message" &&
        ctx.message &&
        "text" in ctx.message &&
        ctx.message.text
      ) {
        console.log(
          `[USER_SCENARIO_DEBUG] Global Detailed Log: Received text message: "${ctx.message.text}"`
        );
      } else if (
        ctx.updateType === "callback_query" &&
        ctx.callbackQuery &&
        "data" in ctx.callbackQuery
      ) {
        console.log(
          `[USER_SCENARIO_DEBUG] Global Detailed Log: Received callback_query: "${ctx.callbackQuery.data}"`
        );
      } else {
        console.log(
          `[USER_SCENARIO_DEBUG] Global Detailed Log: Received update of type: "${ctx.updateType}", Update: ${JSON.stringify(ctx.update, null, 2)}`
        );
      }
      if (!ctx.session) {
        console.log(
          "[USER_SCENARIO_DEBUG] Global Detailed Log: ctx.session is MISSING, initializing."
        );
        ctx.session = {};
      } else {
        console.log(
          "[USER_SCENARIO_DEBUG] Global Detailed Log: ctx.session EXISTS."
        );
      }
      console.log(
        "[USER_SCENARIO_DEBUG] <<< Global Detailed Log Middleware: END, calling next()"
      );
      return next();
    });

    // 6. Создание и регистрация Stage с сценами
    console.log("[DEBUG] Создание Stage со сценами...");
    const stage = createScenesStage(storageAdapter);
    console.log("[DEBUG] Регистрация Stage middleware...");
    bot.use(stage.middleware());

    // 7. Настройка обработчиков команд и основного функционала бота
    // Упрощаем config, оставляем только то, что действительно нужно для setupInstagramScraperBot
    const config: InstagramScraperBotConfig = {
      // telegramBotToken: BOT_TOKEN, // BOT_TOKEN уже используется для создания Telegraf
      apifyToken: process.env.APIFY_TOKEN, // Передаем, может быть undefined, обработается внутри
      openaiApiKey: process.env.OPENAI_API_KEY, // Передаем, может быть undefined
      adminUserId: process.env.ADMIN_USER_ID
        ? parseInt(process.env.ADMIN_USER_ID)
        : undefined,
    };
    console.log(
      "[DEBUG] Настройка обработчиков и команд бота (setupInstagramScraperBot)..."
    );
    setupInstagramScraperBot(bot, storageAdapter, config);
    console.log("[DEBUG] Модуль бота настроен.");

    // Регистрация дополнительных глобальных обработчиков (если нужны) ПОСЛЕ stage middleware
    console.log(
      "[DEBUG] Регистрация дополнительных глобальных обработчиков..."
    );
    bot.action("goto_projects", handleGotoProjects);
    bot.hears("📊 Проекты", async (ctx) => {
      console.log("[USER_SCENARIO_DEBUG] >>> HEARS '📊 Проекты': START");
      if (!ctx.session) {
        console.error(
          "[USER_SCENARIO_DEBUG] HEARS '📊 Проекты': ctx.session is UNDEFINED!"
        );
        await ctx.reply(
          "Произошла ошибка сессии. Пожалуйста, попробуйте /start."
        );
        return;
      }
      if (!ctx.scene) {
        console.error(
          "[USER_SCENARIO_DEBUG] HEARS '📊 Проекты': ctx.scene is UNDEFINED!"
        );
        await ctx.reply(
          "Произошла ошибка управления сценами. Пожалуйста, попробуйте /start."
        );
        return;
      }
      try {
        await ctx.scene.enter("projects_menu");
        console.log(
          "[USER_SCENARIO_DEBUG] <<< HEARS '📊 Проекты': Successfully entered 'projects_menu' scene."
        );
      } catch (e) {
        console.error(
          "[USER_SCENARIO_DEBUG] HEARS '📊 Проекты': ERROR entering scene `projects_menu`:",
          e
        );
        await ctx
          .reply("Не удалось открыть меню проектов. Попробуйте /start.")
          .catch(() => {});
      }
    });
    console.log(
      "[DEBUG] Дополнительные глобальные обработчики зарегистрированы."
    );

    // Обработчик ошибок Telegraf
    bot.catch((err: any, ctx: ScraperBotContext) => {
      console.error(`[ERROR] Telegraf error for ${ctx.updateType}:`, err);
      const trace = err instanceof Error ? err.stack : "No stack trace";
      console.error("Stack trace:", trace);
      logger.error("Ошибка Telegraf", {
        type: LogType.ERROR,
        error: err instanceof Error ? err : new Error(String(err)),
        data: {
          updateType: ctx.updateType,
          update: ctx.update,
          stackTrace: trace,
        },
        userId: ctx.from?.id,
        username: ctx.from?.username,
      });
      if (ctx.reply) {
        ctx
          .reply("Упс, что-то пошло не так. Мы уже разбираемся.")
          .catch((e) =>
            console.error("[ERROR] Sending error reply failed:", e)
          );
      }
    });

    // Устанавливаем команды в меню бота
    // const commands = setupInstagramScraperBot.getCommands(); // Это должно быть доступно из setupInstagramScraperBot
    // Установка команд должна производиться после того, как setupInstagramScraperBot отработал и вернул команды
    // Пока закомментируем, чтобы не было ошибки, если getCommands не экспортируется правильно.
    // console.log('📋 Установка команд в меню бота...');
    // bot.telegram.setMyCommands(scraperBot.getCommands()) // scraperBot теперь результат setupInstagramScraperBot
    //   .then(() => {
    //     console.log('✅ Команды успешно установлены в меню бота!');
    //   })
    //   .catch((err) => {
    //     console.error('❌ Ошибка при установке команд в меню бота:', err);
    //   });

    console.log("🚀 Запуск бота (bot.launch)...");
    await bot.launch();
    console.log("✅ Бот успешно запущен и ожидает обновлений!");
  } catch (error) {
    console.error(
      "❌ КРИТИЧЕСКАЯ ОШИБКА при запуске или инициализации бота:",
      error
    );
    if (storageAdapter) {
      await storageAdapter
        .close()
        .catch((e) =>
          console.error(
            "Ошибка при закрытии адаптера после критической ошибки:",
            e
          )
        );
    }
    process.exit(1);
  }
}

// Глобальный обработчик для корректного завершения
const stopBot = async (signal: string) => {
  console.log(`👋 Получен сигнал ${signal}. Завершение работы бота...`);
  // Telegraf bot.stop() вызывается автоматически для SIGINT/SIGTERM, если bot.launch() был вызван
  // bot.stop(signal);
  if (storageAdapter) {
    try {
      await storageAdapter.close();
      console.log("💾 Соединение с базой данных успешно закрыто.");
    } catch (error) {
      console.error("❌ Ошибка при закрытии соединения с базой данных:", error);
    }
  }
  process.exit(0); // Выходим с кодом 0 после успешной остановки
};

process.once("SIGINT", () => stopBot("SIGINT"));
process.once("SIGTERM", () => stopBot("SIGTERM"));

startBot();
