/**
 * Скрипт для проверки транскрибации с использованием тестового аудиофайла
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Получаем API ключ OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error(
    "Ошибка: Не указан API ключ OpenAI (OPENAI_API_KEY) в переменных окружения"
  );
  process.exit(1);
}

console.log("OpenAI API ключ настроен и готов к использованию");

// Инициализируем клиент OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Путь к тестовому аудиофайлу
const testAudioPath = path.join(process.cwd(), "temp", "test_audio.mp3");

// Проверяем наличие тестового аудиофайла
if (!fs.existsSync(testAudioPath)) {
  console.error(`Тестовый аудиофайл не найден: ${testAudioPath}`);
  process.exit(1);
}

// Функция для транскрибации аудио
async function transcribeAudio(audioPath: string): Promise<void> {
  try {
    console.log(`Транскрибация аудио: ${audioPath}`);

    // Отправляем запрос в Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
    });

    console.log("Транскрипция успешно получена:");
    console.log(transcription);
  } catch (error) {
    console.error(
      "Ошибка при транскрибации аудио:",
      error instanceof Error ? error.message : String(error)
    );

    // Выводим дополнительную информацию об ошибке
    if (error && typeof error === "object" && "response" in error) {
      console.error("Статус ошибки:", (error as any).response?.status);
      console.error("Данные ошибки:", (error as any).response?.data);
    }
  }
}

// Запускаем транскрибацию
transcribeAudio(testAudioPath);
