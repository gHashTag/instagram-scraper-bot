#!/usr/bin/env node

/**
 * 🕉️ GENERATE REAL OBSIDIAN REPORTS - Генерация отчетов с реальными данными
 * 
 * Создает дашборды Obsidian с реальными данными из базы вместо фейков
 */

import { config } from 'dotenv';
import { initializeDBConnection, getDB, NeonDB } from '../db/neonDB';
import { sql, eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { logger } from '../logger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Загружаем переменные окружения
config();

interface ReelData {
  id: number;
  reel_url: string;
  author_username: string;
  description: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  published_at: Date;
  competitor_username?: string;
}

interface CompetitorStats {
  username: string;
  reelsCount: number;
  avgViews: number;
  maxViews: number;
  topReel: ReelData | null;
}

async function getRealDataFromDB(db: NeonDB): Promise<{
  totalReels: number;
  viralReels: number;
  competitors: CompetitorStats[];
  topReels: ReelData[];
}> {
  try {
    // Общая статистика
    const totalStats = await db
      .select({
        total: sql<number>`count(*)`,
        viral: sql<number>`count(*) filter (where views_count >= 50000)`
      })
      .from(schema.reelsTable);

    // Топ Reels (без JOIN пока, так как связь через source_identifier)
    const topReelsData = await db
      .select({
        id: schema.reelsTable.id,
        reel_url: schema.reelsTable.reel_url,
        author_username: schema.reelsTable.author_username,
        description: schema.reelsTable.description,
        views_count: schema.reelsTable.views_count,
        likes_count: schema.reelsTable.likes_count,
        comments_count: schema.reelsTable.comments_count,
        published_at: schema.reelsTable.published_at,
        source_type: schema.reelsTable.source_type,
        source_identifier: schema.reelsTable.source_identifier
      })
      .from(schema.reelsTable)
      .orderBy(desc(schema.reelsTable.views_count))
      .limit(20);

    // Статистика по конкурентам (упрощенная версия)
    const allCompetitors = await db
      .select()
      .from(schema.competitorsTable);

    const competitorStatsData = [];
    for (const competitor of allCompetitors) {
      const reelsStats = await db
        .select({
          count: sql<number>`count(*)`,
          avgViews: sql<number>`avg(views_count)`,
          maxViews: sql<number>`max(views_count)`
        })
        .from(schema.reelsTable)
        .where(sql`source_type = 'competitor' AND source_identifier = ${competitor.id.toString()}`);

      if (reelsStats[0].count > 0) {
        competitorStatsData.push({
          username: competitor.username,
          reelsCount: reelsStats[0].count,
          avgViews: reelsStats[0].avgViews || 0,
          maxViews: reelsStats[0].maxViews || 0
        });
      }
    }

    // Получаем топ Reel для каждого конкурента
    const competitors: CompetitorStats[] = [];
    for (const comp of competitorStatsData) {
      // Находим ID конкурента по username
      const competitor = allCompetitors.find(c => c.username === comp.username);
      if (!competitor) continue;

      const topReel = await db
        .select({
          id: schema.reelsTable.id,
          reel_url: schema.reelsTable.reel_url,
          author_username: schema.reelsTable.author_username,
          description: schema.reelsTable.description,
          views_count: schema.reelsTable.views_count,
          likes_count: schema.reelsTable.likes_count,
          comments_count: schema.reelsTable.comments_count,
          published_at: schema.reelsTable.published_at
        })
        .from(schema.reelsTable)
        .where(sql`source_type = 'competitor' AND source_identifier = ${competitor.id.toString()}`)
        .orderBy(desc(schema.reelsTable.views_count))
        .limit(1);

      competitors.push({
        username: comp.username,
        reelsCount: comp.reelsCount,
        avgViews: Math.round(comp.avgViews || 0),
        maxViews: comp.maxViews || 0,
        topReel: topReel[0] || null
      });
    }

    return {
      totalReels: totalStats[0].total,
      viralReels: totalStats[0].viral,
      competitors,
      topReels: topReelsData.map(reel => ({
        ...reel,
        views_count: reel.views_count || 0,
        likes_count: reel.likes_count || 0,
        comments_count: reel.comments_count || 0,
        published_at: reel.published_at || new Date(),
        competitor_username: reel.source_type === 'competitor' ? `competitor_${reel.source_identifier}` : undefined
      }))
    };

  } catch (error) {
    logger.error('❌ Ошибка получения данных:', error);
    throw error;
  }
}

function generateMainDashboard(data: any): string {
  const currentDate = new Date().toLocaleDateString('ru-RU');
  
  return `# 🥥✨ ГЛАВНЫЙ ДАШБОРД - Coco Age

> **Обновлено:** ${currentDate}  
> **Статус:** 🟢 Реальные данные из базы

## 📊 **ОБЩАЯ СТАТИСТИКА**

### 🎯 **Ключевые метрики:**
- **📥 Всего Reels:** ${data.totalReels}
- **🔥 Вирусных (50K+):** ${data.viralReels}
- **📈 Процент вирусных:** ${Math.round((data.viralReels / data.totalReels) * 100)}%
- **🏢 Активных конкурентов:** ${data.competitors.length}

## 🏆 **ТОП КОНКУРЕНТЫ**

${data.competitors.map((comp: CompetitorStats, index: number) => `
### ${index + 1}. @${comp.username}
- **📊 Reels:** ${comp.reelsCount}
- **👁️ Средние просмотры:** ${comp.avgViews.toLocaleString()}
- **🏆 Максимум:** ${comp.maxViews.toLocaleString()}

${comp.topReel ? `**🔥 Лучший Reel:**
- **Просмотры:** ${comp.topReel.views_count.toLocaleString()}
- **Лайки:** ${comp.topReel.likes_count.toLocaleString()}
- **Описание:** ${comp.topReel.description?.substring(0, 100) || 'Нет описания'}...
- **Ссылка:** [Открыть](${comp.topReel.reel_url})` : '**Нет данных о Reels**'}
`).join('\n')}

## 🔥 **ТОП ВИРУСНЫЕ REELS**

${data.topReels.slice(0, 10).map((reel: ReelData, index: number) => `
### ${index + 1}. ${reel.views_count.toLocaleString()} просмотров
- **Автор:** @${reel.author_username || 'Неизвестно'}
- **Лайки:** ${reel.likes_count.toLocaleString()}
- **Комментарии:** ${reel.comments_count.toLocaleString()}
- **Дата:** ${reel.published_at.toLocaleDateString('ru-RU')}
- **Описание:** ${reel.description?.substring(0, 150) || 'Нет описания'}...
- **Ссылка:** [Открыть Reel](${reel.reel_url})
`).join('\n')}

## 🚨 **ПРОБЛЕМЫ И РЕКОМЕНДАЦИИ**

### ❌ **Обнаруженные проблемы:**
- 🚨 Скрапер возвращает только 1 элемент вместо 100
- 🚨 Мало данных с высокими просмотрами
- 🚨 Нужен альтернативный источник данных

### 💡 **Рекомендации:**
1. **Найти рабочий скрапер** с большим объемом данных
2. **Снизить фильтр просмотров** с 50K до 10K для тестирования
3. **Добавить больше конкурентов** для анализа
4. **Настроить автоматический скрапинг** каждые 6 часов

---

**🕉️ Отчет сгенерирован автоматически с реальными данными из базы**
`;
}

async function generateObsidianReports(db: NeonDB): Promise<void> {
  logger.info('📝 ГЕНЕРАЦИЯ OBSIDIAN ОТЧЕТОВ С РЕАЛЬНЫМИ ДАННЫМИ...');

  try {
    // Получаем реальные данные
    const realData = await getRealDataFromDB(db);
    
    // Создаем папки если их нет
    const vaultPath = '/Users/playra/instagram-scraper-bot/vaults/coco-age';
    mkdirSync(vaultPath, { recursive: true });

    // Генерируем главный дашборд
    const mainDashboard = generateMainDashboard(realData);
    writeFileSync(join(vaultPath, '🥥✨ ГЛАВНЫЙ ДАШБОРД.md'), mainDashboard, 'utf8');

    logger.info('✅ Главный дашборд создан с реальными данными');

    // Генерируем страницы конкурентов
    for (const competitor of realData.competitors) {
      const competitorPage = `# 🏢 ${competitor.username}

## 📊 **Статистика**
- **Reels:** ${competitor.reelsCount}
- **Средние просмотры:** ${competitor.avgViews.toLocaleString()}
- **Максимум:** ${competitor.maxViews.toLocaleString()}

${competitor.topReel ? `## 🔥 **Лучший Reel**
- **Просмотры:** ${competitor.topReel.views_count.toLocaleString()}
- **Лайки:** ${competitor.topReel.likes_count.toLocaleString()}
- **Дата:** ${competitor.topReel.published_at.toLocaleDateString('ru-RU')}
- **Ссылка:** [Открыть](${competitor.topReel.reel_url})

### Описание:
${competitor.topReel.description || 'Нет описания'}` : '## ❌ **Нет данных о Reels**'}

---
**Обновлено:** ${new Date().toLocaleDateString('ru-RU')}
`;

      const competitorsDir = join(vaultPath, 'Competitors');
      mkdirSync(competitorsDir, { recursive: true });
      writeFileSync(join(competitorsDir, `${competitor.username}.md`), competitorPage, 'utf8');
    }

    logger.info(`✅ Создано ${realData.competitors.length} страниц конкурентов`);

    // Создаем отчет о проблемах
    const problemsReport = `# 🚨 ОТЧЕТ О ПРОБЛЕМАХ СКРАПИНГА

## ❌ **Критические проблемы:**

1. **Скрапер возвращает только 1 элемент**
   - Запрашиваем: 100 Reels
   - Получаем: 1 Reel
   - Статус: 🚨 Критическая проблема

2. **Нет данных с 50K+ просмотров**
   - Всего Reels: ${realData.totalReels}
   - Вирусных (50K+): ${realData.viralReels}
   - Процент: ${Math.round((realData.viralReels / realData.totalReels) * 100)}%

3. **Качество данных низкое**
   - Мало конкурентов с данными
   - Старые данные (возможно 2024 год)

## 💡 **Решения:**

1. **Найти альтернативные скраперы**
2. **Снизить требования к просмотрам**
3. **Увеличить количество конкурентов**
4. **Проверить настройки Apify**

---
**Дата:** ${new Date().toLocaleDateString('ru-RU')}
`;

    const reportsDir = join(vaultPath, 'Reports');
    mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, 'Проблемы скрапинга.md'), problemsReport, 'utf8');

    logger.info('✅ Отчет о проблемах создан');
    logger.info(`📁 Все файлы сохранены в: ${vaultPath}`);

  } catch (error) {
    logger.error('❌ Ошибка генерации отчетов:', error);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    logger.info('🕉️ ГЕНЕРАЦИЯ OBSIDIAN ОТЧЕТОВ С РЕАЛЬНЫМИ ДАННЫМИ');

    // Инициализируем подключение к базе
    await initializeDBConnection();
    const db = getDB();

    // Генерируем отчеты
    await generateObsidianReports(db);

    logger.info('\n🎉 ВСЕ ГОТОВО! Obsidian отчеты созданы с реальными данными');
    logger.info('📂 Откройте vaults/coco-age/🥥✨ ГЛАВНЫЙ ДАШБОРД.md в Obsidian');

  } catch (error) {
    logger.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  }
}

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
