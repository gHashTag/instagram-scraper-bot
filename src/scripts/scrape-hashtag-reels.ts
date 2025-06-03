/**
 * Скрипт для парсинга Reels по хештегам с использованием Apify API
 * 
 * Использование:
 * bun run src/scripts/scrape-hashtag-reels.ts <projectId> <hashtagId> [limit]
 * 
 * Параметры:
 * - projectId: ID проекта
 * - hashtagId: ID хештега (если указан 0, будут обработаны все хештеги проекта)
 * - limit: (опционально) максимальное количество Reels для парсинга (по умолчанию 10)
 */

import { initializeDBConnection, getTrackingHashtagsByProjectId } from "../db/neonDB";
import { scrapeInstagramReels } from "../agent/instagram-scraper";
import { logger } from "../logger";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие токена Apify
const APIFY_TOKEN = process.env.APIFY_TOKEN;
if (!APIFY_TOKEN) {
  logger.error("Ошибка: Не указан токен Apify (APIFY_TOKEN) в переменных окружения");
  process.exit(1);
}

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error("Использование: bun run src/scripts/scrape-hashtag-reels.ts <projectId> <hashtagId> [limit]");
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const hashtagId = parseInt(args[1], 10);
const limit = args[2] ? parseInt(args[2], 10) : 10;

if (isNaN(projectId) || isNaN(hashtagId) || isNaN(limit)) {
  logger.error("Ошибка: projectId, hashtagId и limit должны быть числами");
  process.exit(1);
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Запуск скрапинга Reels для проекта ${projectId}, хештега ${hashtagId}, лимит: ${limit}`);
  
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Если указан конкретный хештег
    if (hashtagId > 0) {
      // Получаем информацию о хештеге
      const hashtags = await getTrackingHashtagsByProjectId(projectId);
      const hashtag = hashtags.find(h => h.id === hashtagId);
      
      if (!hashtag) {
        logger.error(`Хештег с ID ${hashtagId} не найден в проекте ${projectId}`);
        process.exit(1);
      }
      
      logger.info(`Начинаем скрапинг Reels для хештега: #${hashtag.tag_name} (ID: ${hashtagId})`);
      
      // Запускаем скрапинг
      const reelsAdded = await scrapeInstagramReels(
        db,
        projectId,
        "hashtag",
        hashtagId,
        `#${hashtag.tag_name}`,
        {
          limit,
          apifyToken: APIFY_TOKEN,
          minViews: 10000, // Минимальное количество просмотров
          maxAgeDays: 30  // Максимальный возраст Reels в днях
        }
      );
      
      logger.info(`Скрапинг завершен. Добавлено ${reelsAdded} новых Reels для хештега #${hashtag.tag_name}`);
    } 
    // Если указан ID 0, обрабатываем все хештеги
    else if (hashtagId === 0) {
      // Получаем все хештеги проекта
      const hashtags = await getTrackingHashtagsByProjectId(projectId);
      
      if (hashtags.length === 0) {
        logger.error(`В проекте ${projectId} не найдено хештегов`);
        process.exit(1);
      }
      
      logger.info(`Найдено ${hashtags.length} хештегов для проекта ${projectId}`);
      
      let totalReelsAdded = 0;
      
      // Обрабатываем каждый хештег
      for (const hashtag of hashtags) {
        logger.info(`Обработка хештега: #${hashtag.tag_name} (ID: ${hashtag.id})`);
        
        try {
          // Запускаем скрапинг для текущего хештега
          const reelsAdded = await scrapeInstagramReels(
            db,
            projectId,
            "hashtag",
            hashtag.id,
            `#${hashtag.tag_name}`,
            {
              limit: Math.floor(limit / hashtags.length) || 5, // Распределяем лимит между хештегами
              apifyToken: APIFY_TOKEN,
              minViews: 10000,
              maxAgeDays: 30
            }
          );
          
          totalReelsAdded += reelsAdded;
          logger.info(`Добавлено ${reelsAdded} новых Reels для хештега #${hashtag.tag_name}`);
        } catch (error) {
          logger.error(`Ошибка при скрапинге хештега #${hashtag.tag_name}:`, error);
          // Продолжаем с следующим хештегом
        }
      }
      
      logger.info(`Скрапинг всех хештегов завершен. Всего добавлено ${totalReelsAdded} новых Reels`);
    } else {
      logger.error("Ошибка: hashtagId должен быть положительным числом или 0 (для всех хештегов)");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Критическая ошибка при выполнении скрапинга:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
