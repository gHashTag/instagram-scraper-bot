/**
 * Скрипт для экспорта популярных рилсов по хэштегам из базы данных
 *
 * Использование:
 * bun run src/scripts/export-popular-hashtag-reels.ts <projectId> [minViews] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию "exports/popular_hashtag_reels.xlsx")
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/export-popular-hashtag-reels.ts <projectId> [minViews] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const outputPath = args[2] || "exports/popular_hashtag_reels.xlsx";

if (isNaN(projectId) || isNaN(minViews)) {
  console.error("Ошибка: projectId и minViews должны быть числами");
  process.exit(1);
}

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Основная функция
async function main() {
  console.log(
    `Экспорт популярных рилсов по хэштегам для проекта ${projectId} с минимум ${minViews} просмотров`
  );
  console.log(`Файл будет сохранен в: ${outputPath}`);

  // Создаем директорию для экспорта, если она не существует
  const outputDir = path.dirname(outputPath);
  ensureDirectoryExists(outputDir);

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Проверяем, существует ли проект
    const projectResult = await adapter.executeQuery(
      `SELECT * FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      console.error(`Проект с ID ${projectId} не найден`);
      return;
    }

    const project = projectResult.rows[0];
    console.log(`Проект: ${project.name}`);

    // Получаем список хэштегов проекта
    const hashtagsResult = await adapter.executeQuery(
      `SELECT * FROM hashtags WHERE project_id = $1`,
      [projectId]
    );

    console.log(
      `Найдено ${hashtagsResult.rows.length} хэштегов для проекта ${projectId}`
    );

    if (hashtagsResult.rows.length === 0) {
      console.log("Нет хэштегов для экспорта");
      return;
    }

    // Получаем список рилсов по хэштегам
    const reelsResult = await adapter.executeQuery(
      `SELECT r.*, h.tag_name as hashtag_name 
       FROM reels r, hashtags h 
       WHERE r.project_id = $1 
       AND h.project_id = $1
       AND r.source_type = 'hashtag' 
       AND r.views_count >= $2 
       AND r.source_identifier = h.id::text
       ORDER BY h.tag_name, r.views_count DESC`,
      [projectId, minViews]
    );

    console.log(
      `Найдено ${reelsResult.rows.length} рилсов по хэштегам с минимум ${minViews} просмотров`
    );

    if (reelsResult.rows.length === 0) {
      console.log("Нет рилсов по хэштегам для экспорта");
      return;
    }

    // Группируем рилсы по хэштегам
    const reelsByHashtag = new Map<string, any[]>();
    for (const reel of reelsResult.rows) {
      const hashtagName = reel.hashtag_name;
      if (!reelsByHashtag.has(hashtagName)) {
        reelsByHashtag.set(hashtagName, []);
      }
      reelsByHashtag.get(hashtagName)!.push(reel);
    }

    // Создаем Excel файл
    const workbook = new ExcelJS.Workbook();

    // Добавляем лист с общей информацией
    const summarySheet = workbook.addWorksheet("Общая информация");
    summarySheet.columns = [
      { header: "Параметр", key: "parameter", width: 30 },
      { header: "Значение", key: "value", width: 50 },
    ];

    // Добавляем общую информацию
    summarySheet.addRow({ parameter: "Проект", value: project.name });
    summarySheet.addRow({
      parameter: "Дата экспорта",
      value: new Date().toLocaleString(),
    });
    summarySheet.addRow({
      parameter: "Минимальное количество просмотров",
      value: minViews,
    });
    summarySheet.addRow({
      parameter: "Всего хэштегов",
      value: hashtagsResult.rows.length,
    });
    summarySheet.addRow({
      parameter: "Всего рилсов",
      value: reelsResult.rows.length,
    });

    // Добавляем пустую строку
    summarySheet.addRow({});

    // Добавляем статистику по хэштегам
    summarySheet.addRow({ parameter: "Статистика по хэштегам", value: "" });
    summarySheet.addRow({ parameter: "Хэштег", value: "Количество рилсов" });

    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      summarySheet.addRow({
        parameter: `#${hashtagName}`,
        value: reels.length,
      });
    }

    // Добавляем листы для каждого хэштега
    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      const hashtagSheet = workbook.addWorksheet(`#${hashtagName}`);

      // Устанавливаем заголовки
      hashtagSheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "URL", key: "url", width: 50 },
        { header: "Автор", key: "author", width: 20 },
        { header: "Просмотры", key: "views", width: 15 },
        { header: "Лайки", key: "likes", width: 15 },
        { header: "Комментарии", key: "comments", width: 15 },
        { header: "Дата публикации", key: "date", width: 20 },
        { header: "Транскрипция", key: "transcript", width: 100 },
      ];

      // Добавляем данные
      for (const reel of reels) {
        hashtagSheet.addRow({
          id: reel.id,
          url: reel.reel_url,
          author: reel.author_username,
          views: reel.views_count,
          likes: reel.likes_count,
          comments: reel.comments_count,
          date: new Date(reel.published_at).toLocaleString(),
          transcript: reel.transcript,
        });
      }

      // Устанавливаем автофильтр
      hashtagSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 8 },
      };

      // Устанавливаем перенос текста для транскрипций
      hashtagSheet
        .getColumn("transcript")
        .eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { wrapText: true };
        });
    }

    // Добавляем лист со всеми рилсами
    const allReelsSheet = workbook.addWorksheet("Все рилсы");

    // Устанавливаем заголовки
    allReelsSheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Хэштег", key: "hashtag", width: 20 },
      { header: "URL", key: "url", width: 50 },
      { header: "Автор", key: "author", width: 20 },
      { header: "Просмотры", key: "views", width: 15 },
      { header: "Лайки", key: "likes", width: 15 },
      { header: "Комментарии", key: "comments", width: 15 },
      { header: "Дата публикации", key: "date", width: 20 },
      { header: "Транскрипция", key: "transcript", width: 100 },
    ];

    // Добавляем данные
    for (const reel of reelsResult.rows) {
      allReelsSheet.addRow({
        id: reel.id,
        hashtag: `#${reel.hashtag_name}`,
        url: reel.reel_url,
        author: reel.author_username,
        views: reel.views_count,
        likes: reel.likes_count,
        comments: reel.comments_count,
        date: new Date(reel.published_at).toLocaleString(),
        transcript: reel.transcript,
      });
    }

    // Устанавливаем автофильтр
    allReelsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 9 },
    };

    // Устанавливаем перенос текста для транскрипций
    allReelsSheet
      .getColumn("transcript")
      .eachCell({ includeEmpty: false }, (cell) => {
        cell.alignment = { wrapText: true };
      });

    // Сохраняем Excel файл
    await workbook.xlsx.writeFile(outputPath);

    console.log(`Экспорт завершен. Файл сохранен: ${outputPath}`);
  } catch (error) {
    console.error("Ошибка при экспорте популярных рилсов по хэштегам:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
