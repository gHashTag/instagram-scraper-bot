/**
 * Скрипт для запуска бота Instagram Scraper Bot
 *
 * Этот скрипт запускает бота и показывает логи его работы.
 */

import { Telegraf, session } from "telegraf";
import dotenv from "dotenv";
import { NeonAdapter } from "../src/adapters/neon-adapter";
import { setupInstagramScraperBot, createScenesStage } from "../index";
import { ScraperBotContext, StorageAdapter } from "../src/types";
import { projectContextMiddleware } from "../src/middleware/project-context-middleware";

// Загружаем переменные окружения
dotenv.config();

// Middleware для создания пользователя в сессии (из src/bot.ts)
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

// Проверяем наличие токена бота
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(
    "❌ Ошибка: Не найден токен бота (BOT_TOKEN) в переменных окружения."
  );
  console.error("Пожалуйста, добавьте BOT_TOKEN в файл .env");
  process.exit(1);
}

// Создаем экземпляр бота
console.log("🤖 Создание экземпляра бота...");
const bot = new Telegraf<ScraperBotContext>(token);

// Добавляем middleware для сессий
console.log("⚙️ Добавление middleware для сессий...");
bot.use(session());

// Создаем адаптер хранилища
console.log("💾 Инициализация хранилища данных...");
const storageAdapter = new NeonAdapter();

// <<< ВАЖНО: Инициализируем адаптер ДО его использования в middleware >>>
await storageAdapter.initialize();
console.log("✅ Адаптер хранилища успешно инициализирован.");

// Добавляем storage в контекст
console.log("⚙️ Регистрация middleware для добавления storageAdapter в ctx...");
bot.use((ctx, next) => {
  ctx.storage = storageAdapter as StorageAdapter;
  return next();
});

// Добавляем middleware для создания пользователя
console.log("⚙️ Регистрация ensureUserMiddleware...");
bot.use(ensureUserMiddleware);

// Регистрируем middleware
console.log("⚙️ Регистрация projectContextMiddleware...");
bot.use(projectContextMiddleware);

// Создаем stage со сценами
console.log("⚙️ Создание Stage со сценами...");
const stage = createScenesStage(storageAdapter);

// Регистрируем Stage middleware
console.log("⚙️ Регистрация Stage middleware...");
bot.use(stage.middleware());

// Настраиваем модуль Instagram Scraper Bot
console.log(
  "⚙️ Настройка модуля Instagram Scraper Bot (команды, обработчики)..."
);
const scraperBot = setupInstagramScraperBot(bot, storageAdapter, {
  telegramBotToken: token,
  apifyToken: process.env.APIFY_TOKEN || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  adminUserId: parseInt(process.env.ADMIN_USER_ID || "0"),
});

// Обработчик команды /start
bot.start(async (ctx) => {
  console.log(
    `👤 Пользователь ${ctx.from.username || ctx.from.id} запустил бота`
  );

  try {
    if (!ctx.session) {
      console.error(
        "❌ Ошибка: ctx.session не определена в /start обработчике."
      );
      await ctx.reply(
        "Произошла ошибка сессии. Пожалуйста, попробуйте команду /start еще раз или перезапустите диалог."
      );
      return;
    }
    const user = ctx.session.user;

    if (!user) {
      console.error(
        "❌ Ошибка: Пользователь отсутствует в сессии после ensureUserMiddleware"
      );
      await ctx.reply(
        "Произошла критическая ошибка с сессией пользователя. Пожалуйста, попробуйте позже."
      );
      return;
    }

    await ctx.reply(
      `С возвращением, ${user.first_name || user.username || "пользователь"}! 👋\n\nЧем я могу помочь вам сегодня?`
    );

    await ctx.reply("Выберите действие:", {
      reply_markup: {
        keyboard: scraperBot.getMenuButtons(),
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("❌ Ошибка при обработке команды /start:", error);
    await ctx.reply(
      "Произошла ошибка при запуске бота. Пожалуйста, попробуйте позже."
    );
  }
});

// Обработчик команды /help
bot.help(async (ctx) => {
  await ctx.reply(
    "Я Instagram Scraper Bot. Вот что я умею:\n\n" +
      "📊 /projects - Управление проектами\n" +
      "🔍 /competitors - Управление конкурентами\n" +
      "#️⃣ /hashtags - Управление хэштегами\n" +
      "🎬 /scrape - Запустить скрапинг\n" +
      "👀 /reels - Просмотр Reels\n" +
      "📈 /analytics - Аналитика данных\n" +
      "🔔 /notifications - Настройка уведомлений\n" +
      "📋 /collections - Коллекции Reels\n" +
      "🤖 /chatbot - Чат-бот для общения с видео"
  );
});

// Обработчик ошибок
bot.catch((err, ctx) => {
  console.error(`❌ Ошибка при обработке ${ctx.updateType}:`, err);
  ctx.reply("Упс, что-то пошло не так. Попробуйте еще раз позже.");
});

// Устанавливаем команды в меню бота
console.log("📋 Установка команд в меню бота...");
bot.telegram
  .setMyCommands(scraperBot.getCommands())
  .then(() => {
    console.log("✅ Команды успешно установлены в меню бота!");
  })
  .catch((err) => {
    console.error("❌ Ошибка при установке команд в меню бота:", err);
  });

// Запускаем бота
console.log("🚀 Запуск бота...");
bot
  .launch()
  .then(() => {
    console.log("✅ Бот успешно запущен!");
    console.log("📝 Логи работы бота:");
  })
  .catch((err) => {
    console.error("❌ Ошибка при запуске бота:", err);
    process.exit(1);
  });

// Обработка завершения работы
process.once("SIGINT", async () => {
  console.log("👋 Завершение работы бота...");
  try {
    await storageAdapter.close();
    console.log("💾 Соединение с базой данных закрыто");
  } catch (error) {
    console.error("❌ Ошибка при закрытии соединения с базой данных:", error);
  }
  bot.stop("SIGINT");
});

process.once("SIGTERM", async () => {
  console.log("👋 Завершение работы бота...");
  try {
    await storageAdapter.close();
    console.log("💾 Соединение с базой данных закрыто");
  } catch (error) {
    console.error("❌ Ошибка при закрытии соединения с базой данных:", error);
  }
  bot.stop("SIGTERM");
});
