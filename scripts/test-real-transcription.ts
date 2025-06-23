import { initializeDBConnection } from "../src/db/neonDB";
import { transcribeAudio } from "../src/utils/transcription-utils";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function testRealTranscription() {
  console.log("🎬 ТЕСТ РЕАЛЬНОЙ ТРАНСКРИБАЦИИ");
  console.log("==============================");

  try {
    // Подключаемся к базе данных
    console.log("🔌 Подключаемся к базе данных...");
    const db = await initializeDBConnection();

    // Ищем реил с видео URL
    console.log("🔍 Ищем реил с видео...");
    const reels = await db.execute(`
      SELECT id, caption, video_download_url, views_count, likes_count 
      FROM reels 
      WHERE video_download_url IS NOT NULL 
      AND video_download_url != ''
      ORDER BY views_count DESC 
      LIMIT 3
    `);

    if (reels.rows.length === 0) {
      console.log("❌ Не найдено reels с видео URL");
      return;
    }

    console.log(`✅ Найдено ${reels.rows.length} reels с видео`);

    for (const row of reels.rows) {
      const reel = {
        id: row[0] as number,
        caption: row[1] as string,
        videoUrl: row[2] as string,
        views: row[3] as number,
        likes: row[4] as number,
      };

      console.log(`\n🎥 ОБРАБАТЫВАЕМ REEL #${reel.id}`);
      console.log(`📊 Просмотры: ${reel.views?.toLocaleString() || "N/A"}`);
      console.log(`❤️ Лайки: ${reel.likes?.toLocaleString() || "N/A"}`);
      console.log(
        `📝 Описание: ${reel.caption?.substring(0, 100) || "Нет описания"}...`
      );
      console.log(`🔗 Видео URL: ${reel.videoUrl.substring(0, 50)}...`);

      try {
        // Создаем папки если их нет
        const videosDir = path.join(process.cwd(), "temp", "videos");
        const audioDir = path.join(process.cwd(), "temp", "audio");

        await execAsync(`mkdir -p "${videosDir}"`);
        await execAsync(`mkdir -p "${audioDir}"`);

        // Скачиваем видео
        const videoPath = path.join(videosDir, `reel_${reel.id}.mp4`);
        console.log("📥 Скачиваем видео...");

        await execAsync(`curl -L -o "${videoPath}" "${reel.videoUrl}"`);

        if (!fs.existsSync(videoPath)) {
          console.log("❌ Видео не скачалось");
          continue;
        }

        const stats = fs.statSync(videoPath);
        console.log(`✅ Видео скачано (${Math.round(stats.size / 1024)} KB)`);

        // Извлекаем аудио
        const audioPath = path.join(audioDir, `reel_${reel.id}.mp3`);
        console.log("🎵 Извлекаем аудио...");

        await execAsync(
          `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`
        );

        if (!fs.existsSync(audioPath)) {
          console.log("❌ Аудио не извлеклось");
          continue;
        }

        const audioStats = fs.statSync(audioPath);
        console.log(
          `✅ Аудио извлечено (${Math.round(audioStats.size / 1024)} KB)`
        );

        // Транскрибируем
        console.log("🎙️ Отправляем на транскрибацию OpenAI Whisper...");

        const transcription = await transcribeAudio(audioPath);

        console.log("✅ ТРАНСКРИБАЦИЯ ПОЛУЧЕНА!");
        console.log("📝 РЕЗУЛЬТАТ:");
        console.log("─".repeat(50));
        console.log(transcription);
        console.log("─".repeat(50));
        console.log(`📊 Длина: ${transcription.length} символов`);

        // Очищаем временные файлы
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);
        console.log("🧹 Временные файлы удалены");

        // Прерываем после первого успешного теста
        console.log("\n🎉 ТЕСТ УСПЕШНО ЗАВЕРШЕН!");
        return;
      } catch (error) {
        console.log(`❌ Ошибка обработки reel #${reel.id}:`, error.message);
        continue;
      }
    }

    console.log("\n❌ Не удалось обработать ни один reel");
  } catch (error) {
    console.log("❌ Критическая ошибка:", error);
  }
}

// Запускаем тест
testRealTranscription().catch(console.error);
