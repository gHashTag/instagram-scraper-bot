/**
 * Скрипт для детальной диагностики одного конкурента
 * Показывает что именно возвращает Apify
 */

import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/debug-single-competitor.ts <username>"
  );
  process.exit(1);
}

const username = args[0];
const apifyToken = process.env.APIFY_TOKEN;

if (!apifyToken) {
  console.error("APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

async function debugCompetitor() {
  console.log(`🔍 Диагностика конкурента: ${username}`);
  console.log(`🔑 Токен: ${apifyToken}`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    // Запускаем актор
    const run = await client.actor("apify/instagram-scraper").call({
      username: [`https://www.instagram.com/${username}`],
      resultsLimit: 50,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    });

    console.log(`✅ Актор запущен, ID: ${run.id}`);

    // Получаем результаты
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`📊 ПОЛУЧЕНО ЭЛЕМЕНТОВ: ${items.length}`);

    if (items.length > 0) {
      console.log(`\n🎬 ПЕРВЫЙ ЭЛЕМЕНТ:`);
      const firstItem = items[0];

      console.log(`- Тип: ${firstItem.type || "не указан"}`);
      console.log(`- URL: ${firstItem.url || "не указан"}`);
      console.log(`- Дата: ${firstItem.timestamp || "не указана"}`);
      console.log(
        `- Просмотры: ${firstItem.viewsCount || firstItem.likesCount || "не указаны"}`
      );
      console.log(`- Владелец: ${firstItem.ownerUsername || "не указан"}`);
      console.log(
        `- Описание: ${firstItem.caption ? firstItem.caption.substring(0, 100) + "..." : "нет"}`
      );

      console.log(`\n📋 ВСЕ ПОЛЯ:`);
      console.log(JSON.stringify(firstItem, null, 2));

      // Проверим, есть ли reels
      const reels = items.filter(
        (item) =>
          item.type === "Video" ||
          item.type === "Reel" ||
          item.url?.includes("/reel/") ||
          item.videoUrl
      );

      console.log(`\n🎥 НАЙДЕНО REELS: ${reels.length}`);

      if (reels.length > 0) {
        console.log(`\n🎬 ПЕРВЫЙ REEL:`);
        const firstReel = reels[0];
        console.log(`- URL: ${firstReel.url}`);
        console.log(
          `- Просмотры: ${firstReel.viewsCount || firstReel.likesCount || "не указаны"}`
        );
        console.log(`- Дата: ${firstReel.timestamp}`);
      }
    } else {
      console.log(`❌ НЕТ ДАННЫХ ОТ APIFY`);
    }
  } catch (error) {
    console.error(`❌ ОШИБКА:`, error);
  }
}

debugCompetitor().catch(console.error);
