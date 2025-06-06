/**
 * 🔄 ПОЛНАЯ СТРАТЕГИЯ ОБНОВЛЕНИЯ ДАННЫХ
 *
 * 1. Получает конкурентов из БД
 * 2. Удаляет старые reels от конкурентов
 * 3. Парсит свежие reels для каждого конкурента
 * 4. Сохраняет новые reels в Neon
 * 5. Транскрибирует reels с высокими просмотрами
 *
 * Использование:
 * bun run src/scripts/full-refresh-strategy.ts [min_views] [max_reels_per_competitor] [max_transcribe]
 *
 * Пример:
 * bun run src/scripts/full-refresh-strategy.ts 50000 50 10
 */

import { ApifyClient } from "apify-client";
import { initializeDBConnection, getDB } from "../db/neonDB";
import { competitorsTable, reelsTable } from "../db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

dotenv.config();

// Промисифицируем exec
const execAsync = promisify(exec);

const apifyToken = process.env.APIFY_TOKEN;
const projectId = parseInt(process.env.DEFAULT_PROJECT_ID || "1");

// Параметры из командной строки
const minViews = parseInt(process.argv[2] || "0", 10); // Минимальные просмотры для транскрибации
const maxReelsPerCompetitor = parseInt(process.argv[3] || "1000", 10); // Максимум reels на конкурента (1000 = практически без лимита)
const maxTranscribeReels = parseInt(process.argv[4] || "1000", 10); // Максимум reels для транскрибации (1000 = практически без лимита)

console.log("🔧 ПАРАМЕТРЫ ЗАПУСКА:");
console.log(
  `   📊 Минимальные просмотры для транскрибации: ${minViews.toLocaleString()}`
);
console.log(
  `   🎬 Максимум reels на конкурента: ${maxReelsPerCompetitor === 1000 ? "БЕЗ ЛИМИТА" : maxReelsPerCompetitor}`
);
console.log(
  `   🎤 Максимум reels для транскрибации: ${maxTranscribeReels === 1000 ? "ВСЕ ПОДХОДЯЩИЕ" : maxTranscribeReels}`
);
console.log("");

if (!apifyToken) {
  console.error("❌ APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

// Инициализируем OpenAI для транскрибации
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.log("⚠️ OPENAI_API_KEY не найден - транскрибация будет пропущена");
}

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Создаем директории для временных файлов
const tempDir = path.join(process.cwd(), "temp");
const videosDir = path.join(tempDir, "videos");
const audioDir = path.join(tempDir, "audio");

[tempDir, videosDir, audioDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Инициализируем базу данных
initializeDBConnection();
const db = getDB();

// Массив для отслеживания новых добавленных reels
const newlyAddedReels: Array<{
  id: number;
  url: string;
  author: string;
  views: number;
}> = [];

interface Competitor {
  id: number;
  username: string;
  instagram_url: string;
  project_id: number;
}

interface InstagramReel {
  id: string;
  shortCode: string;
  url: string;
  caption?: string;
  hashtags?: string;
  likesCount: number;
  videoPlayCount: number;
  commentsCount: number;
  timestamp: string;
  ownerUsername: string;
  videoUrl: string;
  displayUrl: string;
  videoDuration?: number;
  productType: string;
}

async function getCompetitorsFromDB(): Promise<Competitor[]> {
  console.log("📋 Получение списка конкурентов из базы данных...");

  const competitors = await db
    .select()
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, projectId));

  console.log(`✅ Найдено конкурентов: ${competitors.length}`);
  competitors.forEach((comp, index) => {
    console.log(`   ${index + 1}. @${comp.username} (ID: ${comp.id})`);
  });

  return competitors.map((comp) => ({
    id: comp.id,
    username: comp.username,
    instagram_url: comp.profile_url,
    project_id: comp.project_id,
  }));
}

async function clearOldReelsForCompetitors(): Promise<void> {
  console.log("🗑️ Удаление старых reels от конкурентов...");

  const result = await db
    .delete(reelsTable)
    .where(
      and(
        eq(reelsTable.project_id, projectId),
        eq(reelsTable.source_type, "competitor")
      )
    );

  console.log(`✅ Удалено старых reels: ${result.rowCount || 0}`);
}

async function scrapeCompetitorReels(competitor: Competitor): Promise<any[]> {
  console.log(`🎬 Скрапинг реклов для: @${competitor.username}`);

  const client = new ApifyClient({ token: apifyToken });

  try {
    const input = {
      username: [competitor.username],
      resultsLimit: maxReelsPerCompetitor,
    };

    const run = await client.actor("xMc5Ga1oCONPmWJIa").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(`   📊 Получено элементов: ${items.length}`);

    if (items.length === 0) {
      console.log(`   ⚠️ Нет данных для @${competitor.username}`);
      return [];
    }

    // Сортируем по просмотрам для показа топ-3
    const sortedByViews = items
      .filter((item: any) => item.videoPlayCount > 0)
      .sort((a: any, b: any) => b.videoPlayCount - a.videoPlayCount);

    if (sortedByViews.length > 0) {
      console.log(`🔥 ТОП-3 REELS от @${competitor.username}:`);
      sortedByViews.slice(0, 3).forEach((item: any, index: number) => {
        console.log(
          `   ${index + 1}. ${item.videoPlayCount.toLocaleString()} просм. - ${item.shortCode}`
        );
      });

      const viralCount = sortedByViews.filter(
        (item: any) => item.videoPlayCount >= minViews
      ).length;
      console.log(
        `🌟 VIRAL CONTENT (${minViews.toLocaleString()}+): ${viralCount} из ${items.length}`
      );
    }

    return items;
  } catch (error) {
    console.error(`❌ Ошибка скрапинга для @${competitor.username}:`, error);
    return [];
  }
}

async function saveReelsToDB(
  reels: any[],
  competitorId: number
): Promise<number> {
  let savedCount = 0;

  for (const reel of reels) {
    try {
      // Проверяем, существует ли уже этот reel
      const existingReel = await db
        .select()
        .from(reelsTable)
        .where(eq(reelsTable.reel_url, reel.url))
        .limit(1);

      if (existingReel.length > 0) {
        console.log(`   ⏭️ Пропуск (уже существует): ${reel.shortCode}`);
        continue;
      }

      // Сохраняем новый reel
      const insertResult = await db
        .insert(reelsTable)
        .values({
          reel_url: reel.url,
          project_id: projectId,
          source_type: "competitor",
          source_identifier: competitorId.toString(),
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

      // Добавляем информацию о новом reel для транскрибации
      if (insertResult.length > 0) {
        newlyAddedReels.push({
          id: insertResult[0].id,
          url: reel.url,
          author: reel.ownerUsername,
          views: reel.videoPlayCount || 0,
        });
      }

      console.log(
        `   ✅ Сохранен: ${reel.shortCode} (${reel.videoPlayCount?.toLocaleString() || 0} просм.)`
      );
      savedCount++;
    } catch (error) {
      console.error(`   ❌ Ошибка сохранения ${reel.shortCode}:`, error);
    }
  }

  return savedCount;
}

async function updateCompetitorTimestamp(competitorId: number): Promise<void> {
  await db
    .update(competitorsTable)
    .set({
      last_scraped_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(competitorsTable.id, competitorId));
}

// === ФУНКЦИИ ТРАНСКРИБАЦИИ ===

async function downloadVideo(url: string): Promise<string> {
  try {
    console.log(`📥 Скачивание видео: ${url}`);

    const timestamp = Date.now();
    const outputPath = path.join(videosDir, `reel_video_${timestamp}.mp4`);

    if (fs.existsSync(outputPath)) {
      console.log(`   📁 Видео уже существует: ${outputPath}`);
      return outputPath;
    }

    const command = `yt-dlp "${url}" -o "${outputPath}" --no-warnings`;
    await execAsync(command);

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Файл не был скачан: ${outputPath}`);
    }

    console.log(`   ✅ Видео успешно скачано: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`   ❌ Ошибка скачивания видео: ${error}`);
    throw error;
  }
}

async function extractAudio(videoPath: string): Promise<string> {
  try {
    console.log(`🎵 Извлечение аудио из видео...`);

    const videoFileName = path.basename(videoPath, path.extname(videoPath));
    const audioPath = path.join(audioDir, `${videoFileName}.mp3`);

    if (fs.existsSync(audioPath)) {
      console.log(`   📁 Аудио уже существует: ${audioPath}`);
      return audioPath;
    }

    const command = `ffmpeg -i "${videoPath}" -vn -acodec mp3 -ar 16000 -ac 1 "${audioPath}" -y`;
    await execAsync(command);

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Файл аудио не был создан: ${audioPath}`);
    }

    console.log(`   ✅ Аудио успешно извлечено: ${audioPath}`);
    return audioPath;
  } catch (error) {
    console.error(`   ❌ Ошибка извлечения аудио: ${error}`);
    throw error;
  }
}

async function transcribeAudio(audioPath: string): Promise<string> {
  if (!openai) {
    throw new Error("OpenAI API недоступен");
  }

  try {
    console.log(`🎤 Транскрибация аудио...`);

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Аудиофайл не найден: ${audioPath}`);
    }

    const stats = fs.statSync(audioPath);
    if (stats.size === 0) {
      throw new Error(`Аудиофайл пустой: ${audioPath}`);
    }

    const fileStream = fs.createReadStream(audioPath);
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
    });

    console.log(
      `   ✅ Транскрипция получена (${transcription.text.length} символов)`
    );
    return transcription.text;
  } catch (error) {
    console.error(`   ❌ Ошибка транскрибации: ${error}`);
    throw error;
  }
}

async function cleanupFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`   🗑️ Удален: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error(`   ❌ Ошибка удаления ${filePath}: ${error}`);
    }
  }
}

async function transcribeNewReels(): Promise<void> {
  if (!openai) {
    console.log("⚠️ Пропуск транскрибации - OPENAI_API_KEY не найден");
    return;
  }

  console.log(`🎤 ТРАНСКРИБАЦИЯ НОВЫХ REELS`);

  if (newlyAddedReels.length === 0) {
    console.log("📝 Нет новых reels для транскрибации");
    return;
  }

  // Фильтруем reels по минимальным просмотрам и сортируем по убыванию просмотров
  const reelsToTranscribe = newlyAddedReels
    .filter((reel) => reel.views >= minViews)
    .sort((a, b) => b.views - a.views)
    .slice(0, maxTranscribeReels);

  console.log(`📝 Всего новых reels: ${newlyAddedReels.length}`);
  console.log(
    `🎯 Reels для транскрибации (${minViews.toLocaleString()}+ просмотров): ${reelsToTranscribe.length}`
  );

  if (reelsToTranscribe.length === 0) {
    console.log("ℹ️ Нет reels подходящих для транскрибации");
    return;
  }

  let transcribedCount = 0;

  for (let i = 0; i < reelsToTranscribe.length; i++) {
    const reelInfo = reelsToTranscribe[i];

    console.log(
      `\n🎯 Транскрибируем ${i + 1}/${reelsToTranscribe.length}: @${reelInfo.author}`
    );
    console.log(`   📊 Просмотры: ${reelInfo.views.toLocaleString()}`);
    console.log(`   🔗 URL: ${reelInfo.url}`);

    try {
      // Скачиваем видео по URL из Instagram
      const videoPath = await downloadVideo(reelInfo.url);

      // Извлекаем аудио
      const audioPath = await extractAudio(videoPath);

      // Транскрибируем аудио
      const transcription = await transcribeAudio(audioPath);

      // Обновляем транскрипцию в базе данных
      await db
        .update(reelsTable)
        .set({
          transcript: transcription,
          updated_at: new Date(),
        })
        .where(eq(reelsTable.id, reelInfo.id));

      console.log(`   ✅ Транскрипция сохранена в БД`);
      console.log(
        `   📝 Текст: "${transcription.slice(0, 100)}${transcription.length > 100 ? "..." : ""}"`
      );
      transcribedCount++;

      // Очищаем временные файлы
      await cleanupFiles([audioPath]);

      // Пауза между обработкой
      if (i < reelsToTranscribe.length - 1) {
        console.log("   ⏸️ Пауза 3 сек...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(
        `   ❌ Ошибка транскрибации reel ID ${reelInfo.id}: ${error}`
      );
    }
  }

  console.log(
    `\n🎉 Транскрибация завершена: ${transcribedCount}/${reelsToTranscribe.length} успешно`
  );
}

async function main() {
  console.log("🚀 ЗАПУСК ПОЛНОЙ СТРАТЕГИИ ОБНОВЛЕНИЯ ДАННЫХ");
  console.log("=".repeat(50));
  console.log(`📋 Проект ID: ${projectId}`);
  console.log(
    `🔑 Токен: ${apifyToken ? `${apifyToken.substring(0, 20)}...` : "НЕ НАЙДЕН"}`
  );
  console.log(`🤖 Парсер: xMc5Ga1oCONPmWJIa (Instagram Reel Scraper)`);
  console.log("");

  try {
    // 1. Получаем список конкурентов из БД
    const competitors = await getCompetitorsFromDB();

    if (competitors.length === 0) {
      console.log("❌ Нет конкурентов в базе данных!");
      process.exit(1);
    }

    // 2. Удаляем старые reels от конкурентов
    await clearOldReelsForCompetitors();

    // 3. Парсим и сохраняем новые reels для каждого конкурента
    let totalScraped = 0;
    let totalSaved = 0;

    for (const competitor of competitors) {
      console.log(
        `\n🎯 Обрабатываем: @${competitor.username} (ID: ${competitor.id})`
      );

      const reels = await scrapeCompetitorReels(competitor);
      totalScraped += reels.length;

      if (reels.length > 0) {
        const savedCount = await saveReelsToDB(reels, competitor.id);
        totalSaved += savedCount;
        console.log(`   📊 Результат: ${savedCount} новых reels сохранено`);
      }

      // Обновляем timestamp последнего скрапинга
      await updateCompetitorTimestamp(competitor.id);

      // Небольшая пауза между конкурентами
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 4. Запускаем транскрибацию новых reels
    console.log("\n" + "=".repeat(50));
    await transcribeNewReels();

    // 5. Итоговая статистика
    console.log("\n🎉 ИТОГОВАЯ СТАТИСТИКА:");
    console.log(`   📊 Всего конкурентов обработано: ${competitors.length}`);
    console.log(`   🎬 Всего reels получено: ${totalScraped}`);
    console.log(`   💾 Всего reels сохранено: ${totalSaved}`);
    console.log(
      `   🌟 Готово для анализа viral content (${minViews.toLocaleString()}+)!`
    );
    console.log("");
    console.log("✅ Полная стратегия обновления завершена!");
  } catch (error) {
    console.error("❌ Критическая ошибка:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
main().catch(console.error);
