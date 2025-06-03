/**
 * 🔴 TDD: Тесты для API транскрибации
 * 
 * Тестируем:
 * - POST /api/transcribe - транскрибация видео через OpenAI Whisper
 * - GET /api/reels/:id/transcript - получение транскрипции
 * - POST /api/transcribe/batch - массовая транскрибация
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../server/app';
import { initializeDBConnection } from '../../../db/neonDB';

// Мокаем OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: vi.fn()
      }
    }
  }))
}));

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

describe('🎙️ Transcription API', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/transcribe', () => {
    it('🔴 должен транскрибировать видео по URL', async () => {
      // Arrange
      const mockTranscription = {
        text: 'This is an amazing botox transformation. The results are incredible and the patient is very happy with the outcome.'
      };

      const mockOpenAI = {
        audio: {
          transcriptions: {
            create: vi.fn().mockResolvedValue(mockTranscription)
          }
        }
      };

      // Мокаем загрузку видео
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      // Act
      const response = await request(app)
        .post('/api/transcribe')
        .send({
          videoUrl: 'https://instagram.com/p/ABC123/video.mp4',
          language: 'en'
        })
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        transcription: mockTranscription.text,
        language: 'en',
        duration: expect.any(Number)
      });
    });

    it('🔴 должен транскрибировать reel по ID', async () => {
      // Arrange
      const reelId = 1;
      const mockReel = {
        id: reelId,
        reel_url: 'https://instagram.com/p/ABC123',
        video_url: 'https://instagram.com/p/ABC123/video.mp4',
        transcription: null
      };

      const mockTranscription = {
        text: 'Amazing aesthetic medicine results shown in this video.'
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockReel])
        })
      });

      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ ...mockReel, transcription: mockTranscription.text }])
        })
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      // Act
      const response = await request(app)
        .post('/api/transcribe')
        .send({
          reelId: reelId,
          language: 'auto'
        })
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        reelId: reelId,
        transcription: mockTranscription.text,
        language: 'auto'
      });
    });

    it('🔴 должен обрабатывать ошибки OpenAI API', async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
      });

      const mockOpenAI = {
        audio: {
          transcriptions: {
            create: vi.fn().mockRejectedValue(new Error('OpenAI API error'))
          }
        }
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/transcribe')
        .send({
          videoUrl: 'https://instagram.com/p/ABC123/video.mp4'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Transcription failed'
      });
    });

    it('🔴 должен валидировать параметры запроса', async () => {
      // Act & Assert
      const response = await request(app)
        .post('/api/transcribe')
        .send({
          // Отсутствуют обязательные параметры
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing required parameters',
        details: expect.any(Array)
      });
    });
  });

  describe('GET /api/reels/:id/transcript', () => {
    it('🔴 должен возвращать существующую транскрипцию', async () => {
      // Arrange
      const reelId = 1;
      const mockReel = {
        id: reelId,
        reel_url: 'https://instagram.com/p/ABC123',
        transcription: 'This is the existing transcription text.',
        transcription_language: 'en',
        transcribed_at: new Date()
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockReel])
        })
      });

      // Act
      const response = await request(app)
        .get(`/api/reels/${reelId}/transcript`)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        reelId: reelId,
        transcription: mockReel.transcription,
        language: mockReel.transcription_language,
        transcribedAt: mockReel.transcribed_at.toISOString()
      });
    });

    it('🔴 должен возвращать 404 для reel без транскрипции', async () => {
      // Arrange
      const reelId = 1;
      const mockReel = {
        id: reelId,
        reel_url: 'https://instagram.com/p/ABC123',
        transcription: null
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockReel])
        })
      });

      // Act & Assert
      const response = await request(app)
        .get(`/api/reels/${reelId}/transcript`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Transcription not found'
      });
    });

    it('🔴 должен возвращать 404 для несуществующего reel', async () => {
      // Arrange
      const nonExistentId = 999;
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      // Act & Assert
      const response = await request(app)
        .get(`/api/reels/${nonExistentId}/transcript`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Reel not found'
      });
    });
  });

  describe('POST /api/transcribe/batch', () => {
    it('🔴 должен запускать массовую транскрибацию', async () => {
      // Arrange
      const mockReelsWithoutTranscription = [
        {
          id: 1,
          reel_url: 'https://instagram.com/p/ABC123',
          video_url: 'https://instagram.com/p/ABC123/video.mp4',
          transcription: null
        },
        {
          id: 2,
          reel_url: 'https://instagram.com/p/DEF456',
          video_url: 'https://instagram.com/p/DEF456/video.mp4',
          transcription: null
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockReelsWithoutTranscription)
        })
      });

      // Act
      const response = await request(app)
        .post('/api/transcribe/batch')
        .send({
          limit: 10,
          language: 'auto'
        })
        .expect(202);

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'Batch transcription started',
        jobId: expect.any(String),
        totalReels: 2,
        estimatedTime: expect.any(Number)
      });
    });

    it('🔴 должен фильтровать reels по минимальным просмотрам', async () => {
      // Arrange
      const minViews = 50000;
      const mockHighViewsReels = [
        {
          id: 1,
          views_count: 75000,
          transcription: null
        }
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockHighViewsReels)
        })
      });

      // Act
      const response = await request(app)
        .post('/api/transcribe/batch')
        .send({
          minViews: minViews,
          limit: 5
        })
        .expect(202);

      // Assert
      expect(response.body.totalReels).toBe(1);
    });

    it('🔴 должен возвращать статус если нет reels для транскрибации', async () => {
      // Arrange
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      // Act
      const response = await request(app)
        .post('/api/transcribe/batch')
        .send({
          limit: 10
        })
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        message: 'No reels found for transcription',
        totalReels: 0
      });
    });
  });

  describe('GET /api/transcribe/status/:jobId', () => {
    it('🔴 должен возвращать статус задачи транскрибации', async () => {
      // Arrange
      const jobId = 'job-123';
      const mockJobStatus = {
        jobId: jobId,
        status: 'processing',
        progress: 0.6,
        completed: 6,
        total: 10,
        errors: 0,
        startedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 300000) // 5 минут
      };

      // Act
      const response = await request(app)
        .get(`/api/transcribe/status/${jobId}`)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        success: true,
        ...mockJobStatus
      });
    });
  });
});
