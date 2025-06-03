/**
 * Скрипт для парсинга Reels конкурентов с явным указанием токена Apify
 * 
 * Использование:
 * bun run src/scripts/scrape-with-token.ts <projectId> <competitorId> <token> [limit]
 */

import { initializeDBConnection, getCompetitorAccountsByProjectId } from "../db/neonDB";
import { scrapeInstagramReels } from "../agent/instagram-scraper";
import { logger } from "../logger";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 3) {
  logger.error("Использование: bun run src/scripts/scrape-with-token.ts <projectId> <competitorId> <token> [limit]");
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const competitorId = parseInt(args[1], 10);
const apifyToken = args[2];
const limit = args[3] ? parseInt(args[3], 10) : 5;

if (isNaN(projectId) || isNaN(competitorId) || isNaN(limit)) {
  logger.error("Ошибка: projectId, competitorId и limit должны быть числами");
  process.exit(1);
}

if (!apifyToken || !apifyToken.startsWith("apify_api_")) {
  logger.error("Ошибка: Некорректный токен Apify. Токен должен начинаться с 'apify_api_'");
  process.exit(1);
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Запуск скрапинга Reels для проекта ${projectId}, конкурента ${competitorId}, лимит: ${limit}`);
  logger.info(`Используется токен Apify: ${apifyToken}`);
  
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Если указан конкретный конкурент
    if (competitorId > 0) {
      // Получаем информацию о конкуренте
      const competitors = await getCompetitorAccountsByProjectId(projectId);
      const competitor = competitors.find(c => c.id === competitorId);
      
      if (!competitor) {
        logger.error(`Конкурент с ID ${competitorId} не найден в проекте ${projectId}`);
        process.exit(1);
      }
      
      logger.info(`Начинаем скрапинг Reels для конкурента: ${competitor.username} (ID: ${competitorId})`);
      
      // Запускаем скрапинг
      const reelsAdded = await scrapeInstagramReels(
        db,
        projectId,
        "competitor",
        competitorId,
        competitor.profile_url,
        {
          limit,
          apifyToken, // Используем токен из аргументов командной строки
          minViews: 50000, // Минимальное количество просмотров
          maxAgeDays: 30  // Максимальный возраст Reels в днях
        }
      );
      
      logger.info(`Скрапинг завершен. Добавлено ${reelsAdded} новых Reels для конкурента ${competitor.username}`);
    } 
    // Если указан ID 0, обрабатываем всех конкурентов
    else if (competitorId === 0) {
      // Получаем всех конкурентов проекта
      const competitors = await getCompetitorAccountsByProjectId(projectId);
      
      if (competitors.length === 0) {
        logger.error(`В проекте ${projectId} не найдено конкурентов`);
        process.exit(1);
      }
      
      logger.info(`Найдено ${competitors.length} конкурентов для проекта ${projectId}`);
      
      let totalReelsAdded = 0;
      
      // Обрабатываем каждого конкурента
      for (const competitor of competitors) {
        logger.info(`Обработка конкурента: ${competitor.username} (ID: ${competitor.id})`);
        
        try {
          // Запускаем скрапинг для текущего конкурента
          const reelsAdded = await scrapeInstagramReels(
            db,
            projectId,
            "competitor",
            competitor.id,
            competitor.profile_url,
            {
              limit: Math.floor(limit / competitors.length) || 5, // Распределяем лимит между конкурентами
              apifyToken, // Используем токен из аргументов командной строки
              minViews: 1000,
              maxAgeDays: 90
            }
          );
          
          totalReelsAdded += reelsAdded;
          logger.info(`Добавлено ${reelsAdded} новых Reels для конкурента ${competitor.username}`);
        } catch (error) {
          logger.error(`Ошибка при скрапинге конкурента ${competitor.username}:`, error);
          // Продолжаем с следующим конкурентом
        }
      }
      
      logger.info(`Скрапинг всех конкурентов завершен. Всего добавлено ${totalReelsAdded} новых Reels`);
    } else {
      logger.error("Ошибка: competitorId должен быть положительным числом или 0 (для всех конкурентов)");
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
