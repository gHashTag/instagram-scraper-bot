/**
 * 📊 Проверка результата скрапера
 */

const https = require('https');

async function checkScraperResult() {
  console.log('📊 ПРОВЕРКА РЕЗУЛЬТАТА СКРАПЕРА');
  console.log('===============================\n');
  
  // Проверяем веб-дашборд
  console.log('🌐 Проверка веб-дашборда...');
  
  try {
    const dashboardUrl = 'https://instagram-scraper-bot.vercel.app/';
    
    const response = await fetch(dashboardUrl);
    const html = await response.text();
    
    // Ищем индикаторы данных в HTML
    const reelsMatch = html.match(/(\d+)\s*reels/i);
    const viewsMatch = html.match(/(\d+(?:,\d+)*)\s*просмотров/i);
    const competitorsMatch = html.match/(\d+)\s*конкурент/i);
    
    if (reelsMatch) {
      console.log(`✅ Найдено reels в дашборде: ${reelsMatch[1]}`);
    } else {
      console.log('❌ Не найдено информации о reels в дашборде');
    }
    
    if (viewsMatch) {
      console.log(`✅ Найдены просмотры: ${viewsMatch[1]}`);
    }
    
  } catch (error) {
    console.log('❌ Ошибка при проверке веб-дашборда:', error.message);
  }
  
  // Проверяем API endpoints
  console.log('\n🔌 Проверка API endpoints...');
  
  const endpoints = [
    '/api/stats',
    '/api/reels',
    '/api/competitors',
    '/api/hashtags'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `https://instagram-scraper-bot.vercel.app${endpoint}`;
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`📡 ${endpoint}:`);
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`  ✅ Данные: ${data.data.length} записей`);
      } else if (data.total !== undefined) {
        console.log(`  ✅ Всего: ${data.total}`);
      } else if (data.status === 'ok') {
        console.log(`  🟡 Статус OK, но нет данных`);
      } else {
        console.log(`  ❌ Неожиданный ответ`);
      }
      
    } catch (error) {
      console.log(`  ❌ Ошибка: ${error.message}`);
    }
  }
  
  // Проверяем Obsidian дашборд
  console.log('\n📝 Проверка Obsidian дашборда...');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const obsidianPath = 'vaults/coco-age/🎯 ГЛАВНЫЙ ДАШБОРД.md';
    
    if (fs.existsSync(obsidianPath)) {
      const content = fs.readFileSync(obsidianPath, 'utf8');
      
      // Ищем ключевые метрики
      const reelsMatch = content.match(/🎬 Всего Reels.*?(\d+)/);
      const viralMatch = content.match/🔥 Вирусный контент.*?(\d+)/);
      const updateMatch = content.match(/Последнее обновление.*?(\d{4}-\d{2}-\d{2})/);
      
      if (reelsMatch) {
        console.log(`✅ Reels в Obsidian: ${reelsMatch[1]}`);
      }
      
      if (viralMatch) {
        console.log(`✅ Вирусный контент: ${viralMatch[1]}`);
      }
      
      if (updateMatch) {
        console.log(`✅ Последнее обновление: ${updateMatch[1]}`);
      }
      
      // Проверяем топ посты
      const topPostsSection = content.match(/## 🔥.*?ВИРУСНЫЙ КОНТЕНТ.*?\n([\s\S]*?)(?=\n##|$)/);
      if (topPostsSection) {
        const posts = topPostsSection[1].match(/@\w+/g);
        if (posts) {
          console.log(`✅ Найдено топ постов: ${posts.length}`);
          console.log(`   Авторы: ${posts.slice(0, 3).join(', ')}...`);
        }
      }
      
    } else {
      console.log('❌ Obsidian дашборд не найден');
    }
    
  } catch (error) {
    console.log('❌ Ошибка при проверке Obsidian:', error.message);
  }
  
  // Проверяем логи скрапинга (если есть)
  console.log('\n📋 Поиск логов скрапинга...');
  
  try {
    const fs = require('fs');
    const logPaths = [
      'logs/scraping.log',
      'logs/setup-fresh-data.log',
      'scraping.log',
      'setup.log'
    ];
    
    let foundLogs = false;
    
    for (const logPath of logPaths) {
      if (fs.existsSync(logPath)) {
        console.log(`✅ Найден лог: ${logPath}`);
        const logContent = fs.readFileSync(logPath, 'utf8');
        const lines = logContent.split('\n').slice(-10); // Последние 10 строк
        console.log('   Последние записи:');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`   ${line}`);
          }
        });
        foundLogs = true;
        break;
      }
    }
    
    if (!foundLogs) {
      console.log('🟡 Логи скрапинга не найдены');
    }
    
  } catch (error) {
    console.log('❌ Ошибка при поиске логов:', error.message);
  }
  
  // Итоговая оценка
  console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:');
  console.log('==================');
  
  console.log('📊 Статус скрапера:');
  console.log('  - Скрипт setup-fresh-data: ✅ Завершен');
  console.log('  - Код возврата: -1 (возможна ошибка)');
  console.log('  - Время выполнения: ~40 минут');
  
  console.log('\n🔍 Рекомендации:');
  console.log('  1. Проверить веб-дашборд визуально');
  console.log('  2. Обновить Obsidian дашборд');
  console.log('  3. Запустить дополнительный скрапинг если нужно');
  
  console.log('\n🌐 Ссылки для проверки:');
  console.log('  - Веб-дашборд: https://instagram-scraper-bot.vercel.app/');
  console.log('  - Obsidian: vaults/coco-age/🎯 ГЛАВНЫЙ ДАШБОРД.md');
}

checkScraperResult().catch(console.error);
