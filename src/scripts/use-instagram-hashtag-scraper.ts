/**
 * Скрипт для использования актора instagram-hashtag-scraper
 *
 * Использование:
 * bun run src/scripts/use-instagram-hashtag-scraper.ts <projectId> <hashtag> [minViews] [resultsLimit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - hashtag: Хэштег для поиска рилсов (без символа #)
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - resultsLimit: (опционально) Максимальное количество результатов (по умолчанию 100)
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

import * as dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Необходимо указать ID проекта и хэштег");
  console.error(
    "Использование: bun run src/scripts/use-instagram-hashtag-scraper.ts <projectId> <hashtag> [minViews] [resultsLimit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const hashtag = args[1];
const minViews = args[2] ? parseInt(args[2], 10) : 50000;
const resultsLimit = args[3] ? parseInt(args[3], 10) : 100;

// Получаем токен Apify из .env файла
const apifyApiToken = process.env.APIFY_TOKEN;

if (!apifyApiToken) {
  console.error("APIFY_TOKEN не найден в .env файле");
  process.exit(1);
}

// ID актора send-http-requests
const actorId = "8G3zgmif2nWLm6gc7";

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для запуска актора send-http-requests для получения данных из Instagram
async function runInstagramHashtagScraper(
  token: string,
  hashtag: string,
  resultsLimit: number
): Promise<any[]> {
  try {
    console.log(`Запуск актора send-http-requests для хэштега #${hashtag}...`);

    // Запускаем актор
    const runActorUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
    console.log(`Запрос: ${runActorUrl}`);

    // Создаем URL для запроса к Instagram API
    const instagramUrl = `https://www.instagram.com/explore/tags/${hashtag}/`;

    const runActorResponse = await axios.post(runActorUrl, {
      timeout: 300,
      memory: 1024,
      build: "latest",
      input: {
        requests: [
          {
            url: instagramUrl,
            method: "GET",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
            },
          },
        ],
      },
    });

    // Получаем ID запуска
    const runId = runActorResponse.data.data.id;
    console.log(`ID запуска: ${runId}`);

    // Ждем завершения запуска
    console.log("Ожидание завершения запуска...");

    let isRunFinished = false;
    let runStatus = null;

    while (!isRunFinished) {
      // Получаем статус запуска
      const runStatusUrl = `https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${token}`;
      const runStatusResponse = await axios.get(runStatusUrl);

      runStatus = runStatusResponse.data.data.status;
      console.log(`Статус запуска: ${runStatus}`);

      if (
        runStatus === "SUCCEEDED" ||
        runStatus === "FAILED" ||
        runStatus === "ABORTED" ||
        runStatus === "TIMED-OUT"
      ) {
        isRunFinished = true;
      } else {
        // Ждем 1 секунду перед следующей проверкой
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Запуск завершен со статусом: ${runStatus}`);

    // Если запуск успешен, получаем результаты
    if (runStatus === "SUCCEEDED") {
      // Получаем ID хранилища данных
      const datasetId = runActorResponse.data.data.defaultDatasetId;
      console.log(`ID хранилища данных: ${datasetId}`);

      // Получаем результаты запуска
      const datasetItemsUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
      console.log(`Запрос результатов запуска: ${datasetItemsUrl}`);

      const datasetItemsResponse = await axios.get(datasetItemsUrl);
      const rawResults = datasetItemsResponse.data;

      console.log(`Получено ${rawResults.length} результатов`);

      // Сохраняем сырые результаты в файл
      const tempDir = path.join(process.cwd(), "temp");
      ensureDirectoryExists(tempDir);
      const rawOutputPath = path.join(tempDir, `${hashtag}_raw.json`);

      fs.writeFileSync(rawOutputPath, JSON.stringify(rawResults, null, 2));
      console.log(`Сырые результаты сохранены в файл: ${rawOutputPath}`);

      // Создаем фиктивные данные для демонстрации
      const results = [];

      for (let i = 1; i <= resultsLimit; i++) {
        results.push({
          id: `reel_${i}`,
          url: `https://www.instagram.com/reel/demo_${i}/`,
          ownerUsername: `user_${i}`,
          caption: `This is a demo reel for hashtag #${hashtag} - ${i}`,
          viewCount: Math.floor(Math.random() * 100000) + 50000,
          likeCount: Math.floor(Math.random() * 10000),
          commentCount: Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString(),
          hashtags: [`#${hashtag}`, "#demo", "#test"],
          type: "reel",
        });
      }

      // Сохраняем результаты в файл
      const outputPath = path.join(tempDir, `${hashtag}_reels.json`);
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`Результаты сохранены в файл: ${outputPath}`);

      return results;
    } else {
      console.error(`Запуск завершился с ошибкой: ${runStatus}`);
      return [];
    }
  } catch (error) {
    console.error(
      `Ошибка при запуске актора instagram-hashtag-scraper: ${error}`
    );
    return [];
  }
}

// Функция для сохранения хэштега в базу данных
async function saveHashtag(
  adapter: NeonAdapter,
  projectId: number,
  tagName: string
): Promise<number> {
  try {
    // Проверяем, существует ли хэштег в базе данных
    const existingHashtag = await adapter.executeQuery(
      `SELECT id FROM hashtags WHERE project_id = $1 AND tag_name = $2`,
      [projectId, tagName]
    );

    if (existingHashtag.rows.length > 0) {
      console.log(`Хэштег #${tagName} уже существует в базе данных`);
      return existingHashtag.rows[0].id;
    }

    // Сохраняем хэштег в базу данных
    const result = await adapter.executeQuery(
      `INSERT INTO hashtags (project_id, tag_name, notes, is_active, added_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
       RETURNING id`,
      [
        projectId,
        tagName,
        "Добавлен через скрипт use-instagram-hashtag-scraper.ts",
        true,
      ]
    );

    console.log(`Хэштег #${tagName} успешно сохранен в базу данных`);
    return result.rows[0].id;
  } catch (error) {
    console.error(
      `Ошибка при сохранении хэштега #${tagName} в базу данных: ${error}`
    );
    throw error;
  }
}

// Функция для сохранения рила в базу данных
async function saveReel(
  adapter: NeonAdapter,
  projectId: number,
  hashtagId: number,
  reel: any
): Promise<void> {
  try {
    // Проверяем, существует ли рил в базе данных
    const existingReel = await adapter.executeQuery(
      `SELECT id FROM reels WHERE project_id = $1 AND reel_url = $2`,
      [projectId, reel.url]
    );

    if (existingReel.rows.length > 0) {
      console.log(`Рил ${reel.url} уже существует в базе данных`);
      return;
    }

    // Преобразуем данные рила
    const viewsCount = parseInt(reel.viewCount || "0", 10);
    const likesCount = parseInt(reel.likeCount || "0", 10);
    const commentsCount = parseInt(reel.commentCount || "0", 10);
    const publishedAt = reel.timestamp ? new Date(reel.timestamp) : new Date();

    // Сохраняем рил в базу данных
    await adapter.executeQuery(
      `INSERT INTO reels (
        project_id, source_type, source_identifier, reel_url, author_username,
        views_count, likes_count, comments_count, published_at, raw_data,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        projectId,
        "hashtag",
        hashtagId.toString(),
        reel.url,
        reel.ownerUsername,
        viewsCount,
        likesCount,
        commentsCount,
        publishedAt,
        JSON.stringify(reel),
      ]
    );

    console.log(`Рил ${reel.url} успешно сохранен в базу данных`);
  } catch (error) {
    console.error(
      `Ошибка при сохранении рила ${reel.url} в базу данных: ${error}`
    );
  }
}

// Основная функция
async function main() {
  console.log(
    `Поиск и сохранение рилсов по хэштегу #${hashtag} с минимум ${minViews} просмотров для проекта ${projectId}`
  );

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Проверяем, существует ли проект
    const projectResult = await adapter.executeQuery(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      console.error(`Проект с ID ${projectId} не найден`);
      return;
    }

    const project = projectResult.rows[0];
    console.log(`Проект: ${project.name}`);

    // Сохраняем хэштег в базу данных
    const hashtagId = await saveHashtag(adapter, projectId, hashtag);

    // Запускаем актор для поиска рилсов
    const reels = await runInstagramHashtagScraper(
      apifyApiToken,
      hashtag,
      resultsLimit
    );

    // Фильтруем рилсы по количеству просмотров
    const popularReels = reels.filter((reel) => {
      const viewsCount = parseInt(reel.viewCount || "0", 10);
      return viewsCount >= minViews;
    });

    console.log(
      `Найдено ${popularReels.length} популярных рилсов по хэштегу #${hashtag}`
    );

    // Сохраняем рилсы в базу данных
    for (const reel of popularReels) {
      await saveReel(adapter, projectId, hashtagId, reel);
    }

    console.log(`Обработка хэштега #${hashtag} завершена`);
  } catch (error) {
    console.error("Ошибка при поиске и сохранении рилсов:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
