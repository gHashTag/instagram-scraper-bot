/**
 * Скрипт для тестирования актора instagram-scraper
 * 
 * Использование:
 * bun run src/scripts/test-instagram-scraper.ts
 */

import axios from "axios";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем токен Apify из .env файла
const apifyApiToken = process.env.APIFY_TOKEN;

if (!apifyApiToken) {
  console.error("APIFY_TOKEN не найден в .env файле");
  process.exit(1);
}

console.log(`Используем токен Apify: ${apifyApiToken.substring(0, 15)}...`);

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для тестирования актора instagram-scraper
async function testInstagramScraper(token: string): Promise<void> {
  try {
    // Получаем информацию об акторе instagram-scraper
    const actorInfoUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper?token=${token}`;
    console.log(`Запрос информации об акторе instagram-scraper: ${actorInfoUrl}`);
    
    const actorInfoResponse = await axios.get(actorInfoUrl);
    console.log("Информация об акторе instagram-scraper:");
    console.log(JSON.stringify(actorInfoResponse.data, null, 2));
    
    // Получаем информацию о последних запусках актора
    const actorRunsUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${token}`;
    console.log(`\nЗапрос информации о последних запусках актора: ${actorRunsUrl}`);
    
    const actorRunsResponse = await axios.get(actorRunsUrl);
    console.log("Информация о последних запусках актора:");
    console.log(JSON.stringify(actorRunsResponse.data, null, 2));
    
    // Тестируем запуск актора с хэштегом
    const testRunUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`;
    console.log(`\nТестовый запуск актора с хэштегом #hydrafacial: ${testRunUrl}`);
    
    try {
      const testRunResponse = await axios.post(testRunUrl, {
        hashtags: ["hydrafacial"],
        resultsLimit: 10,
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      });
      
      console.log("Ответ API (тестовый запуск актора):");
      console.log(`Получено ${testRunResponse.data.length} результатов`);
      
      // Сохраняем результаты в файл
      const tempDir = path.join(process.cwd(), "temp");
      ensureDirectoryExists(tempDir);
      const outputPath = path.join(tempDir, "instagram-scraper-results.json");
      
      fs.writeFileSync(outputPath, JSON.stringify(testRunResponse.data, null, 2));
      console.log(`Результаты сохранены в файл: ${outputPath}`);
      
      // Выводим первые 3 результата
      console.log("\nПервые 3 результата:");
      for (let i = 0; i < Math.min(3, testRunResponse.data.length); i++) {
        const result = testRunResponse.data[i];
        console.log(`\nРезультат ${i + 1}:`);
        console.log(`Тип: ${result.type}`);
        console.log(`URL: ${result.url}`);
        console.log(`Автор: ${result.ownerUsername}`);
        console.log(`Просмотры: ${result.videoViewCount}`);
        console.log(`Лайки: ${result.likesCount}`);
        console.log(`Комментарии: ${result.commentsCount}`);
        console.log(`Описание: ${result.caption}`);
      }
      
      console.log("\nТестовый запуск успешен! Актор instagram-scraper доступен и работает корректно.");
    } catch (error) {
      console.error("\nОшибка при тестовом запуске актора instagram-scraper:");
      
      if (axios.isAxiosError(error)) {
        console.error(`Статус ошибки: ${error.response?.status}`);
        console.error(`Сообщение ошибки: ${error.message}`);
        console.error("Данные ответа:");
        console.error(JSON.stringify(error.response?.data, null, 2));
        
        if (error.response?.status === 403) {
          console.error("\nОшибка 403 (Forbidden) означает, что у вас нет доступа к актору instagram-scraper.");
          console.error("Возможные причины:");
          console.error("1. Ваш план Apify не включает доступ к актору instagram-scraper");
          console.error("2. У вас закончились кредиты для запуска актора instagram-scraper");
          console.error("3. Ваш токен не имеет достаточных прав для запуска актора instagram-scraper");
        }
      } else {
        console.error(`Неизвестная ошибка: ${error}`);
      }
    }
  } catch (error) {
    console.error("Ошибка при тестировании актора instagram-scraper:", error);
  }
}

// Запускаем функцию для тестирования актора instagram-scraper
testInstagramScraper(apifyApiToken);
