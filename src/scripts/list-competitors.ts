/**
 * Скрипт для просмотра конкурентов и их Reels
 * 
 * Использование:
 * bun run src/scripts/list-competitors.ts <projectId>
 * 
 * Параметры:
 * - projectId: ID проекта
 */

import { initializeDBConnection } from "../db/neonDB";
import { competitorsTable, reelsTable } from "../db/schema";
import { eq, and, count } from "drizzle-orm";
import { logger } from "../logger";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error("Использование: bun run src/scripts/list-competitors.ts <projectId>");
  process.exit(1);
}

const projectId = parseInt(args[0], 10);

if (isNaN(projectId)) {
  logger.error("Ошибка: projectId должен быть числом");
  process.exit(1);
}

async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Получаем всех конкурентов проекта
    const competitors = await db.select().from(competitorsTable).where(eq(competitorsTable.project_id, projectId));
    
    console.log(`\nВсего конкурентов для проекта ${projectId}: ${competitors.length}`);
    console.log("=".repeat(50));
    
    // Для каждого конкурента получаем количество Reels
    for (const competitor of competitors) {
      const reelsCount = await db.select({ count: count() }).from(reelsTable).where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "competitor"),
          eq(reelsTable.source_identifier, String(competitor.id))
        )
      );
      
      const reelsWithTranscriptCount = await db.select({ count: count() }).from(reelsTable).where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "competitor"),
          eq(reelsTable.source_identifier, String(competitor.id)),
          eq(reelsTable.transcript != null, true)
        )
      );
      
      console.log(`Конкурент: ${competitor.username} (ID: ${competitor.id})`);
      console.log(`  Активен: ${competitor.is_active ? 'Да' : 'Нет'}`);
      console.log(`  Всего Reels: ${reelsCount[0].count}`);
      console.log(`  Reels с транскрипцией: ${reelsWithTranscriptCount[0].count}`);
      console.log("-".repeat(50));
    }
    
    // Получаем общее количество Reels
    const totalReels = await db.select({ count: count() }).from(reelsTable).where(
      and(
        eq(reelsTable.project_id, projectId),
        eq(reelsTable.source_type, "competitor")
      )
    );
    
    const totalReelsWithTranscript = await db.select({ count: count() }).from(reelsTable).where(
      and(
        eq(reelsTable.project_id, projectId),
        eq(reelsTable.source_type, "competitor"),
        eq(reelsTable.transcript != null, true)
      )
    );
    
    console.log("=".repeat(50));
    console.log(`Общее количество Reels: ${totalReels[0].count}`);
    console.log(`Общее количество Reels с транскрипцией: ${totalReelsWithTranscript[0].count}`);
    
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при получении данных:", error);
    process.exit(1);
  }
}

main();
