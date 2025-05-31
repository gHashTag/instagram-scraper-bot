/**
 * Скрипт для подсчета Reels с просмотрами более указанного количества
 * 
 * Использование:
 * bun run src/scripts/count-popular-reels.ts <projectId> [minViews] [daysBack]
 * 
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 */

import { initializeDBConnection } from "../db/neonDB";
import { reelsTable, competitorsTable } from "../db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { logger } from "../logger";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error("Использование: bun run src/scripts/count-popular-reels.ts <projectId> [minViews] [daysBack]");
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack)) {
  logger.error("Ошибка: projectId, minViews и daysBack должны быть числами");
  process.exit(1);
}

async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);
    
    // Получаем всех конкурентов проекта
    const competitors = await db.select().from(competitorsTable).where(eq(competitorsTable.project_id, projectId));
    
    console.log(`\nСтатистика по Reels с просмотрами более ${minViews} за последние ${daysBack} дней`);
    console.log("=".repeat(70));
    
    // Для каждого конкурента получаем количество популярных Reels
    let totalPopularReels = 0;
    
    for (const competitor of competitors) {
      const popularReels = await db.select({ count: count() }).from(reelsTable).where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "competitor"),
          eq(reelsTable.source_identifier, String(competitor.id)),
          gte(reelsTable.views_count || 0, minViews),
          gte(reelsTable.published_at, date30DaysAgo)
        )
      );
      
      const popularReelsCount = popularReels[0].count;
      totalPopularReels += popularReelsCount;
      
      if (popularReelsCount > 0) {
        console.log(`Конкурент: ${competitor.username} (ID: ${competitor.id})`);
        console.log(`  Популярных Reels: ${popularReelsCount}`);
        console.log("-".repeat(70));
      }
    }
    
    // Получаем общее количество популярных Reels
    const allPopularReels = await db.select({ count: count() }).from(reelsTable).where(
      and(
        eq(reelsTable.project_id, projectId),
        eq(reelsTable.source_type, "competitor"),
        gte(reelsTable.views_count || 0, minViews),
        gte(reelsTable.published_at, date30DaysAgo)
      )
    );
    
    console.log("=".repeat(70));
    console.log(`Общее количество популярных Reels: ${allPopularReels[0].count}`);
    
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при получении данных:", error);
    process.exit(1);
  }
}

main();
