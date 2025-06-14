/**
 * 🕉️ Meta Muse Demo Scraper - Демонстрационная версия
 *
 * **"प्रारभे किञ्चिदेव न प्रतिभाति यथा फले"**
 * "В начале мало что видно, как и в плоде - но результат приходит со временем"
 *
 * Демо-версия для тестирования функционала с ограниченным объемом данных
 */

import { ApifyClient } from "apify-client";
import { initializeDBConnection, NeonDB } from "../db/neonDB";
import { reelsTable } from "../db/schema";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Загружаем переменные окружения
dotenv.config();

interface DemoStats {
  hashtags: string[];
  totalPosts: number;
  savedPosts: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

/**
 * 🐭 Meta Muse Demo Scraper
 */
export class MetaMuseDemoScraper {
  private apifyClient: ApifyClient;
  private db: NeonDB;
  private stats: DemoStats;

  constructor() {
    // Инициализация Apify
    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken) {
      throw new Error("❌ APIFY_TOKEN не найден в переменных окружения");
    }
    this.apifyClient = new ApifyClient({ token: apifyToken });

    // Инициализация статистики
    this.stats = {
      hashtags: [],
      totalPosts: 0,
      savedPosts: 0,
      errors: [],
      startTime: new Date(),
    };
  }

  /**
   * Скрепинг одного хэштега (ограниченно для демо)
   */
  private async scrapeHashtagDemo(hashtag: string): Promise<any[]> {
    try {
      console.log(`🕷️ Демо-скрепинг: ${hashtag}`);

      const run = await this.apifyClient
        .actor("apify/instagram-hashtag-scraper")
        .call({
          hashtags: [hashtag.replace("#", "")],
          resultsLimit: 5, // Ограничиваем для демо
          addParentData: false,
          enhanceUserSearchWithBio: false,
          isUserTaggedFeedURL: false,
          onlyPostsWithLocation: false,
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        });

      console.log(`🔄 Ожидание результатов для ${hashtag}...`);

      const { items } = await this.apifyClient
        .dataset(run.defaultDatasetId)
        .listItems();

      console.log(`✅ Получено ${items.length} элементов для ${hashtag}`);
      return items as any[];
    } catch (error) {
      console.error(`❌ Ошибка скрепинга ${hashtag}:`, error);
      this.stats.errors.push(`Скрепинг ${hashtag}: ${error}`);
      return [];
    }
  }

  /**
   * Сохранение поста в базу данных
   */
  private async savePostToDatabase(
    post: any,
    hashtag: string
  ): Promise<number | null> {
    try {
      const postToSave = {
        reel_url:
          post.url || post.shortCode
            ? `https://instagram.com/p/${post.shortCode}`
            : null,
        project_id: 2, // Meta Muse Project ID
        source_type: "instagram_hashtag_demo",
        source_identifier: hashtag.replace("#", ""),
        profile_url: post.ownerUrl || null,
        author_username: post.ownerUsername || null,
        description: post.caption || post.text || null,
        views_count: post.videoViewCount || post.playCount || null,
        likes_count: post.likesCount || null,
        comments_count: post.commentsCount || null,
        published_at: post.timestamp ? new Date(post.timestamp * 1000) : null,
        thumbnail_url: post.displayUrl || null,
        video_download_url: post.videoUrl || null,
        raw_data: post,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await this.db
        .insert(reelsTable)
        .values(postToSave)
        .returning({ id: reelsTable.id });

      if (result.length > 0) {
        this.stats.savedPosts++;
        return result[0].id;
      }

      return null;
    } catch (error: any) {
      // Игнорируем дубликаты
      if (
        error.message?.includes("duplicate") ||
        error.message?.includes("unique")
      ) {
        console.log(`⚠️ Дубликат поста пропущен: ${post.id || "unknown"}`);
        return null;
      }

      console.error(`❌ Ошибка сохранения поста:`, error);
      this.stats.errors.push(`Сохранение поста: ${error}`);
      return null;
    }
  }

  /**
   * Генерация демо-отчета
   */
  private generateDemoReport(): void {
    this.stats.endTime = new Date();
    const duration =
      this.stats.endTime.getTime() - this.stats.startTime.getTime();
    const seconds = Math.floor(duration / 1000);

    console.log(`\n🎉 ДЕМО-ОТЧЕТ Meta Muse Scraper`);
    console.log(`═══════════════════════════════════`);
    console.log(`🆔 Project ID: 999 (Meta Muse - аниме мышь)`);
    console.log(`🏷️ Тестовые хэштеги: ${this.stats.hashtags.join(", ")}`);
    console.log(`📄 Всего найдено постов: ${this.stats.totalPosts}`);
    console.log(`💾 Сохранено в БД: ${this.stats.savedPosts}`);
    console.log(`⏱️ Время выполнения: ${seconds} секунд`);
    console.log(`🗓️ Начало: ${this.stats.startTime.toLocaleString()}`);
    console.log(`🗓️ Окончание: ${this.stats.endTime.toLocaleString()}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ ОШИБКИ (${this.stats.errors.length}):`);
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Сохранение демо-отчета
    const reportPath = path.join(
      process.cwd(),
      "exports",
      `meta-muse-demo-report-${Date.now()}.json`
    );
    const exportDir = path.dirname(reportPath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
    console.log(`\n📊 Демо-отчет сохранен: ${reportPath}`);
  }

  /**
   * Демо-запуск с ограниченным набором хэштегов
   */
  async runDemo(): Promise<void> {
    try {
      console.log(`🕉️ Meta Muse Demo Scraper - ЗАПУСК`);
      console.log(`═══════════════════════════════════════`);
      console.log(`📅 Дата запуска: ${new Date().toLocaleString()}`);
      console.log(`🆔 Project ID: 999 (Meta Muse - аниме мышь)`);
      console.log(`🧪 ДЕМО-РЕЖИМ: ограниченный набор данных`);

      // Инициализация базы данных
      this.db = await initializeDBConnection();
      console.log(`🔗 База данных подключена`);

      // Инициализация адаптера и стратегии
      const adapter = new NeonAdapter(this.db);
      this.strategy = new MetaMuseHashtagStrategy(adapter, 2);

      // Демо хэштеги (по одному из каждой категории)
      const demoHashtags = [
        "#ai", // Базовые
        "#AIInfluencer", // AI инфлюенсеры
        "#metaverse", // Метавселенные
        "#consciousness", // Архетип: Муза/Маг
        "#creativepreneur", // Психоэмоциональный
        "#spiritualTech", // Философия: дух + технологии
      ];

      this.stats.hashtags = demoHashtags;
      console.log(`\n🏷️ ДЕМО-ХЭШТЕГИ: ${demoHashtags.join(", ")}`);
      console.log(`📊 Количество: ${demoHashtags.length} хэштегов`);
      console.log(`⚡ Лимит на хэштег: 5 постов`);

      console.log(`\n🚀 НАЧИНАЕМ ДЕМО-СКРЕПИНГ...`);

      // Обработка каждого демо-хэштега
      for (const hashtag of demoHashtags) {
        console.log(`\n📂 Обработка: ${hashtag}`);

        const posts = await this.scrapeHashtagDemo(hashtag);
        this.stats.totalPosts += posts.length;

        // Сохранение постов
        for (const post of posts) {
          await this.savePostToDatabase(post, hashtag);
          // Небольшая пауза
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log(`✅ ${hashtag} завершен: ${posts.length} постов`);

        // Пауза между хэштегами
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Финальный отчет
      this.generateDemoReport();

      console.log(`\n🎉 Meta Muse Demo Scraper ЗАВЕРШЕН УСПЕШНО! 🐭⚡`);
      console.log(`\n📋 СЛЕДУЮЩИЕ ШАГИ:`);
      console.log(`1. 🔍 Проверьте сохраненные данные в базе (project_id=999)`);
      console.log(
        `2. 🕷️ Запустите полную версию: bun run src/scripts/meta-muse-automated-scraper.ts`
      );
      console.log(
        `3. ⏰ Настройте автоматизацию: bun run src/scripts/meta-muse-scheduler.ts generate`
      );
    } catch (error) {
      console.error(`\n💥 КРИТИЧЕСКАЯ ОШИБКА:`, error);
      this.stats.errors.push(`Критическая ошибка: ${error}`);
      this.stats.endTime = new Date();
      this.generateDemoReport();
      process.exit(1);
    }
  }
}

/**
 * Запуск демо
 */
async function main() {
  const scraper = new MetaMuseDemoScraper();
  await scraper.runDemo();
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Ошибка запуска демо:", error);
    process.exit(1);
  });
}
