/**
 * 🔍 Проверка данных конкурентов в базе
 */

require('dotenv').config();

async function checkCompetitorData() {
  console.log('🔍 ПРОВЕРКА ДАННЫХ КОНКУРЕНТОВ');
  console.log('==============================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден');
    return;
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Проверяем конкурентов в базе
    console.log('👥 Конкуренты в базе:');
    const competitors = await sql`
      SELECT id, username, is_active, last_scraped_at 
      FROM competitors 
      WHERE project_id = 1
      ORDER BY id
    `;

    competitors.forEach(comp => {
      const lastScraped = comp.last_scraped_at ? 
        new Date(comp.last_scraped_at).toLocaleDateString() : 
        'Никогда';
      console.log(`   ${comp.id}. @${comp.username} - ${comp.is_active ? '✅' : '❌'} - Скрапинг: ${lastScraped}`);
    });

    // 2. Проверяем source_type в reels
    console.log('\n📊 Источники данных в reels:');
    const sources = await sql`
      SELECT 
        source_type, 
        source_identifier,
        COUNT(*) as count,
        MAX(views_count) as max_views,
        MAX(created_at) as last_added
      FROM reels 
      WHERE project_id = 1
      GROUP BY source_type, source_identifier 
      ORDER BY count DESC
    `;

    sources.forEach(source => {
      const lastAdded = source.last_added ? 
        new Date(source.last_added).toLocaleDateString() : 
        'Неизвестно';
      console.log(`   ${source.source_type || 'NULL'}:${source.source_identifier || 'NULL'} - ${source.count} reels - ${source.max_views?.toLocaleString() || 'N/A'} макс просмотров - ${lastAdded}`);
    });

    // 3. Проверяем привязку к конкурентам
    console.log('\n🔗 Reels по конкурентам:');
    for (const comp of competitors) {
      // Ищем по source_identifier = competitor.id
      const reelsByCompetitorId = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND source_type = 'competitor' 
        AND source_identifier = ${comp.id.toString()}
      `;

      // Ищем по author_username = competitor.username
      const reelsByUsername = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND author_username = ${comp.username}
      `;

      console.log(`   @${comp.username}:`);
      console.log(`     По source_identifier: ${reelsByCompetitorId[0].count} reels`);
      console.log(`     По author_username: ${reelsByUsername[0].count} reels`);
    }

    // 4. Проверяем топ авторов
    console.log('\n🏆 Топ авторов в базе:');
    const topAuthors = await sql`
      SELECT 
        author_username, 
        COUNT(*) as count,
        MAX(views_count) as max_views,
        AVG(views_count) as avg_views
      FROM reels 
      WHERE project_id = 1 
      AND author_username IS NOT NULL
      GROUP BY author_username 
      ORDER BY count DESC 
      LIMIT 10
    `;

    topAuthors.forEach((author, index) => {
      const avgViews = Math.round(author.avg_views || 0).toLocaleString();
      const maxViews = (author.max_views || 0).toLocaleString();
      console.log(`   ${index + 1}. @${author.author_username} - ${author.count} reels - ${avgViews} средн. - ${maxViews} макс.`);
    });

    // 5. Анализ проблемы
    console.log('\n🔍 АНАЛИЗ ПРОБЛЕМЫ:');
    
    const competitorReels = await sql`
      SELECT COUNT(*) as count 
      FROM reels 
      WHERE project_id = 1 
      AND source_type = 'competitor'
    `;

    const hashtagReels = await sql`
      SELECT COUNT(*) as count 
      FROM reels 
      WHERE project_id = 1 
      AND source_type = 'hashtag'
    `;

    const unknownReels = await sql`
      SELECT COUNT(*) as count 
      FROM reels 
      WHERE project_id = 1 
      AND (source_type IS NULL OR source_type NOT IN ('competitor', 'hashtag'))
    `;

    console.log(`   Reels от конкурентов: ${competitorReels[0].count}`);
    console.log(`   Reels от хэштегов: ${hashtagReels[0].count}`);
    console.log(`   Reels неизвестного источника: ${unknownReels[0].count}`);

    // 6. Рекомендации
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    
    if (competitorReels[0].count === 0) {
      console.log('❌ ПРОБЛЕМА: Нет reels с source_type = "competitor"');
      console.log('   Решение: Запустить скрапинг конкурентов');
      console.log('   Команда: npx tsx src/scripts/bulk-scrape-competitors.ts 1 $APIFY_TOKEN 1 20');
    }

    if (unknownReels[0].count > 0) {
      console.log('⚠️ ПРОБЛЕМА: Есть reels без source_type');
      console.log('   Решение: Обновить source_type для существующих reels');
    }

    // Проверяем есть ли reels от наших конкурентов по username
    let foundCompetitorReels = 0;
    for (const comp of competitors) {
      const reels = await sql`
        SELECT COUNT(*) as count 
        FROM reels 
        WHERE project_id = 1 
        AND author_username = ${comp.username}
      `;
      foundCompetitorReels += reels[0].count;
    }

    if (foundCompetitorReels > 0) {
      console.log(`✅ ХОРОШО: Найдено ${foundCompetitorReels} reels от наших конкурентов по username`);
      console.log('   Решение: Обновить source_type для этих reels');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkCompetitorData().catch(console.error);
