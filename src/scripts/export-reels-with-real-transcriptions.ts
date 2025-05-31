/**
 * Скрипт для экспорта Reels с реальными транскрипциями в Excel
 *
 * Использование:
 * bun run src/scripts/export-reels-with-real-transcriptions.ts <projectId> [minViews] [daysBack] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию exports/reels_with_real_transcriptions_<timestamp>.xlsx)
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ReelContent, Competitor } from "../types";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/export-reels-with-real-transcriptions.ts <projectId> [minViews] [daysBack] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const timestamp = new Date().toISOString().replace(/:/g, "-");
const defaultFilename = `reels_with_real_transcriptions_${timestamp}.xlsx`;
const outputPath =
  args[3] || path.join(process.cwd(), "exports", defaultFilename);

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack)) {
  console.error("Ошибка: projectId, minViews и daysBack должны быть числами");
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
    !transcript.includes("С вами был") &&
    transcript.length > 10
  );
}

// Основная функция
async function main() {
  console.log(
    `Экспорт Reels с реальными транскрипциями для проекта ${projectId} с минимум ${minViews} просмотров за последние ${daysBack} дней`
  );
  console.log(`Файл будет сохранен в: ${outputPath}`);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем информацию о проекте
    const projectResult = await adapter.executeQuery(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      throw new Error(`Проект с ID ${projectId} не найден`);
    }

    const project = projectResult.rows[0];

    // Получаем список конкурентов
    const competitorsResult = await adapter.executeQuery(
      `SELECT * FROM competitors WHERE project_id = $1`,
      [projectId]
    );

    const competitors = competitorsResult.rows;
    console.log(
      `Найдено ${competitors.length} конкурентов для проекта ${projectId}`
    );

    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем Reels с минимальным количеством просмотров
    const reelsResult = await adapter.executeQuery(
      `SELECT * FROM reels 
       WHERE project_id = $1 
       AND source_type = 'competitor' 
       AND views_count >= $2 
       AND published_at >= $3`,
      [projectId, minViews, date30DaysAgo.toISOString()]
    );

    const reels = reelsResult.rows;
    console.log(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );

    // Фильтруем Reels, оставляя только те, у которых есть "реальная" транскрипция
    const reelsWithRealTranscriptions = reels.filter(
      (reel: ReelContent) => isRealTranscription(reel.transcript ?? null) // Типизируем reel
    );
    console.log(
      `Reels с реальными транскрипциями: ${reelsWithRealTranscriptions.length}`
    );
    console.log(
      `Reels без реальных транскрипций: ${reels.length - reelsWithRealTranscriptions.length}`
    );

    // Группируем Reels по конкурентам
    const reelsByCompetitor = new Map();
    for (const reel of reels) {
      const competitorId = parseInt(reel.source_identifier);
      if (!reelsByCompetitor.has(competitorId)) {
        reelsByCompetitor.set(competitorId, []);
      }
      reelsByCompetitor.get(competitorId).push(reel);
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
    titleCell.value = `📊 Отчет по транскрипциям Reels конкурентов за ${formatDate(date30DaysAgo)} - ${formatDate(new Date())}`;
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
      "📝 Reels с реальными транскрипциями",
      reelsWithRealTranscriptions.length.toString(),
    ]);
    summarySheet.addRow([
      "❌ Reels без реальных транскрипций",
      (reels.length - reelsWithRealTranscriptions.length).toString(),
    ]);
    summarySheet.addRow([
      "👀 Минимальное количество просмотров",
      formatNumber(minViews),
    ]);
    summarySheet.addRow([
      "📅 Период",
      `${formatDate(date30DaysAgo)} - ${formatDate(new Date())}`,
    ]);

    // Добавляем статистику по просмотрам
    const totalViews = reels.reduce(
      (sum: number, reel: ReelContent) => sum + (reel.views ?? 0),
      0
    );
    const avgViews = Math.round(totalViews / reels.length);
    const maxViews = Math.max(
      ...reels.map((reel: ReelContent) => reel.views ?? 0)
    );
    const minViewsFound = Math.min(
      ...reels.map((reel: ReelContent) => reel.views ?? 0)
    );

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

    // Создаем лист с реальными транскрипциями
    const realTranscriptionsSheet = workbook.addWorksheet(
      "📝 Реальные транскрипции"
    );

    // Устанавливаем ширину столбцов
    realTranscriptionsSheet.columns = [
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
    realTranscriptionsSheet.mergeCells("A1:H1");
    const realTranscriptionsTitle = realTranscriptionsSheet.getCell("A1");
    realTranscriptionsTitle.value = "📝 Reels с реальными транскрипциями";
    realTranscriptionsTitle.font = {
      size: 16,
      bold: true,
      color: { argb: "FF0070C0" },
    };
    realTranscriptionsTitle.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    // Добавляем Reels с реальными транскрипциями
    let rowIndex = 0;
    for (const reel of reelsWithRealTranscriptions) {
      const competitor = competitors.find(
        (c: Competitor) => c.id === parseInt(reel.source_identifier)
      );

      realTranscriptionsSheet.addRow({
        index: ++rowIndex,
        competitor: competitor ? competitor.username : "Неизвестный",
        views: `${getViewsEmoji(reel.views ?? 0)} ${formatNumber(reel.views ?? 0)}`,
        likes: `${getLikesEmoji(reel.likes ?? 0)} ${formatNumber(reel.likes ?? 0)}`,
        comments: `${getCommentsEmoji(reel.comments_count ?? 0)} ${formatNumber(reel.comments_count ?? 0)}`,
        date: formatDate(reel.published_at),
        url: reel.reel_url,
        transcript: reel.transcript,
      });
    }

    // Стилизуем заголовок таблицы
    const headerRow = realTranscriptionsSheet.getRow(2);
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
    for (let i = 3; i <= realTranscriptionsSheet.rowCount; i++) {
      const row = realTranscriptionsSheet.getRow(i);
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

    // Создаем отдельный лист для каждого конкурента с реальными транскрипциями
    for (const competitor of competitors) {
      const competitorReels = reelsByCompetitor.get(competitor.id) || [];
      if (competitorReels.length === 0) continue;

      // Фильтруем Reels с реальными транскрипциями
      const competitorReelsWithRealTranscriptions = competitorReels.filter(
        (reel: ReelContent) => isRealTranscription(reel.transcript ?? null)
      );
      if (competitorReelsWithRealTranscriptions.length === 0) continue;

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
      const sortedCompetitorReels = [
        ...competitorReelsWithRealTranscriptions,
      ].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

      // Добавляем Reels конкурента
      for (let i = 0; i < sortedCompetitorReels.length; i++) {
        const reel = sortedCompetitorReels[i];

        competitorSheet.addRow({
          index: i + 1,
          views: `${getViewsEmoji(reel.views ?? 0)} ${formatNumber(reel.views ?? 0)}`,
          likes: `${getLikesEmoji(reel.likes ?? 0)} ${formatNumber(reel.likes ?? 0)}`,
          comments: `${getCommentsEmoji(reel.comments_count ?? 0)} ${formatNumber(reel.comments_count ?? 0)}`,
          date: formatDate(reel.published_at),
          url: reel.reel_url,
          transcript: reel.transcript,
        });
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
    console.log(`Экспорт завершен. Файл сохранен: ${outputPath}`);
  } catch (error) {
    console.error("Критическая ошибка при выполнении экспорта:", error);
    process.exit(1);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
