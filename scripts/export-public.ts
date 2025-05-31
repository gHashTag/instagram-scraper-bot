import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  initializeDBConnection,
  closeDBConnection,
  getDB,
} from "../src/db/neonDB";
import { reelsTable, competitorsTable, projectsTable } from "../src/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

const publicPath = process.env.PUBLIC_REPORTS_PATH;
if (!publicPath) {
  console.error("❌ Не указан путь PUBLIC_REPORTS_PATH в .env");
  process.exit(1);
}

const publicReportsPath: string = publicPath;

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ru-RU").format(num);
}

function formatPercent(num: number): string {
  return `${num.toFixed(2)}%`;
}

function maskCompetitorName(username: string): string {
  // Маскируем имена конкурентов для публичной версии
  if (username.length <= 3) return "***";
  return (
    username.substring(0, 2) +
    "*".repeat(username.length - 4) +
    username.substring(username.length - 2)
  );
}

async function main() {
  const projectIdArg = process.argv[2];

  if (!projectIdArg) {
    console.error("❌ Укажите ID проекта как аргумент");
    console.error("Пример: bun run export:public 1");
    process.exit(1);
  }

  const projectId = parseInt(projectIdArg, 10);

  console.log(`🚀 Создание публичного отчета для проекта ${projectId}...`);

  await initializeDBConnection();
  const db = getDB();

  // Получаем информацию о проекте
  const project = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (project.length === 0) {
    console.error(`❌ Проект с ID ${projectId} не найден`);
    await closeDBConnection();
    return;
  }

  const projectInfo = project[0];
  console.log(`📊 Анализируем проект: ${projectInfo.name}`);

  // Получаем статистику по конкурентам
  const competitorStats = await db
    .select({
      competitorId: competitorsTable.id,
      username: competitorsTable.username,
      fullName: competitorsTable.full_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
      maxViews: sql<number>`max(${reelsTable.views_count})`,
    })
    .from(competitorsTable)
    .leftJoin(
      reelsTable,
      and(
        eq(reelsTable.project_id, competitorsTable.project_id),
        eq(reelsTable.source_type, "competitor"),
        eq(reelsTable.source_identifier, sql`${competitorsTable.id}::text`)
      )
    )
    .where(eq(competitorsTable.project_id, projectId))
    .groupBy(
      competitorsTable.id,
      competitorsTable.username,
      competitorsTable.full_name
    )
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`));

  // Получаем общую статистику
  const totalStats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId));

  const stats = totalStats[0];
  const totalEngagementRate =
    Number(stats.totalViews) > 0
      ? (Number(stats.totalLikes) / Number(stats.totalViews)) * 100
      : 0;

  // Получаем топ-5 reels (меньше для публичной версии)
  const topReels = await db
    .select({
      authorUsername: reelsTable.author_username,
      viewsCount: reelsTable.views_count,
      likesCount: reelsTable.likes_count,
      audioTitle: reelsTable.audio_title,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId))
    .orderBy(desc(reelsTable.views_count))
    .limit(5);

  // Создаем публичный отчет (без ссылок и конфиденциальной информации)
  const reportContent = `# 📊 АНАЛИЗ РЫНКА ЭСТЕТИЧЕСКОЙ МЕДИЦИНЫ

## 🎯 ОБЗОР ИНДУСТРИИ

**Дата анализа:** ${new Date().toLocaleDateString("ru-RU")}  
**Сфера:** ${projectInfo.industry || "Эстетическая медицина"}

---

## 📈 ОБЩАЯ СТАТИСТИКА РЫНКА

- 🎬 **Проанализировано контента:** ${formatNumber(Number(stats.totalReels || 0))} публикаций
- 👀 **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- ❤️ **Общее вовлечение:** ${formatNumber(Number(stats.totalLikes || 0))} лайков
- 📊 **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров на публикацию
- 💫 **Средний Engagement Rate:** ${formatPercent(totalEngagementRate)}
- 👥 **Количество игроков:** ${competitorStats.length} основных участников рынка

---

## 🏆 РЕЙТИНГ УЧАСТНИКОВ РЫНКА

${competitorStats
  .map((competitor, index) => {
    const reelsCount = Number(competitor.reelsCount || 0);
    const totalViews = Number(competitor.totalViews || 0);
    const totalLikes = Number(competitor.totalLikes || 0);
    const avgViews = Math.round(Number(competitor.avgViews || 0));
    const maxViews = Number(competitor.maxViews || 0);
    const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
    const maskedName = maskCompetitorName(competitor.username || "Участник");

    return `### ${index + 1}. Участник "${maskedName}"

- 🎬 **Публикаций:** ${formatNumber(reelsCount)}
- 👀 **Общий охват:** ${formatNumber(totalViews)}
- ❤️ **Общее вовлечение:** ${formatNumber(totalLikes)}
- 📊 **Средний охват:** ${formatNumber(avgViews)}
- 🔥 **Максимальный охват:** ${formatNumber(maxViews)}
- 💫 **ER:** ${formatPercent(engagementRate)}`;
  })
  .join("\n\n")}

---

## 🔥 ТОП-5 САМОГО ПОПУЛЯРНОГО КОНТЕНТА

${topReels
  .filter((reel) => reel.viewsCount && Number(reel.viewsCount) > 0)
  .slice(0, 5)
  .map((reel, index) => {
    const views = Number(reel.viewsCount || 0);
    const likes = Number(reel.likesCount || 0);
    const engagementRate = views > 0 ? (likes / views) * 100 : 0;
    const maskedAuthor = maskCompetitorName(reel.authorUsername || "Автор");

    return `### ${index + 1}. Публикация от "${maskedAuthor}"

- 👀 **Охват:** ${formatNumber(views)}
- ❤️ **Вовлечение:** ${formatNumber(likes)}
- 💫 **ER:** ${formatPercent(engagementRate)}
- 🎵 **Аудио:** ${reel.audioTitle || "Оригинальное аудио"}`;
  })
  .join("\n\n")}

---

## 💡 КЛЮЧЕВЫЕ ИНСАЙТЫ

### 🎯 Лидер рынка:
Участник с наибольшим охватом: **${formatNumber(Number(competitorStats[0]?.totalViews || 0))}** просмотров

### 📊 Бенчмарки индустрии:
- Средний ER по рынку: **${formatPercent(totalEngagementRate)}**
- Средний охват публикации: **${formatNumber(Math.round(Number(stats.avgViews || 0)))}**

### 🔥 Тренды контента:
- Самая популярная публикация набрала: **${formatNumber(Number(topReels[0]?.viewsCount || 0))}** просмотров
- Топ-контент показывает ER: **${topReels[0] ? formatPercent(Number(topReels[0].viewsCount) > 0 ? (Number(topReels[0].likesCount) / Number(topReels[0].viewsCount)) * 100 : 0) : "0.00%"}**

---

## 📋 РЕКОМЕНДАЦИИ ДЛЯ УЧАСТНИКОВ РЫНКА

### 🎯 Для повышения охвата:
1. **Изучить стратегии лидеров** - анализировать подходы топ-игроков
2. **Фокус на качестве контента** - стремиться к показателям выше среднерыночных
3. **Мониторинг трендов** - отслеживать популярные форматы и темы

### 📈 Для улучшения вовлечения:
1. **Оптимизация ER** - цель превысить средний показатель ${formatPercent(totalEngagementRate)}
2. **Тестирование форматов** - экспериментировать с успешными подходами
3. **Анализ аудитории** - понимать предпочтения целевой группы

---

## 📊 МЕТОДОЛОГИЯ

Данный анализ основан на изучении ${formatNumber(Number(stats.totalReels || 0))} публикаций от ${competitorStats.length} ключевых участников рынка эстетической медицины. Анализировались метрики охвата, вовлечения и популярности контента за последний период.

---

*Отчет подготовлен: ${new Date().toLocaleString("ru-RU")}*  
*Следующее обновление: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU")}*

---

**📈 Профессиональная аналитика рынка эстетической медицины**`;

  // Сохраняем публичный отчет
  fs.mkdirSync(publicReportsPath, { recursive: true });

  const reportFileName = `market-analysis-${new Date().toISOString().split("T")[0]}.md`;
  const reportFilePath = path.join(publicReportsPath, reportFileName);

  fs.writeFileSync(reportFilePath, reportContent, "utf8");

  // Также создаем HTML версию для веб-публикации
  const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Анализ рынка эстетической медицины</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #2c3e50; }
        .stats { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .competitor { background: #fff; border: 1px solid #e9ecef; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .metric { display: inline-block; margin: 5px 10px 5px 0; }
        .footer { text-align: center; color: #6c757d; margin-top: 40px; font-size: 0.9em; }
    </style>
</head>
<body>
${reportContent
  .replace(/^# /gm, "<h1>")
  .replace(/^## /gm, "</h1><h2>")
  .replace(/^### /gm, "</h2><h3>")
  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  .replace(/- /g, '<div class="metric">• ')
  .replace(/\n\n/g, '</div></div><div class="stats">')
  .replace(/---/g, "</div><hr>")}
<div class="footer">
    <p>Данный отчет создан автоматически на основе анализа публичных данных</p>
</div>
</body>
</html>`;

  const htmlFileName = `market-analysis-${new Date().toISOString().split("T")[0]}.html`;
  const htmlFilePath = path.join(publicReportsPath, htmlFileName);

  fs.writeFileSync(htmlFilePath, htmlContent, "utf8");

  console.log(`✅ Публичный отчет создан:`);
  console.log(`   📄 Markdown: ${reportFileName}`);
  console.log(`   🌐 HTML: ${htmlFileName}`);
  console.log(`   📁 Путь: ${publicReportsPath}`);
  console.log(`📊 Участников рынка: ${competitorStats.length}`);
  console.log(`🎬 Публикаций: ${formatNumber(Number(stats.totalReels || 0))}`);

  await closeDBConnection();
}

main().catch(async (err) => {
  console.error("❌ Ошибка:", err);
  await closeDBConnection();
});
