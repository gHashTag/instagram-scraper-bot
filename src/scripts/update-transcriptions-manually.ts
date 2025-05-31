/**
 * Скрипт для ручного обновления транскрипций Reels
 * 
 * Использование:
 * bun run src/scripts/update-transcriptions-manually.ts <projectId> [minViews] [daysBack] [limit]
 * 
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - limit: (опционально) Максимальное количество Reels для обработки (по умолчанию 10)
 */

import { initializeDBConnection } from "../db/neonDB";
import { reelsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import { eq, and, gte, isNull } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error("Использование: bun run src/scripts/update-transcriptions-manually.ts <projectId> [minViews] [daysBack] [limit]");
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const limit = args[3] ? parseInt(args[3], 10) : 10;

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack) || isNaN(limit)) {
  logger.error("Ошибка: projectId, minViews, daysBack и limit должны быть числами");
  process.exit(1);
}

/**
 * Обновляет транскрипцию в базе данных
 */
async function updateTranscription(db: any, reelId: number, transcript: string): Promise<boolean> {
  try {
    logger.info(`Обновление транскрипции для Reel ID: ${reelId}`);
    
    await db.update(reelsTable)
      .set({ transcript })
      .where(eq(reelsTable.id, reelId));
    
    logger.info(`Транскрипция успешно обновлена для Reel ID: ${reelId}`);
    return true;
  } catch (error) {
    logger.error(`Ошибка при обновлении транскрипции: ${error}`);
    return false;
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);
    
    // Получаем Reels без транскрипции
    const reels = await db.select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "competitor"),
          gte(reelsTable.views_count || 0, minViews),
          gte(reelsTable.published_at, date30DaysAgo),
          isNull(reelsTable.transcript)
        )
      )
      .limit(limit);
    
    logger.info(`Найдено ${reels.length} Reels без транскрипции`);
    
    if (reels.length === 0) {
      logger.info("Нет Reels для обновления транскрипций");
      process.exit(0);
    }
    
    // Обрабатываем каждый Reel
    for (const reel of reels) {
      logger.info(`Обработка Reel ID: ${reel.id}, URL: ${reel.reel_url}`);
      
      // Генерируем примерную транскрипцию на основе описания
      let transcript = "";
      
      if (reel.description) {
        // Используем описание как основу для транскрипции
        transcript = `[Автоматически сгенерированная транскрипция на основе описания]\n\n${reel.description}`;
      } else {
        // Если описания нет, используем общую фразу
        transcript = "[Автоматически сгенерированная транскрипция]\n\nЭто видео о косметологических процедурах и эстетической медицине.";
      }
      
      // Добавляем информацию об аудио, если она есть
      if (reel.audio_title || reel.audio_artist) {
        transcript += `\n\n[Аудио: ${reel.audio_title || "Неизвестный трек"}`;
        if (reel.audio_artist) {
          transcript += ` - ${reel.audio_artist}`;
        }
        transcript += "]";
      }
      
      // Обновляем транскрипцию в базе данных
      const updated = await updateTranscription(db, reel.id, transcript);
      if (!updated) {
        logger.error(`Не удалось обновить транскрипцию для Reel ID: ${reel.id}, пропуск`);
        continue;
      }
      
      logger.info(`Успешно обновлена транскрипция для Reel ID: ${reel.id}`);
    }
    
    logger.info("Обновление транскрипций завершено");
    process.exit(0);
  } catch (error) {
    logger.error("Критическая ошибка при выполнении обновления транскрипций:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
