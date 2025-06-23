/**
 * 🕉️ Быстрый запуск Meta Muse Scraper - СЕЙЧАС!
 *
 * **"वायुर्यथा बन्धं नोज्जिहीर्षति स एको बुद्धस्तत्र युक्तम्"**
 * "Как ветер не стремится разрушить препятствия, так и мудрый не спешит - он действует в нужный момент"
 */

import { MetaMuseAutomatedScraper } from "./meta-muse-automated-scraper";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

async function runMetaMuseNow() {
  console.log(`🕉️ НЕМЕДЛЕННЫЙ ЗАПУСК Meta Muse Scraper`);
  console.log(`═══════════════════════════════════════════`);
  console.log(`🐭 Аниме мышь готова к работе!`);
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Project ID: 999`);

  try {
    const scraper = new MetaMuseAutomatedScraper();
    await scraper.run();

    console.log(`\n🎉 Meta Muse Scraper завершен успешно! 🐭⚡`);
    console.log(`📊 Проверьте отчеты в папке exports/`);
  } catch (error) {
    console.error(`\n💥 КРИТИЧЕСКАЯ ОШИБКА:`, error);
    process.exit(1);
  }
}

// Запуск
runMetaMuseNow().catch((error) => {
  console.error("❌ Ошибка запуска:", error);
  process.exit(1);
});
