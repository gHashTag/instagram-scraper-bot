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
  hashtagsTable,
  projectsTable,
} from "../src/db/schema";
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
    console.error("Пример: bun run create:overview 1");
    process.exit(1);
  }

  const projectId = parseInt(projectIdArg, 10);

  console.log(
    `🏭 Создание общего обзора контент-завода для проекта ${projectId}...`
  );

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
  console.log(`📊 Создаем обзор для проекта: ${projectInfo.name}`);

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

  // Статистика по конкурентам
  const competitorCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, projectId));

  // Статистика по хэштегам
  const hashtagCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(hashtagsTable)
    .where(eq(hashtagsTable.project_id, projectId));

  // Топ-3 конкурента
  const topCompetitors = await db
    .select({
      username: competitorsTable.username,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      reelsCount: sql<number>`count(${reelsTable.id})`,
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
    .groupBy(competitorsTable.id, competitorsTable.username)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`))
    .limit(3);

  // Топ-3 хэштега
  const topHashtags = await db
    .select({
      hashtag: hashtagsTable.tag_name,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      reelsCount: sql<number>`count(${reelsTable.id})`,
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
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`))
    .limit(3);

  const stats = totalStats[0];
  const totalEngagementRate =
    Number(stats.totalViews) > 0
      ? (Number(stats.totalLikes) / Number(stats.totalViews)) * 100
      : 0;

  // Создаем обзор
  const overviewContent = `# 🏭 КОНТЕНТ-ЗАВОД - Обзор проекта

## 🎯 ${projectInfo.name}

> **Полный обзор контент-стратегии и аналитики**

**Дата обновления:** ${new Date().toLocaleDateString("ru-RU")}  
**Индустрия:** ${projectInfo.industry || "Эстетическая медицина"}

---

## 📊 ОБЩАЯ СТАТИСТИКА

### 🎬 Контент
- **Всего публикаций:** ${formatNumber(Number(stats.totalReels || 0))}
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- **Общее вовлечение:** ${formatNumber(Number(stats.totalLikes || 0))} лайков
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров
- **Engagement Rate:** ${formatPercent(totalEngagementRate)}

### 🎯 Источники данных
- **Конкурентов отслеживается:** ${competitorCount[0]?.count || 0}
- **Хэштегов анализируется:** ${hashtagCount[0]?.count || 0}
- **Активных источников:** ${(competitorCount[0]?.count || 0) + (hashtagCount[0]?.count || 0)}

---

## 🏆 ТОП-ИСПОЛНИТЕЛИ

### 👥 Лидеры среди конкурентов
${topCompetitors
  .map((competitor, index) => {
    const views = Number(competitor.totalViews || 0);
    const reels = Number(competitor.reelsCount || 0);
    const avgViews = reels > 0 ? Math.round(views / reels) : 0;

    return `${index + 1}. **@${competitor.username}** - ${formatNumber(views)} просмотров (${reels} публикаций, ~${formatNumber(avgViews)} в среднем)`;
  })
  .join("\n")}

### 🏷️ Самые эффективные хэштеги
${topHashtags
  .map((hashtag, index) => {
    const views = Number(hashtag.totalViews || 0);
    const reels = Number(hashtag.reelsCount || 0);
    const avgViews = reels > 0 ? Math.round(views / reels) : 0;

    return `${index + 1}. **#${hashtag.hashtag}** - ${formatNumber(views)} просмотров (${reels} публикаций, ~${formatNumber(avgViews)} в среднем)`;
  })
  .join("\n")}

---

## 📋 МОДУЛИ КОНТЕНТ-ЗАВОДА

### 🏆 [[competitors/|Анализ конкурентов]]
- **Статус:** ${competitorCount[0]?.count > 0 ? "✅ Активен" : "⚠️ Требует настройки"}
- **Конкурентов:** ${competitorCount[0]?.count || 0}
- **Последний отчет:** [[competitors-analysis-${new Date().toISOString().split("T")[0]}|Сегодняшний анализ]]

### 🏷️ [[hashtags/|Анализ хэштегов]]
- **Статус:** ${hashtagCount[0]?.count > 0 ? "✅ Активен" : "⚠️ Требует настройки"}
- **Хэштегов:** ${hashtagCount[0]?.count || 0}
- **Последний отчет:** [[hashtags-analysis-${new Date().toISOString().split("T")[0]}|Сегодняшний анализ]]

### 💡 [[insights/|Инсайты и стратегии]]
- **Статус:** 🔄 В разработке
- **Еженедельные выводы**
- **Стратегические рекомендации**

### 🎨 [[templates/|Шаблоны контента]]
- **Статус:** 🔄 В разработке
- **Готовые форматы**
- **Библиотека идей**

---

## 🎯 БЫСТРЫЕ ДЕЙСТВИЯ

### 📊 Создать отчеты
\`\`\`bash
# Анализ конкурентов
bun run export:report ${projectId}

# Анализ хэштегов
bun run export:hashtags ${projectId}

# Публичная версия
bun run export:public ${projectId}
\`\`\`

### 🔄 Обновить данные
\`\`\`bash
# Полное автоматическое обновление
bun run auto:update ${projectId}

# Только скрапинг
bun run scrape:bulk ${projectId}
\`\`\`

---

## 📈 КЛЮЧЕВЫЕ МЕТРИКИ

| Метрика | Значение | Статус |
|---------|----------|--------|
| Средний ER | ${formatPercent(totalEngagementRate)} | ${totalEngagementRate > 2 ? "🟢 Отлично" : totalEngagementRate > 1 ? "🟡 Хорошо" : "🔴 Требует улучшения"} |
| Охват лидера | ${formatNumber(Number(topCompetitors[0]?.totalViews || 0))} | ${Number(topCompetitors[0]?.totalViews || 0) > 1000000 ? "🟢 Высокий" : "🟡 Средний"} |
| Активность | ${formatNumber(Number(stats.totalReels || 0))} публикаций | ${Number(stats.totalReels || 0) > 500 ? "🟢 Высокая" : Number(stats.totalReels || 0) > 100 ? "🟡 Средняя" : "🔴 Низкая"} |

---

## 🎨 КОНТЕНТ-ПЛАНИРОВАНИЕ

### 📅 Рекомендации на неделю
- [ ] Проанализировать стратегию **@${topCompetitors[0]?.username || "лидера"}**
- [ ] Протестировать хэштег **#${topHashtags[0]?.hashtag || "топовый"}**
- [ ] Создать контент по трендовому формату
- [ ] Обновить конкурентный анализ

### 🎯 Приоритетные направления
1. **Изучение лидеров** - анализ @${topCompetitors
    .slice(0, 2)
    .map((c) => c.username)
    .join(", @")}
2. **Эффективные хэштеги** - фокус на #${topHashtags
    .slice(0, 2)
    .map((h) => h.hashtag)
    .join(", #")}
3. **Повышение ER** - цель превысить ${formatPercent(totalEngagementRate * 1.2)}
4. **Расширение охвата** - стремиться к ${formatNumber(Math.round(Number(stats.avgViews || 0) * 1.5))} просмотров в среднем

---

## 🔄 АВТОМАТИЗАЦИЯ

### ⏰ Настроенные процессы
- ✅ **Ежедневное обновление** в 9:00
- ✅ **Анализ конкурентов** автоматически
- ✅ **Отслеживание хэштегов** в реальном времени
- ✅ **Создание отчетов** без участия человека

### 📊 Следующие обновления
- **Завтра:** ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("ru-RU")}
- **Еженедельный отчет:** Понедельник
- **Месячная аналитика:** 1 число

---

## 📞 ПОДДЕРЖКА И РЕСУРСЫ

### 🔧 Техническая документация
- [[QUICK_START|Быстрый старт]]
- [[AUTOMATION_GUIDE|Руководство по автоматизации]]
- [[CURRENT_STATE|Текущее состояние]]

### 📊 Внешние инструменты
- [Instagram Business](https://business.instagram.com)
- [Hashtag Analytics](https://hashtagify.me)
- [Google Trends](https://trends.google.com)

---

*Последнее обновление: ${new Date().toLocaleString("ru-RU")}*

**🏭 Ваш контент-завод работает на полную мощность!**`;

  // Сохраняем обзор
  const dashboardDir = path.join(obsidianPath, "content-factory", "dashboard");
  fs.mkdirSync(dashboardDir, { recursive: true });

  const overviewFileName = `factory-overview-${projectInfo.name.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().split("T")[0]}.md`;
  const overviewFilePath = path.join(dashboardDir, overviewFileName);

  fs.writeFileSync(overviewFilePath, overviewContent, "utf8");

  console.log(`✅ Обзор контент-завода создан: ${overviewFileName}`);
  console.log(`📁 Путь: ${overviewFilePath}`);
  console.log(`📊 Конкурентов: ${competitorCount[0]?.count || 0}`);
  console.log(`🏷️ Хэштегов: ${hashtagCount[0]?.count || 0}`);
  console.log(`🎬 Публикаций: ${formatNumber(Number(stats.totalReels || 0))}`);

  await closeDBConnection();
}

main().catch(async (err) => {
  console.error("❌ Ошибка:", err);
  await closeDBConnection();
});
