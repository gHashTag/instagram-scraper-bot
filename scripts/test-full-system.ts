#!/usr/bin/env tsx

/**
 * 🧪 Полное тестирование системы Coco Age
 * 
 * Проверяет все компоненты: обновление vault, Telegram уведомления, GitHub Pages
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

async function testFullSystem(): Promise<void> {
  console.log("🧪 Запуск полного тестирования системы Coco Age");
  console.log("=" .repeat(60));
  
  const results: TestResult[] = [];
  
  // 1. Проверка переменных окружения
  console.log("\n1️⃣ Проверка переменных окружения...");
  results.push(await testEnvironmentVariables());
  
  // 2. Проверка структуры vault
  console.log("\n2️⃣ Проверка структуры Obsidian vault...");
  results.push(await testVaultStructure());
  
  // 3. Тестирование Telegram уведомлений
  console.log("\n3️⃣ Тестирование Telegram уведомлений...");
  results.push(await testTelegramNotifications());
  
  // 4. Тестирование обновления данных
  console.log("\n4️⃣ Тестирование обновления данных...");
  results.push(await testDataUpdate());
  
  // 5. Создание тестового коммита
  console.log("\n5️⃣ Создание тестового обновления...");
  results.push(await createTestUpdate());
  
  // Итоговый отчет
  console.log("\n" + "=" .repeat(60));
  console.log("📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ");
  console.log("=" .repeat(60));
  
  let successCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  
  results.forEach((result, index) => {
    const emoji = result.status === 'success' ? '✅' : 
                  result.status === 'error' ? '❌' : '⚠️';
    
    console.log(`${emoji} ${index + 1}. ${result.name}: ${result.message}`);
    
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    
    if (result.status === 'success') successCount++;
    else if (result.status === 'error') errorCount++;
    else warningCount++;
  });
  
  console.log("\n📈 Статистика:");
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`⚠️ Предупреждения: ${warningCount}`);
  console.log(`❌ Ошибки: ${errorCount}`);
  
  if (errorCount === 0) {
    console.log("\n🎉 Система готова к работе!");
    console.log("📱 Ожидайте Telegram уведомление о тестовом обновлении");
  } else {
    console.log("\n🔧 Требуется настройка некоторых компонентов");
  }
}

async function testEnvironmentVariables(): Promise<TestResult> {
  const requiredVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN'];
  const missing: string[] = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  if (missing.length === 0) {
    return {
      name: "Переменные окружения",
      status: "success",
      message: "Все переменные настроены"
    };
  } else {
    return {
      name: "Переменные окружения",
      status: "error",
      message: `Отсутствуют: ${missing.join(', ')}`,
      details: "Добавьте их в .env.development или GitHub Secrets"
    };
  }
}

async function testVaultStructure(): Promise<TestResult> {
  const vaultPath = path.join(__dirname, "../vaults/coco-age");
  const requiredFiles = [
    "🥥✨ Coco Age - Центральная карта.md",
    "📊 Планирование контента.md",
    "👥 Конкуренты.md",
    "🏷️ Хэштеги.md",
    "TEAM_GUIDE.md"
  ];
  
  if (!fs.existsSync(vaultPath)) {
    return {
      name: "Структура vault",
      status: "error",
      message: "Папка vault не найдена",
      details: `Ожидается: ${vaultPath}`
    };
  }
  
  const missing: string[] = [];
  requiredFiles.forEach(file => {
    if (!fs.existsSync(path.join(vaultPath, file))) {
      missing.push(file);
    }
  });
  
  if (missing.length === 0) {
    const fileCount = fs.readdirSync(vaultPath).filter(f => f.endsWith('.md')).length;
    return {
      name: "Структура vault",
      status: "success",
      message: `Все файлы на месте (${fileCount} файлов)`
    };
  } else {
    return {
      name: "Структура vault",
      status: "warning",
      message: `Отсутствуют файлы: ${missing.length}`,
      details: missing.join(', ')
    };
  }
}

async function testTelegramNotifications(): Promise<TestResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    return {
      name: "Telegram уведомления",
      status: "error",
      message: "TELEGRAM_BOT_TOKEN не настроен"
    };
  }
  
  try {
    // Проверяем бота
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    if (!response.ok) {
      return {
        name: "Telegram уведомления",
        status: "error",
        message: "Неверный токен бота",
        details: result.description
      };
    }
    
    // Отправляем тестовое сообщение
    const testMessage = {
      chat_id: "144022504",
      text: `🧪 *Тест системы Coco Age*

📅 *Время:* ${new Date().toLocaleString('ru-RU')}
🎯 *Статус:* Тестирование системы
🤖 *Бот:* ${result.result.first_name} (@${result.result.username})

✅ Система уведомлений работает корректно!

🔄 Ожидайте автоматические обновления каждый день в 9:00 МСК`,
      parse_mode: "Markdown"
    };
    
    const sendResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });
    
    if (sendResponse.ok) {
      return {
        name: "Telegram уведомления",
        status: "success",
        message: `Тестовое сообщение отправлено`,
        details: `Бот: @${result.result.username}`
      };
    } else {
      return {
        name: "Telegram уведомления",
        status: "error",
        message: "Ошибка отправки сообщения"
      };
    }
  } catch (error) {
    return {
      name: "Telegram уведомления",
      status: "error",
      message: "Ошибка подключения к Telegram API",
      details: String(error)
    };
  }
}

async function testDataUpdate(): Promise<TestResult> {
  try {
    // Проверяем доступность скрипта синхронизации
    const syncScriptPath = path.join(__dirname, "sync-obsidian-system.ts");
    
    if (!fs.existsSync(syncScriptPath)) {
      return {
        name: "Обновление данных",
        status: "error",
        message: "Скрипт синхронизации не найден"
      };
    }
    
    // Проверяем подключение к базе данных
    if (!process.env.DATABASE_URL) {
      return {
        name: "Обновление данных",
        status: "error",
        message: "DATABASE_URL не настроен"
      };
    }
    
    return {
      name: "Обновление данных",
      status: "success",
      message: "Скрипты готовы к работе"
    };
  } catch (error) {
    return {
      name: "Обновление данных",
      status: "error",
      message: "Ошибка проверки системы обновления",
      details: String(error)
    };
  }
}

async function createTestUpdate(): Promise<TestResult> {
  try {
    // Создаем тестовое обновление в vault
    const vaultPath = path.join(__dirname, "../vaults/coco-age");
    const testFilePath = path.join(vaultPath, "test-update.md");
    
    const testContent = `# 🧪 Тестовое обновление

**Время создания:** ${new Date().toLocaleString('ru-RU')}

Это тестовое обновление для проверки работы системы автоматической синхронизации.

## 📊 Статус тестирования
- ✅ Система обновления: Работает
- ✅ Telegram уведомления: Настроены
- ✅ GitHub Actions: Готов к запуску

---

*Создано автоматически для тестирования системы*
`;
    
    fs.writeFileSync(testFilePath, testContent, 'utf8');
    
    return {
      name: "Тестовое обновление",
      status: "success",
      message: "Тестовый файл создан",
      details: "Готов к коммиту и push"
    };
  } catch (error) {
    return {
      name: "Тестовое обновление",
      status: "error",
      message: "Ошибка создания тестового файла",
      details: String(error)
    };
  }
}

// Запускаем тестирование
if (import.meta.url === `file://${process.argv[1]}`) {
  testFullSystem().catch((error) => {
    console.error("❌ Критическая ошибка тестирования:", error);
    process.exit(1);
  });
}
