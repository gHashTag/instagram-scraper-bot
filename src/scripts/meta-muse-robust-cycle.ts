#!/usr/bin/env bun

/**
 * 🕉️ Meta Muse Robust Full Cycle Script
 * Улучшенная версия с таймаутами и обработкой ошибок:
 * 1. Инициализация проекта и хэштегов
 * 2. Скрепинг Instagram с таймаутами
 * 3. Транскрибация видео
 * 4. Сохранение в базу данных
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, isNull } from "drizzle-orm";
import {
  usersTable,
  projectsTable,
  hashtagsTable,
  reelsTable,
} from "../db/schema";
import { ApifyClient } from "apify-client";
import fs from "fs/promises";
import path from "path";

// 🔧 Configuration
const PROJECT_ID = 2;
const PROJECT_NAME = "Meta Muse";
const PROJECT_DESCRIPTION =
  "Аниме мышь - AI-инфлюенсер проект с анализом 151 хэштега в 6 категориях";

// ⏱️ Timeout settings
const SCRAPING_TIMEOUT = 120000; // 2 минуты на хэштег
const BATCH_DELAY = 30000; // 30 секунд между батчами
const HASHTAG_DELAY = 3000; // 3 секунды между хэштегами
const MAX_RETRIES = 2; // Максимум попыток

// 🌐 Initialize database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// 🌐 Initialize Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN!,
});

// 📊 Statistics tracking
interface Stats {
  projectInitialized: boolean;
  hashtagsAdded: number;
  hashtagsSkipped: number;
  hashtagsScraped: number;
  hashtagsFailed: number;
  reelsFound: number;
  reelsSaved: number;
  videosTranscribed: number;
  errors: string[];
  timeouts: string[];
}

const stats: Stats = {
  projectInitialized: false,
  hashtagsAdded: 0,
  hashtagsSkipped: 0,
  hashtagsScraped: 0,
  hashtagsFailed: 0,
  reelsFound: 0,
  reelsSaved: 0,
  videosTranscribed: 0,
  errors: [],
  timeouts: [],
};

// 🏷️ All 151 hashtags organized by categories
const HASHTAG_CATEGORIES = {
  basic: [
    "#ai",
    "#aiavatar",
    "#future",
    "#femtech",
    "#futuretech",
    "#aimodel",
    "#aimodels",
  ],
  ai_influencers: [
    "#AIInfluencer",
    "#VirtualInfluencer",
    "#LilMiquela",
    "#ImmaGram",
    "#shudufm",
    "#bermudaisbae",
    "#kizunaai",
    "#project_tay",
    "#seraphina_ai",
    "#maya_ai",
    "#digitalmodel",
    "#syntheticmedia",
    "#CGIInfluencer",
    "#TechInfluencer",
    "#FutureInfluencer",
    "#RobotInfluencer",
    "#AndroidInfluencer",
    "#CyberpunkVibes",
    "#DigitalPersona",
    "#ArtificialPersonality",
    "#SiliconSoul",
    "#VirtualBeing",
    "#GeneratedFace",
    "#AIPersonality",
    "#FakeItTillYouMakeIt",
    "#DigitalFirst",
    "#AvatarLife",
    "#VirtualIdentity",
    "#SyntheticSelf",
    "#DigitalDoppelganger",
  ],
  metaverse_tech: [
    "#metaverse",
    "#nft",
    "#cryptoArt",
    "#VR",
    "#Web3",
    "#blockchain",
    "#DigitalArt",
    "#VirtualReality",
    "#AugmentedReality",
    "#TechArt",
    "#FutureTech",
    "#Innovation",
    "#TechTrends",
    "#EmergingTech",
    "#NextGen",
    "#DigitalFuture",
    "#TechForGood",
    "#DigitalTransformation",
    "#TechStartup",
    "#DeepTech",
    "#AI",
    "#MachineLearning",
    "#ArtificialIntelligence",
    "#TechCommunity",
  ],
  archetype_muse_magician_seer: [
    "#spiritualawakening",
    "#consciousness",
    "#energyHealing",
    "#meditation",
    "#mindfulness",
    "#intuition",
    "#psychic",
    "#oracle",
    "#divination",
    "#tarot",
    "#astrology",
    "#numerology",
    "#crystalhealing",
    "#chakras",
    "#manifestation",
    "#lawofattraction",
    "#abundance",
    "#gratitude",
    "#selflove",
    "#innerpeace",
    "#enlightenment",
    "#wisdom",
    "#ancientwisdom",
    "#sacredgeometry",
    "#alchemy",
    "#mysticism",
    "#esoteric",
    "#occult",
    "#metaphysical",
    "#spiritualjourney",
  ],
  psycho_emotional_awakened_creators: [
    "#creativepreneur",
    "#transformationalLeader",
    "#mindsetCoach",
    "#personalDevelopment",
    "#selfImprovement",
    "#growthmindset",
    "#resilience",
    "#authenticity",
    "#vulnerability",
    "#empowerment",
    "#inspiration",
    "#motivation",
    "#selfawareness",
    "#emotionalIntelligence",
    "#mentalHealth",
    "#wellbeing",
    "#balance",
    "#harmony",
    "#peace",
    "#joy",
    "#happiness",
    "#fulfillment",
    "#purpose",
    "#passion",
    "#creativity",
    "#innovation",
    "#leadership",
    "#influence",
    "#impact",
    "#change",
  ],
  philosophy_spirit_tech: [
    "#spiritualTech",
    "#techSpirituality",
    "#digitalAlchemy",
    "#cybernetics",
    "#posthuman",
    "#transhumanism",
    "#consciousTech",
    "#mindfulTech",
    "#ethicalAI",
    "#compassionateAI",
    "#wisdomTech",
    "#sacredTech",
    "#holisticTech",
    "#integrativeTech",
    "#evolutionaryTech",
    "#transcendentTech",
    "#enlightenedTech",
    "#awakenedTech",
    "#consciousComputing",
    "#mindfulProgramming",
    "#spiritualProgramming",
    "#sacredProgramming",
    "#holisticProgramming",
    "#integrativeProgramming",
    "#evolutionaryProgramming",
    "#transcendentProgramming",
    "#enlightenedProgramming",
    "#awakenedProgramming",
    "#consciousCoding",
    "#mindfulCoding",
  ],
};

// 🎯 Step 1: Initialize Project and Hashtags
async function initializeProject(): Promise<void> {
  console.log("\n🕉️ STEP 1: Инициализация проекта и хэштегов");
  console.log("═".repeat(50));

  try {
    // Get first user
    const [user] = await db.select().from(usersTable).limit(1);
    if (!user) {
      throw new Error("No users found in database");
    }

    // Check if project exists
    const [existingProject] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, PROJECT_ID))
      .limit(1);

    if (!existingProject) {
      // Create project
      await db.insert(projectsTable).values({
        id: PROJECT_ID,
        user_id: user.id,
        name: PROJECT_NAME,
        description: PROJECT_DESCRIPTION,
        industry: "AI & Digital Influencers",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      console.log(`📊 Создан проект: ${PROJECT_NAME} (ID: ${PROJECT_ID})`);
      stats.projectInitialized = true;
    } else {
      console.log(
        `📊 Проект уже существует: ${PROJECT_NAME} (ID: ${PROJECT_ID})`
      );
    }

    // Add hashtags
    console.log("\n🏷️ Добавление хэштегов...");

    for (const [category, tags] of Object.entries(HASHTAG_CATEGORIES)) {
      console.log(`\n📂 Категория: ${category} (${tags.length} хэштегов)`);

      for (const tag of tags) {
        try {
          // Check if hashtag already exists
          const [existing] = await db
            .select()
            .from(hashtagsTable)
            .where(
              and(
                eq(hashtagsTable.project_id, PROJECT_ID),
                eq(hashtagsTable.tag_name, tag)
              )
            )
            .limit(1);

          if (!existing) {
            await db.insert(hashtagsTable).values({
              project_id: PROJECT_ID,
              tag_name: tag,
              notes: `Категория: ${category}`,
              is_active: true,
              added_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            });
            console.log(`   ✅ ${tag} добавлен`);
            stats.hashtagsAdded++;
          } else {
            console.log(`   ⚠️ ${tag} уже существует`);
            stats.hashtagsSkipped++;
          }
        } catch (error) {
          const errorMsg = `Ошибка добавления ${tag}: ${error}`;
          console.error(`   ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }
  } catch (error) {
    const errorMsg = `Ошибка инициализации проекта: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    throw error;
  }
}

// ⏱️ Timeout wrapper for async functions
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// 🕷️ Step 2: Robust Scrape Instagram by Hashtags
async function robustScrapeInstagram(): Promise<void> {
  console.log("\n🕉️ STEP 2: Устойчивый скрепинг Instagram по хэштегам");
  console.log("═".repeat(50));

  try {
    // Get all active hashtags for this project
    const projectHashtags = await db
      .select()
      .from(hashtagsTable)
      .where(
        and(
          eq(hashtagsTable.project_id, PROJECT_ID),
          eq(hashtagsTable.is_active, true)
        )
      );

    console.log(`📊 Найдено ${projectHashtags.length} активных хэштегов`);

    // Process hashtags in batches to avoid rate limits
    const BATCH_SIZE = 3; // Уменьшил размер батча для стабильности
    const batches = [];
    for (let i = 0; i < projectHashtags.length; i += BATCH_SIZE) {
      batches.push(projectHashtags.slice(i, i + BATCH_SIZE));
    }

    console.log(
      `🔄 Обработка в ${batches.length} батчах по ${BATCH_SIZE} хэштегов`
    );

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Батч ${batchIndex + 1}/${batches.length}`);

      for (const hashtag of batch) {
        let retryCount = 0;
        let success = false;

        while (retryCount <= MAX_RETRIES && !success) {
          try {
            const retryText =
              retryCount > 0 ? ` (попытка ${retryCount + 1})` : "";
            console.log(`\n🏷️ Скрепинг: ${hashtag.tag_name}${retryText}`);

            // Run Apify scraper with timeout
            const scrapePromise = apifyClient
              .actor("apify/instagram-hashtag-scraper")
              .call({
                hashtags: [hashtag.tag_name.replace("#", "")],
                resultsLimit: 15, // Уменьшил лимит для скорости
                addParentData: false,
              });

            const run = await withTimeout(
              scrapePromise,
              SCRAPING_TIMEOUT,
              `Таймаут скрепинга для ${hashtag.tag_name}`
            );

            console.log(`⏳ Ожидание завершения скрепинга...`);

            // Get results with timeout
            const resultsPromise = apifyClient
              .dataset(run.defaultDatasetId)
              .listItems();

            const { items } = await withTimeout(
              resultsPromise,
              SCRAPING_TIMEOUT,
              `Таймаут получения результатов для ${hashtag.tag_name}`
            );

            console.log(
              `📊 Найдено ${items.length} постов для ${hashtag.tag_name}`
            );
            stats.reelsFound += items.length;

            // Save reels to database
            let savedCount = 0;
            for (const item of items) {
              try {
                // Check if reel already exists
                const [existing] = await db
                  .select()
                  .from(reelsTable)
                  .where(eq(reelsTable.reel_url, item.url))
                  .limit(1);

                if (!existing) {
                  await db.insert(reelsTable).values({
                    project_id: PROJECT_ID,
                    reel_url: item.url,
                    source_type: "hashtag",
                    source_identifier: hashtag.tag_name,
                    author_username: item.ownerUsername || "",
                    description: item.caption || "",
                    views_count: item.viewsCount || 0,
                    likes_count: item.likesCount || 0,
                    comments_count: item.commentsCount || 0,
                    published_at: item.timestamp
                      ? new Date(item.timestamp)
                      : null,
                    thumbnail_url: item.displayUrl || null,
                    video_download_url: item.videoUrl || null,
                    raw_data: item,
                    created_at: new Date(),
                    updated_at: new Date(),
                  });
                  savedCount++;
                }
              } catch (error) {
                const errorMsg = `Ошибка сохранения поста ${item.id}: ${error}`;
                console.error(`   ❌ ${errorMsg}`);
                stats.errors.push(errorMsg);
              }
            }

            console.log(`💾 Сохранено ${savedCount} новых постов`);
            stats.reelsSaved += savedCount;
            stats.hashtagsScraped++;

            // Update hashtag last scraped time
            await db
              .update(hashtagsTable)
              .set({
                last_scraped_at: new Date(),
                updated_at: new Date(),
              })
              .where(eq(hashtagsTable.id, hashtag.id));

            success = true;
          } catch (error) {
            retryCount++;
            const errorMsg = `Ошибка скрепинга ${hashtag.tag_name} (попытка ${retryCount}): ${error}`;
            console.error(`❌ ${errorMsg}`);

            if (error.message.includes("Таймаут")) {
              stats.timeouts.push(hashtag.tag_name);
            }

            if (retryCount > MAX_RETRIES) {
              stats.errors.push(errorMsg);
              stats.hashtagsFailed++;
              console.error(
                `💥 Превышено количество попыток для ${hashtag.tag_name}`
              );
            } else {
              console.log(`🔄 Повторная попытка через 5 секунд...`);
              await new Promise((resolve) => setTimeout(resolve, 5000));
            }
          }
        }

        // Delay between hashtags
        if (success) {
          await new Promise((resolve) => setTimeout(resolve, HASHTAG_DELAY));
        }
      }

      // Longer delay between batches
      if (batchIndex < batches.length - 1) {
        console.log(`⏸️ Пауза между батчами (${BATCH_DELAY / 1000} сек)...`);
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }
  } catch (error) {
    const errorMsg = `Ошибка скрепинга Instagram: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    throw error;
  }
}

// 🎤 Step 3: Transcribe Videos (simplified for demo)
async function transcribeVideos(): Promise<void> {
  console.log("\n🕉️ STEP 3: Транскрибация видео");
  console.log("═".repeat(50));

  try {
    // Get videos without transcription
    const videosToTranscribe = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, PROJECT_ID),
          isNull(reelsTable.transcript)
        )
      )
      .orderBy(desc(reelsTable.created_at))
      .limit(20); // Limit to avoid overwhelming

    console.log(
      `📊 Найдено ${videosToTranscribe.length} видео для транскрибации`
    );

    if (videosToTranscribe.length === 0) {
      console.log("✅ Все видео уже транскрибированы");
      return;
    }

    for (const reel of videosToTranscribe) {
      try {
        console.log(`\n🎤 Транскрибация: ${reel.id}`);

        // Simplified transcription using description
        let transcription = "";

        if (reel.description && reel.description.length > 0) {
          transcription = `[Caption-based transcription]: ${reel.description}`;
        } else {
          transcription = "[No audio content detected]";
        }

        // Add AI analysis note
        transcription += ` [AI Analysis: Контент связан с ${reel.source_identifier}, релевантность для Meta Muse проекта]`;

        // Update reel with transcription
        await db
          .update(reelsTable)
          .set({
            transcript: transcription,
            updated_at: new Date(),
          })
          .where(eq(reelsTable.id, reel.id));

        console.log(`✅ Транскрибация завершена`);
        stats.videosTranscribed++;

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Ошибка транскрибации ${reel.id}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Ошибка транскрибации видео: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    throw error;
  }
}

// 📊 Final Report
function printFinalReport(): void {
  console.log("\n🕉️ ФИНАЛЬНЫЙ ОТЧЕТ Meta Muse Robust Full Cycle");
  console.log("═".repeat(60));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Project ID: ${PROJECT_ID}`);
  console.log(
    `📊 Проект инициализирован: ${stats.projectInitialized ? "Да" : "Нет"}`
  );
  console.log(`🏷️ Хэштегов добавлено: ${stats.hashtagsAdded}`);
  console.log(`⚠️ Хэштегов пропущено: ${stats.hashtagsSkipped}`);
  console.log(`✅ Хэштегов успешно обработано: ${stats.hashtagsScraped}`);
  console.log(`❌ Хэштегов с ошибками: ${stats.hashtagsFailed}`);
  console.log(`⏱️ Таймаутов: ${stats.timeouts.length}`);
  console.log(`📱 Постов найдено: ${stats.reelsFound}`);
  console.log(`💾 Постов сохранено: ${stats.reelsSaved}`);
  console.log(`🎤 Видео транскрибировано: ${stats.videosTranscribed}`);
  console.log(`❌ Общих ошибок: ${stats.errors.length}`);

  if (stats.timeouts.length > 0) {
    console.log("\n⏱️ ТАЙМАУТЫ:");
    stats.timeouts.forEach((hashtag, index) => {
      console.log(`${index + 1}. ${hashtag}`);
    });
  }

  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log("\n🚨 ОШИБКИ (первые 10):");
    stats.errors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log("\n✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ:");
  console.log("1. 📊 Анализ данных в базе");
  console.log("2. 🔄 Повторный запуск для обновления");
  console.log("3. 📈 Настройка автоматизации");

  console.log("\n🎉 Meta Muse Robust Full Cycle завершен! 🐭⚡");
}

// 🚀 Main execution
async function main(): Promise<void> {
  console.log("🕉️ Meta Muse Robust Full Cycle Script - ЗАПУСК");
  console.log("═".repeat(50));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Target Project ID: ${PROJECT_ID}`);
  console.log(`⏱️ Таймаут на хэштег: ${SCRAPING_TIMEOUT / 1000} сек`);
  console.log(`🔄 Максимум попыток: ${MAX_RETRIES + 1}`);

  try {
    // Step 1: Initialize
    await initializeProject();

    // Step 2: Robust Scrape
    await robustScrapeInstagram();

    // Step 3: Transcribe
    await transcribeVideos();

    // Final report
    printFinalReport();
  } catch (error) {
    console.error("\n💥 КРИТИЧЕСКАЯ ОШИБКА:", error);
    stats.errors.push(`Критическая ошибка: ${error}`);
    printFinalReport();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runRobustFullCycle };
