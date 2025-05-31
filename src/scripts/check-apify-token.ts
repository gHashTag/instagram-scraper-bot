/**
 * Скрипт для проверки валидности токена Apify
 * 
 * Использование:
 * bun run src/scripts/check-apify-token.ts [token]
 * 
 * Если токен не указан, будет использован токен из переменной окружения APIFY_TOKEN
 */

import { ApifyClient } from "apify-client";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Получаем токен из аргументов командной строки или из переменных окружения
const token = process.argv[2] || process.env.APIFY_TOKEN;

if (!token) {
  console.error("Ошибка: Не указан токен Apify. Укажите его как аргумент или в переменной окружения APIFY_TOKEN");
  process.exit(1);
}

console.log(`Проверка токена Apify: ${token}`);

// Создаем клиент Apify с указанным токеном
const apifyClient = new ApifyClient({
  token: token,
});

// Функция для проверки токена
async function checkToken() {
  try {
    // Получаем информацию о пользователе
    console.log("Запрос информации о пользователе...");
    const user = await apifyClient.user().get();
    console.log("✅ Токен валиден!");
    console.log("Информация о пользователе:");
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Username: ${user.username}`);
    console.log(`- План: ${user.subscription?.plan || "Не указан"}`);
    
    // Получаем список доступных акторов
    console.log("\nПолучение списка акторов...");
    const { items: actors } = await apifyClient.actors().list();
    console.log(`Найдено ${actors.length} акторов:`);
    actors.slice(0, 5).forEach((actor, index) => {
      console.log(`${index + 1}. ${actor.name} (${actor.id})`);
    });
    if (actors.length > 5) {
      console.log(`... и еще ${actors.length - 5}`);
    }
    
    // Проверяем доступность актора Instagram Reel Scraper
    console.log("\nПроверка доступности актора Instagram Reel Scraper...");
    try {
      const instagramActor = await apifyClient.actor("apify/instagram-reel-scraper").get();
      console.log("✅ Актор Instagram Reel Scraper доступен:");
      console.log(`- ID: ${instagramActor.id}`);
      console.log(`- Название: ${instagramActor.name}`);
      console.log(`- Версия: ${instagramActor.version?.versionNumber || "Не указана"}`);
    } catch (error) {
      console.error("❌ Актор Instagram Reel Scraper недоступен:");
      console.error(`- Ошибка: ${error.message}`);
      if (error.message.includes("public Actor")) {
        console.error("- Причина: Ваш текущий план не поддерживает запуск публичных акторов");
        console.error("- Решение: Обновите план Apify до уровня, который поддерживает запуск публичных акторов");
      }
    }
    
    // Проверяем лимиты плана
    console.log("\nПроверка лимитов плана...");
    try {
      const limits = await apifyClient.user().limits();
      console.log("Лимиты плана:");
      console.log(`- Максимальное количество запусков в месяц: ${limits.monthlyActorComputeUnits || "Не ограничено"}`);
      console.log(`- Использовано в этом месяце: ${limits.monthlyActorComputeUnitsUsed || 0}`);
      console.log(`- Максимальное количество параллельных запусков: ${limits.maxParallelActorRuns || "Не указано"}`);
    } catch (error) {
      console.error("❌ Не удалось получить информацию о лимитах плана:");
      console.error(`- Ошибка: ${error.message}`);
    }
    
  } catch (error) {
    console.error("❌ Токен недействителен или произошла ошибка при проверке:");
    console.error(error);
    process.exit(1);
  }
}

// Запускаем проверку токена
checkToken().catch(error => {
  console.error("Необработанная ошибка:", error);
  process.exit(1);
});
