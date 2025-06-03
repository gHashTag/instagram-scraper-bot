/**
 * 🗓️ Проверка дат reels в базе данных
 * 
 * Точная проверка когда были созданы и опубликованы reels
 */

const { Pool } = require('pg');
require('dotenv').config();

async function checkReelsDates() {
  console.log('🗓️ ПРОВЕРКА ДАТ REELS В БАЗЕ ДАННЫХ');
  console.log('=====================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных успешно\n');

    // Общая статистика
    const totalResult = await client.query('SELECT COUNT(*) FROM reels');
    const totalReels = totalResult.rows[0].count;
    console.log(`📊 ОБЩАЯ СТАТИСТИКА: ${totalReels} reels в базе\n`);

    if (totalReels === 0) {
      console.log('❌ В базе данных НЕТ REELS!');
      console.log('🔄 Нужно запустить скрапинг');
      client.release();
      return;
    }

    // Проверяем даты создания (когда добавлены в базу)
    console.log('📅 ДАТЫ СОЗДАНИЯ В БАЗЕ (created_at):');
    const createdDates = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM reels 
      GROUP BY DATE(created_at) 
      ORDER BY date DESC 
      LIMIT 10
    `);

    createdDates.rows.forEach(row => {
      const date = new Date(row.date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isRecent = (new Date() - date) / (1000 * 60 * 60 * 24) <= 7; // последние 7 дней
      
      console.log(`${isToday ? '🟢' : isRecent ? '🟡' : '🔴'} ${row.date}: ${row.count} reels ${isToday ? '(СЕГОДНЯ!)' : ''}`);
    });

    // Проверяем даты публикации постов (published_at)
    console.log('\n📅 ДАТЫ ПУБЛИКАЦИИ ПОСТОВ (published_at):');
    const publishedDates = await client.query(`
      SELECT 
        DATE(published_at) as date,
        COUNT(*) as count
      FROM reels 
      WHERE published_at IS NOT NULL
      GROUP BY DATE(published_at) 
      ORDER BY date DESC 
      LIMIT 10
    `);

    if (publishedDates.rows.length === 0) {
      console.log('❌ НЕТ ДАННЫХ О ДАТАХ ПУБЛИКАЦИИ!');
    } else {
      publishedDates.rows.forEach(row => {
        const date = new Date(row.date);
        const daysAgo = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
        const isRecent = daysAgo <= 30;
        
        console.log(`${isRecent ? '✅' : '❌'} ${row.date}: ${row.count} reels (${daysAgo} дней назад)`);
      });
    }

    // Проверяем за 2025 год
    console.log('\n📅 REELS ЗА 2025 ГОД:');
    const year2025 = await client.query(`
      SELECT COUNT(*) as count
      FROM reels 
      WHERE published_at >= '2025-01-01'
    `);
    console.log(`✅ За 2025 год: ${year2025.rows[0].count} reels`);

    // Проверяем за последний месяц
    console.log('\n📅 REELS ЗА ПОСЛЕДНИЕ 30 ДНЕЙ:');
    const last30Days = await client.query(`
      SELECT COUNT(*) as count
      FROM reels 
      WHERE published_at >= (NOW() - INTERVAL '30 days')
    `);
    console.log(`✅ За последние 30 дней: ${last30Days.rows[0].count} reels`);

    // Проверяем за последние 14 дней
    const last14Days = await client.query(`
      SELECT COUNT(*) as count
      FROM reels 
      WHERE published_at >= (NOW() - INTERVAL '14 days')
    `);
    console.log(`✅ За последние 14 дней: ${last14Days.rows[0].count} reels`);

    // Проверяем за сегодня
    const today = await client.query(`
      SELECT COUNT(*) as count
      FROM reels 
      WHERE DATE(published_at) = CURRENT_DATE
    `);
    console.log(`✅ Опубликованные сегодня: ${today.rows[0].count} reels`);

    // Проверяем когда был последний скрапинг
    console.log('\n🔄 ПОСЛЕДНИЙ СКРАПИНГ:');
    const lastScraped = await client.query(`
      SELECT 
        MAX(created_at) as last_scraped,
        COUNT(*) as count
      FROM reels 
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    if (lastScraped.rows[0].count > 0) {
      console.log(`✅ Сегодня добавлено: ${lastScraped.rows[0].count} reels`);
      console.log(`⏰ Последний скрапинг: ${lastScraped.rows[0].last_scraped}`);
    } else {
      console.log(`❌ Сегодня скрапинг НЕ ВЫПОЛНЯЛСЯ`);
    }

    // Топ-5 самых свежих reels
    console.log('\n🔥 ТОП-5 САМЫХ СВЕЖИХ REELS:');
    const freshReels = await client.query(`
      SELECT 
        author_username,
        views_count,
        published_at,
        created_at,
        source_type
      FROM reels 
      ORDER BY published_at DESC 
      LIMIT 5
    `);

    freshReels.rows.forEach((reel, index) => {
      const publishedDate = new Date(reel.published_at);
      const createdDate = new Date(reel.created_at);
      const daysAgo = Math.floor((new Date() - publishedDate) / (1000 * 60 * 60 * 24));
      
      console.log(`${index + 1}. @${reel.author_username}`);
      console.log(`   📊 ${reel.views_count?.toLocaleString() || 'N/A'} просмотров`);
      console.log(`   📅 Опубликован: ${publishedDate.toLocaleDateString()} (${daysAgo} дней назад)`);
      console.log(`   💾 Добавлен в базу: ${createdDate.toLocaleDateString()}`);
      console.log(`   🔗 Источник: ${reel.source_type}`);
      console.log('');
    });

    // Проверяем старые данные (2024 год)
    console.log('🗑️ ПРОВЕРКА СТАРЫХ ДАННЫХ:');
    const old2024 = await client.query(`
      SELECT COUNT(*) as count
      FROM reels 
      WHERE published_at < '2025-01-01'
    `);
    
    if (old2024.rows[0].count > 0) {
      console.log(`❌ НАЙДЕНЫ СТАРЫЕ ДАННЫЕ: ${old2024.rows[0].count} reels из 2024 года`);
      console.log(`🧹 Рекомендуется очистить старые данные`);
    } else {
      console.log(`✅ Старых данных нет - только 2025 год`);
    }

    client.release();

    // ИТОГОВЫЙ ВЕРДИКТ
    console.log('\n🎯 ИТОГОВЫЙ ВЕРДИКТ:');
    console.log('==================');
    
    const recentCount = last30Days.rows[0].count;
    const todayCount = lastScraped.rows[0].count;
    const year2025Count = year2025.rows[0].count;
    
    if (todayCount > 0) {
      console.log('✅ СКРАПИНГ СЕГОДНЯ ВЫПОЛНЯЛСЯ');
    } else {
      console.log('❌ СКРАПИНГ СЕГОДНЯ НЕ ВЫПОЛНЯЛСЯ');
    }
    
    if (recentCount >= 50) {
      console.log('✅ ДОСТАТОЧНО СВЕЖИХ ДАННЫХ (30 дней)');
    } else if (recentCount > 0) {
      console.log('⚠️ МАЛО СВЕЖИХ ДАННЫХ - нужен дополнительный скрапинг');
    } else {
      console.log('❌ НЕТ СВЕЖИХ ДАННЫХ - срочно нужен скрапинг');
    }
    
    if (year2025Count === totalReels) {
      console.log('✅ ВСЕ ДАННЫЕ ЗА 2025 ГОД - старых данных нет');
    } else {
      console.log('⚠️ ЕСТЬ СТАРЫЕ ДАННЫЕ - рекомендуется очистка');
    }

  } catch (error) {
    console.error('❌ Ошибка при проверке дат:', error.message);
  } finally {
    await pool.end();
  }
}

// Запуск проверки
checkReelsDates().catch(console.error);
