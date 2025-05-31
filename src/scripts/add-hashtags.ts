/**
 * Скрипт для добавления хэштегов в базу данных
 * 
 * Использование:
 * bun run src/scripts/add-hashtags.ts <projectId> <hashtag1,hashtag2,...>
 * 
 * Параметры:
 * - projectId: ID проекта
 * - hashtags: Список хэштегов через запятую (без символа #)
 */

import { initializeDBConnection } from "../db/neonDB";
import { hashtagsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import { eq, and } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error("Использование: bun run src/scripts/add-hashtags.ts <projectId> <hashtag1,hashtag2,...>");
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const hashtagsArg = args[1];

if (isNaN(projectId)) {
  logger.error("Ошибка: projectId должен быть числом");
  process.exit(1);
}

// Разбиваем строку хэштегов на массив
const hashtags = hashtagsArg.split(",").map(tag => tag.trim().replace(/^#/, ""));

if (hashtags.length === 0) {
  logger.error("Ошибка: Не указаны хэштеги");
  process.exit(1);
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Добавление хэштегов для проекта ${projectId}`);
  logger.info(`Хэштеги: ${hashtags.map(tag => `#${tag}`).join(", ")}`);
  
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    let addedCount = 0;
    let existingCount = 0;
    let errorCount = 0;
    
    // Добавляем каждый хэштег
    for (const tag of hashtags) {
      try {
        // Проверяем, существует ли уже такой хэштег в проекте
        const existingHashtags = await db.select()
          .from(hashtagsTable)
          .where(
            and(
              eq(hashtagsTable.project_id, projectId),
              eq(hashtagsTable.tag_name, tag)
            )
          );
        
        if (existingHashtags.length > 0) {
          logger.info(`Хэштег #${tag} уже существует в проекте ${projectId}`);
          existingCount++;
          continue;
        }
        
        // Добавляем новый хэштег
        await db.insert(hashtagsTable).values({
          project_id: projectId,
          tag_name: tag,
          notes: "Добавлен через скрипт add-hashtags.ts",
          is_active: true,
          added_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });
        
        logger.info(`Хэштег #${tag} успешно добавлен в проект ${projectId}`);
        addedCount++;
      } catch (error) {
        logger.error(`Ошибка при добавлении хэштега #${tag}:`, error);
        errorCount++;
      }
    }
    
    logger.info(`\nИтоги добавления хэштегов:`);
    logger.info(`- Добавлено: ${addedCount}`);
    logger.info(`- Уже существовало: ${existingCount}`);
    logger.info(`- Ошибок: ${errorCount}`);
    
    process.exit(0);
  } catch (error) {
    logger.error("Критическая ошибка при выполнении скрипта:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
