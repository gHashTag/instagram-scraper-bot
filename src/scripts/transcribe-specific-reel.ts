/**
 * Скрипт для транскрибации конкретного Reel
 *
 * Использование:
 * bun run src/scripts/transcribe-specific-reel.ts <reelId>
 *
 * Параметры:
 * - reelId: ID Reel для транскрибации
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

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/transcribe-specific-reel.ts <reelId>"
  );
  process.exit(1);
}

const reelId = parseInt(args[0], 10);

if (isNaN(reelId)) {
  console.error("Ошибка: reelId должен быть числом");
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
            "Это видео о косметологии, эстетической медицине, красоте, уходе за кожей. Транскрибируйте всю речь, даже если она не связана с косметологией. Игнорируйте субтитры, водяные знаки и музыку в видео.", // Улучшенная подсказка
          temperature: 0.0, // Минимальная температура для более точной транскрипции
          response_format: "verbose_json", // Получаем подробный ответ с сегментами
        });

        console.log(
          `Транскрипция успешно получена (${transcription.text.length} символов)`
        );

        // Проверяем, содержит ли транскрипция только "Спасибо за просмотр" или подобные фразы
        const shortPhrases = [
          "Спасибо за просмотр",
          "Благодарю за просмотр",
          "Редактор субтитров",
        ];
        const isShortPhrase =
          shortPhrases.some((phrase) => transcription.text.includes(phrase)) &&
          transcription.text.length < 100;

        if (isShortPhrase) {
          console.log(
            "Обнаружена короткая фраза. Повторная попытка с другими параметрами..."
          );

          // Создаем новый поток для повторной попытки
          const newFileStream = fs.createReadStream(audioPath);

          // Пробуем с другими параметрами
          const retryTranscription = await openai.audio.transcriptions.create({
            file: newFileStream,
            model: "whisper-1",
            language: "ru",
            prompt:
              "Транскрибируйте всю речь в видео. Игнорируйте субтитры, водяные знаки и музыку.", // Более общая подсказка
            temperature: 0.2, // Немного увеличиваем температуру
          });

          console.log(
            `Повторная транскрипция получена (${retryTranscription.text.length} символов)`
          );

          // Если повторная попытка дала более длинный результат, используем его
          if (retryTranscription.text.length > transcription.text.length) {
            return retryTranscription.text;
          }
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

    // Проверяем, содержит ли транскрипция только короткие фразы
    const shortPhrases = [
      "Спасибо за просмотр",
      "Благодарю за просмотр",
      "Редактор субтитров",
    ];
    const isShortPhrase =
      shortPhrases.some((phrase) => transcript.includes(phrase)) &&
      transcript.length < 100;

    if (isShortPhrase) {
      console.log(
        "Обнаружена короткая фраза. Пропускаем улучшение транскрипции."
      );
      return transcript;
    }

    // Если транскрипция слишком короткая, возвращаем ее без изменений
    if (transcript.length < 20) {
      console.log("Транскрипция слишком короткая. Пропускаем улучшение.");
      return transcript;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Ты эксперт по транскрипции видео. Твоя задача - улучшить транскрипцию, исправив ошибки распознавания, добавив пунктуацию и форматирование.

Правила:
1. Сохраняй всю информацию из оригинальной транскрипции
2. Исправляй ошибки распознавания и опечатки
3. Добавляй правильную пунктуацию и форматирование
4. Удаляй упоминания о субтитрах, водяных знаках или призывах подписаться
5. Если транскрипция содержит информацию о косметологии, эстетической медицине, красоте или уходе за кожей, уделяй особое внимание терминологии
6. Если транскрипция не содержит полезной информации (только "Спасибо за просмотр" и т.п.), верни оригинальную транскрипцию без изменений
7. Не добавляй никакой новой информации, которой нет в оригинальной транскрипции`,
        },
        {
          role: "user",
          content: `Улучши эту транскрипцию видео:\n\n${transcript}`,
        },
      ],
      temperature: 0.1, // Низкая температура для более точного результата
      max_tokens: 2000, // Увеличиваем максимальное количество токенов
    });

    const improvedTranscription = response.choices[0].message.content;
    if (!improvedTranscription) {
      return transcript;
    }
    console.log(
      `Улучшенная транскрипция (${improvedTranscription.length} символов)`
    );

    // Проверяем, не стала ли транскрипция короче
    if (improvedTranscription.length < transcript.length * 0.8) {
      console.log(
        "Улучшенная транскрипция стала значительно короче. Возвращаем оригинальную."
      );
      return transcript;
    }

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
  console.log(`Транскрибация Reel с ID: ${reelId}`);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем информацию о Reel
    const result = await adapter.executeQuery(
      `SELECT * FROM reels WHERE id = $1`,
      [reelId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Reel с ID ${reelId} не найден`);
    }

    const reel = result.rows[0];
    console.log(`Найден Reel: ${reel.reel_url}`);
    console.log(
      `Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
    );
    console.log(`Текущая транскрипция: ${reel.transcript || "Отсутствует"}`);

    // Скачиваем видео
    const videoPath = await downloadVideo(reel.reel_url);

    // Извлекаем аудио
    const audioPath = await extractAudio(videoPath);

    // Транскрибируем аудио
    const rawTranscription = await transcribeAudio(audioPath);

    // Улучшаем транскрипцию с помощью GPT-4
    const improvedTranscription = await improveTranscription(rawTranscription);

    // Обновляем транскрипцию в базе данных
    await updateTranscription(reelId, improvedTranscription, adapter);

    // Очищаем временные файлы
    cleanupTempFiles(videoPath, audioPath);

    console.log(`Успешно обработан Reel ID: ${reelId}`);
  } catch (error) {
    console.error(`Ошибка при обработке Reel ID: ${reelId}: ${error}`);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
