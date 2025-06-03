/**
 * 🔍 МИНИМАЛЬНЫЙ ДЕБАГ СКРИПТ
 */

console.log('🚀 СТАРТ ДЕБАГА');
console.log('Время:', new Date().toLocaleTimeString());

// 1. Проверка Node.js
console.log('\n📋 БАЗОВАЯ ИНФОРМАЦИЯ:');
console.log('Node.js версия:', process.version);
console.log('Платформа:', process.platform);
console.log('Архитектура:', process.arch);
console.log('Рабочая директория:', process.cwd());

// 2. Проверка переменных окружения
console.log('\n🔐 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'ЕСТЬ' : 'НЕТ');
console.log('APIFY_TOKEN:', process.env.APIFY_TOKEN ? 'ЕСТЬ' : 'НЕТ');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'ЕСТЬ' : 'НЕТ');

// 3. Проверка файловой системы
console.log('\n📁 ФАЙЛОВАЯ СИСТЕМА:');
const fs = require('fs');
const path = require('path');

try {
  const packageJson = fs.readFileSync('package.json', 'utf8');
  const pkg = JSON.parse(packageJson);
  console.log('package.json найден, название:', pkg.name);
  console.log('Версия:', pkg.version);
} catch (error) {
  console.log('❌ Ошибка чтения package.json:', error.message);
}

// 4. Проверка модулей
console.log('\n📦 МОДУЛИ:');
try {
  require('dotenv');
  console.log('✅ dotenv');
} catch (e) {
  console.log('❌ dotenv:', e.message);
}

try {
  const { neon } = require('@neondatabase/serverless');
  console.log('✅ @neondatabase/serverless');
} catch (e) {
  console.log('❌ @neondatabase/serverless:', e.message);
}

// 5. Простой тест сети
console.log('\n🌐 ТЕСТ СЕТИ:');
const https = require('https');

const testUrl = 'https://httpbin.org/get';
console.log('Тестируем:', testUrl);

const req = https.get(testUrl, (res) => {
  console.log('✅ Сеть работает, статус:', res.statusCode);
  res.on('data', () => {}); // Читаем данные
  res.on('end', () => {
    console.log('✅ Запрос завершен');
    
    // 6. Тест базы данных
    testDatabase();
  });
});

req.on('error', (error) => {
  console.log('❌ Ошибка сети:', error.message);
  testDatabase();
});

req.setTimeout(5000, () => {
  console.log('⏰ Таймаут сети');
  req.destroy();
  testDatabase();
});

// Функция тестирования базы данных
async function testDatabase() {
  console.log('\n🗄️ ТЕСТ БАЗЫ ДАННЫХ:');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL отсутствует');
    finishDebug();
    return;
  }

  try {
    require('dotenv').config();
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    
    console.log('Подключение к базе...');
    
    // Простой запрос
    const result = await sql`SELECT 1 as test`;
    console.log('✅ База данных доступна, результат:', result[0]);
    
    // Проверяем таблицы
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 5
    `;
    
    console.log('📊 Таблицы в базе:');
    tables.forEach(table => {
      console.log('  -', table.table_name);
    });
    
    // Проверяем reels
    const reelsCount = await sql`SELECT COUNT(*) as count FROM reels`;
    console.log('🎬 Количество reels:', reelsCount[0].count);
    
  } catch (error) {
    console.log('❌ Ошибка базы данных:', error.message);
  }
  
  finishDebug();
}

function finishDebug() {
  console.log('\n🎯 ДЕБАГ ЗАВЕРШЕН');
  console.log('Время:', new Date().toLocaleTimeString());
  console.log('Процесс завершается через 2 секунды...');
  
  setTimeout(() => {
    console.log('👋 ВЫХОД');
    process.exit(0);
  }, 2000);
}
