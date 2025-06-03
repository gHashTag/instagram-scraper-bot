/**
 * Instagram Strategy - Единственный источник правды для скрапинга
 */

import { 
  InstagramScrapingConfig, 
  ScrapingMode, 
  InstagramPost, 
  ScrapingResult,
  SCRAPING_MODE_CONFIGS 
} from "../types/instagram-strategy";

export class InstagramStrategy {
  private config: InstagramScrapingConfig;

  constructor(config: InstagramScrapingConfig) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Валидация конфигурации
   */
  validateConfig(config: InstagramScrapingConfig): void {
    // Проверяем режим скрапинга
    const validModes: ScrapingMode[] = ["viral", "popular", "normal", "test"];
    if (!validModes.includes(config.mode)) {
      throw new Error(`Invalid scraping mode: ${config.mode}`);
    }

    // Проверяем минимальные просмотры
    if (config.filters.minViews < 0) {
      throw new Error("minViews must be non-negative");
    }

    // Проверяем источники
    if (config.sources.hashtags.length === 0 && config.sources.competitors.length === 0) {
      throw new Error("At least one source must be specified");
    }
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): InstagramScrapingConfig {
    return this.config;
  }

  /**
   * Применить фильтры к постам
   */
  applyFilters(posts: InstagramPost[]): InstagramPost[] {
    return posts.filter(post => {
      // Фильтр по просмотрам
      if (!this.passesViewsFilter(post)) {
        return false;
      }

      // Фильтр по дате
      if (!this.passesDateFilter(post)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Проверка фильтра по просмотрам
   */
  private passesViewsFilter(post: InstagramPost): boolean {
    const { minViews, requireRealViews } = this.config.filters;

    // Получаем реальные просмотры
    let realViews = 0;
    let hasRealViews = false;

    if (post.videoViewCount && post.videoViewCount > 0) {
      realViews = post.videoViewCount;
      hasRealViews = true;
    } else if (post.videoPlayCount && post.videoPlayCount > 0) {
      realViews = post.videoPlayCount;
      hasRealViews = true;
    }

    // Если требуются только реальные просмотры
    if (requireRealViews) {
      if (!hasRealViews) {
        return false;
      }
      return realViews >= minViews;
    }

    // Если реальных просмотров нет, используем лайки как fallback
    if (!hasRealViews && post.likesCount && post.likesCount > 0) {
      const estimatedViews = post.likesCount * 15;
      return estimatedViews >= minViews;
    }

    return hasRealViews && realViews >= minViews;
  }

  /**
   * Проверка фильтра по дате
   */
  private passesDateFilter(post: InstagramPost): boolean {
    if (!this.config.filters.maxAgeDays || !post.timestamp) {
      return true;
    }

    const postDate = new Date(post.timestamp);
    const maxAge = this.config.filters.maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - maxAge);

    return postDate >= cutoffDate;
  }

  /**
   * Получить оптимальный скрапер
   */
  getOptimalScraper(sourceType: "hashtag" | "competitor", useFallback = false): string {
    if (useFallback) {
      if (this.config.scrapers.fallback.length === 0) {
        throw new Error("No fallback scrapers available");
      }
      return this.config.scrapers.fallback[0];
    }

    return this.config.scrapers.primary;
  }

  /**
   * Получить предустановленную конфигурацию для режима
   */
  static getModeConfig(mode: ScrapingMode): Partial<InstagramScrapingConfig> {
    const modeConfig = SCRAPING_MODE_CONFIGS[mode];
    if (!modeConfig) {
      throw new Error(`Unknown scraping mode: ${mode}`);
    }
    return modeConfig;
  }

  /**
   * Создать стратегию из режима
   */
  static fromMode(
    mode: ScrapingMode, 
    sources: { hashtags: string[], competitors: string[] },
    overrides?: Partial<InstagramScrapingConfig>
  ): InstagramStrategy {
    const baseConfig = this.getModeConfig(mode);
    
    const config: InstagramScrapingConfig = {
      mode,
      filters: {
        minViews: baseConfig.filters?.minViews || 1000,
        maxAgeDays: baseConfig.filters?.maxAgeDays || 30,
        requireRealViews: baseConfig.filters?.requireRealViews || false,
        ...overrides?.filters
      },
      limits: {
        totalLimit: baseConfig.limits?.totalLimit || 1000,
        perSourceLimit: baseConfig.limits?.perSourceLimit || 100,
        ...overrides?.limits
      },
      scrapers: {
        primary: "apify/instagram-scraper",
        fallback: ["apify/instagram-reel-scraper"],
        ...overrides?.scrapers
      },
      sources,
      options: {
        saveIntermediateResults: true,
        logLevel: "info",
        exportToExcel: true,
        ...overrides?.options
      }
    };

    return new InstagramStrategy(config);
  }

  /**
   * Создать стратегию для вирусного контента
   */
  static createViralStrategy(
    hashtags: string[], 
    competitors: string[] = []
  ): InstagramStrategy {
    return this.fromMode("viral", { hashtags, competitors });
  }

  /**
   * Создать стратегию для популярного контента
   */
  static createPopularStrategy(
    hashtags: string[], 
    competitors: string[] = []
  ): InstagramStrategy {
    return this.fromMode("popular", { hashtags, competitors });
  }

  /**
   * Создать тестовую стратегию
   */
  static createTestStrategy(
    hashtags: string[], 
    competitors: string[] = []
  ): InstagramStrategy {
    return this.fromMode("test", { hashtags, competitors });
  }
}
