/**
 * Скрипт для проверки транскрипций Reels
 *
 * Использование:
 * bun run src/scripts/check-transcriptions.ts <projectId> [minViews] [daysBack]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 */

import { initializeDBConnection } from "../db/neonDB";
import { reelsTable, competitorsTable } from "../db/schema";
import { eq, and, gte } from "drizzle-orm";
import { logger } from "../logger";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/check-transcriptions.ts <projectId> [minViews] [daysBack]"
  );
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
    const competitors = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.project_id, projectId));

    // Создаем карту конкурентов для быстрого доступа
    const competitorMap = new Map(
      competitors.map((c) => [String(c.id), c.username])
    );

    // Получаем все Reels с минимальным количеством просмотров за последние N дней
    const reels = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "competitor"),
          gte(reelsTable.views_count || 0, minViews),
          gte(reelsTable.published_at, date30DaysAgo)
        )
      );

    console.log(
      `\nНайдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );

    // Подсчитываем Reels с транскрипцией и без
    const reelsWithTranscript = reels.filter(
      (reel) => reel.transcript !== null
    );
    const reelsWithoutTranscript = reels.filter(
      (reel) => reel.transcript === null
    );

    console.log(`Reels с транскрипцией: ${reelsWithTranscript.length}`);
    console.log(`Reels без транскрипции: ${reelsWithoutTranscript.length}`);

    // Группируем Reels по конкурентам
    const reelsByCompetitor = new Map<string, any[]>();

    for (const reel of reels) {
      const competitorId = reel.source_identifier;
      if (!competitorId) {
        continue;
      }
      if (!reelsByCompetitor.has(competitorId)) {
        reelsByCompetitor.set(competitorId, []);
      }
      reelsByCompetitor.get(competitorId)!.push(reel);
    }

    console.log("\nСтатистика по конкурентам:");
    console.log("=".repeat(70));

    // Для каждого конкурента выводим статистику
    for (const [competitorId, competitorReels] of reelsByCompetitor.entries()) {
      const competitorName =
        competitorMap.get(competitorId) || `Конкурент ${competitorId}`;

      const reelsWithTranscript = competitorReels.filter(
        (reel) => reel.transcript !== null
      );
      const reelsWithoutTranscript = competitorReels.filter(
        (reel) => reel.transcript === null
      );

      console.log(`Конкурент: ${competitorName} (ID: ${competitorId})`);
      console.log(`  Всего Reels: ${competitorReels.length}`);
      console.log(`  Reels с транскрипцией: ${reelsWithTranscript.length}`);
      console.log(`  Reels без транскрипции: ${reelsWithoutTranscript.length}`);

      // Выводим примеры транскрипций
      if (reelsWithTranscript.length > 0) {
        console.log("\n  Примеры транскрипций:");
        for (let i = 0; i < Math.min(3, reelsWithTranscript.length); i++) {
          const reel = reelsWithTranscript[i];
          console.log(`  Reel ID: ${reel.id}`);
          console.log(`  URL: ${reel.reel_url}`);
          console.log(
            `  Транскрипция: ${reel.transcript?.substring(0, 100)}${reel.transcript && reel.transcript.length > 100 ? "..." : ""}`
          );
          console.log("-".repeat(70));
        }
      }
    }

    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при получении данных:", error);
    process.exit(1);
  }
}

main();
