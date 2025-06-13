import { Telegraf, Scenes } from "telegraf";
import type {
  ScraperBotContext,
  StorageAdapter,
  InstagramScraperBotConfig,
} from "./src/types";

// Import available scenes - using a more conservative approach
import { projectScene } from "./src/scenes/project-scene";
import projectsMenuScene from "./src/scenes/projects-menu-scene";

/**
 * Creates and configures the Telegraf stage with available scenes
 */
export function createScenesStage(
  storageAdapter: StorageAdapter
): Scenes.Stage<ScraperBotContext> {
  const stage = new Scenes.Stage<ScraperBotContext>([
    projectScene,
    projectsMenuScene,
    // Add more scenes as needed when they are properly configured
  ]);

  return stage;
}

/**
 * Setup Instagram Scraper Bot with basic handlers and middleware
 */
export function setupInstagramScraperBot(
  bot: Telegraf<ScraperBotContext>,
  storageAdapter: StorageAdapter,
  config: InstagramScraperBotConfig
): void {
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
