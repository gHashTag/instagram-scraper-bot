/**
 * 🟢 API роуты для транскрибации
 */

import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../../logger';

const router = Router();

const TranscriptionRequestSchema = z.object({
  videoUrl: z.string().url().optional(),
  reelId: z.number().optional(),
  language: z.string().optional().default('auto')
}).refine(data => data.videoUrl || data.reelId, {
  message: "Either videoUrl or reelId must be provided"
});

router.post('/', async (req, res) => {
  try {
    const request = TranscriptionRequestSchema.parse(req.body);
    
    // TODO: Реализовать транскрибацию через OpenAI Whisper
    
    res.json({
      success: true,
      transcription: 'Mock transcription text',
      language: request.language,
      duration: 30
    });

  } catch (error) {
    logger.error('Error in transcription:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Transcription failed'
    });
  }
});

router.get('/reels/:id/transcript', async (req, res) => {
  try {
    const reelId = parseInt(req.params.id, 10);
    
    // TODO: Получить транскрипцию из базы данных
    
    res.status(404).json({
      success: false,
      error: 'Transcription not found'
    });

  } catch (error) {
    logger.error('Error fetching transcript:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcript'
    });
  }
});

router.post('/batch', async (req, res) => {
  try {
    const jobId = `batch-${Date.now()}`;
    
    // TODO: Запустить массовую транскрибацию
    
    res.status(202).json({
      success: true,
      message: 'Batch transcription started',
      jobId: jobId,
      totalReels: 0,
      estimatedTime: 0
    });

  } catch (error) {
    logger.error('Error starting batch transcription:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to start batch transcription'
    });
  }
});

export default router;
