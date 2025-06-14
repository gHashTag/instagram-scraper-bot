#!/usr/bin/env bun

/**
 * 🧪 Meta Muse Test Filters
 * Тестирование фильтров качества контента
 */

import { ApifyClient } from "apify-client";

// 🔧 Configuration
const MIN_VIEWS = 50000; // Минимум 50K просмотров
const DAYS_BACK = 14; // За последние 2 недели
const TWO_WEEKS_AGO = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);

// 🌐 Initialize Apify
const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN! });

// 🎯 Filter function for quality content
function passesQualityFilter(item: any): boolean {
  // Check views count
  const views = (item.viewsCount as number) || 0;
  if (views < MIN_VIEWS) {
    return false;
  }

  // Check date (last 2 weeks)
  if (item.timestamp) {
    const postDate = new Date(item.timestamp as string);
    if (postDate < TWO_WEEKS_AGO) {
      return false;
    }
  }

  return true;
}

async function testFilters(): Promise<void> {
  console.log("🧪 Meta Muse Test Filters - ЗАПУСК");
  console.log("═".repeat(50));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🎯 ФИЛЬТРЫ:`);
  console.log(
    `   📅 За последние ${DAYS_BACK} дней (с ${TWO_WEEKS_AGO.toLocaleDateString()})`
  );
  console.log(`   👀 Минимум ${MIN_VIEWS.toLocaleString()} просмотров`);

  try {
    // Test with a popular hashtag
    const testHashtag = "AI";
    console.log(`\n🏷️ Тестирование хэштега: #${testHashtag}`);

    // Run Apify scraper
    const run = await apifyClient
      .actor("apify/instagram-hashtag-scraper")
      .call({
        hashtags: [testHashtag],
        resultsLimit: 20,
        addParentData: false,
      });

    console.log(`⏳ Ожидание завершения скрепинга...`);

    // Get results
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    console.log(`📊 Найдено ${items.length} постов для #${testHashtag}`);

    // Apply filters
    const filteredItems = items.filter(passesQualityFilter);
    const filteredCount = items.length - filteredItems.length;

    console.log(
      `🎯 После фильтрации: ${filteredItems.length} постов (отфильтровано: ${filteredCount})`
    );

    // Show examples
    console.log("\n📋 ПРИМЕРЫ ПОСТОВ:");

    items.slice(0, 5).forEach((item, index) => {
      const views = (item.viewsCount as number) || 0;
      const date = item.timestamp ? new Date(item.timestamp as string) : null;
      const passed = passesQualityFilter(item);

      console.log(
        `\n${index + 1}. ${passed ? "✅" : "❌"} ${item.ownerUsername || "Unknown"}`
      );
      console.log(`   👀 Просмотры: ${views.toLocaleString()}`);
      console.log(`   📅 Дата: ${date?.toLocaleDateString() || "Unknown"}`);
      console.log(`   🎯 Фильтр: ${passed ? "ПРОШЕЛ" : "НЕ ПРОШЕЛ"}`);

      if (!passed) {
        if (views < MIN_VIEWS) {
          console.log(`   ❌ Мало просмотров (${views} < ${MIN_VIEWS})`);
        }
        if (date && date < TWO_WEEKS_AGO) {
          console.log(
            `   ❌ Старый пост (${date.toLocaleDateString()} < ${TWO_WEEKS_AGO.toLocaleDateString()})`
          );
        }
      }
    });

    console.log("\n🎯 РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ:");
    console.log(
      `   📊 Общий процент качественного контента: ${Math.round((filteredItems.length / items.length) * 100)}%`
    );
    console.log(`   ✅ Прошли фильтр: ${filteredItems.length} постов`);
    console.log(`   ❌ Отфильтровано: ${filteredCount} постов`);

    if (filteredItems.length > 0) {
      console.log("\n🏆 ФИЛЬТРЫ РАБОТАЮТ КОРРЕКТНО!");
      console.log("🎯 Система готова к сбору качественного контента");
    } else {
      console.log("\n⚠️ ВНИМАНИЕ: Фильтры слишком строгие!");
      console.log("💡 Рекомендуется снизить требования");
    }
  } catch (error) {
    console.error("\n💥 ОШИБКА ТЕСТИРОВАНИЯ:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testFilters().catch(console.error);
}

export { testFilters };
