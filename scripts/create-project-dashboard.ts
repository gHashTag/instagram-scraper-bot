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
    console.error("Пример: bun run create:dashboard 1");
    process.exit(1);
  }

  const projectId = parseInt(projectIdArg, 10);

  console.log(`🚀 Создание дашборда для проекта ${projectId}...`);

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
  console.log(`📊 Создаем дашборд для проекта: ${projectInfo.name}`);

  // Общая статистика
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
  const competitorStats = await db
    .select({
      totalCompetitors: sql<number>`count(${competitorsTable.id})`,
      competitorReels: sql<number>`count(${reelsTable.id})`,
      competitorViews: sql<number>`sum(${reelsTable.views_count})`,
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
    .where(eq(competitorsTable.project_id, projectId));

  // Статистика по хэштегам
  const hashtagStats = await db
    .select({
      totalHashtags: sql<number>`count(${hashtagsTable.id})`,
      hashtagReels: sql<number>`count(${reelsTable.id})`,
      hashtagViews: sql<number>`sum(${reelsTable.views_count})`,
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
    .where(eq(hashtagsTable.project_id, projectId));

  const stats = totalStats[0];
  const compStats = competitorStats[0];
  const hashStats = hashtagStats[0];

  const totalEngagementRate =
    Number(stats.totalViews) > 0
      ? (Number(stats.totalLikes) / Number(stats.totalViews)) * 100
      : 0;

  // Создаем структуру папок для проекта
  const projectSlug = (() => {
    function slugify(str: string, fallbackId: number): string {
      // Простая таблица транслитерации для русского алфавита
      const map: Record<string, string> = {
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ё: "e",
        ж: "zh",
        з: "z",
        и: "i",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "h",
        ц: "c",
        ч: "ch",
        ш: "sh",
        щ: "shch",
        ъ: "",
        ы: "y",
        ь: "",
        э: "e",
        ю: "yu",
        я: "ya",
      };

      const transliterated = str
        .split("")
        .map((ch) => {
          const lower = ch.toLowerCase();
          if (map[lower]) {
            return map[lower];
          }
          // Latin letters and numbers
          if (/[a-z0-9]/i.test(ch)) return ch;
          return "-"; // заменяем все прочие символы на тире
        })
        .join("");

      let slug = transliterated
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // любые группы символов, не являющихся латиницей/цифрами -> "-"
        .replace(/^-+|-+$/g, "") // обрезаем ведущие/замыкающие тире
        .replace(/-+/g, "-"); // схлопываем подряд идущие тире

      if (!slug) {
        slug = String(fallbackId);
      }
      return slug;
    }

    return slugify(projectInfo.name, projectId);
  })();
  const projectDir = path.join(
    obsidianPath,
    "content-factory",
    `project-${projectSlug}`
  );

  fs.mkdirSync(projectDir, { recursive: true });

  // Создаем дашборд
  const dashboardContent = `# 🏭 КОНТЕНТ-ЗАВОД: ${projectInfo.name}

> **Центральный дашборд проекта**  
> Последнее обновление: ${new Date().toLocaleString("ru-RU")}

---

## 📊 ОБЩАЯ СТАТИСТИКА ПРОЕКТА

| Метрика | Значение |
|---------|----------|
| 🎬 **Всего Reels** | ${formatNumber(Number(stats.totalReels || 0))} |
| 👀 **Общие просмотры** | ${formatNumber(Number(stats.totalViews || 0))} |
| ❤️ **Общие лайки** | ${formatNumber(Number(stats.totalLikes || 0))} |
| 📊 **Средние просмотры** | ${formatNumber(Math.round(Number(stats.avgViews || 0)))} |
| 💫 **Engagement Rate** | ${formatPercent(totalEngagementRate)} |

---

## 🎯 МОДУЛИ АНАЛИЗА

### 👥 КОНКУРЕНТЫ
- **Количество:** ${Number(compStats.totalCompetitors || 0)} конкурентов
- **Reels:** ${formatNumber(Number(compStats.competitorReels || 0))}
- **Просмотры:** ${formatNumber(Number(compStats.competitorViews || 0))}

📁 **Отчеты:** [[competitors/]]
- [[competitors/competitors-analysis-${new Date().toISOString().split("T")[0]}.md|Последний анализ конкурентов]]

### 🏷️ ХЭШТЕГИ
- **Количество:** ${Number(hashStats.totalHashtags || 0)} хэштегов
- **Reels:** ${formatNumber(Number(hashStats.hashtagReels || 0))}
- **Просмотры:** ${formatNumber(Number(hashStats.hashtagViews || 0))}

📁 **Отчеты:** [[hashtags/]]
- [[hashtags/hashtags-analysis-${new Date().toISOString().split("T")[0]}.md|Последний анализ хэштегов]]

---

## 🚀 БЫСТРЫЕ ДЕЙСТВИЯ

### 📊 Создать отчеты
\`\`\`bash
# Анализ конкурентов
bun run export:report ${projectId}

# Анализ хэштегов  
bun run export:hashtags ${projectId}

# Публичный отчет
bun run export:public ${projectId}
\`\`\`

### 🔄 Обновить данные
\`\`\`bash
# Автоматическое обновление
bun run auto:update ${projectId}

# Скрапинг конкурентов
bun run scrape:bulk ${projectId}
\`\`\`

---

## 📈 ТРЕНДЫ И ИНСАЙТЫ

### 🎯 Ключевые метрики
- **Лучший ER:** ${formatPercent(totalEngagementRate)}
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))}
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))}

### 📊 Распределение контента
- **Конкуренты:** ${Math.round((Number(compStats.competitorReels || 0) / Number(stats.totalReels || 1)) * 100)}%
- **Хэштеги:** ${Math.round((Number(hashStats.hashtagReels || 0) / Number(stats.totalReels || 1)) * 100)}%

---

## 📁 СТРУКТУРА ПРОЕКТА

\`\`\`
project-${projectSlug}/
├── 📊 dashboard.md (этот файл)
├── 👥 competitors/
│   └── competitors-analysis-YYYY-MM-DD.md
├── 🏷️ hashtags/
│   └── hashtags-analysis-YYYY-MM-DD.md
└── 📋 reports/
    └── archived-reports/
\`\`\`

---

## 🎯 ПЛАН РАЗВИТИЯ

### ✅ Реализовано
- [x] Анализ конкурентов
- [x] Анализ хэштегов  
- [x] Автоматические отчеты
- [x] Публичные версии

### 🔄 В разработке
- [ ] Анализ трендов музыки
- [ ] Прогнозирование вирусности
- [ ] A/B тестирование контента
- [ ] Интеграция с планировщиком

---

## 📞 КОНТАКТЫ И ПОДДЕРЖКА

**Проект:** ${projectInfo.name}  
**Индустрия:** ${projectInfo.industry || "Не указано"}  
**Создан:** ${new Date(projectInfo.created_at).toLocaleDateString("ru-RU")}

---

*Дашборд автоматически обновляется при создании новых отчетов*`;

  const dashboardPath = path.join(projectDir, "dashboard.md");
  fs.writeFileSync(dashboardPath, dashboardContent, "utf8");

  // Создаем README для общего понимания
  const readmeContent = `# 📖 README: Проект ${projectInfo.name}

## 🎯 Описание
Контент-завод для анализа конкурентов и хэштегов в сфере ${projectInfo.industry || "эстетической медицины"}.

## 📁 Структура
- **dashboard.md** - главный дашборд проекта
- **competitors/** - анализ конкурентов
- **hashtags/** - анализ хэштегов
- **reports/** - архив отчетов

## 🚀 Как использовать
1. Откройте [[dashboard.md]] для общего обзора
2. Изучите последние отчеты в соответствующих папках
3. Используйте команды из дашборда для обновления данных

## 📊 Автоматизация
Отчеты обновляются автоматически каждый день в 9:00 утра.

---
*Создано: ${new Date().toLocaleString("ru-RU")}*`;

  const readmePath = path.join(projectDir, "README.md");
  fs.writeFileSync(readmePath, readmeContent, "utf8");

  console.log(`✅ Дашборд создан: dashboard.md`);
  console.log(`📁 Путь: ${dashboardPath}`);
  console.log(
    `📊 Общая статистика: ${formatNumber(Number(stats.totalReels || 0))} Reels`
  );
  console.log(`👥 Конкурентов: ${Number(compStats.totalCompetitors || 0)}`);
  console.log(`🏷️ Хэштегов: ${Number(hashStats.totalHashtags || 0)}`);

  await closeDBConnection();
}

main().catch(async (err) => {
  console.error("❌ Ошибка:", err);
  await closeDBConnection();
});
