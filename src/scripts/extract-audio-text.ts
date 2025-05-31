/**
 * Скрипт для извлечения аудио из видео и преобразования его в текст с помощью OpenAI Whisper API
 *
 * Использование:
 * bun run src/scripts/extract-audio-text.ts <projectId> [sourceType] [sourceId] [limit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - sourceType: (опционально) Тип источника (competitor или hashtag, по умолчанию все)
 * - sourceId: (опционально) ID источника (по умолчанию все)
 * - limit: (опционально) Максимальное количество Reels для обработки (по умолчанию 10)
 */

import { initializeDBConnection } from "../db/neonDB";
import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { v4 as uuidv4 } from "uuid";
import OpenAI from "openai";
import { NeonAdapter } from "../adapters/neon-adapter";

// Загружаем переменные окружения
dotenv.config();

// Проверяем наличие токена OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  logger.error(
    "Ошибка: Не указан токен OpenAI (OPENAI_API_KEY) в переменных окружения"
  );
  process.exit(1);
}

// Инициализируем клиент OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/extract-audio-text.ts <projectId> [sourceType] [sourceId] [limit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const sourceType = args[1] || "all"; // "competitor", "hashtag" или "all"
const sourceId = args[2] ? parseInt(args[2], 10) : 0; // 0 означает все источники
const limit = args[3] ? parseInt(args[3], 10) : 10;

if (isNaN(projectId) || (sourceId !== 0 && isNaN(sourceId)) || isNaN(limit)) {
  logger.error("Ошибка: projectId, sourceId и limit должны быть числами");
  process.exit(1);
}

if (
  sourceType !== "competitor" &&
  sourceType !== "hashtag" &&
  sourceType !== "all"
) {
  logger.error(
    "Ошибка: sourceType должен быть 'competitor', 'hashtag' или 'all'"
  );
  process.exit(1);
}

/**
 * Получает Reels из базы данных, у которых нет транскрипции
 */
async function getReelsWithoutTranscription(
  db: NeonAdapter,
  projectId: number,
  sourceType: string,
  sourceId: number,
  limit: number
) {
  // Используем Drizzle ORM для запросов
  const { reelsTable } = await import("../db/schema");
  const { eq, and, isNull, or } = await import("drizzle-orm");

  try {
    let query = db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          or(isNull(reelsTable.transcript), eq(reelsTable.transcript, ""))
        )
      );

    if (sourceType !== "all") {
      query = query.where(eq(reelsTable.source_type, sourceType));

      if (sourceId !== 0) {
        query = query.where(eq(reelsTable.source_identifier, String(sourceId)));
      }
    }

    // Ограничиваем количество результатов
    const reels = await query.limit(limit);

    return reels;
  } catch (error) {
    logger.error("Ошибка при получении Reels из базы данных:", error);
    throw error;
  }
}

/**
 * Обновляет транскрипцию Reel в базе данных
 */
async function updateReelTranscription(
  db: NeonAdapter,
  reelId: number,
  transcript: string
) {
  // Используем Drizzle ORM для запросов
  const { reelsTable } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  try {
    await db
      .update(reelsTable)
      .set({
        transcript,
        updated_at: new Date(),
      })
      .where(eq(reelsTable.id, reelId));

    return true;
  } catch (error) {
    logger.error(
      `Ошибка при обновлении транскрипции для Reel ${reelId}:`,
      error
    );
    throw error;
  }
}

/**
 * Скачивает видео по URL с использованием instagram-dl или другого инструмента
 */
async function downloadVideo(
  url: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Используем instagram-dl для скачивания видео
    // Если instagram-dl не установлен, можно использовать другие инструменты
    // или предложить пользователю скачать видео вручную

    // Для этого примера мы будем использовать curl с заголовками, имитирующими браузер
    const headers = [
      "-H",
      "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
      "-H",
      "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "-H",
      "Accept-Language: en-US,en;q=0.5",
      "-H",
      "Connection: keep-alive",
      "-H",
      "Upgrade-Insecure-Requests: 1",
      "-H",
      "Pragma: no-cache",
      "-H",
      "Cache-Control: no-cache",
    ];

    // Используем curl для скачивания видео
    const curl = child_process.spawn("curl", [
      ...headers,
      "-L", // Следовать редиректам
      "-o",
      outputPath, // Выходной файл
      url, // URL видео
    ]);

    curl.stderr.on("data", (data) => {
      logger.debug(`curl: ${data}`);
    });

    curl.on("close", (code) => {
      if (code === 0) {
        // Проверяем размер файла
        const stats = fs.statSync(outputPath);
        if (stats.size > 1000) {
          // Если файл больше 1KB, считаем, что скачивание успешно
          resolve(true);
        } else {
          // Если файл слишком маленький, вероятно, это не видео
          fs.unlinkSync(outputPath); // Удаляем файл
          reject(
            new Error(`Скачанный файл слишком маленький: ${stats.size} байт`)
          );
        }
      } else {
        reject(new Error(`curl завершился с кодом ${code}`));
      }
    });

    curl.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Извлекает аудио из видео с помощью ffmpeg
 */
async function extractAudio(
  videoPath: string,
  audioPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const ffmpeg = child_process.spawn("ffmpeg", [
      "-i",
      videoPath,
      "-vn", // Отключаем видео
      "-acodec",
      "libmp3lame", // Используем MP3 кодек
      "-ab",
      "128k", // Битрейт 128 кбит/с
      "-ar",
      "44100", // Частота дискретизации 44.1 кГц
      "-y", // Перезаписываем файл, если он существует
      audioPath,
    ]);

    ffmpeg.stderr.on("data", (data) => {
      // ffmpeg выводит информацию в stderr
      logger.debug(`ffmpeg: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`ffmpeg завершился с кодом ${code}`));
      }
    });

    ffmpeg.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Преобразует аудио в текст с помощью OpenAI Whisper API
 */
async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      language: "ru", // Можно указать язык или оставить автоопределение
      response_format: "text",
    });

    return transcription;
  } catch (error) {
    logger.error("Ошибка при транскрибации аудио:", error);
    throw error;
  }
}

/**
 * Создает директорию, если она не существует
 */
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Скачивает видео с Instagram по URL Reel
 */
async function downloadReelVideo(
  reelUrl: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Используем yt-dlp для скачивания видео с Instagram
    const ytdlp = child_process.spawn("yt-dlp", [
      "--no-warnings",
      "--quiet",
      "-o",
      outputPath,
      reelUrl,
    ]);

    ytdlp.stderr.on("data", (data) => {
      logger.debug(`yt-dlp error: ${data}`);
    });

    ytdlp.on("close", (code) => {
      if (code === 0) {
        // Проверяем, что файл существует и имеет размер
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          resolve(true);
        } else {
          reject(
            new Error("Файл не был скачан или имеет слишком маленький размер")
          );
        }
      } else {
        reject(new Error(`yt-dlp завершился с кодом ${code}`));
      }
    });

    ytdlp.on("error", (err) => {
      // Если yt-dlp не установлен, пробуем использовать curl
      if (err.message.includes("ENOENT")) {
        logger.warn("yt-dlp не установлен, пробуем использовать curl...");
        downloadVideo(reelUrl, outputPath).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Запуск извлечения аудио и текста для проекта ${projectId}`);

  if (sourceType !== "all") {
    logger.info(
      `Фильтр: тип источника = ${sourceType}, ID источника = ${sourceId || "все"}`
    );
  }

  logger.info(`Лимит: ${limit} Reels`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Создаем директории для временных файлов
    const tempDir = path.join(process.cwd(), "temp");
    const videosDir = path.join(tempDir, "videos");
    const audioDir = path.join(tempDir, "audio");

    ensureDirectoryExists(tempDir);
    ensureDirectoryExists(videosDir);
    ensureDirectoryExists(audioDir);

    // Получаем Reels без транскрипции
    const reels = await getReelsWithoutTranscription(
      db,
      projectId,
      sourceType,
      sourceId,
      limit
    );

    if (reels.length === 0) {
      logger.info(
        `Не найдено Reels без транскрипции для проекта ${projectId} с указанными параметрами`
      );
      process.exit(0);
    }

    logger.info(`Найдено ${reels.length} Reels без транскрипции`);

    // Обрабатываем каждый Reel
    for (const reel of reels) {
      logger.info(`Обработка Reel: ${reel.reel_url} (ID: ${reel.id})`);

      try {
        // Генерируем уникальные имена файлов
        const uniqueId = uuidv4().substring(0, 8);
        const videoPath = path.join(videosDir, `${uniqueId}.mp4`);
        const audioPath = path.join(audioDir, `${uniqueId}.mp3`);

        // Сначала пробуем скачать видео по URL Reel
        logger.info(`Скачивание видео с URL: ${reel.reel_url}`);
        try {
          await downloadReelVideo(reel.reel_url, videoPath);
        } catch (downloadError) {
          // Если не удалось скачать по URL Reel, пробуем скачать по video_download_url
          logger.warn(
            `Не удалось скачать видео с URL Reel: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`
          );
          logger.info(
            `Пробуем скачать с video_download_url: ${reel.video_download_url}`
          );
          await downloadVideo(reel.video_download_url, videoPath);
        }

        // Извлекаем аудио
        logger.info("Извлечение аудио из видео...");
        await extractAudio(videoPath, audioPath);

        // Преобразуем аудио в текст
        logger.info("Преобразование аудио в текст...");
        const transcript = await transcribeAudio(audioPath);

        // Обновляем транскрипцию в базе данных
        logger.info(`Обновление транскрипции для Reel ${reel.id}...`);
        await updateReelTranscription(db, reel.id, transcript);

        logger.info(`Транскрипция успешно обновлена для Reel ${reel.id}`);
        logger.info(`Текст: ${transcript.substring(0, 100)}...`);

        // Удаляем временные файлы
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      } catch (error) {
        logger.error(`Ошибка при обработке Reel ${reel.id}:`, error);
        // Продолжаем с следующим Reel
      }
    }

    logger.info("Извлечение аудио и текста завершено");
  } catch (error) {
    logger.error(
      "Критическая ошибка при выполнении извлечения аудио и текста:",
      error
    );
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
