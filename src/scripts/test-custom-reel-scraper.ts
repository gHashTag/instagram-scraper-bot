/**
 * Тест кастомного Instagram Reel Scraper (ID: xMc5Ga1oCONPmWJIa)
 * Найденный пользователем специально для Reels
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

async function testCustomReelScraper() {
  console.log(`🎬 Тест кастомного Instagram Reel Scraper`);
  console.log(`👤 Пользователь: ${username}`);
  console.log(`🔑 Токен: ${apifyToken}`);
  console.log(`🆔 Скрепер ID: xMc5Ga1oCONPmWJIa`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    // Подготавливаем входные данные как в примере
    const input = {
      username: [username],
      resultsLimit: 30,
    };

    console.log(`\n🚀 Запускаем актор с параметрами:`);
    console.log(`   Username: [${username}]`);
    console.log(`   Results Limit: 30`);

    // Запускаем актор и ждем завершения
    const run = await client.actor("xMc5Ga1oCONPmWJIa").call(input);

    console.log(`✅ Актор запущен успешно!`);
    console.log(`🆔 Run ID: ${run.id}`);
    console.log(`📊 Статус: ${run.status}`);

    if (run.status === "SUCCEEDED") {
      // Получаем результаты из dataset
      console.log(`\n📥 Получаем результаты из dataset...`);
      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      console.log(`📊 ПОЛУЧЕНО ЭЛЕМЕНТОВ: ${items.length}`);

      if (items.length > 0) {
        console.log(`\n🎬 ПЕРВЫЙ РЕЗУЛЬТАТ:`);
        const firstItem = items[0];

        // Выводим все доступные поля
        console.log("📋 ДОСТУПНЫЕ ПОЛЯ:");
        Object.keys(firstItem).forEach((key) => {
          const value = firstItem[key];
          if (typeof value === "string" && value.length > 100) {
            console.log(`   ${key}: ${value.substring(0, 100)}...`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        });

        // Специальный анализ для Instagram данных
        console.log(`\n🔍 АНАЛИЗ СТРУКТУРЫ:`);
        console.log(
          `   ID: ${firstItem.id || firstItem.shortCode || "не найден"}`
        );
        console.log(`   URL: ${firstItem.url || "не найден"}`);
        console.log(
          `   Тип: ${firstItem.type || firstItem.productType || "не указан"}`
        );
        console.log(`   Лайки: ${firstItem.likesCount || "не указаны"}`);
        console.log(
          `   Просмотры: ${firstItem.videoViewCount || firstItem.playCount || "не указаны"}`
        );
        console.log(
          `   Комментарии: ${firstItem.commentsCount || "не указаны"}`
        );
        console.log(
          `   Дата: ${firstItem.timestamp || firstItem.takenAtTimestamp || "не указана"}`
        );
        console.log(
          `   Владелец: ${firstItem.ownerUsername || firstItem.owner?.username || "не указан"}`
        );

        // Показываем первые 5 результатов
        console.log(`\n🎥 ВСЕ РЕЗУЛЬТАТЫ (первые 5):`);
        items.slice(0, 5).forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.url || item.shortCode || item.id}`);
          console.log(
            `   Тип: ${item.type || item.productType || "неизвестен"}`
          );
          console.log(`   Лайки: ${(item.likesCount || 0).toLocaleString()}`);
          console.log(
            `   Просмотры: ${(item.videoViewCount || item.playCount || 0).toLocaleString()}`
          );
          console.log(
            `   Дата: ${item.timestamp || item.takenAtTimestamp || "не указана"}`
          );

          if (item.caption) {
            const caption =
              typeof item.caption === "string"
                ? item.caption
                : item.caption.text || "";
            console.log(`   Описание: ${caption.substring(0, 50)}...`);
          }
        });

        // Статистика
        console.log(`\n📈 СТАТИСТИКА:`);
        const totalLikes = items.reduce(
          (sum, item) => sum + (item.likesCount || 0),
          0
        );
        const totalViews = items.reduce(
          (sum, item) => sum + (item.videoViewCount || item.playCount || 0),
          0
        );
        const avgLikes = Math.round(totalLikes / items.length);
        const avgViews = Math.round(totalViews / items.length);

        console.log(`   Всего элементов: ${items.length}`);
        console.log(`   Общие лайки: ${totalLikes.toLocaleString()}`);
        console.log(`   Общие просмотры: ${totalViews.toLocaleString()}`);
        console.log(`   Средние лайки: ${avgLikes.toLocaleString()}`);
        console.log(`   Средние просмотры: ${avgViews.toLocaleString()}`);

        // Ищем Reels
        const reels = items.filter(
          (item) =>
            item.type === "Reel" ||
            item.type === "ReelVideo" ||
            item.productType === "clips" ||
            item.url?.includes("/reel/") ||
            item.__typename === "XDTGraphSidecar" // Instagram Reel type
        );

        console.log(`\n🎬 НАЙДЕНО REELS: ${reels.length}`);

        if (reels.length > 0) {
          const viralReels = reels.filter((reel) => {
            const views =
              reel.videoViewCount || reel.playCount || reel.likesCount || 0;
            return views >= 5000;
          });

          console.log(`🔥 ВИРУСНЫЕ REELS (5K+): ${viralReels.length}`);

          viralReels.slice(0, 3).forEach((reel, i) => {
            const views =
              reel.videoViewCount || reel.playCount || reel.likesCount || 0;
            console.log(
              `   ${i + 1}. ${views.toLocaleString()} просмотров - ${reel.url}`
            );
          });
        }
      } else {
        console.log(`❌ НЕТ РЕЗУЛЬТАТОВ для пользователя ${username}`);
      }
    } else {
      console.log(`❌ ОШИБКА ВЫПОЛНЕНИЯ:`);
      console.log(`   Статус: ${run.status}`);
      console.log(`   Сообщение: ${run.statusMessage || "нет сообщения"}`);
    }
  } catch (error: any) {
    console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА:`, error.message || error);
    if (error.statusCode) {
      console.log(`   HTTP код: ${error.statusCode}`);
    }
  }
}

testCustomReelScraper().catch(console.error);
