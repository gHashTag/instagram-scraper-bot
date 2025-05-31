/**
 * Скрипт для экспорта аудио из нескольких Reels
 * 
 * Использование:
 * bun run src/scripts/export-audio-batch.ts [projectId] [limit] [outputDir]
 */

import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { initializeDBConnection } from "../db/neonDB";
import { reelsTable } from "../db/schema";
import { eq, desc, and, isNotNull } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const projectId = args[0] ? parseInt(args[0]) : undefined;
const limit = args[1] ? parseInt(args[1]) : 10;
const outputDir = args[2] || path.join(process.cwd(), "exports", "audio");

// Создаем директорию для экспорта, если она не существует
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Временные директории
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(tempDir, "videos");

// Создаем директории, если они не существуют
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

/**
 * Скачивает видео с Instagram по URL Reel
 */
async function downloadReelVideo(reelUrl: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Используем yt-dlp для скачивания видео с Instagram
    const ytdlp = child_process.spawn('yt-dlp', [
      '--no-warnings',
      '-o', outputPath,
      reelUrl
    ]);
    
    ytdlp.stderr.on('data', (data) => {
      logger.debug(`yt-dlp error: ${data}`);
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        // Проверяем, что файл существует и имеет размер
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          resolve(true);
        } else {
          reject(new Error('Файл не был скачан или имеет слишком маленький размер'));
        }
      } else {
        reject(new Error(`yt-dlp завершился с кодом ${code}`));
      }
    });
    
    ytdlp.on('error', (err) => {
      // Если yt-dlp не установлен, пробуем использовать curl
      if (err.message.includes('ENOENT')) {
        logger.warn('yt-dlp не установлен, пробуем использовать curl...');
        downloadVideoWithCurl(reelUrl, outputPath)
          .then(resolve)
          .catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Скачивает видео по URL с использованием curl
 */
async function downloadVideoWithCurl(url: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Используем curl с заголовками, имитирующими браузер
    const headers = [
      '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      '-H', 'Accept-Language: en-US,en;q=0.5',
      '-H', 'Connection: keep-alive',
      '-H', 'Upgrade-Insecure-Requests: 1',
      '-H', 'Pragma: no-cache',
      '-H', 'Cache-Control: no-cache'
    ];
    
    // Используем curl для скачивания видео
    const curl = child_process.spawn('curl', [
      ...headers,
      '-L', // Следовать редиректам
      '-o', outputPath, // Выходной файл
      url // URL видео
    ]);
    
    curl.stderr.on('data', (data) => {
      logger.debug(`curl: ${data}`);
    });
    
    curl.on('close', (code) => {
      if (code === 0) {
        // Проверяем размер файла
        const stats = fs.statSync(outputPath);
        if (stats.size > 1000) { // Если файл больше 1KB, считаем, что скачивание успешно
          resolve(true);
        } else {
          // Если файл слишком маленький, вероятно, это не видео
          fs.unlinkSync(outputPath); // Удаляем файл
          reject(new Error(`Скачанный файл слишком маленький: ${stats.size} байт`));
        }
      } else {
        reject(new Error(`curl завершился с кодом ${code}`));
      }
    });
    
    curl.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Извлекает аудио из видео с помощью ffmpeg
 */
async function extractAudio(videoPath: string, audioPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const ffmpeg = child_process.spawn("ffmpeg", [
      "-i", videoPath,
      "-vn", // Отключаем видео
      "-acodec", "libmp3lame", // Используем MP3 кодек
      "-ab", "128k", // Битрейт 128 кбит/с
      "-ar", "44100", // Частота дискретизации 44.1 кГц
      "-y", // Перезаписываем файл, если он существует
      audioPath
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
 * Экспортирует аудио из одного Reel
 */
async function exportAudioFromReel(reel: any, outputDir: string): Promise<boolean> {
  const reelId = reel.id;
  const reelUrl = reel.reel_url;
  const authorUsername = reel.author_username || "unknown";
  const publishedDate = reel.published_at ? new Date(reel.published_at).toISOString().split('T')[0] : "unknown";
  
  if (!reelUrl) {
    logger.error(`URL Reel не найден для ID ${reelId}`);
    return false;
  }
  
  logger.info(`\nЭкспорт аудио из Reel с ID: ${reelId}`);
  logger.info(`URL: ${reelUrl}`);
  logger.info(`Автор: ${authorUsername}`);
  logger.info(`Дата публикации: ${publishedDate}`);
  
  // Создаем имена файлов
  const videoPath = path.join(videosDir, `${reelId}.mp4`);
  const audioFilename = `${reelId}_${authorUsername}_${publishedDate}.mp3`;
  const audioPath = path.join(outputDir, audioFilename);
  
  try {
    // Проверяем, существует ли уже аудио файл
    if (fs.existsSync(audioPath)) {
      logger.info(`Аудио файл уже существует: ${audioPath}`);
      return true;
    }
    
    // Скачиваем видео
    logger.info(`Скачивание видео с URL: ${reelUrl}`);
    try {
      await downloadReelVideo(reelUrl, videoPath);
    } catch (downloadError) {
      // Если не удалось скачать по URL Reel, пробуем скачать по video_download_url
      logger.warn(`Не удалось скачать видео с URL Reel: ${downloadError.message}`);
      
      if (reel.video_download_url) {
        logger.info(`Пробуем скачать с video_download_url: ${reel.video_download_url}`);
        await downloadVideoWithCurl(reel.video_download_url, videoPath);
      } else {
        throw new Error("Отсутствует URL для скачивания видео");
      }
    }
    
    // Извлекаем аудио из видео
    logger.info(`Извлечение аудио из видео в файл: ${audioFilename}`);
    await extractAudio(videoPath, audioPath);
    
    // Удаляем временный видео файл
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    
    logger.info(`Аудио успешно экспортировано в файл: ${audioPath}`);
    return true;
  } catch (error) {
    logger.error(`Ошибка при экспорте аудио из Reel ${reelId}:`, error);
    
    // Удаляем временные файлы в случае ошибки
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }
    
    return false;
  }
}

/**
 * Основная функция
 */
async function main() {
  logger.info(`Экспорт аудио из Reels${projectId ? ` для проекта ${projectId}` : ''}`);
  logger.info(`Лимит: ${limit} Reels`);
  logger.info(`Директория для сохранения: ${outputDir}`);
  
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Создаем запрос для получения Reels
    let query = db.select().from(reelsTable).orderBy(desc(reelsTable.views_count)).limit(limit);
    
    // Если указан projectId, добавляем условие фильтрации
    if (projectId) {
      query = query.where(and(
        eq(reelsTable.project_id, projectId),
        isNotNull(reelsTable.reel_url)
      ));
    } else {
      query = query.where(isNotNull(reelsTable.reel_url));
    }
    
    // Получаем Reels из базы данных
    const reels = await query;
    
    if (reels.length === 0) {
      logger.error(`Reels не найдены в базе данных${projectId ? ` для проекта ${projectId}` : ''}`);
      process.exit(1);
    }
    
    logger.info(`Найдено ${reels.length} Reels для экспорта`);
    
    // Создаем CSV файл с информацией о всех Reels
    const csvPath = path.join(outputDir, `audio_info_batch_${new Date().toISOString().replace(/:/g, '-')}.csv`);
    const csvHeader = "id,filename,reel_url,author_username,published_at,views_count,likes_count,comments_count,description\n";
    fs.writeFileSync(csvPath, csvHeader);
    
    // Экспортируем аудио из каждого Reel
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      logger.info(`\nОбработка Reel ${i + 1}/${reels.length} (ID: ${reel.id})`);
      
      const success = await exportAudioFromReel(reel, outputDir);
      
      if (success) {
        successCount++;
        
        // Добавляем информацию о Reel в CSV файл
        const audioFilename = `${reel.id}_${reel.author_username || 'unknown'}_${reel.published_at ? new Date(reel.published_at).toISOString().split('T')[0] : 'unknown'}.mp3`;
        const csvLine = `${reel.id},"${audioFilename}","${reel.reel_url}","${reel.author_username || ''}","${reel.published_at || ''}",${reel.views_count || 0},${reel.likes_count || 0},${reel.comments_count || 0},"${(reel.description || '').replace(/"/g, '""')}"\n`;
        fs.appendFileSync(csvPath, csvLine);
      } else {
        failCount++;
      }
    }
    
    logger.info(`\nЭкспорт аудио завершен`);
    logger.info(`Успешно экспортировано: ${successCount} Reels`);
    logger.info(`Не удалось экспортировать: ${failCount} Reels`);
    logger.info(`Информация о Reels сохранена в файле: ${csvPath}`);
    
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при экспорте аудио:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
