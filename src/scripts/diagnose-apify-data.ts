/**
 * Диагностический скрипт для анализа данных от Apify
 */

import dotenv from "dotenv";
import { ApifyClient } from "apify-client";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

async function diagnoseApifyData() {
  try {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    
    if (!APIFY_TOKEN) {
      logger.error("❌ Ошибка: APIFY_TOKEN не найден в переменных окружения");
      process.exit(1);
    }
    
    logger.info("🔍 ДИАГНОСТИКА ДАННЫХ ОТ APIFY");
    
    const apifyClient = new ApifyClient({
      token: APIFY_TOKEN,
    });
    
    const input = {
      search: '#aestheticclinic',
      searchType: 'hashtag',
      searchLimit: 250,
      resultsType: 'posts',
      resultsLimit: 10, // Берем больше для анализа
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
    
    // Извлекаем все посты
    let allPosts: any[] = [];
    items.forEach((item: any, index: number) => {
      if (item.topPosts && Array.isArray(item.topPosts)) {
        allPosts.push(...item.topPosts);
      }
      if (item.latestPosts && Array.isArray(item.latestPosts)) {
        allPosts.push(...item.latestPosts);
      }
    });
    
    logger.info(`📊 ВСЕГО ПОСТОВ: ${allPosts.length}`);
    
    // Анализируем поля просмотров
    logger.info("\n🔍 АНАЛИЗ ПОЛЕЙ ПРОСМОТРОВ:");
    
    const viewsFields = [
      'videoViewCount',
      'videoPlayCount', 
      'viewsCount',
      'playCount',
      'views',
      'likesCount'
    ];
    
    const fieldStats = {};
    
    allPosts.forEach((post, index) => {
      if (index < 10) { // Показываем первые 10 для детального анализа
        logger.info(`\n📝 ПОСТ ${index + 1} (@${post.ownerUsername}):`);
        logger.info(`  Type: ${post.type}, ProductType: ${post.productType}`);
        logger.info(`  Likes: ${post.likesCount}, Comments: ${post.commentsCount}`);
        logger.info(`  Date: ${post.timestamp}`);
        
        viewsFields.forEach(field => {
          const value = post[field];
          if (value !== undefined) {
            logger.info(`  ${field}: ${value}`);
            fieldStats[field] = (fieldStats[field] || 0) + 1;
          }
        });
      }
      
      // Собираем статистику по всем постам
      viewsFields.forEach(field => {
        if (post[field] !== undefined) {
          fieldStats[field] = (fieldStats[field] || 0) + 1;
        }
      });
    });
    
    logger.info("\n📊 СТАТИСТИКА ПО ПОЛЯМ ПРОСМОТРОВ:");
    Object.entries(fieldStats).forEach(([field, count]) => {
      logger.info(`  ${field}: найдено в ${count} из ${allPosts.length} постов`);
    });
    
    // Анализируем типы контента
    logger.info("\n🎬 АНАЛИЗ ТИПОВ КОНТЕНТА:");
    const typeStats = {};
    const productTypeStats = {};
    const videoStats = {};
    
    allPosts.forEach(post => {
      const type = post.type || 'undefined';
      const productType = post.productType || 'undefined';
      const isVideo = post.isVideo || false;
      
      typeStats[type] = (typeStats[type] || 0) + 1;
      productTypeStats[productType] = (productTypeStats[productType] || 0) + 1;
      videoStats[isVideo] = (videoStats[isVideo] || 0) + 1;
    });
    
    logger.info("  По типам:", typeStats);
    logger.info("  По productType:", productTypeStats);
    logger.info("  По isVideo:", videoStats);
    
    // Анализируем лайки как метрику популярности
    logger.info("\n❤️ АНАЛИЗ ЛАЙКОВ КАК МЕТРИКИ:");
    const likes = allPosts
      .filter(post => post.likesCount && post.likesCount > 0)
      .map(post => post.likesCount)
      .sort((a, b) => b - a);
    
    if (likes.length > 0) {
      logger.info(`  Всего постов с лайками: ${likes.length}`);
      logger.info(`  Топ-10 по лайкам: ${likes.slice(0, 10).join(', ')}`);
      logger.info(`  Максимум лайков: ${Math.max(...likes)}`);
      logger.info(`  Медиана лайков: ${likes[Math.floor(likes.length / 2)]}`);
      logger.info(`  Среднее лайков: ${Math.round(likes.reduce((a, b) => a + b, 0) / likes.length)}`);
      
      // Сколько постов имеют лайки, эквивалентные 50K просмотров
      const threshold50k = Math.ceil(50000 / 15); // 3334 лайка
      const above50k = likes.filter(l => l >= threshold50k).length;
      logger.info(`  Постов с ${threshold50k}+ лайков (≈50K просмотров): ${above50k}`);
      
      const threshold10k = Math.ceil(10000 / 15); // 667 лайков
      const above10k = likes.filter(l => l >= threshold10k).length;
      logger.info(`  Постов с ${threshold10k}+ лайков (≈10K просмотров): ${above10k}`);
    }
    
    // Проверяем даты
    logger.info("\n📅 АНАЛИЗ ДАТ:");
    const dates = allPosts
      .filter(post => post.timestamp)
      .map(post => new Date(post.timestamp))
      .sort((a, b) => b.getTime() - a.getTime());
    
    if (dates.length > 0) {
      const now = new Date();
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      
      const recentPosts = dates.filter(date => date >= monthAgo).length;
      
      logger.info(`  Всего постов с датами: ${dates.length}`);
      logger.info(`  Самый новый: ${dates[0].toISOString()}`);
      logger.info(`  Самый старый: ${dates[dates.length - 1].toISOString()}`);
      logger.info(`  За последний месяц: ${recentPosts} постов`);
    }
    
    logger.info("\n🎯 ВЫВОДЫ И РЕКОМЕНДАЦИИ:");
    
    if (fieldStats.videoViewCount || fieldStats.videoPlayCount || fieldStats.viewsCount) {
      logger.info("  ✅ Есть поля с реальными просмотрами - используйте их!");
    } else {
      logger.info("  ❌ Нет полей с реальными просмотрами - используем лайки как приблизительную метрику");
    }
    
    const videoPosts = allPosts.filter(post => 
      post.type === 'Video' || post.productType === 'clips'
    ).length;
    
    logger.info(`  🎬 Видео контента: ${videoPosts} из ${allPosts.length} постов`);
    
    if (videoPosts < allPosts.length * 0.3) {
      logger.info("  ⚠️ МАЛО ВИДЕО КОНТЕНТА! Возможно, нужно изменить параметры поиска");
    }
    
  } catch (error) {
    logger.error("❌ Ошибка при диагностике:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
diagnoseApifyData();
