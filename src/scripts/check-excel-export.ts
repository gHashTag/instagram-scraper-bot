/**
 * Скрипт для проверки экспортированного Excel файла
 *
 * Использование:
 * bun run src/scripts/check-excel-export.ts <excelFilePath>
 *
 * Параметры:
 * - excelFilePath: Путь к Excel файлу
 */

import * as fs from "fs";

import ExcelJS from "exceljs";
import { logger } from "../logger";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/check-excel-export.ts <excelFilePath>"
  );
  process.exit(1);
}

const excelFilePath = args[0];

if (!fs.existsSync(excelFilePath)) {
  logger.error(`Файл не найден: ${excelFilePath}`);
  process.exit(1);
}

async function main() {
  try {
    logger.info(`Проверка Excel файла: ${excelFilePath}`);

    // Загружаем Excel файл
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);

    // Получаем список листов
    const worksheets = workbook.worksheets;
    logger.info(`Количество листов: ${worksheets.length}`);

    // Проверяем каждый лист
    for (const worksheet of worksheets) {
      logger.info(`\nЛист: ${worksheet.name}`);

      // Получаем заголовки
      const headers = worksheet.getRow(1).values;
      logger.info(`Заголовки: ${headers.slice(1).join(", ")}`);

      // Проверяем, есть ли колонка "Транскрипция"
      const transcriptColumnIndex = headers.findIndex(
        (header: any) => header === "Транскрипция"
      );
      if (transcriptColumnIndex === -1) {
        logger.warn(
          `Колонка "Транскрипция" не найдена на листе ${worksheet.name}`
        );
        continue;
      }

      logger.info(
        `Колонка "Транскрипция" найдена (индекс: ${transcriptColumnIndex})`
      );

      // Получаем количество строк
      const rowCount = worksheet.rowCount;
      logger.info(`Количество строк: ${rowCount}`);

      // Проверяем первые 5 строк с данными
      logger.info("\nПримеры данных:");
      for (let i = 2; i <= Math.min(6, rowCount); i++) {
        const row = worksheet.getRow(i);
        const id = row.getCell(1).value;
        const transcript = row.getCell(transcriptColumnIndex).value;

        logger.info(`Строка ${i}:`);
        logger.info(`  ID: ${id}`);
        logger.info(
          `  Транскрипция: ${transcript ? transcript.toString().substring(0, 100) + (transcript.toString().length > 100 ? "..." : "") : "NULL"}`
        );
      }

      // Подсчитываем строки с транскрипцией и без
      let rowsWithTranscript = 0;
      let rowsWithoutTranscript = 0;

      for (let i = 2; i <= rowCount; i++) {
        const row = worksheet.getRow(i);
        const transcript = row.getCell(transcriptColumnIndex).value;

        if (transcript) {
          rowsWithTranscript++;
        } else {
          rowsWithoutTranscript++;
        }
      }

      logger.info(`\nСтроки с транскрипцией: ${rowsWithTranscript}`);
      logger.info(`Строки без транскрипции: ${rowsWithoutTranscript}`);
    }

    logger.info("\nПроверка завершена");
    process.exit(0);
  } catch (error) {
    logger.error("Ошибка при проверке Excel файла:", error);
    process.exit(1);
  }
}

main();
