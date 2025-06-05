/**
 * Тест специализированного Instagram Reel Scraper (apify/instagram-reel-scraper)
 * Именно для Reels, а не для обычных постов
 */

import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
const username = args[0] || "med_yu_med";
const apifyToken = process.env.APIFY_TOKEN;

if (!apifyToken) {
  console.error("APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

async function testInstagramReelScraper() {
  console.log(`🎬 Тест Instagram Reel Scraper для: ${username}`);
  console.log(`🔑 Токен: ${apifyToken}`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    // Тестируем специализированный Instagram Reel Scraper
    const run = await client.actor("apify/instagram-reel-scraper").call({
      username: [username],
      resultsLimit: 20,
    });

    console.log(`✅ Instagram Reel Scraper запущен, ID: ${run.id}`);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`📊 ПОЛУЧЕНО ЭЛЕМЕНТОВ: ${items.length}`);

    if (items.length > 0) {
      console.log(`\n🎬 ПЕРВЫЙ REEL:`);
      const firstReel = items[0];

      console.log(`- ID: ${firstReel.id || "не указан"}`);
      console.log(`- Тип: ${firstReel.type || "не указан"}`);
      console.log(`- URL: ${firstReel.url || "не указан"}`);
      console.log(`- Код: ${firstReel.shortCode || "не указан"}`);
      console.log(`- Дата: ${firstReel.timestamp || "не указана"}`);
      console.log(`- Лайки: ${firstReel.likesCount || "не указаны"}`);
      console.log(
        `- Просмотры: ${firstReel.videoViewCount || firstReel.playCount || "не указаны"}`
      );
      console.log(`- Комментарии: ${firstReel.commentsCount || "не указаны"}`);
      console.log(`- Владелец: ${firstReel.ownerUsername || "не указан"}`);
      console.log(
        `- Описание: ${firstReel.caption ? firstReel.caption.substring(0, 100) + "..." : "нет"}`
      );

      console.log(`\n🎥 ВСЕ REELS:`);
      items.forEach((reel, i) => {
        console.log(`${i + 1}. ${reel.url || reel.shortCode}`);
        console.log(`   Лайки: ${reel.likesCount || "не указаны"}`);
        console.log(
          `   Просмотры: ${reel.videoViewCount || reel.playCount || "не указаны"}`
        );
        console.log(`   Дата: ${reel.timestamp}`);
        console.log("");
      });

      // Проверим статистику
      const totalViews = items.reduce((sum, reel) => {
        const views =
          reel.videoViewCount || reel.playCount || reel.likesCount || 0;
        return sum + (typeof views === "number" ? views : parseInt(views) || 0);
      }, 0);

      const avgViews = Math.round(totalViews / items.length);
      const maxViews = Math.max(
        ...items.map((reel) => {
          const views =
            reel.videoViewCount || reel.playCount || reel.likesCount || 0;
          return typeof views === "number" ? views : parseInt(views) || 0;
        })
      );

      console.log(`📈 СТАТИСТИКА:`);
      console.log(`   Всего Reels: ${items.length}`);
      console.log(`   Общие просмотры: ${totalViews.toLocaleString()}`);
      console.log(`   Средние просмотры: ${avgViews.toLocaleString()}`);
      console.log(`   Максимальные просмотры: ${maxViews.toLocaleString()}`);

      // Найдем reels с высокими просмотрами
      const viralReels = items.filter((reel) => {
        const views =
          reel.videoViewCount || reel.playCount || reel.likesCount || 0;
        const viewCount =
          typeof views === "number" ? views : parseInt(views) || 0;
        return viewCount >= 5000;
      });

      console.log(`\n🔥 ВИРУСНЫЕ REELS (5K+ просмотров): ${viralReels.length}`);
      viralReels.forEach((reel, i) => {
        const views =
          reel.videoViewCount || reel.playCount || reel.likesCount || 0;
        const viewCount =
          typeof views === "number" ? views : parseInt(views) || 0;
        console.log(
          `${i + 1}. ${viewCount.toLocaleString()} просмотров - ${reel.url || reel.shortCode}`
        );
      });
    } else {
      console.log(`❌ НЕТ ДАННЫХ ОТ Instagram Reel Scraper`);
    }
  } catch (error) {
    console.error(`❌ ОШИБКА:`, error);
  }
}

testInstagramReelScraper().catch(console.error);
