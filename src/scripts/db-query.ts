/**
 * Скрипт для выполнения произвольных SQL запросов к базе данных
 * 
 * Использование:
 * bun run src/scripts/db-query.ts "SQL запрос"
 * 
 * Пример:
 * bun run src/scripts/db-query.ts "SELECT id, name FROM projects"
 */

import { initializeDBConnection } from "../db/neonDB";
import { logger } from "../logger";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error("Использование: bun run src/scripts/db-query.ts \"SQL запрос\"");
  process.exit(1);
}

const query = args[0];

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Выполняем запрос
    logger.info(`Выполнение запроса: ${query}`);
    const result = await db.execute(query);
    
    // Выводим результат
    logger.info("Результат запроса:");
    console.table(result.rows);
    
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при выполнении запроса:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
