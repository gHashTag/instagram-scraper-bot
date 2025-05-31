/**
 * Скрипт для экспорта детализированных рилсов по хэштегам в красивую Excel-таблицу
 *
 * Использование:
 * bun run src/scripts/export-detailed-hashtag-reels.ts <projectId> [minViews] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию "exports/detailed_hashtag_reels.xlsx")
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import * as ExcelJS from "exceljs";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/export-detailed-hashtag-reels.ts <projectId> [minViews] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const outputPath = args[2] || "exports/detailed_hashtag_reels.xlsx";

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

// Функция для форматирования даты
function formatDate(date: Date): string {
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Функция для форматирования числа с разделителями тысяч
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Функция для определения цвета ячейки в зависимости от значения
function getColorByValue(
  value: number,
  type: "views" | "likes" | "comments"
): string {
  if (type === "views") {
    if (value >= 1000000) return "FF4CAF50"; // Зеленый для 1M+
    if (value >= 500000) return "FF8BC34A"; // Светло-зеленый для 500K+
    if (value >= 100000) return "FFFFC107"; // Желтый для 100K+
    return "FFFFFFFF"; // Белый для остальных
  } else if (type === "likes") {
    if (value >= 100000) return "FF4CAF50"; // Зеленый для 100K+
    if (value >= 50000) return "FF8BC34A"; // Светло-зеленый для 50K+
    if (value >= 10000) return "FFFFC107"; // Желтый для 10K+
    return "FFFFFFFF"; // Белый для остальных
  } else if (type === "comments") {
    if (value >= 10000) return "FF4CAF50"; // Зеленый для 10K+
    if (value >= 5000) return "FF8BC34A"; // Светло-зеленый для 5K+
    if (value >= 1000) return "FFFFC107"; // Желтый для 1K+
    return "FFFFFFFF"; // Белый для остальных
  }
  return "FFFFFFFF"; // Белый по умолчанию
}

// Функция для анализа транскрипции и выделения ключевых тем
function analyzeTranscription(transcript: string): string[] {
  if (!transcript) return [];

  // Список ключевых слов для косметологии
  const keywords = [
    "гиалуроновая кислота",
    "ботокс",
    "филлеры",
    "пилинг",
    "мезотерапия",
    "лифтинг",
    "омоложение",
    "увлажнение",
    "очищение",
    "массаж",
    "маска",
    "сыворотка",
    "крем",
    "процедура",
    "уход",
    "кожа",
    "лицо",
    "морщины",
    "акне",
    "пигментация",
    "гидрофейшл",
    "гидрофейшиал",
    "hydrafacial",
  ];

  const foundKeywords = [];

  for (const keyword of keywords) {
    if (transcript.toLowerCase().includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }

  return foundKeywords;
}

// Основная функция
async function main() {
  console.log(
    `Экспорт детализированных рилсов по хэштегам для проекта ${projectId} с минимум ${minViews} просмотров`
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
    workbook.creator = "Instagram Scraper Bot";
    workbook.lastModifiedBy = "Instagram Scraper Bot";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Добавляем лист с общей информацией
    const summarySheet = workbook.addWorksheet("Общая информация");
    summarySheet.properties.tabColor = { argb: "4472C4" };

    // Добавляем логотип или заголовок
    summarySheet.mergeCells("A1:B3");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = "Анализ популярных Instagram Reels";
    titleCell.font = {
      name: "Arial",
      size: 24,
      bold: true,
      color: { argb: "4472C4" },
    };
    titleCell.alignment = {
      vertical: "middle",
      horizontal: "center",
    };

    // Добавляем общую информацию
    summarySheet.getColumn("A").width = 30;
    summarySheet.getColumn("B").width = 50;

    // Добавляем стили для заголовков
    const headerStyle = {
      font: {
        name: "Arial",
        size: 12,
        bold: true,
        color: { argb: "FFFFFF" },
      },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4472C4" },
      },
      alignment: {
        vertical: "middle",
        horizontal: "left",
      },
    };

    // Добавляем заголовки
    summarySheet.addRow(["Параметр", "Значение"]);
    const headerRow = summarySheet.lastRow;
    if (headerRow) {
      headerRow.eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = {
          type: "pattern" as const,
          pattern: "solid" as const,
          fgColor: { argb: "FFD3D3D3" },
        };
        cell.alignment = {
          vertical: "middle" as const,
          horizontal: "center" as const,
        };
      });
    }

    // Добавляем данные
    summarySheet.addRow(["Проект", project.name]);
    summarySheet.addRow(["Дата экспорта", new Date().toLocaleString()]);
    summarySheet.addRow([
      "Минимальное количество просмотров",
      formatNumber(minViews),
    ]);
    summarySheet.addRow(["Всего хэштегов", hashtagsResult.rows.length]);
    summarySheet.addRow(["Всего рилсов", reelsResult.rows.length]);

    // Добавляем пустую строку
    summarySheet.addRow([]);

    // Добавляем статистику по хэштегам
    summarySheet.addRow(["Статистика по хэштегам", ""]);
    const statHeaderRow = summarySheet.lastRow;
    if (statHeaderRow) {
      statHeaderRow.getCell(1).font = headerStyle.font;
      statHeaderRow.getCell(1).fill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FFD3D3D3" },
      };
      statHeaderRow.getCell(2).fill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FFD3D3D3" },
      };
    }

    summarySheet.addRow(["Хэштег", "Количество рилсов"]);
    const statSubHeaderRow = summarySheet.lastRow;
    if (statSubHeaderRow) {
      statSubHeaderRow.eachCell((cell) => {
        cell.font = {
          name: "Arial",
          size: 12,
          bold: true,
        };
      });
    }

    // Добавляем данные по хэштегам
    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      summarySheet.addRow([`#${hashtagName}`, reels.length]);
    }

    // Пропускаем добавление диаграммы, так как текущая версия ExcelJS в проекте не поддерживает эту функцию

    // Добавляем пустые строки для разделения
    summarySheet.addRow([]);
    summarySheet.addRow([]);

    // Добавляем листы для каждого хэштега
    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      const hashtagSheet = workbook.addWorksheet(`#${hashtagName}`);
      hashtagSheet.properties.tabColor = { argb: "4472C4" };

      // Устанавливаем заголовки
      hashtagSheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "URL", key: "url", width: 50 },
        { header: "Автор", key: "author", width: 20 },
        { header: "Просмотры", key: "views", width: 15 },
        { header: "Лайки", key: "likes", width: 15 },
        { header: "Комментарии", key: "comments", width: 15 },
        { header: "Дата публикации", key: "date", width: 20 },
        { header: "Ключевые темы", key: "keywords", width: 30 },
        { header: "Транскрипция", key: "transcript", width: 100 },
      ];

      // Стилизуем заголовки
      hashtagSheet.getRow(1).eachCell((cell) => {
        cell.font = headerStyle.font;
        cell.fill = {
          type: "pattern" as const,
          pattern: "solid" as const,
          fgColor: { argb: "FFD3D3D3" },
        };
        cell.alignment = {
          vertical: "middle" as const,
          horizontal: "center" as const,
        };
      });

      // Добавляем данные
      for (const reel of reels) {
        // Анализируем транскрипцию для выделения ключевых тем
        const keywords = analyzeTranscription(reel.transcript);

        const row = hashtagSheet.addRow({
          id: reel.id,
          url: reel.reel_url,
          author: reel.author_username,
          views: formatNumber(reel.views_count),
          likes: formatNumber(reel.likes_count),
          comments: formatNumber(reel.comments_count),
          date: formatDate(new Date(reel.published_at)),
          keywords: keywords.join(", "),
          transcript: reel.transcript || "Транскрипция отсутствует",
        });

        // Добавляем гиперссылку на URL
        const urlCell = row.getCell("url");
        urlCell.value = {
          text: reel.reel_url,
          hyperlink: reel.reel_url,
          tooltip: "Открыть в Instagram",
        };
        urlCell.font = {
          color: { argb: "0563C1" },
          underline: true,
        };

        // Добавляем цветовое форматирование для просмотров, лайков и комментариев
        const viewsCell = row.getCell("views");
        viewsCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: getColorByValue(reel.views_count, "views") },
        };
        viewsCell.alignment = { horizontal: "right" };

        const likesCell = row.getCell("likes");
        likesCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: getColorByValue(reel.likes_count, "likes") },
        };
        likesCell.alignment = { horizontal: "right" };

        const commentsCell = row.getCell("comments");
        commentsCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: getColorByValue(reel.comments_count, "comments") },
        };
        commentsCell.alignment = { horizontal: "right" };
      }

      // Устанавливаем автофильтр
      hashtagSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 9 },
      };

      // Устанавливаем перенос текста для транскрипций
      hashtagSheet
        .getColumn("transcript")
        .eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { wrapText: true };
        });

      // Устанавливаем перенос текста для ключевых тем
      hashtagSheet
        .getColumn("keywords")
        .eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { wrapText: true };
        });

      // Добавляем условное форматирование
      hashtagSheet.addConditionalFormatting({
        ref: `D2:D${reels.length + 1}`,
        rules: [
          {
            type: "cellIs",
            operator: "greaterThan",
            formulae: ["1000000"],
            priority: 1,
            style: {
              font: { color: { argb: "FF006100" } },
            },
          },
        ],
      });
    }

    // Добавляем лист со всеми рилсами
    const allReelsSheet = workbook.addWorksheet("Все рилсы");
    allReelsSheet.properties.tabColor = { argb: "4472C4" };

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
      { header: "Ключевые темы", key: "keywords", width: 30 },
      { header: "Транскрипция", key: "transcript", width: 100 },
    ];

    // Стилизуем заголовки
    allReelsSheet.getRow(1).eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.fill = {
        type: "pattern" as const,
        pattern: "solid" as const,
        fgColor: { argb: "FFD3D3D3" },
      };
      cell.alignment = {
        vertical: "middle" as const,
        horizontal: "center" as const,
      };
    });

    // Добавляем данные
    for (const reel of reelsResult.rows) {
      // Анализируем транскрипцию для выделения ключевых тем
      const keywords = analyzeTranscription(reel.transcript);

      const row = allReelsSheet.addRow({
        id: reel.id,
        hashtag: `#${reel.hashtag_name}`,
        url: reel.reel_url,
        author: reel.author_username,
        views: formatNumber(reel.views_count),
        likes: formatNumber(reel.likes_count),
        comments: formatNumber(reel.comments_count),
        date: formatDate(new Date(reel.published_at)),
        keywords: keywords.join(", "),
        transcript: reel.transcript || "Транскрипция отсутствует",
      });

      // Добавляем гиперссылку на URL
      const urlCell = row.getCell("url");
      urlCell.value = {
        text: reel.reel_url,
        hyperlink: reel.reel_url,
        tooltip: "Открыть в Instagram",
      };
      urlCell.font = {
        color: { argb: "0563C1" },
        underline: true,
      };

      // Добавляем цветовое форматирование для просмотров, лайков и комментариев
      const viewsCell = row.getCell("views");
      viewsCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: getColorByValue(reel.views_count, "views") },
      };
      viewsCell.alignment = { horizontal: "right" };

      const likesCell = row.getCell("likes");
      likesCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: getColorByValue(reel.likes_count, "likes") },
      };
      likesCell.alignment = { horizontal: "right" };

      const commentsCell = row.getCell("comments");
      commentsCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: getColorByValue(reel.comments_count, "comments") },
      };
      commentsCell.alignment = { horizontal: "right" };
    }

    // Устанавливаем автофильтр
    allReelsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 10 },
    };

    // Устанавливаем перенос текста для транскрипций
    allReelsSheet
      .getColumn("transcript")
      .eachCell({ includeEmpty: false }, (cell) => {
        cell.alignment = { wrapText: true };
      });

    // Устанавливаем перенос текста для ключевых тем
    allReelsSheet
      .getColumn("keywords")
      .eachCell({ includeEmpty: false }, (cell) => {
        cell.alignment = { wrapText: true };
      });

    // Сохраняем Excel файл
    await workbook.xlsx.writeFile(outputPath);

    console.log(`Экспорт завершен. Файл сохранен: ${outputPath}`);
  } catch (error) {
    console.error(
      "Ошибка при экспорте детализированных рилсов по хэштегам:",
      error
    );
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
