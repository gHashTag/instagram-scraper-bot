/**
 * Скрипт для транскрибации рилсов по хэштегам
 *
 * Использование:
 * bun run src/scripts/transcribe-hashtag-reels-batch.ts <projectId> [minViews] [limit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - limit: (опционально) Максимальное количество рилсов для обработки (по умолчанию 5)
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

// Промисифицируем exec
const execAsync = promisify(exec);

// Инициализируем клиент OpenAI с API ключом
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Ошибка: OPENAI_API_KEY не найден в переменных окружения");
  process.exit(1);
}const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/transcribe-hashtag-reels-batch.ts <projectId> [minViews] [limit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const limit = args[2] ? parseInt(args[2], 10) : 5;

if (isNaN(projectId) || isNaN(minViews) || isNaN(limit)) {
  console.error("Ошибка: projectId, minViews и limit должны быть числами");
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

    // Скачиваем видео с помощью yt-dlp с использованием cookies из Chrome
    const command = `yt-dlp "${url}" -o "${outputPath}" --no-warnings --cookies-from-browser chrome`;
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
      console.log(
        "GPT не вернул улучшенную транскрипцию, возвращаем оригинальную"
      );
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
  console.log(
    `Транскрибация рилсов по хэштегам для проекта ${projectId} с минимум ${minViews} просмотров`
  );
  console.log(`Максимальное количество рилсов для обработки: ${limit}`);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем список рилсов по хэштегам без транскрипций
    const reelsResult = await adapter.executeQuery(
      `SELECT r.*, h.tag_name as hashtag_name
       FROM reels r, hashtags h
       WHERE r.project_id = $1
       AND h.project_id = $1
       AND r.source_type = 'hashtag'
       AND r.views_count >= $2
       AND h.id::text = r.source_identifier
       AND r.transcript IS NULL
       ORDER BY r.views_count DESC
       LIMIT $3`,
      [projectId, minViews, limit]
    );

    if (!reelsResult || !reelsResult.rows) {
      console.log("Запрос не вернул результатов или произошла ошибка");
      return;
    }

    console.log(
      `Найдено ${reelsResult.rows.length} рилсов по хэштегам без транскрипций`
    );

    if (reelsResult.rows.length === 0) {
      console.log("Нет рилсов по хэштегам для транскрибации");
      return;
    }

    // Обрабатываем каждый рил
    for (let i = 0; i < reelsResult.rows.length; i++) {
      const reel = reelsResult.rows[i];
      console.log(
        `\n======= Обработка рила ${i + 1}/${reelsResult.rows.length} =======`
      );
      console.log(
        `ID: ${reel.id}, Хэштег: #${reel.hashtag_name}, URL: ${reel.reel_url}`
      );
      console.log(
        `Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
      );

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

        console.log(`Успешно обработан рил ID: ${reel.id}`);

        // Пауза между обработкой рилсов
        if (i < reelsResult.rows.length - 1) {
          console.log("Пауза перед обработкой следующего рила...");
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Ошибка при обработке рила ID: ${reel.id}: ${error}`);
      }
    }

    console.log("\nТранскрибация завершена");
  } catch (error) {
    console.error("Ошибка при транскрибации рилсов по хэштегам:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
