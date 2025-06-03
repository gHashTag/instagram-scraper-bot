#!/usr/bin/env node

/**
 * 🕉️ CLEAN AND SCRAPE FRESH - Очистка базы и получение свежих данных
 * 
 * Скрипт для:
 * 1. Очистки базы от старых данных (2024 год)
 * 2. Удаления Lips For Kis из конкурентов
 * 3. Скрапинга свежих данных за последние 30 дней с 50K+ просмотров
 */

import { config } from 'dotenv';
import { initializeDBConnection, getDB, NeonDB } from '../db/neonDB';
import { sql, lt, eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { logger } from '../logger';
import { scrapeInstagramReels } from '../agent/instagram-scraper';

// Загружаем переменные окружения
config();

async function cleanDatabase(db: NeonDB): Promise<void> {
  logger.info('🧹 ОЧИСТКА БАЗЫ ДАННЫХ...');

  try {
    // 1. Удаляем все данные за 2024 год
    const year2025Start = new Date('2025-01-01');
    const deletedOldData = await db
      .delete(schema.reelsTable)
      .where(lt(schema.reelsTable.created_at, year2025Start));

    logger.info(`✅ Удалены старые данные (до 2025 года)`);

    // 2. Удаляем Lips For Kis из конкурентов
    const deletedLipsForKis = await db
      .delete(schema.competitorsTable)
      .where(sql`LOWER(username) LIKE '%lips%for%kis%' OR LOWER(username) LIKE '%lipsfor%kis%'`);

    logger.info(`✅ Удален конкурент Lips For Kis`);

    // 3. Показываем статистику
    const reelsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reelsTable);

    const competitorsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.competitorsTable);

    logger.info(`📊 Осталось в базе:`);
    logger.info(`  📥 Reels: ${reelsCount[0].count}`);
    logger.info(`  🏢 Конкурентов: ${competitorsCount[0].count}`);

  } catch (error) {
    logger.error('❌ Ошибка очистки базы:', error);
    throw error;
  }
}

async function scrapeViralContent(db: NeonDB): Promise<void> {
  logger.info('🔥 СКРАПИНГ ВИРУСНОГО КОНТЕНТА (50K+ просмотров, 30 дней)...');

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN не найден в переменных окружения');
  }

  try {
    // Получаем всех активных конкурентов
    const activeCompetitors = await db
      .select()
      .from(schema.competitorsTable)
      .where(eq(schema.competitorsTable.is_active, true));

    logger.info(`🏢 Найдено активных конкурентов: ${activeCompetitors.length}`);

    let totalScraped = 0;

    // Скрапим каждого конкурента
    for (const competitor of activeCompetitors) {
      logger.info(`🔍 Скрапинг конкурента: ${competitor.username}`);

      try {
        const reelsAdded = await scrapeInstagramReels(
          db,
          competitor.project_id,
          "competitor",
          competitor.id,
          competitor.profile_url,
          {
            limit: 100, // Больше лимит для получения достаточного количества данных
            apifyToken: APIFY_TOKEN,
            minViews: 50000, // Только вирусный контент
            maxAgeDays: 30   // Только за последний месяц
          }
        );

        totalScraped += reelsAdded;
        logger.info(`✅ Добавлено ${reelsAdded} вирусных Reels для ${competitor.username}`);

        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        logger.error(`❌ Ошибка скрапинга ${competitor.username}:`, error);
        // Продолжаем с следующим конкурентом
      }
    }

    logger.info(`🎉 СКРАПИНГ ЗАВЕРШЕН! Всего добавлено: ${totalScraped} вирусных Reels`);

  } catch (error) {
    logger.error('❌ Ошибка скрапинга:', error);
    throw error;
  }
}

async function generateStatistics(db: NeonDB): Promise<void> {
  logger.info('📊 ГЕНЕРАЦИЯ СТАТИСТИКИ...');

  try {
    // Статистика по просмотрам
    const viewsStats = await db
      .select({
        total: sql<number>`count(*)`,
        viral50k: sql<number>`count(*) filter (where views_count >= 50000)`,
        viral100k: sql<number>`count(*) filter (where views_count >= 100000)`,
        avgViews: sql<number>`avg(views_count)`,
        maxViews: sql<number>`max(views_count)`
      })
      .from(schema.reelsTable);

    const stats = viewsStats[0];

    logger.info('\n📈 СТАТИСТИКА ПРОСМОТРОВ:');
    logger.info(`  📥 Всего Reels: ${stats.total}`);
    logger.info(`  🔥 50K+ просмотров: ${stats.viral50k} (${Math.round((stats.viral50k / stats.total) * 100)}%)`);
    logger.info(`  🚀 100K+ просмотров: ${stats.viral100k} (${Math.round((stats.viral100k / stats.total) * 100)}%)`);
    logger.info(`  📊 Средние просмотры: ${Math.round(stats.avgViews).toLocaleString()}`);
    logger.info(`  🏆 Максимальные просмотры: ${stats.maxViews.toLocaleString()}`);

    // Статистика по конкурентам
    const competitorStats = await db
      .select({
        username: schema.competitorsTable.username,
        reelsCount: sql<number>`count(${schema.reelsTable.id})`,
        avgViews: sql<number>`avg(${schema.reelsTable.views_count})`,
        maxViews: sql<number>`max(${schema.reelsTable.views_count})`
      })
      .from(schema.competitorsTable)
      .leftJoin(schema.reelsTable, eq(schema.competitorsTable.id, schema.reelsTable.competitor_id))
      .groupBy(schema.competitorsTable.id, schema.competitorsTable.username)
      .having(sql`count(${schema.reelsTable.id}) > 0`)
      .orderBy(sql`avg(${schema.reelsTable.views_count}) desc`);

    logger.info('\n🏢 СТАТИСТИКА ПО КОНКУРЕНТАМ:');
    competitorStats.forEach(comp => {
      logger.info(`  @${comp.username}: ${comp.reelsCount} Reels, ${Math.round(comp.avgViews || 0).toLocaleString()} средних просмотров`);
    });

    // Проверяем качество данных
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReels = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.reelsTable)
      .where(sql`created_at >= ${thirtyDaysAgo}`);

    const recentCount = recentReels[0].count;
    logger.info(`\n✅ Свежих Reels (30 дней): ${recentCount}`);

    if (recentCount < 50) {
      logger.warn('⚠️ МАЛО ДАННЫХ! Рекомендуется запустить дополнительный скрапинг');
    }

  } catch (error) {
    logger.error('❌ Ошибка генерации статистики:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    logger.info('🕉️ ЗАПУСК ОЧИСТКИ И ОБНОВЛЕНИЯ ДАННЫХ');

    // Инициализируем подключение к базе
    await initializeDBConnection();
    const db = getDB();

    // 1. Очищаем базу от мусора
    await cleanDatabase(db);

    // 2. Скрапим свежие вирусные данные
    await scrapeViralContent(db);

    // 3. Генерируем статистику
    await generateStatistics(db);

    logger.info('\n🎉 ВСЕ ГОТОВО! База очищена и обновлена свежими данными');
    logger.info('📊 Теперь можно запускать генерацию отчетов с реальными данными');

  } catch (error) {
    logger.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
