/**
 * Скрипт для массового парсинга Reels конкурентов за последние 6 месяцев
 *
 * Использование:
 * bun run src/scripts/bulk-scrape-competitors.ts <projectId> <token> [monthsBack] [limitPerCompetitor] [minViews]
 *
 * Параметры:
 * - projectId: ID проекта
 * - token: Токен Apify API
 * - monthsBack: (опционально) Количество месяцев назад для парсинга (по умолчанию 6)
 * - limitPerCompetitor: (опционально) Максимальное количество Reels для парсинга на одного конкурента (по умолчанию 50)
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 1000)
 */

import {
  initializeDBConnection,
  getCompetitorAccountsByProjectId,
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
    "Использование: bun run src/scripts/bulk-scrape-competitors.ts <projectId> <token> [monthsBack] [limitPerCompetitor] [minViews]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const apifyToken = args[1];
const monthsBack = args[2] ? parseInt(args[2], 10) : 6;
// Устанавливаем очень большое значение, чтобы получить все доступные Reels
const limitPerCompetitor = args[3] ? parseInt(args[3], 10) : 1000;
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
 * Основная функция скрипта
 */
async function main() {
  logger.info(
    `Запуск массового парсинга Reels конкурентов для проекта ${projectId}`
  );
  logger.info(
    `Параметры: за последние ${monthsBack} месяцев, лимит на конкурента: ${limitPerCompetitor}, минимум просмотров: ${minViews}`
  );
  logger.info(`Используется токен Apify: ${apifyToken}`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Создаем уникальный ID для запуска парсинга
    const runId = uuidv4();

    // Рассчитываем дату начала периода (N месяцев назад)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    // Логируем начало парсинга
    try {
      await logParsingRun({
        run_id: runId,
        project_id: projectId,
        source_type: "bulk_competitors",
        status: "started",
        started_at: new Date(), // Передаем объект Date вместо строки
        reels_found_count: 0,
        reels_added_count: 0,
        errors_count: 0,
        log_message: `Начало массового парсинга конкурентов для проекта ${projectId} за последние ${monthsBack} месяцев`,
      });
    } catch (error) {
      logger.error("Ошибка при логировании запуска парсинга:", error);
      // Продолжаем выполнение даже при ошибке логирования
    }

    // Получаем всех конкурентов проекта
    const competitors = await getCompetitorAccountsByProjectId(projectId);

    if (competitors.length === 0) {
      logger.error(`В проекте ${projectId} не найдено конкурентов`);

      // Обновляем статус парсинга
      try {
        await updateParsingRun(runId, {
          status: "failed",
          ended_at: new Date(), // Передаем объект Date вместо строки
          log_message: `В проекте ${projectId} не найдено конкурентов`,
        });
      } catch (error) {
        logger.error("Ошибка при обновлении статуса парсинга:", error);
      }

      process.exit(1);
    }

    logger.info(
      `Найдено ${competitors.length} конкурентов для проекта ${projectId}`
    );

    let totalReelsAdded = 0;
    let totalReelsFound = 0;
    let errorsCount = 0;

    // Обрабатываем каждого конкурента
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
            limit: limitPerCompetitor,
            apifyToken,
            minViews: minViews, // Используем параметр из командной строки
            maxAgeDays: monthsBack * 30, // Примерное количество дней за указанное количество месяцев
          }
        );

        totalReelsAdded += reelsAdded;
        totalReelsFound += reelsAdded; // В данном случае считаем найденными только добавленные

        logger.info(
          `Добавлено ${reelsAdded} новых Reels для конкурента ${competitor.username}`
        );

        // Обновляем статус парсинга
        try {
          await updateParsingRun(runId, {
            reels_found_count: totalReelsFound,
            reels_added_count: totalReelsAdded,
            log_message: `Обработан конкурент ${competitor.username}, добавлено ${reelsAdded} Reels`,
          });
        } catch (error) {
          logger.error(
            `Ошибка при обновлении статуса парсинга для конкурента ${competitor.username}:`,
            error
          );
        }

        // Делаем небольшую паузу между запросами, чтобы не перегружать API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(
          `Ошибка при скрапинге конкурента ${competitor.username}:`,
          error
        );
        errorsCount++;

        // Обновляем статус парсинга с ошибкой
        try {
          await updateParsingRun(runId, {
            errors_count: errorsCount,
            error_details: {
              lastError: `Ошибка при скрапинге конкурента ${competitor.username}: ${error instanceof Error ? error.message : String(error)}`,
              source: "competitor",
              sourceId: competitor.id,
            },
          });
        } catch (updateError) {
          logger.error(
            `Ошибка при обновлении статуса парсинга с ошибкой для конкурента ${competitor.username}:`,
            updateError
          );
        }

        // Продолжаем с следующим конкурентом
      }
    }

    // Завершаем парсинг
    const status = errorsCount > 0 ? "completed_with_errors" : "completed";
    try {
      await updateParsingRun(runId, {
        status,
        ended_at: new Date(), // Передаем объект Date вместо строки
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
