import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { MetaMuseHashtagStrategy } from "../../strategy/meta-muse-hashtag-strategy";
import { NeonAdapter } from "../../adapters/neon-adapter";

describe("Meta Muse Hashtag Strategy", () => {
  let strategy: MetaMuseHashtagStrategy;
  let adapter: NeonAdapter;
  const META_MUSE_PROJECT_ID = 999; // Специальный ID для Meta Muse

  beforeAll(async () => {
    adapter = new NeonAdapter();
    await adapter.initialize();
    strategy = new MetaMuseHashtagStrategy(adapter, META_MUSE_PROJECT_ID);
  });

  afterAll(async () => {
    await adapter.close();
  });

  describe("Configuration", () => {
    it("должен создать конфигурацию для 6 категорий хэштегов", () => {
      const config = strategy.createHashtagConfig();

      // Проверяем наличие всех 6 категорий
      expect(config.categories).toHaveLength(6);
      expect(config.categories.map((c) => c.name)).toEqual([
        "basic",
        "ai_influencers",
        "metaverse_tech",
        "archetype_muse_magician_seer",
        "psycho_emotional_awakened_creators",
        "philosophy_spirit_tech",
      ]);
    });

    it("должен содержать правильные хэштеги для базовой категории", () => {
      const config = strategy.createHashtagConfig();
      const basicCategory = config.categories.find((c) => c.name === "basic");

      expect(basicCategory).toBeDefined();
      expect(basicCategory?.hashtags).toEqual([
        "#ai",
        "#aiavatar",
        "#future",
        "#femtech",
        "#futuretech",
        "#aimodel",
        "#aimodels",
      ]);
      expect(basicCategory?.hashtags).toHaveLength(7);
    });

    it("должен содержать 30 хэштегов для категории AI-инфлюенсеров", () => {
      const config = strategy.createHashtagConfig();
      const aiInfluencersCategory = config.categories.find(
        (c) => c.name === "ai_influencers"
      );

      expect(aiInfluencersCategory).toBeDefined();
      expect(aiInfluencersCategory?.hashtags).toHaveLength(30);
      expect(aiInfluencersCategory?.hashtags).toContain("#AIInfluencer");
      expect(aiInfluencersCategory?.hashtags).toContain("#VirtualInfluencer");
      expect(aiInfluencersCategory?.hashtags).toContain("#LilMiquela");
    });

    it("должен использовать правильный Project ID для Meta Muse", () => {
      expect(strategy.getProjectId()).toBe(META_MUSE_PROJECT_ID);
    });
  });

  describe("Apify Integration", () => {
    it("должен создать правильную конфигурацию для apify/instagram-hashtag-scraper", () => {
      const apifyConfig = strategy.createApifyScraperConfig("#ai");

      expect(apifyConfig.actorId).toBe("apify/instagram-hashtag-scraper");
      expect(apifyConfig.input.hashtags).toContain("#ai");
      expect(apifyConfig.input.resultsLimit).toBeDefined();
      expect(apifyConfig.input.resultsLimit).toBeGreaterThan(0);
    });

    it("должен корректно обрабатывать пакетные запросы по категориям", () => {
      const config = strategy.createHashtagConfig();
      const batchConfig = strategy.createBatchScrapingConfig(config);

      expect(batchConfig.batches).toHaveLength(6); // по батчу на категорию
      expect(batchConfig.totalHashtags).toBe(151); // 7+30+24+30+30 = 151
    });
  });

  describe("Data Processing", () => {
    it("должен сохранять данные с правильным Project ID", async () => {
      const mockInstagramData = {
        hashtag: "#ai",
        posts: [
          {
            id: "test_post_1",
            url: "https://instagram.com/p/test1",
            caption: "Test AI post #ai #future",
            likes: 100,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const savedData = await strategy.saveScrapedData(mockInstagramData);

      expect(savedData.projectId).toBe(META_MUSE_PROJECT_ID);
      expect(savedData.source_type).toBe("instagram_hashtag");
      expect(savedData.hashtag).toBe("#ai");
    });

    it("должен правильно категоризировать хэштеги при сохранении", async () => {
      const mockData = { hashtag: "#AIInfluencer", posts: [] };
      const savedData = await strategy.saveScrapedData(mockData);

      expect(savedData.category).toBe("ai_influencers");
    });

    it("должен обрабатывать ошибки скрепинга gracefully", async () => {
      const invalidData = { hashtag: "", posts: null };

      await expect(strategy.saveScrapedData(invalidData)).rejects.toThrow(
        "Invalid scraped data format"
      );
    });
  });

  describe("Full Workflow", () => {
    it("должен выполнить полный цикл скрепинга для одной категории", async () => {
      const testCategory = "basic";
      const result = await strategy.runScrapingForCategory(testCategory);

      expect(result.success).toBe(true);
      expect(result.category).toBe(testCategory);
      expect(result.processedHashtags).toBeGreaterThan(0);
      expect(result.totalPosts).toBeGreaterThanOrEqual(0);
    });

    it("должен генерировать отчет о результатах скрепинга", async () => {
      const report = await strategy.generateScrapingReport();

      expect(report.projectId).toBe(META_MUSE_PROJECT_ID);
      expect(report.categories).toHaveLength(6);
      expect(report.totalHashtags).toBe(151);
      expect(report.generatedAt).toBeDefined();
    });
  });
});
