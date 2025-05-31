/**
 * Скрипт для транскрибации видео из Reels конкурентов с использованием OpenAI Whisper API
 *
 * Использование:
 * bun run src/scripts/transcribe-reels-with-whisper.ts <projectId> [minViews] [daysBack] [limit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - limit: (опционально) Максимальное количество Reels для обработки (по умолчанию 10)
 */

import { initializeDBConnection } from "../db/neonDB";
import { reelsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { eq, and, gte } from "drizzle-orm";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

// Промисифицируем exec для удобства использования
const execAsync = promisify(exec);

// Загружаем переменные окружения
dotenv.config();

// Получаем API ключ OpenAI из переменных окружения
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  logger.error("Ошибка: Не указан API ключ OpenAI (OPENAI_API_KEY) в переменных окружения");
  process.exit(1);
}
logger.info("OpenAI API ключ настроен и готов к использованию");

// Инициализируем клиент OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/transcribe-reels-with-whisper.ts <projectId> [minViews] [daysBack] [limit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const limit = args[3] ? parseInt(args[3], 10) : 10;

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack) || isNaN(limit)) {
  logger.error(
    "Ошибка: projectId, minViews, daysBack и limit должны быть числами"
  );
  process.exit(1);
}

// Создаем директории для временных файлов, если они не существуют
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(process.cwd(), "temp", "videos");
const audioDir = path.join(process.cwd(), "temp", "audio");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

/**
 * Скачивает видео по URL с использованием yt-dlp
 */
async function downloadVideo(
  url: string,
  outputPath: string
): Promise<boolean> {
  try {
    logger.info(`Скачивание видео: ${url}`);

    // Проверяем, существует ли уже файл
    if (fs.existsSync(outputPath)) {
      logger.info(`Файл уже существует: ${outputPath}`);
      return true;
    }

    // Скачиваем видео с помощью yt-dlp
    const command = `yt-dlp "${url}" -o "${outputPath}" --no-warnings`;

    logger.info(`Выполнение команды: ${command}`);

    const { stderr } = await execAsync(command);

    if (stderr) {
      logger.warn(`Предупреждение yt-dlp: ${stderr}`);
    }

    if (!fs.existsSync(outputPath)) {
      logger.error(`Видео не было скачано: ${outputPath}`);
      return false;
    }

    logger.info(`Видео успешно скачано: ${outputPath}`);
    return true;
  } catch (error) {
    logger.error(`Ошибка при скачивании видео: ${error}`);
    return false;
  }
}

/**
 * Извлекает аудио из видео
 */
async function extractAudio(
  videoPath: string,
  audioPath: string
): Promise<boolean> {
  try {
    logger.info(`Извлечение аудио из видео: ${videoPath}`);

    // Проверяем, существует ли уже файл
    if (fs.existsSync(audioPath)) {
      logger.info(`Аудио файл уже существует: ${audioPath}`);
      return true;
    }

    // Извлекаем аудио с помощью ffmpeg
    const command = `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${audioPath}" -y`;

    logger.info(`Выполнение команды: ${command}`);

    const { stderr } = await execAsync(command);

    if (stderr && !stderr.includes("time=")) {
      logger.warn(`Предупреждение ffmpeg: ${stderr}`);
    }

    if (!fs.existsSync(audioPath)) {
      logger.error(`Аудио файл не был создан: ${audioPath}`);
      return false;
    }

    logger.info(`Аудио успешно извлечено: ${audioPath}`);
    return true;
  } catch (error) {
    logger.error(`Ошибка при извлечении аудио: ${error}`);
    return false;
  }
}

/**
 * Транскрибирует аудио с помощью OpenAI Whisper API
 */
async function transcribeAudio(audioPath: string): Promise<string | null> {
  try {
    logger.info(`Транскрибация аудио: ${audioPath}`);

    // Отправляем запрос в Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      language: "ru",
    });

    logger.info(
      `Транскрипция успешно получена (${transcription.text.length} символов)`
    );
    return transcription.text;
  } catch (error) {
    logger.error(`Ошибка при транскрибации аудио: ${error}`);
    return null;
  }
}

/**
 * Обновляет транскрипцию в базе данных
 */
async function updateTranscription(
  db: any,
  reelId: number,
  transcript: string
): Promise<boolean> {
  try {
    logger.info(`Обновление транскрипции для Reel ID: ${reelId}`);

    await db
      .update(reelsTable)
      .set({ transcript })
      .where(eq(reelsTable.id, reelId));

    logger.info(`Транскрипция успешно обновлена для Reel ID: ${reelId}`);
    return true;
  } catch (error) {
    logger.error(`Ошибка при обновлении транскрипции: ${error}`);
    return false;
  }
}

/**
 * Очищает временные файлы
 */
function cleanupTempFiles(videoPath: string, audioPath: string): void {
  try {
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      logger.info(`Удален временный файл видео: ${videoPath}`);
    }

    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      logger.info(`Удален временный файл аудио: ${audioPath}`);
    }
  } catch (error) {
    logger.warn(`Ошибка при удалении временных файлов: ${error}`);
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем Reels с автоматически сгенерированными транскрипциями
    const reels = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "competitor"),
          gte(reelsTable.views_count || 0, minViews),
          gte(reelsTable.published_at, date30DaysAgo)
        )
      )
      .limit(limit);

    // Фильтруем Reels с автоматически сгенерированными транскрипциями
    const reelsWithAutoTranscript = reels.filter(
      (reel) =>
        reel.transcript &&
        reel.transcript.startsWith(
          "[Автоматически сгенерированная транскрипция"
        )
    );

    logger.info(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );
    logger.info(
      `Из них ${reelsWithAutoTranscript.length} Reels с автоматически сгенерированными транскрипциями`
    );

    if (reelsWithAutoTranscript.length === 0) {
      logger.info("Нет Reels для транскрибации");
      process.exit(0);
    }

    // Используем только Reels с автоматически сгенерированными транскрипциями
    const reelsToProcess = reelsWithAutoTranscript.slice(0, limit);
    logger.info(`Будет обработано ${reelsToProcess.length} Reels`);

    // Обрабатываем каждый Reel
    for (const reel of reelsToProcess) {
      logger.info(`Обработка Reel ID: ${reel.id}, URL: ${reel.reel_url}`);

      // Проверяем наличие URL Reel
      if (!reel.reel_url) {
        logger.warn(`Reel ID: ${reel.id} не имеет URL, пропуск`);
        continue;
      }

      // Генерируем пути для временных файлов
      const videoFileName = `reel_${reel.id}_${Date.now()}.mp4`;
      const audioFileName = `reel_${reel.id}_${Date.now()}.mp3`;
      const videoPath = path.join(videosDir, videoFileName);
      const audioPath = path.join(audioDir, audioFileName);

      try {
        // Скачиваем видео
        const videoDownloaded = await downloadVideo(reel.reel_url, videoPath);
        if (!videoDownloaded) {
          logger.error(
            `Не удалось скачать видео для Reel ID: ${reel.id}, пропуск`
          );
          continue;
        }

        // Извлекаем аудио
        const audioExtracted = await extractAudio(videoPath, audioPath);
        if (!audioExtracted) {
          logger.error(
            `Не удалось извлечь аудио для Reel ID: ${reel.id}, пропуск`
          );
          continue;
        }

        // Транскрибируем аудио
        const transcript = await transcribeAudio(audioPath);
        if (!transcript) {
          logger.error(
            `Не удалось транскрибировать аудио для Reel ID: ${reel.id}, пропуск`
          );
          continue;
        }

        // Обновляем транскрипцию в базе данных
        const updated = await updateTranscription(db, reel.id, transcript);
        if (!updated) {
          logger.error(
            `Не удалось обновить транскрипцию для Reel ID: ${reel.id}, пропуск`
          );
          continue;
        }

        logger.info(`Успешно обработан Reel ID: ${reel.id}`);
      } catch (error) {
        logger.error(`Ошибка при обработке Reel ID: ${reel.id}: ${error}`);
      } finally {
        // Очищаем временные файлы
        cleanupTempFiles(videoPath, audioPath);
      }
    }

    logger.info("Транскрибация завершена");
    process.exit(0);
  } catch (error) {
    logger.error("Критическая ошибка при выполнении транскрибации:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
