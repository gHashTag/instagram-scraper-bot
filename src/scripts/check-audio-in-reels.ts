/**
 * Скрипт для проверки аудио в рилсах
 *
 * Использование:
 * bun run src/scripts/check-audio-in-reels.ts <reelId1> [reelId2] [reelId3] ...
 *
 * Параметры:
 * - reelId: ID рила для проверки
 */

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

import { NeonAdapter } from "../adapters/neon-adapter";

// Промисифицируем exec
const execAsync = promisify(exec);

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/check-audio-in-reels.ts <reelId1> [reelId2] [reelId3] ..."
  );
  process.exit(1);
}

const reelIds = args.map((arg) => parseInt(arg, 10)).filter((id) => !isNaN(id));

if (reelIds.length === 0) {
  console.error("Ошибка: Необходимо указать хотя бы один ID рила");
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
async function downloadVideo(url: string, reelId: number): Promise<string> {
  try {
    console.log(`Скачивание видео: ${url}`);

    // Генерируем имя файла на основе ID рила
    const outputPath = path.join(videosDir, `reel_video_${reelId}.mp4`);

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
async function extractAudio(
  videoPath: string,
  reelId: number
): Promise<string> {
  try {
    console.log(`Извлечение аудио из видео: ${videoPath}`);

    // Генерируем имя файла для аудио на основе ID рила
    const audioPath = path.join(audioDir, `reel_audio_${reelId}.mp3`);

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

// Функция для анализа аудио
async function analyzeAudio(
  audioPath: string
): Promise<{ duration: number; hasSpeech: boolean; hasMusic: boolean }> {
  try {
    console.log(`Анализ аудио: ${audioPath}`);

    // Получаем информацию о файле с помощью ffprobe
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    console.log(`Выполнение команды: ${command}`);

    const { stdout: durationOutput } = await execAsync(command);
    const duration = parseFloat(durationOutput.trim());

    console.log(`Длительность аудио: ${duration} секунд`);

    // Проверяем наличие речи с помощью ffmpeg
    const speechCommand = `ffmpeg -i "${audioPath}" -af "silencedetect=n=-30dB:d=0.5" -f null - 2>&1`;
    console.log(`Выполнение команды: ${speechCommand}`);

    const { stdout: speechOutput } = await execAsync(speechCommand);

    // Анализируем вывод ffmpeg
    const silenceDuration =
      speechOutput
        .match(/silence_duration: ([0-9.]+)/g)
        ?.map((match) => parseFloat(match.split(": ")[1])) || [];
    const totalSilence = silenceDuration.reduce(
      (sum, duration) => sum + duration,
      0
    );
    const speechPercentage = ((duration - totalSilence) / duration) * 100;

    console.log(`Процент речи: ${speechPercentage.toFixed(2)}%`);

    // Если процент речи меньше 10%, считаем, что речи нет
    const hasSpeech = speechPercentage > 10;

    // Проверяем наличие музыки (упрощенно)
    // Если есть длительные периоды без тишины, но с низкой вариацией громкости, это может быть музыка
    const hasMusic =
      duration > 3 && speechPercentage > 5 && speechPercentage < 30;

    return { duration, hasSpeech, hasMusic };
  } catch (error) {
    console.error(`Ошибка при анализе аудио: ${error}`);
    return { duration: 0, hasSpeech: false, hasMusic: false };
  }
}

// Основная функция
async function main() {
  console.log(`Проверка аудио в рилсах: ${reelIds.join(", ")}`);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Обрабатываем каждый рил
    for (const reelId of reelIds) {
      console.log(`\n======= Проверка рила ID: ${reelId} =======`);

      // Получаем информацию о риле
      const reelResult = await adapter.executeQuery(
        `SELECT * FROM reels WHERE id = $1`,
        [reelId]
      );

      if (reelResult.rows.length === 0) {
        console.error(`Рил с ID ${reelId} не найден`);
        continue;
      }

      const reel = reelResult.rows[0];
      console.log(`URL: ${reel.reel_url}`);
      console.log(`Автор: ${reel.author_username}`);
      console.log(`Просмотры: ${reel.views_count}`);
      console.log(`Транскрипция: ${reel.transcript ? "Есть" : "Нет"}`);

      try {
        // Скачиваем видео
        const videoPath = await downloadVideo(reel.reel_url, reelId);

        // Извлекаем аудио
        const audioPath = await extractAudio(videoPath, reelId);

        // Анализируем аудио
        const audioAnalysis = await analyzeAudio(audioPath);

        console.log(`\nРезультаты анализа аудио:`);
        console.log(
          `Длительность: ${audioAnalysis.duration.toFixed(2)} секунд`
        );
        console.log(`Наличие речи: ${audioAnalysis.hasSpeech ? "Да" : "Нет"}`);
        console.log(`Наличие музыки: ${audioAnalysis.hasMusic ? "Да" : "Нет"}`);

        // Выводим рекомендации
        console.log(`\nРекомендации:`);
        if (!audioAnalysis.hasSpeech) {
          console.log(`- В риле нет речи, транскрибация не требуется`);

          // Обновляем транскрипцию в базе данных, если ее нет
          if (!reel.transcript) {
            await adapter.executeQuery(
              `UPDATE reels SET transcript = $1, updated_at = NOW() WHERE id = $2`,
              ["[Нет речи в видео]", reelId]
            );
            console.log(`- Транскрипция обновлена: "[Нет речи в видео]"`);
          }
        } else if (audioAnalysis.hasSpeech && !reel.transcript) {
          console.log(`- В риле есть речь, рекомендуется транскрибация`);
        } else if (audioAnalysis.hasSpeech && reel.transcript) {
          console.log(`- В риле есть речь, транскрипция уже существует`);

          // Проверяем качество транскрипции
          const shortPhrases = [
            "Спасибо за просмотр",
            "Благодарю за просмотр",
            "Редактор субтитров",
          ];
          const isShortPhrase =
            shortPhrases.some((phrase) => reel.transcript.includes(phrase)) &&
            reel.transcript.length < 100;

          if (isShortPhrase) {
            console.log(
              `- Транскрипция содержит только короткую фразу, рекомендуется повторная транскрибация`
            );
          }
        }
      } catch (error) {
        console.error(`Ошибка при проверке рила ID ${reelId}: ${error}`);
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке аудио в рилсах:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
