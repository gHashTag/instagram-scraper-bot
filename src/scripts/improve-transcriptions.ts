/**
 * Скрипт для улучшения качества транскрибации видео
 *
 * Использование:
 * bun run src/scripts/improve-transcriptions.ts <projectId> [minViews] [daysBack] [limit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - limit: (опционально) Максимальное количество Reels для обработки (по умолчанию 10)
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
  console.error("Ошибка: OPENAI_API_KEY не найден в переменных окружения");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/improve-transcriptions.ts <projectId> [minViews] [daysBack] [limit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const limit = args[3] ? parseInt(args[3], 10) : 10;

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack) || isNaN(limit)) {
  console.error(
    "Ошибка: projectId, minViews, daysBack и limit должны быть числами"
  );
  process.exit(1);
}

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

// Список фраз, которые указывают на фейковую транскрипцию
const fakeTranscriptionPhrases = [
  "Субтитры делал",
  "Субтитры сделал",
  "Субтитры добавил",
  "Субтитры подготовил",
  "ПОДПИШИСЬ",
  "С вами был",
  "Спасибо за субтитры",
  "Один, два, три",
  "Фристайлер",
];

// Функция для проверки, является ли транскрипция фейковой
function isFakeTranscription(transcript: string | null): boolean {
  if (!transcript) return true;

  // Проверяем, содержит ли транскрипция фейковые фразы
  for (const phrase of fakeTranscriptionPhrases) {
    if (transcript.includes(phrase)) {
      return true;
    }
  }

  // Проверяем длину транскрипции
  if (transcript.length < 10) {
    return true;
  }

  return false;
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

// Функция для транскрибации аудио с использованием OpenAI Whisper API
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
          prompt:
            "Это видео о косметологии, эстетической медицине, красоте, уходе за кожей. Игнорируйте субтитры и водяные знаки в видео.", // Подсказка для улучшения качества транскрибации
        });

        console.log(
          `Транскрипция успешно получена (${transcription.text.length} символов)`
        );

        // Проверяем, не содержит ли транскрипция фейковые фразы
        if (isFakeTranscription(transcription.text)) {
          console.log(
            `Получена фейковая транскрипция: "${transcription.text}"`
          );
          console.log("Попробуем еще раз с другими параметрами");
          attempts++;
          continue;
        }

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

// Функция для улучшения транскрипции с помощью GPT-4
async function improveTranscription(transcript: string): Promise<string> {
  try {
    console.log("Улучшение транскрипции с помощью GPT-4");

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Ты эксперт по косметологии и эстетической медицине. Твоя задача - улучшить транскрипцию видео, исправив ошибки распознавания, добавив пунктуацию и форматирование. Игнорируй любые упоминания о субтитрах, водяных знаках или призывах подписаться. Сосредоточься только на содержании, связанном с косметологией и эстетической медициной.",
        },
        {
          role: "user",
          content: `Улучши эту транскрипцию видео о косметологии:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const improvedTranscription = response.choices[0].message.content;
    if (!improvedTranscription) {
      console.log(
        "GPT не вернул улучшенную транскрипцию, возвращаем оригинальную"
      );
      return transcript;
    }

    console.log(
      `Улучшенная транскрипция (${improvedTranscription.length} символов)`
    );

    return improvedTranscription;
  } catch (error) {
    console.error(`Ошибка при улучшении транскрипции: ${error}`);
    return transcript; // В случае ошибки возвращаем оригинальную транскрипцию
  }
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

// Функция для очистки временных файлов
function cleanupTempFiles(videoPath: string, audioPath: string): void {
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log(`Удален временный файл аудио: ${audioPath}`);
    }

    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
      console.log(`Удален временный файл видео: ${videoPath}`);
    }
  } catch (error) {
    console.warn(`Ошибка при удалении временных файлов: ${error}`);
  }
}

// Основная функция
async function main() {
  console.log(
    `Улучшение транскрипций для проекта ${projectId} с минимум ${minViews} просмотров за последние ${daysBack} дней`
  );
  console.log(`Максимальное количество Reels для обработки: ${limit}`);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем список Reels с фейковыми транскрипциями или без транскрипций
    const result = await adapter.executeQuery(
      `SELECT id, reel_url, transcript, author_username, views_count FROM reels 
       WHERE project_id = $1 
       AND source_type = 'competitor' 
       AND views_count >= $2 
       AND published_at >= $3
       ORDER BY views_count DESC
       LIMIT $4`,
      [projectId, minViews, date30DaysAgo.toISOString(), limit]
    );

    console.log(`Найдено ${result.rows.length} Reels для проверки`);

    // Фильтруем Reels с фейковыми транскрипциями или без транскрипций
    const reelsToProcess = result.rows.filter(
      (reel) => !reel.transcript || isFakeTranscription(reel.transcript)
    );
    console.log(
      `Из них ${reelsToProcess.length} Reels требуют улучшения транскрипций`
    );

    if (reelsToProcess.length === 0) {
      console.log("Нет Reels для улучшения транскрипций");
      return;
    }

    // Обрабатываем каждый Reel
    for (let i = 0; i < reelsToProcess.length; i++) {
      const reel = reelsToProcess[i];
      console.log(
        `\n======= Обработка Reel ${i + 1}/${reelsToProcess.length} =======`
      );
      console.log(`ID: ${reel.id}, URL: ${reel.reel_url}`);
      console.log(
        `Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
      );
      console.log(`Текущая транскрипция: ${reel.transcript || "Отсутствует"}`);

      try {
        // Скачиваем видео
        const videoPath = await downloadVideo(reel.reel_url);

        // Извлекаем аудио
        const audioPath = await extractAudio(videoPath);

        // Транскрибируем аудио
        const rawTranscription = await transcribeAudio(audioPath);

        // Улучшаем транскрипцию с помощью GPT-4
        const improvedTranscription =
          await improveTranscription(rawTranscription);

        // Обновляем транскрипцию в базе данных
        await updateTranscription(reel.id, improvedTranscription, adapter);

        // Очищаем временные файлы
        cleanupTempFiles(videoPath, audioPath);

        console.log(`Успешно обработан Reel ID: ${reel.id}`);

        // Пауза между обработкой Reels
        if (i < reelsToProcess.length - 1) {
          console.log("Пауза перед обработкой следующего Reel...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Ошибка при обработке Reel ID: ${reel.id}: ${error}`);
      }
    }

    console.log("\nУлучшение транскрипций завершено");
  } catch (error) {
    console.error("Ошибка при улучшении транскрипций:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
