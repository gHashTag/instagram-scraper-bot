/**
 * Скрипт для экспорта Reels от конкурентов в Excel
 *
 * Использование:
 * bun run src/scripts/export-competitor-reels.ts <projectId> [minViews] [daysBack] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию exports/competitor_reels_<timestamp>.xlsx)
 */

import { initializeDBConnection } from "../db/neonDB";
import { reelsTable, competitorsTable, projectsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import { eq, and, gte } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/export-competitor-reels.ts <projectId> [minViews] [daysBack] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const timestamp = new Date().toISOString().replace(/:/g, "-");
const defaultFilename = `competitor_reels_${projectId}_${timestamp}.xlsx`;
const outputPath =
  args[3] || path.join(process.cwd(), "exports", defaultFilename);

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack)) {
  logger.error("Ошибка: projectId, minViews и daysBack должны быть числами");
  process.exit(1);
}

// Создаем директорию для экспорта, если она не существует
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Форматирует дату для отображения
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "";
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Получаем информацию о проекте
    const projects = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));

    if (projects.length === 0) {
      logger.error(`Проект с ID ${projectId} не найден`);
      process.exit(1);
    }

    const projectName = projects[0].name;

    logger.info(
      `Экспорт Reels от конкурентов для проекта ${projectId} (${projectName}) с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );
    logger.info(`Файл будет сохранен в: ${outputPath}`);

    // Получаем всех конкурентов проекта
    const competitors = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.project_id, projectId));

    if (competitors.length === 0) {
      logger.error(`В проекте ${projectId} не найдено конкурентов`);
      process.exit(1);
    }

    logger.info(
      `Найдено ${competitors.length} конкурентов для проекта ${projectId}`
    );

    // Создаем карту конкурентов для быстрого доступа
    const competitorMap = new Map(
      competitors.map((c) => [String(c.id), c.username])
    );

    // Создаем Excel файл
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Instagram Scraper Bot";
    workbook.created = new Date();

    // Создаем лист для сводной информации
    const summarySheet = workbook.addWorksheet("Сводка");

    // Устанавливаем заголовки для сводной информации
    summarySheet.columns = [
      { header: "Конкурент", key: "competitor", width: 20 },
      { header: "Количество Reels", key: "reelsCount", width: 20 },
      { header: "Средние просмотры", key: "avgViews", width: 20 },
      { header: "Максимальные просмотры", key: "maxViews", width: 20 },
      { header: "Минимальные просмотры", key: "minViews", width: 20 },
      { header: "Средние лайки", key: "avgLikes", width: 20 },
      { header: "Средние комментарии", key: "avgComments", width: 20 },
    ];

    // Стиль для заголовков
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Создаем лист для всех Reels
    const allReelsSheet = workbook.addWorksheet("Все Reels");

    // Устанавливаем заголовки для всех Reels
    allReelsSheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Конкурент", key: "competitor", width: 20 },
      { header: "URL", key: "url", width: 40 },
      { header: "Автор", key: "author", width: 20 },
      { header: "Описание", key: "description", width: 50 },
      { header: "Просмотры", key: "views", width: 15 },
      { header: "Лайки", key: "likes", width: 15 },
      { header: "Комментарии", key: "comments", width: 15 },
      { header: "Дата публикации", key: "publishedDate", width: 20 },
      { header: "Название аудио", key: "audioTitle", width: 30 },
      { header: "Исполнитель", key: "audioArtist", width: 30 },
      { header: "Транскрипция", key: "transcript", width: 50 },
    ];

    // Стиль для заголовков
    allReelsSheet.getRow(1).font = { bold: true };
    allReelsSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Получаем все Reels от конкурентов с минимальным количеством просмотров за последние N дней
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

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

    logger.info(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );

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

    // Для каждого конкурента создаем отдельный лист и собираем статистику
    for (const [competitorId, competitorReels] of reelsByCompetitor.entries()) {
      const competitorName =
        competitorMap.get(competitorId) || `Конкурент ${competitorId}`;

      logger.info(
        `Обработка ${competitorReels.length} Reels для конкурента ${competitorName}`
      );

      // Создаем лист для конкурента
      const competitorSheet = workbook.addWorksheet(competitorName);

      // Устанавливаем заголовки
      competitorSheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "URL", key: "url", width: 40 },
        { header: "Автор", key: "author", width: 20 },
        { header: "Описание", key: "description", width: 50 },
        { header: "Просмотры", key: "views", width: 15 },
        { header: "Лайки", key: "likes", width: 15 },
        { header: "Комментарии", key: "comments", width: 15 },
        { header: "Дата публикации", key: "publishedDate", width: 20 },
        { header: "Название аудио", key: "audioTitle", width: 30 },
        { header: "Исполнитель", key: "audioArtist", width: 30 },
        { header: "Транскрипция", key: "transcript", width: 50 },
      ];

      // Стиль для заголовков
      competitorSheet.getRow(1).font = { bold: true };
      competitorSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };

      // Добавляем данные
      for (const reel of competitorReels) {
        // Добавляем в лист конкурента
        competitorSheet.addRow({
          id: reel.id,
          url: reel.reel_url,
          author: reel.author_username,
          description: reel.description,
          views: reel.views_count,
          likes: reel.likes_count,
          comments: reel.comments_count,
          publishedDate: formatDate(reel.published_at),
          audioTitle: reel.audio_title,
          audioArtist: reel.audio_artist,
          transcript: reel.transcript,
        });

        // Добавляем в общий лист
        allReelsSheet.addRow({
          id: reel.id,
          competitor: competitorName,
          url: reel.reel_url,
          author: reel.author_username,
          description: reel.description,
          views: reel.views_count,
          likes: reel.likes_count,
          comments: reel.comments_count,
          publishedDate: formatDate(reel.published_at),
          audioTitle: reel.audio_title,
          audioArtist: reel.audio_artist,
          transcript: reel.transcript,
        });
      }

      // Автоматическая фильтрация
      competitorSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 11 },
      };

      // Замораживаем первую строку
      competitorSheet.views = [
        { state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" },
      ];

      // Рассчитываем статистику
      const viewsArray = competitorReels.map((reel) => reel.views_count || 0);
      const likesArray = competitorReels.map((reel) => reel.likes_count || 0);
      const commentsArray = competitorReels.map(
        (reel) => reel.comments_count || 0
      );

      const avgViews =
        viewsArray.length > 0
          ? Math.round(
              viewsArray.reduce((a, b) => a + b, 0) / viewsArray.length
            )
          : 0;
      const maxViews = viewsArray.length > 0 ? Math.max(...viewsArray) : 0;
      const minViews = viewsArray.length > 0 ? Math.min(...viewsArray) : 0;
      const avgLikes =
        likesArray.length > 0
          ? Math.round(
              likesArray.reduce((a, b) => a + b, 0) / likesArray.length
            )
          : 0;
      const avgComments =
        commentsArray.length > 0
          ? Math.round(
              commentsArray.reduce((a, b) => a + b, 0) / commentsArray.length
            )
          : 0;

      // Добавляем статистику в сводный лист
      summarySheet.addRow({
        competitor: competitorName,
        reelsCount: competitorReels.length,
        avgViews,
        maxViews,
        minViews,
        avgLikes,
        avgComments,
      });
    }

    // Автоматическая фильтрация для общего листа
    allReelsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 12 },
    };

    // Замораживаем первую строку
    allReelsSheet.views = [
      { state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" },
    ];

    // Автоматическая фильтрация для сводного листа
    summarySheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 7 },
    };

    // Замораживаем первую строку
    summarySheet.views = [
      { state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" },
    ];

    // Сохраняем файл
    await workbook.xlsx.writeFile(outputPath);

    logger.info(`Экспорт завершен. Файл сохранен: ${outputPath}`);

    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при экспорте данных:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
