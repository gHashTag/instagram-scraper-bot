/**
 * Скрипт для проверки работы OpenAI Whisper API
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { exec } from "child_process";
import { promisify } from "util";

// Промисифицируем exec для удобства использования
const execAsync = promisify(exec);

// Загружаем переменные окружения
dotenv.config();

// Получаем API ключ OpenAI из переменных окружения
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Ошибка: Не указан API ключ OpenAI (OPENAI_API_KEY) в переменных окружения");
  process.exit(1);
}
console.log("OpenAI API ключ настроен и готов к использованию");

// Инициализируем клиент OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Создаем директории для временных файлов, если они не существуют
const tempDir = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Путь к тестовому аудиофайлу
const testAudioPath = path.join(tempDir, "test_audio.mp3");

// Функция для проверки статуса OpenAI API
async function checkOpenAIAPIStatus(): Promise<boolean> {
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

    return true;
  } catch (error) {
    console.error(
      "Ошибка при проверке статуса OpenAI API:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

// Функция для скачивания тестового аудиофайла
async function downloadTestAudio(): Promise<boolean> {
  try {
    // Проверяем, существует ли уже файл
    if (fs.existsSync(testAudioPath)) {
      console.log(`Тестовый аудиофайл уже существует: ${testAudioPath}`);
      return true;
    }

    console.log("Скачивание тестового аудиофайла...");

    // Скачиваем тестовый аудиофайл с GitHub
    const command = `curl -o ${testAudioPath} https://github.com/openai/openai-cookbook/raw/main/examples/data/audio-sample1.mp3`;

    const { stderr } = await execAsync(command);

    if (stderr && !stderr.includes("  % Total")) {
      console.warn(`Предупреждение curl: ${stderr}`);
    }

    if (!fs.existsSync(testAudioPath)) {
      console.error(`Аудиофайл не был скачан: ${testAudioPath}`);
      return false;
    }

    console.log(`Тестовый аудиофайл успешно скачан: ${testAudioPath}`);
    return true;
  } catch (error) {
    console.error(
      "Ошибка при скачивании тестового аудиофайла:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

// Функция для проверки Whisper API
async function testWhisperAPI(): Promise<boolean> {
  try {
    console.log("\nПроверка доступа к Whisper API...");

    // Проверяем наличие тестового аудиофайла
    if (!fs.existsSync(testAudioPath)) {
      console.error(`Тестовый аудиофайл не найден: ${testAudioPath}`);
      return false;
    }

    console.log(`Отправка аудиофайла в Whisper API: ${testAudioPath}`);

    // Проверяем формат файла
    const fileExtension = path.extname(testAudioPath).toLowerCase();
    console.log(`Формат файла: ${fileExtension}`);

    // Отправляем запрос в Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testAudioPath),
      model: "whisper-1",
    });

    console.log("Whisper API работает. Получена транскрипция:");
    console.log(transcription);

    return true;
  } catch (error) {
    console.error(
      "Ошибка при проверке Whisper API:",
      error instanceof Error ? error.message : String(error)
    );

    // Выводим дополнительную информацию об ошибке
    if (error && typeof error === "object" && "response" in error) {
      console.error("Статус ошибки:", (error as any).response?.status);
      console.error("Данные ошибки:", (error as any).response?.data);
    }

    return false;
  }
}

// Основная функция
async function main() {
  console.log("Запуск проверки OpenAI Whisper API...");

  // Проверяем статус OpenAI API
  const apiWorking = await checkOpenAIAPIStatus();
  if (!apiWorking) {
    console.error("OpenAI API не работает. Проверьте API ключ и доступ к API.");
    process.exit(1);
  }

  // Скачиваем тестовый аудиофайл
  const audioDownloaded = await downloadTestAudio();
  if (!audioDownloaded) {
    console.error("Не удалось скачать тестовый аудиофайл.");
    process.exit(1);
  }

  // Проверяем Whisper API
  const whisperWorking = await testWhisperAPI();
  if (!whisperWorking) {
    console.error(
      "Whisper API не работает. Проверьте API ключ и доступ к API."
    );
    process.exit(1);
  }

  console.log(
    "\nПроверка завершена успешно. OpenAI Whisper API работает корректно."
  );
}

// Запускаем основную функцию
main().catch((error) => {
  console.error("Необработанная ошибка:", error);
  process.exit(1);
});
