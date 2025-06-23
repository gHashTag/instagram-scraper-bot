#!/usr/bin/env node

require('dotenv').config({ path: '.env.development' });

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Запуск Drizzle Studio через Node.js...');
console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'установлен' : 'НЕ НАЙДЕН');

// Путь к drizzle-kit
const drizzleKitPath = path.join(__dirname, '..', 'node_modules', '.bin', 'drizzle-kit');

// Запускаем drizzle-kit studio
const studio = spawn('node', [drizzleKitPath, 'studio', '--port', '3457'], {
  stdio: 'inherit',
  env: process.env
});

studio.on('close', (code) => {
  console.log(`\n🏁 Drizzle Studio завершен с кодом: ${code}`);
});

studio.on('error', (error) => {
  console.error('❌ Ошибка запуска Drizzle Studio:', error.message);
});

console.log('📊 Drizzle Studio должен быть доступен на: http://localhost:3457');
console.log('⏹️  Для остановки нажмите Ctrl+C'); 