/**
 * 🟢 Типы для REST API сервера
 * 
 * Определяет интерфейсы для:
 * - Запросов и ответов API
 * - Данных конкурентов и хэштегов
 * - Транскрибации и скрапинга
 */

// ===== БАЗОВЫЕ ТИПЫ =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface FilterParams {
  minViews?: number;
  maxViews?: number;
  minLikes?: number;
  maxLikes?: number;
  daysBack?: number;
  startDate?: string;
  endDate?: string;
  hasTranscription?: boolean;
}

// ===== КОНКУРЕНТЫ =====

export interface CompetitorResponse {
  id: number;
  username: string;
  full_name: string | null;
  profile_url: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stats?: CompetitorStats;
}

export interface CompetitorStats {
  total_reels: number;
  avg_views: number;
  max_views: number;
  total_engagement: number;
  engagement_rate: number;
  last_scraped: string | null;
}

export interface CompetitorReelsRequest extends PaginationParams, FilterParams {
  competitorId: number;
}

export interface ScrapeCompetitorsRequest {
  competitor?: string; // Конкретный конкурент или все
  minViews?: number;
  maxAgeDays?: number;
  limit?: number;
}

export interface ScrapeCompetitorsResponse {
  success: boolean;
  message: string;
  jobId: string;
  competitors: string[];
  estimatedTime?: number;
}

// ===== ХЭШТЕГИ =====

export interface HashtagResponse {
  id: number;
  tag_name: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stats?: HashtagStats;
}

export interface HashtagStats {
  total_reels: number;
  avg_views: number;
  max_views: number;
  total_engagement: number;
  engagement_rate: number;
  trending_score: number;
  last_scraped: string | null;
}

export interface HashtagReelsRequest extends PaginationParams, FilterParams {
  hashtag: string;
}

export interface ScrapeHashtagsRequest {
  hashtag?: string; // Конкретный хэштег или все
  minViews?: number;
  maxAgeDays?: number;
  limit?: number;
}

export interface ScrapeHashtagsResponse {
  success: boolean;
  message: string;
  jobId: string;
  hashtags: string[];
  estimatedTime?: number;
}

// ===== REELS =====

export interface ReelResponse {
  id: number;
  reel_url: string;
  video_url?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  description: string | null;
  published_at: string;
  author_username: string;
  author_full_name?: string;
  transcription?: string | null;
  transcription_language?: string | null;
  transcribed_at?: string | null;
  source_type: 'competitor' | 'hashtag';
  source_name: string;
  engagement_rate: number;
  is_viral: boolean;
}

export interface ReelsListRequest extends PaginationParams, FilterParams {
  sourceType?: 'competitor' | 'hashtag';
  sourceName?: string;
  sortBy?: 'views' | 'likes' | 'engagement' | 'date';
  sortOrder?: 'asc' | 'desc';
}

// ===== ТРАНСКРИБАЦИЯ =====

export interface TranscriptionRequest {
  videoUrl?: string;
  reelId?: number;
  language?: string;
}

export interface TranscriptionResponse {
  success: boolean;
  reelId?: number;
  transcription: string;
  language: string;
  duration?: number;
  confidence?: number;
}

export interface BatchTranscriptionRequest {
  minViews?: number;
  maxAgeDays?: number;
  limit?: number;
  language?: string;
  sourceType?: 'competitor' | 'hashtag';
  sourceName?: string;
}

export interface BatchTranscriptionResponse {
  success: boolean;
  message: string;
  jobId: string;
  totalReels: number;
  estimatedTime: number;
}

export interface TranscriptionJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-1
  completed: number;
  total: number;
  errors: number;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion?: string;
  errorDetails?: string[];
}

// ===== АНАЛИТИКА =====

export interface AnalyticsRequest {
  period?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
  sourceType?: 'competitor' | 'hashtag';
}

export interface CompetitorAnalytics {
  username: string;
  full_name: string;
  total_reels: number;
  avg_views: number;
  max_views: number;
  total_engagement: number;
  engagement_rate: number;
  growth_rate: number;
  top_hashtags: string[];
  viral_content_rate: number;
}

export interface HashtagAnalytics {
  tag_name: string;
  total_reels: number;
  avg_views: number;
  max_views: number;
  total_engagement: number;
  engagement_rate: number;
  trending_score: number;
  competition_level: 'low' | 'medium' | 'high';
  best_posting_times: string[];
}

export interface TrendingContent {
  reel: ReelResponse;
  trend_score: number;
  growth_rate: number;
  viral_potential: number;
}

// ===== ЗАДАЧИ И ДЖОБЫ =====

export interface JobResponse {
  jobId: string;
  type: 'scraping' | 'transcription' | 'analysis';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export interface ScrapingJobParams {
  sources: Array<{
    type: 'competitor' | 'hashtag';
    name: string;
    limit?: number;
  }>;
  filters: {
    minViews: number;
    maxAgeDays: number;
    onlyRealViews?: boolean;
  };
  options: {
    transcribe?: boolean;
    updateExisting?: boolean;
    notifyOnComplete?: boolean;
  };
}

// ===== ОШИБКИ =====

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ===== КОНФИГУРАЦИЯ =====

export interface ServerConfig {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  database: {
    url: string;
    maxConnections: number;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  apify: {
    token: string;
    actors: {
      primary: string;
      fallback: string[];
    };
  };
}

// ===== WEBHOOK =====

export interface WebhookPayload {
  event: 'scraping.completed' | 'transcription.completed' | 'error.occurred';
  jobId: string;
  timestamp: string;
  data: any;
}

export interface NotificationConfig {
  telegram?: {
    botToken: string;
    chatId: string;
    enabled: boolean;
  };
  webhook?: {
    url: string;
    secret: string;
    enabled: boolean;
  };
}
