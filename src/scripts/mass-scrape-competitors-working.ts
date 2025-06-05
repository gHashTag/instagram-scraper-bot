/**
 * Массовый скрапинг всех конкурентов с рабочим Instagram Reel Scraper
 * Использует проверенный актор ID: xMc5Ga1oCONPmWJIa
 */

import { ApifyClient } from "apify-client";
import { initializeDBConnection, getDB } from "../db/neonDB";
import { competitorsTable, reelsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const apifyToken = process.env.APIFY_TOKEN;
const projectId = parseInt(process.env.DEFAULT_PROJECT_ID || "1");

if (!apifyToken) {
  console.error("APIFY_TOKEN не найден в переменных окружения");
  process.exit(1);
}

// Инициализируем базу данных
initializeDBConnection();
const db = getDB();

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
  videoUrl?: string;
  displayUrl?: string;
  videoDuration?: number;
  productType: string;
}

async function scrapeCompetitorReels(
  username: string
): Promise<InstagramReel[]> {
  console.log(`\n🎬 Скрапинг реклов для: @${username}`);

  const client = new ApifyClient({ token: apifyToken });

  const input = {
    username: [username],
    resultsLimit: 50, // Больше данных для анализа
  };

  try {
    const run = await client.actor("xMc5Ga1oCONPmWJIa").call(input);

    if (run.status !== "SUCCEEDED") {
      console.log(`   ❌ Ошибка скрапинга: ${run.status}`);
      return [];
    }

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`   📊 Получено элементов: ${items.length}`);

    // Фильтруем только reels и сортируем по просмотрам
    const reelsData: InstagramReel[] = items
      .filter((item: any) => item.productType === "clips") // Только reels
      .map((item: any) => ({
        id: item.id,
        shortCode: item.shortCode,
        url: item.url,
        caption: item.caption || "",
        hashtags: item.hashtags || "",
        likesCount: item.likesCount || 0,
        videoPlayCount: item.videoPlayCount || 0,
        commentsCount: item.commentsCount || 0,
        timestamp: item.timestamp,
        ownerUsername: item.ownerUsername,
        videoUrl: item.videoUrl,
        displayUrl: item.displayUrl,
        videoDuration: item.videoDuration || 0,
        productType: item.productType,
      }))
      .sort((a, b) => b.videoPlayCount - a.videoPlayCount); // Сортировка по просмотрам

    return reelsData;
  } catch (error: any) {
    console.error(`   ❌ Ошибка API: ${error.message}`);
    return [];
  }
}

async function saveReelsToDatabase(
  competitorId: number,
  username: string,
  reelsData: InstagramReel[]
): Promise<number> {
  let savedCount = 0;

  for (const reel of reelsData) {
    try {
      // Проверяем, существует ли уже такой reel по URL
      const existingReel = await db
        .select()
        .from(reelsTable)
        .where(eq(reelsTable.reel_url, reel.url))
        .limit(1);

      if (existingReel.length > 0) {
        console.log(`   ⏭️  Пропуск (уже существует): ${reel.shortCode}`);
        continue;
      }

      // Сохраняем новый reel с правильными именами полей
      await db.insert(reelsTable).values({
        project_id: projectId,
        source_type: "competitor",
        source_identifier: competitorId.toString(),
        reel_url: reel.url,
        profile_url: `https://instagram.com/${reel.ownerUsername}`,
        author_username: reel.ownerUsername,
        description: reel.caption || "",
        views_count: reel.videoPlayCount,
        likes_count: reel.likesCount,
        comments_count: reel.commentsCount,
        published_at: new Date(reel.timestamp),
        thumbnail_url: reel.displayUrl,
        video_download_url: reel.videoUrl,
        raw_data: reel, // Сохраняем все исходные данные для анализа
      });

      savedCount++;
      console.log(
        `   ✅ Сохранен: ${reel.shortCode} (${reel.videoPlayCount.toLocaleString()} просм.)`
      );
    } catch (error: any) {
      console.error(
        `   ❌ Ошибка сохранения ${reel.shortCode}: ${error.message}`
      );
    }
  }

  return savedCount;
}

async function massScrapingCompetitors() {
  console.log(`🚀 МАССОВЫЙ СКРАПИНГ КОНКУРЕНТОВ`);
  console.log(`🔑 Токен: ${apifyToken}`);
  console.log(`🏗️  Проект ID: ${projectId}`);
  console.log(`===============================\n`);

  // Получаем всех конкурентов из базы
  const competitorsList = await db
    .select()
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, projectId));

  console.log(`👥 Найдено конкурентов: ${competitorsList.length}`);

  let totalSaved = 0;
  let totalScraped = 0;

  for (const competitor of competitorsList) {
    const username = competitor.username.replace("@", "");
    console.log(`\n🎯 Обрабатываем: @${username} (ID: ${competitor.id})`);

    const reelsData = await scrapeCompetitorReels(username);
    totalScraped += reelsData.length;

    if (reelsData.length > 0) {
      // Показываем топ-3 по просмотрам
      console.log(`\n🔥 ТОП-3 REELS от @${username}:`);
      reelsData.slice(0, 3).forEach((reel, i) => {
        console.log(
          `   ${i + 1}. ${reel.videoPlayCount.toLocaleString()} просм. - ${reel.shortCode}`
        );
      });

      // Фильтруем viral content (50K+ просмотров как требует пользователь)
      const viralReels = reelsData.filter(
        (reel) => reel.videoPlayCount >= 50000
      );
      console.log(
        `\n🌟 VIRAL CONTENT (50K+): ${viralReels.length} из ${reelsData.length}`
      );

      // Сохраняем в базу
      const savedCount = await saveReelsToDatabase(
        competitor.id,
        username,
        reelsData
      );
      totalSaved += savedCount;

      // Обновляем последнее время скрапинга
      await db
        .update(competitorsTable)
        .set({
          last_scraped_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(competitorsTable.id, competitor.id));

      console.log(`   📊 Результат: ${savedCount} новых reels сохранено`);
    } else {
      console.log(`   ⚠️  Нет данных для @${username}`);
    }

    // Небольшая пауза между запросами
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`\n🎉 ИТОГОВАЯ СТАТИСТИКА:`);
  console.log(`   📊 Всего конкурентов обработано: ${competitorsList.length}`);
  console.log(`   🎬 Всего reels получено: ${totalScraped}`);
  console.log(`   💾 Всего reels сохранено: ${totalSaved}`);
  console.log(`   🌟 Готово для анализа viral content (50K+)!`);
}

if (require.main === module) {
  massScrapingCompetitors()
    .then(() => {
      console.log("\n✅ Массовый скрапинг завершен!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Критическая ошибка:", error);
      process.exit(1);
    });
}

export { massScrapingCompetitors };
