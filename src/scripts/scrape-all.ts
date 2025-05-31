/**
 * Скрипт для полного парсинга Reels (конкуренты + хештеги) с использованием Apify API
 *
 * Использование:
 * bun run src/scripts/scrape-all.ts <projectId> [limit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - limit: (опционально) общий максимальный лимит Reels для парсинга (по умолчанию 20)
 */

import {
  initializeDBConnection,
  getCompetitorAccountsByProjectId,
  getTrackingHashtagsByProjectId,
  logParsingRun,
  updateParsingRun,
} from "../db/neonDB";
import { scrapeInstagramReels } from "../agent/instagram-scraper";
import { logger } from "../logger";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие токена Apify
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  logger.error(
    "Ошибка: Не указан токен Apify (APIFY_TOKEN) в переменных окружения"
  );
  process.exit(1);
}

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/scrape-all.ts <projectId> [limit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const totalLimit = args[1] ? parseInt(args[1], 10) : 20;

if (isNaN(projectId) || isNaN(totalLimit)) {
  logger.error("Ошибка: projectId и limit должны быть числами");
  process.exit(1);
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(
    `Запуск полного скрапинга Reels для проекта ${projectId}, общий лимит: ${totalLimit}`
  );

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Создаем уникальный ID для запуска парсинга
    const runId = uuidv4();

    // Логируем начало парсинга
    await logParsingRun({
      run_id: runId,
      project_id: projectId,
      source_type: "overall",
      status: "started",
      started_at: new Date(),
      reels_found_count: 0,
      reels_added_count: 0,
      errors_count: 0,
      log_message: `Начало полного скрапинга для проекта ${projectId}`,
    });

    // Получаем всех конкурентов и хештеги проекта
    const competitors = await getCompetitorAccountsByProjectId(projectId);
    const hashtags = await getTrackingHashtagsByProjectId(projectId);

    const totalSources = competitors.length + hashtags.length;

    if (totalSources === 0) {
      logger.error(
        `В проекте ${projectId} не найдено конкурентов или хештегов`
      );

      // Обновляем статус парсинга
      await updateParsingRun(runId, {
        status: "failed",
        ended_at: new Date(),
        log_message: `В проекте ${projectId} не найдено конкурентов или хештегов`,
      });

      process.exit(1);
    }

    logger.info(
      `Найдено ${competitors.length} конкурентов и ${hashtags.length} хештегов для проекта ${projectId}`
    );

    // Распределяем лимит между источниками
    const limitPerSource = Math.floor(totalLimit / totalSources) || 2;

    let totalReelsAdded = 0;
    let totalReelsFound = 0;
    let errorsCount = 0;

    // Обрабатываем конкурентов
    for (const competitor of competitors) {
      logger.info(
        `Обработка конкурента: ${competitor.username} (ID: ${competitor.id})`
      );

      try {
        // Запускаем скрапинг для текущего конкурента
        const reelsAdded = await scrapeInstagramReels(
          db,
          projectId,
          "competitor",
          competitor.id,
          competitor.profile_url,
          {
            limit: limitPerSource,
            apifyToken: APIFY_TOKEN,
            minViews: 1000,
            maxAgeDays: 90,
          }
        );

        totalReelsAdded += reelsAdded;
        totalReelsFound += reelsAdded; // В данном случае считаем найденными только добавленные

        logger.info(
          `Добавлено ${reelsAdded} новых Reels для конкурента ${competitor.username}`
        );

        // Обновляем статус парсинга
        await updateParsingRun(runId, {
          reels_found_count: totalReelsFound,
          reels_added_count: totalReelsAdded,
          log_message: `Обработан конкурент ${competitor.username}, добавлено ${reelsAdded} Reels`,
        });
      } catch (error) {
        logger.error(
          `Ошибка при скрапинге конкурента ${competitor.username}:`,
          error
        );
        errorsCount++;

        // Обновляем статус парсинга с ошибкой
        await updateParsingRun(runId, {
          errors_count: errorsCount,
          error_details: {
            lastError: `Ошибка при скрапинге конкурента ${competitor.username}: ${error instanceof Error ? error.message : String(error)}`,
            source: "competitor",
            sourceId: competitor.id,
          },
        });

        // Продолжаем с следующим источником
      }
    }

    // Обрабатываем хештеги
    for (const hashtag of hashtags) {
      logger.info(
        `Обработка хештега: #${hashtag.tag_name} (ID: ${hashtag.id})`
      );

      try {
        // Запускаем скрапинг для текущего хештега
        const reelsAdded = await scrapeInstagramReels(
          db,
          projectId,
          "hashtag",
          hashtag.id,
          `#${hashtag.tag_name}`,
          {
            limit: limitPerSource,
            apifyToken: APIFY_TOKEN,
            minViews: 1000,
            maxAgeDays: 90,
          }
        );

        totalReelsAdded += reelsAdded;
        totalReelsFound += reelsAdded; // В данном случае считаем найденными только добавленные

        logger.info(
          `Добавлено ${reelsAdded} новых Reels для хештега #${hashtag.tag_name}`
        );

        // Обновляем статус парсинга
        await updateParsingRun(runId, {
          reels_found_count: totalReelsFound,
          reels_added_count: totalReelsAdded,
          log_message: `Обработан хештег #${hashtag.tag_name}, добавлено ${reelsAdded} Reels`,
        });
      } catch (error) {
        logger.error(
          `Ошибка при скрапинге хештега #${hashtag.tag_name}:`,
          error
        );
        errorsCount++;

        // Обновляем статус парсинга с ошибкой
        await updateParsingRun(runId, {
          errors_count: errorsCount,
          error_details: {
            lastError: `Ошибка при скрапинге хештега #${hashtag.tag_name}: ${error instanceof Error ? error.message : String(error)}`,
            source: "hashtag",
            sourceId: hashtag.id,
          },
        });

        // Продолжаем с следующим источником
      }
    }

    // Завершаем парсинг
    const status = errorsCount > 0 ? "completed_with_errors" : "completed";
    await updateParsingRun(runId, {
      status,
      ended_at: new Date(),
      log_message: `Скрапинг завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`,
    });

    logger.info(
      `Полный скрапинг завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`
    );
  } catch (error) {
    logger.error("Критическая ошибка при выполнении скрапинга:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
