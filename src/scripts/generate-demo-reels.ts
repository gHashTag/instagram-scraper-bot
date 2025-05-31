/**
 * Скрипт для генерации демонстрационных рилсов
 *
 * Использование:
 * bun run src/scripts/generate-demo-reels.ts <projectId> <hashtag> [count] [minViews] [outputPath]
 *
 * Параметры:
 * - projectId: ID проекта
 * - hashtag: Хэштег для поиска рилсов (без символа #)
 * - count: (опционально) Количество рилсов для генерации (по умолчанию 10)
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - outputPath: (опционально) Путь для сохранения файла (по умолчанию "temp/{hashtag}_reels.json")
 */

import { NeonAdapter } from "../adapters/neon-adapter";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Необходимо указать ID проекта и хэштег");
  console.error(
    "Использование: bun run src/scripts/generate-demo-reels.ts <projectId> <hashtag> [count] [minViews] [outputPath]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const hashtag = args[1];
const count = args[2] ? parseInt(args[2], 10) : 10;
const minViews = args[3] ? parseInt(args[3], 10) : 50000;
const outputPath = args[4] || `temp/${hashtag}_reels.json`;

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для генерации случайной даты в пределах последнего месяца
function randomDateLastMonth(): Date {
  const now = new Date();
  const lastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate()
  );
  const diff = now.getTime() - lastMonth.getTime();
  return new Date(lastMonth.getTime() + Math.random() * diff);
}

// Функция для генерации случайного целого числа в заданном диапазоне
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Функция для генерации случайного имени пользователя
function randomUsername(): string {
  const prefixes = [
    "beauty",
    "skin",
    "aesthetic",
    "clinic",
    "dr",
    "med",
    "spa",
    "cosmo",
    "derma",
    "face",
  ];
  const suffixes = [
    "pro",
    "expert",
    "clinic",
    "md",
    "specialist",
    "doctor",
    "official",
    "center",
    "spa",
    "beauty",
  ];
  const numbers = [
    "",
    "",
    "",
    "",
    "",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = numbers[Math.floor(Math.random() * numbers.length)];

  return `${prefix}_${suffix}${number}`;
}

// Функция для генерации случайного описания рила
function randomCaption(hashtag: string): string {
  const intros = [
    "Check out our latest",
    "Amazing results with",
    "Transform your skin with",
    "Experience the power of",
    "See the difference with",
    "Clients love our",
    "Before and after",
    "The best treatment for",
    "Rejuvenate your skin with",
    "Professional results with",
  ];

  const treatments = [
    "hydrafacial treatment",
    "skin rejuvenation",
    "facial treatment",
    "aesthetic procedure",
    "beauty treatment",
    "skin care routine",
    "professional treatment",
    "clinic procedure",
    "spa treatment",
    "medical procedure",
  ];

  const benefits = [
    "for glowing skin",
    "for younger looking skin",
    "for clear complexion",
    "for reducing fine lines",
    "for hydrated skin",
    "for radiant skin",
    "for healthy skin",
    "for beautiful results",
    "for amazing transformation",
    "for professional results",
  ];

  const hashtags = [
    `#${hashtag}`,
    "#aestheticmedicine",
    "#skincare",
    "#beauty",
    "#facial",
    "#clinic",
    "#treatment",
    "#professional",
    "#results",
    "#transformation",
  ];

  const intro = intros[Math.floor(Math.random() * intros.length)];
  const treatment = treatments[Math.floor(Math.random() * treatments.length)];
  const benefit = benefits[Math.floor(Math.random() * benefits.length)];

  // Выбираем случайное количество хэштегов (от 3 до 8)
  const hashtagCount = randomInt(3, 8);
  const selectedHashtags = [];

  // Всегда добавляем основной хэштег
  selectedHashtags.push(hashtags[0]);

  // Добавляем случайные хэштеги
  for (let i = 1; i < hashtagCount; i++) {
    const randomHashtag = hashtags[randomInt(1, hashtags.length - 1)];
    if (!selectedHashtags.includes(randomHashtag)) {
      selectedHashtags.push(randomHashtag);
    }
  }

  return `${intro} ${treatment} ${benefit}! ${selectedHashtags.join(" ")}`;
}

// Функция для генерации случайного ID рила
function randomReelId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let result = "";
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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
      [projectId, tagName, "Добавлен через скрипт generate-demo-reels.ts", true]
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

// Функция для сохранения рила в базу данных
async function saveReel(
  adapter: NeonAdapter,
  projectId: number,
  hashtagId: number,
  reel: any
): Promise<void> {
  try {
    // Проверяем, существует ли рил в базе данных
    const existingReel = await adapter.executeQuery(
      `SELECT id FROM reels WHERE project_id = $1 AND reel_url = $2`,
      [projectId, reel.url]
    );

    if (existingReel.rows.length > 0) {
      console.log(`Рил ${reel.url} уже существует в базе данных`);
      return;
    }

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
        reel.url,
        reel.ownerUsername,
        reel.viewCount,
        reel.likeCount,
        reel.commentCount,
        reel.timestamp,
        JSON.stringify(reel),
      ]
    );

    console.log(`Рил ${reel.url} успешно сохранен в базу данных`);
  } catch (error) {
    console.error(
      `Ошибка при сохранении рила ${reel.url} в базу данных: ${error}`
    );
  }
}

// Функция для генерации демонстрационных рилсов
function generateDemoReels(
  hashtag: string,
  count: number,
  minViews: number
): any[] {
  const results = [];

  for (let i = 1; i <= count; i++) {
    const reelId = randomReelId();
    const viewCount = randomInt(minViews, minViews * 10);
    const likeCount = randomInt(
      Math.floor(viewCount * 0.01),
      Math.floor(viewCount * 0.1)
    );
    const commentCount = randomInt(
      Math.floor(likeCount * 0.01),
      Math.floor(likeCount * 0.1)
    );
    const timestamp = randomDateLastMonth();
    const ownerUsername = randomUsername();
    const caption = randomCaption(hashtag);

    results.push({
      id: reelId,
      url: `https://www.instagram.com/reel/${reelId}/`,
      ownerUsername,
      caption,
      viewCount,
      likeCount,
      commentCount,
      timestamp: timestamp.toISOString(),
      hashtags: caption.match(/#\w+/g) || [`#${hashtag}`],
      type: "reel",
    });
  }

  return results;
}

// Основная функция
async function main() {
  console.log(
    `Генерация ${count} демонстрационных рилсов по хэштегу #${hashtag} с минимум ${minViews} просмотров для проекта ${projectId}`
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

    // Сохраняем хэштег в базу данных
    const hashtagId = await saveHashtag(adapter, projectId, hashtag);

    // Генерируем демонстрационные рилсы
    const reels = generateDemoReels(hashtag, count, minViews);

    console.log(
      `Сгенерировано ${reels.length} демонстрационных рилсов по хэштегу #${hashtag}`
    );

    // Сохраняем результаты в файл
    const outputDir = path.dirname(outputPath);
    ensureDirectoryExists(outputDir);
    fs.writeFileSync(outputPath, JSON.stringify(reels, null, 2));
    console.log(`Результаты сохранены в файл: ${outputPath}`);

    // Сохраняем рилсы в базу данных
    for (const reel of reels) {
      await saveReel(adapter, projectId, hashtagId, reel);
    }

    console.log(`Обработка хэштега #${hashtag} завершена`);
  } catch (error) {
    console.error("Ошибка при генерации и сохранении рилсов:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
