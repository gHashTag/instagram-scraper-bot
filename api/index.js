/**
 * 🚀 Instagram Scraper API для Vercel
 * 
 * Готовый к деплою сервер с mock данными
 */

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// CORS для Obsidian
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Логирование
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== ENDPOINTS =====

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Instagram Scraper API is running!',
    version: '1.0.0'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Instagram Scraper API',
    version: '1.0.0',
    description: 'REST API for Instagram content scraping and analysis',
    status: 'running',
    endpoints: {
      health: '/health',
      competitors: '/api/competitors',
      hashtags: '/api/hashtags',
      transcribe: '/api/transcribe',
      scrape: '/api/scrape'
    },
    documentation: 'https://github.com/gHashTag/instagram-scraper-bot'
  });
});

// Конкуренты
app.get('/api/competitors', (req, res) => {
  const competitors = [
    {
      id: 1,
      username: 'clinicajoelleofficial',
      full_name: 'Clinica Joelle Official',
      profile_url: 'https://instagram.com/clinicajoelleofficial',
      notes: 'Премиальная клиника эстетической медицины',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      stats: {
        total_reels: 25,
        avg_views: 87500,
        max_views: 250000,
        total_engagement: 15000,
        engagement_rate: 4.5,
        last_scraped: new Date().toISOString()
      }
    },
    {
      id: 2,
      username: 'kayaclinicarabia',
      full_name: 'Kaya Clinic Arabia',
      profile_url: 'https://instagram.com/kayaclinicarabia',
      notes: 'Сеть клиник красоты и эстетической медицины',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      stats: {
        total_reels: 18,
        avg_views: 65000,
        max_views: 180000,
        total_engagement: 12000,
        engagement_rate: 3.8,
        last_scraped: new Date().toISOString()
      }
    },
    {
      id: 3,
      username: 'ziedasclinic',
      full_name: "Zieda's Clinic",
      profile_url: 'https://instagram.com/ziedasclinic',
      notes: 'Клиника эстетической медицины',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      stats: {
        total_reels: 12,
        avg_views: 45000,
        max_views: 120000,
        total_engagement: 8000,
        engagement_rate: 3.2,
        last_scraped: new Date().toISOString()
      }
    }
  ];

  res.json({
    success: true,
    data: competitors,
    total: competitors.length,
    timestamp: new Date().toISOString()
  });
});

// Reels конкурента
app.get('/api/competitors/:id/reels', (req, res) => {
  const competitorId = parseInt(req.params.id);
  
  const mockReels = [
    {
      id: 1,
      reel_url: 'https://instagram.com/p/ABC123',
      video_url: 'https://instagram.com/p/ABC123/video.mp4',
      views_count: 125000,
      likes_count: 8500,
      comments_count: 250,
      description: 'Amazing botox transformation! Results speak for themselves 💫 #botox #aestheticmedicine #transformation',
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      author_username: 'clinicajoelleofficial',
      author_full_name: 'Clinica Joelle Official',
      transcription: 'This is an incredible botox transformation. The patient came to us with concerns about forehead lines and crow\'s feet. After the treatment, you can see the amazing results.',
      transcription_language: 'en',
      transcribed_at: new Date().toISOString(),
      source_type: 'competitor',
      source_name: 'clinicajoelleofficial',
      engagement_rate: 7.0,
      is_viral: true
    },
    {
      id: 2,
      reel_url: 'https://instagram.com/p/DEF456',
      video_url: 'https://instagram.com/p/DEF456/video.mp4',
      views_count: 89000,
      likes_count: 6200,
      comments_count: 180,
      description: 'Lip filler procedure step by step 👄 Professional results guaranteed #lipfillers #aesthetics',
      published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author_username: 'clinicajoelleofficial',
      author_full_name: 'Clinica Joelle Official',
      transcription: 'Today we are performing a lip filler procedure. We use only premium hyaluronic acid fillers for natural-looking results.',
      transcription_language: 'en',
      transcribed_at: new Date().toISOString(),
      source_type: 'competitor',
      source_name: 'clinicajoelleofficial',
      engagement_rate: 7.2,
      is_viral: true
    }
  ];

  res.json({
    success: true,
    data: mockReels,
    total: mockReels.length,
    competitor_id: competitorId,
    timestamp: new Date().toISOString()
  });
});

// Хэштеги
app.get('/api/hashtags', (req, res) => {
  const hashtags = [
    {
      id: 1,
      tag_name: 'aestheticmedicine',
      notes: 'Основной хэштег эстетической медицины',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      stats: {
        total_reels: 45,
        avg_views: 95000,
        max_views: 350000,
        total_engagement: 25000,
        engagement_rate: 5.2,
        trending_score: 8.5,
        last_scraped: new Date().toISOString()
      }
    },
    {
      id: 2,
      tag_name: 'botox',
      notes: 'Инъекционные процедуры ботокса',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      stats: {
        total_reels: 38,
        avg_views: 110000,
        max_views: 420000,
        total_engagement: 30000,
        engagement_rate: 6.1,
        trending_score: 9.2,
        last_scraped: new Date().toISOString()
      }
    },
    {
      id: 3,
      tag_name: 'fillers',
      notes: 'Инъекционные филлеры',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      stats: {
        total_reels: 32,
        avg_views: 85000,
        max_views: 280000,
        total_engagement: 20000,
        engagement_rate: 4.8,
        trending_score: 7.8,
        last_scraped: new Date().toISOString()
      }
    }
  ];

  res.json({
    success: true,
    data: hashtags,
    total: hashtags.length,
    timestamp: new Date().toISOString()
  });
});

// Транскрибация
app.post('/api/transcribe', (req, res) => {
  const { videoUrl, reelId, language = 'auto' } = req.body;
  
  if (!videoUrl && !reelId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      details: ['Either videoUrl or reelId must be provided']
    });
  }

  // Mock transcription
  const mockTranscription = 'This is a mock transcription of the Instagram reel. The video shows an amazing aesthetic medicine procedure with excellent results.';

  res.json({
    success: true,
    transcription: mockTranscription,
    language: language,
    duration: 30,
    confidence: 0.95,
    timestamp: new Date().toISOString()
  });
});

// Скрапинг
app.post('/api/scrape/competitors', (req, res) => {
  const { competitor, minViews = 50000, maxAgeDays = 14 } = req.body;
  
  const jobId = `scrape-competitors-${Date.now()}`;
  const competitors = competitor ? [competitor] : ['clinicajoelleofficial', 'kayaclinicarabia', 'ziedasclinic'];
  
  res.status(202).json({
    success: true,
    message: `Scraping started for ${competitors.length} competitors`,
    jobId: jobId,
    competitors: competitors,
    estimatedTime: competitors.length * 60, // 1 минута на конкурента
    timestamp: new Date().toISOString()
  });
});

app.post('/api/scrape/hashtags', (req, res) => {
  const { hashtag, minViews = 50000, maxAgeDays = 14 } = req.body;
  
  const jobId = `scrape-hashtags-${Date.now()}`;
  const hashtags = hashtag ? [hashtag] : ['aestheticmedicine', 'botox', 'fillers'];
  
  res.status(202).json({
    success: true,
    message: `Scraping started for ${hashtags.length} hashtags`,
    jobId: jobId,
    hashtags: hashtags,
    estimatedTime: hashtags.length * 45, // 45 секунд на хэштег
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Export для Vercel
module.exports = app;

// Локальный запуск
if (require.main === module) {
  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`🚀 Instagram Scraper API started on port ${PORT}`);
    console.log(`📋 Health: http://localhost:${PORT}/health`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🏢 Competitors: http://localhost:${PORT}/api/competitors`);
    console.log(`🏷️ Hashtags: http://localhost:${PORT}/api/hashtags`);
    console.log('✅ Server ready for testing!');
  });
}
