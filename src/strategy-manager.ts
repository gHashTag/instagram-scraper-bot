/**
 * 🕉️ STRATEGY MANAGER - Единственный источник правды
 *
 * Простое управление Instagram стратегией через JSON конфигурацию
 */

import fs from "fs";
import { logger } from "./logger";

// Типы для конфигурации
interface HashtagConfig {
  tag: string;
  priority: number;
  limit: number;
}

interface CompetitorConfig {
  username: string;
  priority: number;
  limit: number;
  notes: string;
}

interface ScrapingConfig {
  mode: string;
  minViews: number;
  maxAgeDays: number;
  onlyRealViews: boolean;
  totalLimit: number;
  perSourceLimit: number;
}

interface OutputConfig {
  database: {
    enabled: boolean;
    table: string;
    updateExisting: boolean;
  };
  excel: {
    enabled: boolean;
    filename: string;
    path: string;
    includeTranscripts: boolean;
    includeAnalysis: boolean;
  };
  obsidian: {
    enabled: boolean;
    vaultPath: string;
    templates: Record<string, string>;
    folders: Record<string, string>;
    sync: boolean;
  };
  notifications: {
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
      template: string;
    };
  };
}

interface PresetConfig {
  minViews: number;
  maxAgeDays: number;
  onlyRealViews: boolean;
  description: string;
}

interface StrategyConfig {
  strategy: {
    name: string;
    description: string;
    active: boolean;
    schedule: string;
  };
  scraping: ScrapingConfig;
  sources: {
    hashtags: HashtagConfig[];
    competitors: CompetitorConfig[];
  };
  filters: {
    excludeKeywords: string[];
    includeKeywords: string[];
    minLikes: number;
    minComments: number;
    languages: string[];
  };
  output: OutputConfig;
  analysis: {
    transcription: {
      enabled: boolean;
      provider: string;
      language: string;
    };
    sentiment: {
      enabled: boolean;
      categories: string[];
    };
    keywords: {
      enabled: boolean;
      extractTopics: boolean;
      findTrends: boolean;
    };
  };
  technical: {
    scraper: {
      primary: string;
      fallback: string[];
      timeout: number;
      retries: number;
      delay: number;
    };
  };
  presets: Record<string, PresetConfig>;
}

export class StrategyManager {
  private configPath: string;
  private config: StrategyConfig;

  constructor(configPath = "./config/instagram-strategy.json") {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  /**
   * Загрузить конфигурацию из JSON
   */
  private loadConfig(): StrategyConfig {
    try {
      const configFile = fs.readFileSync(this.configPath, "utf8");
      return JSON.parse(configFile);
    } catch (error) {
      throw new Error(`Ошибка загрузки конфигурации: ${error.message}`);
    }
  }

  /**
   * Сохранить конфигурацию в JSON
   */
  saveConfig(): this {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      logger.info("✅ Конфигурация сохранена");
    } catch (error) {
      throw new Error(`Ошибка сохранения конфигурации: ${error.message}`);
    }
    return this;
  }

  /**
   * Получить текущую стратегию
   */
  getStrategy(): StrategyConfig {
    return this.config;
  }

  /**
   * Применить пресет
   */
  applyPreset(presetName: string): this {
    if (!this.config.presets[presetName]) {
      throw new Error(`Пресет "${presetName}" не найден`);
    }

    const preset = this.config.presets[presetName];

    // Применяем настройки пресета
    this.config.scraping.mode = presetName;
    this.config.scraping.minViews = preset.minViews;
    this.config.scraping.maxAgeDays = preset.maxAgeDays;
    this.config.scraping.onlyRealViews = preset.onlyRealViews;

    logger.info(`✅ Применен пресет: ${presetName} - ${preset.description}`);
    return this;
  }

  /**
   * Установить минимальные просмотры
   */
  setMinViews(views: number): this {
    this.config.scraping.minViews = views;
    logger.info(`✅ Минимальные просмотры: ${views.toLocaleString()}`);
    return this;
  }

  /**
   * Установить лимит результатов
   */
  setLimit(total: number, perSource?: number): this {
    this.config.scraping.totalLimit = total;
    if (perSource) {
      this.config.scraping.perSourceLimit = perSource;
    }
    logger.info(
      `✅ Лимиты: ${total} общий, ${perSource || "без изменений"} на источник`
    );
    return this;
  }

  /**
   * Добавить хэштег
   */
  addHashtag(tag: string, priority = 3, limit = 50): this {
    const hashtag: HashtagConfig = {
      tag: tag.replace("#", ""),
      priority,
      limit,
    };

    // Проверяем, есть ли уже такой хэштег
    const existingIndex = this.config.sources.hashtags.findIndex(
      (h) => h.tag === hashtag.tag
    );

    if (existingIndex >= 0) {
      this.config.sources.hashtags[existingIndex] = hashtag;
      logger.info(`✅ Обновлен хэштег: #${hashtag.tag}`);
    } else {
      this.config.sources.hashtags.push(hashtag);
      logger.info(`✅ Добавлен хэштег: #${hashtag.tag}`);
    }

    return this;
  }

  /**
   * Удалить хэштег
   */
  removeHashtag(tag: string): this {
    const cleanTag = tag.replace("#", "");
    this.config.sources.hashtags = this.config.sources.hashtags.filter(
      (h) => h.tag !== cleanTag
    );
    logger.info(`✅ Удален хэштег: #${cleanTag}`);
    return this;
  }

  /**
   * Добавить конкурента
   */
  addCompetitor(username: string, priority = 3, limit = 30, notes = ""): this {
    const competitor: CompetitorConfig = {
      username: username.replace("@", ""),
      priority,
      limit,
      notes,
    };

    // Проверяем, есть ли уже такой конкурент
    const existingIndex = this.config.sources.competitors.findIndex(
      (c) => c.username === competitor.username
    );

    if (existingIndex >= 0) {
      this.config.sources.competitors[existingIndex] = competitor;
      logger.info(`✅ Обновлен конкурент: @${competitor.username}`);
    } else {
      this.config.sources.competitors.push(competitor);
      logger.info(`✅ Добавлен конкурент: @${competitor.username}`);
    }

    return this;
  }

  /**
   * Удалить конкурента
   */
  removeCompetitor(username: string): this {
    const cleanUsername = username.replace("@", "");
    this.config.sources.competitors = this.config.sources.competitors.filter(
      (c) => c.username !== cleanUsername
    );
    logger.info(`✅ Удален конкурент: @${cleanUsername}`);
    return this;
  }

  /**
   * Включить/выключить экспорт в Excel
   */
  toggleExcel(enabled?: boolean): this {
    if (enabled === undefined) {
      this.config.output.excel.enabled = !this.config.output.excel.enabled;
    } else {
      this.config.output.excel.enabled = enabled;
    }

    logger.info(
      `✅ Excel экспорт: ${this.config.output.excel.enabled ? "включен" : "выключен"}`
    );
    return this;
  }

  /**
   * Включить/выключить Obsidian синхронизацию
   */
  toggleObsidian(enabled?: boolean): this {
    if (enabled === undefined) {
      this.config.output.obsidian.enabled =
        !this.config.output.obsidian.enabled;
    } else {
      this.config.output.obsidian.enabled = enabled;
    }

    logger.info(
      `✅ Obsidian синхронизация: ${this.config.output.obsidian.enabled ? "включена" : "выключена"}`
    );
    return this;
  }

  /**
   * Включить/выключить Telegram уведомления
   */
  toggleTelegram(enabled?: boolean): this {
    if (enabled === undefined) {
      this.config.output.notifications.telegram.enabled =
        !this.config.output.notifications.telegram.enabled;
    } else {
      this.config.output.notifications.telegram.enabled = enabled;
    }

    logger.info(
      `✅ Telegram уведомления: ${this.config.output.notifications.telegram.enabled ? "включены" : "выключены"}`
    );
    return this;
  }

  /**
   * Получить список всех хэштегов
   */
  getHashtags(): string[] {
    return this.config.sources.hashtags.map(
      (h) => `#${h.tag} (приоритет: ${h.priority}, лимит: ${h.limit})`
    );
  }

  /**
   * Получить список всех конкурентов
   */
  getCompetitors(): string[] {
    return this.config.sources.competitors.map(
      (c) => `@${c.username} (приоритет: ${c.priority}, лимит: ${c.limit})`
    );
  }

  /**
   * Показать текущие настройки
   */
  showStatus(): this {
    logger.info("\n🕉️ ТЕКУЩАЯ СТРАТЕГИЯ:");
    logger.info(`📝 Название: ${this.config.strategy.name}`);
    logger.info(`🎯 Режим: ${this.config.scraping.mode}`);
    logger.info(
      `👁️ Мин. просмотры: ${this.config.scraping.minViews.toLocaleString()}`
    );
    logger.info(`📅 Макс. возраст: ${this.config.scraping.maxAgeDays} дней`);
    logger.info(
      `✅ Только реальные просмотры: ${this.config.scraping.onlyRealViews ? "да" : "нет"}`
    );
    logger.info(
      `🔢 Лимиты: ${this.config.scraping.totalLimit} общий, ${this.config.scraping.perSourceLimit} на источник`
    );

    logger.info("\n🏷️ ХЭШТЕГИ:");
    this.getHashtags().forEach((tag) => logger.info(`  ${tag}`));

    logger.info("\n🏢 КОНКУРЕНТЫ:");
    this.getCompetitors().forEach((comp) => logger.info(`  ${comp}`));

    logger.info("\n📊 ЭКСПОРТ:");
    logger.info(
      `  📄 Excel: ${this.config.output.excel.enabled ? "✅" : "❌"}`
    );
    logger.info(
      `  📝 Obsidian: ${this.config.output.obsidian.enabled ? "✅" : "❌"}`
    );
    logger.info(
      `  📱 Telegram: ${this.config.output.notifications.telegram.enabled ? "✅" : "❌"}`
    );

    return this;
  }

  /**
   * Быстрая настройка для маркетолога
   */
  quickSetup(
    preset: string,
    hashtags: string[] = [],
    competitors: string[] = [],
    minViews?: number
  ): this {
    logger.info("\n🚀 БЫСТРАЯ НАСТРОЙКА СТРАТЕГИИ...");

    // Применяем пресет
    this.applyPreset(preset);

    // Очищаем старые источники
    this.config.sources.hashtags = [];
    this.config.sources.competitors = [];

    // Добавляем новые хэштеги
    hashtags.forEach((tag) => this.addHashtag(tag));

    // Добавляем новых конкурентов
    competitors.forEach((comp) => this.addCompetitor(comp));

    // Устанавливаем кастомные просмотры
    if (minViews) {
      this.setMinViews(minViews);
    }

    logger.info("\n✅ БЫСТРАЯ НАСТРОЙКА ЗАВЕРШЕНА!");
    this.showStatus();

    return this;
  }
}
