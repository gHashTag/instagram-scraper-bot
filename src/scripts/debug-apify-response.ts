/**
 * Отладочный скрипт для проверки ответа от Apify
 */

import dotenv from "dotenv";
import { ApifyClient } from "apify-client";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

async function debugApifyResponse() {
  try {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    
    if (!APIFY_TOKEN) {
      logger.error("❌ Ошибка: APIFY_TOKEN не найден в переменных окружения");
      process.exit(1);
    }
    
    logger.info("🔍 ОТЛАДКА ОТВЕТА ОТ APIFY");
    
    const apifyClient = new ApifyClient({
      token: APIFY_TOKEN,
    });
    
    const input = {
      search: '#aestheticclinic',
      searchType: 'hashtag',
      searchLimit: 250,
      resultsType: 'posts',
      resultsLimit: 5, // Берем только 5 для отладки
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
      },
    };
    
    logger.info("📊 Параметры запроса:", input);
    
    const run = await apifyClient.actor("apify/instagram-scraper").call(input);
    
    logger.info("📥 Загрузка результатов из датасета...");
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    logger.info(`📋 ПОЛУЧЕНО ${items.length} элементов от Apify`);
    
    if (items.length > 0) {
      logger.info("🔍 АНАЛИЗ ПЕРВОГО ЭЛЕМЕНТА:");
      const firstItem = items[0];
      
      logger.info("📝 Все поля первого элемента:");
      Object.keys(firstItem).forEach(key => {
        const value = firstItem[key];
        const type = typeof value;
        const preview = type === 'string' && value.length > 50
          ? value.substring(0, 50) + '...'
          : value;
        logger.info(`  ${key}: ${type} = ${preview}`);
      });

      // Проверяем, есть ли посты внутри
      if (firstItem.topPosts && Array.isArray(firstItem.topPosts)) {
        logger.info(`\n🔥 НАЙДЕНЫ TOP POSTS: ${firstItem.topPosts.length} элементов`);
        if (firstItem.topPosts.length > 0) {
          const firstPost = firstItem.topPosts[0];
          logger.info("📝 Поля первого TOP POST:");
          Object.keys(firstPost).forEach(key => {
            const value = firstPost[key];
            const type = typeof value;
            const preview = type === 'string' && value.length > 50
              ? value.substring(0, 50) + '...'
              : value;
            logger.info(`    ${key}: ${type} = ${preview}`);
          });
        }
      }

      if (firstItem.latestPosts && Array.isArray(firstItem.latestPosts)) {
        logger.info(`\n📅 НАЙДЕНЫ LATEST POSTS: ${firstItem.latestPosts.length} элементов`);
        if (firstItem.latestPosts.length > 0) {
          const firstPost = firstItem.latestPosts[0];
          logger.info("📝 Поля первого LATEST POST:");
          Object.keys(firstPost).forEach(key => {
            const value = firstPost[key];
            const type = typeof value;
            const preview = type === 'string' && value.length > 50
              ? value.substring(0, 50) + '...'
              : value;
            logger.info(`    ${key}: ${type} = ${preview}`);
          });
        }
      }
      
      logger.info("\n🎬 ПРОВЕРКА ПОЛЕЙ ДЛЯ REELS:");
      logger.info(`  type: ${firstItem.type}`);
      logger.info(`  productType: ${firstItem.productType}`);
      logger.info(`  isVideo: ${firstItem.isVideo}`);
      logger.info(`  videoViewCount: ${firstItem.videoViewCount}`);
      logger.info(`  videoPlayCount: ${firstItem.videoPlayCount}`);
      logger.info(`  viewsCount: ${firstItem.viewsCount}`);
      logger.info(`  likesCount: ${firstItem.likesCount}`);
      logger.info(`  commentsCount: ${firstItem.commentsCount}`);
      logger.info(`  timestamp: ${firstItem.timestamp}`);
      logger.info(`  url: ${firstItem.url}`);
      logger.info(`  ownerUsername: ${firstItem.ownerUsername}`);
      
      logger.info("\n📊 СТАТИСТИКА ПО ТИПАМ:");
      const typeStats = {};
      const videoStats = {};
      const viewsStats = [];
      
      items.forEach(item => {
        // Статистика по типам
        const type = item.type || 'undefined';
        typeStats[type] = (typeStats[type] || 0) + 1;
        
        // Статистика по видео
        const isVideo = item.isVideo;
        videoStats[isVideo] = (videoStats[isVideo] || 0) + 1;
        
        // Статистика по просмотрам
        const views = item.videoViewCount || item.videoPlayCount || item.viewsCount || 0;
        if (views > 0) {
          viewsStats.push(views);
        }
      });
      
      logger.info("  Типы контента:", typeStats);
      logger.info("  Видео контент:", videoStats);
      
      if (viewsStats.length > 0) {
        viewsStats.sort((a, b) => b - a);
        logger.info(`  Просмотры (топ 10): ${viewsStats.slice(0, 10).join(', ')}`);
        logger.info(`  Максимум просмотров: ${Math.max(...viewsStats)}`);
        logger.info(`  Минимум просмотров: ${Math.min(...viewsStats)}`);
        logger.info(`  Среднее просмотров: ${Math.round(viewsStats.reduce((a, b) => a + b, 0) / viewsStats.length)}`);
      } else {
        logger.info("  ❌ НЕТ ДАННЫХ О ПРОСМОТРАХ!");
      }
      
      logger.info("\n🎯 РЕКОМЕНДАЦИИ:");
      if (viewsStats.length === 0) {
        logger.info("  ❌ Данные о просмотрах отсутствуют - проверьте поля");
      } else {
        const maxViews = Math.max(...viewsStats);
        if (maxViews < 50000) {
          logger.info(`  📉 Максимум просмотров ${maxViews} < 50K - снизьте порог`);
        } else {
          logger.info(`  ✅ Есть контент с 50K+ просмотров`);
        }
      }
    }
    
  } catch (error) {
    logger.error("❌ Ошибка при отладке:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
debugApifyResponse();
