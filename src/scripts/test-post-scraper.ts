/**
 * Тест Instagram Post Scraper (apify/instagram-post-scraper)
 * Лучший по цене/качеству из нашего исследования
 */

import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
const username = args[0] || "cristiano";
const apifyToken = process.env.APIFY_TOKEN;

if (!apifyToken) {
  console.error("APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

async function testPostScraper() {
  console.log(`🔍 Тест Instagram Post Scraper для: ${username}`);
  console.log(`🔑 Токен: ${apifyToken}`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    // Тестируем Instagram Post Scraper
    const run = await client.actor("apify/instagram-post-scraper").call({
      username: [username],
      resultsLimit: 20,
    });

    console.log(`✅ Instagram Post Scraper запущен, ID: ${run.id}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`📊 ПОЛУЧЕНО ЭЛЕМЕНТОВ: ${items.length}`);

    if (items.length > 0) {
      console.log(`\n🎬 ПЕРВЫЙ ЭЛЕМЕНТ:`);
      const firstItem = items[0];

      console.log(`- Тип: ${firstItem.type || "не указан"}`);
      console.log(`- URL: ${firstItem.url || "не указан"}`);
      console.log(`- Дата: ${firstItem.timestamp || "не указана"}`);
      console.log(`- Лайки: ${firstItem.likesCount || "не указаны"}`);
      console.log(`- Просмотры: ${firstItem.viewsCount || "не указаны"}`);
      console.log(`- Владелец: ${firstItem.ownerUsername || "не указан"}`);

      // Ищем reels
      const reels = items.filter(
        (item) =>
          item.type === "Video" ||
          item.type === "Reel" ||
          item.url?.includes("/reel/") ||
          item.videoUrl
      );

      console.log(`\n🎥 НАЙДЕНО REELS: ${reels.length}`);

      if (reels.length > 0) {
        console.log(`\n🎬 ПЕРВЫЕ 3 REELS:`);
        reels.slice(0, 3).forEach((reel, i) => {
          console.log(`${i + 1}. URL: ${reel.url}`);
          console.log(`   Лайки: ${reel.likesCount || "не указаны"}`);
          console.log(`   Просмотры: ${reel.viewsCount || "не указаны"}`);
          console.log(`   Дата: ${reel.timestamp}`);
          console.log("");
        });
      }
    } else {
      console.log(`❌ НЕТ ДАННЫХ ОТ Instagram Post Scraper`);
    }
  } catch (error) {
    console.error(`❌ ОШИБКА:`, error);
  }
}

testPostScraper().catch(console.error);
