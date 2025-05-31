/**
 * Скрипт для проверки доступа к Instagram Reel Scraper API
 * 
 * Использование:
 * bun run src/scripts/check-instagram-reel-scraper.ts
 */

import axios from "axios";
import * as dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем токен Apify из .env файла
const apifyApiToken = process.env.APIFY_TOKEN;

if (!apifyApiToken) {
  console.error("APIFY_TOKEN не найден в .env файле");
  process.exit(1);
}

console.log(`Используем токен Apify: ${apifyApiToken.substring(0, 15)}...`);

// Функция для проверки доступа к Instagram Reel Scraper API
async function checkInstagramReelScraperAccess(token: string): Promise<void> {
  try {
    // Проверяем доступность актора Instagram Reel Scraper
    const actorInfoUrl = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper?token=${token}`;
    console.log(`Запрос информации о Instagram Reel Scraper: ${actorInfoUrl}`);
    
    const actorInfoResponse = await axios.get(actorInfoUrl);
    console.log("Ответ API (информация о Instagram Reel Scraper):");
    console.log(JSON.stringify(actorInfoResponse.data, null, 2));
    
    // Проверяем доступность запуска актора Instagram Reel Scraper
    const runInfoUrl = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/runs?token=${token}`;
    console.log(`\nЗапрос информации о запусках Instagram Reel Scraper: ${runInfoUrl}`);
    
    const runInfoResponse = await axios.get(runInfoUrl);
    console.log("Ответ API (информация о запусках Instagram Reel Scraper):");
    console.log(JSON.stringify(runInfoResponse.data, null, 2));
    
    // Проверяем возможность запуска актора Instagram Reel Scraper с тестовым хэштегом
    const testRunUrl = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${token}`;
    console.log(`\nТестовый запуск Instagram Reel Scraper с хэштегом #test: ${testRunUrl}`);
    
    try {
      const testRunResponse = await axios.post(testRunUrl, {
        hashtags: ["test"],
        resultsLimit: 1,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      });
      
      console.log("Ответ API (тестовый запуск Instagram Reel Scraper):");
      console.log(JSON.stringify(testRunResponse.data, null, 2));
      
      console.log("\nТестовый запуск успешен! Актор Instagram Reel Scraper доступен и работает корректно.");
    } catch (error) {
      console.error("\nОшибка при тестовом запуске Instagram Reel Scraper:");
      
      if (axios.isAxiosError(error)) {
        console.error(`Статус ошибки: ${error.response?.status}`);
        console.error(`Сообщение ошибки: ${error.message}`);
        console.error("Данные ответа:");
        console.error(JSON.stringify(error.response?.data, null, 2));
        
        if (error.response?.status === 403) {
          console.error("\nОшибка 403 (Forbidden) означает, что у вас нет доступа к Instagram Reel Scraper API.");
          console.error("Возможные причины:");
          console.error("1. Ваш план Apify не включает доступ к Instagram Reel Scraper API");
          console.error("2. У вас закончились кредиты для запуска Instagram Reel Scraper API");
          console.error("3. Ваш токен не имеет достаточных прав для запуска Instagram Reel Scraper API");
          
          // Проверяем план пользователя
          const userInfoUrl = `https://api.apify.com/v2/users/me?token=${token}`;
          console.log(`\nЗапрос информации о пользователе: ${userInfoUrl}`);
          
          try {
            const userInfoResponse = await axios.get(userInfoUrl);
            console.log("Информация о пользователе:");
            console.log(JSON.stringify(userInfoResponse.data, null, 2));
            
            // Проверяем лимиты пользователя
            const limitsUrl = `https://api.apify.com/v2/users/me/limits?token=${token}`;
            console.log(`\nЗапрос информации о лимитах: ${limitsUrl}`);
            
            const limitsResponse = await axios.get(limitsUrl);
            console.log("Информация о лимитах:");
            console.log(JSON.stringify(limitsResponse.data, null, 2));
          } catch (userError) {
            console.error("Ошибка при получении информации о пользователе:", userError);
          }
        }
      } else {
        console.error(`Неизвестная ошибка: ${error}`);
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке доступа к Instagram Reel Scraper API:");
    
    if (axios.isAxiosError(error)) {
      console.error(`Статус ошибки: ${error.response?.status}`);
      console.error(`Сообщение ошибки: ${error.message}`);
      console.error("Данные ответа:");
      console.error(JSON.stringify(error.response?.data, null, 2));
    } else {
      console.error(`Неизвестная ошибка: ${error}`);
    }
  }
}

// Запускаем проверку доступа к Instagram Reel Scraper API
checkInstagramReelScraperAccess(apifyApiToken);
