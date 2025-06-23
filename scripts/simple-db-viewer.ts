import { Pool } from 'pg';
import { config } from 'dotenv';

// Загружаем переменные окружения
config({ path: '.env.development' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не найден в .env.development');
  process.exit(1);
}

console.log('🔗 Подключение к базе данных...');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function showTables() {
  try {
    const client = await pool.connect();
    
    console.log('✅ Успешное подключение к Neon!');
    console.log('');
    
    // Показываем все таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('📋 Таблицы в базе данных:');
    console.log('========================');
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      
      // Подсчитываем записи в каждой таблице
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const count = countResult.rows[0].count;
      
      console.log(`📊 ${tableName}: ${count} записей`);
    }
    
    console.log('');
    console.log('🔍 Показываем данные из основных таблиц:');
    console.log('=======================================');
    
    // Показываем пользователей
    const users = await client.query('SELECT id, telegram_id, username, first_name FROM users LIMIT 5');
    console.log('\n👥 Пользователи (последние 5):');
    console.table(users.rows);
    
    // Показываем проекты
    const projects = await client.query('SELECT id, name, user_id, created_at FROM projects LIMIT 5');
    console.log('\n📁 Проекты (последние 5):');
    console.table(projects.rows);
    
    // Показываем конкурентов
    const competitors = await client.query('SELECT id, username, project_id, is_active FROM competitors LIMIT 5');
    console.log('\n🎯 Конкуренты (последние 5):');
    console.table(competitors.rows);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка при работе с базой данных:', error);
  } finally {
    await pool.end();
  }
}

showTables(); 