import { RapidApiService } from '../services/rapidApiService';
import { neonDB } from '../db/neonDB';
import { projectsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

interface ParseOptions {
  projectId?: number;
  username?: string;
  usernames?: string[];
  dryRun?: boolean;
}

export class SimilarUsersParser {
  private rapidApiService: RapidApiService;
  private db: typeof neonDB;

  constructor() {
    this.rapidApiService = new RapidApiService();
    this.db = neonDB;
  }

  /**
   * Основной метод для парсинга похожих пользователей
   */
  async parseSimilarUsers(options: ParseOptions = {}) {
    const {
      projectId = 1, // По умолчанию проект Coco Age
      username,
      usernames = [],
      dryRun = false
    } = options;

    console.log('🚀 Запуск парсинга похожих пользователей Instagram');
    console.log(`📊 Проект ID: ${projectId}`);
    console.log(`🔍 Режим: ${dryRun ? 'Тестовый (dry run)' : 'Продакшн'}`);

    // Проверяем существование проекта
    const project = await this.db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);

    if (project.length === 0) {
      throw new Error(`Проект с ID ${projectId} не найден`);
    }

    console.log(`✅ Проект найден: ${project[0].name}`);

    // Определяем список пользователей для парсинга
    let targetUsernames: string[] = [];

    if (username) {
      targetUsernames = [username];
    } else if (usernames.length > 0) {
      targetUsernames = usernames;
    } else {
      // Если не указаны пользователи, используем список по умолчанию
      targetUsernames = [
        'sooyaaa__',
        'clinica_joelle_official',
        'graise.aesthetics',
        'milena_aesthetic_clinic'
      ];
    }

    console.log(`📝 Пользователи для парсинга: ${targetUsernames.join(', ')}`);

    const results = {
      totalProcessed: 0,
      totalUsersFound: 0,
      totalUsersSaved: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Обрабатываем каждого пользователя
    for (const targetUsername of targetUsernames) {
      try {
        console.log(`\n🔍 Обработка пользователя: ${targetUsername}`);

        if (dryRun) {
          console.log(`🧪 DRY RUN: Симуляция запроса для ${targetUsername}`);
          results.totalProcessed++;
          results.details.push({
            username: targetUsername,
            status: 'dry_run',
            usersFound: 0,
            usersSaved: 0
          });
          continue;
        }

        const similarUsers = await this.rapidApiService.getSimilarUsers(targetUsername, projectId);

        results.totalProcessed++;
        results.totalUsersFound += similarUsers.length;

        // Получаем статистику сохраненных пользователей
        const stats = await this.rapidApiService.getApiStats(projectId, 1);
        const usersSaved = stats?.total_users_saved || 0;

        results.totalUsersSaved += usersSaved;

        results.details.push({
          username: targetUsername,
          status: 'success',
          usersFound: similarUsers.length,
          usersSaved: usersSaved,
          users: similarUsers.slice(0, 5) // Первые 5 пользователей для примера
        });

        console.log(`✅ ${targetUsername}: найдено ${similarUsers.length} пользователей, сохранено ${usersSaved}`);

        // Небольшая пауза между запросами
        await this.delay(2000);

      } catch (error: any) {
        const errorMessage = `Ошибка при обработке ${targetUsername}: ${error.message}`;
        console.error(`❌ ${errorMessage}`);
        results.errors.push(errorMessage);
        results.details.push({
          username: targetUsername,
          status: 'error',
          error: error.message
        });
      }
    }

    // Выводим итоговую статистику
    this.printSummary(results);

    return results;
  }

  /**
   * Выводит итоговую статистику
   */
  private printSummary(results: any) {
    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(50));
    console.log(`📝 Обработано пользователей: ${results.totalProcessed}`);
    console.log(`🔍 Найдено похожих пользователей: ${results.totalUsersFound}`);
    console.log(`💾 Сохранено в базу данных: ${results.totalUsersSaved}`);
    console.log(`❌ Ошибок: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ОШИБКИ:');
      results.errors.forEach((error: string, index: number) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n📋 ДЕТАЛИ ПО ПОЛЬЗОВАТЕЛЯМ:');
    results.details.forEach((detail: any) => {
      const status = detail.status === 'success' ? '✅' : detail.status === 'error' ? '❌' : '🧪';
      console.log(`${status} ${detail.username}: ${detail.status}`);
      if (detail.usersFound !== undefined) {
        console.log(`   Найдено: ${detail.usersFound}, Сохранено: ${detail.usersSaved}`);
      }
      if (detail.error) {
        console.log(`   Ошибка: ${detail.error}`);
      }
    });
  }

  /**
   * Задержка между запросами
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI интерфейс
async function main() {
  const args = process.argv.slice(2);
  const options: ParseOptions = {};

  // Парсим аргументы командной строки
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--project-id':
        options.projectId = parseInt(args[++i]);
        break;
      case '--username':
        options.username = args[++i];
        break;
      case '--usernames':
        options.usernames = args[++i].split(',').map(u => u.trim());
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        console.log(`
Использование: tsx src/scripts/parse-similar-users.ts [опции]

Опции:
  --project-id <id>     ID проекта (по умолчанию: 1)
  --username <name>     Один пользователь для парсинга
  --usernames <list>    Список пользователей через запятую
  --dry-run            Тестовый режим без сохранения в БД
  --help               Показать эту справку

Примеры:
  tsx src/scripts/parse-similar-users.ts --username sooyaaa__
  tsx src/scripts/parse-similar-users.ts --usernames "user1,user2,user3"
  tsx src/scripts/parse-similar-users.ts --project-id 2 --dry-run
        `);
        return;
    }
  }

  try {
    const parser = new SimilarUsersParser();
    await parser.parseSimilarUsers(options);
  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем только если файл вызван напрямую
if (require.main === module) {
  main();
} 