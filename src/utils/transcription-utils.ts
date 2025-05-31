/**
 * Утилиты для транскрибации аудио
 */

import * as fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";
import { logger } from "./logger";

// Загружаем переменные окружения
dotenv.config();

/**
 * Транскрибирует аудио с помощью OpenAI Whisper API
 * @param audioPath Путь к аудио файлу
 * @returns Текст транскрипции
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    logger.info(`Транскрибация аудио: ${audioPath}`);

    // Получаем API ключ из переменных окружения
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY не найден в переменных окружения");
    }

    // Инициализируем клиент OpenAI
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Проверяем, что файл существует
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Аудиофайл не найден: ${audioPath}`);
    }

    // Получаем размер файла
    const stats = fs.statSync(audioPath);
    logger.info(`Размер аудиофайла: ${stats.size} байт`);

    // Проверяем, что файл не пустой
    if (stats.size === 0) {
      throw new Error(`Аудиофайл пустой: ${audioPath}`);
    }

    // Отправляем запрос в Whisper API с таймаутом и повторными попытками
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        logger.info(`Попытка транскрибации ${attempts + 1}/${maxAttempts}`);

        // Создаем новый поток для каждой попытки
        const fileStream = fs.createReadStream(audioPath);

        const transcription = await openai.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-1",
          language: "ru", // Указываем язык для лучшего распознавания
        });

        logger.info(`Транскрипция успешно получена (${transcription.text.length} символов)`);
        return transcription.text;
      } catch (attemptError) {
        attempts++;
        logger.error(`Ошибка при попытке ${attempts}/${maxAttempts}: ${attemptError}`);

        if (attempts >= maxAttempts) {
          throw attemptError;
        }

        // Пауза перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error("Превышено максимальное количество попыток");
  } catch (error) {
    logger.error(`Ошибка при транскрибации аудио: ${error}`);
    throw new Error(`Ошибка при транскрибации аудио: ${error instanceof Error ? error.message : String(error)}`);
  }
}
