/**
 * 🔧 Исправление привязки reels к конкурентам
 */

require('dotenv').config();

async function fixCompetitorLinks() {
  console.log('🔧 ИСПРАВЛЕНИЕ ПРИВЯЗКИ КОНКУРЕНТОВ');
  console.log('===================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден');
    return;
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Получаем список конкурентов
    console.log('👥 Получение списка конкурентов...');
    const competitors = await sql`
      SELECT id, username, profile_url 
      FROM competitors 
      WHERE project_id = 1 AND is_active = true
    `;

    console.log(`Найдено ${competitors.length} активных конкурентов:`);
    competitors.forEach(comp => {
      console.log(`   ${comp.id}. @${comp.username}`);
    });

    // 2. Проверяем текущее состояние
    console.log('\n📊 Текущее состояние reels:');
    const currentStats = await sql`
      SELECT 
        source_type,
        COUNT(*) as count
      FROM reels 
      WHERE project_id = 1
      GROUP BY source_type
      ORDER BY count DESC
    `;

    currentStats.forEach(stat => {
      console.log(`   ${stat.source_type || 'NULL'}: ${stat.count} reels`);
    });

    // 3. Ищем reels от наших конкурентов по username
    console.log('\n🔍 Поиск reels от конкурентов по username...');
    let totalFixed = 0;

    for (const competitor of competitors) {
      // Ищем reels этого конкурента
      const competitorReels = await sql`
        SELECT id, author_username, views_count, source_type, source_identifier
        FROM reels 
        WHERE project_id = 1 
        AND author_username = ${competitor.username}
        AND (source_type != 'competitor' OR source_identifier != ${competitor.id.toString()})
      `;

      if (competitorReels.length > 0) {
        console.log(`\n   @${competitor.username}: найдено ${competitorReels.length} reels для исправления`);
        
        // Показываем примеры
        competitorReels.slice(0, 3).forEach(reel => {
          const views = reel.views_count?.toLocaleString() || 'N/A';
          console.log(`     - ID ${reel.id}: ${views} просмотров (source: ${reel.source_type}:${reel.source_identifier})`);
        });

        // Обновляем source_type и source_identifier
        const updateResult = await sql`
          UPDATE reels 
          SET 
            source_type = 'competitor',
            source_identifier = ${competitor.id.toString()},
            updated_at = NOW()
          WHERE project_id = 1 
          AND author_username = ${competitor.username}
          AND (source_type != 'competitor' OR source_identifier != ${competitor.id.toString()})
        `;

        console.log(`     ✅ Обновлено: ${competitorReels.length} reels`);
        totalFixed += competitorReels.length;

        // Обновляем last_scraped_at у конкурента
        await sql`
          UPDATE competitors 
          SET last_scraped_at = NOW()
          WHERE id = ${competitor.id}
        `;
      } else {
        console.log(`   @${competitor.username}: reels не найдены или уже правильно привязаны`);
      }
    }

    // 4. Проверяем результат
    console.log('\n📊 Результат исправления:');
    const newStats = await sql`
      SELECT 
        source_type,
        COUNT(*) as count
      FROM reels 
      WHERE project_id = 1
      GROUP BY source_type
      ORDER BY count DESC
    `;

    newStats.forEach(stat => {
      console.log(`   ${stat.source_type || 'NULL'}: ${stat.count} reels`);
    });

    // 5. Проверяем каждого конкурента
    console.log('\n🏢 Reels по конкурентам после исправления:');
    for (const competitor of competitors) {
      const competitorReels = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND source_type = 'competitor' 
        AND source_identifier = ${competitor.id.toString()}
      `;

      const count = competitorReels[0].count;
      const maxViews = competitorReels[0].max_views?.toLocaleString() || 'N/A';
      const status = count > 0 ? '✅' : '❌';
      
      console.log(`   ${status} @${competitor.username}: ${count} reels (макс: ${maxViews} просмотров)`);
    }

    // 6. Итоговая статистика
    console.log('\n🎉 ИТОГ ИСПРАВЛЕНИЯ:');
    console.log(`✅ Исправлено привязок: ${totalFixed}`);
    
    const competitorReelsTotal = await sql`
      SELECT COUNT(*) as count 
      FROM reels 
      WHERE project_id = 1 AND source_type = 'competitor'
    `;

    console.log(`📊 Всего reels от конкурентов: ${competitorReelsTotal[0].count}`);

    if (competitorReelsTotal[0].count > 0) {
      console.log('🎯 ПРОБЛЕМА РЕШЕНА! Конкуренты теперь имеют данные!');
    } else {
      console.log('⚠️ Все еще нет reels от конкурентов. Нужен дополнительный скрапинг.');
    }

  } catch (error) {
    console.error('❌ Ошибка при исправлении:', error.message);
  }
}

fixCompetitorLinks().catch(console.error);
