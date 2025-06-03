/**
 * 🟢 Express.js сервер для Instagram Scraper API
 * 
 * Создает REST API для:
 * - Управления конкурентами и хэштегами
 * - Запуска скрапинга
 * - Транскрибации видео
 * - Получения аналитики
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { logger } from '../logger';
import { ServerConfig } from '../types/api';

// Импорт роутов
import competitorsRouter from './routes/competitors';
import hashtagsRouter from './routes/hashtags';
import transcriptionRouter from './routes/transcription';
import scrapingRouter from './routes/scraping';
import analyticsRouter from './routes/analytics';

export function createApp(config?: Partial<ServerConfig>): express.Application {
  const app = express();

  // ===== MIDDLEWARE =====

  // Безопасность
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // CORS для Obsidian и других клиентов
  app.use(cors({
    origin: config?.cors?.origin || [
      'http://localhost:3000',
      'http://localhost:8080',
      'obsidian://localhost',
      'app://obsidian.md'
    ],
    credentials: config?.cors?.credentials || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Сжатие ответов
  app.use(compression());

  // Парсинг JSON
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config?.rateLimit?.windowMs || 15 * 60 * 1000, // 15 минут
    max: config?.rateLimit?.max || 100, // 100 запросов на IP
    message: {
      success: false,
      error: 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Логирование запросов
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    });
    
    next();
  });

  // ===== HEALTH CHECK =====

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      status: 'healthy',
      services: {
        database: 'connected', // TODO: проверить подключение к БД
        openai: 'available',   // TODO: проверить OpenAI API
        apify: 'available'     // TODO: проверить Apify API
      },
      timestamp: new Date().toISOString()
    });
  });

  // ===== API ROUTES =====

  app.use('/api/competitors', competitorsRouter);
  app.use('/api/hashtags', hashtagsRouter);
  app.use('/api/transcribe', transcriptionRouter);
  app.use('/api/scrape', scrapingRouter);
  app.use('/api/analytics', analyticsRouter);

  // ===== ДОКУМЕНТАЦИЯ API =====

  app.get('/api', (req, res) => {
    res.json({
      name: 'Instagram Scraper API',
      version: '1.0.0',
      description: 'REST API for Instagram content scraping and analysis',
      endpoints: {
        competitors: {
          'GET /api/competitors': 'List all competitors',
          'GET /api/competitors/:id/reels': 'Get reels for specific competitor',
          'POST /api/scrape/competitors': 'Start competitor scraping'
        },
        hashtags: {
          'GET /api/hashtags': 'List all hashtags',
          'GET /api/hashtags/:tag/reels': 'Get reels for specific hashtag',
          'POST /api/scrape/hashtags': 'Start hashtag scraping'
        },
        transcription: {
          'POST /api/transcribe': 'Transcribe video',
          'GET /api/reels/:id/transcript': 'Get transcription',
          'POST /api/transcribe/batch': 'Batch transcription'
        },
        analytics: {
          'GET /api/analytics/competitors': 'Competitor analytics',
          'GET /api/analytics/hashtags': 'Hashtag analytics',
          'GET /api/analytics/trending': 'Trending content'
        }
      },
      documentation: '/api/docs'
    });
  });

  // ===== ERROR HANDLING =====

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    });
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body
    });

    // Не показываем stack trace в продакшене
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
      ...(isDevelopment && { stack: err.stack }),
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

// ===== ЗАПУСК СЕРВЕРА =====

export function startServer(port: number = 3001, config?: Partial<ServerConfig>) {
  const app = createApp(config);

  const server = app.listen(port, () => {
    logger.info(`🚀 Instagram Scraper API server started on port ${port}`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  return server;
}

// Запуск сервера если файл запущен напрямую
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3001', 10);
  startServer(port);
}
