/**
 * Скрипт для экспорта Reels с транскрипциями в Excel
 *
 * Использование:
 * bun run src/scripts/export-transcriptions-to-excel.ts <projectId> [minViews] [daysBack] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию exports/transcriptions_<timestamp>.xlsx)
 */

import { logger } from "../logger";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { NeonAdapter } from "../adapters/neon-adapter";
import { ReelContent, Competitor } from "../types";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/export-transcriptions-to-excel.ts <projectId> [minViews] [daysBack] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const timestamp = new Date().toISOString().replace(/:/g, "-");
const defaultFilename = `transcriptions_${timestamp}.xlsx`;
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

// Функция для форматирования даты
function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "d MMMM yyyy", { locale: ru });
}

// Функция для форматирования числа с разделителями
function formatNumber(num: number | null): string {
  if (num === null || isNaN(num)) return "0";
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Функция для получения эмодзи в зависимости от количества просмотров
function getViewsEmoji(views: number | null): string {
  if (!views) return "👀";
  if (views >= 1000000) return "🔥";
  if (views >= 500000) return "⭐";
  if (views >= 100000) return "👍";
  return "👀";
}

// Функция для получения эмодзи в зависимости от количества лайков
function getLikesEmoji(likes: number | null): string {
  if (!likes) return "👍";
  if (likes >= 100000) return "❤️";
  if (likes >= 50000) return "💖";
  if (likes >= 10000) return "💕";
  return "👍";
}

// Функция для получения эмодзи в зависимости от количества комментариев
function getCommentsEmoji(comments: number | null): string {
  if (!comments) return "💭";
  if (comments >= 1000) return "💬";
  if (comments >= 500) return "📝";
  if (comments >= 100) return "✏️";
  return "💭";
}

// Функция для проверки, является ли транскрипция реальной
function isRealTranscription(transcript: string | null): boolean {
  if (!transcript) return false;

  // Проверяем, что транскрипция не содержит заглушек
  return (
    !transcript.includes("Субтитры делал") &&
    !transcript.includes("Спасибо за субтитры") &&
    transcript.length > 10
  );
}

// Основная функция
async function main() {
  try {
    // Инициализируем соединение с базой данных
    const adapter = new NeonAdapter();
    await adapter.initialize();
    logger.info("Соединение с БД Neon успешно инициализировано.");

    // Получаем информацию о проекте
    const projectResult = await adapter.executeQuery(
      "SELECT * FROM projects WHERE id = $1",
      [projectId]
    );
    if (
      !projectResult ||
      !projectResult.rows ||
      projectResult.rows.length === 0
    ) {
      logger.error(`Проект с ID ${projectId} не найден`);
      process.exit(1);
    }
    const project = projectResult.rows[0];

    logger.info(
      `Экспорт Reels с транскрипциями для проекта ${projectId} (${project.name}) с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );
    logger.info(`Файл будет сохранен в: ${outputPath}`);

    // Получаем список конкурентов
    const competitorsData = await adapter.getCompetitorsByProjectId(projectId);
    const competitors: Competitor[] = competitorsData;

    logger.info(
      `Найдено ${competitors.length} конкурентов для проекта ${projectId}`
    );

    // Получаем дату для фильтрации
    const dateDaysAgo = new Date();
    dateDaysAgo.setDate(dateDaysAgo.getDate() - daysBack);

    // Получаем Reels с минимальным количеством просмотров
    const query = `
      SELECT
        id,
        project_id,
        source_type,
        source_identifier AS source_id,
        reel_url AS url,
        profile_url,
        author_username,
        description,
        views_count AS views,
        likes_count AS likes,
        comments_count AS comments_count,
        published_at,
        transcript,
        raw_data,
        created_at,
        updated_at,
        instagram_id,
        author_id,
        duration,
        thumbnail_url,
        audio_url,
        transcript_status,
        transcript_updated_at,
        marketing_score,
        engagement_rate_video,
        engagement_rate_all,
        view_to_like_ratio,
        comments_to_likes_ratio,
        recency
      FROM reels
      WHERE project_id = $1
        AND source_type = 'competitor'
        AND views_count >= $2
        AND published_at >= $3
      ORDER BY views_count DESC
    `;
    const reelsResult = await adapter.executeQuery(query, [
      projectId,
      minViews,
      dateDaysAgo.toISOString(),
    ]);
    const reels: ReelContent[] = reelsResult.rows as ReelContent[];

    logger.info(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );

    // Подсчитываем количество Reels с реальными транскрипциями
    const reelsWithRealTranscriptions = reels.filter((reel) =>
      isRealTranscription(reel.transcript ?? null)
    );
    logger.info(
      `Reels с реальными транскрипциями: ${reelsWithRealTranscriptions.length}`
    );
    logger.info(
      `Reels без реальных транскрипций: ${reels.length - reelsWithRealTranscriptions.length}`
    );

    // Группируем Reels по конкурентам
    const reelsByCompetitor: Record<number, ReelContent[]> = {};
    for (const reel of reels) {
      const competitorId = parseInt(reel.source_id, 10);
      if (!isNaN(competitorId)) {
        if (!reelsByCompetitor[competitorId]) {
          reelsByCompetitor[competitorId] = [];
        }
        reelsByCompetitor[competitorId].push(reel);
      } else {
        logger.warn(
          `Skipping reel ${reel.id} in grouping because source_id is not a valid number: ${reel.source_id}`
        );
      }
    }

    // Создаем книгу Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Instagram Scraper Bot";
    workbook.lastModifiedBy = "Instagram Scraper Bot";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Создаем лист с общей информацией
    const summarySheet = workbook.addWorksheet("📊 Общая информация");

    // Устанавливаем ширину столбцов
    summarySheet.columns = [
      { header: "Показатель", key: "metric", width: 30 },
      { header: "Значение", key: "value", width: 20 },
    ];

    // Добавляем заголовок
    summarySheet.mergeCells("A1:B1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = `📊 Отчет по транскрипциям Reels конкурентов за ${formatDate(dateDaysAgo)} - ${formatDate(new Date())}`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FF0070C0" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Добавляем общую информацию
    summarySheet.addRow(["📋 Проект", `${project.name} (ID: ${projectId})`]);
    summarySheet.addRow([
      "👥 Количество конкурентов",
      competitors.length.toString(),
    ]);
    summarySheet.addRow(["🎬 Количество Reels", reels.length.toString()]);
    summarySheet.addRow([
      "📝 Reels с транскрипциями",
      reelsWithRealTranscriptions.length.toString(),
    ]);
    summarySheet.addRow([
      "❌ Reels без транскрипций",
      (reels.length - reelsWithRealTranscriptions.length).toString(),
    ]);
    summarySheet.addRow([
      "👀 Минимальное количество просмотров",
      formatNumber(minViews),
    ]);
    summarySheet.addRow([
      "📅 Период",
      `${formatDate(dateDaysAgo)} - ${formatDate(new Date())}`,
    ]);

    // Добавляем статистику по просмотрам
    const totalViews = reels.reduce((sum, reel) => sum + (reel.views ?? 0), 0);
    const avgViews = Math.round(totalViews / reels.length);
    const maxViews = Math.max(...reels.map((reel) => reel.views ?? 0));
    const minViewsFound = Math.min(...reels.map((reel) => reel.views ?? 0));

    summarySheet.addRow([
      "👁️ Общее количество просмотров",
      formatNumber(totalViews),
    ]);
    summarySheet.addRow([
      "📊 Среднее количество просмотров",
      formatNumber(avgViews),
    ]);
    summarySheet.addRow([
      "🔝 Максимальное количество просмотров",
      formatNumber(maxViews),
    ]);
    summarySheet.addRow([
      "⬇️ Минимальное количество просмотров",
      formatNumber(minViewsFound),
    ]);

    // Стилизуем таблицу
    for (let i = 2; i <= summarySheet.rowCount; i++) {
      const row = summarySheet.getRow(i);
      row.getCell(1).font = { bold: true, color: { argb: "FF0070C0" } };
      row.getCell(2).font = { bold: true };
      row.height = 25;
    }

    // Создаем лист с транскрипциями всех Reels
    const allTranscriptionsSheet = workbook.addWorksheet("📝 Все транскрипции");

    // Устанавливаем ширину столбцов
    allTranscriptionsSheet.columns = [
      { header: "№", key: "index", width: 5 },
      { header: "Конкурент", key: "competitor", width: 20 },
      { header: "Просмотры", key: "views", width: 15 },
      { header: "Лайки", key: "likes", width: 15 },
      { header: "Комментарии", key: "comments", width: 15 },
      { header: "Дата публикации", key: "date", width: 20 },
      { header: "URL", key: "url", width: 50 },
      { header: "Транскрипция", key: "transcript", width: 100 },
    ];

    // Добавляем заголовок
    allTranscriptionsSheet.mergeCells("A1:H1");
    const allTranscriptionsTitle = allTranscriptionsSheet.getCell("A1");
    allTranscriptionsTitle.value = "📝 Транскрипции всех Reels";
    allTranscriptionsTitle.font = {
      size: 16,
      bold: true,
      color: { argb: "FF0070C0" },
    };
    allTranscriptionsTitle.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // Добавляем все Reels с транскрипциями
    let rowIndex = 0;
    for (const reel of reels) {
      const competitorId = parseInt(reel.source_id, 10);
      let competitor: Competitor | undefined = undefined;
      if (!isNaN(competitorId)) {
        competitor = competitors.find((c) => c.id === competitorId);
      }

      // Проверяем, есть ли реальная транскрипция
      const hasRealTranscription = isRealTranscription(reel.transcript ?? null);

      allTranscriptionsSheet.addRow({
        index: ++rowIndex,
        competitor: competitor ? competitor.username : "Неизвестный",
        views: `${getViewsEmoji(reel.views ?? 0)} ${formatNumber(reel.views ?? 0)}`,
        likes: `${getLikesEmoji(reel.likes ?? 0)} ${formatNumber(reel.likes ?? 0)}`,
        comments: `${getCommentsEmoji(reel.comments_count ?? 0)} ${formatNumber(reel.comments_count ?? 0)}`,
        date: formatDate(reel.published_at),
        url: reel.url,
        transcript: hasRealTranscription
          ? reel.transcript
          : "❌ Нет транскрипции",
      });

      // Если нет реальной транскрипции, выделяем ячейку красным
      if (!hasRealTranscription) {
        const row = allTranscriptionsSheet.getRow(rowIndex + 2); // +2 из-за заголовка и строки с названиями столбцов
        row.getCell(8).font = { color: { argb: "FFFF0000" } };
      }
    }

    // Стилизуем заголовок таблицы
    const headerRow = allTranscriptionsSheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Стилизуем таблицу
    for (let i = 3; i <= allTranscriptionsSheet.rowCount; i++) {
      const row = allTranscriptionsSheet.getRow(i);
      row.height = 25;
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(8).alignment = { vertical: "top", wrapText: true };

      // Добавляем чередующуюся заливку строк
      if (i % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F2F2" },
          };
        });
      }
    }

    // Создаем отдельный лист для каждого конкурента
    for (const competitor of competitors) {
      const competitorReels = reelsByCompetitor[competitor.id] || [];
      if (competitorReels.length === 0) continue;

      // Создаем лист для конкурента
      const competitorSheet = workbook.addWorksheet(
        `👤 ${competitor.username}`
      );

      // Устанавливаем ширину столбцов
      competitorSheet.columns = [
        { header: "№", key: "index", width: 5 },
        { header: "Просмотры", key: "views", width: 15 },
        { header: "Лайки", key: "likes", width: 15 },
        { header: "Комментарии", key: "comments", width: 15 },
        { header: "Дата публикации", key: "date", width: 20 },
        { header: "URL", key: "url", width: 50 },
        { header: "Транскрипция", key: "transcript", width: 100 },
      ];

      // Добавляем заголовок
      competitorSheet.mergeCells("A1:G1");
      const competitorTitle = competitorSheet.getCell("A1");
      competitorTitle.value = `👤 Конкурент: ${competitor.username} (${competitor.full_name || ""})`;
      competitorTitle.font = {
        size: 16,
        bold: true,
        color: { argb: "FF0070C0" },
      };
      competitorTitle.alignment = { horizontal: "center", vertical: "middle" };

      // Сортируем Reels по просмотрам
      const sortedCompetitorReels = [...competitorReels].sort(
        (a: ReelContent, b: ReelContent) => (b.views ?? 0) - (a.views ?? 0)
      );

      // Добавляем Reels конкурента
      for (let i = 0; i < sortedCompetitorReels.length; i++) {
        const reel = sortedCompetitorReels[i];

        // Проверяем, есть ли реальная транскрипция
        const hasRealTranscription = isRealTranscription(
          reel.transcript ?? null
        );

        competitorSheet.addRow({
          index: i + 1,
          views: `${getViewsEmoji(reel.views ?? 0)} ${formatNumber(reel.views ?? 0)}`,
          likes: `${getLikesEmoji(reel.likes ?? 0)} ${formatNumber(reel.likes ?? 0)}`,
          comments: `${getCommentsEmoji(reel.comments_count ?? 0)} ${formatNumber(reel.comments_count ?? 0)}`,
          date: formatDate(new Date(reel.published_at)),
          url: reel.url,
          transcript: hasRealTranscription
            ? reel.transcript
            : "❌ Нет транскрипции",
        });

        // Если нет реальной транскрипции, выделяем ячейку красным
        if (!hasRealTranscription) {
          const row = competitorSheet.getRow(i + 3); // +3 из-за заголовка и строки с названиями столбцов
          row.getCell(7).font = { color: { argb: "FFFF0000" } };
        }
      }

      // Стилизуем заголовок таблицы
      const competitorHeaderRow = competitorSheet.getRow(2);
      competitorHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0070C0" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      // Стилизуем таблицу
      for (let i = 3; i <= competitorSheet.rowCount; i++) {
        const row = competitorSheet.getRow(i);
        row.height = 25;
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
        row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
        row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
        row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(7).alignment = { vertical: "top", wrapText: true };

        // Добавляем чередующуюся заливку строк
        if (i % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF2F2F2" },
            };
          });
        }
      }
    }

    // Сохраняем книгу Excel
    await workbook.xlsx.writeFile(outputPath);
    logger.info(`Экспорт завершен. Файл сохранен: ${outputPath}`);
  } catch (error) {
    logger.error("Критическая ошибка при выполнении экспорта:", error);
    process.exit(1);
  } finally {
    // Закрываем соединение с базой данных, если используется NeonAdapter
    // const adapter = new NeonAdapter(); // Это должно быть определено выше, если используется
    // await adapter.close(); // Раскомментировать, если adapter используется и должен быть закрыт
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
