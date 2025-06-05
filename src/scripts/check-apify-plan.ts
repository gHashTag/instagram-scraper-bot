/**
 * Проверка тарифного плана Apify и доступных акторов
 */

import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

dotenv.config();

const apifyToken = process.env.APIFY_TOKEN;

if (!apifyToken) {
  console.error("APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

async function checkApifyPlan() {
  console.log(`🔍 Проверяем план Apify`);
  console.log(`🔑 Токен: ${apifyToken}`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    // Получаем информацию о пользователе
    const user = await client.user().get();
    console.log(`\n👤 ПОЛЬЗОВАТЕЛЬ:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   План ID: ${user.plan.id}`);
    console.log(`   Описание плана: ${user.plan.description}`);
    console.log(
      `   Включенные функции: ${user.plan.enabledPlatformFeatures.join(", ")}`
    );
    console.log(
      `   Максимальная стоимость в месяц: $${user.plan.maxMonthlyUsageUsd}`
    );

    // Пробуем найти собственные акторы
    console.log(`\n🏠 СОБСТВЕННЫЕ АКТОРЫ:`);
    try {
      const myActors = await client.actors().list({ my: true });
      console.log(
        `   Количество собственных акторов: ${myActors.items.length}`
      );

      myActors.items.forEach((actor) => {
        console.log(`   - ${actor.name} (ID: ${actor.id})`);
      });
    } catch (myActorsError) {
      console.log(
        `   ❌ Ошибка получения собственных акторов: ${myActorsError.message}`
      );
    }

    // Выводим рекомендации
    console.log(`\n💡 АНАЛИЗ ПЛАНА:`);
    console.log(`   ✅ У вас есть поддержка собственных акторов`);

    if (user.plan.enabledPlatformFeatures.includes("ACTORS_PUBLIC_DEVELOPER")) {
      console.log(
        `   ⚠️  Ваш план поддерживает только собственные акторы, не публичные`
      );
      console.log(`   💡 Решения:`);
      console.log(`      1. Создать собственный актор для Instagram scraping`);
      console.log(`      2. Использовать прямые HTTP запросы к Instagram`);
      console.log(`      3. Попробовать другие сервисы scraping`);
    }

    // Проверим, есть ли веб-скрепер (он иногда доступен на всех планах)
    console.log(`\n🔍 ПРОВЕРКА УНИВЕРСАЛЬНОГО СКРЕПЕРА:`);
    try {
      const webScraperInfo = await client.actor("apify/web-scraper").get();
      console.log(`   ✅ Web Scraper доступен: ${webScraperInfo.name}`);
      console.log(
        `   💡 Можно использовать Web Scraper для создания кастомного Instagram скрепера`
      );
    } catch (error) {
      console.log(`   ❌ Web Scraper недоступен: ${error.message}`);
    }
  } catch (error) {
    console.error(`❌ ОШИБКА:`, error.message);
  }
}

checkApifyPlan().catch(console.error);
