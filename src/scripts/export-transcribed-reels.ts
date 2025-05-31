/**
 * Скрипт для экспорта рилсов с транскрипциями в Excel
 *
 * Использование:
 * bun run src/scripts/export-transcribed-reels.ts <projectId> [minViews] [limit]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - limit: (опционально) Максимальное количество рилсов для экспорта (по умолчанию 1000)
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as ExcelJS from "exceljs";
import { logger } from "../logger";
import { ReelContent } from "../types";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/export-transcribed-reels.ts <projectId> [minViews] [limit]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const limit = args[2] ? parseInt(args[2], 10) : 1000;

if (isNaN(projectId) || isNaN(minViews) || isNaN(limit)) {
  console.error("Ошибка: projectId, minViews и limit должны быть числами");
  process.exit(1);
}

// Функция для форматирования даты
function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Основная функция
async function main() {
  console.log(
    `Экспорт рилсов с транскрипциями проекта ${projectId} с минимум ${minViews} просмотров в Excel`
  );
  console.log(`Максимальное количество рилсов для экспорта: ${limit}`);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
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
      console.error(`Проект с ID ${projectId} не найден`);
      return;
    }

    const project = projectResult.rows[0];
    console.log(`Проект: ${project.name}`);

    // Получаем список рилсов с транскрипциями
    const reelsResult = await adapter.executeQuery(
      `SELECT r.*, h.tag_name as hashtag_name
       FROM reels r, hashtags h
       WHERE r.project_id = $1
       AND h.project_id = $1
       AND r.source_type = 'hashtag'
       AND r.views_count >= $2
       AND h.id::text = r.source_identifier
       AND r.transcript IS NOT NULL
       ORDER BY r.views_count DESC
       LIMIT $3`,
      [projectId, minViews, limit]
    );

    if (!reelsResult || !reelsResult.rows) {
      console.log("Запрос не вернул результатов или произошла ошибка");
      return;
    }

    const reels = reelsResult.rows;
    console.log(`Найдено ${reels.length} рилсов с транскрипциями`);

    if (reels.length === 0) {
      console.log("Нет рилсов для экспорта");
      return;
    }

    // Создаем директорию для экспорта, если она не существует
    const exportDir = path.join(process.cwd(), "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Создаем новую книгу Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Рилсы с транскрипциями");

    // Добавляем заголовки
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Хэштег", key: "hashtag", width: 15 },
      { header: "URL", key: "url", width: 40 },
      { header: "Автор", key: "author", width: 20 },
      { header: "Просмотры", key: "views", width: 15 },
      { header: "Лайки", key: "likes", width: 15 },
      { header: "Комментарии", key: "comments", width: 15 },
      { header: "Дата публикации", key: "published_at", width: 20 },
      { header: "Дата скрапинга", key: "created_at", width: 20 },
      { header: "Транскрипция", key: "transcript", width: 100 },
    ];

    // Стилизуем заголовки
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

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
        logger.warn(`Invalid source_id for reel ${reel.id}: ${reel.source_id}`);
      }
    }

    // Добавляем данные
    for (const reel of reels) {
      worksheet.addRow({
        id: reel.id,
        hashtag: "#" + reel.hashtag_name,
        url: reel.reel_url,
        author: reel.author_username,
        views: reel.views_count,
        likes: reel.likes_count,
        comments: reel.comments_count,
        published_at: formatDate(reel.published_at),
        created_at: formatDate(reel.created_at),
        transcript: reel.transcript,
      });
    }

    // Применяем автофильтр
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 10 },
    };

    // Форматируем числовые столбцы
    worksheet.getColumn("views").numFmt = "#,##0";
    worksheet.getColumn("likes").numFmt = "#,##0";
    worksheet.getColumn("comments").numFmt = "#,##0";

    // Устанавливаем перенос текста для транскрипции
    worksheet.getColumn("transcript").alignment = { wrapText: true };

    // Генерируем имя файла с датой и временем
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const fileName = `transcribed_reels_project_${projectId}_${timestamp}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    // Сохраняем файл
    await workbook.xlsx.writeFile(filePath);
    console.log(`Файл успешно сохранен: ${filePath}`);

    // Выводим статистику
    console.log("\nСтатистика экспорта:");
    console.log(`Всего рилсов: ${reels.length}`);

    // Считаем статистику по хэштегам
    const hashtagStats: Record<string, number> = {};
    for (const reel of reels) {
      const hashtag = "#" + reel.hashtag_name;
      if (!hashtagStats[hashtag]) {
        hashtagStats[hashtag] = 0;
      }
      hashtagStats[hashtag]++;
    }

    console.log("\nРаспределение по хэштегам:");
    for (const [hashtag, count] of Object.entries(hashtagStats)) {
      console.log(`${hashtag}: ${count} рилсов`);
    }

    // Считаем общее количество просмотров
    const totalViews = reels.reduce(
      (sum: number, reel: any) => sum + parseInt(reel.views_count),
      0
    );
    console.log(
      `\nОбщее количество просмотров: ${totalViews.toLocaleString()}`
    );

    // Средние просмотры на рил
    const avgViews = Math.round(totalViews / reels.length);
    console.log(
      `Среднее количество просмотров на рил: ${avgViews.toLocaleString()}`
    );
  } catch (error) {
    console.error("Ошибка при экспорте рилсов:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
