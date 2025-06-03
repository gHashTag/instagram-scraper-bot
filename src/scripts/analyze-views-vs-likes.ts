/**
 * Анализ соотношения просмотров и лайков
 */

import dotenv from "dotenv";
import { ApifyClient } from "apify-client";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

async function analyzeViewsVsLikes() {
  try {
    const APIFY_TOKEN = process.env.APIFY_TOKEN;
    
    if (!APIFY_TOKEN) {
      logger.error("❌ Ошибка: APIFY_TOKEN не найден в переменных окружения");
      process.exit(1);
    }
    
    logger.info("🔍 АНАЛИЗ ПРОСМОТРОВ VS ЛАЙКОВ");
    
    const apifyClient = new ApifyClient({
      token: APIFY_TOKEN,
    });
    
    const input = {
      search: '#aestheticclinic',
      searchType: 'hashtag',
      searchLimit: 250,
      resultsType: 'posts',
      resultsLimit: 5,
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
    
    // Анализируем первые 20 постов детально
    logger.info("\n🔍 ДЕТАЛЬНЫЙ АНАЛИЗ ПЕРВЫХ 20 ПОСТОВ:");
    
    const analysisData = [];
    
    for (let i = 0; i < Math.min(20, allPosts.length); i++) {
      const post = allPosts[i];
      
      const data = {
        index: i + 1,
        username: post.ownerUsername,
        type: post.type,
        productType: post.productType,
        likesCount: post.likesCount,
        commentsCount: post.commentsCount,
        videoViewCount: post.videoViewCount,
        videoPlayCount: post.videoPlayCount,
        viewsCount: post.viewsCount,
        playCount: post.playCount,
        timestamp: post.timestamp,
        url: post.url
      };
      
      // Вычисляем просмотры по нашей логике
      let estimatedViews = 0;
      let viewsSource = 'none';
      
      if (post.videoViewCount && post.videoViewCount > 0) {
        estimatedViews = post.videoViewCount;
        viewsSource = 'videoViewCount';
      } else if (post.videoPlayCount && post.videoPlayCount > 0) {
        estimatedViews = post.videoPlayCount;
        viewsSource = 'videoPlayCount';
      } else if (post.likesCount && post.likesCount > 0) {
        estimatedViews = post.likesCount * 15;
        viewsSource = 'likesCount * 15';
      }
      
      data['estimatedViews'] = estimatedViews;
      data['viewsSource'] = viewsSource;
      
      // Вычисляем engagement rate
      if (estimatedViews > 0 && post.likesCount > 0) {
        data['engagementRate'] = ((post.likesCount / estimatedViews) * 100).toFixed(2) + '%';
      } else {
        data['engagementRate'] = 'N/A';
      }
      
      analysisData.push(data);
      
      logger.info(`\n📝 ПОСТ ${i + 1} (@${post.ownerUsername}):`);
      logger.info(`  Type: ${post.type}, ProductType: ${post.productType}`);
      logger.info(`  Лайки: ${post.likesCount || 'N/A'}`);
      logger.info(`  Комментарии: ${post.commentsCount || 'N/A'}`);
      logger.info(`  videoViewCount: ${post.videoViewCount || 'N/A'}`);
      logger.info(`  videoPlayCount: ${post.videoPlayCount || 'N/A'}`);
      logger.info(`  viewsCount: ${post.viewsCount || 'N/A'}`);
      logger.info(`  playCount: ${post.playCount || 'N/A'}`);
      logger.info(`  📊 Наши просмотры: ${estimatedViews} (источник: ${viewsSource})`);
      logger.info(`  📈 Engagement: ${data['engagementRate']}`);
      logger.info(`  📅 Дата: ${post.timestamp}`);
    }
    
    // Статистика по источникам просмотров
    logger.info("\n📊 СТАТИСТИКА ПО ИСТОЧНИКАМ ПРОСМОТРОВ:");
    const sourceStats = {};
    analysisData.forEach(data => {
      const source = data.viewsSource;
      sourceStats[source] = (sourceStats[source] || 0) + 1;
    });
    
    Object.entries(sourceStats).forEach(([source, count]) => {
      logger.info(`  ${source}: ${count} постов`);
    });
    
    // Анализ engagement rates
    logger.info("\n📈 АНАЛИЗ ENGAGEMENT RATES:");
    const engagementRates = analysisData
      .filter(data => data.engagementRate !== 'N/A')
      .map(data => parseFloat(data.engagementRate.replace('%', '')));
    
    if (engagementRates.length > 0) {
      const avgEngagement = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
      const minEngagement = Math.min(...engagementRates);
      const maxEngagement = Math.max(...engagementRates);
      
      logger.info(`  Средний engagement: ${avgEngagement.toFixed(2)}%`);
      logger.info(`  Минимальный: ${minEngagement.toFixed(2)}%`);
      logger.info(`  Максимальный: ${maxEngagement.toFixed(2)}%`);
      
      // Проверяем, есть ли подозрительно одинаковые значения
      const uniqueRates = [...new Set(engagementRates.map(r => r.toFixed(1)))];
      if (uniqueRates.length < engagementRates.length / 2) {
        logger.info("  ⚠️ ПОДОЗРИТЕЛЬНО: Много одинаковых engagement rates!");
      }
    }
    
    // Проверяем, есть ли реальные просмотры
    logger.info("\n🎯 ВЫВОДЫ:");
    const realViewsCount = analysisData.filter(data => 
      data.viewsSource === 'videoViewCount' || data.viewsSource === 'videoPlayCount'
    ).length;
    
    const fakeViewsCount = analysisData.filter(data => 
      data.viewsSource === 'likesCount * 15'
    ).length;
    
    logger.info(`  ✅ Постов с реальными просмотрами: ${realViewsCount}`);
    logger.info(`  ❌ Постов с искусственными просмотрами: ${fakeViewsCount}`);
    
    if (fakeViewsCount > realViewsCount) {
      logger.info("  🚨 ПРОБЛЕМА: Большинство данных о просмотрах - искусственные!");
      logger.info("  💡 РЕКОМЕНДАЦИЯ: Нужно найти другой источник данных о просмотрах");
    }
    
    if (realViewsCount > 0) {
      logger.info("  ✅ ХОРОШО: Есть посты с реальными просмотрами");
      logger.info("  💡 РЕКОМЕНДАЦИЯ: Использовать только посты с реальными просмотрами");
    }
    
  } catch (error) {
    logger.error("❌ Ошибка при анализе:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
analyzeViewsVsLikes();
