#!/usr/bin/env tsx

/**
 * 🌐 Создание веб-дашборда для Obsidian vault
 * 
 * Генерирует HTML-страницы для просмотра данных онлайн
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_PATH = path.join(__dirname, '../vaults/coco-age');
const OUTPUT_PATH = path.join(__dirname, '../docs/web-dashboard');

interface MarkdownFile {
  name: string;
  path: string;
  content: string;
  title: string;
}

async function createWebDashboard(): Promise<void> {
  console.log('🌐 Создание веб-дашборда для Obsidian vault...');

  // Создаем выходную директорию
  if (!fs.existsSync(OUTPUT_PATH)) {
    fs.mkdirSync(OUTPUT_PATH, { recursive: true });
  }

  // Читаем все markdown файлы
  const markdownFiles = await readMarkdownFiles(VAULT_PATH);
  
  // Создаем главную страницу
  await createIndexPage(markdownFiles);
  
  // Создаем страницы для каждого файла
  for (const file of markdownFiles) {
    await createFilePage(file);
  }

  // Копируем стили
  await createStyles();

  console.log(`✅ Веб-дашборд создан в: ${OUTPUT_PATH}`);
  console.log(`🌐 Откройте index.html для просмотра`);
}

async function readMarkdownFiles(dir: string): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  
  function scanDirectory(currentDir: string, relativePath: string = '') {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.')) {
        scanDirectory(fullPath, path.join(relativePath, item));
      } else if (item.endsWith('.md') && item !== 'README.md') {
        const content = fs.readFileSync(fullPath, 'utf8');
        const title = extractTitle(content) || item.replace('.md', '');
        
        files.push({
          name: item,
          path: path.join(relativePath, item),
          content,
          title
        });
      }
    }
  }
  
  scanDirectory(dir);
  return files;
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : null;
}

async function createIndexPage(files: MarkdownFile[]): Promise<void> {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🥥✨ Coco Age - Веб-дашборд</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🥥✨ Coco Age - Веб-дашборд</h1>
            <p>Система аналитики и планирования контента для Instagram</p>
            <div class="last-update">
                Последнее обновление: ${new Date().toLocaleString('ru-RU')}
            </div>
        </header>

        <nav class="main-nav">
            <div class="nav-section">
                <h3>📋 Планирование</h3>
                <ul>
                    ${files.filter(f => f.name.includes('Планирование')).map(f => 
                        `<li><a href="${f.path.replace('.md', '.html')}">${f.title}</a></li>`
                    ).join('')}
                </ul>
            </div>

            <div class="nav-section">
                <h3>📊 Аналитика</h3>
                <ul>
                    ${files.filter(f => f.name.includes('Конкуренты') || f.name.includes('Хэштеги') || f.path.includes('Analytics')).map(f => 
                        `<li><a href="${f.path.replace('.md', '.html')}">${f.title}</a></li>`
                    ).join('')}
                </ul>
            </div>

            <div class="nav-section">
                <h3>🏭 Контент-завод</h3>
                <ul>
                    ${files.filter(f => f.path.includes('Content-Factory')).map(f => 
                        `<li><a href="${f.path.replace('.md', '.html')}">${f.title}</a></li>`
                    ).join('')}
                </ul>
            </div>

            <div class="nav-section">
                <h3>🗺️ Навигация</h3>
                <ul>
                    ${files.filter(f => f.name.includes('Центральная карта') || f.name.includes('TEAM_GUIDE')).map(f => 
                        `<li><a href="${f.path.replace('.md', '.html')}">${f.title}</a></li>`
                    ).join('')}
                </ul>
            </div>
        </nav>

        <main class="dashboard">
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>📱 Контент-база</h3>
                    <div class="stat-number">775</div>
                    <div class="stat-label">Reels проанализировано</div>
                </div>
                
                <div class="stat-card">
                    <h3>👀 Общий охват</h3>
                    <div class="stat-number">112.9M</div>
                    <div class="stat-label">просмотров</div>
                </div>
                
                <div class="stat-card">
                    <h3>🎙️ AI-анализ</h3>
                    <div class="stat-number">23</div>
                    <div class="stat-label">транскрипций</div>
                </div>
                
                <div class="stat-card">
                    <h3>👥 Конкуренты</h3>
                    <div class="stat-number">7</div>
                    <div class="stat-label">брендов изучено</div>
                </div>
            </div>

            <div class="quick-actions">
                <h3>🚀 Быстрые действия</h3>
                <div class="action-buttons">
                    <a href="📊%20Планирование%20контента.html" class="btn btn-primary">📅 Календарь контента</a>
                    <a href="👥%20Конкуренты.html" class="btn btn-secondary">👥 Анализ конкурентов</a>
                    <a href="🏷️%20Хэштеги.html" class="btn btn-secondary">🏷️ Стратегия хэштегов</a>
                    <a href="content-factory/🏭-Content-Factory/🏭%20Контент-завод%20-%20Главная.html" class="btn btn-accent">🏭 Контент-завод</a>
                </div>
            </div>
        </main>

        <footer>
            <p>🥥✨ Coco Age Content System | Обновляется автоматически каждые 24 часа</p>
        </footer>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_PATH, 'index.html'), html, 'utf8');
}

async function createFilePage(file: MarkdownFile): Promise<void> {
  // Конвертируем Markdown в HTML (упрощенно)
  let htmlContent = file.content
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\`(.+?)\`/g, '<code>$1</code>')
    .replace(/\[\[(.+?)\]\]/g, '<a href="$1.html">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Обрабатываем таблицы
  htmlContent = convertTables(htmlContent);

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.title} - Coco Age</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <div class="container">
        <header>
            <nav class="breadcrumb">
                <a href="../index.html">🏠 Главная</a> / ${file.title}
            </nav>
        </header>

        <main class="content">
            <p>${htmlContent}</p>
        </main>

        <footer>
            <a href="../index.html" class="btn btn-secondary">← Вернуться к дашборду</a>
        </footer>
    </div>
</body>
</html>`;

  // Создаем директории если нужно
  const filePath = path.join(OUTPUT_PATH, file.path.replace('.md', '.html'));
  const fileDir = path.dirname(filePath);
  
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

function convertTables(content: string): string {
  // Простая конвертация таблиц Markdown в HTML
  return content.replace(/\|(.+)\|/g, (match, row) => {
    const cells = row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
    return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>';
  });
}

async function createStyles(): Promise<void> {
  const css = `
/* Coco Age Web Dashboard Styles */
:root {
    --coconut-white: #F8F6F0;
    --gold: #D4AF37;
    --soft-pink: #F5E6E8;
    --dark-text: #2C2C2C;
    --light-gray: #F5F5F5;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--dark-text);
    background: var(--coconut-white);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 40px;
    padding: 30px;
    background: white;
    border-radius: 15px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

header h1 {
    color: var(--gold);
    margin-bottom: 10px;
    font-size: 2.5em;
}

.last-update {
    color: #666;
    font-size: 0.9em;
    margin-top: 10px;
}

.main-nav {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.nav-section {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav-section h3 {
    color: var(--gold);
    margin-bottom: 15px;
    border-bottom: 2px solid var(--soft-pink);
    padding-bottom: 5px;
}

.nav-section ul {
    list-style: none;
}

.nav-section li {
    margin-bottom: 8px;
}

.nav-section a {
    color: var(--dark-text);
    text-decoration: none;
    padding: 5px 10px;
    border-radius: 5px;
    transition: background 0.3s;
}

.nav-section a:hover {
    background: var(--soft-pink);
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 40px;
}

.stat-card {
    background: white;
    padding: 25px;
    border-radius: 10px;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    border-top: 4px solid var(--gold);
}

.stat-number {
    font-size: 2.5em;
    font-weight: bold;
    color: var(--gold);
    margin: 10px 0;
}

.stat-label {
    color: #666;
    font-size: 0.9em;
}

.quick-actions {
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 40px;
}

.action-buttons {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    margin-top: 20px;
}

.btn {
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.3s;
    border: none;
    cursor: pointer;
}

.btn-primary {
    background: var(--gold);
    color: white;
}

.btn-secondary {
    background: var(--soft-pink);
    color: var(--dark-text);
}

.btn-accent {
    background: var(--dark-text);
    color: white;
}

.btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.content {
    background: white;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    margin-bottom: 40px;
}

.breadcrumb {
    margin-bottom: 20px;
}

.breadcrumb a {
    color: var(--gold);
    text-decoration: none;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

th {
    background: var(--light-gray);
    font-weight: 600;
}

footer {
    text-align: center;
    padding: 20px;
    color: #666;
    border-top: 1px solid #eee;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .action-buttons {
        flex-direction: column;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
}
`;

  fs.writeFileSync(path.join(OUTPUT_PATH, 'styles.css'), css, 'utf8');
}

// Запускаем создание дашборда
if (import.meta.url === `file://${process.argv[1]}`) {
  createWebDashboard().catch(console.error);
}
