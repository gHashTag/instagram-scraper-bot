#!/usr/bin/env bun

/**
 * 🕉️ Meta Muse Quick Test Script
 * Быстрый тест скрепинга одного хэштега для проверки работы
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import {
  usersTable,
  projectsTable,
  hashtagsTable,
  reelsTable,
} from "../db/schema";
import { ApifyClient } from "apify-client";

// 🔧 Configuration
const PROJECT_ID = 2;

// 🌐 Initialize database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// 🌐 Initialize Apify client
const apifyClient = new ApifyClient({
  token: process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN!,
});

async function quickTest(): Promise<void> {
  console.log("🕉️ Meta Muse Quick Test - ЗАПУСК");
  console.log("═".repeat(40));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);

  try {
    // Test environment variables
    console.log("\n🔧 Проверка переменных окружения:");
    console.log(
      `✅ DATABASE_URL: ${process.env.DATABASE_URL ? "Установлен" : "❌ Отсутствует"}`
    );
    console.log(
      `✅ APIFY_TOKEN: ${process.env.APIFY_TOKEN ? "Установлен" : "❌ Отсутствует"}`
    );
    console.log(
      `✅ OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "Установлен" : "❌ Отсутствует"}`
    );

    // Test database connection
    console.log("\n🗄️ Тест подключения к базе данных:");
    const [user] = await db.select().from(usersTable).limit(1);
    console.log(`✅ Пользователь найден: ${user?.email || "N/A"}`);

    // Get project
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, PROJECT_ID))
      .limit(1);
    console.log(`✅ Проект найден: ${project?.name || "N/A"}`);

    // Get one hashtag for testing
    const [testHashtag] = await db
      .select()
      .from(hashtagsTable)
      .where(
        and(
          eq(hashtagsTable.project_id, PROJECT_ID),
          eq(hashtagsTable.is_active, true)
        )
      )
      .limit(1);

    if (!testHashtag) {
      throw new Error("Нет активных хэштегов для тестирования");
    }

    console.log(`✅ Тестовый хэштег: ${testHashtag.tag_name}`);

    // Test Apify scraping
    console.log("\n🕷️ Тест Apify скрепинга:");
    console.log(`🏷️ Скрепинг: ${testHashtag.tag_name}`);

    const run = await apifyClient
      .actor("apify/instagram-hashtag-scraper")
      .call({
        hashtags: [testHashtag.tag_name.replace("#", "")],
        resultsLimit: 3, // Только 3 поста для теста
        addParentData: false,
      });

    console.log(`⏳ Ожидание завершения скрепинга...`);
    console.log(`🆔 Run ID: ${run.id}`);

    // Get results
    const { items } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    console.log(
      `📊 Найдено ${items.length} постов для ${testHashtag.tag_name}`
    );

    if (items.length > 0) {
      console.log("\n📱 Пример поста:");
      const firstItem = items[0];
      console.log(`🆔 ID: ${firstItem.id}`);
      console.log(`📝 Caption: ${firstItem.caption?.substring(0, 100)}...`);
      console.log(`👤 Author: ${firstItem.ownerUsername}`);
      console.log(`❤️ Likes: ${firstItem.likesCount}`);
      console.log(`💬 Comments: ${firstItem.commentsCount}`);
      console.log(`👀 Views: ${firstItem.viewsCount}`);
      console.log(`🔗 URL: ${firstItem.url}`);

      // Save one test reel
      try {
        const [existing] = await db
          .select()
          .from(reelsTable)
          .where(eq(reelsTable.reel_url, firstItem.url))
          .limit(1);

        if (!existing) {
          await db.insert(reelsTable).values({
            project_id: PROJECT_ID,
            reel_url: firstItem.url,
            source_type: "hashtag",
            source_identifier: testHashtag.tag_name,
            author_username: firstItem.ownerUsername || "",
            description: firstItem.caption || "",
            views_count: firstItem.viewsCount || 0,
            likes_count: firstItem.likesCount || 0,
            comments_count: firstItem.commentsCount || 0,
            published_at: firstItem.timestamp
              ? new Date(firstItem.timestamp)
              : null,
            thumbnail_url: firstItem.displayUrl || null,
            video_download_url: firstItem.videoUrl || null,
            raw_data: firstItem,
            created_at: new Date(),
            updated_at: new Date(),
          });
          console.log(`💾 Тестовый пост сохранен в базу данных`);
        } else {
          console.log(`⚠️ Пост уже существует в базе данных`);
        }
      } catch (error) {
        console.error(`❌ Ошибка сохранения: ${error}`);
      }
    }

    console.log("\n✅ БЫСТРЫЙ ТЕСТ ЗАВЕРШЕН УСПЕШНО!");
    console.log(
      "🚀 Apify работает, база данных подключена, всё готово для полного скрепинга!"
    );
  } catch (error) {
    console.error("\n💥 ОШИБКА ТЕСТА:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  quickTest().catch(console.error);
}

export { quickTest };
