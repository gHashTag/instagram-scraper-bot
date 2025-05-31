#!/usr/bin/env bun

/**
 * Скрипт для отладки регистрации action handlers в wizard сценах
 */

import { Telegraf, Scenes } from "telegraf";
import type { ScraperBotContext } from "../src/types";
import { projectWizardScene } from "../src/scenes/project-wizard-scene";

function debugWizardScene() {
  console.log("🔍 Отладка структуры projectWizardScene...");

  const scene = projectWizardScene as any;

  console.log("📋 Все свойства сцены:");
  for (const key of Object.keys(scene)) {
    console.log(`  - ${key}: ${typeof scene[key]}`);
  }

  console.log("\n📋 Детальная структура:");

  // Проверяем handler
  if (scene.handler) {
    console.log("🔍 scene.handler:");
    console.log("  - Тип:", typeof scene.handler);
    console.log("  - Конструктор:", scene.handler.constructor.name);
    console.log("  - Свойства:", Object.keys(scene.handler));

    // Проверяем различные возможные места хранения handlers
    if (scene.handler.handlers) {
      console.log("  - scene.handler.handlers:", scene.handler.handlers.length);
    }

    if (scene.handler._handlers) {
      console.log(
        "  - scene.handler._handlers:",
        scene.handler._handlers.length
      );
    }

    if (scene.handler.middleware) {
      console.log(
        "  - scene.handler.middleware:",
        typeof scene.handler.middleware
      );
    }
  }

  // Проверяем enterHandler
  if (scene.enterHandler) {
    console.log("🔍 scene.enterHandler:");
    console.log("  - Тип:", typeof scene.enterHandler);
    console.log("  - Конструктор:", scene.enterHandler.constructor.name);
    console.log("  - Свойства:", Object.keys(scene.enterHandler));
  }

  // Проверяем leaveHandler
  if (scene.leaveHandler) {
    console.log("🔍 scene.leaveHandler:");
    console.log("  - Тип:", typeof scene.leaveHandler);
    console.log("  - Конструктор:", scene.leaveHandler.constructor.name);
    console.log("  - Свойства:", Object.keys(scene.leaveHandler));
  }

  // Проверяем steps
  if (scene.steps) {
    console.log("🔍 scene.steps:");
    console.log("  - Количество шагов:", scene.steps.length);
    for (let i = 0; i < scene.steps.length; i++) {
      console.log(`  - Шаг ${i}: ${typeof scene.steps[i]}`);
    }
  }

  // Попробуем найти action handlers через прототип
  console.log("\n🔍 Поиск action handlers через прототип:");
  let proto = Object.getPrototypeOf(scene);
  let level = 0;
  while (proto && level < 5) {
    console.log(`  Уровень ${level}: ${proto.constructor.name}`);
    const protoKeys = Object.getOwnPropertyNames(proto);
    for (const key of protoKeys) {
      if (
        key.includes("action") ||
        key.includes("handler") ||
        key.includes("middleware")
      ) {
        console.log(`    - ${key}: ${typeof proto[key]}`);
      }
    }
    proto = Object.getPrototypeOf(proto);
    level++;
  }

  // Проверяем, есть ли скрытые свойства
  console.log("\n🔍 Проверка скрытых свойств:");
  const descriptors = Object.getOwnPropertyDescriptors(scene);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable) {
      console.log(`  - ${key} (скрытое): ${typeof scene[key]}`);
    }
  }

  // Создаем тестовый бот и stage для проверки
  console.log("\n🤖 Создание тестового бота и stage...");
  const bot = new Telegraf<ScraperBotContext>("test-token");
  const stage = new Scenes.Stage<ScraperBotContext>([projectWizardScene]);

  bot.use(stage.middleware());

  console.log("📋 Структура stage:");
  console.log("  - Тип:", typeof stage);
  console.log("  - Конструктор:", stage.constructor.name);
  console.log("  - Свойства:", Object.keys(stage));

  // Проверяем scenes в stage
  if ((stage as any).scenes) {
    console.log("📋 stage.scenes:");
    const scenes = (stage as any).scenes;
    console.log("  - Тип:", typeof scenes);
    console.log("  - Размер:", scenes.size || Object.keys(scenes).length);

    if (scenes.get) {
      const projectScene = scenes.get("project_wizard");
      if (projectScene) {
        console.log("📋 Найдена сцена project_wizard в stage:");
        console.log("  - Тип:", typeof projectScene);
        console.log("  - Свойства:", Object.keys(projectScene));

        // Проверяем handler в сцене из stage
        if (projectScene.handler) {
          console.log("📋 projectScene.handler из stage:");
          console.log("  - Тип:", typeof projectScene.handler);
          console.log("  - Свойства:", Object.keys(projectScene.handler));

          if (projectScene.handler.handlers) {
            console.log(
              "  - Количество handlers:",
              projectScene.handler.handlers.length
            );
            for (const handler of projectScene.handler.handlers) {
              console.log(
                `    - Handler: ${handler.trigger || handler.predicate?.toString()}`
              );
            }
          }
        }
      }
    }
  }

  console.log("✅ Отладка завершена");
}

// Запускаем отладку
debugWizardScene();
