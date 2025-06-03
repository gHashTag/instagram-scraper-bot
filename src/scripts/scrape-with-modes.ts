/**
 * Скрипт для скрапинга с разными режимами фильтрации
 * 
 * Использование:
 * npm run scrape-mode <projectId> <mode> [limit]
 * 
 * Режимы:
 * - viral: 50K+ просмотров за 7 дней (самый вирусный контент)
 * - popular: 10K+ просмотров за 30 дней (популярный контент)
 * - normal: 1K+ просмотров за 30 дней (обычный контент)
 * - test: 100+ просмотров за 90 дней (для тестирования)
 */

import dotenv from "dotenv";
import { initializeDBConnection } from "../db/neonDB";
import { scrapeInstagramReels } from "../agent/instagram-scraper";
import { getCompetitorAccountsByProjectId, getTrackingHashtagsByProjectId } from "../db/neonDB";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

// Режимы скрапинга
const SCRAPING_MODES = {
  viral: {
    name: "🔥 ВИРУСНЫЙ",
    minViews: 50000,
    maxAgeDays: 7,
    description: "Только самый вирусный контент за неделю"
  },
  popular: {
    name: "📈 ПОПУЛЯРНЫЙ", 
    minViews: 10000,
    maxAgeDays: 30,
    description: "Популярный контент за месяц"
  },
  normal: {
    name: "📊 ОБЫЧНЫЙ",
    minViews: 1000,
    maxAgeDays: 30,
    description: "Обычный контент за месяц"
  },
  test: {
    name: "🧪 ТЕСТОВЫЙ",
    minViews: 100,
    maxAgeDays: 90,
    description: "Для тестирования системы"
  }
};

async function scrapeWithMode() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      logger.info("Использование: npm run scrape-mode <projectId> <mode> [limit]");
      logger.info("Доступные режимы:");
      Object.entries(SCRAPING_MODES).forEach(([key, mode]) => {
        logger.info(`  ${key}: ${mode.name} - ${mode.description}`);
      });
      process.exit(1);
    }
    
    const projectId = parseInt(args[0], 10);
    const modeKey = args[1] as keyof typeof SCRAPING_MODES;
    const limit = args[2] ? parseInt(args[2], 10) : 10;
    
    if (isNaN(projectId)) {
      logger.error("❌ Ошибка: projectId должен быть числом");
      process.exit(1);
    }
    
    if (!SCRAPING_MODES[modeKey]) {
      logger.error(`❌ Ошибка: неизвестный режим "${modeKey}"`);
      logger.info("Доступные режимы: " + Object.keys(SCRAPING_MODES).join(", "));
      process.exit(1);
    }
    
    const mode = SCRAPING_MODES[modeKey];
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    
    if (!APIFY_TOKEN) {
      logger.error("❌ Ошибка: APIFY_TOKEN не найден в переменных окружения");
      process.exit(1);
    }
    
    logger.info(`🚀 Запуск скрапинга в режиме: ${mode.name}`);
    logger.info(`📊 Параметры: ${mode.minViews}+ просмотров за ${mode.maxAgeDays} дней`);
    logger.info(`🎯 Проект: ${projectId}, Лимит: ${limit}`);
    
    const db = initializeDBConnection();
    
    // Получаем конкурентов и хэштеги
    const competitors = await getCompetitorAccountsByProjectId(projectId);
    const hashtags = await getTrackingHashtagsByProjectId(projectId);
    
    logger.info(`👥 Найдено конкурентов: ${competitors.length}`);
    logger.info(`🏷️ Найдено хэштегов: ${hashtags.length}`);
    
    let totalReelsAdded = 0;
    const limitPerSource = Math.floor(limit / (competitors.length + hashtags.length)) || 1;
    
    // Скрапим конкурентов
    logger.info("👥 Начинаем скрапинг конкурентов...");
    for (const competitor of competitors) {
      try {
        logger.info(`  🔍 Обрабатываем @${competitor.username}...`);
        
        const reelsAdded = await scrapeInstagramReels(
          db,
          projectId,
          "competitor",
          competitor.id,
          competitor.profile_url,
          {
            limit: limitPerSource,
            apifyToken: APIFY_TOKEN,
            minViews: mode.minViews,
            maxAgeDays: mode.maxAgeDays,
          }
        );
        
        totalReelsAdded += reelsAdded;
        logger.info(`    ✅ Добавлено ${reelsAdded} Reels для @${competitor.username}`);
        
      } catch (error) {
        logger.error(`    ❌ Ошибка при скрапинге @${competitor.username}:`, error);
      }
    }
    
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
            limit: limitPerSource,
            apifyToken: APIFY_TOKEN,
            minViews: mode.minViews,
            maxAgeDays: mode.maxAgeDays,
          }
        );
        
        totalReelsAdded += reelsAdded;
        logger.info(`    ✅ Добавлено ${reelsAdded} Reels для #${hashtag.tag_name}`);
        
      } catch (error) {
        logger.error(`    ❌ Ошибка при скрапинге #${hashtag.tag_name}:`, error);
      }
    }
    
    logger.info(`🎉 Скрапинг завершен!`);
    logger.info(`📊 Итого добавлено Reels: ${totalReelsAdded}`);
    logger.info(`🔥 Режим: ${mode.name} (${mode.minViews}+ просмотров за ${mode.maxAgeDays} дней)`);
    
  } catch (error) {
    logger.error("❌ Ошибка при скрапинге:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
scrapeWithMode();
