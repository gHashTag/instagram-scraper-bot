/**
 * Утилиты для работы с yt-dlp
 */

import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { logger } from "./logger";

const execAsync = promisify(exec);

/**
 * Скачивает видео с помощью yt-dlp
 * @param url URL видео
 * @param outputPath Путь для сохранения видео
 * @returns Путь к скачанному видео
 */
export async function downloadWithYtDlp(url: string, outputPath: string): Promise<string> {
  try {
    // Создаем директорию для сохранения видео, если она не существует
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    logger.info(`Выполнение команды: yt-dlp "${url}" -o "${outputPath}" --no-warnings`);

    // Скачиваем видео с помощью yt-dlp с использованием cookies из Chrome
    await execAsync(`yt-dlp "${url}" -o "${outputPath}" --no-warnings --cookies-from-browser chrome`);

    // Проверяем, что файл был скачан
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Файл не был скачан: ${outputPath}`);
    }

    logger.info(`Видео успешно скачано: ${outputPath}`);
    return outputPath;
  } catch (error) {
    logger.error(`Ошибка при скачивании видео с помощью yt-dlp: ${error}`);
    throw new Error(`Ошибка при скачивании видео с помощью yt-dlp: ${error instanceof Error ? error.message : String(error)}`);
  }
}
