#!/usr/bin/env bun

/**
 * 🧹 Meta Muse Clear Old Data
 * Очистка старых данных Meta Muse перед обновлением с новыми фильтрами
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, count } from "drizzle-orm";
import { hashtagsTable, reelsTable } from "../db/schema";

// 🔧 Configuration
const PROJECT_ID = 2;

// 🌐 Initialize database
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function clearOldData(): Promise<void> {
  console.log("🧹 Meta Muse Clear Old Data - ЗАПУСК");
  console.log("═".repeat(50));
  console.log(`📅 Дата: ${new Date().toLocaleString()}`);
  console.log(`🆔 Project ID: ${PROJECT_ID}`);

  try {
    // 1. Check current data
    console.log("\n📊 ТЕКУЩИЕ ДАННЫЕ:");

    const currentReels = await db
      .select({ count: count() })
      .from(reelsTable)
      .where(eq(reelsTable.project_id, PROJECT_ID));

    const currentHashtags = await db
      .select({ count: count() })
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, PROJECT_ID));

    console.log(`📱 Рилсов: ${currentReels[0].count}`);
    console.log(`🏷️ Хэштегов: ${currentHashtags[0].count}`);

    // 2. Confirm deletion
    console.log("\n⚠️ ВНИМАНИЕ: Будут удалены ВСЕ данные Meta Muse!");
    console.log("🎯 Причина: Обновление фильтров (2 недели + 50K просмотров)");

    // 3. Delete reels first (foreign key constraint)
    console.log("\n🗑️ УДАЛЕНИЕ РИЛСОВ...");
    await db.delete(reelsTable).where(eq(reelsTable.project_id, PROJECT_ID));

    console.log(`✅ Удалено рилсов: ${currentReels[0].count}`);

    // 4. Delete hashtags
    console.log("\n🗑️ УДАЛЕНИЕ ХЭШТЕГОВ...");
    await db
      .delete(hashtagsTable)
      .where(eq(hashtagsTable.project_id, PROJECT_ID));

    console.log(`✅ Удалено хэштегов: ${currentHashtags[0].count}`);

    // 5. Verify cleanup
    console.log("\n🔍 ПРОВЕРКА ОЧИСТКИ:");

    const remainingReels = await db
      .select({ count: count() })
      .from(reelsTable)
      .where(eq(reelsTable.project_id, PROJECT_ID));

    const remainingHashtags = await db
      .select({ count: count() })
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, PROJECT_ID));

    console.log(`📱 Оставшихся рилсов: ${remainingReels[0].count}`);
    console.log(`🏷️ Оставшихся хэштегов: ${remainingHashtags[0].count}`);

    if (remainingReels[0].count === 0 && remainingHashtags[0].count === 0) {
      console.log("\n✅ ОЧИСТКА ЗАВЕРШЕНА УСПЕШНО!");
      console.log("🎯 Готово к загрузке данных с новыми фильтрами:");
      console.log("   📅 За последние 2 недели");
      console.log("   👀 Больше 50,000 просмотров");
    } else {
      console.log("\n⚠️ ВНИМАНИЕ: Не все данные удалены!");
    }
  } catch (error) {
    console.error("\n💥 ОШИБКА ОЧИСТКИ:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  clearOldData().catch(console.error);
}

export { clearOldData };
