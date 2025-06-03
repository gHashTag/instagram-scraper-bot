/**
 * Типы для Instagram стратегии скрапинга
 */

// Режимы скрапинга
export type ScrapingMode = "viral" | "popular" | "normal" | "test";

// Критерии фильтрации
export interface FilterCriteria {
  /** Минимальное количество просмотров */
  minViews: number;
  
  /** Максимальный возраст контента в днях */
  maxAgeDays: number;
  
  /** Требовать только реальные просмотры (не использовать лайки как fallback) */
  requireRealViews: boolean;
  
  /** Минимальное количество лайков (опционально) */
  minLikes?: number;
  
  /** Минимальное количество комментариев (опционально) */
  minComments?: number;
}

// Лимиты скрапинга
export interface ScrapingLimits {
  /** Общий лимит результатов */
  totalLimit: number;
  
  /** Лимит на источник (хэштег или конкурент) */
  perSourceLimit: number;
  
  /** Лимит на хэштег */
  hashtagLimit?: number;
  
  /** Лимит на конкурента */
  competitorLimit?: number;
}

// Настройки скраперов
export interface ScraperOptions {
  /** Основной скрапер */
  primary: string;
  
  /** Резервные скраперы */
  fallback: string[];
  
  /** Таймаут для скрапера в секундах */
  timeout?: number;
  
  /** Количество попыток при ошибке */
  retryAttempts?: number;
  
  /** Пауза между запросами в миллисекундах */
  requestDelay?: number;
}

// Источники данных
export interface ScrapingSources {
  /** Список хэштегов для скрапинга */
  hashtags: string[];
  
  /** Список конкурентов для скрапинга */
  competitors: string[];
}

// Основная конфигурация Instagram стратегии
export interface InstagramScrapingConfig {
  /** Режим скрапинга */
  mode: ScrapingMode;
  
  /** Критерии фильтрации */
  filters: FilterCriteria;
  
  /** Лимиты скрапинга */
  limits: ScrapingLimits;
  
  /** Настройки скраперов */
  scrapers: ScraperOptions;
  
  /** Источники данных */
  sources: ScrapingSources;
  
  /** Дополнительные настройки */
  options?: {
    /** Сохранять ли промежуточные результаты */
    saveIntermediateResults?: boolean;
    
    /** Уровень логирования */
    logLevel?: "debug" | "info" | "warn" | "error";
    
    /** Экспортировать ли результаты в Excel */
    exportToExcel?: boolean;
    
    /** Путь для экспорта */
    exportPath?: string;
  };
}

// Результат скрапинга
export interface ScrapingResult {
  /** Общее количество найденных постов */
  totalFound: number;
  
  /** Количество постов после фильтрации */
  totalFiltered: number;
  
  /** Количество сохраненных постов */
  totalSaved: number;
  
  /** Результаты по источникам */
  sourceResults: SourceResult[];
  
  /** Время выполнения в миллисекундах */
  executionTime: number;
  
  /** Ошибки, если были */
  errors: string[];
}

// Результат по источнику
export interface SourceResult {
  /** Тип источника */
  type: "hashtag" | "competitor";
  
  /** Название источника */
  name: string;
  
  /** Количество найденных постов */
  found: number;
  
  /** Количество постов после фильтрации */
  filtered: number;
  
  /** Количество сохраненных постов */
  saved: number;
  
  /** Использованный скрапер */
  scraper: string;
  
  /** Ошибки, если были */
  errors: string[];
}

// Пост Instagram для фильтрации
export interface InstagramPost {
  /** ID поста */
  id?: string;
  
  /** URL поста */
  url?: string;
  
  /** Автор поста */
  ownerUsername?: string;
  
  /** Количество просмотров видео */
  videoViewCount?: number;
  
  /** Количество воспроизведений */
  videoPlayCount?: number;
  
  /** Количество лайков */
  likesCount?: number;
  
  /** Количество комментариев */
  commentsCount?: number;
  
  /** Дата создания */
  timestamp?: string;
  
  /** Описание поста */
  caption?: string;
  
  /** Тип контента */
  type?: string;
  
  /** Тип продукта (clips для Reels) */
  productType?: string;
}

// Предустановленные конфигурации для разных режимов
export const SCRAPING_MODE_CONFIGS: Record<ScrapingMode, Partial<InstagramScrapingConfig>> = {
  viral: {
    filters: {
      minViews: 50000,
      maxAgeDays: 7,
      requireRealViews: true
    },
    limits: {
      totalLimit: 1000,
      perSourceLimit: 50
    }
  },
  popular: {
    filters: {
      minViews: 10000,
      maxAgeDays: 30,
      requireRealViews: false
    },
    limits: {
      totalLimit: 2000,
      perSourceLimit: 100
    }
  },
  normal: {
    filters: {
      minViews: 1000,
      maxAgeDays: 30,
      requireRealViews: false
    },
    limits: {
      totalLimit: 5000,
      perSourceLimit: 200
    }
  },
  test: {
    filters: {
      minViews: 100,
      maxAgeDays: 90,
      requireRealViews: false
    },
    limits: {
      totalLimit: 100,
      perSourceLimit: 10
    }
  }
};
