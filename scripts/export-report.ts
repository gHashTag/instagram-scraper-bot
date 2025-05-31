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

const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
if (!vaultPath) {
  console.error("❌ Не указан путь OBSIDIAN_VAULT_PATH в .env");
  process.exit(1);
}

// TypeScript проверка - vaultPath точно не undefined после проверки выше
const obsidianPath: string = vaultPath;

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ru-RU").format(num);
}

function formatPercent(num: number): string {
  return `${num.toFixed(2)}%`;
}

async function main() {
  const projectIdArg = process.argv[2];

  if (!projectIdArg) {
    console.error("❌ Укажите ID проекта как аргумент");
    console.error("Пример: bun run export:report 1");
    process.exit(1);
  }

  const projectId = parseInt(projectIdArg, 10);

  console.log(`🚀 Создание отчета для проекта ${projectId}...`);

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

  // Получаем топ-10 reels
  const topReels = await db
    .select({
      authorUsername: reelsTable.author_username,
      viewsCount: reelsTable.views_count,
      likesCount: reelsTable.likes_count,
      audioTitle: reelsTable.audio_title,
      description: reelsTable.description,
      reelUrl: reelsTable.reel_url,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId))
    .orderBy(desc(reelsTable.views_count))
    .limit(10);

  // Создаем простой отчет
  const reportContent = `# 📊 ОТЧЕТ ПО КОНКУРЕНТАМ

## 🎯 ПРОЕКТ: ${projectInfo.name}

**Дата:** ${new Date().toLocaleDateString("ru-RU")}  
**Индустрия:** ${projectInfo.industry || "Не указано"}

---

## 📈 ОБЩАЯ СТАТИСТИКА

- 🎬 **Всего Reels:** ${formatNumber(Number(stats.totalReels || 0))}
- 👀 **Всего просмотров:** ${formatNumber(Number(stats.totalViews || 0))}
- ❤️ **Всего лайков:** ${formatNumber(Number(stats.totalLikes || 0))}
- 📊 **Средние просмотры:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))}
- 💫 **Engagement Rate:** ${formatPercent(totalEngagementRate)}
- 👥 **Конкурентов:** ${competitorStats.length}

---

## 🏆 КОНКУРЕНТЫ (ТОП по просмотрам)

${competitorStats
  .map((competitor, index) => {
    const reelsCount = Number(competitor.reelsCount || 0);
    const totalViews = Number(competitor.totalViews || 0);
    const totalLikes = Number(competitor.totalLikes || 0);
    const avgViews = Math.round(Number(competitor.avgViews || 0));
    const maxViews = Number(competitor.maxViews || 0);
    const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

    return `### ${index + 1}. @${competitor.username || "Неизвестный"}

- 🎬 **Reels:** ${formatNumber(reelsCount)}
- 👀 **Просмотры:** ${formatNumber(totalViews)}
- ❤️ **Лайки:** ${formatNumber(totalLikes)}
- 📊 **Средние просмотры:** ${formatNumber(avgViews)}
- 🔥 **Максимум:** ${formatNumber(maxViews)}
- 💫 **ER:** ${formatPercent(engagementRate)}`;
  })
  .join("\n\n")}

---

## 🔥 ТОП-10 ЛУЧШИХ REELS

${topReels
  .filter((reel) => reel.reelUrl && !reel.reelUrl.includes("test_reel"))
  .slice(0, 10)
  .map((reel, index) => {
    const views = Number(reel.viewsCount || 0);
    const likes = Number(reel.likesCount || 0);
    const engagementRate = views > 0 ? (likes / views) * 100 : 0;

    return `### ${index + 1}. @${reel.authorUsername || "Неизвестный"}

- 👀 **Просмотры:** ${formatNumber(views)}
- ❤️ **Лайки:** ${formatNumber(likes)}
- 💫 **ER:** ${formatPercent(engagementRate)}
- 🎵 **Музыка:** ${reel.audioTitle || "Не указана"}
- 📝 **Описание:** ${reel.description ? reel.description.substring(0, 100) + "..." : "Нет"}
- 🔗 **Ссылка:** [Открыть](${reel.reelUrl})`;
  })
  .join("\n\n")}

---

## 💡 ВЫВОДЫ

### 🎯 Лидер рынка:
**@${competitorStats[0]?.username || "Не определен"}** - ${formatNumber(Number(competitorStats[0]?.totalViews || 0))} просмотров

### 📊 Средний ER по рынку:
${formatPercent(totalEngagementRate)}

### 🔥 Самый популярный контент:
${formatNumber(Number(topReels[0]?.viewsCount || 0))} просмотров у @${topReels[0]?.authorUsername || "Неизвестный"}

---

## 📋 РЕКОМЕНДАЦИИ

1. **Изучить стратегию лидера:** @${competitorStats[0]?.username || "Не определен"}
2. **Анализировать топ-контент** для понимания трендов
3. **Следить за музыкальными трендами**
4. **Тестировать похожие форматы контента**

---

*Отчет создан: ${new Date().toLocaleString("ru-RU")}*`;

  // Создаем структуру папок для проекта
  const projectSlug = projectInfo.name
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, "-");
  const projectDir = path.join(
    obsidianPath,
    "content-factory",
    `project-${projectSlug}`
  );
  const reportsDir = path.join(projectDir, "reports");

  fs.mkdirSync(reportsDir, { recursive: true });

  const reportFileName = `competitors-analysis-${new Date().toISOString().split("T")[0]}.md`;
  const reportFilePath = path.join(reportsDir, reportFileName);

  fs.writeFileSync(reportFilePath, reportContent, "utf8");

  console.log(`✅ Отчет создан: ${reportFileName}`);
  console.log(`📁 Путь: ${reportFilePath}`);
  console.log(`📊 Конкурентов: ${competitorStats.length}`);
  console.log(`🎬 Reels: ${formatNumber(Number(stats.totalReels || 0))}`);

  await closeDBConnection();
}

main().catch(async (err) => {
  console.error("❌ Ошибка:", err);
  await closeDBConnection();
});
