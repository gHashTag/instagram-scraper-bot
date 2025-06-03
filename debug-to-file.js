/**
 * 🔍 ДЕБАГ С ЗАПИСЬЮ В ФАЙЛ (без терминала)
 */

const fs = require('fs');
const path = require('path');

function log(message) {
  const timestamp = new Date().toLocaleTimeString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // Записываем в файл
  fs.appendFileSync('debug.log', logMessage);
  
  // Пытаемся вывести в консоль
  console.log(logMessage.trim());
}

try {
  log('🚀 СТАРТ ДЕБАГА');
  log(`Node.js версия: ${process.version}`);
  log(`Платформа: ${process.platform}`);
  log(`Рабочая директория: ${process.cwd()}`);
  
  // Проверяем .env
  try {
    require('dotenv').config();
    log('✅ dotenv загружен');
    log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'ЕСТЬ' : 'НЕТ'}`);
    log(`APIFY_TOKEN: ${process.env.APIFY_TOKEN ? 'ЕСТЬ' : 'НЕТ'}`);
  } catch (e) {
    log(`❌ Ошибка dotenv: ${e.message}`);
  }
  
  // Проверяем package.json
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    log(`✅ package.json: ${pkg.name} v${pkg.version}`);
  } catch (e) {
    log(`❌ Ошибка package.json: ${e.message}`);
  }
  
  // Проверяем модули
  try {
    const { neon } = require('@neondatabase/serverless');
    log('✅ @neondatabase/serverless доступен');
  } catch (e) {
    log(`❌ @neondatabase/serverless: ${e.message}`);
  }
  
  log('🎯 ДЕБАГ ЗАВЕРШЕН - проверь файл debug.log');
  
} catch (error) {
  log(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`);
}
