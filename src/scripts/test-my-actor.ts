/**
 * Скрипт для тестирования собственного актора
 *
 * Использование:
 * bun run src/scripts/test-my-actor.ts
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

// Функция для тестирования собственного актора
async function testMyActor(token: string): Promise<void> {
  try {
    // Получаем список акторов, созданных пользователем
    const myActorsUrl = `https://api.apify.com/v2/acts?token=${token}&my=true`;
    console.log(`Запрос списка акторов, созданных пользователем: ${myActorsUrl}`);

    const myActorsResponse = await axios.get(myActorsUrl);
    console.log("Список акторов, созданных пользователем:");
    console.log(JSON.stringify(myActorsResponse.data, null, 2));

    // Выбираем актор my-crawler-playwright из списка
    if (myActorsResponse.data.data.items.length === 0) {
      console.error("У вас нет собственных акторов");
      return;
    }

    const myActor = myActorsResponse.data.data.items.find(actor => actor.name === "my-crawler-playwright");

    if (!myActor) {
      console.error("Актор my-crawler-playwright не найден");
      return;
    }
    console.log(`\nВыбран актор: ${myActor.name} (${myActor.id})`);

    // Получаем информацию об акторе
    const actorInfoUrl = `https://api.apify.com/v2/acts/${myActor.id}?token=${token}`;
    console.log(`Запрос информации об акторе: ${actorInfoUrl}`);

    const actorInfoResponse = await axios.get(actorInfoUrl);
    console.log("Информация об акторе:");
    console.log(JSON.stringify(actorInfoResponse.data, null, 2));

    // Получаем информацию о последних запусках актора
    const actorRunsUrl = `https://api.apify.com/v2/acts/${myActor.id}/runs?token=${token}`;
    console.log(`\nЗапрос информации о последних запусках актора: ${actorRunsUrl}`);

    const actorRunsResponse = await axios.get(actorRunsUrl);
    console.log("Информация о последних запусках актора:");
    console.log(JSON.stringify(actorRunsResponse.data, null, 2));

    // Проверяем, можно ли запустить актор
    console.log(`\nПроверка возможности запуска актора ${myActor.name}...`);

    try {
      // Тестируем запуск актора
      const testRunUrl = `https://api.apify.com/v2/acts/${myActor.id}/runs?token=${token}`;
      console.log(`Тестовый запуск актора: ${testRunUrl}`);

      const testRunResponse = await axios.post(testRunUrl, {
        timeout: 60,
        memory: 1024,
        build: "latest"
      });

      console.log("Ответ API (тестовый запуск актора):");
      console.log(JSON.stringify(testRunResponse.data, null, 2));

      // Получаем ID запуска
      const runId = testRunResponse.data.data.id;
      console.log(`ID запуска: ${runId}`);

      // Ждем завершения запуска
      console.log("Ожидание завершения запуска...");

      let isFinished = false;
      let runStatus = null;

      while (!isFinished) {
        // Получаем статус запуска
        const runStatusUrl = `https://api.apify.com/v2/acts/${myActor.id}/runs/${runId}?token=${token}`;
        const runStatusResponse = await axios.get(runStatusUrl);

        runStatus = runStatusResponse.data.data.status;
        console.log(`Статус запуска: ${runStatus}`);

        if (runStatus === "SUCCEEDED" || runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
          isFinished = true;
        } else {
          // Ждем 1 секунду перед следующей проверкой
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Запуск завершен со статусом: ${runStatus}`);

      // Если запуск успешен, получаем результаты
      if (runStatus === "SUCCEEDED") {
        // Получаем ID хранилища данных
        const datasetId = testRunResponse.data.data.defaultDatasetId;
        console.log(`ID хранилища данных: ${datasetId}`);

        // Получаем результаты запуска
        const datasetItemsUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
        console.log(`Запрос результатов запуска: ${datasetItemsUrl}`);

        const datasetItemsResponse = await axios.get(datasetItemsUrl);
        console.log("Результаты запуска:");
        console.log(JSON.stringify(datasetItemsResponse.data, null, 2));

        // Сохраняем результаты в файл
        const tempDir = path.join(process.cwd(), "temp");
        ensureDirectoryExists(tempDir);
        const outputPath = path.join(tempDir, `${myActor.name}-results.json`);

        fs.writeFileSync(outputPath, JSON.stringify(datasetItemsResponse.data, null, 2));
        console.log(`Результаты сохранены в файл: ${outputPath}`);
      }

      console.log("\nТестовый запуск успешен! Актор доступен и работает корректно.");
    } catch (error) {
      console.error("\nОшибка при тестовом запуске актора:");

      if (axios.isAxiosError(error)) {
        console.error(`Статус ошибки: ${error.response?.status}`);
        console.error(`Сообщение ошибки: ${error.message}`);
        console.error("Данные ответа:");
        console.error(JSON.stringify(error.response?.data, null, 2));
      } else {
        console.error(`Неизвестная ошибка: ${error}`);
      }
    }
  } catch (error) {
    console.error("Ошибка при тестировании актора:", error);
  }
}

// Запускаем функцию для тестирования собственного актора
testMyActor(apifyApiToken);
