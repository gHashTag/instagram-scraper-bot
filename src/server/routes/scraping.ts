/**
 * 🟢 API роуты для скрапинга
 */

import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../logger';

const router = Router();

const ScrapeCompetitorsSchema = z.object({
  competitor: z.string().optional(),
  minViews: z.number().optional().default(50000),
  maxAgeDays: z.number().optional().default(14)
});

const ScrapeHashtagsSchema = z.object({
  hashtag: z.string().optional(),
  minViews: z.number().optional().default(50000),
  maxAgeDays: z.number().optional().default(14)
});

router.post('/competitors', async (req, res) => {
  try {
    const request = ScrapeCompetitorsSchema.parse(req.body);
    
    const jobId = `scrape-competitors-${Date.now()}`;
    const competitors = request.competitor ? [request.competitor] : ['clinicajoelleofficial', 'kayaclinicarabia'];
    
    // TODO: Запустить скрапинг конкурентов
    
    res.status(202).json({
      success: true,
      message: `Scraping started for ${competitors.length} competitors`,
      jobId: jobId,
      competitors: competitors
    });

  } catch (error) {
    logger.error('Error starting competitor scraping:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start scraping'
    });
  }
});

router.post('/hashtags', async (req, res) => {
  try {
    const request = ScrapeHashtagsSchema.parse(req.body);
    
    const jobId = `scrape-hashtags-${Date.now()}`;
    const hashtags = request.hashtag ? [request.hashtag] : ['aestheticmedicine', 'botox', 'fillers'];
    
    // TODO: Запустить скрапинг хэштегов
    
    res.status(202).json({
      success: true,
      message: `Scraping started for ${hashtags.length} hashtags`,
      jobId: jobId,
      hashtags: hashtags
    });

  } catch (error) {
    logger.error('Error starting hashtag scraping:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to start scraping'
    });
  }
});

export default router;
