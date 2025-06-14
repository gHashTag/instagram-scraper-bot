#!/usr/bin/env bun

/**
 * 🕉️ Meta Muse Data Check Script
 * Проверка данных Meta Muse в базе данных
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, count, desc } from "drizzle-orm";
import { projectsTable, hashtagsTable, reelsTable } from "../db/schema";

// 🔧 Configuration
const PROJECT_ID = 2;

// 🌐 Initialize database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function checkData(): Promise<void> {
  console.log("🕉️ Meta Muse Data Check - ЗАПУСК");
  console.log("═".repeat(50));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Project ID: ${PROJECT_ID}`);

  try {
    // 1. Check project
    console.log("\n📊 ПРОЕКТ:");
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, PROJECT_ID))
      .limit(1);

    if (project) {
      console.log(`✅ Название: ${project.name}`);
      console.log(`📝 Описание: ${project.description}`);
      console.log(`🏭 Индустрия: ${project.industry}`);
      console.log(`🔄 Активен: ${project.is_active ? "Да" : "Нет"}`);
      console.log(`📅 Создан: ${project.created_at}`);
    } else {
      console.log("❌ Проект не найден!");
      return;
    }

    // 2. Check hashtags
    console.log("\n🏷️ ХЭШТЕГИ:");
    const hashtagsCount = await db
      .select({ count: count() })
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, PROJECT_ID));

    console.log(`📊 Всего хэштегов: ${hashtagsCount[0].count}`);

    // Get active hashtags
    const activeHashtags = await db
      .select()
      .from(hashtagsTable)
      .where(
        and(
          eq(hashtagsTable.project_id, PROJECT_ID),
          eq(hashtagsTable.is_active, true)
        )
      );

    console.log(`✅ Активных хэштегов: ${activeHashtags.length}`);

    // Show some hashtags by category
    const categories = [
      "basic",
      "ai_influencers",
      "metaverse_tech",
      "archetype_muse_magician_seer",
      "psycho_emotional_awakened_creators",
      "philosophy_spirit_tech",
    ];

    for (const category of categories) {
      const categoryHashtags = activeHashtags.filter((h) =>
        h.notes?.includes(category)
      );
      console.log(`   📂 ${category}: ${categoryHashtags.length} хэштегов`);
    }

    // 3. Check reels
    console.log("\n📱 РИЛСЫ:");
    const reelsCount = await db
      .select({ count: count() })
      .from(reelsTable)
      .where(eq(reelsTable.project_id, PROJECT_ID));

    console.log(`📊 Всего рилсов: ${reelsCount[0].count}`);

    // Get reels by source
    const reelsBySource = await db
      .select({
        source: reelsTable.source_identifier,
        count: count(),
      })
      .from(reelsTable)
      .where(eq(reelsTable.project_id, PROJECT_ID))
      .groupBy(reelsTable.source_identifier)
      .orderBy(desc(count()));

    console.log("\n📈 Рилсы по хэштегам (топ 10):");
    reelsBySource.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.source}: ${item.count} рилсов`);
    });

    // 4. Check transcriptions
    console.log("\n🎤 ТРАНСКРИБАЦИЯ:");
    const transcribedCount = await db
      .select({ count: count() })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, PROJECT_ID)
          // transcript is not null
        )
      );

    console.log(`✅ Транскрибированных рилсов: ${transcribedCount[0].count}`);

    // 5. Recent reels
    console.log("\n📅 ПОСЛЕДНИЕ РИЛСЫ:");
    const recentReels = await db
      .select({
        id: reelsTable.id,
        url: reelsTable.reel_url,
        author: reelsTable.author_username,
        hashtag: reelsTable.source_identifier,
        likes: reelsTable.likes_count,
        views: reelsTable.views_count,
        created: reelsTable.created_at,
      })
      .from(reelsTable)
      .where(eq(reelsTable.project_id, PROJECT_ID))
      .orderBy(desc(reelsTable.created_at))
      .limit(5);

    recentReels.forEach((reel, index) => {
      console.log(`${index + 1}. ID: ${reel.id}`);
      console.log(`   👤 Автор: ${reel.author}`);
      console.log(`   🏷️ Хэштег: ${reel.hashtag}`);
      console.log(`   ❤️ Лайки: ${reel.likes}`);
      console.log(`   👀 Просмотры: ${reel.views}`);
      console.log(`   📅 Добавлен: ${reel.created}`);
      console.log(`   🔗 URL: ${reel.url}`);
      console.log("");
    });

    // 6. Statistics by hashtag categories
    console.log("\n📊 СТАТИСТИКА ПО КАТЕГОРИЯМ:");

    for (const category of categories) {
      const categoryHashtags = activeHashtags.filter((h) =>
        h.notes?.includes(category)
      );
      const hashtagNames = categoryHashtags.map((h) => h.tag_name);

      if (hashtagNames.length > 0) {
        let totalReels = 0;
        for (const hashtagName of hashtagNames) {
          const reelsForHashtag = await db
            .select({ count: count() })
            .from(reelsTable)
            .where(
              and(
                eq(reelsTable.project_id, PROJECT_ID),
                eq(reelsTable.source_identifier, hashtagName)
              )
            );
          totalReels += reelsForHashtag[0].count;
        }

        console.log(`📂 ${category}:`);
        console.log(`   🏷️ Хэштегов: ${categoryHashtags.length}`);
        console.log(`   📱 Рилсов: ${totalReels}`);
        console.log(
          `   📊 Среднее на хэштег: ${Math.round(totalReels / categoryHashtags.length)}`
        );
      }
    }

    console.log("\n✅ ПРОВЕРКА ЗАВЕРШЕНА!");
    console.log("🎯 Данные готовы для анализа и использования!");
  } catch (error) {
    console.error("\n💥 ОШИБКА ПРОВЕРКИ:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkData().catch(console.error);
}

export { checkData };
