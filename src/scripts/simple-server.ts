/**
 * 🚀 Простой тестовый сервер для проверки
 */

import express from 'express';

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('🔍 Health check requested');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'Instagram Scraper API is running!'
  });
});

// API info
app.get('/api', (req, res) => {
  console.log('📋 API info requested');
  res.json({
    name: 'Instagram Scraper API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      competitors: '/api/competitors',
      hashtags: '/api/hashtags'
    }
  });
});

// Mock competitors endpoint
app.get('/api/competitors', (req, res) => {
  console.log('🏢 Competitors requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        username: 'clinicajoelleofficial',
        full_name: 'Clinica Joelle Official',
        is_active: true,
        stats: {
          total_reels: 0,
          avg_views: 0
        }
      },
      {
        id: 2,
        username: 'kayaclinicarabia',
        full_name: 'Kaya Clinic Arabia',
        is_active: true,
        stats: {
          total_reels: 0,
          avg_views: 0
        }
      }
    ],
    total: 2
  });
});

// Mock hashtags endpoint
app.get('/api/hashtags', (req, res) => {
  console.log('🏷️ Hashtags requested');
  res.json({
    success: true,
    data: [
      {
        id: 1,
        tag_name: 'aestheticmedicine',
        is_active: true,
        stats: {
          total_reels: 0,
          avg_views: 0
        }
      },
      {
        id: 2,
        tag_name: 'botox',
        is_active: true,
        stats: {
          total_reels: 0,
          avg_views: 0
        }
      }
    ],
    total: 2
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('💥 Server error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Simple Instagram Scraper API started on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API info: http://localhost:${PORT}/api`);
  console.log(`🏢 Competitors: http://localhost:${PORT}/api/competitors`);
  console.log(`🏷️ Hashtags: http://localhost:${PORT}/api/hashtags`);
  console.log('✅ Server is ready for testing!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
