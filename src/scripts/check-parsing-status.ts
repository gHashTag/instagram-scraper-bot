/**
 * Скрипт для проверки статуса парсинга
 * 
 * Использование:
 * bun run src/scripts/check-parsing-status.ts [projectId]
 * 
 * Параметры:
 * - projectId: (опционально) ID проекта для фильтрации
 */

import { initializeDBConnection } from "../db/neonDB";
import { parsingRunsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import { eq, desc } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const projectId = args[0] ? parseInt(args[0], 10) : undefined;

/**
 * Форматирует дату для отображения
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "Не завершено";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch (error) {
    return "Ошибка формата";
  }
}

/**
 * Форматирует продолжительность
 */
function formatDuration(startDate: string | null | undefined, endDate: string | null | undefined): string {
  if (!startDate) return "Неизвестно";
  
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  const durationMs = end.getTime() - start.getTime();
  const seconds = Math.floor(durationMs / 1000);
  
  if (seconds < 60) {
    return `${seconds} сек.`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} мин. ${remainingSeconds} сек.`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ч. ${minutes} мин.`;
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    
    // Формируем запрос
    let query = db.select().from(parsingRunsTable).orderBy(desc(parsingRunsTable.started_at)).limit(10);
    
    // Если указан projectId, добавляем фильтр
    if (projectId !== undefined) {
      query = query.where(eq(parsingRunsTable.project_id, projectId));
      logger.info(`Проверка статуса парсинга для проекта ${projectId}`);
    } else {
      logger.info("Проверка статуса парсинга для всех проектов");
    }
    
    // Выполняем запрос
    const parsingRuns = await query;
    
    if (parsingRuns.length === 0) {
      logger.info("Не найдено записей о парсинге");
      process.exit(0);
    }
    
    logger.info(`Найдено ${parsingRuns.length} записей о парсинге`);
    
    // Выводим информацию о каждом запуске парсинга
    for (const run of parsingRuns) {
      logger.info("\n=== Информация о парсинге ===");
      logger.info(`ID запуска: ${run.run_id}`);
      logger.info(`Проект: ${run.project_id}`);
      logger.info(`Тип источника: ${run.source_type}`);
      logger.info(`Статус: ${run.status}`);
      logger.info(`Начало: ${formatDate(run.started_at)}`);
      logger.info(`Завершение: ${formatDate(run.ended_at)}`);
      logger.info(`Продолжительность: ${formatDuration(run.started_at, run.ended_at)}`);
      logger.info(`Найдено Reels: ${run.reels_found_count}`);
      logger.info(`Добавлено Reels: ${run.reels_added_count}`);
      logger.info(`Ошибок: ${run.errors_count}`);
      logger.info(`Сообщение: ${run.log_message || "Нет сообщения"}`);
      
      if (run.error_details) {
        logger.info("Детали ошибок:");
        logger.info(JSON.stringify(run.error_details, null, 2));
      }
    }
    
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при проверке статуса парсинга:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch(error => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
