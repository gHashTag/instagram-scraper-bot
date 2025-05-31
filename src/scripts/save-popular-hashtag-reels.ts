/**
 * Скрипт для поиска популярных рилсов по хэштегам косметологии в Instagram и сохранения их в базу данных
 *
 * Использование:
 * bun run src/scripts/save-popular-hashtag-reels.ts <projectId> [minViews]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import axios from "axios";
import * as dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/save-popular-hashtag-reels.ts <projectId> [minViews]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;

if (isNaN(projectId) || isNaN(minViews)) {
  console.error("Ошибка: projectId и minViews должны быть числами");
  process.exit(1);
}

// Список хэштегов косметологии
const cosmetologyHashtags = [
  "aestheticmedicine",
  "aestheticclinic",
  "cosmetology",
  "hydrafacial",
  "botox",
  "fillers",
  "beautyclinic",
  "skincare",
  "prpfacial",
  "rfmicroneedling",
  "skinrejuvenation",
  "facialtreatment",
  "aesthetictreatment",
];

// Функция для создания директории, если она не существует

// Функция для поиска популярных рилсов по хэштегу с помощью Apify Instagram Reel Scraper API
async function searchPopularReelsByHashtag(
  hashtag: string,
  minViews: number
): Promise<any[]> {
  try {
    console.log(
      `Поиск популярных рилсов по хэштегу #${hashtag} с минимум ${minViews} просмотров...`
    );

    // Используем Apify API для запуска Instagram Reel Scraper
    const apifyApiToken = process.env.APIFY_TOKEN; // Используем токен из .env файла
    if (!apifyApiToken) {
      throw new Error("APIFY_TOKEN не найден в .env файле");
    }

    console.log(`Используем токен Apify: ${apifyApiToken.substring(0, 10)}...`);
    const apiUrl = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${apifyApiToken}`;

    const response = await axios.post(apiUrl, {
      hashtags: [hashtag],
      resultsLimit: 100,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.error(
        `Ошибка при получении данных для хэштега #${hashtag}: Неверный формат ответа`
      );
      return [];
    }

    // Фильтруем рилсы по количеству просмотров
    const popularReels = response.data.filter((reel: any) => {
      const viewsCount = parseInt(reel.viewCount || "0", 10);
      return viewsCount >= minViews;
    });

    console.log(
      `Найдено ${popularReels.length} популярных рилсов по хэштегу #${hashtag}`
    );

    return popularReels;
  } catch (error) {
    console.error(
      `Ошибка при поиске популярных рилсов по хэштегу #${hashtag}: ${error}`
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
        "Добавлен через скрипт save-popular-hashtag-reels.ts",
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
    `Поиск и сохранение популярных рилсов по хэштегам косметологии с минимум ${minViews} просмотров для проекта ${projectId}`
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

    // Обрабатываем каждый хэштег
    for (const hashtag of cosmetologyHashtags) {
      try {
        // Сохраняем хэштег в базу данных
        const hashtagId = await saveHashtag(adapter, projectId, hashtag);

        // Ищем популярные рилсы по хэштегу
        const popularReels = await searchPopularReelsByHashtag(
          hashtag,
          minViews
        );

        // Сохраняем рилсы в базу данных
        for (const reel of popularReels) {
          await saveReel(adapter, projectId, hashtagId, reel);
        }

        console.log(`Обработка хэштега #${hashtag} завершена`);

        // Пауза между запросами
        if (
          cosmetologyHashtags.indexOf(hashtag) <
          cosmetologyHashtags.length - 1
        ) {
          console.log("Пауза перед обработкой следующего хэштега...");
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`Ошибка при обработке хэштега #${hashtag}: ${error}`);
      }
    }

    console.log("Поиск и сохранение популярных рилсов завершены");
  } catch (error) {
    console.error("Ошибка при поиске и сохранении популярных рилсов:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
