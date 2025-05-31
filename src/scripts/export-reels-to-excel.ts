/**
 * Скрипт для экспорта Reels в Excel файл
 *
 * Использование:
 * bun run src/scripts/export-reels-to-excel.ts <projectId> [sourceType] [sourceId] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - sourceType: (опционально) Тип источника (competitor или hashtag, по умолчанию все)
 * - sourceId: (опционально) ID источника (по умолчанию все)
 * - outputPath: (опционально) Путь для сохранения файла (по умолчанию ./exports)
 */

import { initializeDBConnection } from "../db/neonDB";
import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as ExcelJS from "exceljs";

import { ReelContent } from "../types";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/export-reels-to-excel.ts <projectId> [sourceType] [sourceId] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const sourceType = args[1] || "all"; // "competitor", "hashtag" или "all"
const sourceId = args[2] ? parseInt(args[2], 10) : 0; // 0 означает все источники
const outputPath = args[3] || "./exports";

if (isNaN(projectId) || (sourceId !== 0 && isNaN(sourceId))) {
  logger.error("Ошибка: projectId и sourceId должны быть числами");
  process.exit(1);
}

if (
  sourceType !== "competitor" &&
  sourceType !== "hashtag" &&
  sourceType !== "all"
) {
  logger.error(
    "Ошибка: sourceType должен быть 'competitor', 'hashtag' или 'all'"
  );
  process.exit(1);
}

/**
 * Получает Reels из базы данных
 */
async function getReelsFromDB(
  db,
  projectId: number,
  sourceType: string,
  sourceId: number
) {
  // Используем Drizzle ORM для запросов
  const { reelsTable } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  try {
    let query = db
      .select()
      .from(reelsTable)
      .where(eq(reelsTable.project_id, projectId));

    if (sourceType !== "all") {
      query = query.where(eq(reelsTable.source_type, sourceType));

      if (sourceId !== 0) {
        query = query.where(eq(reelsTable.source_identifier, String(sourceId)));
      }
    }

    // Сортировка по дате публикации (от новых к старым)
    const reels = await query.orderBy(reelsTable.published_at);

    return reels;
  } catch (error) {
    logger.error("Ошибка при получении Reels из базы данных:", error);
    throw error;
  }
}

/**
 * Создает директорию, если она не существует
 */
function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Экспортирует Reels в Excel файл
 */
async function exportReelsToExcel(
  reels: ReelContent[],
  outputPath: string,
  projectId: number,
  sourceType: string,
  sourceId: number
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Reels");

  // Определяем заголовки
  worksheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "URL", key: "url", width: 50 },
    { header: "Тип источника", key: "source_type", width: 15 },
    { header: "Профиль", key: "profile_url", width: 50 },
    { header: "Автор", key: "author_username", width: 20 },
    { header: "Описание", key: "description", width: 100 },
    { header: "Просмотры", key: "views", width: 15 },
    { header: "Лайки", key: "likes", width: 15 },
    { header: "Комментарии", key: "comments_count", width: 15 },
    { header: "Дата публикации", key: "published_at", width: 20 },
    { header: "Длительность", key: "duration", width: 15 },
    { header: "Превью", key: "thumbnail_url", width: 50 },
    { header: "Аудио URL", key: "audio_url", width: 30 },
    { header: "Название песни", key: "song_name", width: 30 },
    { header: "Исполнитель", key: "artist_name", width: 30 },
    { header: "Транскрипция", key: "transcript", width: 100 },
    { header: "Добавлено", key: "created_at", width: 20 },
    { header: "Обновлено", key: "updated_at", width: 20 },
  ];

  // Добавляем данные
  reels.forEach((reel: ReelContent) => {
    worksheet.addRow({
      id: reel.id,
      url: reel.url,
      profile_url: reel.profile_url ?? "",
      author_username: reel.author_username ?? "",
      description: reel.description ?? "",
      views: reel.views ?? 0,
      likes: reel.likes ?? 0,
      comments_count: reel.comments_count ?? 0,
      published_at: reel.published_at
        ? new Date(reel.published_at).toLocaleString()
        : "",
      duration: reel.duration ?? 0,
      thumbnail_url: reel.thumbnail_url ?? "",
      audio_url: reel.audio_url ?? "",
      song_name: reel.song_name ?? "",
      artist_name: reel.artist_name ?? "",
      transcript: reel.transcript ?? "",
      created_at: reel.created_at
        ? new Date(reel.created_at).toLocaleString()
        : "",
      updated_at: reel.updated_at
        ? new Date(reel.updated_at).toLocaleString()
        : "",
      project_id: reel.project_id,
      source_type: reel.source_type,
    });
  });

  // Форматируем заголовки
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

  // Создаем директорию, если она не существует
  ensureDirectoryExists(outputPath);

  // Формируем имя файла
  const sourceTypeStr =
    sourceType === "all" ? "all" : `${sourceType}_${sourceId}`;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `reels_project_${projectId}_${sourceTypeStr}_${timestamp}.xlsx`;
  const filePath = path.join(outputPath, fileName);

  // Сохраняем файл
  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(`Запуск экспорта Reels для проекта ${projectId}`);

  if (sourceType !== "all") {
    logger.info(
      `Фильтр: тип источника = ${sourceType}, ID источника = ${sourceId || "все"}`
    );
  }

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Получаем Reels из базы данных
    const reels = await getReelsFromDB(db, projectId, sourceType, sourceId);

    if (reels.length === 0) {
      logger.error(
        `Не найдено Reels для проекта ${projectId} с указанными параметрами`
      );
      process.exit(1);
    }

    logger.info(`Найдено ${reels.length} Reels для экспорта`);

    // Экспортируем Reels в Excel
    const filePath = await exportReelsToExcel(
      reels,
      outputPath,
      projectId,
      sourceType,
      sourceId
    );

    logger.info(`Экспорт завершен. Файл сохранен: ${filePath}`);
  } catch (error) {
    logger.error("Критическая ошибка при выполнении экспорта:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
