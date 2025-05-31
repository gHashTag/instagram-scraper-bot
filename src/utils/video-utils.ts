/**
 * Утилиты для работы с видео
 */

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { downloadWithYtDlp } from "./yt-dlp";
import { logger } from "./logger";

const execAsync = promisify(exec);

/**
 * Скачивает видео по URL
 * @param url URL видео
 * @returns Путь к скачанному видео
 */
export async function downloadVideo(url: string): Promise<string> {
  try {
    // Создаем директорию для временных файлов, если она не существует
    const tempDir = path.join(process.cwd(), "temp", "videos");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const videoId = url.split("/").pop() || "video";
    const outputPath = path.join(tempDir, `reel_${videoId}_${timestamp}.mp4`);

    // Проверяем, существует ли файл
    if (fs.existsSync(outputPath)) {
      logger.info(`Видео уже существует: ${outputPath}`);
      return outputPath;
    }

    logger.info(`Скачивание видео: ${url}`);
    
    // Скачиваем видео с помощью yt-dlp
    const videoPath = await downloadWithYtDlp(url, outputPath);
    
    return videoPath;
  } catch (error) {
    logger.error(`Ошибка при скачивании видео: ${error}`);
    throw new Error(`Ошибка при скачивании видео: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Извлекает аудио из видео
 * @param videoPath Путь к видео
 * @returns Путь к извлеченному аудио
 */
export async function extractAudio(videoPath: string): Promise<string> {
  try {
    // Создаем директорию для временных файлов, если она не существует
    const tempDir = path.join(process.cwd(), "temp", "audio");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Генерируем имя файла для аудио на основе имени видео
    const videoFileName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(tempDir, `${videoFileName}.mp3`);

    // Проверяем, существует ли файл
    if (fs.existsSync(audioPath)) {
      logger.info(`Аудио уже существует: ${audioPath}`);
      return audioPath;
    }

    logger.info(`Извлечение аудио из видео: ${videoPath}`);
    
    // Извлекаем аудио с помощью ffmpeg
    const command = `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${audioPath}" -y`;
    logger.info(`Выполнение команды: ${command}`);
    
    await execAsync(command);
    
    // Проверяем, что файл был создан
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Файл аудио не был создан: ${audioPath}`);
    }
    
    logger.info(`Аудио успешно извлечено: ${audioPath}`);
    return audioPath;
  } catch (error) {
    logger.error(`Ошибка при извлечении аудио: ${error}`);
    throw new Error(`Ошибка при извлечении аудио: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Удаляет временные файлы
 * @param filePaths Массив путей к файлам
 */
export async function cleanupFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Удален временный файл: ${filePath}`);
      }
    } catch (error) {
      logger.error(`Ошибка при удалении файла ${filePath}: ${error}`);
    }
  }
}
