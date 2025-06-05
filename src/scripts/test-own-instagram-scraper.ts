/**
 * Тест собственного Instagram Hashtag Scraper
 */

import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();

const apifyToken = process.env.APIFY_TOKEN;

if (!apifyToken) {
  console.error("APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

async function testOwnInstagramScraper() {
  console.log(`🎬 Тест собственного Instagram Hashtag Scraper`);
  console.log(`🔑 Токен: ${apifyToken}`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    // Получаем информацию о собственном акторе
    const actorId = "JvHF7SFfNQl9VZSpC"; // instagram-hashtag-scraper
    const actorInfo = await client.actor(actorId).get();

    console.log(`\n📋 ИНФОРМАЦИЯ ОБ АКТОРЕ:`);
    console.log(`   ID: ${actorInfo.id}`);
    console.log(`   Название: ${actorInfo.name}`);
    console.log(`   Описание: ${actorInfo.description || "нет"}`);
    console.log(
      `   Версия: ${actorInfo.defaultRunOptions?.build || "default"}`
    );

    // Проверим последние запуски
    const runs = await client.actor(actorId).runs().list({ limit: 5 });
    console.log(`\n📊 ПОСЛЕДНИЕ ЗАПУСКИ (${runs.items.length}):`);
    runs.items.forEach((run, i) => {
      console.log(`   ${i + 1}. ${run.id} - ${run.status} (${run.startedAt})`);
      if (run.stats?.inputBodyLen) {
        console.log(`      Входные данные: ${run.stats.inputBodyLen} байт`);
      }
      if (run.stats?.outputBodyLen) {
        console.log(`      Результат: ${run.stats.outputBodyLen} байт`);
      }
    });

    // Попробуем запустить актор с тестовыми данными
    console.log(`\n🚀 ЗАПУСК ТЕСТОВОГО СКРАПИНГА:`);

    // Тестируем с эстетической медициной - популярной темой
    const testInputs = [
      {
        name: "Эстетическая медицина",
        hashtags: ["estheticmedicine", "skincare", "beautytreatment"],
        resultsLimit: 10,
      },
      {
        name: "Медицинская косметология",
        hashtags: ["medicalcosmetology", "cosmetology", "antiaging"],
        resultsLimit: 10,
      },
    ];

    for (const testInput of testInputs) {
      try {
        console.log(`\n🔍 Тест: ${testInput.name}`);
        console.log(`   Хештеги: ${testInput.hashtags.join(", ")}`);

        const run = await client.actor(actorId).call(
          {
            hashtags: testInput.hashtags,
            resultsLimit: testInput.resultsLimit,
            // Возможные параметры (зависят от вашего актора)
            includeReels: true,
            onlyReels: true,
            minViews: 1000,
          },
          {
            waitSecs: 60, // Ждем 1 минуту результата
            memory: 512, // Минимальная память
          }
        );

        console.log(`   ✅ Запуск завершен: ${run.id}`);
        console.log(`   Статус: ${run.status}`);

        if (run.status === "SUCCEEDED") {
          // Получаем результаты
          const { items } = await client
            .dataset(run.defaultDatasetId)
            .listItems();
          console.log(`   📊 Получено элементов: ${items.length}`);

          if (items.length > 0) {
            console.log(`\n🎬 ПРИМЕРЫ РЕЗУЛЬТАТОВ:`);
            items.slice(0, 3).forEach((item, i) => {
              console.log(
                `   ${i + 1}. ${item.url || item.shortCode || item.id}`
              );
              console.log(
                `      Тип: ${item.type || item.productType || "неизвестен"}`
              );
              console.log(`      Лайки: ${item.likesCount || "не указаны"}`);
              console.log(
                `      Просмотры: ${item.videoViewCount || item.playCount || "не указаны"}`
              );
              console.log(`      Дата: ${item.timestamp || "не указана"}`);
              console.log(
                `      Описание: ${item.caption ? item.caption.substring(0, 50) + "..." : "нет"}`
              );
              console.log("");
            });

            // Проверим, есть ли среди результатов Reels
            const reels = items.filter(
              (item) =>
                item.type === "ReelVideo" ||
                item.productType === "clips" ||
                item.url?.includes("/reel/")
            );

            console.log(`   🎬 НАЙДЕНО REELS: ${reels.length}`);

            if (reels.length > 0) {
              console.log(`   🔥 REELS С ВЫСОКИМИ ПРОСМОТРАМИ:`);
              const viralReels = reels.filter((reel) => {
                const views =
                  reel.videoViewCount || reel.playCount || reel.likesCount || 0;
                return views >= 5000;
              });
              console.log(
                `      Всего вирусных reels (5K+): ${viralReels.length}`
              );
            }
          }
        } else {
          console.log(`   ❌ Ошибка: ${run.status}`);
          if (run.statusMessage) {
            console.log(`      Сообщение: ${run.statusMessage}`);
          }
        }
      } catch (testError) {
        console.log(
          `   ❌ Ошибка теста "${testInput.name}": ${testError.message}`
        );
      }
    }
  } catch (error) {
    console.error(`❌ ОШИБКА:`, error.message);
  }
}

testOwnInstagramScraper().catch(console.error);
