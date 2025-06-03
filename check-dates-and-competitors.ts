/**
 * 📅 Проверка дат публикации и связей конкурентов
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkDatesAndCompetitors() {
  console.log('📅 ПРОВЕРКА ДАТ И СВЯЗЕЙ КОНКУРЕНТОВ');
  console.log('===================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔌 Подключение к Neon Database...\n');
    
    // 1. ПРОВЕРКА ДАТ ПУБЛИКАЦИИ
    console.log('📅 1. ПРОВЕРКА ДАТ ПУБЛИКАЦИИ:');
    console.log('==============================');
    
    // Общая статистика по датам
    const dateStats = await sql`
      SELECT 
        COUNT(*) as total_reels,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '14 days') as recent_14_days,
        COUNT(*) FILTER (WHERE published_at >= NOW() - INTERVAL '30 days') as recent_30_days,
        COUNT(*) FILTER (WHERE published_at >= '2025-01-01') as year_2025,
        COUNT(*) FILTER (WHERE published_at < '2025-01-01') as year_2024_and_older,
        MIN(published_at) as oldest_date,
        MAX(published_at) as newest_date
      FROM reels
      WHERE published_at IS NOT NULL
    `;
    
    if (dateStats.length > 0) {
      const stats = dateStats[0];
      console.log(`📊 Общая статистика:`);
      console.log(`  - Всего reels с датами: ${stats.total_reels}`);
      console.log(`  - За последние 14 дней: ${stats.recent_14_days} (${Math.round(stats.recent_14_days / stats.total_reels * 100)}%)`);
      console.log(`  - За последние 30 дней: ${stats.recent_30_days} (${Math.round(stats.recent_30_days / stats.total_reels * 100)}%)`);
      console.log(`  - За 2025 год: ${stats.year_2025} (${Math.round(stats.year_2025 / stats.total_reels * 100)}%)`);
      console.log(`  - За 2024 и старше: ${stats.year_2024_and_older} (${Math.round(stats.year_2024_and_older / stats.total_reels * 100)}%)`);
      console.log(`  - Самая старая дата: ${stats.oldest_date ? new Date(stats.oldest_date).toLocaleDateString() : 'Нет'}`);
      console.log(`  - Самая новая дата: ${stats.newest_date ? new Date(stats.newest_date).toLocaleDateString() : 'Нет'}`);
      
      // Оценка свежести данных
      console.log(`\n🎯 Оценка свежести данных:`);
      if (stats.recent_14_days >= 50) {
        console.log(`✅ ОТЛИЧНО: ${stats.recent_14_days} reels за последние 14 дней`);
      } else if (stats.recent_14_days >= 20) {
        console.log(`🟡 ХОРОШО: ${stats.recent_14_days} reels за последние 14 дней`);
      } else if (stats.recent_14_days > 0) {
        console.log(`🟠 МАЛО: ${stats.recent_14_days} reels за последние 14 дней`);
      } else {
        console.log(`🔴 НЕТ СВЕЖИХ ДАННЫХ за последние 14 дней`);
      }
      
      if (stats.year_2024_and_older > 0) {
        console.log(`⚠️ ВНИМАНИЕ: ${stats.year_2024_and_older} старых reels (2024 и ранее) - нужна очистка`);
      } else {
        console.log(`✅ ЧИСТО: Нет старых данных, только 2025 год`);
      }
    }
    
    // Топ-5 самых свежих reels
    console.log(`\n🔥 Топ-5 самых свежих reels:`);
    const freshReels = await sql`
      SELECT 
        author_username,
        views_count,
        published_at,
        source_type,
        source_identifier
      FROM reels 
      WHERE published_at IS NOT NULL
      ORDER BY published_at DESC 
      LIMIT 5
    `;
    
    freshReels.forEach((reel, index) => {
      const publishedDate = new Date(reel.published_at);
      const daysAgo = Math.floor((new Date() - publishedDate) / (1000 * 60 * 60 * 24));
      console.log(`${index + 1}. @${reel.author_username} - ${reel.views_count?.toLocaleString() || 'N/A'} просмотров`);
      console.log(`   📅 ${publishedDate.toLocaleDateString()} (${daysAgo} дней назад) | ${reel.source_type}:${reel.source_identifier}`);
    });
    
    // 2. ПРОВЕРКА СВЯЗЕЙ КОНКУРЕНТОВ
    console.log(`\n\n🏢 2. ПРОВЕРКА СВЯЗЕЙ КОНКУРЕНТОВ:`);
    console.log('=================================');
    
    // Список конкурентов
    const competitors = await sql`
      SELECT id, username, profile_url, is_active
      FROM competitors
      ORDER BY id
    `;
    
    console.log(`📊 Найдено конкурентов в базе: ${competitors.length}`);
    
    if (competitors.length === 0) {
      console.log(`❌ НЕТ КОНКУРЕНТОВ В БАЗЕ ДАННЫХ!`);
      return;
    }
    
    // Проверяем связи каждого конкурента с reels
    console.log(`\n🔗 Связи конкурентов с reels:`);
    
    for (const competitor of competitors) {
      // Ищем reels по source_identifier
      const reelsByCompetitor = await sql`
        SELECT COUNT(*) as count
        FROM reels 
        WHERE source_type = 'competitor' 
        AND source_identifier = ${competitor.id.toString()}
      `;
      
      const reelsCount = reelsByCompetitor[0].count;
      const status = competitor.is_active ? '✅' : '❌';
      const reelsStatus = reelsCount > 0 ? `✅ ${reelsCount} reels` : '❌ Нет reels';
      
      console.log(`${status} @${competitor.username} (ID: ${competitor.id})`);
      console.log(`   📊 ${reelsStatus}`);
      console.log(`   🔗 ${competitor.profile_url}`);
    }
    
    // Общая статистика по источникам
    console.log(`\n📊 Статистика reels по источникам:`);
    const sourceStats = await sql`
      SELECT 
        source_type,
        source_identifier,
        COUNT(*) as count,
        AVG(views_count) as avg_views,
        MAX(views_count) as max_views
      FROM reels 
      WHERE source_type IS NOT NULL
      GROUP BY source_type, source_identifier
      ORDER BY count DESC
    `;
    
    sourceStats.forEach(stat => {
      const avgViews = Math.round(stat.avg_views || 0).toLocaleString();
      const maxViews = (stat.max_views || 0).toLocaleString();
      console.log(`📈 ${stat.source_type}:${stat.source_identifier} - ${stat.count} reels (avg: ${avgViews}, max: ${maxViews})`);
    });
    
    // 3. ПРОВЕРКА ХЭШТЕГОВ
    console.log(`\n\n🏷️ 3. ПРОВЕРКА СВЯЗЕЙ ХЭШТЕГОВ:`);
    console.log('==============================');
    
    const hashtags = await sql`
      SELECT id, tag_name, is_active
      FROM hashtags
      ORDER BY id
    `;
    
    console.log(`📊 Найдено хэштегов в базе: ${hashtags.length}`);
    
    if (hashtags.length > 0) {
      console.log(`\n🔗 Связи хэштегов с reels:`);
      
      for (const hashtag of hashtags.slice(0, 5)) { // Показываем первые 5
        const reelsByHashtag = await sql`
          SELECT COUNT(*) as count
          FROM reels 
          WHERE source_type = 'hashtag' 
          AND source_identifier = ${hashtag.id.toString()}
        `;
        
        const reelsCount = reelsByHashtag[0].count;
        const status = hashtag.is_active ? '✅' : '❌';
        const reelsStatus = reelsCount > 0 ? `✅ ${reelsCount} reels` : '❌ Нет reels';
        
        console.log(`${status} #${hashtag.tag_name} (ID: ${hashtag.id}) - ${reelsStatus}`);
      }
      
      if (hashtags.length > 5) {
        console.log(`   ... и еще ${hashtags.length - 5} хэштегов`);
      }
    }
    
    // 4. ИТОГОВЫЕ РЕКОМЕНДАЦИИ
    console.log(`\n\n🎯 4. ИТОГОВЫЕ РЕКОМЕНДАЦИИ:`);
    console.log('============================');
    
    const totalReels = await sql`SELECT COUNT(*) as count FROM reels`;
    const competitorReels = await sql`SELECT COUNT(*) as count FROM reels WHERE source_type = 'competitor'`;
    const hashtagReels = await sql`SELECT COUNT(*) as count FROM reels WHERE source_type = 'hashtag'`;
    
    console.log(`📊 Распределение reels:`);
    console.log(`  - Всего: ${totalReels[0].count}`);
    console.log(`  - От конкурентов: ${competitorReels[0].count}`);
    console.log(`  - От хэштегов: ${hashtagReels[0].count}`);
    console.log(`  - Без источника: ${totalReels[0].count - competitorReels[0].count - hashtagReels[0].count}`);
    
    // Рекомендации
    if (dateStats[0]?.recent_14_days < 50) {
      console.log(`\n🔴 НУЖЕН ДОПОЛНИТЕЛЬНЫЙ СКРАПИНГ:`);
      console.log(`   - Мало свежих данных за 14 дней (${dateStats[0]?.recent_14_days || 0})`);
      console.log(`   - Запустить: npm run scrape:bulk`);
    }
    
    if (competitorReels[0].count === 0) {
      console.log(`\n🔴 НУЖЕН СКРАПИНГ КОНКУРЕНТОВ:`);
      console.log(`   - Нет reels от конкурентов`);
      console.log(`   - Запустить: npx tsx src/scripts/bulk-scrape-competitors.ts 1 $APIFY_TOKEN 1 100`);
    }
    
    if (hashtagReels[0].count === 0) {
      console.log(`\n🔴 НУЖЕН СКРАПИНГ ХЭШТЕГОВ:`);
      console.log(`   - Нет reels от хэштегов`);
      console.log(`   - Запустить: npx tsx src/scripts/bulk-scrape-hashtags.ts 1 $APIFY_TOKEN 14 50000 100`);
    }
    
    if (dateStats[0]?.year_2024_and_older > 0) {
      console.log(`\n🟡 РЕКОМЕНДУЕТСЯ ОЧИСТКА:`);
      console.log(`   - ${dateStats[0].year_2024_and_older} старых reels`);
      console.log(`   - Удалить: DELETE FROM reels WHERE published_at < '2025-01-01'`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message);
    console.error('Детали:', error);
  }
}

checkDatesAndCompetitors().catch(console.error);
