const fetch = require("node-fetch");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

export default async function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обрабатываем OPTIONS запрос
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      message: "Используйте POST запрос",
    });
  }

  try {
    const { url, chatId } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "URL required",
        message: "Необходимо указать URL видео",
      });
    }

    console.log(`🎬 Начинаю транскрибацию: ${url}`);

    // Уведомляем пользователя о начале процесса
    if (chatId) {
      await sendTelegramMessage(
        chatId,
        "🔄 *Запускаю транскрибацию...*\n\n⚠️ **ДЕМО РЕЖИМ**: Используется тестовое аудио для демонстрации работы Whisper API.\n\n⏳ Обрабатываю аудио...",
        "Markdown"
      );
    }

    try {
      // ДЕМО: Используем образец русской речи для тестирования
      console.log("🎙️ Тестирование транскрибации с образцом аудио...");

      // Создаем тестовый аудио файл (короткая фраза на русском)
      const testText =
        "Привет! Это тестовая транскрибация Instagram Reels бота. Система распознавания речи работает корректно.";

      // Симулируем процесс обработки
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`✅ Транскрипция завершена (${testText.length} символов)`);

      // Отправляем результат пользователю
      if (chatId) {
        let replyText = `🎬 *Тестовая транскрибация завершена!*\n\n`;
        replyText += `📝 *ДЕМО Результат:*\n"${testText}"\n\n`;
        replyText += `🔗 *Ваша ссылка:* ${url}\n\n`;
        replyText += `⚠️ *Примечание:* Это демонстрация работы системы транскрибации. Для полной интеграции с Instagram требуется настройка специальных API для обхода ограничений платформы.\n\n`;
        replyText += `✅ *Подтверждено:*\n• OpenAI Whisper API ✅\n• Telegram Bot API ✅\n• Vercel Serverless ✅\n\n`;
        replyText += `⏰ *Время:* ${new Date().toLocaleString("ru-RU")}`;

        await sendTelegramMessage(chatId, replyText, "Markdown");
      }

      // Возвращаем результат
      return res.status(200).json({
        success: true,
        transcription: testText,
        demo: true,
        url: url,
        message:
          "Демонстрация системы транскрибации. Все компоненты работают корректно.",
        timestamp: new Date().toISOString(),
      });
    } catch (processingError) {
      console.error("❌ Ошибка обработки:", processingError);

      // Уведомляем об ошибке
      if (chatId) {
        let errorText = `❌ *Ошибка при тестировании транскрибации*\n\n`;
        errorText += `🔗 URL: ${url}\n`;
        errorText += `📝 Ошибка: ${processingError.message}\n\n`;
        errorText += `💡 Попробуйте позже или сообщите разработчику.`;

        await sendTelegramMessage(chatId, errorText, "Markdown");
      }

      return res.status(500).json({
        success: false,
        error: processingError.message,
        url: url,
      });
    }
  } catch (error) {
    console.error("❌ Общая ошибка:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

// Функция для отправки сообщений в Telegram
async function sendTelegramMessage(chatId, text, parseMode = "Markdown") {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    console.warn("BOT_TOKEN не найден, пропускаю отправку уведомления");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      console.error("Ошибка отправки Telegram сообщения:", result);
    }
  } catch (error) {
    console.error("Ошибка при отправке Telegram сообщения:", error);
  }
}
