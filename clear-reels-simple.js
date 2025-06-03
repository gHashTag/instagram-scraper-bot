/**
 * 🗑️ Простая очистка всех reels из базы данных
 */

const { Pool } = require('pg');
require('dotenv').config();

async function clearReels() {
  console.log('🗑️ ОЧИСТКА ВСЕХ REELS ИЗ БАЗЫ ДАННЫХ');
  console.log('===================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден в .env файле');
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Подключение к базе данных успешно\n');
    
    // Проверяем количество reels до удаления
    const beforeResult = await client.query('SELECT COUNT(*) FROM reels');
    const beforeCount = beforeResult.rows[0].count;
    console.log(`📊 Reels в базе до очистки: ${beforeCount}`);
    
    if (beforeCount === '0') {
      console.log('✅ База уже пустая - нечего удалять');
      client.release();
      return;
    }
    
    // Удаляем ВСЕ reels
    console.log('🗑️ Удаление всех reels...');
    const deleteResult = await client.query('DELETE FROM reels');
    console.log(`✅ Удалено ${deleteResult.rowCount} reels`);
    
    // Проверяем что база пустая
    const afterResult = await client.query('SELECT COUNT(*) FROM reels');
    const afterCount = afterResult.rows[0].count;
    console.log(`📊 Reels в базе после очистки: ${afterCount}`);
    
    if (afterCount === '0') {
      console.log('\n🎉 БАЗА ДАННЫХ ПОЛНОСТЬЮ ОЧИЩЕНА!');
      console.log('✅ Готова для свежего скрапинга');
    } else {
      console.log('\n⚠️ Остались reels в базе - возможна ошибка');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы:', error.message);
  } finally {
    await pool.end();
  }
}

clearReels().catch(console.error);
