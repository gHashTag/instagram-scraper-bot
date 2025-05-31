/**
 * Скрипт для экспорта аудио из видео Reels
 *
 * Использование:
 * bun run src/scripts/export-audio.ts <projectId> [sourceType] [sourceId] [limit] [outputDir]
 *
 * Параметры:
 * - projectId: ID проекта
 * - sourceType: (опционально) Тип источника (competitor или hashtag, по умолчанию все)
 * - sourceId: (опционально) ID источника (по умолчанию все)
 * - limit: (опционально) Максимальное количество Reels для экспорта (по умолчанию 10)
 * - outputDir: (опционально) Директория для сохранения аудио (по умолчанию ./exports/audio)
 */

import { initializeDBConnection } from "../db/neonDB";
import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { v4 as uuidv4 } from "uuid";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/export-audio.ts <projectId> [sourceType] [sourceId] [limit] [outputDir]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const sourceType = args[1] || "all"; // "competitor", "hashtag" или "all"
const sourceId = args[2] ? parseInt(args[2], 10) : 0; // 0 означает все источники
const limit = args[3] ? parseInt(args[3], 10) : 10;
const outputDir = args[4] || path.join(process.cwd(), "exports", "audio");

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
 * Получает Reels из базы данных
 */
async function getReels(
  db,
  projectId: number,
  sourceType: string,
  sourceId: number,
  limit: number
) {
  // Используем Drizzle ORM для запросов
  const { reelsTable } = await import("../db/schema");
  const { eq, desc } = await import("drizzle-orm");

  try {
    let query = db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.project_id, projectId))
      .orderBy(desc(reelsTable.published_at));

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
 * Создает директорию, если она не существует
 */
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Запуск экспорта аудио для проекта ${projectId}`);

  if (sourceType !== "all") {
    logger.info(
      `Фильтр: тип источника = ${sourceType}, ID источника = ${sourceId || "все"}`
    );
  }

  logger.info(`Лимит: ${limit} Reels`);
  logger.info(`Директория для сохранения: ${outputDir}`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Создаем директории для временных файлов и экспорта
    const tempDir = path.join(process.cwd(), "temp");
    const videosDir = path.join(tempDir, "videos");
    ensureDirectoryExists(tempDir);
    ensureDirectoryExists(videosDir);
    ensureDirectoryExists(outputDir);

    // Получаем Reels
    const reels = await getReels(db, projectId, sourceType, sourceId, limit);

    if (reels.length === 0) {
      logger.info(
        `Не найдено Reels для проекта ${projectId} с указанными параметрами`
      );
      process.exit(0);
    }

    logger.info(`Найдено ${reels.length} Reels для экспорта аудио`);

    // Создаем CSV файл с информацией о Reels
    const csvPath = path.join(
      outputDir,
      `audio_info_${projectId}_${sourceType}_${sourceId}_${new Date().toISOString().replace(/:/g, "-")}.csv`
    );
    const csvHeader =
      "id,filename,reel_url,author_username,published_at,views_count,likes_count,comments_count,description\n";
    fs.writeFileSync(csvPath, csvHeader);

    // Обрабатываем каждый Reel
    let successCount = 0;
    for (const reel of reels) {
      const reelId = reel.id;
      const reelUrl = reel.reel_url;
      const authorUsername = reel.author_username || "unknown";
      const publishedDate = reel.published_at
        ? new Date(reel.published_at).toISOString().split("T")[0]
        : "unknown";

      // Создаем имена файлов
      const uniqueId = uuidv4().substring(0, 8);
      const videoPath = path.join(videosDir, `${uniqueId}.mp4`);
      const audioFilename = `${reelId}_${authorUsername}_${publishedDate}.mp3`;
      const audioPath = path.join(outputDir, audioFilename);

      logger.info(
        `Экспорт аудио из Reel: ${reelUrl} (ID: ${reelId}) -> ${audioFilename}`
      );

      try {
        // Сначала пробуем скачать видео по URL Reel
        logger.info(`Скачивание видео с URL: ${reelUrl}`);
        try {
          await downloadReelVideo(reelUrl, videoPath);
        } catch (downloadError) {
          // Если не удалось скачать по URL Reel, пробуем скачать по video_download_url
          logger.warn(
            `Не удалось скачать видео с URL Reel: ${downloadError.message}`
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
        logger.info(`Извлечение аудио из видео в файл: ${audioFilename}`);
        await extractAudio(videoPath, audioPath);

        // Добавляем информацию в CSV файл
        const csvLine = `${reelId},"${audioFilename}","${reelUrl}","${authorUsername}","${reel.published_at || ""}",${reel.views_count || 0},${reel.likes_count || 0},${reel.comments_count || 0},"${(reel.description || "").replace(/"/g, '""')}"\n`;
        fs.appendFileSync(csvPath, csvLine);

        // Удаляем временный видео файл
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }

        successCount++;
        logger.info(
          `Успешно экспортировано аудио из Reel ${reelId} (${successCount}/${reels.length})`
        );
      } catch (error) {
        logger.error(`Ошибка при экспорте аудио из Reel ${reelId}:`, error);
        // Продолжаем с следующим Reel
      }
    }

    logger.info(
      `Экспорт аудио завершен. Успешно экспортировано ${successCount} из ${reels.length} Reels.`
    );
    logger.info(`Информация о Reels сохранена в файле: ${csvPath}`);
  } catch (error) {
    logger.error("Критическая ошибка при выполнении экспорта аудио:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
