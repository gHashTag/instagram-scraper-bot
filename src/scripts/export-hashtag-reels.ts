/**
 * Скрипт для экспорта Reels по хэштегам в Excel
 *
 * Использование:
 * bun run src/scripts/export-hashtag-reels.ts <projectId> [minViews] [daysBack] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 * - outputPath: (опционально) Путь для сохранения Excel файла (по умолчанию "exports/hashtag_reels.xlsx")
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";

import ExcelJS from "exceljs";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/export-hashtag-reels.ts <projectId> [minViews] [daysBack] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const outputPath = args[3] || "exports/hashtag_reels.xlsx";

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack)) {
  console.error("Ошибка: projectId, minViews и daysBack должны быть числами");
  process.exit(1);
}

// Функция для проверки, является ли транскрипция реальной
function isRealTranscription(transcript: string | null): boolean {
  if (!transcript) return false;

  // Проверяем, содержит ли транскрипция фейковые фразы
  const fakeTranscriptionPhrases = [
    "Субтитры делал",
    "Субтитры сделал",
    "Субтитры добавил",
    "Субтитры подготовил",
    "ПОДПИШИСЬ",
    "С вами был",
    "Спасибо за субтитры",
    "Один, два, три",
    "Фристайлер",
  ];

  for (const phrase of fakeTranscriptionPhrases) {
    if (transcript.includes(phrase)) {
      return false;
    }
  }

  // Проверяем, содержит ли транскрипция фразы-заглушки от GPT
  const placeholderPhrases = [
    "Так как в предоставленном тексте нет",
    "К сожалению, в представленном вами тексте нет",
    "Так как представленный текст не содержит",
    "Пожалуйста, предоставьте более подробный текст",
    "исправить или улучшить его невозможно",
    "улучшить его не представляется возможным",
    "Спасибо за просмотр",
    "Благодарю за просмотр",
  ];

  for (const phrase of placeholderPhrases) {
    if (transcript.includes(phrase)) {
      return false;
    }
  }

  // Проверяем длину транскрипции
  if (transcript.length < 10) {
    return false;
  }

  return true;
}

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для форматирования даты
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Основная функция
async function main() {
  console.log(
    `Экспорт Reels по хэштегам для проекта ${projectId} с минимум ${minViews} просмотров за последние ${daysBack} дней`
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
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем информацию о проекте
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

    // Получаем список Reels по хэштегам
    try {
      const reelsResult = await adapter.executeQuery(
        `SELECT r.*, h.tag_name as hashtag_name
         FROM reels r, hashtags h
         WHERE r.project_id = $1
         AND h.project_id = $1
         AND r.source_type = 'hashtag'
         AND r.views_count >= $2
         AND h.id::text = r.source_identifier
         ORDER BY h.tag_name, r.views_count DESC`,
        [projectId, minViews]
      );

      if (!reelsResult || !reelsResult.rows) {
        console.log("Запрос не вернул результатов или произошла ошибка");
        return;
      }

      console.log(
        `Найдено ${reelsResult.rows.length} Reels по хэштегам с минимум ${minViews} просмотров за последние ${daysBack} дней`
      );

      if (reelsResult.rows.length === 0) {
        console.log("Нет Reels по хэштегам для экспорта");
        return;
      }

      // Фильтруем Reels с реальными транскрипциями
      const reelsWithRealTranscription = reelsResult.rows.filter((reel) =>
        isRealTranscription(reel.transcript)
      );

      console.log(
        `Reels с реальными транскрипциями: ${reelsWithRealTranscription.length}`
      );
      console.log(
        `Reels без реальных транскрипций: ${reelsResult.rows.length - reelsWithRealTranscription.length}`
      );

      // Группируем Reels по хэштегам
      const reelsByHashtag = new Map<string, any[]>();
      for (const reel of reelsWithRealTranscription) {
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
        parameter: "Период",
        value: `${formatDate(date30DaysAgo)} - ${formatDate(new Date())}`,
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
        parameter: "Всего Reels",
        value: reelsResult.rows.length,
      });
      summarySheet.addRow({
        parameter: "Reels с реальными транскрипциями",
        value: reelsWithRealTranscription.length,
      });
      summarySheet.addRow({
        parameter: "Reels без реальных транскрипций",
        value: reelsResult.rows.length - reelsWithRealTranscription.length,
      });

      // Добавляем пустую строку
      summarySheet.addRow({});

      // Добавляем статистику по хэштегам
      summarySheet.addRow({ parameter: "Статистика по хэштегам", value: "" });
      summarySheet.addRow({
        parameter: "Хэштег",
        value: "Количество Reels с реальными транскрипциями",
      });

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
            date: new Date(reel.published_at).toLocaleString(),
            transcript: reel.transcript,
          });
        }

        // Устанавливаем автофильтр
        hashtagSheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: 6 },
        };

        // Устанавливаем перенос текста для транскрипций
        hashtagSheet
          .getColumn("transcript")
          .eachCell({ includeEmpty: false }, (cell) => {
            cell.alignment = { wrapText: true };
          });
      }

      // Добавляем лист со всеми Reels
      const allReelsSheet = workbook.addWorksheet("Все Reels");

      // Устанавливаем заголовки
      allReelsSheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Хэштег", key: "hashtag", width: 20 },
        { header: "URL", key: "url", width: 50 },
        { header: "Автор", key: "author", width: 20 },
        { header: "Просмотры", key: "views", width: 15 },
        { header: "Дата публикации", key: "date", width: 20 },
        { header: "Транскрипция", key: "transcript", width: 100 },
      ];

      // Добавляем данные
      for (const reel of reelsWithRealTranscription) {
        allReelsSheet.addRow({
          id: reel.id,
          hashtag: `#${reel.hashtag_name}`,
          url: reel.reel_url,
          author: reel.author_username,
          views: reel.views_count,
          date: new Date(reel.published_at).toLocaleString(),
          transcript: reel.transcript,
        });
      }

      // Устанавливаем автофильтр
      allReelsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 7 },
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
      console.error(
        "Ошибка при получении или обработке Reels по хэштегам:",
        error
      );
    }
  } catch (error) {
    console.error("Ошибка при экспорте Reels по хэштегам:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
