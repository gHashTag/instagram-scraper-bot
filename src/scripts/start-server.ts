/**
 * 🚀 Запуск Instagram Scraper API сервера
 * 
 * Использование:
 * npm run server
 * npm run server:dev
 * npm run server:prod
 */

import dotenv from 'dotenv';
import { startServer } from '../server/app';
import { logger } from '../logger';

// Загружаем переменные окружения
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

logger.info('🚀 Starting Instagram Scraper API Server...', {
  port: PORT,
  environment: NODE_ENV,
  timestamp: new Date().toISOString()
});

// Конфигурация сервера
const config = {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:8080',
      'obsidian://localhost',
      'app://obsidian.md',
      ...(process.env.CORS_ORIGINS?.split(',') || [])
    ],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 минут
    max: NODE_ENV === 'production' ? 100 : 1000 // Больше запросов в dev
  }
};

// Запускаем сервер
startServer(PORT, config);

// Логируем важную информацию
logger.info('📋 Server Configuration:', {
  port: PORT,
  environment: NODE_ENV,
  cors: config.cors.origin,
  rateLimit: config.rateLimit,
  database: process.env.DATABASE_URL ? 'configured' : 'missing',
  openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
  apify: process.env.APIFY_TOKEN ? 'configured' : 'missing'
});

logger.info('🌐 API Endpoints available at:', {
  health: `http://localhost:${PORT}/health`,
  api: `http://localhost:${PORT}/api`,
  competitors: `http://localhost:${PORT}/api/competitors`,
  hashtags: `http://localhost:${PORT}/api/hashtags`,
  transcribe: `http://localhost:${PORT}/api/transcribe`,
  scrape: `http://localhost:${PORT}/api/scrape`
});

logger.info('📖 API Documentation:', {
  swagger: `http://localhost:${PORT}/api/docs`,
  endpoints: `http://localhost:${PORT}/api`
});

// Проверяем обязательные переменные окружения
const requiredEnvVars = [
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'APIFY_TOKEN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.warn('⚠️ Missing environment variables:', {
    missing: missingEnvVars,
    note: 'Some features may not work properly'
  });
}

logger.info('✅ Instagram Scraper API Server is ready!');
