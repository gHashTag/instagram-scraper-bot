/**
 * Скрипт для проверки статистики базы данных
 */

import dotenv from "dotenv";
import { initializeDBConnection } from "../db/neonDB";
import { reelsTable, competitorsTable, hashtagsTable } from "../db/schema";
import { sql } from "drizzle-orm";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

async function checkDBStats() {
  try {
    logger.info("📊 Проверяем статистику базы данных...");
    
    const db = initializeDBConnection();
    
    // Считаем общее количество Reels
    const reelsCount = await db.select({ count: sql`count(*)` }).from(reelsTable);
    logger.info(`🎬 Всего Reels в базе: ${reelsCount[0].count}`);
    
    // Считаем конкурентов
    const competitorsCount = await db.select({ count: sql`count(*)` }).from(competitorsTable);
    logger.info(`👥 Всего конкурентов: ${competitorsCount[0].count}`);
    
    // Считаем хэштеги
    const hashtagsCount = await db.select({ count: sql`count(*)` }).from(hashtagsTable);
    logger.info(`🏷️ Всего хэштегов: ${hashtagsCount[0].count}`);
    
    // Последние 5 Reels
    const recentReels = await db
      .select({
        id: reelsTable.id,
        author_username: reelsTable.author_username,
        views_count: reelsTable.views_count,
        created_at: reelsTable.created_at
      })
      .from(reelsTable)
      .orderBy(sql`created_at DESC`)
      .limit(5);
    
    logger.info(`🔥 Последние ${recentReels.length} записей:`);
    recentReels.forEach((reel, i) => {
      logger.info(`  ${i+1}. @${reel.author_username} - ${reel.views_count} просмотров (${reel.created_at})`);
    });
    
    // Статистика по просмотрам
    const viewsStats = await db
      .select({
        total_views: sql`sum(views_count)`,
        avg_views: sql`avg(views_count)`,
        max_views: sql`max(views_count)`,
        min_views: sql`min(views_count)`
      })
      .from(reelsTable);
    
    if (viewsStats[0].total_views) {
      logger.info("📈 Статистика просмотров:");
      logger.info(`  Всего просмотров: ${viewsStats[0].total_views}`);
      logger.info(`  Среднее: ${Math.round(Number(viewsStats[0].avg_views))}`);
      logger.info(`  Максимум: ${viewsStats[0].max_views}`);
      logger.info(`  Минимум: ${viewsStats[0].min_views}`);
    }
    
  } catch (error) {
    logger.error("❌ Ошибка при проверке базы данных:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
checkDBStats();
