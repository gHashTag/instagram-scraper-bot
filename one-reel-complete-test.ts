/**
 * 🧪 ПОЛНЫЙ ТЕСТ: Очистка + Скрапинг 1 реила + Транскрибация
 *
 * Выполняет:
 * 1. ✅ Очищает таблицу reels от старых данных
 * 2. ✅ Запускает скрапинг 1 реила через Apify
 * 3. ✅ Добавляет реил в базу данных
 * 4. ✅ Выполняет транскрибацию нового реила
 */

import { neon } from "@neondatabase/serverless";
import { ApifyClient } from "apify-client";
import OpenAI from "openai";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execAsync = promisify(exec);

// Проверка переменных окружения
const DATABASE_URL = process.env.DATABASE_URL;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PROJECT_ID = parseInt(process.env.DEFAULT_PROJECT_ID || "1");

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL не найден");
  process.exit(1);
}

if (!APIFY_TOKEN) {
  console.error("❌ APIFY_TOKEN не найден");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY не найден");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const apifyClient = new ApifyClient({ token: APIFY_TOKEN });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Создаем временные папки
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(tempDir, "videos");
const audioDir = path.join(tempDir, "audio");

[tempDir, videosDir, audioDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function main() {
  console.log("🧪 ПОЛНЫЙ ТЕСТ: Очистка + Скрапинг + Транскрибация");
  console.log("==============================================\n");

  try {
    // ЭТАП 1: Очистка старых данных
    console.log("📊 ЭТАП 1: Очистка старых reels");
    console.log("──────────────────────────────────");

    const beforeCount = await sql`SELECT COUNT(*) FROM reels`;
    console.log(`📊 Reels в базе до очистки: ${beforeCount[0].count}`);

    if (parseInt(beforeCount[0].count) > 0) {
      console.log("🗑️ Удаляем старые reels...");
      await sql`DELETE FROM reels WHERE project_id = ${PROJECT_ID}`;

      const afterCount = await sql`SELECT COUNT(*) FROM reels`;
      console.log(
        `✅ Удалено: ${parseInt(beforeCount[0].count) - parseInt(afterCount[0].count)} reels`
      );
      console.log(`📊 Reels в базе после очистки: ${afterCount[0].count}`);
    } else {
      console.log("✅ База уже пустая");
    }

    console.log("");

    // ЭТАП 2: Получение одного конкурента для скрапинга
    console.log("👥 ЭТАП 2: Получение конкурента для скрапинга");
    console.log("──────────────────────────────────────────");

    const competitors = await sql`
      SELECT id, username, profile_url 
      FROM competitors 
      WHERE project_id = ${PROJECT_ID} AND is_active = true 
      LIMIT 1
    `;

    if (competitors.length === 0) {
      console.error("❌ Нет активных конкурентов в базе");
      process.exit(1);
    }

    const competitor = competitors[0];
    console.log(`👤 Выбран конкурент: @${competitor.username}`);
    console.log(`🔗 Профиль: ${competitor.profile_url}`);
    console.log("");

    // ЭТАП 3: Скрапинг 1 реила
    console.log("🕷️ ЭТАП 3: Скрапинг 1 реила");
    console.log("─────────────────────────────");

    console.log(`🚀 Запускаем скрапинг для @${competitor.username}...`);

    const input = {
      username: [competitor.username],
      resultsLimit: 1, // Только 1 реил
    };

    console.log("📡 Отправляем запрос в Apify...");
    const run = await apifyClient.actor("xMc5Ga1oCONPmWJIa").call(input);
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    if (items.length === 0) {
      console.error(`❌ Не получено данных для @${competitor.username}`);
      process.exit(1);
    }

    const reel = items[0];
    console.log("✅ Получен реил:");
    console.log(`   👤 Автор: @${reel.ownerUsername}`);
    console.log(
      `   👀 Просмотры: ${reel.videoPlayCount?.toLocaleString() || "N/A"}`
    );
    console.log(`   ❤️ Лайки: ${reel.likesCount?.toLocaleString() || "N/A"}`);
    console.log(`   🔗 URL: ${reel.url}`);
    console.log(`   📱 Короткий код: ${reel.shortCode}`);
    console.log("");

    // ЭТАП 4: Сохранение в базу данных
    console.log("💾 ЭТАП 4: Сохранение в базу данных");
    console.log("───────────────────────────────────");

    const insertResult = await sql`
      INSERT INTO reels (
        reel_url,
        project_id,
        source_type,
        source_identifier,
        profile_url,
        author_username,
        description,
        views_count,
        likes_count,
        comments_count,
        published_at,
        thumbnail_url,
        video_download_url,
        raw_data
      ) VALUES (
        ${reel.url},
        ${PROJECT_ID},
        'competitor',
        ${competitor.username},
        ${competitor.profile_url},
        ${reel.ownerUsername},
        ${reel.caption || ""},
        ${reel.videoPlayCount || 0},
        ${reel.likesCount || 0},
        ${reel.commentsCount || 0},
        ${reel.timestamp ? new Date(reel.timestamp) : new Date()},
        ${reel.displayUrl || ""},
        ${reel.videoUrl || ""},
        ${JSON.stringify(reel)}
      ) RETURNING id
    `;

    const reelId = insertResult[0].id;
    console.log(`✅ Реил сохранен в БД с ID: ${reelId}`);
    console.log("");

    // ЭТАП 5: Транскрибация (если есть видео)
    if (reel.videoUrl) {
      console.log("🎤 ЭТАП 5: Транскрибация реила");
      console.log("─────────────────────────────");

      try {
        // Скачиваем видео
        const videoPath = path.join(videosDir, `reel_${reelId}.mp4`);
        console.log("📥 Скачиваем видео...");

        await execAsync(`curl -L -o "${videoPath}" "${reel.videoUrl}"`);

        if (!fs.existsSync(videoPath)) {
          throw new Error("Видео не скачалось");
        }

        console.log("✅ Видео скачано");

        // Извлекаем аудио
        const audioPath = path.join(audioDir, `reel_${reelId}.mp3`);
        console.log("🎵 Извлекаем аудио...");

        await execAsync(
          `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`
        );

        if (!fs.existsSync(audioPath)) {
          throw new Error("Аудио не извлеклось");
        }

        console.log("✅ Аудио извлечено");

        // Транскрибируем
        console.log("🎙️ Отправляем на транскрибацию...");

        const audioBuffer = fs.readFileSync(audioPath);
        const audioFile = new File([audioBuffer], `audio_${reelId}.mp3`, {
          type: "audio/mpeg",
        });

        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "ru",
        });

        console.log("✅ Транскрибация получена!");
        console.log("📝 Результат:");
        console.log("───────────");
        console.log(transcription.text);
        console.log("───────────");
        console.log("");

        // Сохраняем транскрипцию в БД
        await sql`
          UPDATE reels 
          SET transcript = ${transcription.text}
          WHERE id = ${reelId}
        `;

        console.log("💾 Транскрипция сохранена в БД");

        // Очищаем временные файлы
        fs.unlinkSync(videoPath);
        fs.unlinkSync(audioPath);
        console.log("🧹 Временные файлы удалены");
      } catch (transcriptionError) {
        console.error("❌ Ошибка транскрибации:", transcriptionError);
        console.log("⚠️ Реил сохранен, но без транскрипции");
      }
    } else {
      console.log("⚠️ У реила нет видео URL - пропускаем транскрибацию");
    }

    // ИТОГОВАЯ СТАТИСТИКА
    console.log("");
    console.log("🎉 ТЕСТ ЗАВЕРШЕН УСПЕШНО!");
    console.log("═══════════════════════════");

    const finalCount =
      await sql`SELECT COUNT(*) FROM reels WHERE project_id = ${PROJECT_ID}`;
    console.log(`📊 Reels в базе: ${finalCount[0].count}`);

    const transcribedCount = await sql`
      SELECT COUNT(*) FROM reels 
      WHERE project_id = ${PROJECT_ID} AND transcript IS NOT NULL AND transcript != ''
    `;
    console.log(`🎤 С транскрипцией: ${transcribedCount[0].count}`);

    const latestReel = await sql`
      SELECT author_username, views_count, transcript
      FROM reels 
      WHERE project_id = ${PROJECT_ID}
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (latestReel.length > 0) {
      const latest = latestReel[0];
      console.log(
        `🎬 Последний реил: @${latest.author_username} (${latest.views_count?.toLocaleString() || "N/A"} просм.)`
      );
      console.log(`📝 Транскрипция: ${latest.transcript ? "ЕСТЬ" : "НЕТ"}`);
    }

    console.log("");
    console.log("✅ ВСЕ ЗАДАЧИ ВЫПОЛНЕНЫ:");
    console.log("   ✅ Старые данные удалены");
    console.log("   ✅ 1 новый реил спарсен и добавлен");
    console.log("   ✅ Транскрибация выполнена (если возможно)");
  } catch (error) {
    console.error("❌ КРИТИЧЕСКАЯ ОШИБКА:", error);
    process.exit(1);
  }
}

main().catch(console.error);
