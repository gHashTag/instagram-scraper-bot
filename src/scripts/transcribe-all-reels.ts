/**
 * Скрипт для транскрибации всех Reels с минимальным количеством просмотров
 *
 * Использование:
 * bun run src/scripts/transcribe-all-reels.ts <project_id> <min_views> <days_ago> <max_reels>
 *
 * Пример:
 * bun run src/scripts/transcribe-all-reels.ts 1 50000 30 35
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

// Промисифицируем exec
const execAsync = promisify(exec);

// Проверяем аргументы командной строки
const projectId = parseInt(process.argv[2] || "1", 10);
const minViews = parseInt(process.argv[3] || "50000", 10);
const daysAgo = parseInt(process.argv[4] || "30", 10);
const maxReels = parseInt(process.argv[5] || "35", 10);

// Инициализируем клиент OpenAI с API ключом
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Ошибка: OPENAI_API_KEY не найден в переменных окружения");
  process.exit(1);
}const openai = new OpenAI({
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

// Функция для удаления временных файлов
async function cleanupFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Удален временный файл: ${filePath}`);
      }
    } catch (error) {
      console.error(`Ошибка при удалении файла ${filePath}: ${error}`);
    }
  }
}

// Функция для обработки одного Reel
async function processReel(reel: any, adapter: NeonAdapter): Promise<void> {
  try {
    console.log(`\n======= Обработка Reel ID: ${reel.id} =======`);
    console.log(`URL: ${reel.reel_url}`);
    console.log(`Просмотры: ${reel.views_count}`);
    console.log(`Автор: ${reel.author_username}`);

    // Проверяем, есть ли уже реальная транскрипция
    if (
      reel.transcript &&
      !reel.transcript.includes("Субтитры делал") &&
      !reel.transcript.includes("Спасибо за субтитры")
    ) {
      console.log(
        `Reel уже имеет реальную транскрипцию (${reel.transcript.length} символов)`
      );
      return;
    }

    // Скачиваем видео
    const videoPath = await downloadVideo(reel.reel_url);

    // Извлекаем аудио
    const audioPath = await extractAudio(videoPath);

    // Транскрибируем аудио
    const transcription = await transcribeAudio(audioPath);

    // Обновляем транскрипцию в базе данных
    await adapter.executeQuery(
      `UPDATE reels SET transcript = $1, updated_at = NOW() WHERE id = $2`,
      [transcription, reel.id]
    );

    console.log(`Транскрипция успешно обновлена для Reel ID: ${reel.id}`);

    // Очищаем временные файлы
    await cleanupFiles([audioPath]);

    // Сохраняем видео для отчета
    console.log(`Видео сохранено: ${videoPath}`);
  } catch (error) {
    console.error(`Ошибка при обработке Reel ID ${reel.id}: ${error}`);
  }
}

// Основная функция
async function main() {
  console.log(
    `Транскрибация Reels для проекта ${projectId} с минимальным количеством просмотров ${minViews} за последние ${daysAgo} дней`
  );

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем дату, от которой считать (N дней назад)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysAgo);

    // Получаем Reels конкурентов с минимальным количеством просмотров
    const query = `
      SELECT * FROM reels 
      WHERE project_id = $1 
      AND source_type = $2 
      AND views_count >= $3 
      AND published_at >= $4
      ORDER BY views_count DESC
      LIMIT $5
    `;
    const params = [
      projectId,
      "competitor",
      minViews,
      fromDate.toISOString(),
      maxReels,
    ];
    const result = await adapter.executeQuery(query, params);
    const reels = result.rows;

    console.log(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysAgo} дней`
    );

    // Создаем лог-файл
    const timestamp = new Date().toISOString().replace(/:/g, "-").split(".")[0];
    const logFilePath = path.join(
      process.cwd(),
      "exports",
      `transcription_log_${timestamp}.txt`
    );
    fs.writeFileSync(
      logFilePath,
      `Транскрибация Reels для проекта ${projectId} с минимальным количеством просмотров ${minViews} за последние ${daysAgo} дней\n\n`
    );

    // Обрабатываем каждый Reel
    for (let i = 0; i < reels.length; i++) {
      const reel = reels[i];
      console.log(`\nОбработка Reel ${i + 1}/${reels.length}`);

      try {
        await processReel(reel, adapter);

        // Добавляем информацию в лог-файл
        fs.appendFileSync(
          logFilePath,
          `✅ Reel ID: ${reel.id}, URL: ${reel.reel_url}\n`
        );
      } catch (error) {
        console.error(`Ошибка при обработке Reel ID ${reel.id}: ${error}`);

        // Добавляем информацию об ошибке в лог-файл
        fs.appendFileSync(
          logFilePath,
          `❌ Reel ID: ${reel.id}, URL: ${reel.reel_url}, Ошибка: ${error}\n`
        );
      }

      // Пауза между обработкой Reels, чтобы не перегружать API
      if (i < reels.length - 1) {
        console.log("Пауза перед обработкой следующего Reel...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`\nТранскрибация завершена. Обработано ${reels.length} Reels.`);
    console.log(`Лог-файл сохранен: ${logFilePath}`);
  } catch (error) {
    console.error("Ошибка при транскрибации Reels:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
