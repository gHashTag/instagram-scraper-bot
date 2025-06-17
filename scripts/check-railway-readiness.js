#!/usr/bin/env node

/**
 * 🚂 Скрипт проверки готовности проекта к деплою на Railway
 * Проверяет все необходимые файлы и конфигурации
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function checkFile(filePath, required = true) {
  const fullPath = path.join(projectRoot, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(colorize(`✅ ${filePath}`, 'green'));
    return true;
  } else {
    const symbol = required ? '❌' : '⚠️';
    const color = required ? 'red' : 'yellow';
    console.log(colorize(`${symbol} ${filePath} ${required ? '(обязательный)' : '(опциональный)'}`, color));
    return !required;
  }
}

function checkPackageJson() {
  const packagePath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.log(colorize('❌ package.json не найден!', 'red'));
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Проверяем необходимые скрипты
    const requiredScripts = ['start', 'typecheck'];
    const missingScripts = requiredScripts.filter(script => !packageJson.scripts?.[script]);
    
    if (missingScripts.length > 0) {
      console.log(colorize(`❌ Отсутствуют скрипты в package.json: ${missingScripts.join(', ')}`, 'red'));
      return false;
    }
    
    // Проверяем engines
    if (!packageJson.engines?.node) {
      console.log(colorize('⚠️ Не указана версия Node.js в engines', 'yellow'));
    }
    
    // Проверяем зависимости
    const requiredDeps = ['telegraf', 'dotenv', 'express'];
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
    );
    
    if (missingDeps.length > 0) {
      console.log(colorize(`❌ Отсутствуют зависимости: ${missingDeps.join(', ')}`, 'red'));
      return false;
    }
    
    console.log(colorize('✅ package.json корректен', 'green'));
    return true;
  } catch (error) {
    console.log(colorize(`❌ Ошибка чтения package.json: ${error.message}`, 'red'));
    return false;
  }
}

function checkRailwayConfig() {
  const configPath = path.join(projectRoot, 'railway.json');
  
  if (!fs.existsSync(configPath)) {
    console.log(colorize('❌ railway.json не найден!', 'red'));
    return false;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Проверяем обязательные поля
    if (!config.deploy?.startCommand) {
      console.log(colorize('❌ Не указан startCommand в railway.json', 'red'));
      return false;
    }
    
    if (!config.deploy?.healthcheckPath) {
      console.log(colorize('⚠️ Не указан healthcheckPath в railway.json', 'yellow'));
    }
    
    console.log(colorize('✅ railway.json корректен', 'green'));
    return true;
  } catch (error) {
    console.log(colorize(`❌ Ошибка чтения railway.json: ${error.message}`, 'red'));
    return false;
  }
}

function checkEnvironmentTemplate() {
  const envExamplePath = path.join(projectRoot, '.env.example');
  const envRailwayPath = path.join(projectRoot, '.env.railway');
  
  let hasTemplate = false;
  
  if (fs.existsSync(envExamplePath)) {
    console.log(colorize('✅ .env.example найден', 'green'));
    hasTemplate = true;
  }
  
  if (fs.existsSync(envRailwayPath)) {
    console.log(colorize('✅ .env.railway найден', 'green'));
    hasTemplate = true;
  }
  
  if (!hasTemplate) {
    console.log(colorize('⚠️ Нет шаблона переменных окружения', 'yellow'));
  }
  
  return true;
}

function checkSourceFiles() {
  const srcPath = path.join(projectRoot, 'src');
  const botPath = path.join(srcPath, 'bot.ts');
  
  if (!fs.existsSync(srcPath)) {
    console.log(colorize('❌ Папка src не найдена!', 'red'));
    return false;
  }
  
  if (!fs.existsSync(botPath)) {
    console.log(colorize('❌ Файл src/bot.ts не найден!', 'red'));
    return false;
  }
  
  console.log(colorize('✅ Исходные файлы найдены', 'green'));
  return true;
}

function checkTypeScript() {
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  
  if (!fs.existsSync(tsconfigPath)) {
    console.log(colorize('❌ tsconfig.json не найден!', 'red'));
    return false;
  }
  
  console.log(colorize('✅ TypeScript конфигурация найдена', 'green'));
  return true;
}

function printSummary(checks) {
  const passed = checks.filter(Boolean).length;
  const total = checks.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(colorize(`📊 Результат проверки: ${passed}/${total}`, 'cyan'));
  
  if (passed === total) {
    console.log(colorize('🎉 Проект готов к деплою на Railway!', 'green'));
    console.log('\n' + colorize('Следующие шаги:', 'blue'));
    console.log('1. Выполните: bash scripts/setup-railway.sh');
    console.log('2. Или создайте проект вручную на railway.app');
    console.log('3. Настройте переменные окружения');
    console.log('4. Задеплойте проект');
  } else {
    console.log(colorize('⚠️ Проект требует доработки перед деплоем', 'yellow'));
    console.log('\n' + colorize('Исправьте ошибки выше и запустите проверку снова', 'blue'));
  }
  
  console.log('\n' + colorize('📚 Документация: docs/RAILWAY_DEPLOYMENT.md', 'cyan'));
}

function main() {
  console.log(colorize('🚂 Проверка готовности к деплою на Railway', 'magenta'));
  console.log('='.repeat(50));
  
  const checks = [];
  
  console.log(colorize('\n📁 Проверка файлов конфигурации:', 'blue'));
  checks.push(checkFile('railway.json', true));
  checks.push(checkFile('.railwayignore', false));
  checks.push(checkFile('docs/RAILWAY_DEPLOYMENT.md', false));
  
  console.log(colorize('\n📦 Проверка package.json:', 'blue'));
  checks.push(checkPackageJson());
  
  console.log(colorize('\n⚙️ Проверка Railway конфигурации:', 'blue'));
  checks.push(checkRailwayConfig());
  
  console.log(colorize('\n🔧 Проверка переменных окружения:', 'blue'));
  checks.push(checkEnvironmentTemplate());
  
  console.log(colorize('\n📝 Проверка исходного кода:', 'blue'));
  checks.push(checkSourceFiles());
  
  console.log(colorize('\n🔷 Проверка TypeScript:', 'blue'));
  checks.push(checkTypeScript());
  
  printSummary(checks);
}

// Запуск проверки
main();
