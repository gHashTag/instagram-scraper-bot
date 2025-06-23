import { Pool } from 'pg';
import { config } from 'dotenv';
import express from 'express';
import path from 'path';

// Загружаем переменные окружения
config({ path: '.env.development' });

const app = express();
const port = 3459;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL не найден в .env.development');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

// Главная страница
app.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Получаем все таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = [];
    
    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const count = countResult.rows[0].count;
      
      tables.push({
        name: tableName,
        count: parseInt(count)
      });
    }
    
    client.release();
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>📊 Database Viewer</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            h1 { color: #333; text-align: center; }
            .tables-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .table-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .table-name { font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
            .table-count { color: #666; font-size: 14px; }
            .view-btn { 
                background: #3b82f6; color: white; padding: 8px 16px; 
                text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;
            }
            .view-btn:hover { background: #2563eb; }
            .status { text-align: center; padding: 20px; background: #dcfce7; border-radius: 8px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 Instagram Scraper Bot - Database Viewer</h1>
            
            <div class="status">
                <strong>✅ Подключение к базе данных: Успешно</strong><br>
                <em>Всего таблиц: ${tables.length}</em>
            </div>
            
            <div class="tables-grid">
                ${tables.map(table => `
                    <div class="table-card">
                        <div class="table-name">📋 ${table.name}</div>
                        <div class="table-count">Записей: ${table.count}</div>
                        <a href="/table/${table.name}" class="view-btn">Просмотреть данные</a>
                    </div>
                `).join('')}
            </div>
            
            <div style="text-align: center; margin-top: 40px; color: #666;">
                <p>🔄 Обновлено: ${new Date().toLocaleString('ru-RU')}</p>
                <p><a href="/" style="color: #3b82f6;">🔄 Обновить</a></p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    res.status(500).send(`❌ Ошибка подключения к базе данных: ${error instanceof Error ? error.message : String(error)}`);
  }
});

// Просмотр таблицы
app.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const client = await pool.connect();
    
    // Получаем данные из таблицы
    const result = await client.query(`SELECT * FROM "${tableName}" LIMIT 50`);
    
    client.release();
    
    const columns = result.fields.map(field => field.name);
    const rows = result.rows;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>📋 ${tableName} - Database Viewer</title>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1400px; margin: 0 auto; }
            h1 { color: #333; }
            .back-btn { 
                background: #6b7280; color: white; padding: 8px 16px; 
                text-decoration: none; border-radius: 4px; display: inline-block; margin-bottom: 20px;
            }
            .back-btn:hover { background: #4b5563; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f9fafb; font-weight: 600; }
            tr:hover { background: #f9fafb; }
            .no-data { text-align: center; padding: 40px; color: #666; }
            .cell-content { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/" class="back-btn">← Назад к списку таблиц</a>
            <h1>📋 Таблица: ${tableName}</h1>
            <p><strong>Всего записей:</strong> ${rows.length} (показаны первые 50)</p>
            
            ${rows.length === 0 ? 
                '<div class="no-data">📭 Нет данных в таблице</div>' :
                `<table>
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                ${columns.map(col => `
                                    <td>
                                        <div class="cell-content" title="${String(row[col] || '').replace(/"/g, '&quot;')}">
                                            ${String(row[col] || '')}
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`
            }
        </div>
    </body>
    </html>
    `;
    
    res.send(html);
    
  } catch (error) {
    res.status(500).send(`❌ Ошибка при получении данных: ${error instanceof Error ? error.message : String(error)}`);
  }
});

app.listen(port, () => {
  console.log(`🌐 Database Viewer запущен на http://localhost:${port}`);
  console.log(`📊 Альтернатива Drizzle Studio доступна!`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Закрытие Database Viewer...');
  await pool.end();
  process.exit(0);
}); 