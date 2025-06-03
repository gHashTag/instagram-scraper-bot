/**
 * 🔴 TDD: Тесты для API конкурентов
 * 
 * Тестируем:
 * - GET /api/competitors - список всех конкурентов
 * - GET /api/competitors/:id/reels - reels конкретного конкурента
 * - POST /api/scrape/competitors - запуск скрапинга конкурентов
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../server/app';
import { initializeDBConnection } from '../../../db/neonDB';
import { competitorsTable, reelsTable } from '../../../db/schema';
import { eq } from 'drizzle-orm';

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

describe('🏢 Competitors API', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/competitors', () => {
    it('🔴 должен возвращать список всех конкурентов', async () => {
      // Arrange
      const mockCompetitors = [
        {
          id: 1,
          username: 'clinicajoelleofficial',
          full_name: 'Clinica Joelle Official',
          profile_url: 'https://instagram.com/clinicajoelleofficial',
          notes: 'Премиальная клиника',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          username: 'kayaclinicarabia',
          full_name: 'Kaya Clinic Arabia',
          profile_url: 'https://instagram.com/kayaclinicarabia',
          notes: 'Сеть клиник',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockCompetitors)
        })
      });

      // Act
      const response = await request(app)
        .get('/api/competitors')
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockCompetitors,
        total: 2
      });
    });

    it('🔴 должен возвращать только активных конкурентов', async () => {
      // Arrange
      const mockActiveCompetitors = [
        {
          id: 1,
          username: 'clinicajoelleofficial',
          full_name: 'Clinica Joelle Official',
          is_active: true,
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockActiveCompetitors)
        })
      });

      // Act
      const response = await request(app)
        .get('/api/competitors?active=true')
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].is_active).toBe(true);
    });

    it('🔴 должен обрабатывать ошибки базы данных', async () => {
      // Arrange
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      // Act & Assert
      const response = await request(app)
        .get('/api/competitors')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch competitors'
      });
    });
  });

  describe('GET /api/competitors/:id/reels', () => {
    it('🔴 должен возвращать reels конкретного конкурента', async () => {
      // Arrange
      const competitorId = 1;
      const mockReels = [
        {
          id: 1,
          reel_url: 'https://instagram.com/p/ABC123',
          views_count: 75000,
          likes_count: 5000,
          comments_count: 100,
          description: 'Amazing transformation!',
          published_at: new Date(),
          transcription: 'This is a great result...',
        },
        {
          id: 2,
          reel_url: 'https://instagram.com/p/DEF456',
          views_count: 120000,
          likes_count: 8000,
          comments_count: 200,
          description: 'Before and after botox',
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
        .get(`/api/competitors/${competitorId}/reels`)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        data: mockReels,
        total: 2,
        competitor_id: competitorId
      });
    });

    it('🔴 должен фильтровать reels по минимальным просмотрам', async () => {
      // Arrange
      const competitorId = 1;
      const minViews = 100000;
      const mockFilteredReels = [
        {
          id: 2,
          views_count: 120000,
          description: 'High views reel',
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockFilteredReels)
        })
      });

      // Act
      const response = await request(app)
        .get(`/api/competitors/${competitorId}/reels?minViews=${minViews}`)
        .expect(200);

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].views_count).toBeGreaterThanOrEqual(minViews);
    });

    it('🔴 должен возвращать 404 для несуществующего конкурента', async () => {
      // Arrange
      const nonExistentId = 999;
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      // Act & Assert
      const response = await request(app)
        .get(`/api/competitors/${nonExistentId}/reels`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Competitor not found'
      });
    });
  });

  describe('POST /api/scrape/competitors', () => {
    it('🔴 должен запускать скрапинг для всех активных конкурентов', async () => {
      // Arrange
      const mockCompetitors = [
        { id: 1, username: 'clinicajoelleofficial', is_active: true },
        { id: 2, username: 'kayaclinicarabia', is_active: true }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockCompetitors)
        })
      });

      // Act
      const response = await request(app)
        .post('/api/scrape/competitors')
        .send({
          minViews: 50000,
          maxAgeDays: 14
        })
        .expect(202);

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'Scraping started for 2 competitors',
        jobId: expect.any(String),
        competitors: ['clinicajoelleofficial', 'kayaclinicarabia']
      });
    });

    it('🔴 должен запускать скрапинг для конкретного конкурента', async () => {
      // Arrange
      const targetCompetitor = 'clinicajoelleofficial';
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 1, username: targetCompetitor, is_active: true }
          ])
        })
      });

      // Act
      const response = await request(app)
        .post('/api/scrape/competitors')
        .send({
          competitor: targetCompetitor,
          minViews: 75000,
          maxAgeDays: 7
        })
        .expect(202);

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'Scraping started for 1 competitors',
        jobId: expect.any(String),
        competitors: [targetCompetitor]
      });
    });

    it('🔴 должен валидировать параметры запроса', async () => {
      // Act & Assert
      const response = await request(app)
        .post('/api/scrape/competitors')
        .send({
          minViews: 'invalid',
          maxAgeDays: -1
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid parameters',
        details: expect.any(Array)
      });
    });
  });
});
