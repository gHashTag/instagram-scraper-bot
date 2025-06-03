/**
 * 🔥 ПОЛНАЯ ОЧИСТКА И СВЕЖИЙ СКРАПИНГ ЗА 2 НЕДЕЛИ
 * 
 * 1. Удаляет ВСЕ reels из базы данных
 * 2. Скрапит свежие данные за последние 14 дней
 * 3. Минимум 50K просмотров
 * 4. По конкурентам И по хэштегам (2 стратегии)
 */

const { Pool } = require('pg');
require('dotenv').config();

async function clearAllReels() {
  console.log('🗑️ УДАЛЕНИЕ ВСЕХ REELS ИЗ БАЗЫ ДАННЫХ...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Получаем количество reels перед удалением
    const beforeCount = await client.query('SELECT COUNT(*) FROM reels');
    console.log(`📊 Reels в базе до очистки: ${beforeCount.rows[0].count}`);
    
    // Удаляем ВСЕ reels
    const deleteResult = await client.query('DELETE FROM reels');
    console.log(`✅ Удалено ${deleteResult.rowCount} reels`);
    
    // Проверяем что база пустая
    const afterCount = await client.query('SELECT COUNT(*) FROM reels');
    console.log(`📊 Reels в базе после очистки: ${afterCount.rows[0].count}`);
    
    if (afterCount.rows[0].count === '0') {
      console.log('✅ База данных полностью очищена от reels!');
    } else {
      console.log('⚠️ Остались reels в базе');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function checkConfiguration() {
  console.log('🔍 ПРОВЕРКА КОНФИГУРАЦИИ...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Проверяем конкурентов
    const competitorsResult = await client.query('SELECT id, username, is_active FROM competitors ORDER BY id');
    console.log(`🏢 Конкуренты (${competitorsResult.rows.length}):`);
    competitorsResult.rows.forEach(comp => {
      console.log(`  - ID: ${comp.id}, @${comp.username}, Активен: ${comp.is_active ? '✅' : '❌'}`);
    });
    
    // Проверяем хэштеги
    const hashtagsResult = await client.query('SELECT id, tag_name, is_active FROM hashtags ORDER BY id');
    console.log(`\n🏷️ Хэштеги (${hashtagsResult.rows.length}):`);
    hashtagsResult.rows.forEach(tag => {
      console.log(`  - ID: ${tag.id}, #${tag.tag_name}, Активен: ${tag.is_active ? '✅' : '❌'}`);
    });
    
    // Проверяем проекты
    const projectsResult = await client.query('SELECT id, name FROM projects ORDER BY id');
    console.log(`\n📁 Проекты (${projectsResult.rows.length}):`);
    projectsResult.rows.forEach(proj => {
      console.log(`  - ID: ${proj.id}, Название: ${proj.name}`);
    });
    
    client.release();
    
    return {
      competitors: competitorsResult.rows,
      hashtags: hashtagsResult.rows,
      projects: projectsResult.rows
    };
    
  } catch (error) {
    console.error('❌ Ошибка при проверке конфигурации:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runScraping() {
  console.log('🚀 ЗАПУСК СКРАПИНГА...');
  
  // Проверяем что у нас есть необходимые переменные
  if (!process.env.APIFY_TOKEN) {
    console.log('❌ APIFY_TOKEN не найден в .env файле');
    return;
  }
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден в .env файле');
    return;
  }
  
  console.log('✅ Переменные окружения найдены');
  console.log(`📊 APIFY_TOKEN: ${process.env.APIFY_TOKEN.substring(0, 20)}...`);
  
  // Параметры скрапинга
  const projectId = process.env.DEFAULT_PROJECT_ID || 1;
  const daysBack = 14; // 2 недели
  const minViews = 50000; // 50K+ просмотров
  const limitPerSource = 100; // Лимит на источник
  
  console.log(`\n📋 ПАРАМЕТРЫ СКРАПИНГА:`);
  console.log(`  - Проект ID: ${projectId}`);
  console.log(`  - Период: ${daysBack} дней назад`);
  console.log(`  - Минимум просмотров: ${minViews.toLocaleString()}`);
  console.log(`  - Лимит на источник: ${limitPerSource}`);
  
  try {
    // Стратегия 1: Скрапинг конкурентов
    console.log('\n🏢 СТРАТЕГИЯ 1: СКРАПИНГ КОНКУРЕНТОВ');
    console.log('=====================================');
    
    const { spawn } = require('child_process');
    
    const competitorScraping = spawn('npx', [
      'tsx', 
      'src/scripts/bulk-scrape-competitors.ts',
      projectId.toString(),
      process.env.APIFY_TOKEN,
      '1', // 1 месяц назад (но с фильтром 14 дней в коде)
      limitPerSource.toString()
    ], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    await new Promise((resolve, reject) => {
      competitorScraping.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Скрапинг конкурентов завершен успешно');
          resolve();
        } else {
          console.log(`❌ Скрапинг конкурентов завершен с кодом ${code}`);
          reject(new Error(`Competitor scraping failed with code ${code}`));
        }
      });
      
      competitorScraping.on('error', (error) => {
        console.error('❌ Ошибка запуска скрапинга конкурентов:', error);
        reject(error);
      });
    });
    
    // Пауза между стратегиями
    console.log('\n⏳ Пауза 30 секунд между стратегиями...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Стратегия 2: Скрапинг хэштегов
    console.log('\n🏷️ СТРАТЕГИЯ 2: СКРАПИНГ ХЭШТЕГОВ');
    console.log('==================================');
    
    const hashtagScraping = spawn('npx', [
      'tsx',
      'src/scripts/bulk-scrape-hashtags.ts',
      projectId.toString(),
      process.env.APIFY_TOKEN,
      daysBack.toString(),
      minViews.toString(),
      limitPerSource.toString()
    ], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    await new Promise((resolve, reject) => {
      hashtagScraping.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Скрапинг хэштегов завершен успешно');
          resolve();
        } else {
          console.log(`❌ Скрапинг хэштегов завершен с кодом ${code}`);
          reject(new Error(`Hashtag scraping failed with code ${code}`));
        }
      });
      
      hashtagScraping.on('error', (error) => {
        console.error('❌ Ошибка запуска скрапинга хэштегов:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('❌ Ошибка при скрапинге:', error.message);
    throw error;
  }
}

async function checkResults() {
  console.log('\n📊 ПРОВЕРКА РЕЗУЛЬТАТОВ...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Общее количество reels
    const totalResult = await client.query('SELECT COUNT(*) FROM reels');
    console.log(`🎬 Всего reels: ${totalResult.rows[0].count}`);
    
    // Reels по источникам
    const sourceStats = await client.query(`
      SELECT source_type, COUNT(*) as count 
      FROM reels 
      GROUP BY source_type 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 По источникам:');
    sourceStats.rows.forEach(stat => {
      console.log(`  - ${stat.source_type}: ${stat.count} reels`);
    });
    
    // Вирусные reels (50K+)
    const viralResult = await client.query('SELECT COUNT(*) FROM reels WHERE views_count >= 50000');
    console.log(`\n🔥 Вирусные (50K+): ${viralResult.rows[0].count} reels`);
    
    // Топ-5 reels
    const topReels = await client.query(`
      SELECT author_username, views_count, source_type, published_at 
      FROM reels 
      ORDER BY views_count DESC 
      LIMIT 5
    `);
    
    if (topReels.rows.length > 0) {
      console.log('\n🏆 ТОП-5 REELS:');
      topReels.rows.forEach((reel, index) => {
        const publishedDate = reel.published_at ? new Date(reel.published_at).toLocaleDateString() : 'Неизвестно';
        console.log(`${index + 1}. @${reel.author_username} - ${reel.views_count?.toLocaleString() || 'N/A'} просмотров (${reel.source_type}) - ${publishedDate}`);
      });
    }
    
    // Проверяем свежесть данных
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const recentResult = await client.query(`
      SELECT COUNT(*) FROM reels 
      WHERE published_at >= $1
    `, [twoWeeksAgo]);
    
    console.log(`\n📅 За последние 14 дней: ${recentResult.rows[0].count} reels`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка при проверке результатов:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🔥 ПОЛНАЯ ОЧИСТКА И СВЕЖИЙ СКРАПИНГ');
  console.log('===================================');
  console.log(`📅 Дата запуска: ${new Date().toLocaleString()}`);
  console.log('🎯 Цель: Получить свежие reels за последние 2 недели с 50K+ просмотров\n');
  
  try {
    // 1. Проверяем конфигурацию
    const config = await checkConfiguration();
    
    if (config.competitors.length === 0) {
      console.log('❌ Нет конкурентов в базе данных!');
      return;
    }
    
    if (config.hashtags.length === 0) {
      console.log('❌ Нет хэштегов в базе данных!');
      return;
    }
    
    // 2. Очищаем базу от всех reels
    await clearAllReels();
    
    // 3. Запускаем скрапинг
    await runScraping();
    
    // 4. Проверяем результаты
    await checkResults();
    
    console.log('\n🎉 СКРАПИНГ ЗАВЕРШЕН УСПЕШНО!');
    console.log('✅ База очищена и заполнена свежими данными');
    console.log('📊 Теперь можно обновлять дашборды');
    
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.log('🔧 Проверьте подключение к базе данных и токены API');
  }
}

// Запуск
main().catch(console.error);
