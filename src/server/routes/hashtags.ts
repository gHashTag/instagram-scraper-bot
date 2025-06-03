/**
 * 🟢 API роуты для хэштегов
 */

import { Router } from 'express';
import { z } from 'zod';
import { initializeDBConnection } from '../../db/neonDB';
import { hashtagsTable, reelsTable } from '../../db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { logger } from '../../logger';

const router = Router();
const db = initializeDBConnection();

const HashtagsQuerySchema = z.object({
  active: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => parseInt(val || '1', 10)),
  limit: z.string().optional().transform(val => parseInt(val || '20', 10)),
});

router.get('/', async (req, res) => {
  try {
    const query = HashtagsQuerySchema.parse(req.query);
    
    let dbQuery = db.select().from(hashtagsTable);
    
    if (query.active !== undefined) {
      dbQuery = dbQuery.where(eq(hashtagsTable.is_active, query.active));
    }

    const offset = (query.page - 1) * query.limit;
    const hashtags = await dbQuery
      .limit(query.limit)
      .offset(offset)
      .orderBy(desc(hashtagsTable.updated_at));

    res.json({
      success: true,
      data: hashtags,
      total: hashtags.length
    });

  } catch (error) {
    logger.error('Error fetching hashtags:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch hashtags'
    });
  }
});

router.get('/:tag/reels', async (req, res) => {
  try {
    const hashtag = req.params.tag;
    
    const reels = await db
      .select()
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.source_type, 'hashtag'),
          eq(reelsTable.source_name, hashtag)
        )
      )
      .orderBy(desc(reelsTable.views_count))
      .limit(20);

    if (reels.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Hashtag not found'
      });
    }

    res.json({
      success: true,
      data: reels,
      total: reels.length,
      hashtag: hashtag
    });

  } catch (error) {
    logger.error('Error fetching hashtag reels:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hashtag reels'
    });
  }
});

export default router;
