#!/usr/bin/env node

/**
 * 🕉️ GET REAL DATA - Получение реальных данных из базы
 * 
 * Скрипт для получения реальных данных вместо фейков
 */

import { db } from '../db/connection';
import { instagramReels } from '../db/schema';
import { sql, desc, and, gte } from 'drizzle-orm';
import { logger } from '../logger';

interface RealDataSummary {
  totalPosts: number;
  viralPosts: number;
  avgViews: number;
  avgLikes: number;
  competitors: Array<{
    username: string;
    posts: number;
    topPost: {
      views: number;
      likes: number;
      description: string;
      date: string;
      url: string;
    };
    avgViews: number;
  }>;
  hashtags: Array<{
    tag: string;
    posts: number;
    avgViews: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

async function getRealData(): Promise<RealDataSummary> {
  try {
    logger.info('🔍 Получение реальных данных из базы...');

    // Получаем данные за последний месяц (2025 год)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const year2025Start = new Date('2025-01-01');

    // Получаем все посты за 2025 год
    const allPosts = await db
      .select()
      .from(instagramReels)
      .where(
        and(
          gte(instagramReels.createdAt, year2025Start),
          gte(instagramReels.viewCount, 1000) // Минимум 1K просмотров
        )
      )
      .orderBy(desc(instagramReels.viewCount));

    logger.info(`📊 Найдено постов в базе: ${allPosts.length}`);

    if (allPosts.length === 0) {
      logger.warn('⚠️ Нет данных в базе за 2025 год');
      return getEmptyData();
    }

    // Фильтруем вирусные посты (50K+)
    const viralPosts = allPosts.filter(post => post.viewCount >= 50000);
    
    // Вычисляем средние значения
    const totalViews = allPosts.reduce((sum, post) => sum + post.viewCount, 0);
    const totalLikes = allPosts.reduce((sum, post) => sum + post.likeCount, 0);
    const avgViews = Math.round(totalViews / allPosts.length);
    const avgLikes = Math.round(totalLikes / allPosts.length);

    // Анализируем конкурентов
    const competitorData = await analyzeCompetitors(allPosts);
    
    // Анализируем хэштеги
    const hashtagData = await analyzeHashtags(allPosts);

    const result: RealDataSummary = {
      totalPosts: allPosts.length,
      viralPosts: viralPosts.length,
      avgViews,
      avgLikes,
      competitors: competitorData,
      hashtags: hashtagData,
      dateRange: {
        from: year2025Start.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      }
    };

    logger.info('✅ Реальные данные получены успешно');
    logger.info(`📊 Статистика: ${result.totalPosts} постов, ${result.viralPosts} вирусных, ${result.avgViews} средних просмотров`);

    return result;

  } catch (error) {
    logger.error('❌ Ошибка получения данных:', error);
    return getEmptyData();
  }
}

async function analyzeCompetitors(posts: any[]): Promise<RealDataSummary['competitors']> {
  // Группируем по username
  const competitorMap = new Map<string, any[]>();
  
  posts.forEach(post => {
    if (post.username) {
      if (!competitorMap.has(post.username)) {
        competitorMap.set(post.username, []);
      }
      competitorMap.get(post.username)!.push(post);
    }
  });

  const competitors: RealDataSummary['competitors'] = [];

  // Анализируем каждого конкурента
  for (const [username, userPosts] of competitorMap.entries()) {
    if (userPosts.length >= 3) { // Минимум 3 поста
      // Находим лучший пост
      const topPost = userPosts.reduce((best, current) => 
        current.viewCount > best.viewCount ? current : best
      );

      // Вычисляем средние просмотры
      const totalViews = userPosts.reduce((sum, post) => sum + post.viewCount, 0);
      const avgViews = Math.round(totalViews / userPosts.length);

      competitors.push({
        username,
        posts: userPosts.length,
        topPost: {
          views: topPost.viewCount,
          likes: topPost.likeCount,
          description: topPost.description || 'Описание недоступно',
          date: topPost.createdAt.toLocaleDateString('ru-RU'),
          url: topPost.url || ''
        },
        avgViews
      });
    }
  }

  // Сортируем по средним просмотрам
  competitors.sort((a, b) => b.avgViews - a.avgViews);

  // Возвращаем топ-5 конкурентов
  return competitors.slice(0, 5);
}

async function analyzeHashtags(posts: any[]): Promise<RealDataSummary['hashtags']> {
  const hashtagMap = new Map<string, any[]>();

  // Извлекаем хэштеги из описаний
  posts.forEach(post => {
    if (post.description) {
      const hashtags = post.description.match(/#[\w\u0400-\u04FF]+/g) || [];
      hashtags.forEach(tag => {
        const cleanTag = tag.toLowerCase().replace('#', '');
        if (!hashtagMap.has(cleanTag)) {
          hashtagMap.set(cleanTag, []);
        }
        hashtagMap.get(cleanTag)!.push(post);
      });
    }
  });

  const hashtags: RealDataSummary['hashtags'] = [];

  // Анализируем каждый хэштег
  for (const [tag, tagPosts] of hashtagMap.entries()) {
    if (tagPosts.length >= 2) { // Минимум 2 поста
      const totalViews = tagPosts.reduce((sum, post) => sum + post.viewCount, 0);
      const avgViews = Math.round(totalViews / tagPosts.length);

      hashtags.push({
        tag,
        posts: tagPosts.length,
        avgViews,
        trend: avgViews > 50000 ? 'up' : avgViews > 20000 ? 'stable' : 'down'
      });
    }
  }

  // Сортируем по средним просмотрам
  hashtags.sort((a, b) => b.avgViews - a.avgViews);

  // Возвращаем топ-10 хэштегов
  return hashtags.slice(0, 10);
}

function getEmptyData(): RealDataSummary {
  return {
    totalPosts: 0,
    viralPosts: 0,
    avgViews: 0,
    avgLikes: 0,
    competitors: [],
    hashtags: [],
    dateRange: {
      from: '2025-01-01',
      to: new Date().toISOString().split('T')[0]
    }
  };
}

// Экспорт для использования в других модулях
export { getRealData, RealDataSummary };

// Запуск скрипта
if (require.main === module) {
  getRealData().then(data => {
    console.log('\n🕉️ РЕАЛЬНЫЕ ДАННЫЕ ИЗ БАЗЫ:');
    console.log(JSON.stringify(data, null, 2));
  }).catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
}
