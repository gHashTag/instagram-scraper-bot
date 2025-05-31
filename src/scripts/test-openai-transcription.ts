/**
 * Скрипт для проверки работы OpenAI API для транскрибирования аудио
 *
 * Использование:
 * bun run src/scripts/test-openai-transcription.ts <reelId>
 */

import { logger } from "../logger";
import dotenv from "dotenv";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { initializeDBConnection } from "../db/neonDB";
import { reelsTable } from "../db/schema";
import { eq } from "drizzle-orm";

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
    "Использование: bun run src/scripts/test-openai-transcription.ts <reelId>"
  );
  process.exit(1);
}

const reelId = args[0];

// Временные директории
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(tempDir, "videos");
const audioDir = path.join(tempDir, "audio");

// Создаем директории, если они не существуют
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
        downloadVideoWithCurl(reelUrl, outputPath).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Скачивает видео по URL с использованием curl
 */
async function downloadVideoWithCurl(
  url: string,
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Используем curl с заголовками, имитирующими браузер
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
 * Транскрибирует аудио с помощью OpenAI Whisper API
 */
async function transcribeAudio(audioPath: string): Promise<string> {
  logger.info(`Транскрибирование аудио файла: ${audioPath}`);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      language: "ru", // Можно указать язык аудио
      response_format: "text", // Получаем текст
    });

    logger.info("Транскрибирование успешно завершено");
    return transcription;
  } catch (error) {
    logger.error(
      "Ошибка при транскрибировании аудио:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

/**
 * Основная функция
 */
async function main() {
  logger.info(
    `Проверка работы OpenAI API для транскрибирования аудио из Reel с ID: ${reelId}`
  );
  logger.info("OpenAI API ключ настроен и готов к использованию");

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Получаем информацию о Reel из базы данных
    const reels = await db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.id, reelId));

    if (reels.length === 0) {
      logger.error(`Reel с ID ${reelId} не найден в базе данных`);
      process.exit(1);
    }

    const reel = reels[0];
    const reelUrl = reel.reel_url;

    if (!reelUrl) {
      logger.error(`URL Reel не найден для ID ${reelId}`);
      process.exit(1);
    }

    logger.info(`Найден Reel: ${reelUrl}`);

    // Создаем имена файлов
    const videoPath = path.join(videosDir, `${reelId}.mp4`);
    const audioPath = path.join(audioDir, `${reelId}.mp3`);

    // Скачиваем видео
    logger.info(`Скачивание видео с URL: ${reelUrl}`);
    try {
      await downloadReelVideo(reelUrl, videoPath);
    } catch (downloadError) {
      // Если не удалось скачать по URL Reel, пробуем скачать по video_download_url
      logger.warn(
        `Не удалось скачать видео с URL Reel: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`
      );

      if (reel.video_download_url) {
        logger.info(
          `Пробуем скачать с video_download_url: ${reel.video_download_url}`
        );
        await downloadVideoWithCurl(reel.video_download_url, videoPath);
      } else {
        throw new Error("Отсутствует URL для скачивания видео");
      }
    }

    // Извлекаем аудио из видео
    logger.info(`Извлечение аудио из видео в файл: ${audioPath}`);
    await extractAudio(videoPath, audioPath);

    // Транскрибируем аудио
    logger.info("Транскрибирование аудио с помощью OpenAI Whisper API...");
    const transcript = await transcribeAudio(audioPath);

    logger.info("Транскрипция успешно получена:");
    logger.info("-----------------------------------");
    logger.info(transcript);
    logger.info("-----------------------------------");

    // Удаляем временные файлы
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    logger.info("Проверка успешно завершена. OpenAI API работает корректно!");
    process.exit(0);
  } catch (error) {
    logger.error(
      "Ошибка при выполнении проверки:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
