/**
 * 🔧 Диагностический скрипт для скрапера Instagram
 * 
 * Диагностирует проблемы и запускает тестовый скрапинг на небольшом количестве данных
 * 
 * Использование:
 * npx tsx src/scripts/diagnose-and-fix-scraper.ts [projectId]
 */

import {
  initializeDBConnection,
  getCompetitorAccountsByProjectId,
  getTrackingHashtagsByProjectId,
} from "../db/neonDB";
import { scrapeInstagramReels } from "../agent/instagram-scraper";
import { logger } from "../logger";
import dotenv from "dotenv";

dotenv.config();

// Получаем аргументы
const args = process.argv.slice(2);
const projectId = args[0] ? parseInt(args[0], 10) : 1;

interface DiagnosticResult {
  component: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

class ScraperDiagnostic {
  private db: any;
  private results: DiagnosticResult[] = [];

  constructor() {}

  private addResult(component: string, status: 'ok' | 'warning' | 'error', message: string, details?: any) {
    this.results.push({ component, status, message, details });
    const emoji = status === 'ok' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`${emoji} ${component}: ${message}`);
    if (details) {
      console.log(`   Детали:`, details);
    }
  }

  async diagnose(): Promise<void> {
    console.log('🔧 ДИАГНОСТИКА СКРАПЕРА INSTAGRAM');
    console.log('================================\n');

    try {
      // 1. Проверка переменных окружения
      await this.checkEnvironment();

      // 2. Проверка подключения к базе данных
      await this.checkDatabase();

      // 3. Проверка конфигурации проекта
      await this.checkProjectConfiguration();

      // 4. Проверка Apify API
      await this.checkApifyAPI();

      // 5. Тестовый скрапинг
      await this.runTestScraping();

      // 6. Итоговый отчет
      this.generateReport();

    } catch (error) {
      this.addResult('Диагностика', 'error', `Критическая ошибка: ${error.message}`);
    }
  }

  private async checkEnvironment(): Promise<void> {
    console.log('🔍 1. ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ');
    console.log('===================================');

    // DATABASE_URL
    if (process.env.DATABASE_URL) {
      this.addResult('DATABASE_URL', 'ok', 'Найден');
    } else {
      this.addResult('DATABASE_URL', 'error', 'Не найден в .env файле');
    }

    // APIFY_TOKEN
    if (process.env.APIFY_TOKEN) {
      if (process.env.APIFY_TOKEN.startsWith('apify_api_')) {
        this.addResult('APIFY_TOKEN', 'ok', `Найден (${process.env.APIFY_TOKEN.substring(0, 20)}...)`);
      } else {
        this.addResult('APIFY_TOKEN', 'error', 'Неверный формат токена');
      }
    } else {
      this.addResult('APIFY_TOKEN', 'error', 'Не найден в .env файле');
    }

    // OPENAI_API_KEY (опционально)
    if (process.env.OPENAI_API_KEY) {
      this.addResult('OPENAI_API_KEY', 'ok', 'Найден (для транскрипций)');
    } else {
      this.addResult('OPENAI_API_KEY', 'warning', 'Не найден (транскрипции недоступны)');
    }

    console.log('');
  }

  private async checkDatabase(): Promise<void> {
    console.log('🗄️ 2. ПРОВЕРКА БАЗЫ ДАННЫХ');
    console.log('==========================');

    try {
      this.db = await initializeDBConnection();
      this.addResult('Подключение к БД', 'ok', 'Успешно');

      // Проверяем таблицы
      const tables = ['projects', 'competitors', 'hashtags', 'reels'];
      for (const table of tables) {
        try {
          const result = await this.db.executeQuery(`SELECT COUNT(*) FROM ${table}`);
          const count = result.rows[0].count;
          this.addResult(`Таблица ${table}`, 'ok', `${count} записей`);
        } catch (error) {
          this.addResult(`Таблица ${table}`, 'error', `Ошибка: ${error.message}`);
        }
      }

    } catch (error) {
      this.addResult('Подключение к БД', 'error', `Ошибка: ${error.message}`);
    }

    console.log('');
  }

  private async checkProjectConfiguration(): Promise<void> {
    console.log('📁 3. ПРОВЕРКА КОНФИГУРАЦИИ ПРОЕКТА');
    console.log('===================================');

    if (!this.db) {
      this.addResult('Конфигурация проекта', 'error', 'Нет подключения к БД');
      return;
    }

    try {
      // Проверяем проект
      const projectResult = await this.db.executeQuery(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        this.addResult('Проект', 'error', `Проект с ID ${projectId} не найден`);
        return;
      }

      const project = projectResult.rows[0];
      this.addResult('Проект', 'ok', `"${project.name}" (ID: ${projectId})`);

      // Проверяем конкурентов
      const competitors = await getCompetitorAccountsByProjectId(this.db, projectId);
      if (competitors.length === 0) {
        this.addResult('Конкуренты', 'warning', 'Нет конкурентов в проекте');
      } else {
        const activeCompetitors = competitors.filter(c => c.is_active);
        this.addResult('Конкуренты', 'ok', `${activeCompetitors.length} активных из ${competitors.length}`);
        
        // Показываем первых 3
        activeCompetitors.slice(0, 3).forEach(comp => {
          console.log(`   - @${comp.username} (ID: ${comp.id})`);
        });
        if (activeCompetitors.length > 3) {
          console.log(`   ... и еще ${activeCompetitors.length - 3}`);
        }
      }

      // Проверяем хэштеги
      const hashtags = await getTrackingHashtagsByProjectId(this.db, projectId);
      if (hashtags.length === 0) {
        this.addResult('Хэштеги', 'warning', 'Нет хэштегов в проекте');
      } else {
        const activeHashtags = hashtags.filter(h => h.is_active);
        this.addResult('Хэштеги', 'ok', `${activeHashtags.length} активных из ${hashtags.length}`);
        
        // Показываем первых 5
        activeHashtags.slice(0, 5).forEach(tag => {
          console.log(`   - #${tag.tag_name} (ID: ${tag.id})`);
        });
        if (activeHashtags.length > 5) {
          console.log(`   ... и еще ${activeHashtags.length - 5}`);
        }
      }

    } catch (error) {
      this.addResult('Конфигурация проекта', 'error', `Ошибка: ${error.message}`);
    }

    console.log('');
  }

  private async checkApifyAPI(): Promise<void> {
    console.log('🕷️ 4. ПРОВЕРКА APIFY API');
    console.log('========================');

    if (!process.env.APIFY_TOKEN) {
      this.addResult('Apify API', 'error', 'Токен не найден');
      return;
    }

    try {
      const { ApifyClient } = await import('apify-client');
      const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

      // Проверяем доступность API
      const user = await client.user().get();
      this.addResult('Apify API', 'ok', `Подключен как ${user.username}`);

      // Проверяем доступные акторы
      const actors = ['apify/instagram-scraper', 'apify/instagram-reel-scraper'];
      for (const actorId of actors) {
        try {
          const actor = await client.actor(actorId).get();
          this.addResult(`Актор ${actorId}`, 'ok', `Доступен (v${actor.taggedBuilds?.latest?.buildNumber || 'unknown'})`);
        } catch (error) {
          this.addResult(`Актор ${actorId}`, 'warning', `Недоступен: ${error.message}`);
        }
      }

    } catch (error) {
      this.addResult('Apify API', 'error', `Ошибка подключения: ${error.message}`);
    }

    console.log('');
  }

  private async runTestScraping(): Promise<void> {
    console.log('🧪 5. ТЕСТОВЫЙ СКРАПИНГ');
    console.log('=======================');

    if (!this.db || !process.env.APIFY_TOKEN) {
      this.addResult('Тестовый скрапинг', 'error', 'Нет подключения к БД или токена Apify');
      return;
    }

    try {
      // Получаем один хэштег для теста
      const hashtags = await getTrackingHashtagsByProjectId(this.db, projectId);
      const activeHashtags = hashtags.filter(h => h.is_active);

      if (activeHashtags.length === 0) {
        this.addResult('Тестовый скрапинг', 'warning', 'Нет активных хэштегов для теста');
        return;
      }

      const testHashtag = activeHashtags[0];
      console.log(`🎯 Тестируем скрапинг хэштега: #${testHashtag.tag_name}`);

      // Запускаем тестовый скрапинг с минимальными параметрами
      const startTime = Date.now();
      const reelsAdded = await scrapeInstagramReels(
        this.db,
        projectId,
        "hashtag",
        testHashtag.id,
        `#${testHashtag.tag_name}`,
        {
          limit: 5, // Только 5 reels для теста
          apifyToken: process.env.APIFY_TOKEN,
          minViews: 10000, // Низкий порог для теста
          maxAgeDays: 30, // 30 дней
        }
      );

      const duration = Math.round((Date.now() - startTime) / 1000);

      if (reelsAdded > 0) {
        this.addResult('Тестовый скрапинг', 'ok', `Добавлено ${reelsAdded} reels за ${duration}с`);
        
        // Проверяем качество данных
        const recentReels = await this.db.executeQuery(
          `SELECT author_username, views_count, published_at, source_type, source_identifier 
           FROM reels 
           WHERE source_type = 'hashtag' AND source_identifier = $1 
           ORDER BY created_at DESC 
           LIMIT 3`,
          [testHashtag.id.toString()]
        );

        console.log('   Примеры добавленных reels:');
        recentReels.rows.forEach((reel, index) => {
          const publishedDate = reel.published_at ? new Date(reel.published_at).toLocaleDateString() : 'Неизвестно';
          console.log(`   ${index + 1}. @${reel.author_username} - ${reel.views_count?.toLocaleString() || 'N/A'} просмотров (${publishedDate})`);
        });

      } else {
        this.addResult('Тестовый скрапинг', 'warning', `Не добавлено новых reels за ${duration}с (возможно все уже есть в БД)`);
      }

    } catch (error) {
      this.addResult('Тестовый скрапинг', 'error', `Ошибка: ${error.message}`);
    }

    console.log('');
  }

  private generateReport(): void {
    console.log('📊 6. ИТОГОВЫЙ ОТЧЕТ');
    console.log('====================');

    const okCount = this.results.filter(r => r.status === 'ok').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    console.log(`✅ Успешно: ${okCount}`);
    console.log(`⚠️ Предупреждения: ${warningCount}`);
    console.log(`❌ Ошибки: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n🎉 ДИАГНОСТИКА ПРОЙДЕНА УСПЕШНО!');
      console.log('Скрапер готов к работе. Можно запускать полный скрапинг.');
      
      console.log('\n🚀 Рекомендуемые команды для полного скрапинга:');
      console.log(`npx tsx src/scripts/bulk-scrape-hashtags.ts ${projectId} $APIFY_TOKEN 14 50000 100`);
      console.log(`npx tsx src/scripts/bulk-scrape-competitors.ts ${projectId} $APIFY_TOKEN 1 100`);
      
    } else {
      console.log('\n🔧 ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ ОШИБОК');
      console.log('Исправьте найденные проблемы перед запуском полного скрапинга.');
      
      const criticalErrors = this.results.filter(r => r.status === 'error');
      console.log('\n❌ Критические ошибки:');
      criticalErrors.forEach(error => {
        console.log(`   - ${error.component}: ${error.message}`);
      });
    }

    console.log('\n📋 Полный отчет сохранен в переменной results');
  }

  getResults(): DiagnosticResult[] {
    return this.results;
  }
}

// Запуск диагностики
async function main() {
  const diagnostic = new ScraperDiagnostic();
  await diagnostic.diagnose();
  
  // Возвращаем результаты для возможного использования
  return diagnostic.getResults();
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Критическая ошибка диагностики:', error);
    process.exit(1);
  });
}

export { ScraperDiagnostic, main as runDiagnostic };
