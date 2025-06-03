/**
 * 🗄️ ПРОВЕРКА БАЗЫ ДАННЫХ С ЗАПИСЬЮ В ФАЙЛ
 */

const fs = require('fs');

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('db-check.log', logMessage);
  console.log(logMessage.trim());
}

async function checkDatabase() {
  try {
    log('🚀 ПРОВЕРКА БАЗЫ ДАННЫХ');
    
    // Загружаем .env
    require('dotenv').config();
    
    if (!process.env.DATABASE_URL) {
      log('❌ DATABASE_URL не найден');
      return;
    }
    
    log('✅ DATABASE_URL найден');
    
    // Подключаемся к базе
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    log('📡 Подключение к базе...');
    
    // Простой тест
    const test = await sql`SELECT 1 as test`;
    log(`✅ База доступна: ${JSON.stringify(test[0])}`);
    
    // Проверяем reels
    const reelsCount = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1`;
    log(`🎬 Количество reels: ${reelsCount[0].count}`);
    
    // Проверяем вирусные
    const viralCount = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1 AND views_count >= 50000`;
    log(`🔥 Вирусных reels: ${viralCount[0].count}`);
    
    // Топ 3 reel
    const topReels = await sql`
      SELECT author_username, views_count 
      FROM reels 
      WHERE project_id = 1 
      ORDER BY views_count DESC 
      LIMIT 3
    `;
    
    log('🏆 ТОП-3 REELS:');
    topReels.forEach((reel, index) => {
      log(`  ${index + 1}. @${reel.author_username} - ${reel.views_count?.toLocaleString() || 'N/A'} просмотров`);
    });
    
    // Проверяем конкурентов
    const competitors = await sql`
      SELECT id, username, is_active 
      FROM competitors 
      WHERE project_id = 1
    `;
    
    log(`👥 Конкурентов в базе: ${competitors.length}`);
    competitors.forEach(comp => {
      log(`  - @${comp.username} (ID: ${comp.id}, активен: ${comp.is_active})`);
    });
    
    // Проверяем связи конкурентов
    for (const comp of competitors) {
      const competitorReels = await sql`
        SELECT COUNT(*) as count 
        FROM reels 
        WHERE project_id = 1 
        AND source_type = 'competitor' 
        AND source_identifier = ${comp.id.toString()}
      `;
      
      log(`  @${comp.username}: ${competitorReels[0].count} reels по source_identifier`);
    }
    
    // Проверяем источники
    const sources = await sql`
      SELECT source_type, COUNT(*) as count 
      FROM reels 
      WHERE project_id = 1 
      GROUP BY source_type
    `;
    
    log('📊 ИСТОЧНИКИ ДАННЫХ:');
    sources.forEach(source => {
      log(`  ${source.source_type || 'NULL'}: ${source.count} reels`);
    });
    
    log('🎯 ПРОВЕРКА ЗАВЕРШЕНА');
    
  } catch (error) {
    log(`💥 ОШИБКА: ${error.message}`);
    log(`Stack: ${error.stack}`);
  }
}

checkDatabase();
