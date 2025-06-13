/**
 * 🛡️ ЖЕЛЕЗОБЕТОННАЯ СТРАТЕГИЯ ОБНОВЛЕНИЯ
 *
 * ЕДИНСТВЕННЫЙ скрипт для всех команд:
 * - refresh:viral (50K+ просмотров, 30 reels, 10 транскрибаций)
 * - refresh:full [min_views] [max_reels] [max_transcriptions]
 */

import { ApifyClient } from "apify-client";
import { initializeDBConnection, getDB } from "../db/neonDB";
import { competitorsTable, reelsTable } from "../db/schema";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

// Загружаем .env автоматически
const envPath = path.resolve(process.cwd(), ".env");
console.log(`🔍 Загружаю .env из: ${envPath}`);
dotenv.config({ path: envPath });

const execAsync = promisify(exec);

// Параметры
const isViral = process.argv[2] === "viral";
const minViews = isViral ? 50000 : parseInt(process.argv[2] || "0", 10);
const maxReels = isViral ? 30 : parseInt(process.argv[3] || "50", 10);
const maxTranscriptions = isViral ? 10 : parseInt(process.argv[4] || "0", 10);

console.log("🛡️ ЖЕЛЕЗОБЕТОННАЯ СТРАТЕГИЯ ЗАПУЩЕНА");
console.log(`📊 Минимум просмотров: ${minViews.toLocaleString()}`);
console.log(`🎬 Максимум reels: ${maxReels}`);
console.log(`🎤 Максимум транскрибаций: ${maxTranscriptions}`);

// API токены из .env
const apifyToken = process.env.APIFY_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

if (!apifyToken) {
  console.error("❌ APIFY_TOKEN не найден в .env файле");
  process.exit(1);
}

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

// Создаём Apify клиент
const apifyClient = new ApifyClient({ token: apifyToken });
console.log(`🔑 Apify токен загружен: ${apifyToken.substring(0, 15)}...`);

// Временные директории
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(tempDir, "videos");
const audioDir = path.join(tempDir, "audio");

[tempDir, videosDir, audioDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

initializeDBConnection();
const db = getDB();

interface ReelInfo {
  id: number;
  videoUrl: string;
  author: string;
  views: number;
}

const newReels: ReelInfo[] = [];

async function getCompetitors() {
  const competitors = await db
    .select()
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, 1));

  console.log(`✅ Конкуренты: ${competitors.length}`);
  return competitors;
}

async function clearOldReels() {
  console.log("🗑️ Очистка старых данных...");
  const result = await db
    .delete(reelsTable)
    .where(
      and(
        eq(reelsTable.project_id, 1),
        eq(reelsTable.source_type, "competitor")
      )
    );
  console.log(`✅ Удалено: ${result.rowCount || 0} reels`);
}

async function scrapeCompetitor(competitor: any) {
  console.log(`🎯 Парсинг: @${competitor.username}`);

  try {
    const run = await apifyClient.actor("xMc5Ga1oCONPmWJIa").call({
      username: [competitor.username],
      resultsLimit: maxReels,
    });

    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();
    console.log(`📊 Получено: ${items.length} reels`);

    // Сохраняем в БД
    let saved = 0;
    for (const reel of items) {
      try {
        const insertResult = await db
          .insert(reelsTable)
          .values({
            reel_url: reel.url,
            project_id: 1,
            source_type: "competitor",
            source_identifier: competitor.id.toString(),
            profile_url: `https://instagram.com/${reel.ownerUsername}`,
            author_username: reel.ownerUsername,
            description: reel.caption || "",
            views_count: reel.videoPlayCount || 0,
            likes_count: reel.likesCount || 0,
            comments_count: reel.commentsCount || 0,
            published_at: new Date(reel.timestamp),
            thumbnail_url: reel.displayUrl,
            video_download_url: reel.videoUrl,
            raw_data: JSON.stringify(reel),
          })
          .returning({ id: reelsTable.id });

        if (insertResult.length > 0) {
          newReels.push({
            id: insertResult[0].id,
            videoUrl: reel.videoUrl,
            author: reel.ownerUsername,
            views: reel.videoPlayCount || 0,
          });
          saved++;
        }
      } catch (error) {
        console.log(`⚠️ Пропуск дубликата: ${reel.shortCode}`);
      }
    }

    console.log(`💾 Сохранено: ${saved} новых reels`);
    return saved;
  } catch (error) {
    console.error(`❌ Ошибка парсинга @${competitor.username}:`, error.message);
    return 0;
  }
}

async function downloadVideo(videoUrl: string, attempt = 1): Promise<string> {
  const outputPath = path.join(
    videosDir,
    `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.mp4`
  );

  try {
    console.log(`   📥 Скачивание (попытка ${attempt})...`);
    await execAsync(
      `curl -L --max-time 60 --retry 3 -o "${outputPath}" "${videoUrl}"`
    );

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error("Файл не скачался или пустой");
    }

    console.log(
      `   ✅ Скачано: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`
    );
    return outputPath;
  } catch (error) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      return downloadVideo(videoUrl, attempt + 1);
    }
    throw error;
  }
}

async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = path.join(
    audioDir,
    `${path.basename(videoPath, ".mp4")}.mp3`
  );

  console.log(`   🎵 Извлечение аудио...`);
  await execAsync(
    `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${audioPath}" -y`
  );

  if (!fs.existsSync(audioPath)) {
    throw new Error("Аудио не извлечено");
  }

  return audioPath;
}

async function transcribeAudio(audioPath: string): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI недоступен");
  }

  console.log(`   🎤 Транскрибация...`);
  const fileStream = fs.createReadStream(audioPath);

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-1",
    temperature: 0,
  });

  const text = transcription.text.trim();
  if (!text) {
    throw new Error("Пустая транскрипция");
  }

  console.log(`   ✅ Транскрипция: ${text.length} символов`);
  return text;
}

async function transcribeReels() {
  if (!openai) {
    console.log("⚠️ OpenAI недоступен - пропуск транскрибации");
    return;
  }

  if (maxTranscriptions === 0) {
    console.log("📝 Транскрибация отключена");
    return;
  }

  console.log("🎤 ТРАНСКРИБАЦИЯ REELS");

  const reelsToTranscribe = newReels
    .filter((reel) => reel.views >= minViews)
    .sort((a, b) => b.views - a.views)
    .slice(0, maxTranscriptions);

  console.log(
    `🎯 К транскрибации: ${reelsToTranscribe.length} из ${newReels.length}`
  );

  let transcribed = 0;

  for (let i = 0; i < reelsToTranscribe.length; i++) {
    const reel = reelsToTranscribe[i];
    console.log(
      `\n${i + 1}/${reelsToTranscribe.length} @${reel.author} (${reel.views.toLocaleString()} просм.)`
    );

    try {
      if (!reel.videoUrl) {
        console.log("   ⚠️ Нет video_download_url");
        continue;
      }

      const videoPath = await downloadVideo(reel.videoUrl);
      const audioPath = await extractAudio(videoPath);
      const transcript = await transcribeAudio(audioPath);

      // Сохраняем в БД
      await db
        .update(reelsTable)
        .set({
          transcript,
          updated_at: new Date(),
        })
        .where(eq(reelsTable.id, reel.id));

      console.log(`   💾 Сохранено в БД`);
      transcribed++;

      // Очистка файлов
      [videoPath, audioPath].forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // Пауза между запросами
      if (i < reelsToTranscribe.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.message}`);
    }
  }

  console.log(
    `\n🎉 Транскрибировано: ${transcribed}/${reelsToTranscribe.length}`
  );
}

async function main() {
  try {
    console.log("\n" + "=".repeat(50));

    const competitors = await getCompetitors();
    if (competitors.length === 0) {
      console.error("❌ Нет конкурентов в БД");
      process.exit(1);
    }

    await clearOldReels();

    let totalSaved = 0;
    for (const competitor of competitors) {
      const saved = await scrapeCompetitor(competitor);
      totalSaved += saved;

      // Пауза между конкурентами
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("\n" + "=".repeat(50));
    await transcribeReels();

    console.log("\n🎉 ЗАВЕРШЕНО!");
    console.log(`📊 Конкуренты: ${competitors.length}`);
    console.log(`💾 Новые reels: ${totalSaved}`);
    console.log(`🌟 Готово для анализа!`);
  } catch (error) {
    console.error("❌ КРИТИЧЕСКАЯ ОШИБКА:", error);
    process.exit(1);
  }
}

main().catch(console.error);
