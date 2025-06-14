import { Telegraf } from "telegraf";
import { NeonAdapter } from "./src/adapters/neon-adapter";
import { InstagramScraperBotConfig, ScraperBotContext } from "./src/types";

/**
 * Creates and configures the Telegraf stage with available scenes
 */
export function createScenesStage(): any {
  return null; // Возвращаем заглушку или создаем актуальную логику
}

/**
 * Setup Instagram Scraper Bot with basic handlers and middleware
 */
export function setupInstagramScraperBot(
  bot: Telegraf<ScraperBotContext>
): void {
  // Создаем адаптер для работы с базой данных
  const adapter = new NeonAdapter();

  // Инициализируем адаптер
  adapter
    .initialize()
    .then(() => {
      console.log("[SUCCESS] База данных успешно инициализирована");
    })
    .catch((error: Error) => {
      console.error("[ERROR] Ошибка инициализации базы данных:", error);
    });

  // Add start command
  bot.command("start", async (ctx) => {
    const keyboard = {
      reply_markup: {
        keyboard: [
          [{ text: "📊 Проекты" }],
          [{ text: "🔍 Поиск" }, { text: "📈 Аналитика" }],
          [{ text: "⚙️ Настройки" }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    };

    await ctx.reply(
      "Добро пожаловать в Instagram Scraper Bot! 🚀\n\n" +
        "Выберите раздел для работы:",
      keyboard
    );
  });

  // Add help command
  bot.command("help", async (ctx) => {
    await ctx.reply(
      "🤖 Instagram Scraper Bot - Справка\n\n" +
        "Доступные команды:\n" +
        "/start - Главное меню\n" +
        "/help - Эта справка\n" +
        "/projects - Управление проектами\n\n" +
        "Используйте кнопки меню для навигации."
    );
  });

  // Add projects command
  bot.command("projects", async (ctx) => {
    await ctx.scene.enter("projects_menu");
  });

  console.log("✅ Instagram Scraper Bot setup completed");
}
