/**
 * Скрипт для генерации демонстрационных рилсов для всех хэштегов
 *
 * Использование:
 * bun run src/scripts/generate-demo-reels-for-all-hashtags.ts <projectId> [count] [minViews]
 *
 * Параметры:
 * - projectId: ID проекта
 * - count: (опционально) Количество рилсов для генерации для каждого хэштега (по умолчанию 10)
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Промисифицируем exec
const execAsync = promisify(exec);

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Необходимо указать ID проекта");
  console.error(
    "Использование: bun run src/scripts/generate-demo-reels-for-all-hashtags.ts <projectId> [count] [minViews]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const count = args[1] ? parseInt(args[1], 10) : 10;
const minViews = args[2] ? parseInt(args[2], 10) : 50000;

// Основная функция
async function main() {
  console.log(
    `Генерация ${count} демонстрационных рилсов для всех хэштегов с минимум ${minViews} просмотров для проекта ${projectId}`
  );

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

    // Получаем список хэштегов
    const hashtagsResult = await adapter.executeQuery(
      `SELECT id, tag_name FROM hashtags WHERE project_id = $1 ORDER BY tag_name`,
      [projectId]
    );

    if (hashtagsResult.rows.length === 0) {
      console.error(`Хэштеги для проекта с ID ${projectId} не найдены`);
      return;
    }

    console.log(`Найдено ${hashtagsResult.rows.length} хэштегов`);

    // Для каждого хэштега генерируем рилсы
    for (const hashtag of hashtagsResult.rows) {
      // Проверяем, сколько рилсов уже есть для этого хэштега
      const reelsCountResult = await adapter.executeQuery(
        `SELECT COUNT(*) FROM reels WHERE project_id = $1 AND source_type = 'hashtag' AND source_identifier = $2::text`,
        [projectId, hashtag.id]
      );

      const reelsCount = parseInt(reelsCountResult.rows[0].count, 10);
      console.log(
        `Хэштег #${hashtag.tag_name} (ID: ${hashtag.id}): ${reelsCount} рилсов`
      );

      // Если рилсов меньше, чем нужно, генерируем дополнительные
      if (reelsCount < count) {
        const countToGenerate = count - reelsCount;
        console.log(
          `Генерация ${countToGenerate} дополнительных рилсов для хэштега #${hashtag.tag_name}`
        );

        // Запускаем скрипт generate-demo-reels.ts
        try {
          const command = `bun run src/scripts/generate-demo-reels.ts ${projectId} ${hashtag.tag_name} ${countToGenerate} ${minViews}`;
          console.log(`Выполнение команды: ${command}`);

          const { stdout, stderr } = await execAsync(command);

          if (stderr) {
            console.error(`Ошибка при выполнении команды: ${stderr}`);
          }

          console.log(`Результат выполнения команды: ${stdout}`);
        } catch (error) {
          console.error(`Ошибка при выполнении команды: ${error}`);
        }
      } else {
        console.log(
          `Для хэштега #${hashtag.tag_name} уже есть достаточно рилсов (${reelsCount} >= ${count})`
        );
      }
    }

    console.log("Генерация рилсов для всех хэштегов завершена");
  } catch (error) {
    console.error("Ошибка при генерации рилсов:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
