#!/usr/bin/env bun

/**
 * 🔄 Единый скрипт синхронизации Obsidian для Coco Age
 * 
 * Этот скрипт обновляет всю систему Obsidian:
 * - Создает/обновляет граф связей
 * - Синхронизирует данные из БД
 * - Обновляет все отчеты и аналитику
 * - Поддерживает актуальность всех связей
 * 
 * Использование:
 * bun run scripts/sync-obsidian-system.ts [project_id]
 * 
 * Пример:
 * bun run scripts/sync-obsidian-system.ts 1
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  initializeDBConnection,
  closeDBConnection,
  getDB,
} from "../src/db/neonDB";
import {
  reelsTable,
  competitorsTable,
  projectsTable,
  hashtagsTable,
} from "../src/db/schema";
import { eq, and, desc, sql, isNotNull } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, "../.env.local") }); // Для локального тестирования
}
const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
if (!vaultPath) {
  console.error("❌ Не указан путь OBSIDIAN_VAULT_PATH в .env");
  process.exit(1);
}

const obsidianPath: string = vaultPath;

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ru-RU").format(num);
}

function formatPercent(num: number): string {
  return `${(num * 100).toFixed(1)}%`;
}

async function syncObsidianSystem(projectId: number): Promise<void> {
  console.log(`🔄 Синхронизация системы Obsidian для проекта ${projectId}...`);

  await initializeDBConnection();
  const db = getDB();

  // Получаем актуальные данные
  const project = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
  
  if (!project.length) {
    console.error(`❌ Проект с ID ${projectId} не найден`);
    return;
  }

  console.log(`📊 Синхронизируем проект: ${project[0].name}`);

  // Получаем статистику
  const stats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
      withTranscripts: sql<number>`count(case when ${reelsTable.transcript} is not null then 1 end)`,
      maxViews: sql<number>`max(${reelsTable.views_count})`,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId));

  // Получаем конкурентов
  const competitors = await db
    .select({
      id: competitorsTable.id,
      username: competitorsTable.username,
      fullName: competitorsTable.full_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
    })
    .from(competitorsTable)
    .leftJoin(reelsTable, and(
      eq(reelsTable.project_id, competitorsTable.project_id),
      eq(reelsTable.source_type, "competitor"),
      eq(reelsTable.source_identifier, sql`${competitorsTable.id}::text`)
    ))
    .where(eq(competitorsTable.project_id, projectId))
    .groupBy(competitorsTable.id, competitorsTable.username, competitorsTable.full_name)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`));

  // Получаем хэштеги
  const hashtags = await db
    .select({
      id: hashtagsTable.id,
      tagName: hashtagsTable.tag_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
    })
    .from(hashtagsTable)
    .leftJoin(reelsTable, and(
      eq(reelsTable.project_id, hashtagsTable.project_id),
      eq(reelsTable.source_type, "hashtag"),
      eq(reelsTable.source_identifier, sql`${hashtagsTable.id}::text`)
    ))
    .where(eq(hashtagsTable.project_id, projectId))
    .groupBy(hashtagsTable.id, hashtagsTable.tag_name)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`));

  // Получаем топ-контент с транскрипциями
  const topContent = await db
    .select({
      url: reelsTable.reel_url,
      author: reelsTable.author_username,
      views: reelsTable.views_count,
      likes: reelsTable.likes_count,
      description: reelsTable.description,
      transcript: reelsTable.transcript,
      audioTitle: reelsTable.audio_title,
    })
    .from(reelsTable)
    .where(and(
      eq(reelsTable.project_id, projectId),
      isNotNull(reelsTable.transcript)
    ))
    .orderBy(desc(reelsTable.views_count))
    .limit(5);

  console.log(`📈 Статистика:`);
  console.log(`   📱 Reels: ${formatNumber(Number(stats[0].totalReels || 0))}`);
  console.log(`   👀 Просмотры: ${formatNumber(Number(stats[0].totalViews || 0))}`);
  console.log(`   🎙️ Транскрипции: ${formatNumber(Number(stats[0].withTranscripts || 0))}`);
  console.log(`   👥 Конкуренты: ${competitors.length}`);
  console.log(`   🏷️ Хэштеги: ${hashtags.length}`);

  // Обновляем систему
  await updateObsidianSystem(project[0], stats[0], competitors, hashtags, topContent);

  console.log(`✅ Синхронизация завершена для проекта: ${project[0].name}`);
  await closeDBConnection();
}

async function updateObsidianSystem(
  project: any,
  stats: any,
  competitors: any[],
  hashtags: any[],
  topContent: any[]
): Promise<void> {
  const contentFactoryPath = path.join(obsidianPath, "content-factory");
  const cocoAgeDir = path.join(contentFactoryPath, "Coco-Age-Analytics");

  // Создаем директории если их нет
  const dirs = [
    cocoAgeDir,
    path.join(cocoAgeDir, "Maps"),
    path.join(cocoAgeDir, "Competitors"),
    path.join(cocoAgeDir, "Hashtags"),
    path.join(cocoAgeDir, "Content-Strategy"),
    path.join(cocoAgeDir, "Analytics"),
    path.join(cocoAgeDir, "Reports"),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Обновляем центральную карту
  await updateMainMOC(cocoAgeDir, project, stats, competitors, hashtags);

  // Обновляем узлы конкурентов
  await updateCompetitorNodes(cocoAgeDir, competitors);

  // Обновляем узлы хэштегов
  await updateHashtagNodes(cocoAgeDir, hashtags);

  // Обновляем аналитику
  await updateAnalyticsNodes(cocoAgeDir, stats, topContent);

  // Обновляем отчеты
  await updateReports(cocoAgeDir, project, stats, competitors, hashtags, topContent);

  console.log(`🔄 Все файлы обновлены в: ${cocoAgeDir}`);
}

async function updateMainMOC(
  cocoAgeDir: string,
  project: any,
  stats: any,
  competitors: any[],
  hashtags: any[]
): Promise<void> {
  const mocContent = `# 🥥✨ Coco Age - Центральная карта

> **Map of Content (MOC) для Instagram аналитики бренда Coco Age**

#CocoAge #MOC #Instagram #Analytics #Beauty

**Последнее обновление:** ${new Date().toLocaleString("ru-RU")}

---

## 🌟 Актуальный статус

**Бренд:** ${project.name}  
**Сфера:** ${project.industry}  
**Статус:** 🟢 Активен

### 📊 Свежие показатели
- **Контент-база:** ${formatNumber(Number(stats.totalReels || 0))} Reels
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- **AI-анализ:** ${formatNumber(Number(stats.withTranscripts || 0))} транскрипций (${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))})
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров

---

## 🗺️ Навигация по экосистеме

### 👥 Конкурентная среда (${competitors.length} брендов)
${competitors.slice(0, 7).map(comp => 
  `- [[Competitors/${comp.username}|@${comp.username}]] ${comp.fullName ? `(${comp.fullName})` : ""} - ${formatNumber(Number(comp.totalViews || 0))} просмотров #competitor #${comp.username.replace(/[^a-zA-Z0-9]/g, '')}`
).join('\n')}

### 🏷️ Хэштег-стратегия (${hashtags.length} тегов)
${hashtags.slice(0, 10).map(tag => 
  `- [[Hashtags/${tag.tagName}|#${tag.tagName}]] - ${Number(tag.reelsCount || 0)} постов, ${formatNumber(Number(tag.totalViews || 0))} просмотров #hashtag #${tag.tagName.replace(/[^a-zA-Z0-9]/g, '')}`
).join('\n')}

### 🎯 Стратегические направления
- [[Content-Strategy/Brand-Positioning|🎯 Позиционирование бренда]] #strategy #positioning
- [[Content-Strategy/Content-Mix|📅 Контент-микс]] #strategy #content
- [[Analytics/Performance-Overview|📊 Обзор эффективности]] #analytics #performance

### 📋 Актуальные отчеты
- [[Reports/Executive-Summary|📋 Исполнительное резюме]] #report #summary
- [[Reports/Latest-Insights|💡 Последние инсайты]] #report #insights

---

## 🎨 Визуальная карта связей

### 🔗 Основные кластеры в Graph View
1. **🥥 Coco Age** (центральный узел) → Стратегия → Контент → Аудитория
2. **👥 Конкуренты** → Анализ → Инсайты → Возможности  
3. **🏷️ Хэштеги** → Тренды → Охват → Оптимизация
4. **📊 Аналитика** → Метрики → Рекомендации → Действия

### 🌐 Фильтры для Graph View
- \`tag:#CocoAge\` - все материалы по бренду
- \`tag:#competitor\` - карта конкурентов
- \`tag:#hashtag\` - хэштег-экосистема
- \`tag:#strategy\` - стратегические материалы
- \`tag:#analytics\` - аналитические данные

---

## 🎯 Как использовать эту систему

1. **🗺️ Начните здесь** - центральная точка всей экосистемы
2. **🔗 Переходите по ссылкам** - каждая ссылка ведет к детальному анализу
3. **📊 Используйте Graph View** - визуализируйте связи между элементами
4. **🏷️ Фильтруйте по тегам** - быстро находите нужную информацию
5. **🔄 Обновляйте регулярно** - система автоматически синхронизируется

---

*Создано: ${new Date().toLocaleString("ru-RU")}*  
*Статус: 🟢 Готово к использованию*  
*Следующее обновление: автоматически*

#CocoAge #MOC #Instagram #Beauty #AntiAge #Updated`;

  const mocPath = path.join(cocoAgeDir, "🥥✨ Coco Age - Центральная карта.md");
  fs.writeFileSync(mocPath, mocContent, "utf8");
}

async function updateCompetitorNodes(cocoAgeDir: string, competitors: any[]): Promise<void> {
  const competitorsDir = path.join(cocoAgeDir, "Competitors");

  for (const comp of competitors.slice(0, 7)) {
    const competitorContent = `# @${comp.username}

> **Конкурент в сфере beauty & anti-age**

#competitor #${comp.username.replace(/[^a-zA-Z0-9]/g, '')} #CocoAge #beauty

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 📊 Актуальные показатели

**Instagram:** @${comp.username}
**Полное имя:** ${comp.fullName || "Не указано"}
**Контент:** ${Number(comp.reelsCount || 0)} Reels
**Общий охват:** ${formatNumber(Number(comp.totalViews || 0))} просмотров
**Средний охват:** ${comp.reelsCount > 0 ? formatNumber(Math.round(Number(comp.totalViews || 0) / Number(comp.reelsCount))) : "0"} просмотров

---

## 🔗 Связи в экосистеме

**Возврат к карте:** [[🥥✨ Coco Age - Центральная карта|🗺️ Главная карта]]

### 💡 Ключевые инсайты
- **Эффективность:** ${comp.reelsCount > 0 ? formatNumber(Math.round(Number(comp.totalViews || 0) / Number(comp.reelsCount))) : "0"} просмотров в среднем
- **Активность:** ${Number(comp.reelsCount || 0)} публикаций
- **Позиция:** ${Number(comp.totalViews || 0) > 1000000 ? "Топ-конкурент" : "Значимый игрок"}

### 🎯 Возможности для Coco Age
- Анализ успешных форматов
- Выявление неохваченных ниш
- Изучение стратегии контента

---

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#competitor #analysis #CocoAge #updated`;

    const competitorPath = path.join(competitorsDir, `${comp.username}.md`);
    fs.writeFileSync(competitorPath, competitorContent, "utf8");
  }
}

async function updateHashtagNodes(cocoAgeDir: string, hashtags: any[]): Promise<void> {
  const hashtagsDir = path.join(cocoAgeDir, "Hashtags");

  for (const tag of hashtags.slice(0, 10)) {
    const hashtagContent = `# #${tag.tagName}

> **Хэштег для стратегии Coco Age**

#hashtag #${tag.tagName.replace(/[^a-zA-Z0-9]/g, '')} #CocoAge #strategy

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 📊 Актуальные метрики

**Хэштег:** #${tag.tagName}
**Контент:** ${Number(tag.reelsCount || 0)} Reels
**Общий охват:** ${formatNumber(Number(tag.totalViews || 0))} просмотров
**Средний охват:** ${tag.reelsCount > 0 ? formatNumber(Math.round(Number(tag.totalViews || 0) / Number(tag.reelsCount))) : "0"} просмотров

---

## 🔗 Связи в экосистеме

**Возврат к карте:** [[🥥✨ Coco Age - Центральная карта|🗺️ Главная карта]]

### 💡 Рекомендации для Coco Age
- **Частота:** ${tag.reelsCount > 50 ? "Высокочастотный" : tag.reelsCount > 10 ? "Среднечастотный" : "Низкочастотный"}
- **Эффективность:** ${tag.reelsCount > 0 && (Number(tag.totalViews || 0) / Number(tag.reelsCount)) > 100000 ? "Высокая" : "Средняя"}
- **Рекомендация:** ${tag.reelsCount > 0 && (Number(tag.totalViews || 0) / Number(tag.reelsCount)) > 100000 ? "Использовать активно" : "Тестировать осторожно"}

---

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#hashtag #strategy #CocoAge #updated`;

    const hashtagPath = path.join(hashtagsDir, `${tag.tagName}.md`);
    fs.writeFileSync(hashtagPath, hashtagContent, "utf8");
  }
}

async function updateAnalyticsNodes(cocoAgeDir: string, stats: any, topContent: any[]): Promise<void> {
  const analyticsDir = path.join(cocoAgeDir, "Analytics");

  const performanceContent = `# 📊 Обзор эффективности Coco Age

#analytics #performance #CocoAge #metrics

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 📈 Актуальные метрики

### 🎬 Контент-база
- **Всего Reels:** ${formatNumber(Number(stats.totalReels || 0))}
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- **Общие лайки:** ${formatNumber(Number(stats.totalLikes || 0))}
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров

### 🤖 AI-анализ
- **Транскрипций:** ${formatNumber(Number(stats.withTranscripts || 0))}
- **Покрытие:** ${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}
- **Статус:** ${Number(stats.withTranscripts || 0) > 0 ? "✅ Активно" : "🔄 В процессе"}

---

## 🔗 Связи в экосистеме

**Возврат к карте:** [[🥥✨ Coco Age - Центральная карта|🗺️ Главная карта]]

## 🏆 Топ-контент с AI-анализом

${topContent.slice(0, 3).map((content, index) => `
### ${index + 1}. ${formatNumber(content.views)} просмотров - @${content.author}

**Метрики:** ${formatNumber(content.views)} просмотров, ${formatNumber(content.likes)} лайков
**ER:** ${formatPercent((content.likes / content.views) * 100)}

**Транскрипция:** ${content.transcript?.substring(0, 150) || "В процессе"}...
`).join('')}

---

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#analytics #performance #CocoAge #updated`;

  const performancePath = path.join(analyticsDir, "Performance-Overview.md");
  fs.writeFileSync(performancePath, performanceContent, "utf8");
}

async function updateReports(
  cocoAgeDir: string,
  project: any,
  stats: any,
  competitors: any[],
  hashtags: any[],
  topContent: any[]
): Promise<void> {
  const reportsDir = path.join(cocoAgeDir, "Reports");

  const summaryContent = `# 📋 Исполнительное резюме Coco Age

#report #summary #CocoAge #executive

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 🥥✨ Coco Age: Текущий статус

### 🎯 Статус проекта: ✅ АКТИВЕН

---

## 📊 Актуальные достижения

### 💎 Проанализированные данные
- **${formatNumber(Number(stats.totalReels || 0))} Instagram Reels** проанализировано
- **${formatNumber(Number(stats.totalViews || 0))} просмотров** общий охват анализа
- **${formatNumber(Number(stats.withTranscripts || 0))} AI-транскрипций** выполнено
- **${competitors.length} конкурентов** исследовано
- **${hashtags.length} хэштегов** проанализировано

---

## 🔗 Навигация по системе

### 🗺️ Центральная карта
**[[🥥✨ Coco Age - Центральная карта|🗺️ Главная карта]]** - начните отсюда

### 📊 Свежая аналитика
- [[Analytics/Performance-Overview|📊 Обзор эффективности]]
- Средний охват: ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров
- AI-покрытие: ${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}

---

## 🚀 Рекомендации

### ⚡ Приоритетные действия
1. **Контент-стратегия** на основе анализа топ-постов
2. **Хэштег-оптимизация** с фокусом на эффективные теги
3. **Конкурентный анализ** для выявления возможностей

---

*Отчет обновлен: ${new Date().toLocaleString("ru-RU")}*
*Статус: 🟢 Актуален*

**🥥✨ Система готова к работе!**

#report #summary #CocoAge #updated`;

  const summaryPath = path.join(reportsDir, "Executive-Summary.md");
  fs.writeFileSync(summaryPath, summaryContent, "utf8");
}

// Получаем ID проекта из аргументов
const projectId = parseInt(process.argv[2]);
if (!projectId) {
  console.error("❌ Укажите ID проекта как аргумент");
  console.error("Пример: bun run scripts/sync-obsidian-system.ts 1");
  process.exit(1);
}

// Запуск синхронизации
syncObsidianSystem(projectId)
  .then(() => {
    console.log("🎉 Система Obsidian полностью синхронизирована!");
    console.log("📊 Откройте Graph View в Obsidian для визуализации обновленных связей!");
  })
  .catch((error) => {
    console.error("❌ Ошибка синхронизации:", error);
    process.exit(1);
  });
