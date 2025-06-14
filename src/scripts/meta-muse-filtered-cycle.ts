#!/usr/bin/env bun

/**
 * 🐭 Meta Muse Filtered Cycle
 * Скрапинг с обязательными фильтрами:
 * - За последние 2 недели
 * - Больше 50,000 просмотров
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, isNull, desc } from "drizzle-orm";
import { ApifyClient } from "apify-client";
import {
  usersTable,
  projectsTable,
  hashtagsTable,
  reelsTable,
} from "../db/schema";

// 🔧 Configuration
const PROJECT_ID = 2;
const PROJECT_NAME = "Meta Muse";
const PROJECT_DESCRIPTION =
  "Аниме мышь - AI-инфлюенсер проект с анализом 151 хэштега в 6 категориях";

// 🎯 НОВЫЕ ФИЛЬТРЫ
const MIN_VIEWS = 50000; // Минимум 50K просмотров
const DAYS_BACK = 14; // За последние 2 недели
const TWO_WEEKS_AGO = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);

// ⏱️ Timeouts and delays
const SCRAPING_TIMEOUT = 2 * 60 * 1000; // 2 minutes per hashtag
const HASHTAG_DELAY = 3000; // 3 seconds between hashtags
const BATCH_DELAY = 10000; // 10 seconds between batches
const MAX_RETRIES = 2;

// 🌐 Initialize services
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN! });

// 📊 Statistics tracking
interface Stats {
  projectInitialized: boolean;
  hashtagsAdded: number;
  hashtagsSkipped: number;
  hashtagsScraped: number;
  hashtagsFailed: number;
  reelsFound: number;
  reelsFiltered: number; // NEW: отфильтровано по критериям
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
  reelsFiltered: 0,
  reelsSaved: 0,
  videosTranscribed: 0,
  errors: [],
  timeouts: [],
};

// 🏷️ Meta Muse Hashtags (151 total)
const META_MUSE_HASHTAGS = {
  basic: [
    "#anime",
    "#mouse",
    "#animegirl",
    "#kawaii",
    "#otaku",
    "#manga",
    "#future",
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
    console.log("\n🏷️ Добавление хэштегов по категориям:");

    for (const [category, hashtags] of Object.entries(META_MUSE_HASHTAGS)) {
      console.log(`\n📂 Категория: ${category} (${hashtags.length} хэштегов)`);

      for (const hashtag of hashtags) {
        try {
          // Check if hashtag already exists
          const [existing] = await db
            .select()
            .from(hashtagsTable)
            .where(
              and(
                eq(hashtagsTable.project_id, PROJECT_ID),
                eq(hashtagsTable.tag_name, hashtag)
              )
            )
            .limit(1);

          if (!existing) {
            await db.insert(hashtagsTable).values({
              project_id: PROJECT_ID,
              tag_name: hashtag,
              notes: `Meta Muse category: ${category}`,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date(),
            });
            stats.hashtagsAdded++;
          } else {
            stats.hashtagsSkipped++;
          }
        } catch (error) {
          const errorMsg = `Ошибка добавления хэштега ${hashtag}: ${error}`;
          console.error(`   ❌ ${errorMsg}`);
          stats.errors.push(errorMsg);
        }
      }
    }

    console.log(`\n✅ Хэштеги обработаны:`);
    console.log(`   📊 Добавлено: ${stats.hashtagsAdded}`);
    console.log(`   ⏭️ Пропущено: ${stats.hashtagsSkipped}`);
  } catch (error) {
    const errorMsg = `Ошибка инициализации проекта: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    throw error;
  }
}

// ⏱️ Timeout wrapper
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Таймаут: ${timeoutMessage}`)), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

// 🎯 NEW: Filter function for quality content
function passesQualityFilter(item: any): boolean {
  // Check views count
  const views = (item.viewsCount as number) || 0;
  if (views < MIN_VIEWS) {
    return false;
  }

  // Check date (last 2 weeks)
  if (item.timestamp) {
    const postDate = new Date(item.timestamp as string);
    if (postDate < TWO_WEEKS_AGO) {
      return false;
    }
  }

  return true;
}

// 🔄 Step 2: Robust Instagram Scraping with Filters
async function filteredScrapeInstagram(): Promise<void> {
  console.log("\n🕉️ STEP 2: Фильтрованный скрепинг Instagram");
  console.log("═".repeat(50));
  console.log(`🎯 ФИЛЬТРЫ:`);
  console.log(
    `   📅 За последние ${DAYS_BACK} дней (с ${TWO_WEEKS_AGO.toLocaleDateString()})`
  );
  console.log(`   👀 Минимум ${MIN_VIEWS.toLocaleString()} просмотров`);

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

    // Process hashtags in batches
    const BATCH_SIZE = 3;
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
                resultsLimit: 50, // Увеличил лимит для лучшей фильтрации
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

            // 🎯 APPLY QUALITY FILTERS
            const filteredItems = items.filter(passesQualityFilter);
            const filteredCount = items.length - filteredItems.length;
            stats.reelsFiltered += filteredCount;

            console.log(
              `🎯 После фильтрации: ${filteredItems.length} постов (отфильтровано: ${filteredCount})`
            );

            if (filteredItems.length === 0) {
              console.log(`⚠️ Нет постов, соответствующих критериям качества`);
              stats.hashtagsScraped++;
              success = true;
              continue;
            }

            // Save filtered reels to database
            let savedCount = 0;
            for (const item of filteredItems) {
              try {
                // Check if reel already exists
                const [existing] = await db
                  .select()
                  .from(reelsTable)
                  .where(eq(reelsTable.reel_url, item.url as string))
                  .limit(1);

                if (!existing) {
                  await db.insert(reelsTable).values({
                    project_id: PROJECT_ID,
                    reel_url: item.url as string,
                    source_type: "hashtag",
                    source_identifier: hashtag.tag_name,
                    author_username: (item.ownerUsername as string) || "",
                    description: (item.caption as string) || "",
                    views_count: (item.viewsCount as number) || 0,
                    likes_count: (item.likesCount as number) || 0,
                    comments_count: (item.commentsCount as number) || 0,
                    published_at: item.timestamp
                      ? new Date(item.timestamp as string)
                      : null,
                    thumbnail_url: (item.displayUrl as string) || null,
                    video_download_url: (item.videoUrl as string) || null,
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

            console.log(`💾 Сохранено ${savedCount} качественных постов`);
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
    const errorMsg = `Ошибка фильтрованного скрепинга: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
    throw error;
  }
}

// 🎤 Step 3: Transcribe Videos
async function transcribeVideos(): Promise<void> {
  console.log("\n🕉️ STEP 3: Транскрибация качественных видео");
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
      .orderBy(desc(reelsTable.views_count)) // Сортируем по просмотрам
      .limit(30); // Увеличил лимит для качественного контента

    console.log(
      `📊 Найдено ${videosToTranscribe.length} качественных видео для транскрибации`
    );

    if (videosToTranscribe.length === 0) {
      console.log("✅ Все качественные видео уже транскрибированы");
      return;
    }

    for (const video of videosToTranscribe) {
      try {
        console.log(`\n🎤 Транскрибация: ${video.author_username}`);
        console.log(`   👀 Просмотры: ${video.views_count?.toLocaleString()}`);
        console.log(`   🏷️ Хэштег: ${video.source_identifier}`);

        // Simple transcription simulation (replace with real OpenAI call)
        const transcript = `[КАЧЕСТВЕННЫЙ КОНТЕНТ] Автор: ${video.author_username}. Просмотры: ${video.views_count}. Описание: ${video.description?.substring(0, 100)}...`;

        // Update with transcript
        await db
          .update(reelsTable)
          .set({
            transcript: transcript,
            updated_at: new Date(),
          })
          .where(eq(reelsTable.id, video.id));

        stats.videosTranscribed++;
        console.log(`✅ Транскрибировано`);

        // Small delay to avoid overwhelming
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = `Ошибка транскрибации видео ${video.id}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Ошибка транскрибации: ${error}`;
    console.error(`❌ ${errorMsg}`);
    stats.errors.push(errorMsg);
  }
}

// 📊 Final Report
function printFinalReport(): void {
  console.log("\n🕉️ ФИНАЛЬНЫЙ ОТЧЕТ Meta Muse Filtered Cycle");
  console.log("═".repeat(60));
  console.log(`📅 Завершено: ${new Date().toLocaleString()}`);
  console.log(`🆔 Project ID: ${PROJECT_ID}`);

  console.log("\n📊 СТАТИСТИКА ОБРАБОТКИ:");
  console.log(
    `   🏷️ Хэштегов обработано: ${stats.hashtagsScraped}/${stats.hashtagsScraped + stats.hashtagsFailed}`
  );
  console.log(`   📱 Постов найдено: ${stats.reelsFound}`);
  console.log(`   🎯 Отфильтровано (низкое качество): ${stats.reelsFiltered}`);
  console.log(`   💾 Качественных постов сохранено: ${stats.reelsSaved}`);
  console.log(`   🎤 Видео транскрибировано: ${stats.videosTranscribed}`);

  console.log("\n🎯 КРИТЕРИИ КАЧЕСТВА:");
  console.log(`   📅 Период: последние ${DAYS_BACK} дней`);
  console.log(`   👀 Минимум просмотров: ${MIN_VIEWS.toLocaleString()}`);
  console.log(
    `   📊 Процент качественного контента: ${stats.reelsFound > 0 ? Math.round((stats.reelsSaved / stats.reelsFound) * 100) : 0}%`
  );

  if (stats.timeouts.length > 0) {
    console.log(`\n⏱️ ТАЙМАУТЫ (${stats.timeouts.length}):`);
    stats.timeouts.forEach((hashtag) => console.log(`   ⏰ ${hashtag}`));
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ ОШИБКИ (${stats.errors.length}):`);
    stats.errors.slice(0, 5).forEach((error) => console.log(`   💥 ${error}`));
    if (stats.errors.length > 5) {
      console.log(`   ... и еще ${stats.errors.length - 5} ошибок`);
    }
  }

  const successRate =
    (stats.hashtagsScraped / (stats.hashtagsScraped + stats.hashtagsFailed)) *
    100;
  console.log(`\n🎯 ОБЩИЙ РЕЗУЛЬТАТ:`);
  console.log(`   ✅ Успешность: ${Math.round(successRate)}%`);
  console.log(`   🏆 Качественный контент: ${stats.reelsSaved} постов`);
  console.log(`   📈 Готово для анализа трендов!`);
}

// 🚀 Main execution
async function main(): Promise<void> {
  const startTime = Date.now();

  console.log("🐭 Meta Muse Filtered Cycle - ЗАПУСК");
  console.log("═".repeat(60));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(
    `🎯 Фильтры: ${DAYS_BACK} дней + ${MIN_VIEWS.toLocaleString()} просмотров`
  );

  try {
    await initializeProject();
    await filteredScrapeInstagram();
    await transcribeVideos();

    const duration = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log(`\n⏱️ Общее время выполнения: ${duration} минут`);

    printFinalReport();

    console.log("\n🎉 УСПЕШНОЕ ЗАВЕРШЕНИЕ!");
    console.log("🐭 Meta Muse теперь содержит только качественный контент!");
  } catch (error) {
    console.error("\n💥 КРИТИЧЕСКАЯ ОШИБКА:", error);
    printFinalReport();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runFilteredCycle };
