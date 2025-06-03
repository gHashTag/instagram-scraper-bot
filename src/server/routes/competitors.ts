/**
 * 🟢 API роуты для конкурентов
 * 
 * Endpoints:
 * - GET /api/competitors - список всех конкурентов
 * - GET /api/competitors/:id/reels - reels конкретного конкурента
 * - GET /api/competitors/:id/stats - статистика конкурента
 */

import { Router } from 'express';
import { z } from 'zod';
import { initializeDBConnection } from '../../db/neonDB';
import { competitorsTable, reelsTable } from '../../db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { logger } from '../../logger';
import { ApiResponse, CompetitorResponse, ReelResponse } from '../../types/api';

const router = Router();
const db = initializeDBConnection();

// ===== ВАЛИДАЦИЯ =====

const CompetitorsQuerySchema = z.object({
  active: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '20', 10)),
});

const CompetitorReelsQuerySchema = z.object({
  minViews: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  maxViews: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
  daysBack: z.string().optional().transform(val => val ? parseInt(val, 10) : 30),
  hasTranscription: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '20', 10)),
  sortBy: z.enum(['views', 'likes', 'engagement', 'date']).optional().default('views'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ===== ROUTES =====

/**
 * GET /api/competitors
 * Получить список всех конкурентов
 */
router.get('/', async (req, res) => {
  try {
    const query = CompetitorsQuerySchema.parse(req.query);
    
    let dbQuery = db.select().from(competitorsTable);
    
    // Фильтр по активности
    if (query.active !== undefined) {
      dbQuery = dbQuery.where(eq(competitorsTable.is_active, query.active));
    }

    // Пагинация
    const offset = (query.page - 1) * query.limit;
    const competitors = await dbQuery
      .limit(query.limit)
      .offset(offset)
      .orderBy(desc(competitorsTable.updated_at));

    // Получаем статистику для каждого конкурента
    const competitorsWithStats = await Promise.all(
      competitors.map(async (competitor) => {
        const stats = await db
          .select({
            total_reels: sql<number>`count(*)`,
            avg_views: sql<number>`avg(${reelsTable.views_count})`,
            max_views: sql<number>`max(${reelsTable.views_count})`,
            total_engagement: sql<number>`sum(${reelsTable.likes_count} + ${reelsTable.comments_count})`,
          })
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.source_type, 'competitor'),
              eq(reelsTable.source_name, competitor.username)
            )
          );

        const stat = stats[0];
        const engagement_rate = stat.avg_views > 0 
          ? (stat.total_engagement / stat.avg_views) * 100 
          : 0;

        return {
          ...competitor,
          stats: {
            total_reels: stat.total_reels || 0,
            avg_views: Math.round(stat.avg_views || 0),
            max_views: stat.max_views || 0,
            total_engagement: stat.total_engagement || 0,
            engagement_rate: Math.round(engagement_rate * 100) / 100,
            last_scraped: null // TODO: добавить из таблицы логов
          }
        };
      })
    );

    const response: ApiResponse<CompetitorResponse[]> = {
      success: true,
      data: competitorsWithStats,
      total: competitorsWithStats.length
    };

    res.json(response);

  } catch (error) {
    logger.error('Error fetching competitors:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch competitors'
    });
  }
});

/**
 * GET /api/competitors/:id/reels
 * Получить reels конкретного конкурента
 */
router.get('/:id/reels', async (req, res) => {
  try {
    const competitorId = parseInt(req.params.id, 10);
    const query = CompetitorReelsQuerySchema.parse(req.query);

    // Проверяем существование конкурента
    const competitor = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.id, competitorId))
      .limit(1);

    if (competitor.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Competitor not found'
      });
    }

    // Строим запрос для reels
    let reelsQuery = db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.source_type, 'competitor'),
          eq(reelsTable.source_name, competitor[0].username)
        )
      );

    // Применяем фильтры
    const filters = [];

    if (query.minViews) {
      filters.push(gte(reelsTable.views_count, query.minViews));
    }

    if (query.maxViews) {
      filters.push(sql`${reelsTable.views_count} <= ${query.maxViews}`);
    }

    if (query.daysBack) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - query.daysBack);
      filters.push(gte(reelsTable.published_at, dateThreshold));
    }

    if (query.hasTranscription !== undefined) {
      if (query.hasTranscription) {
        filters.push(sql`${reelsTable.transcription} IS NOT NULL`);
      } else {
        filters.push(sql`${reelsTable.transcription} IS NULL`);
      }
    }

    if (filters.length > 0) {
      reelsQuery = reelsQuery.where(and(...filters));
    }

    // Сортировка
    const sortColumn = {
      views: reelsTable.views_count,
      likes: reelsTable.likes_count,
      engagement: sql`${reelsTable.likes_count} + ${reelsTable.comments_count}`,
      date: reelsTable.published_at
    }[query.sortBy];

    if (query.sortOrder === 'desc') {
      reelsQuery = reelsQuery.orderBy(desc(sortColumn));
    } else {
      reelsQuery = reelsQuery.orderBy(sortColumn);
    }

    // Пагинация
    const offset = (query.page - 1) * query.limit;
    const reels = await reelsQuery
      .limit(query.limit)
      .offset(offset);

    // Преобразуем в формат API
    const reelsResponse: ReelResponse[] = reels.map(reel => ({
      ...reel,
      published_at: reel.published_at.toISOString(),
      transcribed_at: reel.transcribed_at?.toISOString() || null,
      engagement_rate: reel.views_count > 0 
        ? ((reel.likes_count + reel.comments_count) / reel.views_count) * 100 
        : 0,
      is_viral: reel.views_count >= 50000
    }));

    const response: ApiResponse<ReelResponse[]> = {
      success: true,
      data: reelsResponse,
      total: reelsResponse.length,
      competitor_id: competitorId
    };

    res.json(response);

  } catch (error) {
    logger.error('Error fetching competitor reels:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch competitor reels'
    });
  }
});

/**
 * GET /api/competitors/:id/stats
 * Получить детальную статистику конкурента
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const competitorId = parseInt(req.params.id, 10);

    // Проверяем существование конкурента
    const competitor = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.id, competitorId))
      .limit(1);

    if (competitor.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Competitor not found'
      });
    }

    // Получаем детальную статистику
    const stats = await db
      .select({
        total_reels: sql<number>`count(*)`,
        avg_views: sql<number>`avg(${reelsTable.views_count})`,
        max_views: sql<number>`max(${reelsTable.views_count})`,
        min_views: sql<number>`min(${reelsTable.views_count})`,
        total_likes: sql<number>`sum(${reelsTable.likes_count})`,
        total_comments: sql<number>`sum(${reelsTable.comments_count})`,
        viral_count: sql<number>`count(*) filter (where ${reelsTable.views_count} >= 50000)`,
        transcribed_count: sql<number>`count(*) filter (where ${reelsTable.transcription} is not null)`,
        latest_post: sql<string>`max(${reelsTable.published_at})`,
        oldest_post: sql<string>`min(${reelsTable.published_at})`
      })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.source_type, 'competitor'),
          eq(reelsTable.source_name, competitor[0].username)
        )
      );

    const stat = stats[0];
    const total_engagement = (stat.total_likes || 0) + (stat.total_comments || 0);
    const engagement_rate = stat.avg_views > 0 
      ? (total_engagement / (stat.total_reels * stat.avg_views)) * 100 
      : 0;

    const response = {
      success: true,
      data: {
        competitor: competitor[0],
        stats: {
          total_reels: stat.total_reels || 0,
          avg_views: Math.round(stat.avg_views || 0),
          max_views: stat.max_views || 0,
          min_views: stat.min_views || 0,
          total_engagement,
          engagement_rate: Math.round(engagement_rate * 100) / 100,
          viral_rate: stat.total_reels > 0 ? (stat.viral_count / stat.total_reels) * 100 : 0,
          transcription_rate: stat.total_reels > 0 ? (stat.transcribed_count / stat.total_reels) * 100 : 0,
          latest_post: stat.latest_post,
          oldest_post: stat.oldest_post,
          posting_frequency: 'daily' // TODO: вычислить на основе дат
        }
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Error fetching competitor stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch competitor stats'
    });
  }
});

export default router;
