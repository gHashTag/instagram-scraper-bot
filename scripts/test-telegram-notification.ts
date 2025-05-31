#!/usr/bin/env tsx

/**
 * 📱 Тестирование Telegram уведомлений
 * 
 * Проверяет отправку уведомлений в Telegram бот
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

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode: string;
  disable_web_page_preview: boolean;
}

async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error("❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения");
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log("✅ Сообщение успешно отправлено в Telegram");
      return true;
    } else {
      console.error("❌ Ошибка отправки в Telegram:", result);
      return false;
    }
  } catch (error) {
    console.error("❌ Ошибка при отправке сообщения:", error);
    return false;
  }
}

async function testTelegramNotification(): Promise<void> {
  console.log("📱 Тестирование Telegram уведомлений...");
  
  const chatId = "144022504"; // Ваш Telegram ID
  
  // Тестовое сообщение об успешном обновлении
  const successMessage: TelegramMessage = {
    chat_id: chatId,
    text: `🔄 *Coco Age Vault Update - ТЕСТ*

📅 *Дата:* ${new Date().toLocaleString('ru-RU')}
🎯 *Проект:* Coco Age (ID: 1)
📊 *Статус:* ✅ Тестовое обновление

📁 *Статистика vault:*
• Файлов: 8
• Размер: 156K

🔗 *Быстрые ссылки:*
• [Центральная карта](https://github.com/gHashTag/instagram-scraper/blob/main/vaults/coco-age/🥥✨%20Coco%20Age%20-%20Центральная%20карта.md)
• [Планирование](https://github.com/gHashTag/instagram-scraper/blob/main/vaults/coco-age/📊%20Планирование%20контента.md)
• [Конкуренты](https://github.com/gHashTag/instagram-scraper/blob/main/vaults/coco-age/👥%20Конкуренты.md)

🤖 Тестовое уведомление от GitHub Actions`,
    parse_mode: "Markdown",
    disable_web_page_preview: true
  };

  console.log("📤 Отправка тестового сообщения об успешном обновлении...");
  const success = await sendTelegramMessage(successMessage);
  
  if (success) {
    console.log("✅ Тест успешного уведомления прошел");
    
    // Ждем 2 секунды перед следующим сообщением
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Тестовое сообщение об ошибке
    const errorMessage: TelegramMessage = {
      chat_id: chatId,
      text: `🚨 *Ошибка обновления Coco Age Vault - ТЕСТ*

📅 *Дата:* ${new Date().toLocaleString('ru-RU')}
❌ *Статус:* Тестовая ошибка
🎯 *Проект:* Coco Age

🔍 *Действия:*
• Проверьте логи в GitHub Actions
• Убедитесь в доступности базы данных
• Проверьте переменные окружения

🔗 [Посмотреть логи](https://github.com/gHashTag/instagram-scraper/actions)

🤖 Тестовое уведомление об ошибке`,
      parse_mode: "Markdown",
      disable_web_page_preview: true
    };

    console.log("📤 Отправка тестового сообщения об ошибке...");
    const errorSuccess = await sendTelegramMessage(errorMessage);
    
    if (errorSuccess) {
      console.log("✅ Тест уведомления об ошибке прошел");
    }
  }
  
  console.log("\n📊 Результаты тестирования:");
  console.log(`✅ Успешное уведомление: ${success ? 'Работает' : 'Не работает'}`);
  console.log(`🚨 Уведомление об ошибке: ${success ? 'Работает' : 'Не работает'}`);
  
  if (success) {
    console.log("\n🎉 Telegram уведомления настроены корректно!");
    console.log("📱 Проверьте ваш Telegram бот neuro_blogger_bot");
  } else {
    console.log("\n❌ Проблемы с настройкой Telegram уведомлений");
    console.log("🔧 Проверьте:");
    console.log("   • TELEGRAM_BOT_TOKEN в .env файле");
    console.log("   • Корректность токена бота");
    console.log("   • Доступность Telegram API");
  }
}

async function getBotInfo(): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error("❌ TELEGRAM_BOT_TOKEN не найден");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();
    
    if (response.ok) {
      console.log("🤖 Информация о боте:");
      console.log(`   • Имя: ${result.result.first_name}`);
      console.log(`   • Username: @${result.result.username}`);
      console.log(`   • ID: ${result.result.id}`);
    } else {
      console.error("❌ Ошибка получения информации о боте:", result);
    }
  } catch (error) {
    console.error("❌ Ошибка при запросе информации о боте:", error);
  }
}

// Запускаем тестирование
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚀 Запуск тестирования Telegram уведомлений");
  console.log("=" .repeat(50));
  
  getBotInfo().then(() => {
    console.log("=" .repeat(50));
    return testTelegramNotification();
  }).catch((error) => {
    console.error("❌ Критическая ошибка тестирования:", error);
    process.exit(1);
  });
}
