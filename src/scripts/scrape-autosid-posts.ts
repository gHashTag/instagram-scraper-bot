/**
 * Скрипт для парсинга постов по хэштегам эстетической медицины для проекта АвтоСид
 *
 * Использование:
 * bun run src/scripts/scrape-autosid-posts.ts <token> [daysBack] [minViews]
 *
 * Параметры:
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
import { eq } from "drizzle-orm";

// Загружаем переменные окружения
dotenv.config();

// Интерфейс для элемента musicInfo из Apify (аналогично ApifyReelItemMusicInfo)
interface AutosidReelItemMusicInfo {
  artist_name: string | null;
  song_name: string | null;
}

// Интерфейс для элемента reel из Apify (упрощенная версия ApifyReelItem)
interface AutosidReelItem {
  url?: string;
  timestamp?: string;
  videoPlayCount?: number;
  videoViewCount?: number;
  ownerUsername?: string;
  caption?: string;
  likesCount?: number;
  commentsCount?: number;
  musicInfo?: AutosidReelItemMusicInfo | null;
  displayUrl?: string;
  videoUrl?: string;
  [key: string]: any;
}

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  logger.error(
    "Использование: bun run src/scripts/scrape-autosid-posts.ts <token> [daysBack] [minViews]"
  );
  process.exit(1);
}

const projectId = 1; // ID проекта "АвтоСид Проект Клиники"
const apifyToken = args[0];
const daysBack = args[1] ? parseInt(args[1], 10) : 30;
const minViews = args[2] ? parseInt(args[2], 10) : 50000;

if (isNaN(daysBack) || isNaN(minViews)) {
  logger.error("Ошибка: daysBack и minViews должны быть числами");
  process.exit(1);
}

if (!apifyToken || !apifyToken.startsWith("apify_api_")) {
  logger.error(
    "Ошибка: Некорректный токен Apify. Токен должен начинаться с 'apify_api_'"
  );
  process.exit(1);
}

/**
 * Функция для парсинга постов по хэштегу
 */
async function scrapeHashtagPosts(
  db: any,
  apifyClient: ApifyClient,
  hashtag: string,
  hashtagId: number,
  maxAgeDays: number,
  minViewCount: number
): Promise<number> {
  logger.info(`Запуск парсинга постов для хэштега #${hashtag}...`);

  // Рассчитываем дату начала периода
  const maxAgeDate = new Date();
  maxAgeDate.setDate(maxAgeDate.getDate() - maxAgeDays);

  // Запускаем актор Instagram Scraper
  const input = {
    search: `#${hashtag}`,
    searchType: "hashtag",
    searchLimit: 250, // Максимальное значение для searchLimit
    resultsType: "posts",
    resultsLimit: 250, // Максимальное значение для resultsLimit
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };

  logger.info(
    `Запуск актора Instagram Scraper с параметрами: ${JSON.stringify(input)}`
  );

  try {
    const run = await apifyClient
      .actor("apify/instagram-post-scraper")
      .call(input);

    // Получаем результаты и явно указываем тип для items
    const { items }: { items: AutosidReelItem[] } = await apifyClient
      .dataset(run.defaultDatasetId)
      .listItems();

    logger.info(`Получено ${items.length} Reels для хэштега #${hashtag}`);

    // Фильтруем посты, чтобы получить только Reels
    const reels = items.filter((post: AutosidReelItem) => {
      // Проверяем, является ли пост Reel
      const isReel = post.type === "Video" || post.productType === "clips";

      if (!isReel) return false;

      // Проверяем дату публикации
      let passesDateFilter = true;
      if (maxAgeDays !== undefined && post.timestamp) {
        const pubDate = new Date(post.timestamp);
        passesDateFilter = pubDate >= maxAgeDate;
      }

      // Проверяем количество просмотров
      let passesViewsFilter = true;
      const viewCount = post.videoViewCount || post.videoPlayCount || 0;
      passesViewsFilter = viewCount >= minViewCount;

      return passesDateFilter && passesViewsFilter;
    });

    logger.info(
      `Найдено ${reels.length} Reels для хэштега #${hashtag} с минимум ${minViewCount} просмотров`
    );

    // Сохраняем Reels в базу данных
    let reelsAdded = 0;

    for (const reel of reels) {
      // Проверяем, существует ли уже такой Reel в базе данных
      const reelUrl = reel.url || reel.permalink;
      if (!reelUrl) {
        logger.warn(`Пропуск Reel без URL для хэштега #${hashtag}`);
        continue;
      }

      const existingReels = await db
        .select()
        .from(reelsTable)
        .where(eq(reelsTable.reel_url, reelUrl));

      if (existingReels.length > 0) {
        logger.info(
          `Reel с URL ${reelUrl} уже существует в базе данных, пропуск`
        );
        continue;
      }

      // Подготавливаем данные для сохранения
      let publishedAtDate: Date | null = null;
      if (reel.timestamp) {
        try {
          publishedAtDate = new Date(reel.timestamp);
          if (isNaN(publishedAtDate.getTime())) {
            logger.warn(
              `Некорректный формат timestamp: ${reel.timestamp} для reel ${reel.url}. Устанавливаем null.`
            );
            publishedAtDate = null;
          }
        } catch (e) {
          logger.warn(
            `Ошибка при парсинге timestamp: ${reel.timestamp} для reel ${reel.url}. Устанавливаем null.`,
            e
          );
          publishedAtDate = null;
        }
      }

      const reelData = {
        reel_url: reelUrl,
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
            ? (reel.musicInfo as AutosidReelItemMusicInfo).song_name
            : null,
        audio_artist:
          reel.musicInfo &&
          typeof reel.musicInfo === "object" &&
          "artist_name" in reel.musicInfo
            ? (reel.musicInfo as AutosidReelItemMusicInfo).artist_name
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
            `Успешно сохранен Reel с URL ${reelUrl} для хэштега #${hashtag}`
          );
          reelsAdded++;
        }
      } catch (error) {
        logger.error(
          `Ошибка при сохранении Reel с URL ${reelUrl} для хэштега #${hashtag}:`,
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
    `Запуск парсинга постов по хэштегам эстетической медицины для проекта ${projectId} (АвтоСид Проект Клиники)`
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
        log_message: `Начало парсинга постов по хэштегам эстетической медицины для проекта ${projectId} (АвтоСид) за последние ${daysBack} дней с минимум ${minViews} просмотров`,
      });
    } catch (error) {
      logger.error("Ошибка при логировании запуска парсинга:", error);
    }

    // Получаем все хэштеги проекта
    const hashtags = await db
      .select()
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, projectId));

    if (hashtags.length === 0) {
      logger.error(`В проекте ${projectId} не найдено хэштегов`);
      process.exit(1);
    }

    logger.info(`Найдено ${hashtags.length} хэштегов для проекта ${projectId}`);

    // Парсим посты для каждого хэштега
    let totalReelsAdded = 0;
    let errorsCount = 0;

    for (const hashtag of hashtags) {
      try {
        const reelsAdded = await scrapeHashtagPosts(
          db,
          apifyClient,
          hashtag.tag_name,
          hashtag.id,
          daysBack,
          minViews
        );

        totalReelsAdded += reelsAdded;

        // Обновляем статус парсинга
        try {
          await updateParsingRun(runId, {
            reels_added_count: totalReelsAdded,
            log_message: `Обработан хэштег #${hashtag.tag_name}, добавлено ${reelsAdded} Reels`,
          });
        } catch (error) {
          logger.error(
            `Ошибка при обновлении статуса парсинга для хэштега #${hashtag.tag_name}:`,
            error
          );
        }

        // Обновляем время последнего парсинга хэштега
        try {
          await db
            .update(hashtagsTable)
            .set({ last_scraped_at: new Date() })
            .where(eq(hashtagsTable.id, hashtag.id));
        } catch (error) {
          logger.error(
            `Ошибка при обновлении времени последнего парсинга хэштега #${hashtag.tag_name}:`,
            error
          );
        }

        // Делаем небольшую паузу между запросами, чтобы не перегружать API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(
          `Ошибка при парсинге хэштега #${hashtag.tag_name}:`,
          error
        );
        errorsCount++;

        // Обновляем статус парсинга с ошибкой
        try {
          await updateParsingRun(runId, {
            errors_count: errorsCount,
            error_details: {
              lastError: `Ошибка при парсинге хэштега #${hashtag.tag_name}: ${error}`,
              source: "hashtag",
              sourceId: hashtag.id,
            },
          });
        } catch (updateError) {
          logger.error(
            `Ошибка при обновлении статуса парсинга с ошибкой для хэштега #${hashtag.tag_name}:`,
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
        log_message: `Парсинг постов по хэштегам эстетической медицины завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`,
      });
    } catch (error) {
      logger.error("Ошибка при завершении парсинга:", error);
    }

    logger.info(
      `Парсинг постов по хэштегам эстетической медицины завершен. Всего добавлено ${totalReelsAdded} новых Reels. Ошибок: ${errorsCount}`
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
