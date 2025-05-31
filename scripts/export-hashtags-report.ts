import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  initializeDBConnection,
  closeDBConnection,
  getDB,
} from "../src/db/neonDB";
import { reelsTable, hashtagsTable, projectsTable } from "../src/db/schema";
import { eq, and, desc, sql, like } from "drizzle-orm";

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
    console.error("Пример: bun run export:hashtags 1");
    process.exit(1);
  }

  const projectId = parseInt(projectIdArg, 10);

  console.log(`🏷️ Создание отчета по хэштегам для проекта ${projectId}...`);

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
  console.log(`📊 Анализируем хэштеги проекта: ${projectInfo.name}`);

  // Получаем статистику по хэштегам
  const hashtagStats = await db
    .select({
      hashtagId: hashtagsTable.id,
      hashtag: hashtagsTable.tag_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
      maxViews: sql<number>`max(${reelsTable.views_count})`,
    })
    .from(hashtagsTable)
    .leftJoin(
      reelsTable,
      and(
        eq(reelsTable.project_id, hashtagsTable.project_id),
        eq(reelsTable.source_type, "hashtag"),
        eq(reelsTable.source_identifier, sql`${hashtagsTable.id}::text`)
      )
    )
    .where(eq(hashtagsTable.project_id, projectId))
    .groupBy(hashtagsTable.id, hashtagsTable.tag_name)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`));

  // Получаем общую статистику по хэштегам
  const totalHashtagStats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
    })
    .from(reelsTable)
    .where(
      and(
        eq(reelsTable.project_id, projectId),
        eq(reelsTable.source_type, "hashtag")
      )
    );

  const stats = totalHashtagStats[0];
  const totalEngagementRate =
    Number(stats.totalViews) > 0
      ? (Number(stats.totalLikes) / Number(stats.totalViews)) * 100
      : 0;

  // Получаем топ-10 reels по хэштегам
  const topHashtagReels = await db
    .select({
      authorUsername: reelsTable.author_username,
      viewsCount: reelsTable.views_count,
      likesCount: reelsTable.likes_count,
      audioTitle: reelsTable.audio_title,
      description: reelsTable.description,
      reelUrl: reelsTable.reel_url,
      sourceIdentifier: reelsTable.source_identifier,
    })
    .from(reelsTable)
    .where(
      and(
        eq(reelsTable.project_id, projectId),
        eq(reelsTable.source_type, "hashtag")
      )
    )
    .orderBy(desc(reelsTable.views_count))
    .limit(10);

  // Создаем отчет по хэштегам
  const reportContent = `# 🏷️ ОТЧЕТ ПО ХЭШТЕГАМ

## 🎯 ПРОЕКТ: ${projectInfo.name}

**Дата:** ${new Date().toLocaleDateString("ru-RU")}  
**Индустрия:** ${projectInfo.industry || "Не указано"}  
**Тип анализа:** Хэштеги и тренды

---

## 📈 ОБЩАЯ СТАТИСТИКА ПО ХЭШТЕГАМ

- 🏷️ **Всего хэштегов:** ${hashtagStats.length}
- 🎬 **Всего Reels:** ${formatNumber(Number(stats.totalReels || 0))}
- 👀 **Всего просмотров:** ${formatNumber(Number(stats.totalViews || 0))}
- ❤️ **Всего лайков:** ${formatNumber(Number(stats.totalLikes || 0))}
- 📊 **Средние просмотры:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))}
- 💫 **Engagement Rate:** ${formatPercent(totalEngagementRate)}

---

## 🏆 ТОП ХЭШТЕГОВ (по просмотрам)

${hashtagStats
  .filter((hashtag) => Number(hashtag.totalViews || 0) > 0)
  .map((hashtag, index) => {
    const reelsCount = Number(hashtag.reelsCount || 0);
    const totalViews = Number(hashtag.totalViews || 0);
    const totalLikes = Number(hashtag.totalLikes || 0);
    const avgViews = Math.round(Number(hashtag.avgViews || 0));
    const maxViews = Number(hashtag.maxViews || 0);
    const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;

    return `### ${index + 1}. #${hashtag.hashtag || "неизвестный"}

- 🎬 **Reels:** ${formatNumber(reelsCount)}
- 👀 **Просмотры:** ${formatNumber(totalViews)}
- ❤️ **Лайки:** ${formatNumber(totalLikes)}
- 📊 **Средние просмотры:** ${formatNumber(avgViews)}
- 🔥 **Максимум:** ${formatNumber(maxViews)}
- 💫 **ER:** ${formatPercent(engagementRate)}`;
  })
  .join("\n\n")}

---

## 🔥 ТОП-10 ЛУЧШИХ REELS ПО ХЭШТЕГАМ

${topHashtagReels
  .filter((reel) => reel.reelUrl && !reel.reelUrl.includes("test_reel"))
  .slice(0, 10)
  .map((reel, index) => {
    const views = Number(reel.viewsCount || 0);
    const likes = Number(reel.likesCount || 0);
    const engagementRate = views > 0 ? (likes / views) * 100 : 0;

    // Находим хэштег по source_identifier
    const hashtagInfo = hashtagStats.find(
      (h) => h.hashtagId?.toString() === reel.sourceIdentifier
    );
    const hashtagName = hashtagInfo?.hashtag || "неизвестный";

    return `### ${index + 1}. @${reel.authorUsername || "Неизвестный"} (#${hashtagName})

- 👀 **Просмотры:** ${formatNumber(views)}
- ❤️ **Лайки:** ${formatNumber(likes)}
- 💫 **ER:** ${formatPercent(engagementRate)}
- 🎵 **Музыка:** ${reel.audioTitle || "Не указана"}
- 📝 **Описание:** ${reel.description ? reel.description.substring(0, 100) + "..." : "Нет"}
- 🔗 **Ссылка:** [Открыть](${reel.reelUrl})`;
  })
  .join("\n\n")}

---

## 💡 АНАЛИЗ ТРЕНДОВ

### 🎯 Самый эффективный хэштег:
**#${hashtagStats[0]?.hashtag || "Не определен"}** - ${formatNumber(Number(hashtagStats[0]?.totalViews || 0))} просмотров

### 📊 Средний ER по хэштегам:
${formatPercent(totalEngagementRate)}

### 🔥 Самый популярный контент:
${formatNumber(Number(topHashtagReels[0]?.viewsCount || 0))} просмотров

### 📈 Рекомендации по хэштегам:

#### 🏆 Высокоэффективные (ER > ${formatPercent(totalEngagementRate * 1.5)}):
${hashtagStats
  .filter((h) => {
    const totalViews = Number(h.totalViews || 0);
    const totalLikes = Number(h.totalLikes || 0);
    const er = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
    return er > totalEngagementRate * 1.5 && totalViews > 0;
  })
  .slice(0, 5)
  .map(
    (h) =>
      `- **#${h.hashtag}** (ER: ${formatPercent(Number(h.totalViews) > 0 ? (Number(h.totalLikes) / Number(h.totalViews)) * 100 : 0)})`
  )
  .join("\n")}

#### 📊 Стабильные (средний ER):
${hashtagStats
  .filter((h) => {
    const totalViews = Number(h.totalViews || 0);
    const totalLikes = Number(h.totalLikes || 0);
    const er = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
    return (
      er >= totalEngagementRate * 0.7 &&
      er <= totalEngagementRate * 1.5 &&
      totalViews > 0
    );
  })
  .slice(0, 5)
  .map(
    (h) =>
      `- **#${h.hashtag}** (ER: ${formatPercent(Number(h.totalViews) > 0 ? (Number(h.totalLikes) / Number(h.totalViews)) * 100 : 0)})`
  )
  .join("\n")}

---

## 📋 РЕКОМЕНДАЦИИ ПО СТРАТЕГИИ

### 🎯 Для максимального охвата:
1. **Использовать топ-хэштеги:** #${hashtagStats
    .slice(0, 3)
    .map((h) => h.hashtag)
    .join(", #")}
2. **Комбинировать популярные и нишевые** хэштеги
3. **Следить за трендами** в реальном времени

### 📈 Для повышения вовлечения:
1. **Фокус на высокоэффективных хэштегах**
2. **Тестировать новые комбинации**
3. **Анализировать контент топ-постов**

### 🔄 Для долгосрочной стратегии:
1. **Создать собственные брендовые хэштеги**
2. **Участвовать в трендовых челленджах**
3. **Мониторить конкурентов**

---

*Отчет создан: ${new Date().toLocaleString("ru-RU")}*`;

  // Сохраняем отчет
  const hashtagsDir = path.join(obsidianPath, "content-factory", "hashtags");
  fs.mkdirSync(hashtagsDir, { recursive: true });

  const reportFileName = `hashtags-analysis-${projectInfo.name.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().split("T")[0]}.md`;
  const reportFilePath = path.join(hashtagsDir, reportFileName);

  fs.writeFileSync(reportFilePath, reportContent, "utf8");

  console.log(`✅ Отчет по хэштегам создан: ${reportFileName}`);
  console.log(`📁 Путь: ${reportFilePath}`);
  console.log(`🏷️ Хэштегов: ${hashtagStats.length}`);
  console.log(`🎬 Reels: ${formatNumber(Number(stats.totalReels || 0))}`);

  await closeDBConnection();
}

main().catch(async (err) => {
  console.error("❌ Ошибка:", err);
  await closeDBConnection();
});
