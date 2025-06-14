/**
 * 🕉️ Meta Muse Automated Scraper - Автоматическое скачивание за 2 недели
 *
 * **"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"**
 * "Ты имеешь право только на действие, но не на плоды действия"
 *
 * Выполняет:
 * 1. Реальное скачивание через Apify по всем 151 хэштегу
 * 2. Автоматическое распределение на 14 дней
 * 3. Сохранение в базу данных
 * 4. Автоматическую транскрибацию видео
 * 5. Детальное логирование процесса
 */

import { ApifyClient } from "apify-client";
import { initializeDBConnection, NeonDB } from "../db/neonDB";
import { reelsTable } from "../db/schema";
import { eq } from "drizzle-orm";
import { MetaMuseHashtagStrategy } from "../strategy/meta-muse-hashtag-strategy";
import { NeonAdapter } from "../adapters/neon-adapter";

import OpenAI from "openai";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

// Загружаем переменные окружения
dotenv.config();

const execAsync = promisify(exec);

interface ScrapingStats {
  totalHashtags: number;
  processedHashtags: number;
  totalPosts: number;
  processedPosts: number;
  transcribedPosts: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

interface DailyBatch {
  day: number;
  date: Date;
  hashtags: string[];
  category: string;
}

/**
 * 🐭⚡ Meta Muse Автоматический скрепер
 */
export class MetaMuseAutomatedScraper {
  private apifyClient: ApifyClient;
  private openai: OpenAI | null = null;

  private db: NeonDB;
  private strategy: MetaMuseHashtagStrategy;
  private stats: ScrapingStats;

  // Директории для временных файлов
  private tempDir = path.join(process.cwd(), "temp");
  private videosDir = path.join(this.tempDir, "videos");
  private audioDir = path.join(this.tempDir, "audio");

  constructor() {
    // Инициализация Apify
    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken) {
      throw new Error("❌ APIFY_TOKEN не найден в переменных окружения");
    }
    this.apifyClient = new ApifyClient({ token: apifyToken });

    // Инициализация OpenAI для транскрибации
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    } else {
      console.warn(
        "⚠️ OpenAI API key не найден. Транскрибация будет отключена."
      );
    }

    // Инициализация базы данных и стратегии
    this.db = {} as NeonDB; // Будет инициализирована в run()
    // Создаем фиктивный адаптер, реальный будет инициализирован в run()
    this.strategy = {} as MetaMuseHashtagStrategy;

    // Создание директорий
    this.ensureDirectories();

    // Инициализация статистики
    this.stats = {
      totalHashtags: 0,
      processedHashtags: 0,
      totalPosts: 0,
      processedPosts: 0,
      transcribedPosts: 0,
      errors: [],
      startTime: new Date(),
    };
  }

  /**
   * Создание необходимых директорий
   */
  private ensureDirectories(): void {
    [this.tempDir, this.videosDir, this.audioDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Создана директория: ${dir}`);
      }
    });
  }

  /**
   * Создание батчей на 14 дней
   */
  private createDailyBatches(): DailyBatch[] {
    const config = this.strategy.createHashtagConfig();
    const batches: DailyBatch[] = [];

    let currentDay = 1;
    const startDate = new Date();

    // Распределяем хэштеги равномерно по 14 дням
    config.categories.forEach((category) => {
      const hashtagsPerDay = Math.ceil(category.hashtags.length / 14);

      for (let i = 0; i < category.hashtags.length; i += hashtagsPerDay) {
        const dayHashtags = category.hashtags.slice(i, i + hashtagsPerDay);
        const batchDate = new Date(startDate);
        batchDate.setDate(startDate.getDate() + (currentDay - 1));

        batches.push({
          day: currentDay,
          date: batchDate,
          hashtags: dayHashtags,
          category: category.name,
        });

        currentDay = (currentDay % 14) + 1;
      }
    });

    return batches;
  }

  /**
   * Скрепинг через Apify для конкретного хэштега
   */
  private async scrapeHashtag(
    hashtag: string,
    category: string
  ): Promise<any[]> {
    try {
      console.log(`🕷️ Скрепинг хэштега: ${hashtag} (${category})`);

      const run = await this.apifyClient
        .actor("apify/instagram-hashtag-scraper")
        .call({
          hashtags: [hashtag.replace("#", "")],
          resultsLimit: 100, // Увеличиваем лимит для реального скрепинга
          addParentData: false,
          enhanceUserSearchWithBio: false,
          isUserTaggedFeedURL: false,
          onlyPostsWithLocation: false,
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        });

      console.log(`🔄 Ожидание завершения скрепинга для ${hashtag}...`);

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
      // Создаем объект для сохранения на основе структуры reelsTable
      const postToSave = {
        reel_url:
          post.url || post.shortCode
            ? `https://instagram.com/p/${post.shortCode}`
            : null,
        project_id: 2, // Meta Muse Project ID
        source_type: "instagram_hashtag",
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
        this.stats.processedPosts++;
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
   * Транскрибация видео поста
   */
  private async transcribePost(post: any, postId: number): Promise<void> {
    if (!this.openai || !post.videoUrl) {
      return;
    }

    try {
      console.log(`🎤 Транскрибация поста ID: ${postId}`);

      // Скачиваем видео
      const videoPath = path.join(this.videosDir, `post_${postId}.mp4`);
      await execAsync(`curl -L -o "${videoPath}" "${post.videoUrl}"`);

      if (!fs.existsSync(videoPath)) {
        throw new Error("Видео не скачалось");
      }

      // Извлекаем аудио
      const audioPath = path.join(this.audioDir, `post_${postId}.mp3`);
      await execAsync(
        `ffmpeg -i "${videoPath}" -q:a 0 -map a "${audioPath}" -y`
      );

      if (!fs.existsSync(audioPath)) {
        throw new Error("Аудио не извлеклось");
      }

      // Транскрибируем через OpenAI Whisper
      const audioBuffer = fs.readFileSync(audioPath);
      const audioFile = new File([audioBuffer], `audio_${postId}.mp3`, {
        type: "audio/mpeg",
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ru",
      });

      // Сохраняем транскрипцию в базу данных
      await this.db
        .update(reelsTable)
        .set({
          transcript: transcription.text,
          updated_at: new Date(),
        })
        .where(eq(reelsTable.id, postId));

      console.log(`✅ Транскрибация завершена для поста ${postId}`);
      this.stats.transcribedPosts++;

      // Очищаем временные файлы
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioPath);
    } catch (error) {
      console.error(`❌ Ошибка транскрибации поста ${postId}:`, error);
      this.stats.errors.push(`Транскрибация поста ${postId}: ${error}`);
    }
  }

  /**
   * Обработка дневного батча
   */
  private async processDailyBatch(batch: DailyBatch): Promise<void> {
    console.log(`\n📅 День ${batch.day} (${batch.date.toLocaleDateString()})`);
    console.log(`📂 Категория: ${batch.category}`);
    console.log(`🏷️ Хэштеги: ${batch.hashtags.join(", ")}`);
    console.log("═".repeat(60));

    for (const hashtag of batch.hashtags) {
      // Скрепинг хэштега
      const posts = await this.scrapeHashtag(hashtag, batch.category);
      this.stats.totalPosts += posts.length;
      this.stats.processedHashtags++;

      // Обработка каждого поста
      for (const post of posts) {
        const postId = await this.savePostToDatabase(post, hashtag);

        if (postId && post.videoUrl) {
          await this.transcribePost(post, postId);
        }

        // Небольшая пауза между постами
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Пауза между хэштегами
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log(`✅ День ${batch.day} завершен!`);
    this.printCurrentStats();
  }

  /**
   * Печать текущей статистики
   */
  private printCurrentStats(): void {
    const elapsed = Date.now() - this.stats.startTime.getTime();
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`\n📊 ТЕКУЩАЯ СТАТИСТИКА:`);
    console.log(`═══════════════════════`);
    console.log(
      `🏷️ Хэштеги: ${this.stats.processedHashtags}/${this.stats.totalHashtags}`
    );
    console.log(
      `📄 Посты: ${this.stats.processedPosts}/${this.stats.totalPosts}`
    );
    console.log(`🎤 Транскрибации: ${this.stats.transcribedPosts}`);
    console.log(`⏱️ Время: ${hours}ч ${minutes}м`);
    console.log(`❌ Ошибки: ${this.stats.errors.length}`);
  }

  /**
   * Генерация финального отчета
   */
  private generateFinalReport(): void {
    this.stats.endTime = new Date();
    const duration =
      this.stats.endTime.getTime() - this.stats.startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    console.log(`\n🎉 ФИНАЛЬНЫЙ ОТЧЕТ Meta Muse Scraper`);
    console.log(`═══════════════════════════════════════`);
    console.log(`🆔 Project ID: 999`);
    console.log(
      `🏷️ Обработано хэштегов: ${this.stats.processedHashtags}/${this.stats.totalHashtags}`
    );
    console.log(`📄 Всего постов: ${this.stats.totalPosts}`);
    console.log(`💾 Сохранено постов: ${this.stats.processedPosts}`);
    console.log(`🎤 Транскрибировано: ${this.stats.transcribedPosts}`);
    console.log(`⏱️ Общее время: ${hours}ч ${minutes}м`);
    console.log(`🗓️ Начало: ${this.stats.startTime.toLocaleString()}`);
    console.log(`🗓️ Окончание: ${this.stats.endTime.toLocaleString()}`);

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ ОШИБКИ (${this.stats.errors.length}):`);
      this.stats.errors.slice(0, 10).forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Сохранение отчета в файл
    const reportPath = path.join(
      process.cwd(),
      "exports",
      `meta-muse-report-${Date.now()}.json`
    );
    const exportDir = path.dirname(reportPath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(this.stats, null, 2));
    console.log(`\n📊 Отчет сохранен: ${reportPath}`);
  }

  /**
   * Основной запуск
   */
  async run(): Promise<void> {
    try {
      console.log(`🕉️ Meta Muse Automated Scraper - ЗАПУСК`);
      console.log(`═════════════════════════════════════════`);
      console.log(`📅 Дата запуска: ${new Date().toLocaleString()}`);
      console.log(`🆔 Project ID: 999 (Meta Muse - аниме мышь)`);

      // Инициализация базы данных
      this.db = await initializeDBConnection();
      console.log(`🔗 База данных подключена`);

      // Инициализация адаптера и стратегии
      const adapter = new NeonAdapter(this.db);
      this.strategy = new MetaMuseHashtagStrategy(adapter, 2);

      // Получение конфигурации хэштегов
      const config = this.strategy.createHashtagConfig();
      this.stats.totalHashtags = config.totalHashtags;

      console.log(`\n📊 КОНФИГУРАЦИЯ СКРЕПИНГА:`);
      console.log(`🏷️ Всего хэштегов: ${config.totalHashtags}`);
      console.log(`📂 Категорий: ${config.categories.length}`);
      config.categories.forEach((cat) => {
        console.log(`   • ${cat.name}: ${cat.hashtags.length} хэштегов`);
      });

      // Создание батчей на 14 дней
      const dailyBatches = this.createDailyBatches();
      console.log(`\n📅 ПЛАН НА 14 ДНЕЙ:`);
      console.log(`🔢 Всего батчей: ${dailyBatches.length}`);

      // Отображение плана
      dailyBatches.forEach((batch, index) => {
        if (index < 5) {
          // Показываем первые 5 дней
          console.log(
            `   День ${batch.day}: ${batch.hashtags.length} хэштегов (${batch.category})`
          );
        }
      });
      if (dailyBatches.length > 5) {
        console.log(`   ... и еще ${dailyBatches.length - 5} дней`);
      }

      console.log(`\n🚀 НАЧИНАЕМ СКРЕПИНГ...`);

      // Выполнение всех батчей
      for (const batch of dailyBatches) {
        await this.processDailyBatch(batch);

        // Пауза между днями (кроме последнего)
        if (batch !== dailyBatches[dailyBatches.length - 1]) {
          console.log(`\n😴 Пауза перед следующим днем (30 секунд)...`);
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      }

      // Финальный отчет
      this.generateFinalReport();

      console.log(`\n🎉 Meta Muse Automated Scraper ЗАВЕРШЕН УСПЕШНО! 🐭⚡`);
    } catch (error) {
      console.error(`\n💥 КРИТИЧЕСКАЯ ОШИБКА:`, error);
      this.stats.errors.push(`Критическая ошибка: ${error}`);
      this.stats.endTime = new Date();
      this.generateFinalReport();
      process.exit(1);
    }
  }
}

/**
 * Запуск скрипта
 */
async function main() {
  const scraper = new MetaMuseAutomatedScraper();
  await scraper.run();
}

// Запуск только если файл выполняется напрямую
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Ошибка запуска:", error);
    process.exit(1);
  });
}
