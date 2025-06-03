/**
 * 🌐 ПРОВЕРКА ВЕБ-СЕРВЕРА
 */

const fs = require('fs');
const https = require('https');

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync('web-check.log', logMessage);
  console.log(logMessage.trim());
}

function checkUrl(url, name) {
  return new Promise((resolve) => {
    log(`🔍 Проверяем ${name}: ${url}`);
    
    const req = https.get(url, (res) => {
      log(`✅ ${name}: статус ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        log(`📊 ${name}: получено ${data.length} байт`);
        if (data.length > 0) {
          log(`📝 ${name}: первые 100 символов: ${data.substring(0, 100)}`);
        }
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      log(`❌ ${name}: ошибка ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      log(`⏰ ${name}: таймаут`);
      req.destroy();
      resolve(false);
    });
  });
}

async function checkWeb() {
  log('🚀 ПРОВЕРКА ВЕБ-СЕРВИСОВ');
  
  // Проверяем основные URL
  await checkUrl('https://instagram-scraper-bot.vercel.app/', 'Главная страница');
  await checkUrl('https://instagram-scraper-bot.vercel.app/health', 'Health check');
  await checkUrl('https://instagram-scraper-bot.vercel.app/api/reels?limit=1', 'API reels');
  await checkUrl('https://instagram-scraper-bot.vercel.app/api/competitors', 'API competitors');
  
  // Проверяем внешние сервисы
  await checkUrl('https://httpbin.org/get', 'Тест сети');
  
  log('🎯 ПРОВЕРКА ВЕБ ЗАВЕРШЕНА');
}

checkWeb();
