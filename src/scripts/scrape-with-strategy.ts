#!/usr/bin/env node

/**
 * CLI скрипт для скрапинга Instagram с использованием стратегий
 * 
 * Примеры использования:
 * npm run scrape-strategy viral aesthetics 50000
 * npm run scrape-strategy popular beauty 10000
 * npm run scrape-strategy test skincare 1000
 */

import { InstagramStrategy } from "../strategy/instagram-strategy";
import { ScrapingMode } from "../types/instagram-strategy";
import { logger } from "../logger";

// Предустановленные наборы хэштегов
const HASHTAG_SETS = {
  aesthetics: [
    "aestheticclinic", "aestheticmedicine", "aesthetictreatment", 
    "botox", "dermalfillers", "antiaging"
  ],
  beauty: [
    "skincare", "skinrejuvenation", "hydrafacial", 
    "prpfacial", "rfmicroneedling"
  ],
  skincare: [
    "skincare", "glowingskin", "healthyskin", 
    "skincareproducts", "skincareroutine"
  ],
  medical: [
    "medicalaesthetics", "cosmeticdermatology", "plasticsurgery",
    "nonsurgical", "injectables"
  ]
};

// Предустановленные конкуренты
const COMPETITOR_SETS = {
  aesthetics: [
    "competitor1", "competitor2", "competitor3"
  ],
  beauty: [
    "beautycompetitor1", "beautycompetitor2"
  ]
};

function printUsage() {
  console.log(`
🕉️ Instagram Scraping Strategy CLI

ИСПОЛЬЗОВАНИЕ:
  npm run scrape-strategy <режим> <категория> [минПросмотры] [лимит]

РЕЖИМЫ:
  viral    - Вирусный контент (50K+ просмотров, 7 дней, только реальные просмотры)
  popular  - Популярный контент (10K+ просмотров, 30 дней, включая оценки по лайкам)
  normal   - Обычный контент (1K+ просмотров, 30 дней)
  test     - Тестовый режим (100+ просмотров, 90 дней)

КАТЕГОРИИ:
  aesthetics - Эстетическая медицина
  beauty     - Красота и уход
  skincare   - Уход за кожей
  medical    - Медицинская косметология

ПРИМЕРЫ:
  npm run scrape-strategy viral aesthetics
  npm run scrape-strategy popular beauty 15000
  npm run scrape-strategy test skincare 500 50
  `);
}

function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    printUsage();
    process.exit(1);
  }

  const mode = args[0] as ScrapingMode;
  const category = args[1];
  const minViews = args[2] ? parseInt(args[2]) : undefined;
  const limit = args[3] ? parseInt(args[3]) : undefined;

  // Валидация режима
  const validModes: ScrapingMode[] = ["viral", "popular", "normal", "test"];
  if (!validModes.includes(mode)) {
    logger.error(`❌ Неверный режим: ${mode}`);
    logger.error(`✅ Доступные режимы: ${validModes.join(", ")}`);
    process.exit(1);
  }

  // Валидация категории
  const validCategories = Object.keys(HASHTAG_SETS);
  if (!validCategories.includes(category)) {
    logger.error(`❌ Неверная категория: ${category}`);
    logger.error(`✅ Доступные категории: ${validCategories.join(", ")}`);
    process.exit(1);
  }

  return { mode, category, minViews, limit };
}

async function main() {
  try {
    logger.info("🕉️ ЗАПУСК INSTAGRAM SCRAPING STRATEGY");
    
    const { mode, category, minViews, limit } = parseArguments();
    
    // Получаем хэштеги и конкурентов для категории
    const hashtags = HASHTAG_SETS[category] || [];
    const competitors = COMPETITOR_SETS[category] || [];
    
    logger.info(`📊 ПАРАМЕТРЫ СТРАТЕГИИ:`);
    logger.info(`  🎯 Режим: ${mode}`);
    logger.info(`  📂 Категория: ${category}`);
    logger.info(`  🏷️ Хэштеги: ${hashtags.join(", ")}`);
    logger.info(`  🏢 Конкуренты: ${competitors.join(", ")}`);
    
    // Создаем стратегию
    let strategy: InstagramStrategy;
    
    switch (mode) {
      case "viral":
        strategy = InstagramStrategy.createViralStrategy(hashtags, competitors);
        break;
      case "popular":
        strategy = InstagramStrategy.createPopularStrategy(hashtags, competitors);
        break;
      case "test":
        strategy = InstagramStrategy.createTestStrategy(hashtags, competitors);
        break;
      default:
        strategy = InstagramStrategy.fromMode(mode, { hashtags, competitors });
    }
    
    // Применяем пользовательские настройки
    const config = strategy.getConfig();
    if (minViews !== undefined) {
      config.filters.minViews = minViews;
      logger.info(`  👁️ Минимальные просмотры: ${minViews}`);
    }
    if (limit !== undefined) {
      config.limits.totalLimit = limit;
      logger.info(`  🔢 Лимит результатов: ${limit}`);
    }
    
    logger.info(`\n🔧 КОНФИГУРАЦИЯ СТРАТЕГИИ:`);
    logger.info(`  📈 Мин. просмотры: ${config.filters.minViews}`);
    logger.info(`  📅 Макс. возраст: ${config.filters.maxAgeDays} дней`);
    logger.info(`  ✅ Только реальные просмотры: ${config.filters.requireRealViews}`);
    logger.info(`  🎯 Общий лимит: ${config.limits.totalLimit}`);
    logger.info(`  📊 Лимит на источник: ${config.limits.perSourceLimit}`);
    logger.info(`  🔧 Основной скрапер: ${config.scrapers.primary}`);
    
    // Здесь будет интеграция с существующими скриптами скрапинга
    logger.info(`\n🚀 ЗАПУСК СКРАПИНГА...`);
    logger.info(`⚠️ ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМИ СКРИПТАМИ В РАЗРАБОТКЕ`);
    
    // Пример того, как будет выглядеть интеграция:
    logger.info(`\n💡 СЛЕДУЮЩИЕ ШАГИ:`);
    logger.info(`1. Интегрировать с src/agent/instagram-scraper.ts`);
    logger.info(`2. Применить фильтры стратегии к результатам`);
    logger.info(`3. Сохранить результаты в базу данных`);
    logger.info(`4. Экспортировать в Excel (если включено)`);
    
    // Демонстрация фильтрации
    const samplePosts = [
      { videoViewCount: 75000, likesCount: 5000, timestamp: new Date().toISOString() },
      { videoViewCount: 25000, likesCount: 1500, timestamp: new Date().toISOString() },
      { likesCount: 4000, timestamp: new Date().toISOString() }, // Без реальных просмотров
    ];
    
    logger.info(`\n🧪 ДЕМОНСТРАЦИЯ ФИЛЬТРАЦИИ:`);
    logger.info(`📥 Входящие посты: ${samplePosts.length}`);
    
    const filteredPosts = strategy.applyFilters(samplePosts);
    logger.info(`📤 После фильтрации: ${filteredPosts.length}`);
    
    filteredPosts.forEach((post, index) => {
      const views = post.videoViewCount || (post.likesCount ? post.likesCount * 15 : 0);
      logger.info(`  ✅ Пост ${index + 1}: ${views} просмотров`);
    });
    
    logger.info(`\n🎉 СТРАТЕГИЯ ГОТОВА К ИСПОЛЬЗОВАНИЮ!`);
    
  } catch (error) {
    logger.error("❌ Ошибка при выполнении стратегии:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
main();
