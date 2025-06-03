/**
 * 🎯 Клиентский дашборд для Instagram стратегии
 * 
 * Публичный дашборд с автообновлением каждые 24 часа
 */

const express = require('express');
const app = express();

// Middleware
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Mock данные (позже заменим на реальные из API)
const getDashboardData = () => {
  const now = new Date();
  const lastUpdate = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
  
  return {
    lastUpdate: lastUpdate.toISOString(),
    nextUpdate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    
    // Общая статистика
    overview: {
      totalCompetitors: 6,
      totalHashtags: 13,
      totalReels: 156,
      viralContent: 23,
      avgEngagement: 4.8,
      topPerformer: '@clinicajoelleofficial'
    },
    
    // Конкуренты
    competitors: [
      {
        username: 'clinicajoelleofficial',
        fullName: 'Clinica Joelle Official',
        profileUrl: 'https://instagram.com/clinicajoelleofficial',
        stats: {
          totalReels: 25,
          avgViews: 87500,
          maxViews: 250000,
          engagementRate: 4.5,
          viralRate: 32,
          growthRate: 15.2
        },
        topContent: [
          {
            url: 'https://instagram.com/p/ABC123',
            views: 250000,
            likes: 18500,
            description: 'Amazing botox transformation! Results speak for themselves 💫',
            publishedAt: '2025-05-30T10:00:00Z'
          },
          {
            url: 'https://instagram.com/p/DEF456', 
            views: 189000,
            likes: 14200,
            description: 'Lip filler procedure step by step 👄 Professional results',
            publishedAt: '2025-05-28T14:30:00Z'
          }
        ]
      },
      {
        username: 'kayaclinicarabia',
        fullName: 'Kaya Clinic Arabia',
        profileUrl: 'https://instagram.com/kayaclinicarabia',
        stats: {
          totalReels: 18,
          avgViews: 65000,
          maxViews: 180000,
          engagementRate: 3.8,
          viralRate: 22,
          growthRate: 8.7
        },
        topContent: [
          {
            url: 'https://instagram.com/p/GHI789',
            views: 180000,
            likes: 12800,
            description: 'Hydrafacial treatment results ✨ Glowing skin guaranteed',
            publishedAt: '2025-05-29T16:15:00Z'
          }
        ]
      },
      {
        username: 'ziedasclinic',
        fullName: "Zieda's Clinic",
        profileUrl: 'https://instagram.com/ziedasclinic',
        stats: {
          totalReels: 12,
          avgViews: 45000,
          maxViews: 120000,
          engagementRate: 3.2,
          viralRate: 17,
          growthRate: 5.3
        },
        topContent: [
          {
            url: 'https://instagram.com/p/JKL012',
            views: 120000,
            likes: 8900,
            description: 'RF microneedling before and after 🌟 Skin rejuvenation',
            publishedAt: '2025-05-27T12:45:00Z'
          }
        ]
      }
    ],
    
    // Хэштеги
    hashtags: [
      {
        name: 'aestheticmedicine',
        stats: {
          totalReels: 45,
          avgViews: 95000,
          maxViews: 350000,
          engagementRate: 5.2,
          trendingScore: 8.5,
          competitionLevel: 'medium'
        },
        performance: 'excellent',
        recommendation: 'Продолжать использовать как основной хэштег'
      },
      {
        name: 'botox',
        stats: {
          totalReels: 38,
          avgViews: 110000,
          maxViews: 420000,
          engagementRate: 6.1,
          trendingScore: 9.2,
          competitionLevel: 'high'
        },
        performance: 'excellent',
        recommendation: 'Очень эффективен, использовать в топ-контенте'
      },
      {
        name: 'fillers',
        stats: {
          totalReels: 32,
          avgViews: 85000,
          maxViews: 280000,
          engagementRate: 4.8,
          trendingScore: 7.8,
          competitionLevel: 'medium'
        },
        performance: 'good',
        recommendation: 'Хороший потенциал, увеличить использование'
      },
      {
        name: 'hydrafacial',
        stats: {
          totalReels: 28,
          avgViews: 72000,
          maxViews: 195000,
          engagementRate: 4.2,
          trendingScore: 7.1,
          competitionLevel: 'low'
        },
        performance: 'good',
        recommendation: 'Низкая конкуренция, хорошая возможность'
      }
    ],
    
    // Вирусный контент
    viralContent: [
      {
        author: '@clinicajoelleofficial',
        url: 'https://instagram.com/p/ABC123',
        views: 250000,
        likes: 18500,
        comments: 420,
        description: 'Amazing botox transformation! Results speak for themselves 💫',
        hashtags: ['#botox', '#aestheticmedicine', '#transformation'],
        publishedAt: '2025-05-30T10:00:00Z',
        engagementRate: 7.5,
        viralScore: 9.2
      },
      {
        author: '@kayaclinicarabia',
        url: 'https://instagram.com/p/GHI789',
        views: 180000,
        likes: 12800,
        comments: 310,
        description: 'Hydrafacial treatment results ✨ Glowing skin guaranteed',
        hashtags: ['#hydrafacial', '#skincare', '#glowingskin'],
        publishedAt: '2025-05-29T16:15:00Z',
        engagementRate: 7.3,
        viralScore: 8.7
      }
    ],
    
    // Рекомендации
    recommendations: [
      {
        type: 'hashtag',
        title: 'Увеличить использование #botox',
        description: 'Хэштег показывает отличные результаты с engagement rate 6.1%',
        priority: 'high',
        impact: 'Потенциальное увеличение охвата на 25%'
      },
      {
        type: 'content',
        title: 'Создать больше transformation контента',
        description: 'Посты с результатами до/после показывают лучший engagement',
        priority: 'high',
        impact: 'Увеличение вирусности на 40%'
      },
      {
        type: 'timing',
        title: 'Оптимальное время публикации',
        description: 'Лучшие результаты в 16:00-18:00 и 20:00-22:00',
        priority: 'medium',
        impact: 'Увеличение охвата на 15%'
      }
    ]
  };
};

// Мобильная версия дашборда
app.get('/mobile', (req, res) => {
  const data = getDashboardData();

  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🥥 Coco Age - Mobile Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            padding: 10px;
        }
        .header {
            background: white;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .header h1 { font-size: 1.8em; margin-bottom: 10px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        .stat-number { font-size: 1.5em; font-weight: bold; color: #667eea; }
        .section {
            background: white;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .competitor-card, .hashtag-card {
            border: 1px solid #eee;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            background: #f8f9fa;
        }
        .auto-refresh {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div class="auto-refresh">🔄 24ч</div>

    <div class="header">
        <h1>🥥 Coco Age</h1>
        <p>Instagram Strategy</p>
        <small>Обновлено: ${new Date(data.lastUpdate).toLocaleDateString('ru-RU')}</small>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">${data.overview.totalCompetitors}</div>
            <div>Конкурентов</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.overview.totalReels}</div>
            <div>Reels</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.overview.viralContent}</div>
            <div>Вирусных</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.overview.avgEngagement}%</div>
            <div>Engagement</div>
        </div>
    </div>

    <div class="section">
        <h2>🏢 Топ конкуренты</h2>
        ${data.competitors.slice(0, 3).map(comp => `
            <div class="competitor-card">
                <h3>@${comp.username}</h3>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <span>${comp.stats.totalReels} reels</span>
                    <span>${(comp.stats.avgViews / 1000).toFixed(0)}K views</span>
                    <span>${comp.stats.engagementRate}% eng</span>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>🏷️ Топ хэштеги</h2>
        ${data.hashtags.slice(0, 4).map(tag => `
            <div class="hashtag-card">
                <h3>#${tag.name}</h3>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <span>${tag.stats.totalReels} постов</span>
                    <span>${tag.stats.trendingScore}/10 score</span>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>🔥 Вирусный контент</h2>
        ${data.viralContent.slice(0, 2).map(content => `
            <div style="border: 1px solid #eee; border-radius: 10px; padding: 15px; margin-bottom: 15px; background: #f0fff4;">
                <strong>${content.author}</strong><br>
                <small>${content.description.substring(0, 80)}...</small><br>
                <div style="margin-top: 10px;">
                    <span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.8em;">
                        ${(content.views / 1000).toFixed(0)}K views
                    </span>
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        setTimeout(() => window.location.reload(), 24 * 60 * 60 * 1000);
    </script>
</body>
</html>
  `);
});

// Главная страница дашборда
app.get('/', (req, res) => {
  const data = getDashboardData();
  
  res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🥥 Coco Age - Instagram Strategy Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 20px;
        }
        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .update-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .section {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-bottom: 25px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .competitor-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
        }
        .competitor-card {
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 20px;
            background: #f8f9fa;
        }
        .competitor-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .competitor-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(45deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            margin-right: 15px;
        }
        .hashtag-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .hashtag-card {
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 20px;
            background: #f8f9fa;
        }
        .performance-excellent { border-left: 5px solid #28a745; }
        .performance-good { border-left: 5px solid #ffc107; }
        .performance-poor { border-left: 5px solid #dc3545; }
        .viral-content {
            display: grid;
            gap: 20px;
        }
        .viral-item {
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 20px;
            background: linear-gradient(45deg, #fff5f5, #f0fff4);
        }
        .recommendations {
            display: grid;
            gap: 15px;
        }
        .recommendation {
            border: 1px solid #eee;
            border-radius: 12px;
            padding: 20px;
            background: #f8f9fa;
        }
        .priority-high { border-left: 5px solid #dc3545; }
        .priority-medium { border-left: 5px solid #ffc107; }
        .priority-low { border-left: 5px solid #28a745; }
        .auto-refresh {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 15px;
            border-radius: 25px;
            font-size: 0.9em;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
        }
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .competitor-grid, .hashtag-grid { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
    <div class="auto-refresh">🔄 Автообновление: 24ч</div>
    
    <div class="container">
        <div class="header">
            <h1>🥥 Coco Age Instagram Strategy</h1>
            <p>Аналитический дашборд эффективности Instagram стратегии</p>
            <div class="update-info">
                <strong>Последнее обновление:</strong> ${new Date(data.lastUpdate).toLocaleString('ru-RU')}<br>
                <strong>Следующее обновление:</strong> ${new Date(data.nextUpdate).toLocaleString('ru-RU')}
            </div>
        </div>

        <!-- Общая статистика -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${data.overview.totalCompetitors}</div>
                <div class="stat-label">Конкурентов</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.overview.totalHashtags}</div>
                <div class="stat-label">Хэштегов</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.overview.totalReels}</div>
                <div class="stat-label">Reels проанализировано</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.overview.viralContent}</div>
                <div class="stat-label">Вирусный контент</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.overview.avgEngagement}%</div>
                <div class="stat-label">Средний Engagement</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">👑</div>
                <div class="stat-label">${data.overview.topPerformer}</div>
            </div>
        </div>

        <!-- Конкуренты -->
        <div class="section">
            <h2>🏢 Анализ конкурентов</h2>
            <div class="competitor-grid">
                ${data.competitors.map(comp => `
                    <div class="competitor-card">
                        <div class="competitor-header">
                            <div class="competitor-avatar">${comp.username.charAt(0).toUpperCase()}</div>
                            <div>
                                <h3>@${comp.username}</h3>
                                <p>${comp.fullName}</p>
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                            <div style="text-align: center;">
                                <strong>${comp.stats.totalReels}</strong><br>
                                <small>Reels</small>
                            </div>
                            <div style="text-align: center;">
                                <strong>${(comp.stats.avgViews / 1000).toFixed(0)}K</strong><br>
                                <small>Средние просмотры</small>
                            </div>
                            <div style="text-align: center;">
                                <strong>${comp.stats.engagementRate}%</strong><br>
                                <small>Engagement</small>
                            </div>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 8px;">
                            <strong>Топ контент:</strong><br>
                            ${comp.topContent.slice(0, 1).map(content => `
                                <a href="${content.url}" target="_blank" style="color: #667eea; text-decoration: none;">
                                    📈 ${(content.views / 1000).toFixed(0)}K просмотров
                                </a><br>
                                <small>${content.description.substring(0, 60)}...</small>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Хэштеги -->
        <div class="section">
            <h2>🏷️ Эффективность хэштегов</h2>
            <div class="hashtag-grid">
                ${data.hashtags.map(tag => `
                    <div class="hashtag-card performance-${tag.performance}">
                        <h3>#${tag.name}</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0;">
                            <div>
                                <strong>${tag.stats.totalReels}</strong> постов<br>
                                <strong>${(tag.stats.avgViews / 1000).toFixed(0)}K</strong> средние просмотры
                            </div>
                            <div>
                                <strong>${tag.stats.engagementRate}%</strong> engagement<br>
                                <strong>${tag.stats.trendingScore}/10</strong> trending score
                            </div>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 8px; font-size: 0.9em;">
                            💡 ${tag.recommendation}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Вирусный контент -->
        <div class="section">
            <h2>🔥 Топ вирусный контент</h2>
            <div class="viral-content">
                ${data.viralContent.map(content => `
                    <div class="viral-item">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong>${content.author}</strong>
                            <span style="background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.8em;">
                                Viral Score: ${content.viralScore}/10
                            </span>
                        </div>
                        <p style="margin-bottom: 10px;">${content.description}</p>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px;">
                            <div><strong>${(content.views / 1000).toFixed(0)}K</strong><br><small>Просмотры</small></div>
                            <div><strong>${(content.likes / 1000).toFixed(1)}K</strong><br><small>Лайки</small></div>
                            <div><strong>${content.comments}</strong><br><small>Комментарии</small></div>
                            <div><strong>${content.engagementRate}%</strong><br><small>Engagement</small></div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            ${content.hashtags.map(tag => `<span style="background: #e9ecef; padding: 3px 8px; border-radius: 10px; font-size: 0.8em; margin-right: 5px;">${tag}</span>`).join('')}
                        </div>
                        <a href="${content.url}" target="_blank" style="color: #667eea; text-decoration: none;">
                            🔗 Открыть пост
                        </a>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Рекомендации -->
        <div class="section">
            <h2>💡 Рекомендации по стратегии</h2>
            <div class="recommendations">
                ${data.recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3>${rec.title}</h3>
                            <span style="background: ${rec.priority === 'high' ? '#dc3545' : rec.priority === 'medium' ? '#ffc107' : '#28a745'}; color: white; padding: 5px 10px; border-radius: 15px; font-size: 0.8em;">
                                ${rec.priority === 'high' ? 'Высокий' : rec.priority === 'medium' ? 'Средний' : 'Низкий'} приоритет
                            </span>
                        </div>
                        <p style="margin-bottom: 10px;">${rec.description}</p>
                        <div style="background: white; padding: 10px; border-radius: 8px; font-size: 0.9em;">
                            <strong>Ожидаемый эффект:</strong> ${rec.impact}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        // Автообновление каждые 24 часа
        setTimeout(() => {
            window.location.reload();
        }, 24 * 60 * 60 * 1000);
        
        // Показать время до следующего обновления
        function updateCountdown() {
            const nextUpdate = new Date('${data.nextUpdate}');
            const now = new Date();
            const diff = nextUpdate - now;
            
            if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                document.querySelector('.auto-refresh').innerHTML = 
                    \`🔄 Обновление через: \${hours}ч \${minutes}м\`;
            }
        }
        
        updateCountdown();
        setInterval(updateCountdown, 60000); // Обновляем каждую минуту
    </script>
</body>
</html>
  `);
});

// API endpoint для получения данных дашборда
app.get('/api/dashboard-data', (req, res) => {
  res.json(getDashboardData());
});

// Export для Vercel
module.exports = app;

// Локальный запуск
if (require.main === module) {
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`🎯 Client Dashboard running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
  });
}
