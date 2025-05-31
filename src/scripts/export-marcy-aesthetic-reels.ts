/**
 * Скрипт для экспорта Reels по хэштегам эстетической медицины в Excel
 *
 * Использование:
 * bun run src/scripts/export-marcy-aesthetic-reels.ts <projectId> [minViews] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию exports/marcy_aesthetic_reels_<timestamp>.xlsx)
 */

import { initializeDBConnection } from "../db/neonDB";
import { reelsTable, hashtagsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import { eq, and, gte, inArray } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/export-marcy-aesthetic-reels.ts <projectId> [minViews] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const timestamp = new Date().toISOString().replace(/:/g, "-");
const defaultFilename = `marcy_aesthetic_reels_${timestamp}.xlsx`;
const outputPath =
  args[2] || path.join(process.cwd(), "exports", defaultFilename);

// Хэштеги эстетической медицины
const AESTHETIC_HASHTAGS = [
  "aestheticmedicine",
  "aestheticclinic",
  "cosmetology",
  "hydrafacial",
  "botox",
  "fillers",
  "beautyclinic",
  "skincare",
  "prpfacial",
  "rfmicroneedling",
  "skinrejuvenation",
  "facialtreatment",
  "aesthetictreatment",
];

if (isNaN(projectId) || isNaN(minViews)) {
  logger.error("Ошибка: projectId и minViews должны быть числами");
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
  logger.info(
    `Экспорт Reels по хэштегам эстетической медицины для проекта ${projectId} с минимум ${minViews} просмотров`
  );
  logger.info(`Файл будет сохранен в: ${outputPath}`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Получаем ID хэштегов
    const hashtags = await db
      .select()
      .from(hashtagsTable)
      .where(
        and(
          eq(hashtagsTable.project_id, projectId),
          inArray(hashtagsTable.tag_name, AESTHETIC_HASHTAGS)
        )
      );

    if (hashtags.length === 0) {
      logger.error(
        `В проекте ${projectId} не найдено хэштегов эстетической медицины`
      );
      process.exit(1);
    }

    logger.info(
      `Найдено ${hashtags.length} хэштегов эстетической медицины для проекта ${projectId}`
    );

    // Получаем ID хэштегов
    const hashtagIds = hashtags.map((h) => h.id);
    const hashtagMap = new Map(hashtags.map((h) => [String(h.id), h.tag_name]));

    // Создаем Excel файл
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Instagram Scraper Bot";
    workbook.created = new Date();

    // Создаем лист для сводной информации
    const summarySheet = workbook.addWorksheet("Сводка");

    // Устанавливаем заголовки для сводной информации
    summarySheet.columns = [
      { header: "Хэштег", key: "hashtag", width: 20 },
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
      { header: "Хэштег", key: "hashtag", width: 20 },
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

    // Получаем все Reels для хэштегов эстетической медицины
    const reels = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_type, "hashtag"),
          inArray(reelsTable.source_identifier, hashtagIds.map(String)),
          gte(reelsTable.views_count || 0, minViews)
        )
      );

    logger.info(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров`
    );

    // Группируем Reels по хэштегам
    const reelsByHashtag = new Map<string, any[]>();

    for (const reel of reels) {
      const hashtagId = reel.source_identifier;
      if (!hashtagId) {
        continue;
      }
      if (!reelsByHashtag.has(hashtagId)) {
        reelsByHashtag.set(hashtagId, []);
      }
      reelsByHashtag.get(hashtagId)!.push(reel);
    }

    // Для каждого хэштега создаем отдельный лист и собираем статистику
    for (const [hashtagId, hashtagReels] of reelsByHashtag.entries()) {
      const hashtagName = hashtagMap.get(hashtagId) || "unknown";

      logger.info(
        `Обработка ${hashtagReels.length} Reels для хэштега #${hashtagName}`
      );

      // Создаем лист для хэштега
      const hashtagSheet = workbook.addWorksheet(`#${hashtagName}`);

      // Устанавливаем заголовки
      hashtagSheet.columns = [
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
      hashtagSheet.getRow(1).font = { bold: true };
      hashtagSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };

      // Добавляем данные
      for (const reel of hashtagReels) {
        // Добавляем в лист хэштега
        hashtagSheet.addRow({
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
          hashtag: `#${hashtagName}`,
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
      hashtagSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 11 },
      };

      // Замораживаем первую строку
      hashtagSheet.views = [
        { state: "frozen", xSplit: 0, ySplit: 1, activeCell: "A2" },
      ];

      // Рассчитываем статистику
      const viewsArray = hashtagReels.map((reel) => reel.views_count || 0);
      const likesArray = hashtagReels.map((reel) => reel.likes_count || 0);
      const commentsArray = hashtagReels.map(
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
        hashtag: `#${hashtagName}`,
        reelsCount: hashtagReels.length,
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
