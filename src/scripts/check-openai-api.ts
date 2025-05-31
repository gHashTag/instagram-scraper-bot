/**
 * Скрипт для проверки доступа к OpenAI API
 */

import dotenv from "dotenv";
import OpenAI from "openai";

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие API ключа OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Ошибка: Не указан API ключ OpenAI (OPENAI_API_KEY) в переменных окружения");
  process.exit(1);
}

// Инициализируем клиент OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Функция для проверки статуса OpenAI API
async function checkOpenAIAPIStatus(): Promise<void> {
  try {
    console.log("Проверка статуса OpenAI API...");
    console.log("OpenAI API ключ настроен и готов к использованию");
    
    const models = await openai.models.list();
    console.log(`OpenAI API работает. Доступно ${models.data.length} моделей.`);
    
    // Выводим список моделей
    console.log("Доступные модели:");
    models.data.forEach((model, index) => {
      console.log(`${index + 1}. ${model.id}`);
    });
    
    // Проверяем доступ к Whisper API
    console.log("\nПроверка доступа к Whisper API...");
    try {
      // Создаем простой текстовый файл для тестирования
      const fs = require("fs");
      const path = require("path");
      const testAudioPath = path.join(process.cwd(), "temp", "test_audio.mp3");
      
      // Проверяем, существует ли уже файл
      if (!fs.existsSync(testAudioPath)) {
        console.log("Тестовый аудиофайл не найден. Пропуск проверки Whisper API.");
      } else {
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(testAudioPath),
          model: "whisper-1",
        });
        
        console.log("Whisper API работает. Получена транскрипция:", transcription);
      }
    } catch (whisperError) {
      console.error("Ошибка при проверке Whisper API:", whisperError);
    }
    
    console.log("\nПроверка завершена.");
  } catch (error) {
    console.error("Ошибка при проверке статуса OpenAI API:", error);
    process.exit(1);
  }
}

// Запускаем проверку
checkOpenAIAPIStatus();
