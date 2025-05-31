/**
 * Скрипт для создания отчета с реальными транскрипциями Reels конкурентов
 *
 * Использование:
 * bun run src/scripts/generate-transcription-report.ts <project_id> <min_views> <days_ago> <output_path>
 *
 * Пример:
 * bun run src/scripts/generate-transcription-report.ts 1 50000 30 "exports/transcription_report.xlsx"
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import { ReelContent } from "../types";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

// Проверяем аргументы командной строки
const projectId = parseInt(process.argv[2] || "1", 10);
const minViews = parseInt(process.argv[3] || "50000", 10);
const daysAgo = parseInt(process.argv[4] || "30", 10);
const outputPath =
  process.argv[5] ||
  `exports/transcription_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;

// Создаем директорию для экспорта, если она не существует
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Функция для форматирования даты
function formatDate(date: Date): string {
  return format(date, "d MMMM yyyy", { locale: ru });
}

// Функция для форматирования числа с разделителями
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Функция для получения эмодзи в зависимости от количества просмотров
function getViewsEmoji(views: number): string {
  if (views >= 1000000) return "🔥";
  if (views >= 500000) return "⭐";
  if (views >= 100000) return "👍";
  return "👀";
}

// Функция для получения эмодзи в зависимости от количества лайков
function getLikesEmoji(likes: number): string {
  if (likes >= 100000) return "❤️";
  if (likes >= 50000) return "💖";
  if (likes >= 10000) return "💕";
  return "👍";
}

// Функция для получения эмодзи в зависимости от количества комментариев
function getCommentsEmoji(comments: number): string {
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

// Функция для создания отчета
async function generateReport() {
  console.log(
    `Создание отчета для проекта ${projectId} с минимальным количеством просмотров ${minViews} за последние ${daysAgo} дней`
  );

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем список конкурентов
    const competitors = await adapter.getCompetitorsByProjectId(projectId);
    console.log(`Найдено ${competitors.length} конкурентов`);

    // Получаем дату, от которой считать (N дней назад)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysAgo);

    // Получаем Reels конкурентов с минимальным количеством просмотров
    const query = `
      SELECT *, 
             views_count AS views, 
             likes_count AS likes, 
             reel_url AS url, 
             source_identifier AS source_id 
      FROM reels 
      WHERE project_id = $1 
      AND source_type = $2 
      AND views_count >= $3 
      AND published_at >= $4
      ORDER BY views_count DESC
    `;
    const params = [projectId, "competitor", minViews, fromDate.toISOString()];
    const result = await adapter.executeQuery(query, params);
    const reels: ReelContent[] = result.rows as ReelContent[];

    console.log(
      `Найдено ${reels.length} Reels с минимум ${minViews} просмотров за последние ${daysAgo} дней`
    );

    // Подсчитываем количество Reels с реальными транскрипциями
    const reelsWithRealTranscriptions = reels.filter((reel) =>
      isRealTranscription(reel.transcript ?? null)
    );
    console.log(
      `Reels с реальными транскрипциями: ${reelsWithRealTranscriptions.length}`
    );
    console.log(
      `Reels без реальных транскрипций: ${reels.length - reelsWithRealTranscriptions.length}`
    );

    // Группируем Reels по конкурентам
    const reelsByCompetitor: Record<number, ReelContent[]> = {};
    for (const reel of reels) {
      const competitorId = parseInt(reel.source_id);
      if (!reelsByCompetitor[competitorId]) {
        reelsByCompetitor[competitorId] = [];
      }
      reelsByCompetitor[competitorId].push(reel);
    }

    // Создаем книгу Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Instagram Scraper Bot";
    workbook.lastModifiedBy = "Instagram Scraper Bot";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Создаем лист с общей информацией
    const summarySheet = workbook.addWorksheet("Общая информация");

    // Устанавливаем ширину столбцов
    summarySheet.columns = [
      { header: "Показатель", key: "metric", width: 30 },
      { header: "Значение", key: "value", width: 20 },
    ];

    // Добавляем заголовок
    summarySheet.mergeCells("A1:B1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = `📊 Отчет по транскрипциям Reels конкурентов за ${formatDate(fromDate)} - ${formatDate(new Date())}`;
    titleCell.font = { size: 16, bold: true, color: { argb: "FF0070C0" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // Добавляем общую информацию
    summarySheet.addRow(["📋 Проект", `ID: ${projectId}`]);
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
      `${formatDate(fromDate)} - ${formatDate(new Date())}`,
    ]);

    // Добавляем статистику по просмотрам
    const totalViews = reels.reduce(
      (sum: number, reel: ReelContent) => sum + (reel.views ?? 0),
      0
    );
    const avgViews = Math.round(totalViews / (reels.length || 1));
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
    const allTranscriptionsSheet = workbook.addWorksheet("Все транскрипции");

    // Устанавливаем ширину столбцов
    allTranscriptionsSheet.columns = [
      { header: "№", key: "index", width: 5 },
      { header: "Конкурент", key: "competitor", width: 20 },
      { header: "Просмотры", key: "views", width: 15 },
      { header: "Дата публикации", key: "date", width: 20 },
      { header: "URL", key: "url", width: 50 },
      { header: "Транскрипция", key: "transcript", width: 100 },
    ];

    // Добавляем заголовок
    allTranscriptionsSheet.mergeCells("A1:F1");
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
      const competitor = competitors.find(
        (c) => c.id === parseInt(reel.source_id)
      );

      // Проверяем, есть ли реальная транскрипция
      const hasRealTranscription = isRealTranscription(reel.transcript ?? null);

      allTranscriptionsSheet.addRow({
        index: ++rowIndex,
        competitor: competitor ? competitor.username : "Неизвестный",
        views: `${getViewsEmoji(reel.views ?? 0)} ${formatNumber(reel.views ?? 0)}`,
        date: formatDate(new Date(reel.published_at)),
        url: reel.url,
        transcript: hasRealTranscription
          ? reel.transcript
          : "❌ Нет транскрипции",
      });

      // Если нет реальной транскрипции, выделяем ячейку красным
      if (!hasRealTranscription) {
        const row = allTranscriptionsSheet.getRow(rowIndex + 2); // +2 из-за заголовка и строки с названиями столбцов
        row.getCell(6).font = { color: { argb: "FFFF0000" } };
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
      row.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(6).alignment = { vertical: "top", wrapText: true };

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
      const competitorSheet = workbook.addWorksheet(`${competitor.username}`);

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
        (a, b) => (b.views ?? 0) - (a.views ?? 0)
      );

      // Добавляем Reels конкурента
      for (let i = 0; i < sortedCompetitorReels.length; i++) {
        const reel = sortedCompetitorReels[i];
        const transcript =
          reel.transcript && isRealTranscription(reel.transcript ?? null)
            ? reel.transcript
            : "❌ Нет транскрипции";
        competitorSheet.addRow({
          index: i + 1,
          views: `${getViewsEmoji(reel.views ?? 0)} ${formatNumber(reel.views ?? 0)}`,
          likes: `${getLikesEmoji(reel.likes ?? 0)} ${formatNumber(reel.likes ?? 0)}`,
          comments: `${getCommentsEmoji(reel.comments_count ?? 0)} ${formatNumber(reel.comments_count ?? 0)}`,
          date: formatDate(new Date(reel.published_at)),
          url: reel.url,
          transcript,
        });

        // Если нет реальной транскрипции, выделяем ячейку красным
        if (!isRealTranscription(reel.transcript ?? null)) {
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
    console.log(`Отчет успешно сохранен в файл: ${outputPath}`);
  } catch (error) {
    console.error("Ошибка при создании отчета:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем создание отчета
generateReport();
