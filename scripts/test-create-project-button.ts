#!/usr/bin/env bun

/**
 * Скрипт для тестирования кнопки "Создать новый проект" в реальной среде
 */

import { Telegraf, Scenes } from "telegraf";
import type { ScraperBotContext } from "../src/types";
import { NeonAdapter } from "../src/adapters/neon-adapter";
import { projectWizardScene } from "../src/scenes/project-wizard-scene";
// import { logger } from "../src/utils/logger"; // Unused

async function testCreateProjectButton() {
  console.log("🧪 Тестирование кнопки 'Создать новый проект'...");

  // Создаем адаптер
  const storageAdapter = new NeonAdapter();
  await storageAdapter.initialize();
  console.log("✅ Адаптер инициализирован");

  // Создаем тестового пользователя
  const testTelegramId = 999999999;
  let testUser;

  try {
    testUser = await storageAdapter.getUserByTelegramId(testTelegramId);
    if (!testUser) {
      testUser = await storageAdapter.createUser(
        testTelegramId,
        "test_create_project"
      );
      console.log("✅ Тестовый пользователь создан");
    } else {
      console.log("✅ Тестовый пользователь найден");
    }
  } catch (error) {
    console.error("❌ Ошибка при создании/поиске пользователя:", error);
    return;
  }

  // Создаем полноценного бота для тестирования
  const bot = new Telegraf<ScraperBotContext>("test-token");

  // Создаем stage с project wizard
  const stage = new Scenes.Stage<ScraperBotContext>([projectWizardScene]);

  // Добавляем middleware
  bot.use((ctx, next) => {
    ctx.storage = storageAdapter;
    ctx.scraperConfig = { telegramBotToken: "test-token" };
    return next();
  });

  bot.use(stage.middleware());

  try {
    console.log("\n🔍 Проверяем структуру projectWizardScene...");

    // Получаем сцену
    const scene = projectWizardScene as any;

    console.log("📋 Доступные свойства сцены:", Object.keys(scene));

    // Проверяем action handlers
    if (scene.handler && scene.handler.handlers) {
      console.log(
        "📋 Количество action handlers:",
        scene.handler.handlers.length
      );

      // Ищем обработчик create_project
      let createProjectHandler = null;
      for (const handler of scene.handler.handlers) {
        console.log(
          "🔍 Action handler:",
          handler.trigger || handler.predicate?.toString()
        );
        if (handler.trigger === "create_project") {
          createProjectHandler = handler.middleware;
          console.log("✅ Найден action handler create_project");
          break;
        }
      }

      if (createProjectHandler) {
        console.log("\n🚀 Тестируем action handler create_project...");

        // Создаем мок-контекст для имитации callback query
        const mockContext = {
          from: { id: testTelegramId, username: "test_create_project" },
          callbackQuery: {
            id: "test-callback-123",
            data: "create_project",
            from: { id: testTelegramId, username: "test_create_project" },
          },
          storage: storageAdapter,
          scraperConfig: { telegramBotToken: "test-token" },
          scene: {
            enter: () => console.log("🔄 scene.enter() вызван"),
            leave: () => console.log("🔄 scene.leave() вызван"),
            reenter: () => console.log("🔄 scene.reenter() вызван"),
            session: {},
          },
          wizard: {
            state: {},
            next: () => {
              console.log("🔄 wizard.next() вызван");
              return Promise.resolve();
            },
            selectStep: (step: number) => {
              console.log(`🔄 wizard.selectStep(${step}) вызван`);
              return Promise.resolve();
            },
          },
          answerCbQuery: () => {
            console.log("🔄 answerCbQuery() вызван");
            return Promise.resolve();
          },
          reply: (text: string, extra?: any) => {
            console.log("🔄 reply() вызван с текстом:", text);
            if (extra) {
              console.log("🔄 reply() extra:", JSON.stringify(extra, null, 2));
            }
            return Promise.resolve();
          },
          match: null,
        } as unknown as ScraperBotContext;

        await createProjectHandler(mockContext);
        console.log("✅ Action handler выполнен успешно");
      } else {
        console.log("❌ Action handler create_project НЕ НАЙДЕН!");
        console.log("📋 Доступные action handlers:");
        for (const handler of scene.handler.handlers) {
          console.log(
            `  - ${handler.trigger || handler.predicate?.toString()}`
          );
        }
      }
    } else {
      console.log("❌ scene.handler.handlers не найден!");
      console.log(
        "📋 Структура scene.handler:",
        scene.handler ? Object.keys(scene.handler) : "не найден"
      );
    }

    // Проверяем шаги wizard'а
    if (scene.steps) {
      console.log("\n📋 Количество шагов wizard'а:", scene.steps.length);

      if (scene.steps[1]) {
        console.log("🔍 Тестируем второй шаг (создание проекта)...");

        // Создаем контекст для ввода текста
        const textContext = {
          from: { id: testTelegramId, username: "test_create_project" },
          message: { text: "Test Project Name" },
          storage: storageAdapter,
          scraperConfig: { telegramBotToken: "test-token" },
          scene: {
            enter: () => console.log("🔄 scene.enter() вызван"),
            leave: () => console.log("🔄 scene.leave() вызван"),
            reenter: () => console.log("🔄 scene.reenter() вызван"),
            session: {},
          },
          wizard: {
            state: {},
            next: () => {
              console.log("🔄 wizard.next() вызван");
              return Promise.resolve();
            },
            selectStep: (step: number) => {
              console.log(`🔄 wizard.selectStep(${step}) вызван`);
              return Promise.resolve();
            },
          },
          reply: (text: string, _extra?: any) => {
            console.log("🔄 reply() вызван с текстом:", text);
            return Promise.resolve();
          },
          match: null,
        } as unknown as ScraperBotContext;

        console.log("🚀 Вызываем второй шаг...");
        await scene.steps[1](textContext);
        console.log("✅ Второй шаг выполнен");

        // Проверяем, создался ли проект
        const projects = await storageAdapter.getProjectsByUserId(testUser.id);
        console.log(`📊 Количество проектов пользователя: ${projects.length}`);

        if (projects.length > 0) {
          console.log("✅ Проект создан:", projects[projects.length - 1].name);

          // Удаляем тестовый проект
          await storageAdapter.deleteProject(projects[projects.length - 1].id);
          console.log("🗑️ Тестовый проект удален");
        }
      }
    } else {
      console.log("❌ scene.steps не найден!");
    }

    // Тестируем полный цикл через бота
    console.log("\n🤖 Тестируем полный цикл через бота...");

    // Создаем Update для имитации callback query
    const callbackUpdate = {
      update_id: 123456,
      callback_query: {
        id: "test-callback-456",
        from: {
          id: testTelegramId,
          is_bot: false,
          first_name: "Test",
          username: "test_create_project",
        },
        message: {
          message_id: 1,
          date: Math.floor(Date.now() / 1000),
          chat: {
            id: testTelegramId,
            type: "private" as const,
            first_name: "Test",
            username: "test_create_project",
          },
          text: "Тестовое сообщение",
          entities: [],
        },
        chat_instance: "test-instance",
        data: "create_project",
      },
    };

    console.log("🚀 Отправляем callback query через бота...");

    // Мокируем методы бота для тестирования
    const originalSendMessage = bot.telegram.sendMessage;
    const originalAnswerCbQuery = bot.telegram.answerCbQuery;

    bot.telegram.sendMessage = async (...args) => {
      console.log("🔄 bot.telegram.sendMessage вызван с аргументами:", args);
      return Promise.resolve({} as any);
    };

    bot.telegram.answerCbQuery = async (...args) => {
      console.log("🔄 bot.telegram.answerCbQuery вызван с аргументами:", args);
      return Promise.resolve(true);
    };

    try {
      await bot.handleUpdate(callbackUpdate);
      console.log("✅ Callback query обработан ботом");
    } catch (error) {
      console.error("❌ Ошибка при обработке callback query:", error);
    } finally {
      // Восстанавливаем оригинальные методы
      bot.telegram.sendMessage = originalSendMessage;
      bot.telegram.answerCbQuery = originalAnswerCbQuery;
    }
  } catch (error) {
    console.error("❌ Ошибка при тестировании:", error);
  } finally {
    // Очистка
    try {
      const projects = await storageAdapter.getProjectsByUserId(testUser.id);
      for (const project of projects) {
        if (project.name.includes("Test")) {
          await storageAdapter.deleteProject(project.id);
          console.log("🗑️ Удален тестовый проект:", project.name);
        }
      }
    } catch (error) {
      console.warn("⚠️ Ошибка при очистке:", error);
    }

    await storageAdapter.close();
    console.log("✅ Тестирование завершено");
  }
}

// Запускаем тест
testCreateProjectButton().catch(console.error);
