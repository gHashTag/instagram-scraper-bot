/**
 * Скрипт для поиска популярных рилсов по хэштегам косметологии в Instagram
 *
 * Использование:
 * bun run src/scripts/search-popular-hashtag-reels.ts [minViews] [outputPath]
 *
 * Параметры:
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию "exports/popular_hashtag_reels.xlsx")
 */

import * as fs from "fs";
import * as path from "path";
import * as ExcelJS from "exceljs";
import { exec } from "child_process";
import { promisify } from "util";

import * as dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Промисифицируем exec
const execAsync = promisify(exec);

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const minViews = args[0] ? parseInt(args[0], 10) : 50000;
const outputPath = args[1] || "exports/popular_hashtag_reels.xlsx";

if (isNaN(minViews)) {
  console.error("Ошибка: minViews должно быть числом");
  process.exit(1);
}

// Список хэштегов косметологии
const cosmetologyHashtags = [
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

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для поиска популярных рилсов по хэштегу с помощью Instagram Reel Scraper API
async function searchPopularReelsByHashtag(
  hashtag: string,
  minViews: number
): Promise<any[]> {
  try {
    console.log(
      `Поиск популярных рилсов по хэштегу #${hashtag} с минимум ${minViews} просмотров...`
    );

    // Создаем временный файл для хранения результатов
    const tempDir = path.join(process.cwd(), "temp");
    ensureDirectoryExists(tempDir);
    const tempFilePath = path.join(tempDir, `${hashtag}_reels.json`);

    // Используем curl для запроса к Instagram Reel Scraper API
    const apifyApiToken = process.env.APIFY_TOKEN; // Используем токен из .env файла
    if (!apifyApiToken) {
      throw new Error("APIFY_TOKEN не найден в .env файле");
    }

    console.log(`Используем токен Apify: ${apifyApiToken.substring(0, 10)}...`);
    const apiUrl = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${apifyApiToken}`;
    const command = `curl -s -X POST "${apiUrl}" -H "Content-Type: application/json" -d '{"hashtags": ["${hashtag}"], "resultsLimit": 100}' > "${tempFilePath}"`;

    console.log(`Выполнение команды: ${command}`);
    await execAsync(command);

    // Проверяем, что файл был создан
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Файл с результатами не был создан: ${tempFilePath}`);
    }

    // Читаем результаты из файла
    const data = JSON.parse(fs.readFileSync(tempFilePath, "utf-8"));

    // Фильтруем рилсы по количеству просмотров
    const popularReels = data.filter((reel: any) => {
      const viewsCount = parseInt(reel.viewCount || "0", 10);
      return viewsCount >= minViews;
    });

    console.log(
      `Найдено ${popularReels.length} популярных рилсов по хэштегу #${hashtag}`
    );

    // Удаляем временный файл
    fs.unlinkSync(tempFilePath);

    return popularReels;
  } catch (error) {
    console.error(
      `Ошибка при поиске популярных рилсов по хэштегу #${hashtag}: ${error}`
    );
    return [];
  }
}

// Функция для экспорта популярных рилсов в Excel
async function exportPopularReelsToExcel(
  reelsByHashtag: Map<string, any[]>,
  outputPath: string
): Promise<void> {
  try {
    console.log(`Экспорт популярных рилсов в Excel: ${outputPath}`);

    // Создаем директорию для экспорта, если она не существует
    const outputDir = path.dirname(outputPath);
    ensureDirectoryExists(outputDir);

    // Создаем Excel файл
    const workbook = new ExcelJS.Workbook();

    // Добавляем лист с общей информацией
    const summarySheet = workbook.addWorksheet("Общая информация");
    summarySheet.columns = [
      { header: "Параметр", key: "parameter", width: 30 },
      { header: "Значение", key: "value", width: 50 },
    ];

    // Добавляем общую информацию
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
      value: cosmetologyHashtags.length,
    });

    // Подсчитываем общее количество рилсов
    let totalReelsCount = 0;
    for (const [, reels] of reelsByHashtag.entries()) {
      totalReelsCount += reels.length;
    }

    summarySheet.addRow({
      parameter: "Всего популярных рилсов",
      value: totalReelsCount,
    });

    // Добавляем пустую строку
    summarySheet.addRow({});

    // Добавляем статистику по хэштегам
    summarySheet.addRow({ parameter: "Статистика по хэштегам", value: "" });
    summarySheet.addRow({
      parameter: "Хэштег",
      value: "Количество популярных рилсов",
    });

    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      summarySheet.addRow({
        parameter: `#${hashtagName}`,
        value: reels.length,
      });
    }

    // Добавляем листы для каждого хэштега
    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      if (reels.length === 0) continue;

      const hashtagSheet = workbook.addWorksheet(`#${hashtagName}`);

      // Устанавливаем заголовки
      hashtagSheet.columns = [
        { header: "URL", key: "url", width: 50 },
        { header: "Автор", key: "author", width: 20 },
        { header: "Просмотры", key: "views", width: 15 },
        { header: "Лайки", key: "likes", width: 15 },
        { header: "Комментарии", key: "comments", width: 15 },
        { header: "Дата публикации", key: "date", width: 20 },
        { header: "Описание", key: "caption", width: 100 },
      ];

      // Добавляем данные
      for (const reel of reels) {
        hashtagSheet.addRow({
          url: reel.url,
          author: reel.ownerUsername,
          views: reel.viewCount,
          likes: reel.likeCount,
          comments: reel.commentCount,
          date: new Date(reel.timestamp).toLocaleString(),
          caption: reel.caption,
        });
      }

      // Устанавливаем автофильтр
      hashtagSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 7 },
      };

      // Устанавливаем перенос текста для описаний
      hashtagSheet
        .getColumn("caption")
        .eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { wrapText: true };
        });
    }

    // Добавляем лист со всеми рилсами
    const allReelsSheet = workbook.addWorksheet("Все рилсы");

    // Устанавливаем заголовки
    allReelsSheet.columns = [
      { header: "Хэштег", key: "hashtag", width: 20 },
      { header: "URL", key: "url", width: 50 },
      { header: "Автор", key: "author", width: 20 },
      { header: "Просмотры", key: "views", width: 15 },
      { header: "Лайки", key: "likes", width: 15 },
      { header: "Комментарии", key: "comments", width: 15 },
      { header: "Дата публикации", key: "date", width: 20 },
      { header: "Описание", key: "caption", width: 100 },
    ];

    // Добавляем данные
    for (const [hashtagName, reels] of reelsByHashtag.entries()) {
      for (const reel of reels) {
        allReelsSheet.addRow({
          hashtag: `#${hashtagName}`,
          url: reel.url,
          author: reel.ownerUsername,
          views: reel.viewCount,
          likes: reel.likeCount,
          comments: reel.commentCount,
          date: new Date(reel.timestamp).toLocaleString(),
          caption: reel.caption,
        });
      }
    }

    // Устанавливаем автофильтр
    allReelsSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 8 },
    };

    // Устанавливаем перенос текста для описаний
    allReelsSheet
      .getColumn("caption")
      .eachCell({ includeEmpty: false }, (cell) => {
        cell.alignment = { wrapText: true };
      });

    // Сохраняем Excel файл
    await workbook.xlsx.writeFile(outputPath);

    console.log(`Экспорт завершен. Файл сохранен: ${outputPath}`);
  } catch (error) {
    console.error(`Ошибка при экспорте популярных рилсов в Excel: ${error}`);
  }
}

// Основная функция
async function main() {
  console.log(
    `Поиск популярных рилсов по хэштегам косметологии с минимум ${minViews} просмотров`
  );

  // Создаем Map для хранения рилсов по хэштегам
  const reelsByHashtag = new Map<string, any[]>();

  // Обрабатываем каждый хэштег
  for (const hashtag of cosmetologyHashtags) {
    const popularReels = await searchPopularReelsByHashtag(hashtag, minViews);
    reelsByHashtag.set(hashtag, popularReels);

    // Пауза между запросами
    if (cosmetologyHashtags.indexOf(hashtag) < cosmetologyHashtags.length - 1) {
      console.log("Пауза перед обработкой следующего хэштега...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Экспортируем результаты в Excel
  await exportPopularReelsToExcel(reelsByHashtag, outputPath);
}

// Запускаем основную функцию
main();
