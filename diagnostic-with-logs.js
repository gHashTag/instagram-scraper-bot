/**
 * 🔍 Диагностический скрипт с подробными логами
 */

require('dotenv').config();

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, data = null) {
  const timestamp = new Date().toLocaleTimeString();
  let color = colors.reset;
  let emoji = '';
  
  switch(level) {
    case 'info': color = colors.blue; emoji = 'ℹ️'; break;
    case 'success': color = colors.green; emoji = '✅'; break;
    case 'warning': color = colors.yellow; emoji = '⚠️'; break;
    case 'error': color = colors.red; emoji = '❌'; break;
    case 'debug': color = colors.cyan; emoji = '🔍'; break;
  }
  
  console.log(`${color}[${timestamp}] ${emoji} ${message}${colors.reset}`);
  if (data) {
    console.log(`${colors.cyan}   Data:${colors.reset}`, data);
  }
}

async function runDiagnostic() {
  console.log(`${colors.bright}🚀 ДИАГНОСТИКА INSTAGRAM SCRAPER${colors.reset}`);
  console.log('='.repeat(50));
  
  log('info', 'Начинаем диагностику...');

  // 1. Проверка переменных окружения
  log('info', 'Шаг 1: Проверка переменных окружения');
  
  const requiredEnvs = ['DATABASE_URL', 'APIFY_TOKEN', 'OPENAI_API_KEY'];
  const envStatus = {};
  
  requiredEnvs.forEach(env => {
    if (process.env[env]) {
      envStatus[env] = '✅ Найден';
      log('success', `${env}: Найден`);
    } else {
      envStatus[env] = '❌ Отсутствует';
      log('error', `${env}: Отсутствует`);
    }
  });

  if (!process.env.DATABASE_URL) {
    log('error', 'DATABASE_URL отсутствует. Прерываем диагностику.');
    return;
  }

  // 2. Подключение к базе данных
  log('info', 'Шаг 2: Подключение к базе данных');
  
  let sql;
  try {
    const { neon } = require('@neondatabase/serverless');
    sql = neon(process.env.DATABASE_URL);
    log('success', 'Подключение к Neon Database установлено');
  } catch (error) {
    log('error', 'Ошибка подключения к базе данных', error.message);
    return;
  }

  // 3. Проверка таблиц
  log('info', 'Шаг 3: Проверка структуры базы данных');
  
  const tables = ['projects', 'competitors', 'hashtags', 'reels'];
  const tableStatus = {};
  
  for (const table of tables) {
    try {
      const result = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
      const count = result[0].count;
      tableStatus[table] = count;
      log('success', `Таблица ${table}: ${count} записей`);
    } catch (error) {
      tableStatus[table] = 'ERROR';
      log('error', `Таблица ${table}: Ошибка`, error.message);
    }
  }

  // 4. Анализ данных проекта
  log('info', 'Шаг 4: Анализ данных проекта ID=1');
  
  try {
    // Общая статистика
    const totalReels = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1`;
    const viralReels = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1 AND views_count >= 50000`;
    const withTranscripts = await sql`SELECT COUNT(*) as count FROM reels WHERE project_id = 1 AND transcript IS NOT NULL AND transcript != ''`;
    
    const stats = {
      total: totalReels[0].count,
      viral: viralReels[0].count,
      transcripts: withTranscripts[0].count,
      viralPercent: totalReels[0].count > 0 ? Math.round((viralReels[0].count / totalReels[0].count) * 100) : 0
    };
    
    log('success', `Всего reels: ${stats.total}`);
    log('success', `Вирусных (50K+): ${stats.viral} (${stats.viralPercent}%)`);
    log('success', `С транскрипциями: ${stats.transcripts}`);

    // Анализ по источникам
    log('info', 'Анализ по источникам данных');
    const bySource = await sql`
      SELECT 
        source_type,
        COUNT(*) as count,
        MAX(views_count) as max_views,
        AVG(views_count) as avg_views
      FROM reels 
      WHERE project_id = 1
      GROUP BY source_type
      ORDER BY count DESC
    `;

    bySource.forEach(source => {
      const avgViews = Math.round(source.avg_views || 0);
      const maxViews = source.max_views || 0;
      log('info', `Источник ${source.source_type || 'NULL'}: ${source.count} reels`, {
        avgViews: avgViews.toLocaleString(),
        maxViews: maxViews.toLocaleString()
      });
    });

    // 5. Проверка конкурентов
    log('info', 'Шаг 5: Проверка конкурентов');
    
    const competitors = await sql`
      SELECT id, username, is_active, last_scraped_at 
      FROM competitors 
      WHERE project_id = 1
      ORDER BY id
    `;

    log('success', `Найдено конкурентов: ${competitors.length}`);

    for (const comp of competitors) {
      const competitorReels = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND source_type = 'competitor' 
        AND source_identifier = ${comp.id.toString()}
      `;

      const reelsByUsername = await sql`
        SELECT COUNT(*) as count, MAX(views_count) as max_views
        FROM reels 
        WHERE project_id = 1 
        AND author_username = ${comp.username}
      `;

      const lastScraped = comp.last_scraped_at ? 
        new Date(comp.last_scraped_at).toLocaleString() : 
        'Никогда';

      const status = competitorReels[0].count > 0 ? 'success' : 
                    reelsByUsername[0].count > 0 ? 'warning' : 'error';

      log(status, `@${comp.username} (ID: ${comp.id})`, {
        bySourceId: competitorReels[0].count,
        byUsername: reelsByUsername[0].count,
        lastScraped: lastScraped,
        active: comp.is_active
      });
    }

    // 6. Топ контент
    log('info', 'Шаг 6: Анализ топ контента');
    
    const topReels = await sql`
      SELECT 
        author_username,
        views_count,
        source_type,
        created_at
      FROM reels 
      WHERE project_id = 1 
      AND views_count > 100000
      ORDER BY views_count DESC 
      LIMIT 5
    `;

    topReels.forEach((reel, index) => {
      log('success', `Топ ${index + 1}: @${reel.author_username}`, {
        views: reel.views_count?.toLocaleString(),
        source: reel.source_type,
        date: new Date(reel.created_at).toLocaleDateString()
      });
    });

    // 7. Последняя активность
    log('info', 'Шаг 7: Последняя активность');
    
    const recentActivity = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM reels 
      WHERE project_id = 1 
      AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    `;

    if (recentActivity.length > 0) {
      log('success', 'Активность за последние 7 дней:');
      recentActivity.forEach(day => {
        log('info', `  ${day.date}: +${day.count} reels`);
      });
    } else {
      log('warning', 'Нет активности за последние 7 дней');
    }

    // 8. Проверка API доступности
    log('info', 'Шаг 8: Проверка внешних API');
    
    if (process.env.APIFY_TOKEN) {
      try {
        const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper?token=${process.env.APIFY_TOKEN}`);
        if (response.ok) {
          log('success', 'Apify API доступен');
        } else {
          log('error', `Apify API недоступен: ${response.status}`);
        }
      } catch (error) {
        log('error', 'Ошибка подключения к Apify API', error.message);
      }
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        });
        if (response.ok) {
          log('success', 'OpenAI API доступен');
        } else {
          log('error', `OpenAI API недоступен: ${response.status}`);
        }
      } catch (error) {
        log('error', 'Ошибка подключения к OpenAI API', error.message);
      }
    }

    // 9. Итоговая оценка
    log('info', 'Шаг 9: Итоговая оценка системы');
    
    const issues = [];
    const recommendations = [];

    // Проверяем критические проблемы
    if (stats.total === 0) {
      issues.push('Нет данных в базе');
      recommendations.push('Запустить скрапинг: npm run scrape-viral');
    }

    const competitorReelsCount = bySource.find(s => s.source_type === 'competitor')?.count || 0;
    if (competitorReelsCount === 0) {
      issues.push('Нет данных по конкурентам');
      recommendations.push('Запустить скрапинг конкурентов: npx tsx src/scripts/bulk-scrape-competitors.ts 1 $APIFY_TOKEN 1 20');
    }

    if (stats.viralPercent < 20) {
      issues.push(`Низкий процент вирусности: ${stats.viralPercent}%`);
      recommendations.push('Увеличить minViews в скрапинге или добавить больше источников');
    }

    if (stats.transcripts === 0) {
      issues.push('Нет транскрипций');
      recommendations.push('Запустить транскрипцию: npx tsx src/scripts/transcribe-reels-with-whisper.ts 1 50000 30 10');
    }

    // Выводим результаты
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.bright}📊 ИТОГОВЫЙ ОТЧЕТ${colors.reset}`);
    console.log('='.repeat(50));

    if (issues.length === 0) {
      log('success', 'Система работает отлично! Проблем не найдено.');
    } else {
      log('warning', `Найдено проблем: ${issues.length}`);
      issues.forEach((issue, index) => {
        log('error', `${index + 1}. ${issue}`);
      });
    }

    if (recommendations.length > 0) {
      log('info', 'Рекомендации:');
      recommendations.forEach((rec, index) => {
        log('info', `${index + 1}. ${rec}`);
      });
    }

    // Ключевые метрики
    console.log(`\n${colors.bright}🎯 КЛЮЧЕВЫЕ МЕТРИКИ:${colors.reset}`);
    console.log(`📊 Всего reels: ${colors.green}${stats.total}${colors.reset}`);
    console.log(`🔥 Вирусных: ${colors.green}${stats.viral} (${stats.viralPercent}%)${colors.reset}`);
    console.log(`🎤 С транскрипциями: ${colors.green}${stats.transcripts}${colors.reset}`);
    console.log(`🏢 Reels от конкурентов: ${colors.green}${competitorReelsCount}${colors.reset}`);
    console.log(`👥 Конкурентов настроено: ${colors.green}${competitors.length}${colors.reset}`);

  } catch (error) {
    log('error', 'Критическая ошибка при анализе данных', error.message);
  }

  log('success', 'Диагностика завершена!');
}

// Запуск
runDiagnostic().catch(error => {
  console.error(`${colors.red}💥 КРИТИЧЕСКАЯ ОШИБКА:${colors.reset}`, error);
  process.exit(1);
});
