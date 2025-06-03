/**
 * 🔍 Проверка результатов скрапинга
 */

require('dotenv').config();

async function checkScrapingResults() {
  console.log('🔍 ПРОВЕРКА РЕЗУЛЬТАТОВ СКРАПИНГА');
  console.log('=================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден');
    return;
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Общая статистика
    console.log('📊 ОБЩАЯ СТАТИСТИКА:');
    const totalReels = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1`;
    const viralReels = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1 AND views_count >= 50000`;
    const withTranscripts = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1 AND transcript IS NOT NULL AND transcript != ''`;
    
    console.log(`   Всего reels: ${totalReels[0].count}`);
    console.log(`   Вирусных (50K+): ${viralReels[0].count}`);
    console.log(`   С транскрипциями: ${withTranscripts[0].count}`);

    // 2. По источникам
    console.log('\n📈 ПО ИСТОЧНИКАМ:');
    const bySource = await sql`
      SELECT 
        source_type,
        COUNT(*) as count,
        MAX(views_count) as max_views,
        AVG(views_count) as avg_views
      FROM reels 
      WHERE project_id = 1
      GROUP BY source_type
      ORDER BY count DESC
    `;

    bySource.forEach(source => {
      const avgViews = Math.round(source.avg_views || 0).toLocaleString();
      const maxViews = (source.max_views || 0).toLocaleString();
      console.log(`   ${source.source_type || 'NULL'}: ${source.count} reels (средн: ${avgViews}, макс: ${maxViews})`);
    });

    // 3. Конкуренты
    console.log('\n🏢 КОНКУРЕНТЫ:');
    const competitors = await sql`
      SELECT id, username, last_scraped_at 
      FROM competitors 
      WHERE project_id = 1 AND is_active = true
      ORDER BY id
    `;

    for (const comp of competitors) {
      const competitorReels = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND source_type = 'competitor' 
        AND source_identifier = ${comp.id.toString()}
      `;

      const reelsByUsername = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND author_username = ${comp.username}
      `;

      const lastScraped = comp.last_scraped_at ? 
        new Date(comp.last_scraped_at).toLocaleString() : 
        'Никогда';

      console.log(`   @${comp.username}:`);
      console.log(`     По source_identifier: ${competitorReels[0].count} reels`);
      console.log(`     По author_username: ${reelsByUsername[0].count} reels`);
      console.log(`     Последний скрапинг: ${lastScraped}`);
    }

    // 4. Последние добавленные
    console.log('\n🕐 ПОСЛЕДНИЕ ДОБАВЛЕННЫЕ:');
    const recent = await sql`
      SELECT 
        author_username,
        views_count,
        source_type,
        source_identifier,
        created_at
      FROM reels 
      WHERE project_id = 1
      ORDER BY created_at DESC 
      LIMIT 10
    `;

    recent.forEach((reel, index) => {
      const views = reel.views_count?.toLocaleString() || 'N/A';
      const createdTime = new Date(reel.created_at).toLocaleString();
      console.log(`   ${index + 1}. @${reel.author_username} - ${views} просмотров (${reel.source_type}:${reel.source_identifier}) - ${createdTime}`);
    });

    // 5. Топ авторы
    console.log('\n🏆 ТОП АВТОРЫ:');
    const topAuthors = await sql`
      SELECT 
        author_username,
        COUNT(*) as count,
        MAX(views_count) as max_views,
        AVG(views_count) as avg_views
      FROM reels 
      WHERE project_id = 1 AND author_username IS NOT NULL
      GROUP BY author_username 
      ORDER BY max_views DESC 
      LIMIT 10
    `;

    topAuthors.forEach((author, index) => {
      const avgViews = Math.round(author.avg_views || 0).toLocaleString();
      const maxViews = (author.max_views || 0).toLocaleString();
      console.log(`   ${index + 1}. @${author.author_username} - ${author.count} reels (макс: ${maxViews}, средн: ${avgViews})`);
    });

    // 6. Анализ времени
    console.log('\n⏰ АНАЛИЗ ВРЕМЕНИ:');
    const timeAnalysis = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM reels 
      WHERE project_id = 1 
      AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    timeAnalysis.forEach(day => {
      console.log(`   ${day.date}: +${day.count} reels`);
    });

    // 7. Итоговая оценка
    console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:');
    
    const competitorReelsCount = await sql`
      SELECT COUNT(*) as count FROM reels 
      WHERE project_id = 1 AND source_type = 'competitor'
    `;

    if (competitorReelsCount[0].count > 0) {
      console.log('✅ ОТЛИЧНО! Есть данные по конкурентам');
    } else {
      console.log('❌ ПРОБЛЕМА: Нет данных по конкурентам');
    }

    if (totalReels[0].count > 150) {
      console.log('✅ ОТЛИЧНО! Много качественных данных');
    } else {
      console.log('⚠️ НОРМА: Достаточно данных для анализа');
    }

    const viralPercent = Math.round((viralReels[0].count / totalReels[0].count) * 100);
    if (viralPercent > 30) {
      console.log(`✅ ОТЛИЧНО! Высокий процент вирусности: ${viralPercent}%`);
    } else {
      console.log(`⚠️ НОРМА: Процент вирусности: ${viralPercent}%`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkScrapingResults().catch(console.error);
