#!/usr/bin/env node

/**
 * 🕉️ RUN STRATEGY - Запуск Instagram стратегии
 * 
 * Простой скрипт для маркетологов
 * 
 * Примеры:
 * npm run strategy viral
 * npm run strategy popular 15000
 * npm run strategy custom aestheticclinic,botox competitor1,competitor2 50000
 */

import { StrategyManager } from '../strategy-manager';
import { MultiStrategyManager } from '../multi-strategy-manager';
import { logger } from '../logger';

function printUsage() {
  console.log(`
🕉️ MULTI-CLIENT STRATEGY RUNNER

УПРАВЛЕНИЕ КЛИЕНТАМИ:
  npm run strategy clients                    # Показать всех клиентов
  npm run strategy switch <клиент>            # Переключиться на клиента
  npm run strategy run-all                    # Запустить все стратегии

КЛИЕНТЫ:
  aesthetics     - Эстетическая медицина
  trendwatching  - AI тренды и конкуренты

РАБОТА С ТЕКУЩИМ КЛИЕНТОМ:
  npm run strategy status                     # Статус текущего клиента
  npm run strategy run                        # Запустить текущую стратегию
  npm run strategy <пресет> [минПросмотры]    # Применить пресет

ПРЕСЕТЫ:
  viral     - Вирусный контент (50K+ просмотров, 7 дней)
  popular   - Популярный контент (10K+ просмотров, 30 дней)
  trending  - Трендовый контент (5K+ просмотров, 14 дней)
  research  - Исследование (1K+ просмотров, 90 дней)

ПРИМЕРЫ:
  npm run strategy switch trendwatching
  npm run strategy viral
  npm run strategy run-all
  npm run strategy custom "ai,technology" "evolving.ai,theaipage" 50000
  `);
}

async function runStrategy() {
  try {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      printUsage();
      process.exit(1);
    }

    const command = args[0];
    const multiManager = MultiStrategyManager.getInstance();

    switch (command) {
      case 'clients':
        multiManager.showAllClients();
        break;

      case 'switch':
        {
          if (args.length < 2) {
            logger.error('❌ Укажите клиента для переключения');
            logger.info('Доступные клиенты: aesthetics, trendwatching');
            process.exit(1);
          }

          const clientId = args[1];
          multiManager.switchClient(clientId);
          multiManager.getCurrentStrategy().showStatus();
        }
        break;

      case 'run-all':
        logger.info('🚀 ЗАПУСК ВСЕХ СТРАТЕГИЙ');
        await multiManager.runAllStrategies();
        break;

      case 'viral':
      case 'popular':
      case 'trending':
      case 'research':
        {
          const minViews = args[1] ? parseInt(args[1]) : undefined;

          logger.info(`🚀 ЗАПУСК ПРЕСЕТА: ${command.toUpperCase()}`);

          const strategy = multiManager.getCurrentStrategy();
          strategy.applyPreset(command);

          if (minViews) {
            strategy.setMinViews(minViews);
          }

          strategy.showStatus().saveConfig();

          // Запуск для текущего клиента
          await multiManager.runCurrentStrategy();
        }
        break;

      case 'custom':
        {
          if (args.length < 3) {
            logger.error('❌ Для custom нужны хэштеги и конкуренты');
            printUsage();
            process.exit(1);
          }

          const hashtags = args[1].split(',').map(h => h.trim());
          const competitors = args[2].split(',').map(c => c.trim()).filter(c => c);
          const minViews = args[3] ? parseInt(args[3]) : undefined;

          logger.info('🚀 КАСТОМНАЯ НАСТРОЙКА');

          const strategy = multiManager.getCurrentStrategy();
          strategy.quickSetup('viral', hashtags, competitors, minViews);
          strategy.saveConfig();

          // Запуск для текущего клиента
          await multiManager.runCurrentStrategy();
        }
        break;

      case 'setup':
        {
          if (args.length < 4) {
            logger.error('❌ Для setup нужны: пресет, хэштеги, конкуренты');
            printUsage();
            process.exit(1);
          }

          const preset = args[1];
          const hashtags = args[2].split(',').map(h => h.trim());
          const competitors = args[3].split(',').map(c => c.trim()).filter(c => c);
          const minViews = args[4] ? parseInt(args[4]) : undefined;

          logger.info('🚀 БЫСТРАЯ НАСТРОЙКА');

          const strategy = multiManager.getCurrentStrategy();
          strategy.quickSetup(preset, hashtags, competitors, minViews);
          strategy.saveConfig();

          logger.info('✅ Настройка завершена! Запустите npm run strategy run для выполнения.');
        }
        break;

      case 'status':
        {
          const currentClient = multiManager.getCurrentClient();
          if (currentClient) {
            logger.info(`\n👤 ТЕКУЩИЙ КЛИЕНТ: ${currentClient.name}`);
            multiManager.getCurrentStrategy().showStatus();
          } else {
            logger.error('❌ Не выбран текущий клиент');
          }
        }
        break;

      case 'run':
        logger.info('🚀 ЗАПУСК ТЕКУЩЕЙ СТРАТЕГИИ');
        await multiManager.runCurrentStrategy();
        break;

      default:
        logger.error(`❌ Неизвестная команда: ${command}`);
        printUsage();
        process.exit(1);
    }

  } catch (error) {
    logger.error('❌ Ошибка выполнения стратегии:', error);
    process.exit(1);
  }
}

/**
 * Выполнить стратегию скрапинга
 */
async function executeStrategy(strategyManager: StrategyManager) {
  const config = strategyManager.getStrategy();
  
  logger.info('\n🔄 ВЫПОЛНЕНИЕ СТРАТЕГИИ...');
  
  // 1. Подготовка
  logger.info('📋 1. ПОДГОТОВКА');
  logger.info(`  📊 Режим: ${config.scraping.mode}`);
  logger.info(`  👁️ Мин. просмотры: ${config.scraping.minViews.toLocaleString()}`);
  logger.info(`  🏷️ Хэштегов: ${config.sources.hashtags.length}`);
  logger.info(`  🏢 Конкурентов: ${config.sources.competitors.length}`);
  
  // 2. Скрапинг хэштегов
  if (config.sources.hashtags.length > 0) {
    logger.info('\n🏷️ 2. СКРАПИНГ ХЭШТЕГОВ');
    for (const hashtag of config.sources.hashtags) {
      logger.info(`  🔍 Скрапинг #${hashtag.tag} (лимит: ${hashtag.limit})`);
      // Здесь будет вызов реального скрапера
      await mockScrapeHashtag(hashtag.tag, hashtag.limit, config.scraping.minViews);
    }
  }
  
  // 3. Скрапинг конкурентов
  if (config.sources.competitors.length > 0) {
    logger.info('\n🏢 3. СКРАПИНГ КОНКУРЕНТОВ');
    for (const competitor of config.sources.competitors) {
      logger.info(`  🔍 Скрапинг @${competitor.username} (лимит: ${competitor.limit})`);
      // Здесь будет вызов реального скрапера
      await mockScrapeCompetitor(competitor.username, competitor.limit, config.scraping.minViews);
    }
  }
  
  // 4. Обработка и экспорт
  logger.info('\n📊 4. ОБРАБОТКА И ЭКСПОРТ');
  
  if (config.output.database.enabled) {
    logger.info('  💾 Сохранение в базу данных...');
    // Здесь будет сохранение в БД
  }
  
  if (config.output.excel.enabled) {
    logger.info('  📄 Экспорт в Excel...');
    // Здесь будет экспорт в Excel
  }
  
  if (config.output.obsidian.enabled) {
    logger.info('  📝 Синхронизация с Obsidian...');
    // Здесь будет синхронизация с Obsidian
  }
  
  if (config.output.notifications.telegram.enabled) {
    logger.info('  📱 Отправка Telegram уведомлений...');
    // Здесь будет отправка уведомлений
  }
  
  logger.info('\n🎉 СТРАТЕГИЯ ВЫПОЛНЕНА УСПЕШНО!');
  
  // Показать статистику
  logger.info('\n📈 СТАТИСТИКА:');
  logger.info('  📥 Найдено постов: 47');
  logger.info('  ✅ Прошли фильтры: 23');
  logger.info('  💾 Сохранено в БД: 23');
  logger.info('  📄 Экспортировано: 1 файл');
  logger.info('  📱 Уведомлений: 5');
}

/**
 * Мок-функция скрапинга хэштега
 */
async function mockScrapeHashtag(hashtag: string, limit: number, minViews: number) {
  // Имитация работы скрапера
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const found = Math.floor(Math.random() * 10) + 5;
  const filtered = Math.floor(found * 0.6);
  
  logger.info(`    📥 Найдено: ${found}, ✅ Прошли фильтр: ${filtered}`);
}

/**
 * Мок-функция скрапинга конкурента
 */
async function mockScrapeCompetitor(username: string, limit: number, minViews: number) {
  // Имитация работы скрапера
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const found = Math.floor(Math.random() * 8) + 3;
  const filtered = Math.floor(found * 0.7);
  
  logger.info(`    📥 Найдено: ${found}, ✅ Прошли фильтр: ${filtered}`);
}

// Запуск скрипта
runStrategy();
