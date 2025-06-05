/**
 * Скрипт для массового парсинга Reels конкурентов с использованием Instagram Post Scraper
 * Версия 2.0 - использует apify/instagram-post-scraper вместо apify/instagram-scraper
 *
 * Использование:
 * bun run src/scripts/bulk-scrape-competitors-v2.ts <projectId> <token> [monthsBack] [limitPerCompetitor] [minViews]
 */

import {
  initializeDBConnection,
  getCompetitorAccountsByProjectId,
  logParsingRun,
  updateParsingRun,
  saveReel,
  checkReelExists,
} from "../db/neonDB";
import { ApifyClient } from "apify-client";
import { logger } from "../logger";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error(
    "Использование: bun run src/scripts/bulk-scrape-competitors-v2.ts <projectId> <token> [monthsBack] [limitPerCompetitor] [minViews]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const apifyToken = args[1];
const monthsBack = args[2] ? parseFloat(args[2]) : 6; // Поддерживаем дробные значения (0.5 = 2 недели)
const limitPerCompetitor = args[3] ? parseInt(args[3], 10) : 100;
const minViews = args[4] ? parseInt(args[4], 10) : 1000;

if (
  isNaN(projectId) ||
  isNaN(monthsBack) ||
  isNaN(limitPerCompetitor) ||
  isNaN(minViews)
) {
  logger.error(
    "Ошибка: projectId, monthsBack, limitPerCompetitor и minViews должны быть числами"
  );
  process.exit(1);
}

if (!apifyToken || !apifyToken.startsWith("apify_api_")) {
  logger.error(
    "Ошибка: Некорректный токен Apify. Токен должен начинаться с 'apify_api_'"
  );
  process.exit(1);
}

/**
 * Скрапинг одного конкурента с помощью Instagram Post Scraper
 */
async function scrapeCompetitorReels(
  client: ApifyClient,
  username: string,
  limit: number,
  minViews: number,
  maxAgeDays: number
): Promise<number> {
  try {
    // Запускаем Instagram Post Scraper
    const run = await client.actor("apify/instagram-post-scraper").call({
      username: [username],
      resultsLimit: limit,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    logger.info(
      `Получено ${items.length} элементов от Instagram Post Scraper для ${username}`
    );

    if (items.length === 0) {
      return 0;
    }

    // Фильтруем по дате и просмотрам
    const maxAgeDate = new Date();
    maxAgeDate.setDate(maxAgeDate.getDate() - maxAgeDays);

    const filteredReels = items.filter((item: any) => {
      // Проверяем, является ли пост Reel/Video
      const isReel =
        item.type === "Video" || item.url?.includes("/reel/") || item.videoUrl;
      if (!isReel) return false;

      // Проверяем дату
      if (item.timestamp) {
        const pubDate = new Date(item.timestamp);
        if (pubDate < maxAgeDate) return false;
      }

      // Проверяем просмотры (используем likesCount как приблизительную метрику)
      const views = item.viewsCount || item.likesCount || 0;
      if (views < minViews) return false;

      return true;
    });

    logger.info(
      `После фильтрации осталось ${filteredReels.length} reels для ${username}`
    );

    // Сохраняем в базу данных
    let savedCount = 0;
    for (const reel of filteredReels) {
      try {
        // Проверяем, существует ли уже этот reel
        const exists = await checkReelExists(reel.url || reel.shortCode);
        if (exists) {
          continue;
        }

        // Сохраняем reel
        const reelData = {
          project_id: projectId,
          source_type: "competitor" as const,
          source_id: null, // Будет установлен в saveReel
          url: reel.url,
          short_code: reel.shortCode,
          caption: reel.caption,
          hashtags: reel.hashtags || [],
          likes_count: reel.likesCount || 0,
          views_count: reel.viewsCount || reel.videoViewCount || 0,
          comments_count: reel.commentsCount || 0,
          published_at: reel.timestamp ? new Date(reel.timestamp) : new Date(),
          owner_username: reel.ownerUsername || username,
          owner_full_name: reel.ownerFullName,
          video_url: reel.videoUrl,
          thumbnail_url: reel.displayUrl,
          duration: reel.videoDuration,
          music_info: reel.musicInfo ? JSON.stringify(reel.musicInfo) : null,
        };

        await saveReel(reelData);
        savedCount++;
      } catch (error) {
        logger.error(`Ошибка при сохранении reel ${reel.url}:`, error);
      }
    }

    return savedCount;
  } catch (error) {
    logger.error(`Ошибка при скрапинге конкурента ${username}:`, error);
    return 0;
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(
    `Запуск массового парсинга Reels конкурентов для проекта ${projectId} (v2.0)`
  );
  logger.info(
    `Параметры: за последние ${monthsBack} месяцев, лимит на конкурента: ${limitPerCompetitor}, минимум просмотров: ${minViews}`
  );
  logger.info(`Используется токен Apify: ${apifyToken}`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Инициализируем Apify клиент
    const client = new ApifyClient({ token: apifyToken });

    // Создаем уникальный ID для запуска парсинга
    const runId = uuidv4();

    // Логируем начало парсинга
    try {
      await logParsingRun({
        run_id: runId,
        project_id: projectId,
        source_type: "bulk_competitors_v2",
        status: "started",
        started_at: new Date(),
        reels_found_count: 0,
        reels_added_count: 0,
        errors_count: 0,
        log_message: `Начало массового парсинга конкурентов v2.0 для проекта ${projectId} за последние ${monthsBack} месяцев`,
      });
    } catch (error) {
      logger.error("Ошибка при логировании запуска парсинга:", error);
    }

    // Получаем всех конкурентов проекта
    const competitors = await getCompetitorAccountsByProjectId(projectId);

    if (competitors.length === 0) {
      logger.error(`В проекте ${projectId} не найдено конкурентов`);
      process.exit(1);
    }

    logger.info(
      `Найдено ${competitors.length} конкурентов для проекта ${projectId}`
    );

    let totalReelsAdded = 0;
    let errorsCount = 0;
    const maxAgeDays = monthsBack * 30; // Примерное количество дней

    // Обрабатываем каждого конкурента
    for (const competitor of competitors) {
      logger.info(
        `Обработка конкурента: ${competitor.username} (ID: ${competitor.id})`
      );

      try {
        const reelsAdded = await scrapeCompetitorReels(
          client,
          competitor.username,
          limitPerCompetitor,
          minViews,
          maxAgeDays
        );

        totalReelsAdded += reelsAdded;

        logger.info(
          `Добавлено ${reelsAdded} новых Reels для конкурента ${competitor.username}`
        );

        // Обновляем статус парсинга
        try {
          await updateParsingRun(runId, {
            reels_added_count: totalReelsAdded,
            log_message: `Обработан конкурент ${competitor.username}, добавлено ${reelsAdded} Reels`,
          });
        } catch (error) {
          logger.error(
            `Ошибка при обновлении статуса парсинга для конкурента ${competitor.username}:`,
            error
          );
        }

        // Делаем паузу между запросами
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        logger.error(
          `Ошибка при скрапинге конкурента ${competitor.username}:`,
          error
        );
        errorsCount++;
      }
    }

    // Завершаем парсинг
    const status = errorsCount > 0 ? "completed_with_errors" : "completed";
    try {
      await updateParsingRun(runId, {
        status,
        ended_at: new Date(),
        log_message: `Массовый парсинг v2.0 завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`,
      });
    } catch (error) {
      logger.error("Ошибка при завершении парсинга:", error);
    }

    logger.info(
      `Массовый парсинг v2.0 завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`
    );
  } catch (error) {
    logger.error(
      "Критическая ошибка при выполнении массового парсинга v2.0:",
      error
    );
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
