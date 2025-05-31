/**
 * Скрипт для проверки качества транскрибации аудио
 *
 * Использование:
 * bun run src/scripts/test-transcription-quality.ts
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";
import dotenv from "dotenv";

// Промисифицируем exec
const execAsync = promisify(exec);

// Загружаем переменные окружения
dotenv.config();

// Получаем API ключ OpenAI из переменных окружения
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Ошибка: Не указан API ключ OpenAI (OPENAI_API_KEY) в переменных окружения");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Создаем директории для временных файлов
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(tempDir, "videos");
const audioDir = path.join(tempDir, "audio");

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Функция для скачивания видео с помощью yt-dlp
async function downloadVideo(url: string): Promise<string> {
  try {
    console.log(`Скачивание видео: ${url}`);

    // Генерируем уникальное имя файла
    const timestamp = Date.now();
    const outputPath = path.join(videosDir, `reel_video_${timestamp}.mp4`);

    // Проверяем, существует ли файл
    if (fs.existsSync(outputPath)) {
      console.log(`Видео уже существует: ${outputPath}`);
      return outputPath;
    }

    // Скачиваем видео с помощью yt-dlp
    const command = `yt-dlp "${url}" -o "${outputPath}" --no-warnings`;
    console.log(`Выполнение команды: ${command}`);

    await execAsync(command);

    // Проверяем, что файл был скачан
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Файл не был скачан: ${outputPath}`);
    }

    console.log(`Видео успешно скачано: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Ошибка при скачивании видео: ${error}`);
    throw new Error(
      `Ошибка при скачивании видео: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Функция для извлечения аудио из видео
async function extractAudio(videoPath: string): Promise<string> {
  try {
    console.log(`Извлечение аудио из видео: ${videoPath}`);

    // Генерируем имя файла для аудио на основе имени видео
    const videoFileName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(audioDir, `${videoFileName}.mp3`);

    // Проверяем, существует ли файл
    if (fs.existsSync(audioPath)) {
      console.log(`Аудио уже существует: ${audioPath}`);
      return audioPath;
    }

    // Извлекаем аудио с помощью ffmpeg
    const command = `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${audioPath}" -y`;
    console.log(`Выполнение команды: ${command}`);

    await execAsync(command);

    // Проверяем, что файл был создан
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Файл аудио не был создан: ${audioPath}`);
    }

    console.log(`Аудио успешно извлечено: ${audioPath}`);
    return audioPath;
  } catch (error) {
    console.error(`Ошибка при извлечении аудио: ${error}`);
    throw new Error(
      `Ошибка при извлечении аудио: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Функция для транскрибации аудио
async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    console.log(`Транскрибация аудио: ${audioPath}`);

    // Проверяем, что файл существует
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Аудиофайл не найден: ${audioPath}`);
    }

    // Получаем размер файла
    const stats = fs.statSync(audioPath);
    console.log(`Размер аудиофайла: ${stats.size} байт`);

    // Проверяем, что файл не пустой
    if (stats.size === 0) {
      throw new Error(`Аудиофайл пустой: ${audioPath}`);
    }

    // Отправляем запрос в Whisper API с таймаутом и повторными попытками
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`Попытка транскрибации ${attempts + 1}/${maxAttempts}`);

        // Создаем новый поток для каждой попытки
        const fileStream = fs.createReadStream(audioPath);

        const transcription = await openai.audio.transcriptions.create({
          file: fileStream,
          model: "whisper-1",
          language: "ru", // Указываем язык для лучшего распознавания
        });

        console.log(
          `Транскрипция успешно получена (${transcription.text.length} символов)`
        );
        return transcription.text;
      } catch (attemptError) {
        attempts++;
        console.error(
          `Ошибка при попытке ${attempts}/${maxAttempts}: ${attemptError}`
        );

        if (attempts >= maxAttempts) {
          throw attemptError;
        }

        // Пауза перед следующей попыткой
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error("Превышено максимальное количество попыток");
  } catch (error) {
    console.error(`Ошибка при транскрибации аудио: ${error}`);
    throw new Error(
      `Ошибка при транскрибации аудио: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Функция для проверки, является ли транскрипция реальной
function isRealTranscription(transcript: string | null): boolean {
  if (!transcript) return false;

  // Проверяем, что транскрипция не содержит заглушек
  return (
    !transcript.includes("Субтитры делал") &&
    !transcript.includes("Спасибо за субтитры") &&
    !transcript.includes("С вами был") &&
    transcript.length > 10
  );
}

// Функция для обновления транскрипции в базе данных
async function updateTranscription(
  reelId: number,
  transcript: string,
  adapter: NeonAdapter
): Promise<void> {
  try {
    console.log(`Обновление транскрипции для Reel ID: ${reelId}`);

    // Обновляем транскрипцию в базе данных
    await adapter.executeQuery(
      `UPDATE reels SET transcript = $1, updated_at = NOW() WHERE id = $2`,
      [transcript, reelId]
    );

    console.log(`Транскрипция успешно обновлена для Reel ID: ${reelId}`);
  } catch (error) {
    console.error(
      `Ошибка при обновлении транскрипции для Reel ID ${reelId}: ${error}`
    );
    throw new Error(
      `Ошибка при обновлении транскрипции: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Функция для проверки качества транскрипции
async function checkTranscriptionQuality(
  reelId: number,
  adapter: NeonAdapter
): Promise<void> {
  try {
    console.log(`Проверка качества транскрипции для Reel ID: ${reelId}`);

    // Получаем информацию о Reel
    const result = await adapter.executeQuery(
      `SELECT * FROM reels WHERE id = $1`,
      [reelId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Reel с ID ${reelId} не найден`);
    }

    const reel = result.rows[0] as any;

    // Проверяем, есть ли уже реальная транскрипция
    if (isRealTranscription(reel.transcript)) {
      console.log(
        `Reel уже имеет реальную транскрипцию (${reel.transcript.length} символов)`
      );
      console.log(`Транскрипция: ${reel.transcript}`);
      return;
    }

    console.log(`Reel имеет заглушку вместо транскрипции: ${reel.transcript}`);

    // Скачиваем видео
    const videoPath = await downloadVideo(reel.reel_url);

    // Извлекаем аудио
    const audioPath = await extractAudio(videoPath);

    // Транскрибируем аудио
    const transcription = await transcribeAudio(audioPath);

    console.log(
      `Получена новая транскрипция (${transcription.length} символов):`
    );
    console.log(transcription);

    // Обновляем транскрипцию в базе данных
    await updateTranscription(reelId, transcription, adapter);

    // Удаляем временные файлы
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log(`Удален временный файл аудио: ${audioPath}`);
    }
  } catch (error) {
    console.error(
      `Ошибка при проверке качества транскрипции для Reel ID ${reelId}: ${error}`
    );
  }
}

// Основная функция
async function main() {
  console.log("Проверка качества транскрибации аудио");

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем список Reels с транскрипциями
    const result = await adapter.executeQuery(
      `SELECT id, reel_url, transcript FROM reels WHERE project_id = 1 AND source_type = 'competitor' AND views_count >= 50000 AND transcript IS NOT NULL LIMIT 10`
    );

    console.log(`Найдено ${result.rows.length} Reels с транскрипциями`);

    // Проверяем качество транскрипций
    for (const reel of result.rows as any[]) {
      console.log(`\n======= Проверка Reel ID: ${reel.id} =======`);
      console.log(`URL: ${reel.reel_url}`);
      console.log(`Транскрипция: ${reel.transcript}`);

      // Проверяем, является ли транскрипция реальной
      const isReal = isRealTranscription(reel.transcript);
      console.log(`Транскрипция реальная: ${isReal}`);

      if (!isReal) {
        // Если транскрипция не реальная, обновляем ее
        await checkTranscriptionQuality(reel.id, adapter);
      }
    }

    console.log("\nПроверка качества транскрибации завершена");
  } catch (error) {
    console.error("Ошибка при проверке качества транскрибации:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
