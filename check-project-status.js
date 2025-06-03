/**
 * 🔍 Проверка реального статуса проекта
 * 
 * Простая проверка без TypeScript зависимостей
 */

const { Pool } = require('pg');
require('dotenv').config();

async function checkProjectStatus() {
  console.log('🔍 ПРОВЕРКА РЕАЛЬНОГО СТАТУСА ПРОЕКТА');
  console.log('=====================================\n');

  // Проверяем переменные окружения
  console.log('📋 Переменные окружения:');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Есть' : '❌ Нет'}`);
  console.log(`APIFY_TOKEN: ${process.env.APIFY_TOKEN ? '✅ Есть' : '❌ Нет'}`);
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Есть' : '❌ Нет'}\n`);

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден. Проверьте .env файл');
    return;
  }

  // Подключаемся к базе данных
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Подключение к базе данных...');
    
    // Проверяем подключение
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных успешно\n');

    // Проверяем таблицы
    console.log('📊 СТАТИСТИКА ТАБЛИЦ:');
    
    // Конкуренты
    const competitorsResult = await client.query('SELECT COUNT(*) FROM competitors');
    const competitorsCount = competitorsResult.rows[0].count;
    console.log(`🏢 Конкуренты: ${competitorsCount}`);

    // Хэштеги
    const hashtagsResult = await client.query('SELECT COUNT(*) FROM hashtags');
    const hashtagsCount = hashtagsResult.rows[0].count;
    console.log(`🏷️ Хэштеги: ${hashtagsCount}`);

    // Reels
    const reelsResult = await client.query('SELECT COUNT(*) FROM reels');
    const reelsCount = reelsResult.rows[0].count;
    console.log(`🎬 Reels: ${reelsCount}`);

    // Проекты
    const projectsResult = await client.query('SELECT COUNT(*) FROM projects');
    const projectsCount = projectsResult.rows[0].count;
    console.log(`📁 Проекты: ${projectsCount}\n`);

    if (competitorsCount > 0) {
      console.log('🏢 СПИСОК КОНКУРЕНТОВ:');
      const competitorsList = await client.query('SELECT id, username, profile_url, is_active FROM competitors ORDER BY id');
      competitorsList.rows.forEach(comp => {
        console.log(`- ID: ${comp.id}, @${comp.username}, Активен: ${comp.is_active ? '✅' : '❌'}`);
      });
      console.log('');
    }

    if (hashtagsCount > 0) {
      console.log('🏷️ СПИСОК ХЭШТЕГОВ:');
      const hashtagsList = await client.query('SELECT id, tag_name, is_active FROM hashtags ORDER BY id');
      hashtagsList.rows.forEach(tag => {
        console.log(`- ID: ${tag.id}, #${tag.tag_name}, Активен: ${tag.is_active ? '✅' : '❌'}`);
      });
      console.log('');
    }

    if (reelsCount > 0) {
      console.log('🎬 СТАТИСТИКА REELS:');
      
      // Reels по источникам
      const sourceStats = await client.query(`
        SELECT source_type, COUNT(*) as count 
        FROM reels 
        WHERE source_type IS NOT NULL 
        GROUP BY source_type 
        ORDER BY count DESC
      `);
      
      console.log('По источникам:');
      sourceStats.rows.forEach(stat => {
        console.log(`- ${stat.source_type}: ${stat.count} reels`);
      });

      // Reels за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentReels = await client.query(`
        SELECT COUNT(*) as count 
        FROM reels 
        WHERE created_at >= $1
      `, [thirtyDaysAgo]);
      
      console.log(`За последние 30 дней: ${recentReels.rows[0].count} reels`);

      // Вирусные reels (50K+ просмотров)
      const viralReels = await client.query(`
        SELECT COUNT(*) as count 
        FROM reels 
        WHERE views_count >= 50000
      `);
      
      console.log(`Вирусные (50K+): ${viralReels.rows[0].count} reels`);

      // Топ-5 reels
      const topReels = await client.query(`
        SELECT author_username, views_count, source_type, published_at 
        FROM reels 
        WHERE views_count > 0 
        ORDER BY views_count DESC 
        LIMIT 5
      `);
      
      if (topReels.rows.length > 0) {
        console.log('\nТОП-5 REELS:');
        topReels.rows.forEach((reel, index) => {
          console.log(`${index + 1}. @${reel.author_username} - ${reel.views_count.toLocaleString()} просмотров (${reel.source_type})`);
        });
      }
      console.log('');
    }

    // Проверяем связи между таблицами
    console.log('🔗 ПРОВЕРКА СВЯЗЕЙ:');
    
    if (competitorsCount > 0) {
      const competitorReels = await client.query(`
        SELECT c.username, COUNT(r.id) as reels_count
        FROM competitors c
        LEFT JOIN reels r ON r.source_type = 'competitor' AND r.source_identifier = c.id::text
        GROUP BY c.id, c.username
        ORDER BY reels_count DESC
      `);
      
      console.log('Reels по конкурентам:');
      competitorReels.rows.forEach(comp => {
        console.log(`- @${comp.username}: ${comp.reels_count} reels`);
      });
    }

    if (hashtagsCount > 0) {
      const hashtagReels = await client.query(`
        SELECT h.tag_name, COUNT(r.id) as reels_count
        FROM hashtags h
        LEFT JOIN reels r ON r.source_type = 'hashtag' AND r.source_identifier = h.id::text
        GROUP BY h.id, h.tag_name
        ORDER BY reels_count DESC
      `);
      
      console.log('\nReels по хэштегам:');
      hashtagReels.rows.forEach(tag => {
        console.log(`- #${tag.tag_name}: ${tag.reels_count} reels`);
      });
    }

    // Проверяем транскрипции
    if (reelsCount > 0) {
      const transcriptionStats = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(transcript) as with_transcript,
          COUNT(*) - COUNT(transcript) as without_transcript
        FROM reels
      `);
      
      const stats = transcriptionStats.rows[0];
      const transcriptPercent = Math.round((stats.with_transcript / stats.total) * 100);
      
      console.log('\n📝 ТРАНСКРИПЦИИ:');
      console.log(`- Всего reels: ${stats.total}`);
      console.log(`- С транскрипцией: ${stats.with_transcript} (${transcriptPercent}%)`);
      console.log(`- Без транскрипции: ${stats.without_transcript} (${100 - transcriptPercent}%)`);
    }

    client.release();

    // Итоговый статус
    console.log('\n🎯 ИТОГОВЫЙ СТАТУС:');
    console.log('==================');
    
    if (competitorsCount === 0) {
      console.log('❌ НЕТ КОНКУРЕНТОВ - нужно добавить конкурентов');
    } else if (reelsCount === 0) {
      console.log('❌ НЕТ REELS - нужно запустить скрапинг');
    } else {
      console.log('✅ ДАННЫЕ ЕСТЬ - проект настроен');
      
      // Рекомендации
      const recentReels = await pool.query(`
        SELECT COUNT(*) as count 
        FROM reels 
        WHERE created_at >= $1
      `, [thirtyDaysAgo]);
      
      if (recentReels.rows[0].count < 10) {
        console.log('⚠️ МАЛО СВЕЖИХ ДАННЫХ - рекомендуется запустить скрапинг');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error.message);
  } finally {
    await pool.end();
  }
}

// Запуск проверки
checkProjectStatus().catch(console.error);
