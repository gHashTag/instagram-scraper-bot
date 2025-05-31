/**
 * Скрипт для создания нового проекта
 * 
 * Использование:
 * bun run src/scripts/create-project.ts <userId> <projectName> [description] [industry]
 * 
 * Параметры:
 * - userId: ID пользователя
 * - projectName: Название проекта
 * - description: (опционально) Описание проекта
 * - industry: (опционально) Отрасль проекта
 */

import { initializeDBConnection } from "../db/neonDB";
import { projectsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error("Использование: bun run src/scripts/create-project.ts <userId> <projectName> [description] [industry]");
  process.exit(1);
}

const userId = args[0];
const projectName = args[1];
const description = args[2] || "";
const industry = args[3] || "";

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Создание нового проекта "${projectName}" для пользователя ${userId}`);
  
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Создаем новый проект
    const result = await db.insert(projectsTable).values({
      user_id: userId,
      name: projectName,
      description,
      industry,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    if (result.length === 0) {
      logger.error("Ошибка: Проект не был создан");
      process.exit(1);
    }
    
    const project = result[0];
    
    logger.info(`Проект успешно создан:`);
    logger.info(`- ID: ${project.id}`);
    logger.info(`- Название: ${project.name}`);
    logger.info(`- Описание: ${project.description || "Не указано"}`);
    logger.info(`- Отрасль: ${project.industry || "Не указана"}`);
    
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при создании проекта:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
