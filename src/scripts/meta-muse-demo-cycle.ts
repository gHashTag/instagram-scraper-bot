#!/usr/bin/env bun

/**
 * 🕉️ Meta Muse Demo Full Cycle Script
 * Демо-версия полного цикла без реального скрепинга:
 * 1. Инициализация проекта и хэштегов
 * 2. Симуляция скрепинга Instagram
 * 3. Симуляция транскрибации видео
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
import fs from "fs/promises";
import path from "path";

// 🔧 Configuration
const PROJECT_ID = 2;
const PROJECT_NAME = "Meta Muse";
const PROJECT_DESCRIPTION =
  "Аниме мышь - AI-инфлюенсер проект с анализом 151 хэштега в 6 категориях";

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

// 🌐 Initialize database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// 📊 Statistics tracking
interface Stats {
  projectInitialized: boolean;
  hashtagsAdded: number;
  hashtagsSkipped: number;
  hashtagsScraped: number;
  reelsFound: number;
  reelsSaved: number;
  videosTranscribed: number;
  errors: string[];
}

const stats: Stats = {
  projectInitialized: false,
  hashtagsAdded: 0,
  hashtagsSkipped: 0,
  hashtagsScraped: 0,
  reelsFound: 0,
  reelsSaved: 0,
  videosTranscribed: 0,
  errors: [],
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

// 🕷️ Step 2: Demo Scrape Instagram by Hashtags
async function demoScrapeInstagram(): Promise<void> {
  console.log("\n🕉️ STEP 2: ДЕМО Скрепинг Instagram по хэштегам");
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

    // Process first 5 hashtags for demo
    const demoHashtags = projectHashtags.slice(0, 5);
    console.log(`🎭 ДЕМО: Обработка первых ${demoHashtags.length} хэштегов`);

    for (const hashtag of demoHashtags) {
      try {
        console.log(`\n🏷️ ДЕМО Скрепинг: ${hashtag.tag_name}`);

        // Simulate API call delay
        console.log(`⏳ Симуляция скрепинга...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Generate demo data
        const demoItems = generateDemoReels(hashtag.tag_name);

        console.log(
          `📊 ДЕМО: Найдено ${demoItems.length} постов для ${hashtag.tag_name}`
        );
        stats.reelsFound += demoItems.length;

        // Save demo reels to database
        let savedCount = 0;
        for (const item of demoItems) {
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
                author_username: item.author,
                description: item.description,
                views_count: item.views,
                likes_count: item.likes,
                comments_count: item.comments,
                published_at: item.publishedAt,
                thumbnail_url: item.thumbnail,
                video_download_url: item.videoUrl,
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

        // Small delay between hashtags
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const errorMsg = `Ошибка скрепинга ${hashtag.tag_name}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Ошибка скрепинга Instagram: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    throw error;
  }
}

// 🎤 Step 3: Demo Transcribe Videos
async function demoTranscribeVideos(): Promise<void> {
  console.log("\n🕉️ STEP 3: ДЕМО Транскрибация видео");
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
      .limit(10); // Limit for demo

    console.log(
      `📊 Найдено ${videosToTranscribe.length} видео для транскрибации`
    );

    if (videosToTranscribe.length === 0) {
      console.log("✅ Все видео уже транскрибированы");
      return;
    }

    for (const reel of videosToTranscribe) {
      try {
        console.log(`\n🎤 ДЕМО Транскрибация: ${reel.id}`);

        // Simulate transcription
        let transcription = "";

        if (reel.description && reel.description.length > 0) {
          // Use caption as fallback transcription
          transcription = `[ДЕМО Caption-based transcription]: ${reel.description}`;
        } else {
          transcription = "[ДЕМО No audio content detected]";
        }

        // Add some demo AI-generated content
        transcription += ` [ДЕМО AI Analysis: Контент связан с ${reel.source_identifier}, высокая релевантность для Meta Muse проекта]`;

        // Update reel with transcription
        await db
          .update(reelsTable)
          .set({
            transcript: transcription,
            updated_at: new Date(),
          })
          .where(eq(reelsTable.id, reel.id));

        console.log(`✅ ДЕМО Транскрибация завершена`);
        stats.videosTranscribed++;

        // Small delay to simulate processing
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

// 🎭 Generate demo reels data
function generateDemoReels(hashtag: string) {
  const demoReels = [];
  const count = Math.floor(Math.random() * 5) + 3; // 3-7 reels per hashtag

  for (let i = 0; i < count; i++) {
    const id = `demo_${hashtag.replace("#", "")}_${Date.now()}_${i}`;
    demoReels.push({
      id,
      url: `https://instagram.com/reel/${id}`,
      author: `demo_user_${i + 1}`,
      description: `ДЕМО контент для ${hashtag}. Это пример поста с релевантным содержанием для аниме мыши Meta Muse.`,
      views: Math.floor(Math.random() * 100000) + 1000,
      likes: Math.floor(Math.random() * 10000) + 100,
      comments: Math.floor(Math.random() * 1000) + 10,
      publishedAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ), // Last 7 days
      thumbnail: `https://demo.example.com/thumbnail_${id}.jpg`,
      videoUrl: `https://demo.example.com/video_${id}.mp4`,
    });
  }

  return demoReels;
}

// 📊 Final Report
function printFinalReport(): void {
  console.log("\n🕉️ ФИНАЛЬНЫЙ ОТЧЕТ Meta Muse ДЕМО Full Cycle");
  console.log("═".repeat(60));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Project ID: ${PROJECT_ID}`);
  console.log(
    `📊 Проект инициализирован: ${stats.projectInitialized ? "Да" : "Нет"}`
  );
  console.log(`🏷️ Хэштегов добавлено: ${stats.hashtagsAdded}`);
  console.log(`⚠️ Хэштегов пропущено: ${stats.hashtagsSkipped}`);
  console.log(`🕷️ Хэштегов обработано: ${stats.hashtagsScraped}`);
  console.log(`📱 Постов найдено: ${stats.reelsFound}`);
  console.log(`💾 Постов сохранено: ${stats.reelsSaved}`);
  console.log(`🎤 Видео транскрибировано: ${stats.videosTranscribed}`);
  console.log(`❌ Ошибок: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log("\n🚨 ОШИБКИ:");
    stats.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  console.log("\n✅ ДЕМО ЗАВЕРШЕНО:");
  console.log("1. 📊 Проект и хэштеги инициализированы");
  console.log("2. 🎭 Демо-данные созданы и сохранены");
  console.log("3. 🎤 Демо-транскрибация выполнена");
  console.log("4. 🔄 Готово для реального скрепинга с Apify токеном");

  console.log("\n🎉 Meta Muse ДЕМО Full Cycle завершен! 🐭⚡");
}

// 🚀 Main execution
async function main(): Promise<void> {
  console.log("🕉️ Meta Muse ДЕМО Full Cycle Script - ЗАПУСК");
  console.log("═".repeat(50));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Target Project ID: ${PROJECT_ID}`);
  console.log("🎭 ДЕМО РЕЖИМ: Без реального скрепинга");

  try {
    // Step 1: Initialize
    await initializeProject();

    // Step 2: Demo Scrape
    await demoScrapeInstagram();

    // Step 3: Demo Transcribe
    await demoTranscribeVideos();

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

export { main as runDemoFullCycle };
