import { ApifyClient } from "apify-client";
import { NeonDB, ReelInsert, saveReel, checkReelExists } from "../db/neonDB";

// Интерфейс для опций скрапинга
export interface ScrapeOptions {
  apifyToken?: string;
  limit?: number;
  minViews?: number;
  maxAgeDays?: number;
}

// Интерфейс для элемента, возвращаемого Apify
interface ApifyReelItemMusicInfo {
  artist_name: string | null;
  song_name: string | null;
  uses_original_audio: boolean | null;
  should_mute_audio: boolean | null;
  should_mute_audio_reason: string | null;
  audio_id: string | null;
}

interface ApifyReelItem {
  inputUrl?: string;
  id?: string;
  type?: string;
  shortCode?: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  url?: string;
  commentsCount?: number;
  firstComment?: string;
  latestComments?: any[];
  dimensionsHeight?: number;
  dimensionsWidth?: number;
  displayUrl?: string;
  images?: any[];
  videoUrl?: string;
  alt?: string | null;
  likesCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  timestamp?: string;
  childPosts?: any[];
  ownerFullName?: string;
  ownerUsername?: string;
  ownerId?: string;
  productType?: string;
  videoDuration?: number;
  isVideo?: boolean;
  isSponsored?: boolean;
  musicInfo?: ApifyReelItemMusicInfo | null;
  isCommentsDisabled?: boolean;
  taggedUsers?: any[];
}

/**
 * Основная функция для скрапинга Instagram Reels.
 */
export async function scrapeInstagramReels(
  db: NeonDB,
  projectId: number,
  sourceType: "competitor" | "hashtag",
  sourceDbId: number,
  sourceValue: string,
  options: ScrapeOptions
): Promise<number> {
  // Устанавливаем очень большое значение по умолчанию, чтобы получить все доступные Reels
  const { limit = 10000, minViews, maxAgeDays, apifyToken } = options;
  let reelsAddedToDb = 0;

  if (!apifyToken) {
    console.warn(
      "[scrapeInstagramReels] Apify token is not provided. Skipping Apify-dependent scraping."
    );
    console.error(
      "Критическая ошибка: Apify token не предоставлен. Скрапинг невозможен."
    );
    return 0;
  }

  const apifyClient = new ApifyClient({
    token: apifyToken,
  });

  console.log(`Запуск скрапинга Reels для ${sourceValue}...`);

  let sourceForApify: string;
  if (sourceValue.startsWith("#")) {
    sourceForApify = sourceValue.substring(1).trim();
  } else if (sourceValue.includes("instagram.com/explore/tags/")) {
    try {
      const url = new URL(sourceValue);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 3 && pathParts[1] === "tags") {
        sourceForApify = pathParts[2];
      } else {
        console.warn(
          `Не удалось извлечь тег из URL: ${sourceValue}, используется как есть.`
        );
        sourceForApify = sourceValue;
      }
    } catch (e) {
      console.warn(
        `Ошибка парсинга URL тега ${sourceValue}, используется как есть. Ошибка: ${e}`
      );
      sourceForApify = sourceValue;
    }
  } else {
    sourceForApify = sourceValue.trim();
  }

  // Определяем параметры в зависимости от типа источника
  let input;
  if (sourceType === "hashtag") {
    input = {
      search: `#${sourceForApify}`,
      searchType: "hashtag",
      searchLimit: 250, // Максимальное значение для searchLimit
      resultsType: "posts",
      resultsLimit: limit,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    };
    console.log(
      "Запуск актора Instagram Scraper на Apify с параметрами для хэштега:",
      input
    );
  } else {
    input = {
      username: [sourceForApify],
      resultsLimit: limit,
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ["RESIDENTIAL"],
      },
    };
    console.log(
      "Запуск актора Instagram Scraper на Apify с параметрами для пользователя:",
      input
    );
  }

  const run = await apifyClient.actor("apify/instagram-scraper").call(input);

  console.log("Загрузка результатов из датасета...");
  const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

  console.log(`ПОЛУЧЕНО ОТ APIFY (${items.length} элементов).`);

  // Извлекаем посты из хэштегов
  let allPosts: any[] = [];

  if (sourceType === "hashtag") {
    console.log("Извлекаем посты из хэштегов...");
    items.forEach((item: any, index: number) => {
      if (item.topPosts && Array.isArray(item.topPosts)) {
        console.log(`  Хэштег ${index + 1}: ${item.topPosts.length} top posts`);
        allPosts.push(...item.topPosts);
      }
      if (item.latestPosts && Array.isArray(item.latestPosts)) {
        console.log(`  Хэштег ${index + 1}: ${item.latestPosts.length} latest posts`);
        allPosts.push(...item.latestPosts);
      }
    });
    console.log(`Всего извлечено постов: ${allPosts.length}`);
  } else {
    // Для пользователей используем items напрямую
    allPosts = items;
  }

  console.log("Применяем фильтры...");

  let maxAgeDate: Date | null = null;
  if (maxAgeDays !== undefined) {
    maxAgeDate = new Date();
    maxAgeDate.setDate(maxAgeDate.getDate() - maxAgeDays);
    console.log(`Фильтр по дате: Reels не старше ${maxAgeDate.toISOString()}`);
  }
  if (minViews !== undefined) {
    console.log(`Фильтр по просмотрам: Reels с просмотрами >= ${minViews}`);
  }

  const filteredReels = allPosts
    .filter((item: ApifyReelItem) => {
      // Проверяем, является ли пост Reel
      const isPotentialReel =
        item.type === "Video" ||
        item.productType === "clips" ||
        item.isVideo === true;
      if (!isPotentialReel) return false;

      // Проверяем дату публикации
      let passesDateFilter = true;
      if (maxAgeDate && item.timestamp) {
        const pubDate = new Date(item.timestamp);
        passesDateFilter = pubDate >= maxAgeDate;
      } else if (maxAgeDate && !item.timestamp) {
        passesDateFilter = false;
      }

      // Проверяем количество просмотров (ТОЛЬКО РЕАЛЬНЫЕ ДАННЫЕ!)
      let passesViewsFilter = true;
      if (minViews !== undefined) {
        let realViews = 0;
        let hasRealViews = false;

        // ТОЛЬКО реальные просмотры, НЕ используем лайки!
        if (item.videoViewCount && item.videoViewCount > 0) {
          realViews = item.videoViewCount;
          hasRealViews = true;
        } else if (item.videoPlayCount && item.videoPlayCount > 0) {
          realViews = item.videoPlayCount;
          hasRealViews = true;
        }

        // Если нет реальных просмотров - отклоняем пост
        if (!hasRealViews) {
          passesViewsFilter = false;
          console.log(`  ❌ ОТКЛОНЕН: Нет данных о просмотрах (@${item.ownerUsername})`);
        } else {
          passesViewsFilter = realViews >= minViews;
          if (passesViewsFilter) {
            console.log(`  ✅ ПРОШЕЛ ФИЛЬТР: ${realViews} реальных просмотров (@${item.ownerUsername})`);
          } else {
            console.log(`  ❌ НЕ ПРОШЕЛ: ${realViews} < ${minViews} просмотров (@${item.ownerUsername})`);
          }
        }
      }

      return passesDateFilter && passesViewsFilter;
    })
    .map((item: ApifyReelItem) => {
      const currentReelUrl = item.url;
      if (typeof currentReelUrl !== "string" || !currentReelUrl) {
        console.warn(
          `Пропуск Reel без URL или с некорректным URL. ShortCode: ${item.shortCode}`
        );
        return null;
      }

      // ТОЛЬКО реальные просмотры (если дошли до этого этапа, значит они есть)
      let views = 0;
      if (item.videoViewCount && item.videoViewCount > 0) {
        views = item.videoViewCount;
      } else if (item.videoPlayCount && item.videoPlayCount > 0) {
        views = item.videoPlayCount;
      }
      // НЕ используем лайки для подсчета просмотров!

      let songTitle: string | null = null;
      let artistName: string | null = null;
      if (item.musicInfo && typeof item.musicInfo === "object") {
        const musicInfo = item.musicInfo as ApifyReelItemMusicInfo;
        songTitle = musicInfo.song_name;
        artistName = musicInfo.artist_name;
      }

      const reelToSave: ReelInsert = {
        reel_url: currentReelUrl,
        project_id: projectId,
        source_type: sourceType,
        source_identifier: String(sourceDbId),
        profile_url: item.inputUrl || null,
        author_username: item.ownerUsername || null,
        description: item.caption || null,
        views_count: views,
        likes_count: typeof item.likesCount === "number" ? item.likesCount : 0,
        comments_count:
          typeof item.commentsCount === "number" ? item.commentsCount : 0,
        published_at: item.timestamp ? new Date(item.timestamp) : null,
        audio_title: songTitle,
        audio_artist: artistName,
        thumbnail_url: item.displayUrl || null,
        video_download_url: item.videoUrl || null,
        raw_data: item,
      };
      return reelToSave;
    })
    .filter((reel): reel is ReelInsert => reel !== null);

  console.log(`После фильтрации осталось ${filteredReels.length} Reels.`);

  if (filteredReels.length > 0) {
    console.log("ДАННЫЕ ПЕРЕД СОХРАНЕНИЕМ В БД:");
    filteredReels.forEach((item, index) => {
      console.log(
        `  Item ${index + 1} for DB: URL: ${item.reel_url}, Views: ${item.views_count}, Date: ${item.published_at}`
      );
    });
  }

  for (const reelToSave of filteredReels) {
    const reelExists = await checkReelExists(db, reelToSave.reel_url!);
    if (reelExists) {
      console.log(
        `Reel с URL ${reelToSave.reel_url} уже существует, пропуск вставки.`
      );
      continue;
    }

    try {
      const result = await saveReel(db, reelToSave);
      if (result && result.length > 0 && result[0].id) {
        console.log(
          `УСПЕШНО СОХРАНЕН REEL: ${result[0].reel_url} (ID: ${result[0].id})`
        );
        reelsAddedToDb++;
      } else {
        console.warn(
          `Не удалось сохранить Reel ${reelToSave.reel_url} или получить ID после вставки.`
        );
      }
    } catch (dbError: any) {
      console.error(
        `Ошибка при сохранении Reel ${reelToSave.reel_url} в БД: ${dbError.message}`,
        dbError
      );
    }
  }
  return reelsAddedToDb;
}
