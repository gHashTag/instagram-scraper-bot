import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

async function applyFixMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL не найден в переменных окружения');
    process.exit(1);
  }

  console.log('🔧 Применение исправляющей миграции для таблицы users...');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Читаем SQL миграцию
    const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', 'fix_users_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Выполнение SQL миграции...');
    console.log(migrationSQL);

    // Выполняем миграцию
    await pool.query(migrationSQL);

    console.log('✅ Миграция успешно применена!');
    
    // Проверяем структуру таблицы
    console.log('🔍 Проверка структуры таблицы users...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Структура таблицы users:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запускаем миграцию
applyFixMigration().catch(console.error); 