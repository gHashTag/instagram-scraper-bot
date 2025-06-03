/**
 * 🔴 TDD: Тесты для API хэштегов
 * 
 * Тестируем:
 * - GET /api/hashtags - список всех хэштегов
 * - GET /api/hashtags/:tag/reels - reels по хэштегу
 * - POST /api/scrape/hashtags - запуск скрапинга хэштегов
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../server/app';
import { initializeDBConnection } from '../../../db/neonDB';

// Мокаем базу данных
vi.mock('../../../db/neonDB');
const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mocked(initializeDBConnection).mockReturnValue(mockDb as any);

describe('🏷️ Hashtags API', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/hashtags', () => {
    it('🔴 должен возвращать список всех хэштегов', async () => {
      // Arrange
      const mockHashtags = [
        {
          id: 1,
          tag_name: 'aestheticmedicine',
          notes: 'Основной хэштег эстетической медицины',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          tag_name: 'botox',
          notes: 'Инъекционные процедуры ботокса',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockHashtags)
        })
      });

      // Act
      const response = await request(app)
        .get('/api/hashtags')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockHashtags,
        total: 2
      });
    });

    it('🔴 должен возвращать только активные хэштеги', async () => {
      // Arrange
      const mockActiveHashtags = [
        {
          id: 1,
          tag_name: 'aestheticmedicine',
          is_active: true,
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockActiveHashtags)
        })
      });

      // Act
      const response = await request(app)
        .get('/api/hashtags?active=true')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].is_active).toBe(true);
    });
  });

  describe('GET /api/hashtags/:tag/reels', () => {
    it('🔴 должен возвращать reels по конкретному хэштегу', async () => {
      // Arrange
      const hashtag = 'botox';
      const mockReels = [
        {
          id: 1,
          reel_url: 'https://instagram.com/p/ABC123',
          views_count: 85000,
          likes_count: 6000,
          comments_count: 150,
          description: 'Amazing botox results! #botox #aestheticmedicine',
          published_at: new Date(),
          transcription: 'This botox treatment shows incredible results...',
        },
        {
          id: 2,
          reel_url: 'https://instagram.com/p/DEF456',
          views_count: 150000,
          likes_count: 12000,
          comments_count: 300,
          description: 'Before and after botox transformation #botox',
          published_at: new Date(),
          transcription: null,
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockReels)
        })
      });

      // Act
      const response = await request(app)
        .get(`/api/hashtags/${hashtag}/reels`)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockReels,
        total: 2,
        hashtag: hashtag
      });
    });

    it('🔴 должен фильтровать reels по дате публикации', async () => {
      // Arrange
      const hashtag = 'aestheticmedicine';
      const daysBack = 7;
      const mockRecentReels = [
        {
          id: 1,
          views_count: 95000,
          published_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 дня назад
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockRecentReels)
        })
      });

      // Act
      const response = await request(app)
        .get(`/api/hashtags/${hashtag}/reels?daysBack=${daysBack}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(new Date(response.body.data[0].published_at)).toBeInstanceOf(Date);
    });

    it('🔴 должен возвращать 404 для несуществующего хэштега', async () => {
      // Arrange
      const nonExistentTag = 'nonexistenttag';
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      // Act & Assert
      const response = await request(app)
        .get(`/api/hashtags/${nonExistentTag}/reels`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Hashtag not found'
      });
    });
  });

  describe('POST /api/scrape/hashtags', () => {
    it('🔴 должен запускать скрапинг для всех активных хэштегов', async () => {
      // Arrange
      const mockHashtags = [
        { id: 1, tag_name: 'aestheticmedicine', is_active: true },
        { id: 2, tag_name: 'botox', is_active: true },
        { id: 3, tag_name: 'fillers', is_active: true }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockHashtags)
        })
      });

      // Act
      const response = await request(app)
        .post('/api/scrape/hashtags')
        .send({
          minViews: 50000,
          maxAgeDays: 14
        })
        .expect(202);

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'Scraping started for 3 hashtags',
        jobId: expect.any(String),
        hashtags: ['aestheticmedicine', 'botox', 'fillers']
      });
    });

    it('🔴 должен запускать скрапинг для конкретного хэштега', async () => {
      // Arrange
      const targetHashtag = 'botox';
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 2, tag_name: targetHashtag, is_active: true }
          ])
        })
      });

      // Act
      const response = await request(app)
        .post('/api/scrape/hashtags')
        .send({
          hashtag: targetHashtag,
          minViews: 75000,
          maxAgeDays: 7
        })
        .expect(202);

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'Scraping started for 1 hashtags',
        jobId: expect.any(String),
        hashtags: [targetHashtag]
      });
    });

    it('🔴 должен валидировать параметры запроса', async () => {
      // Act & Assert
      const response = await request(app)
        .post('/api/scrape/hashtags')
        .send({
          minViews: 'invalid',
          maxAgeDays: -1,
          hashtag: ''
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid parameters',
        details: expect.any(Array)
      });
    });

    it('🔴 должен обрабатывать ошибки скрапинга', async () => {
      // Arrange
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      // Act & Assert
      const response = await request(app)
        .post('/api/scrape/hashtags')
        .send({
          minViews: 50000,
          maxAgeDays: 14
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to start scraping'
      });
    });
  });

  describe('GET /api/hashtags/analytics', () => {
    it('🔴 должен возвращать аналитику по хэштегам', async () => {
      // Arrange
      const mockAnalytics = [
        {
          tag_name: 'botox',
          total_reels: 25,
          avg_views: 87500,
          max_views: 250000,
          total_engagement: 15000,
          engagement_rate: 0.045
        },
        {
          tag_name: 'aestheticmedicine',
          total_reels: 18,
          avg_views: 65000,
          max_views: 180000,
          total_engagement: 12000,
          engagement_rate: 0.038
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockAnalytics)
        })
      });

      // Act
      const response = await request(app)
        .get('/api/hashtags/analytics')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockAnalytics,
        total: 2
      });
    });
  });
});
