/**
 * Мок-скрипт для имитации парсинга Reels конкурентов
 * Используется для тестирования функциональности сохранения данных
 *
 * Использование:
 * bun run src/scripts/mock-scrape-competitor.ts <projectId> <competitorId> [count]
 */

import {
  initializeDBConnection,
  getCompetitorAccountsByProjectId,
  saveReel,
} from "../db/neonDB";
import { logger } from "../logger";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// Загружаем переменные окружения
dotenv.config();

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error(
    "Использование: bun run src/scripts/mock-scrape-competitor.ts <projectId> <competitorId> [count]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const competitorId = parseInt(args[1], 10);
const count = args[2] ? parseInt(args[2], 10) : 5;

if (isNaN(projectId) || isNaN(competitorId) || isNaN(count)) {
  logger.error("Ошибка: projectId, competitorId и count должны быть числами");
  process.exit(1);
}

/**
 * Генерирует случайное число в заданном диапазоне
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Генерирует случайную дату в пределах указанного количества дней от текущей даты
 */
function getRandomDate(maxDaysAgo: number): Date {
  const now = new Date();
  const daysAgo = getRandomInt(0, maxDaysAgo);
  now.setDate(now.getDate() - daysAgo);
  return now;
}

/**
 * Генерирует мок-данные для Reels
 */
function generateMockReels(
  competitorUsername: string,
  competitorProfileUrl: string,
  count: number
) {
  const reels = [];

  const captions = [
    "Новая процедура для омоложения кожи! 💉✨ #красота #косметология",
    "Результаты до и после увеличения губ 👄 #филлеры #губы",
    "Секреты молодости от наших специалистов 🌟 #антивозрастнаякосметология",
    "Убираем морщины без операции! Смотрите результат 👀 #ботокс #омоложение",
    "Контурная пластика - естественный результат гарантирован! 💯 #контурнаяпластика",
    "Процедура дня: биоревитализация 💦 #биоревитализация #увлажнениекожи",
    "Топ-5 процедур этого сезона 🔝 #трендыкосметологии #уходзакожей",
    "Отзыв нашей клиентки о процедуре RF-лифтинга 🙏 #отзывы #рфлифтинг",
    "Мезотерапия для волос - решение проблемы выпадения 💆‍♀️ #мезотерапия #волосы",
    "Как подготовиться к процедуре? Советы от наших врачей 👩‍⚕️ #советыкосметолога",
  ];

  const hashtags = [
    "#красота",
    "#косметология",
    "#филлеры",
    "#ботокс",
    "#увеличениегуб",
    "#омоложение",
    "#уходзалицом",
    "#контурнаяпластика",
    "#биоревитализация",
    "#мезотерапия",
    "#пилинг",
    "#чисткалица",
    "#лазернаякосметология",
    "#аппаратнаякосметология",
  ];

  const musicTitles = [
    "Popular Song - Famous Artist",
    "Trending Sound - TikTok Hit",
    "Summer Vibes - DJ Cool",
    "Beauty Trend - Instagram Music",
    "Relaxing Tune - Spa Music",
    "Energetic Beat - Workout Mix",
    "Elegant Piano - Classical Mood",
    "Soft Jazz - Relaxation",
    "Pop Hit 2023 - Chart Topper",
    "Viral Sound - Social Media Trend",
  ];

  for (let i = 0; i < count; i++) {
    // Генерируем случайный ID для Reel
    const reelId = uuidv4().substring(0, 8);

    // Выбираем случайное описание и добавляем случайные хештеги
    const captionIndex = getRandomInt(0, captions.length - 1);
    const caption = captions[captionIndex];

    // Добавляем 2-5 случайных хештегов
    let fullCaption = caption;
    const hashtagCount = getRandomInt(2, 5);
    const usedHashtags = new Set();

    for (let j = 0; j < hashtagCount; j++) {
      let hashtagIndex;
      do {
        hashtagIndex = getRandomInt(0, hashtags.length - 1);
      } while (usedHashtags.has(hashtagIndex));

      usedHashtags.add(hashtagIndex);
      fullCaption += " " + hashtags[hashtagIndex];
    }

    // Выбираем случайную музыку
    const musicIndex = getRandomInt(0, musicTitles.length - 1);
    const musicTitle = musicTitles[musicIndex];

    // Генерируем случайные статистики
    const views = getRandomInt(5000, 500000);
    const likes = getRandomInt(100, Math.floor(views * 0.1));
    const comments = getRandomInt(10, Math.floor(likes * 0.2));

    // Генерируем случайную дату публикации (не старше 90 дней)
    const publishedAt = getRandomDate(90);

    // Создаем объект Reel
    const reel = {
      reel_url: `https://www.instagram.com/reel/${reelId}/`,
      project_id: projectId,
      source_type: "competitor",
      source_identifier: String(competitorId),
      profile_url: competitorProfileUrl,
      author_username: competitorUsername,
      description: fullCaption,
      views_count: views,
      likes_count: likes,
      comments_count: comments,
      published_at: publishedAt,
      audio_title: musicTitle,
      audio_artist: "Various Artists",
      thumbnail_url: `https://instagram.com/p/${reelId}/media/?size=l`,
      video_download_url: `https://instagram.com/p/${reelId}/download/`,
      raw_data: {
        id: reelId,
        shortCode: reelId,
        caption: fullCaption,
        url: `https://www.instagram.com/reel/${reelId}/`,
        ownerUsername: competitorUsername,
        videoPlayCount: views,
        likesCount: likes,
        commentsCount: comments,
        timestamp: publishedAt.toISOString(),
        musicInfo: {
          song_name: musicTitle,
          artist_name: "Various Artists",
        },
      },
    };

    reels.push(reel);
  }

  return reels;
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(
    `Запуск мок-скрапинга Reels для проекта ${projectId}, конкурента ${competitorId}, количество: ${count}`
  );

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Если указан конкретный конкурент
    if (competitorId > 0) {
      // Получаем информацию о конкуренте
      const competitors = await getCompetitorAccountsByProjectId(projectId);
      const competitor = competitors.find((c) => c.id === competitorId);

      if (!competitor) {
        logger.error(
          `Конкурент с ID ${competitorId} не найден в проекте ${projectId}`
        );
        process.exit(1);
      }

      logger.info(
        `Начинаем мок-скрапинг Reels для конкурента: ${competitor.username} (ID: ${competitorId})`
      );

      // Генерируем мок-данные
      const mockReels = generateMockReels(
        competitor.username,
        competitor.profile_url,
        count
      );

      // Сохраняем данные в базу
      let savedCount = 0;
      for (const reel of mockReels) {
        try {
          const result = await saveReel(db, reel);
          if (result && result.length > 0) {
            savedCount++;
            logger.info(`Сохранен Reel: ${result[0].reel_url}`);
          }
        } catch (error) {
          logger.error(
            `Ошибка при сохранении Reel: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      logger.info(
        `Мок-скрапинг завершен. Сохранено ${savedCount} Reels для конкурента ${competitor.username}`
      );
    } else {
      logger.error("Ошибка: competitorId должен быть положительным числом");
      process.exit(1);
    }
  } catch (error) {
    logger.error("Критическая ошибка при выполнении мок-скрапинга:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
