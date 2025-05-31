/**
 * Скрипт для тестирования пользовательского взаимодействия с Telegram ботом
 * с использованием моков вместо реального Telegram API
 */

import { Telegraf } from "telegraf";
import { ScraperBotContext } from "../src/types";
import { NeonAdapter } from "../src/adapters/neon-adapter";
import * as dotenv from "dotenv";

dotenv.config();

// Конфигурация
const BOT_TOKEN = process.env.BOT_TOKEN || "";

// Проверка конфигурации
if (!BOT_TOKEN) {
  console.error("Ошибка: Необходимо указать BOT_TOKEN в .env файле");
  process.exit(1);
}

// Типы для тестовых шагов
interface TestStepCommand {
  action: "command";
  command: string;
}

interface TestStepText {
  action: "text";
  text: string;
}

interface TestStepButton {
  action: "button";
  data: string;
}

type TestStep = TestStepCommand | TestStepText | TestStepButton;

interface TestScenario {
  name: string;
  steps: TestStep[];
}

// Тестовые сценарии
const testScenarios: TestScenario[] = [
  {
    name: 'Тест кнопки "Конкуренты"',
    steps: [
      { action: "command", command: "/start" },
      { action: "text", text: "🔍 Конкуренты" },
      { action: "button", data: "exit_scene" },
    ],
  },
  {
    name: "Тест добавления конкурента",
    steps: [
      { action: "text", text: "🔍 Конкуренты" },
      { action: "button", data: "add_competitor_3" },
      { action: "text", text: "https://www.instagram.com/example" },
      { action: "button", data: "back_to_projects" },
    ],
  },
];

// Основная функция
async function main() {
  console.log("Запуск тестирования бота с использованием моков...");

  // Создаем экземпляр бота
  const bot = new Telegraf<ScraperBotContext>(BOT_TOKEN);

  // Создаем адаптер хранилища
  const storageAdapter = new NeonAdapter();

  // Добавляем middleware для инициализации сессии
  bot.use((ctx, next) => {
    console.log("[DEBUG] Инициализация сессии в middleware");

    // Инициализируем ctx.session, если его нет
    if (!ctx.session) {
      console.log("[DEBUG] ctx.session не существует, создаем");
      (ctx as any).session = {
        user: null,
        __scenes: {},
      };
    }

    // Добавляем middleware для логирования всех обновлений
    console.log("[DEBUG] Тип обновления:", ctx.updateType);
    if (
      ctx.updateType === "callback_query" &&
      "callbackQuery" in ctx &&
      ctx.callbackQuery
    ) {
      console.log(
        "[DEBUG] Callback query data:",
        (ctx.callbackQuery as any).data
      );
    }

    return next();
  });

  // Добавляем адаптер в контекст
  bot.use((ctx, next) => {
    ctx.storage = storageAdapter;
    return next();
  });

  // Импортируем функцию настройки бота
  const { setupInstagramScraperBot } = await import("../index.js");

  // Настраиваем бота
  setupInstagramScraperBot(bot, storageAdapter, {
    telegramBotToken: BOT_TOKEN,
  });

  // Инициализируем адаптер хранилища
  await storageAdapter.initialize();

  // Запуск тестовых сценариев
  for (const scenario of testScenarios) {
    console.log(`\n=== Запуск сценария: ${scenario.name} ===`);

    for (const step of scenario.steps) {
      switch (step.action) {
        case "command":
          console.log(`[USER] Отправка команды: ${step.command}`);
          await bot.handleUpdate({
            update_id: Math.floor(Math.random() * 1000000),
            message: {
              message_id: Math.floor(Math.random() * 1000000),
              date: Math.floor(Date.now() / 1000),
              text: step.command,
              entities: [
                { offset: 0, length: step.command.length, type: "bot_command" },
              ],
              chat: {
                id: 144022504,
                type: "private",
                first_name: "Dmitrii",
                last_name: "NeuroСoder",
                username: "neuro_sage",
              },
              from: {
                id: 144022504,
                is_bot: false,
                first_name: "Dmitrii",
                last_name: "NeuroСoder",
                username: "neuro_sage",
                language_code: "ru",
              },
            },
          });
          break;
        case "text":
          console.log(`[USER] Отправка текста: ${step.text}`);
          await bot.handleUpdate({
            update_id: Math.floor(Math.random() * 1000000),
            message: {
              message_id: Math.floor(Math.random() * 1000000),
              date: Math.floor(Date.now() / 1000),
              text: step.text,
              chat: {
                id: 144022504,
                type: "private",
                first_name: "Dmitrii",
                last_name: "NeuroСoder",
                username: "neuro_sage",
              },
              from: {
                id: 144022504,
                is_bot: false,
                first_name: "Dmitrii",
                last_name: "NeuroСoder",
                username: "neuro_sage",
                language_code: "ru",
              },
            },
          });
          break;
        case "button":
          console.log(`[USER] Нажатие на кнопку с данными: ${step.data}`);
          try {
            // Создаем объект обновления для callback_query
            const update = {
              update_id: Math.floor(Math.random() * 1000000),
              callback_query: {
                id: Math.random().toString(36).substring(2, 15),
                from: {
                  id: 144022504,
                  is_bot: false,
                  first_name: "Dmitrii",
                  last_name: "NeuroСoder",
                  username: "neuro_sage",
                  language_code: "ru",
                },
                message: {
                  message_id: Math.floor(Math.random() * 1000000),
                  date: Math.floor(Date.now() / 1000),
                  chat: {
                    id: 144022504,
                    type: "private",
                    first_name: "Dmitrii",
                    last_name: "NeuroСoder",
                    username: "neuro_sage",
                  },
                  text: "Предыдущее сообщение бота",
                },
                chat_instance: Math.random().toString(36).substring(2, 15),
                data: step.data,
              },
            };

            console.log(
              `[DEBUG] Отправка callback_query с данными: ${step.data}`
            );
            console.log(
              `[DEBUG] Объект обновления:`,
              JSON.stringify(update, null, 2)
            );

            // Обрабатываем обновление
            await bot.handleUpdate(update as any);
            console.log(
              `[DEBUG] Успешно обработано нажатие на кнопку: ${step.data}`
            );
          } catch (error) {
            console.error(
              `[ERROR] Ошибка при обработке нажатия на кнопку ${step.data}:`,
              error
            );
          }
          break;
        default:
          console.log(`Неизвестное действие: ${(step as any).action}`);
      }

      // Пауза между шагами
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`=== Сценарий завершен: ${scenario.name} ===`);
  }

  console.log("\nТестирование завершено");

  // Закрываем соединение с базой данных
  await storageAdapter.close();

  // Останавливаем бота
  bot.stop();

  process.exit(0);
}

// Запускаем основную функцию
main().catch((error) => {
  console.error("Ошибка при выполнении тестирования:", error);
  process.exit(1);
});
