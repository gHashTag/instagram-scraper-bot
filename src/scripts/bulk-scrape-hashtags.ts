/**
 * Скрипт для массового парсинга Reels по хэштегам за указанный период
 *
 * Использование:
 * bun run src/scripts/bulk-scrape-hashtags.ts <projectId> <token> [daysBack] [minViews] [limitPerHashtag]
 *
 * Параметры:
 * - projectId: ID проекта
 * - token: Токен Apify API
 * - daysBack: (опционально) Количество дней назад для парсинга (по умолчанию 30)
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - limitPerHashtag: (опционально) Максимальное количество Reels для парсинга на один хэштег (по умолчанию 100)
 */

import {
  initializeDBConnection,
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

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error(
    "Использование: bun run src/scripts/bulk-scrape-hashtags.ts <projectId> <token> [daysBack] [minViews] [limitPerHashtag]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const apifyToken = args[1];
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const minViews = args[3] ? parseInt(args[3], 10) : 50000;
const limitPerHashtag = args[4] ? parseInt(args[4], 10) : 100;

if (
  isNaN(projectId) ||
  isNaN(daysBack) ||
  isNaN(minViews) ||
  isNaN(limitPerHashtag)
) {
  logger.error(
    "Ошибка: projectId, daysBack, minViews и limitPerHashtag должны быть числами"
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
 * Основная функция скрипта
 */
async function main() {
  logger.info(
    `Запуск массового парсинга Reels по хэштегам для проекта ${projectId}`
  );
  logger.info(
    `Параметры: за последние ${daysBack} дней, минимум ${minViews} просмотров, лимит на хэштег: ${limitPerHashtag}`
  );
  logger.info(`Используется токен Apify: ${apifyToken}`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Создаем уникальный ID для запуска парсинга
    const runId = uuidv4();

    // Логируем начало парсинга
    try {
      await logParsingRun({
        run_id: runId,
        project_id: projectId,
        source_type: "bulk_hashtags",
        status: "started",
        started_at: new Date(),
        reels_found_count: 0,
        reels_added_count: 0,
        errors_count: 0,
        log_message: `Начало массового парсинга хэштегов для проекта ${projectId} за последние ${daysBack} дней с минимум ${minViews} просмотров`,
      });
    } catch (error) {
      logger.error("Ошибка при логировании запуска парсинга:", error);
      // Продолжаем выполнение даже при ошибке логирования
    }

    // Получаем все хэштеги проекта
    const hashtags = await getTrackingHashtagsByProjectId(projectId);

    if (hashtags.length === 0) {
      logger.error(`В проекте ${projectId} не найдено хэштегов`);

      // Обновляем статус парсинга
      try {
        await updateParsingRun(runId, {
          status: "failed",
          ended_at: new Date(),
          log_message: `В проекте ${projectId} не найдено хэштегов`,
        });
      } catch (error) {
        logger.error("Ошибка при обновлении статуса парсинга:", error);
      }

      process.exit(1);
    }

    logger.info(`Найдено ${hashtags.length} хэштегов для проекта ${projectId}`);

    let totalReelsAdded = 0;
    let totalReelsFound = 0;
    let errorsCount = 0;

    // Обрабатываем каждый хэштег
    for (const hashtag of hashtags) {
      logger.info(
        `Обработка хэштега: #${hashtag.tag_name} (ID: ${hashtag.id})`
      );

      try {
        // Запускаем скрапинг для текущего хэштега
        const reelsAdded = await scrapeInstagramReels(
          db,
          projectId,
          "hashtag",
          hashtag.id,
          `#${hashtag.tag_name}`,
          {
            limit: limitPerHashtag,
            apifyToken,
            minViews: minViews,
            maxAgeDays: daysBack,
          }
        );

        totalReelsAdded += reelsAdded;
        totalReelsFound += reelsAdded; // В данном случае считаем найденными только добавленные

        logger.info(
          `Добавлено ${reelsAdded} новых Reels для хэштега #${hashtag.tag_name}`
        );

        // Обновляем статус парсинга
        try {
          await updateParsingRun(runId, {
            reels_found_count: totalReelsFound,
            reels_added_count: totalReelsAdded,
            log_message: `Обработан хэштег #${hashtag.tag_name}, добавлено ${reelsAdded} Reels`,
          });
        } catch (error) {
          logger.error(
            `Ошибка при обновлении статуса парсинга для хэштега #${hashtag.tag_name}:`,
            error
          );
        }

        // Делаем небольшую паузу между запросами, чтобы не перегружать API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(
          `Ошибка при скрапинге хэштега #${hashtag.tag_name}:`,
          error
        );
        errorsCount++;

        // Обновляем статус парсинга с ошибкой
        try {
          await updateParsingRun(runId, {
            errors_count: errorsCount,
            error_details: {
              lastError: `Ошибка при скрапинге хэштега #${hashtag.tag_name}: ${error instanceof Error ? error.message : String(error)}`,
              source: "hashtag",
              sourceId: hashtag.id,
            },
          });
        } catch (updateError) {
          logger.error(
            `Ошибка при обновлении статуса парсинга с ошибкой для хэштега #${hashtag.tag_name}:`,
            updateError
          );
        }

        // Продолжаем с следующим хэштегом
      }
    }

    // Завершаем парсинг
    const status = errorsCount > 0 ? "completed_with_errors" : "completed";
    try {
      await updateParsingRun(runId, {
        status,
        ended_at: new Date(),
        log_message: `Массовый парсинг завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`,
      });
    } catch (error) {
      logger.error("Ошибка при завершении парсинга:", error);
    }

    logger.info(
      `Массовый парсинг завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`
    );
  } catch (error) {
    logger.error(
      "Критическая ошибка при выполнении массового парсинга:",
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
