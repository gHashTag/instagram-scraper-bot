/**
 * Скрипт для парсинга Reels по хэштегам эстетической медицины
 *
 * Использование:
 * bun run src/scripts/scrape-aesthetic-hashtags.ts <projectId> <token> [daysBack] [minViews]
 *
 * Параметры:
 * - projectId: ID проекта
 * - token: Токен Apify API
 * - daysBack: (опционально) Количество дней назад для парсинга (по умолчанию 30)
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 */

import {
  initializeDBConnection,
  logParsingRun,
  updateParsingRun,
} from "../db/neonDB";
import { hashtagsTable, reelsTable } from "../db/schema";
import { logger } from "../logger";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { ApifyClient } from "apify-client";
import { eq, and } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Интерфейс для элемента musicInfo из Apify (аналогично ApifyReelItemMusicInfo)
interface AestheticReelItemMusicInfo {
  artist_name: string | null;
  song_name: string | null;
  // Можно добавить другие поля, если они есть и нужны
}

// Интерфейс для элемента reel из Apify (упрощенная версия ApifyReelItem)
interface AestheticReelItem {
  url?: string;
  permalink?: string;
  timestamp?: string; // или Date, если преобразуется раньше
  videoPlayCount?: number;
  videoViewCount?: number;
  ownerUsername?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  musicInfo?: AestheticReelItemMusicInfo | null; // Используем новый интерфейс
  displayUrl?: string;
  videoUrl?: string;
  [key: string]: any; // Для остальных полей, если они есть
}

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 2) {
  logger.error(
    "Использование: bun run src/scripts/scrape-aesthetic-hashtags.ts <projectId> <token> [daysBack] [minViews]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const apifyToken = args[1];
const daysBack = args[2] ? parseInt(args[2], 10) : 30;
const minViews = args[3] ? parseInt(args[3], 10) : 50000;

// Хэштеги эстетической медицины
const AESTHETIC_HASHTAGS = [
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

if (isNaN(projectId) || isNaN(daysBack) || isNaN(minViews)) {
  logger.error("Ошибка: projectId, daysBack и minViews должны быть числами");
  process.exit(1);
}

if (!apifyToken || !apifyToken.startsWith("apify_api_")) {
  logger.error(
    "Ошибка: Некорректный токен Apify. Токен должен начинаться с 'apify_api_'"
  );
  process.exit(1);
}

/**
 * Функция для парсинга Reels по хэштегу
 */
async function scrapeHashtagReels(
  db: any,
  apifyClient: ApifyClient,
  hashtag: string,
  hashtagId: number,
  maxAgeDays: number,
  minViewCount: number
): Promise<number> {
  logger.info(`Запуск парсинга Reels для хэштега #${hashtag}...`);

  // Рассчитываем дату начала периода
  const maxAgeDate = new Date();
  maxAgeDate.setDate(maxAgeDate.getDate() - maxAgeDays);

  // Запускаем актор Instagram Hashtag Scraper
  const input = {
    hashtags: [hashtag],
    resultsType: "reels",
    resultsLimit: 1000, // Устанавливаем большой лимит, чтобы получить как можно больше Reels
  };

  logger.info(
    `Запуск актора Instagram Hashtag Scraper с параметрами: ${JSON.stringify(input)}`
  );

  try {
    const run = await apifyClient
      .actor("apify/instagram-hashtag-scraper")
      .call(input);

    // Получаем результаты и явно указываем тип для items
    const { items }: { items: AestheticReelItem[] } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    logger.info(`Получено ${items.length} Reels для хэштега #${hashtag}`);

    // Фильтруем Reels по дате и количеству просмотров
    const filteredReels = items.filter((reel: AestheticReelItem) => {
      // Проверяем дату публикации
      let passesDateFilter = true;
      if (reel.timestamp) {
        const pubDate = new Date(reel.timestamp);
        passesDateFilter = pubDate >= maxAgeDate;
      }

      // Проверяем количество просмотров
      let passesViewsFilter = true;
      const viewCount = reel.videoPlayCount || reel.videoViewCount || 0;
      passesViewsFilter = viewCount >= minViewCount;

      return passesDateFilter && passesViewsFilter;
    });

    logger.info(
      `После фильтрации осталось ${filteredReels.length} Reels для хэштега #${hashtag}`
    );

    // Сохраняем Reels в базу данных
    let reelsAdded = 0;

    for (const reel of filteredReels) {
      // Проверяем, существует ли уже такой Reel в базе данных
      const currentReelUrl = reel.url || reel.permalink;
      if (!currentReelUrl) {
        logger.warn(`Пропуск Reel без URL для хэштега #${hashtag}`);
        continue;
      }

      const existingReels = await db
        .select()
        .from(reelsTable)
        .where(eq(reelsTable.reel_url, currentReelUrl));

      if (existingReels.length > 0) {
        logger.info(
          `Reel с URL ${currentReelUrl} уже существует в базе данных, пропуск`
        );
        continue;
      }

      // Подготавливаем данные для сохранения
      let publishedAtDate: Date | null = null;
      if (reel.timestamp) {
        try {
          publishedAtDate = new Date(reel.timestamp);
          // Проверка на Invalid Date
          if (isNaN(publishedAtDate.getTime())) {
            logger.warn(
              `Некорректный формат timestamp: ${reel.timestamp} для reel ${currentReelUrl}. Устанавливаем null.`
            );
            publishedAtDate = null;
          }
        } catch (e) {
          logger.warn(
            `Ошибка при парсинге timestamp: ${reel.timestamp} для reel ${currentReelUrl}. Устанавливаем null.`,
            e
          );
          publishedAtDate = null;
        }
      }

      const reelData = {
        reel_url: currentReelUrl,
        project_id: projectId,
        source_type: "hashtag",
        source_identifier: String(hashtagId),
        profile_url: reel.ownerUsername
          ? `https://www.instagram.com/${reel.ownerUsername}/`
          : null,
        author_username: reel.ownerUsername || null,
        description: reel.caption || null,
        views_count: reel.videoPlayCount || reel.videoViewCount || 0,
        likes_count: reel.likesCount || 0,
        comments_count: reel.commentsCount || 0,
        published_at: publishedAtDate,
        audio_title:
          reel.musicInfo &&
          typeof reel.musicInfo === "object" &&
          "song_name" in reel.musicInfo
            ? (reel.musicInfo as AestheticReelItemMusicInfo).song_name
            : null,
        audio_artist:
          reel.musicInfo &&
          typeof reel.musicInfo === "object" &&
          "artist_name" in reel.musicInfo
            ? (reel.musicInfo as AestheticReelItemMusicInfo).artist_name
            : null,
        thumbnail_url: reel.displayUrl || null,
        video_download_url: reel.videoUrl || null,
        raw_data: reel,
      };

      try {
        // Сохраняем Reel в базу данных
        const result = await db.insert(reelsTable).values(reelData).returning();

        if (result && result.length > 0) {
          logger.info(
            `Успешно сохранен Reel с URL ${currentReelUrl} для хэштега #${hashtag}`
          );
          reelsAdded++;
        }
      } catch (error) {
        logger.error(
          `Ошибка при сохранении Reel с URL ${currentReelUrl} для хэштега #${hashtag}:`,
          error
        );
      }
    }

    logger.info(`Добавлено ${reelsAdded} новых Reels для хэштега #${hashtag}`);
    return reelsAdded;
  } catch (error) {
    logger.error(`Ошибка при парсинге хэштега #${hashtag}:`, error);
    throw error;
  }
}

/**
 * Основная функция скрипта
 */
async function main() {
  logger.info(
    `Запуск парсинга Reels по хэштегам эстетической медицины для проекта ${projectId}`
  );
  logger.info(
    `Параметры: за последние ${daysBack} дней, минимум ${minViews} просмотров`
  );
  logger.info(`Используется токен Apify: ${apifyToken}`);

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();

    // Инициализируем клиент Apify
    const apifyClient = new ApifyClient({
      token: apifyToken,
    });

    // Создаем уникальный ID для запуска парсинга
    const runId = uuidv4();

    // Логируем начало парсинга
    try {
      await logParsingRun({
        run_id: runId,
        project_id: projectId,
        source_type: "aesthetic_hashtags",
        status: "started",
        started_at: new Date(),
        reels_found_count: 0,
        reels_added_count: 0,
        errors_count: 0,
        log_message: `Начало парсинга хэштегов эстетической медицины для проекта ${projectId} за последние ${daysBack} дней с минимум ${minViews} просмотров`,
      });
    } catch (error) {
      logger.error("Ошибка при логировании запуска парсинга:", error);
    }

    // Получаем или создаем хэштеги в базе данных
    const hashtagMap = new Map<string, number>();

    for (const hashtag of AESTHETIC_HASHTAGS) {
      // Проверяем, существует ли уже такой хэштег в базе данных
      const existingHashtags = await db
        .select()
        .from(hashtagsTable)
        .where(
          and(
            eq(hashtagsTable.project_id, projectId),
            eq(hashtagsTable.tag_name, hashtag)
          )
        );

      if (existingHashtags.length > 0) {
        logger.info(
          `Хэштег #${hashtag} уже существует в проекте ${projectId}, ID: ${existingHashtags[0].id}`
        );
        hashtagMap.set(hashtag, existingHashtags[0].id);
      } else {
        // Добавляем новый хэштег
        const result = await db
          .insert(hashtagsTable)
          .values({
            project_id: projectId,
            tag_name: hashtag,
            notes: "Добавлен через скрипт scrape-aesthetic-hashtags.ts",
            is_active: true,
            added_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        if (result && result.length > 0) {
          logger.info(
            `Хэштег #${hashtag} успешно добавлен в проект ${projectId}, ID: ${result[0].id}`
          );
          hashtagMap.set(hashtag, result[0].id);
        } else {
          logger.error(
            `Ошибка при добавлении хэштега #${hashtag} в проект ${projectId}`
          );
        }
      }
    }

    // Парсим Reels для каждого хэштега
    let totalReelsAdded = 0;
    let errorsCount = 0;

    for (const hashtag of AESTHETIC_HASHTAGS) {
      const hashtagId = hashtagMap.get(hashtag);

      if (!hashtagId) {
        logger.error(`Не найден ID для хэштега #${hashtag}, пропуск`);
        continue;
      }

      try {
        const reelsAdded = await scrapeHashtagReels(
          db,
          apifyClient,
          hashtag,
          hashtagId,
          daysBack,
          minViews
        );

        totalReelsAdded += reelsAdded;

        // Обновляем статус парсинга
        try {
          await updateParsingRun(runId, {
            reels_added_count: totalReelsAdded,
            log_message: `Обработан хэштег #${hashtag}, добавлено ${reelsAdded} Reels`,
          });
        } catch (error) {
          logger.error(
            `Ошибка при обновлении статуса парсинга для хэштега #${hashtag}:`,
            error
          );
        }

        // Обновляем время последнего парсинга хэштега
        try {
          await db
            .update(hashtagsTable)
            .set({ last_scraped_at: new Date() })
            .where(eq(hashtagsTable.id, hashtagId));
        } catch (error) {
          logger.error(
            `Ошибка при обновлении времени последнего парсинга хэштега #${hashtag}:`,
            error
          );
        }

        // Делаем небольшую паузу между запросами, чтобы не перегружать API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Ошибка при парсинге хэштега #${hashtag}:`, error);
        errorsCount++;

        // Обновляем статус парсинга с ошибкой
        try {
          await updateParsingRun(runId, {
            errors_count: errorsCount,
            error_details: {
              lastError: `Ошибка при парсинге хэштега #${hashtag}: ${error}`,
              source: "hashtag",
              sourceId: hashtagId,
            },
          });
        } catch (updateError) {
          logger.error(
            `Ошибка при обновлении статуса парсинга с ошибкой для хэштега #${hashtag}:`,
            updateError
          );
        }
      }
    }

    // Завершаем парсинг
    const status = errorsCount > 0 ? "completed_with_errors" : "completed";
    try {
      await updateParsingRun(runId, {
        status,
        ended_at: new Date(),
        reels_found_count: totalReelsAdded, // В данном случае считаем найденными только добавленные
        log_message: `Парсинг хэштегов эстетической медицины завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`,
      });
    } catch (error) {
      logger.error("Ошибка при завершении парсинга:", error);
    }

    logger.info(
      `Парсинг хэштегов эстетической медицины завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`
    );
  } catch (error) {
    logger.error("Критическая ошибка при выполнении парсинга:", error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main().catch((error) => {
  logger.error("Необработанная ошибка:", error);
  process.exit(1);
});
