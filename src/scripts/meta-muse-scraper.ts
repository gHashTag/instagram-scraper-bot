#!/usr/bin/env bun

import { MetaMuseHashtagStrategy } from "../strategy/meta-muse-hashtag-strategy";
import { NeonAdapter } from "../adapters/neon-adapter";
import * as dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

const META_MUSE_PROJECT_ID = 999; // Специальный ID для Meta Muse

async function main() {
  console.log("🕉️ Запуск Meta Muse Instagram Hashtag Scraper");
  console.log("═════════════════════════════════════════════");

  // Инициализация
  const adapter = new NeonAdapter();
  const strategy = new MetaMuseHashtagStrategy(adapter, META_MUSE_PROJECT_ID);

  try {
    // Подключение к БД
    console.log("🔗 Подключение к базе данных...");
    await adapter.initialize();

    // Получение конфигурации
    console.log("📋 Загрузка конфигурации хэштегов...");
    const config = strategy.createHashtagConfig();

    console.log(`📊 Всего категорий: ${config.categories.length}`);
    console.log(`🏷️ Всего хэштегов: ${config.totalHashtags}`);
    console.log("");

    // Показать категории
    for (const category of config.categories) {
      console.log(
        `📂 ${category.description}: ${category.hashtags.length} хэштегов`
      );
    }
    console.log("");

    // Создание конфигурации для пакетного скрепинга
    const batchConfig = strategy.createBatchScrapingConfig(config);
    console.log("⚙️ Конфигурация пакетного скрепинга создана");

    // Генерация отчета (пока без реального скрепинга)
    console.log("📈 Генерация отчета о готовности...");
    const report = await strategy.generateScrapingReport();

    console.log("");
    console.log("📋 ОТЧЕТ О ГОТОВНОСТИ:");
    console.log("═══════════════════════");
    console.log(`🆔 Project ID: ${report.projectId}`);
    console.log(`📂 Категории: ${report.categories.join(", ")}`);
    console.log(`🏷️ Всего хэштегов: ${report.totalHashtags}`);
    console.log(`📅 Создан: ${report.generatedAt.toLocaleString()}`);

    console.log("");
    console.log("✅ Meta Muse скрепер готов к работе!");
    console.log("💡 Для реального запуска скрепинга добавьте параметр --run");
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  } finally {
    await adapter.close();
    console.log("🔚 Завершение работы");
  }
}

// Запуск скрипта
if (import.meta.main) {
  main().catch(console.error);
}
