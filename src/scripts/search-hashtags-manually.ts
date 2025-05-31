/**
 * Скрипт для поиска хэштегов и сохранения их в базу данных
 *
 * Использование:
 * bun run src/scripts/search-hashtags-manually.ts <projectId>
 *
 * Параметры:
 * - projectId: ID проекта
 */

import { NeonAdapter } from "../adapters/neon-adapter";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/search-hashtags-manually.ts <projectId>"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);

if (isNaN(projectId)) {
  console.error("Ошибка: projectId должен быть числом");
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

// Функция для сохранения хэштега в базу данных
async function saveHashtag(
  adapter: NeonAdapter,
  projectId: number,
  tagName: string
): Promise<number> {
  try {
    // Проверяем, существует ли хэштег в базе данных
    const existingHashtag = await adapter.executeQuery(
      `SELECT id FROM hashtags WHERE project_id = $1 AND tag_name = $2`,
      [projectId, tagName]
    );

    if (existingHashtag.rows.length > 0) {
      console.log(`Хэштег #${tagName} уже существует в базе данных`);
      return existingHashtag.rows[0].id;
    }

    // Сохраняем хэштег в базу данных
    const result = await adapter.executeQuery(
      `INSERT INTO hashtags (project_id, tag_name, notes, is_active, added_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
       RETURNING id`,
      [
        projectId,
        tagName,
        "Добавлен через скрипт search-hashtags-manually.ts",
        true,
      ]
    );

    console.log(`Хэштег #${tagName} успешно сохранен в базу данных`);
    return result.rows[0].id;
  } catch (error) {
    console.error(
      `Ошибка при сохранении хэштега #${tagName} в базу данных: ${error}`
    );
    throw error;
  }
}

// Функция для создания примера рила для хэштега
async function createSampleReel(
  adapter: NeonAdapter,
  projectId: number,
  hashtagId: number,
  tagName: string
): Promise<void> {
  try {
    // Проверяем, существует ли рил для этого хэштега
    const existingReel = await adapter.executeQuery(
      `SELECT id FROM reels WHERE project_id = $1 AND source_type = 'hashtag' AND source_identifier = $2`,
      [projectId, hashtagId.toString()]
    );

    if (existingReel.rows.length > 0) {
      console.log(`Рил для хэштега #${tagName} уже существует в базе данных`);
      return;
    }

    // Создаем пример URL для рила
    const reelUrl = `https://www.instagram.com/explore/tags/${tagName}/`;

    // Сохраняем рил в базу данных
    await adapter.executeQuery(
      `INSERT INTO reels (
        project_id, source_type, source_identifier, reel_url, author_username,
        views_count, likes_count, comments_count, published_at, raw_data,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        projectId,
        "hashtag",
        hashtagId.toString(),
        reelUrl,
        "instagram",
        0,
        0,
        0,
        new Date(),
        JSON.stringify({ tagName }),
      ]
    );

    console.log(
      `Пример рила для хэштега #${tagName} успешно сохранен в базу данных`
    );
  } catch (error) {
    console.error(
      `Ошибка при создании примера рила для хэштега #${tagName}: ${error}`
    );
  }
}

// Основная функция
async function main() {
  console.log(`Поиск хэштегов косметологии для проекта ${projectId}`);

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

    // Обрабатываем каждый хэштег
    for (const hashtag of cosmetologyHashtags) {
      try {
        // Сохраняем хэштег в базу данных
        const hashtagId = await saveHashtag(adapter, projectId, hashtag);

        // Создаем пример рила для хэштега
        await createSampleReel(adapter, projectId, hashtagId, hashtag);

        console.log(`Обработка хэштега #${hashtag} завершена`);
      } catch (error) {
        console.error(`Ошибка при обработке хэштега #${hashtag}: ${error}`);
      }
    }

    console.log("Поиск хэштегов завершен");

    // Выводим статистику
    const hashtagsResult = await adapter.executeQuery(
      `SELECT h.tag_name, COUNT(r.id) as reels_count 
       FROM hashtags h 
       LEFT JOIN reels r ON h.id::text = r.source_identifier AND r.source_type = 'hashtag' 
       WHERE h.project_id = $1 
       GROUP BY h.tag_name 
       ORDER BY reels_count DESC`,
      [projectId]
    );

    console.log("\nСтатистика по хэштегам:");
    console.log("=======================");

    for (const row of hashtagsResult.rows) {
      console.log(`#${row.tag_name}: ${row.reels_count} рилов`);
    }
  } catch (error) {
    console.error("Ошибка при поиске хэштегов:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
