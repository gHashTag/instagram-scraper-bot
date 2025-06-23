import { Pool } from 'pg';
import { config } from 'dotenv';

// Загружаем переменные окружения
config({ path: '.env.development' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не найден в .env.development');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function createMissingTables() {
  try {
    const client = await pool.connect();
    
    console.log('🔗 Подключение к базе данных...');
    console.log('✅ Успешное подключение к Neon!');
    
    // Создаем таблицу competitors
    console.log('📝 Создание таблицы competitors...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "competitors" (
        "id" SERIAL PRIMARY KEY,
        "project_id" INTEGER NOT NULL,
        "username" VARCHAR(255) NOT NULL,
        "profile_url" TEXT NOT NULL,
        "full_name" VARCHAR(255),
        "notes" TEXT,
        "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
        "added_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "last_scraped_at" TIMESTAMP,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        UNIQUE("project_id", "username")
      );
    `);
    console.log('✅ Таблица competitors создана');
    
    // Создаем таблицу reels
    console.log('📝 Создание таблицы reels...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "reels" (
        "id" SERIAL PRIMARY KEY,
        "reel_url" TEXT UNIQUE,
        "project_id" INTEGER NOT NULL,
        "source_type" VARCHAR(50),
        "source_identifier" VARCHAR(255),
        "profile_url" TEXT,
        "author_username" VARCHAR(255),
        "description" TEXT,
        "views_count" INTEGER,
        "likes_count" INTEGER,
        "comments_count" INTEGER,
        "published_at" TIMESTAMP,
        "audio_title" VARCHAR(255),
        "audio_artist" VARCHAR(255),
        "thumbnail_url" TEXT,
        "video_download_url" TEXT,
        "transcript" TEXT,
        "raw_data" JSONB,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      );
    `);
    console.log('✅ Таблица reels создана');
    
    // Проверяем, что все таблицы существуют
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Все таблицы в базе данных:');
    console.log('============================');
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const count = countResult.rows[0].count;
      console.log(`📊 ${tableName}: ${count} записей`);
    }
    
    client.release();
    console.log('\n🎉 Все таблицы успешно созданы и проверены!');
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблиц:', error);
  } finally {
    await pool.end();
  }
}

createMissingTables(); 