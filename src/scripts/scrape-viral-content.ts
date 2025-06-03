/**
 * Скрипт для быстрого скрапинга вирусного контента за месяц
 * 
 * Использование:
 * npm run scrape-viral <projectId> [minViews] [limit]
 */

import dotenv from "dotenv";
import { initializeDBConnection, getTrackingHashtagsByProjectId } from "../db/neonDB";
import { scrapeInstagramReels } from "../agent/instagram-scraper";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

async function scrapeViralContent() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      logger.info("Использование: npm run scrape-viral <projectId> [minViews] [limit]");
      process.exit(1);
    }
    
    const projectId = parseInt(args[0], 10);
    const minViews = args[1] ? parseInt(args[1], 10) : 1000;
    const limit = args[2] ? parseInt(args[2], 10) : 1000;
    
    if (isNaN(projectId)) {
      logger.error("❌ Ошибка: projectId должен быть числом");
      process.exit(1);
    }
    
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    
    if (!APIFY_TOKEN) {
      logger.error("❌ Ошибка: APIFY_TOKEN не найден в переменных окружения");
      process.exit(1);
    }
    
    logger.info(`🔥 ЗАПУСК СКРАПИНГА ВИРУСНОГО КОНТЕНТА`);
    logger.info(`📊 Параметры: ${minViews}+ просмотров за 30 дней`);
    logger.info(`🎯 Проект: ${projectId}, Лимит: ${limit}`);
    
    const db = initializeDBConnection();
    
    // Получаем хэштеги (они работают лучше конкурентов)
    const hashtags = await getTrackingHashtagsByProjectId(projectId);
    
    logger.info(`🏷️ Найдено хэштегов: ${hashtags.length}`);
    
    let totalReelsAdded = 0;
    const limitPerHashtag = Math.floor(limit / hashtags.length) || 10;
    
    // Скрапим хэштеги
    logger.info("🏷️ Начинаем скрапинг хэштегов...");
    for (const hashtag of hashtags) {
      try {
        logger.info(`  🔍 Обрабатываем #${hashtag.tag_name}...`);
        
        const reelsAdded = await scrapeInstagramReels(
          db,
          projectId,
          "hashtag",
          hashtag.id,
          `#${hashtag.tag_name}`,
          {
            limit: limitPerHashtag,
            apifyToken: APIFY_TOKEN,
            minViews: minViews,
            maxAgeDays: 30,
          }
        );
        
        totalReelsAdded += reelsAdded;
        logger.info(`    ✅ Добавлено ${reelsAdded} Reels для #${hashtag.tag_name}`);
        
        // Пауза между запросами
        if (hashtags.indexOf(hashtag) < hashtags.length - 1) {
          logger.info("    ⏳ Пауза 2 секунды...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        logger.error(`    ❌ Ошибка при скрапинге #${hashtag.tag_name}:`, error);
      }
    }
    
    logger.info(`🎉 СКРАПИНГ ЗАВЕРШЕН!`);
    logger.info(`📊 Итого добавлено Reels: ${totalReelsAdded}`);
    logger.info(`🔥 Параметры: ${minViews}+ просмотров за 30 дней`);
    
  } catch (error) {
    logger.error("❌ Ошибка при скрапинге:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
scrapeViralContent();
