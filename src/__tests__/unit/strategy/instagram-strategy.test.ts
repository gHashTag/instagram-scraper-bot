import { describe, it, expect, beforeEach, mock } from "bun:test";
import { InstagramStrategy } from "../../../strategy/instagram-strategy";
import { InstagramScrapingConfig, ScrapingMode } from "../../../types/instagram-strategy";

describe("InstagramStrategy", () => {
  let strategy: InstagramStrategy;
  let mockConfig: InstagramScrapingConfig;

  beforeEach(() => {
    // Базовая конфигурация для тестов
    mockConfig = {
      mode: "viral" as ScrapingMode,
      filters: {
        minViews: 50000,
        maxAgeDays: 7,
        requireRealViews: true
      },
      limits: {
        totalLimit: 1000,
        perSourceLimit: 100
      },
      scrapers: {
        primary: "apify/instagram-scraper",
        fallback: ["apify/instagram-reel-scraper"]
      },
      sources: {
        hashtags: ["aestheticclinic", "aestheticmedicine"],
        competitors: ["competitor1", "competitor2"]
      }
    };
  });

  describe("constructor", () => {
    it("должен создать экземпляр с валидной конфигурацией", () => {
      strategy = new InstagramStrategy(mockConfig);
      expect(strategy).toBeDefined();
      expect(strategy.getConfig()).toEqual(mockConfig);
    });

    it("должен выбросить ошибку при невалидной конфигурации", () => {
      const invalidConfig = { ...mockConfig, mode: "invalid" as ScrapingMode };
      
      expect(() => {
        new InstagramStrategy(invalidConfig);
      }).toThrow("Invalid scraping mode: invalid");
    });

    it("должен выбросить ошибку при отрицательном minViews", () => {
      const invalidConfig = { 
        ...mockConfig, 
        filters: { ...mockConfig.filters, minViews: -1000 }
      };
      
      expect(() => {
        new InstagramStrategy(invalidConfig);
      }).toThrow("minViews must be non-negative");
    });
  });

  describe("validateConfig", () => {
    beforeEach(() => {
      strategy = new InstagramStrategy(mockConfig);
    });

    it("должен валидировать корректную конфигурацию", () => {
      expect(() => strategy.validateConfig(mockConfig)).not.toThrow();
    });

    it("должен выбросить ошибку для неподдерживаемого режима", () => {
      const invalidConfig = { ...mockConfig, mode: "unknown" as ScrapingMode };
      
      expect(() => strategy.validateConfig(invalidConfig)).toThrow("Invalid scraping mode");
    });

    it("должен выбросить ошибку для пустых источников", () => {
      const invalidConfig = { 
        ...mockConfig, 
        sources: { hashtags: [], competitors: [] }
      };
      
      expect(() => strategy.validateConfig(invalidConfig)).toThrow("At least one source must be specified");
    });
  });

  describe("applyFilters", () => {
    beforeEach(() => {
      strategy = new InstagramStrategy(mockConfig);
    });

    it("должен фильтровать посты по минимальным просмотрам", () => {
      const posts = [
        { videoViewCount: 100000, likesCount: 5000 },
        { videoViewCount: 30000, likesCount: 2000 },
        { videoViewCount: 75000, likesCount: 3000 }
      ];

      const filtered = strategy.applyFilters(posts);
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].videoViewCount).toBe(100000);
      expect(filtered[1].videoViewCount).toBe(75000);
    });

    it("должен использовать лайки как fallback если requireRealViews = false", () => {
      const configWithFallback = {
        ...mockConfig,
        filters: { ...mockConfig.filters, requireRealViews: false }
      };
      strategy = new InstagramStrategy(configWithFallback);

      const posts = [
        { likesCount: 5000 }, // 5000 * 15 = 75000 просмотров
        { likesCount: 2000 }, // 2000 * 15 = 30000 просмотров
        { likesCount: 4000 }  // 4000 * 15 = 60000 просмотров
      ];

      const filtered = strategy.applyFilters(posts);
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].likesCount).toBe(5000);
      expect(filtered[1].likesCount).toBe(4000);
    });

    it("должен отклонять посты без реальных просмотров если requireRealViews = true", () => {
      const posts = [
        { likesCount: 5000 }, // Только лайки, нет videoViewCount
        { videoViewCount: 75000, likesCount: 3000 } // Есть реальные просмотры
      ];

      const filtered = strategy.applyFilters(posts);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoViewCount).toBe(75000);
    });

    it("должен фильтровать по дате если указан maxAgeDays", () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 дней назад
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 дней назад

      const posts = [
        { videoViewCount: 100000, timestamp: oldDate.toISOString() },
        { videoViewCount: 75000, timestamp: recentDate.toISOString() }
      ];

      const filtered = strategy.applyFilters(posts);
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].videoViewCount).toBe(75000);
    });
  });

  describe("getOptimalScraper", () => {
    beforeEach(() => {
      strategy = new InstagramStrategy(mockConfig);
    });

    it("должен возвращать primary скрапер по умолчанию", () => {
      const scraper = strategy.getOptimalScraper("hashtag");
      expect(scraper).toBe("apify/instagram-scraper");
    });

    it("должен возвращать fallback скрапер при ошибке primary", () => {
      const scraper = strategy.getOptimalScraper("hashtag", true);
      expect(scraper).toBe("apify/instagram-reel-scraper");
    });

    it("должен выбросить ошибку если нет доступных скраперов", () => {
      const configWithoutFallback = {
        ...mockConfig,
        scrapers: { primary: "apify/instagram-scraper", fallback: [] }
      };
      strategy = new InstagramStrategy(configWithoutFallback);

      expect(() => {
        strategy.getOptimalScraper("hashtag", true);
      }).toThrow("No fallback scrapers available");
    });
  });

  describe("getModeConfig", () => {
    it("должен возвращать конфигурацию для режима viral", () => {
      const config = InstagramStrategy.getModeConfig("viral");
      
      expect(config.filters.minViews).toBe(50000);
      expect(config.filters.maxAgeDays).toBe(7);
      expect(config.filters.requireRealViews).toBe(true);
    });

    it("должен возвращать конфигурацию для режима popular", () => {
      const config = InstagramStrategy.getModeConfig("popular");
      
      expect(config.filters.minViews).toBe(10000);
      expect(config.filters.maxAgeDays).toBe(30);
      expect(config.filters.requireRealViews).toBe(false);
    });

    it("должен возвращать конфигурацию для режима test", () => {
      const config = InstagramStrategy.getModeConfig("test");
      
      expect(config.filters.minViews).toBe(100);
      expect(config.filters.maxAgeDays).toBe(90);
      expect(config.filters.requireRealViews).toBe(false);
    });

    it("должен выбросить ошибку для неизвестного режима", () => {
      expect(() => {
        InstagramStrategy.getModeConfig("unknown" as ScrapingMode);
      }).toThrow("Unknown scraping mode: unknown");
    });
  });
});
