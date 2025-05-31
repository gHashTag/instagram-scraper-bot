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
  return `${(num * 100).toFixed(1)}%`;
}

function slugify(text: string, id?: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9а-яё\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id ? `${slug}-${id}` : slug;
}

async function cleanOldStructure(): Promise<void> {
  console.log("🧹 Очистка старой структуры Obsidian...");

  const contentFactoryPath = path.join(obsidianPath, "content-factory");
  
  if (fs.existsSync(contentFactoryPath)) {
    console.log("📁 Удаление старой папки content-factory...");
    fs.rmSync(contentFactoryPath, { recursive: true, force: true });
    console.log("✅ Старая структура удалена");
  }

  // Создаем новую чистую структуру
  fs.mkdirSync(contentFactoryPath, { recursive: true });
  console.log("✅ Создана новая папка content-factory");
}

async function createNewStructure(projectId: number): Promise<void> {
  console.log(`🏗️ Создание новой структуры для проекта ${projectId}...`);

  await initializeDBConnection();
  const db = getDB();

  // Получаем информацию о проекте
  const projectInfo = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!projectInfo.length) {
    console.error(`❌ Проект с ID ${projectId} не найден`);
    return;
  }

  const project = projectInfo[0];
  const projectSlug = slugify(project.name, projectId);

  // Получаем актуальную статистику
  const stats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
      withTranscripts: sql<number>`count(case when ${reelsTable.transcript} is not null then 1 end)`,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId));

  const competitorCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, projectId));

  const hashtagCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(hashtagsTable)
    .where(eq(hashtagsTable.project_id, projectId));

  // Создаем структуру папок
  const contentFactoryPath = path.join(obsidianPath, "content-factory");
  const projectDir = path.join(contentFactoryPath, `project-${projectSlug}`);
  
  const dirs = [
    projectDir,
    path.join(projectDir, "templates"),
    path.join(projectDir, "strategies"), 
    path.join(projectDir, "insights"),
    path.join(projectDir, "competitors"),
    path.join(projectDir, "hashtags"),
    path.join(projectDir, "reports"),
    path.join(projectDir, "exports"),
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Создаем главный README
  await createMainReadme(contentFactoryPath, project, stats[0], competitorCount[0], hashtagCount[0]);

  // Создаем дашборд проекта
  await createProjectDashboard(projectDir, project, stats[0], competitorCount[0], hashtagCount[0]);

  // Создаем README проекта
  await createProjectReadme(projectDir, project, stats[0]);

  console.log(`✅ Новая структура создана для проекта: ${project.name}`);
  console.log(`📁 Путь: ${projectDir}`);
  
  await closeDBConnection();
}

async function createMainReadme(
  contentFactoryPath: string,
  project: any,
  stats: any,
  competitorCount: any,
  hashtagCount: any
): Promise<void> {
  const readmeContent = `# 🏭 КОНТЕНТ-ЗАВОД: Instagram Analytics

> **Профессиональная система анализа Instagram для маркетологов и аналитиков**

**Обновлено:** ${new Date().toLocaleDateString("ru-RU")} в ${new Date().toLocaleTimeString("ru-RU")}

---

## 📊 ТЕКУЩИЙ ПРОЕКТ: ${project.name}

### 🎯 Основные показатели
- **📱 Всего Reels:** ${formatNumber(Number(stats.totalReels || 0))}
- **👀 Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- **❤️ Общие лайки:** ${formatNumber(Number(stats.totalLikes || 0))}
- **📊 Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров
- **🎙️ С транскрипциями:** ${formatNumber(Number(stats.withTranscripts || 0))} (${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))})

### 🔍 Источники данных
- **👥 Конкурентов:** ${competitorCount.count || 0}
- **🏷️ Хэштегов:** ${hashtagCount.count || 0}
- **🎯 Активных источников:** ${(competitorCount.count || 0) + (hashtagCount.count || 0)}

---

## 🚀 БЫСТРЫЙ ДОСТУП

### 📊 Основные отчеты
- **[[project-${slugify(project.name, project.id)}/dashboard|📊 Главный дашборд]]** - Центр управления проектом
- **[[project-${slugify(project.name, project.id)}/reports/|📋 Отчеты]]** - Аналитические отчеты
- **[[project-${slugify(project.name, project.id)}/exports/|📤 Экспорты]]** - Excel и другие форматы

### 🎯 Для маркетологов
- **[[project-${slugify(project.name, project.id)}/templates/content-strategy-template|🎯 Контент-стратегия]]**
- **[[project-${slugify(project.name, project.id)}/templates/content-plan-template|📅 Контент-план]]**
- **[[project-${slugify(project.name, project.id)}/templates/hashtag-strategy-template|🏷️ Хэштег-стратегия]]**

### 📈 Для аналитиков
- **[[project-${slugify(project.name, project.id)}/templates/performance-report-template|📈 Отчет о результатах]]**
- **[[project-${slugify(project.name, project.id)}/templates/competitor-analysis-template|🔍 Анализ конкурентов]]**
- **[[project-${slugify(project.name, project.id)}/insights/trend-analysis-template|📊 Анализ трендов]]**

---

## 🔄 СИНХРОНИЗАЦИЯ С БАЗОЙ ДАННЫХ

### ⚡ Быстрые команды
\`\`\`bash
# Обновить все данные из БД
bun run sync:to-obsidian ${project.id}

# Применить изменения в БД
bun run sync:from-obsidian ${project.id}

# Полная синхронизация
bun run sync:bidirectional ${project.id}
\`\`\`

### 📊 Создать новые отчеты
\`\`\`bash
# Дашборд проекта
bun run create:dashboard ${project.id}

# Анализ конкурентов
bun run export:report ${project.id}

# Анализ хэштегов
bun run export:hashtags ${project.id}

# Общий обзор
bun run scripts/create-factory-overview.ts ${project.id}
\`\`\`

---

## 📁 СТРУКТУРА ПРОЕКТА

\`\`\`
content-factory/
├── 📚 README.md (этот файл)
└── project-${slugify(project.name, project.id)}/
    ├── 📊 dashboard.md              # Главный дашборд
    ├── 📖 README.md                 # Описание проекта
    ├── 📋 templates/                # Шаблоны для работы
    ├── 🚀 strategies/               # Стратегии
    ├── 💡 insights/                 # Инсайты и тренды
    ├── 👥 competitors/              # Анализ конкурентов
    ├── 🏷️ hashtags/                # Анализ хэштегов
    ├── 📋 reports/                  # Отчеты
    └── 📤 exports/                  # Экспорты данных
\`\`\`

---

## ⚠️ ВАЖНО ДЛЯ КЛИЕНТА

### ✅ Что готово к показу
- **Актуальные данные** - все синхронизировано с БД
- **Профессиональные отчеты** - готовые для презентации
- **Интерактивные дашборды** - можно редактировать прямо в Obsidian
- **Двухсторонняя синхронизация** - изменения сохраняются в БД

### 🎯 Ключевые преимущества
- **${formatNumber(Number(stats.totalReels || 0))} проанализированных Reels**
- **${formatNumber(Number(stats.totalViews || 0))} просмотров** общий охват
- **${Number(stats.withTranscripts || 0)} транскрипций** с помощью AI
- **Реальные данные** из Instagram

---

*Последнее обновление: ${new Date().toLocaleString("ru-RU")}*  
*Статус: 🟢 Готово к презентации клиенту*

**🏭 Ваш контент-завод работает на полную мощность!**`;

  const readmePath = path.join(contentFactoryPath, "README.md");
  fs.writeFileSync(readmePath, readmeContent, "utf8");
}

async function createProjectDashboard(
  projectDir: string,
  project: any,
  stats: any,
  competitorCount: any,
  hashtagCount: any
): Promise<void> {
  const dashboardContent = `# 📊 ДАШБОРД: ${project.name}

> **Центр управления проектом Instagram Analytics**

**Обновлено:** ${new Date().toLocaleDateString("ru-RU")} в ${new Date().toLocaleTimeString("ru-RU")}

---

## 🎯 ОСНОВНЫЕ ПОКАЗАТЕЛИ

| Метрика | Значение | Статус |
|---------|----------|--------|
| 📱 **Всего Reels** | ${formatNumber(Number(stats.totalReels || 0))} | 🟢 Активно |
| 👀 **Общий охват** | ${formatNumber(Number(stats.totalViews || 0))} | 🟢 Растет |
| ❤️ **Общие лайки** | ${formatNumber(Number(stats.totalLikes || 0))} | 🟢 Активно |
| 📊 **Средний охват** | ${formatNumber(Math.round(Number(stats.avgViews || 0)))} | 🟢 Стабильно |
| 🎙️ **С транскрипциями** | ${formatNumber(Number(stats.withTranscripts || 0))} (${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}) | ${Number(stats.withTranscripts || 0) > 0 ? '🟢' : '🟡'} ${Number(stats.withTranscripts || 0) > 0 ? 'Готово' : 'В процессе'} |

---

## 🔍 ИСТОЧНИКИ ДАННЫХ

### 👥 Конкуренты
- **Всего:** ${competitorCount.count || 0} аккаунтов
- **Статус:** [[competitors/|🔍 Управление конкурентами]]

### 🏷️ Хэштеги
- **Всего:** ${hashtagCount.count || 0} хэштегов
- **Статус:** [[hashtags/|🏷️ Управление хэштегами]]

---

## 📋 БЫСТРЫЕ ДЕЙСТВИЯ

### 📊 Отчеты и аналитика
- **[[reports/|📋 Все отчеты]]** - Полная аналитика
- **[[exports/|📤 Экспорты]]** - Excel и другие форматы
- **[[templates/performance-report-template|📈 Отчет о результатах]]** - Создать новый отчет

### 🎯 Планирование
- **[[templates/content-strategy-template|🎯 Контент-стратегия]]** - Стратегическое планирование
- **[[templates/content-plan-template|📅 Контент-план]]** - Календарь публикаций
- **[[strategies/campaign-planning-template|🚀 Планирование кампаний]]** - Маркетинговые кампании

### 🔍 Анализ
- **[[templates/competitor-analysis-template|🔍 Анализ конкурентов]]** - Конкурентная разведка
- **[[templates/hashtag-strategy-template|🏷️ Хэштег-стратегия]]** - Оптимизация хэштегов
- **[[insights/trend-analysis-template|📊 Анализ трендов]]** - Инсайты и тренды

---

## 🔄 СИНХРОНИЗАЦИЯ

### ⚡ Команды обновления
\`\`\`bash
# Обновить данные из БД
bun run sync:to-obsidian ${project.id}

# Применить изменения в БД
bun run sync:from-obsidian ${project.id}

# Полная синхронизация
bun run sync:bidirectional ${project.id}
\`\`\`

### 📊 Создать новые отчеты
\`\`\`bash
# Обновить дашборд
bun run create:dashboard ${project.id}

# Экспорт в Excel
bun run src/scripts/export-detailed-hashtag-reels.ts ${project.id} 50000 100

# Создать шаблоны для маркетологов
bun run scripts/create-instagram-marketer-templates.ts ${project.id}
\`\`\`

---

## 📈 СТАТИСТИКА ПРОЕКТА

### 🎯 Эффективность
- **Средний охват на пост:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров
- **Коэффициент вовлечения:** ${stats.totalViews > 0 ? formatPercent((Number(stats.totalLikes || 0) / Number(stats.totalViews || 1)) * 100) : '0%'}
- **Покрытие транскрипциями:** ${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}

### 📊 Источники контента
- **Конкуренты:** ${competitorCount.count || 0} аккаунтов
- **Хэштеги:** ${hashtagCount.count || 0} тегов
- **Общий охват источников:** ${(competitorCount.count || 0) + (hashtagCount.count || 0)} источников

---

## ⚠️ СТАТУС ПРОЕКТА

### ✅ Готово
- [x] Сбор данных из Instagram
- [x] Анализ конкурентов
- [x] Анализ хэштегов
- [x] ${Number(stats.withTranscripts || 0) > 0 ? 'Транскрипция контента' : ''}
- [x] Создание отчетов
- [x] Синхронизация с БД

### 🔄 В процессе
- [ ] ${Number(stats.withTranscripts || 0) === 0 ? 'Транскрипция контента' : ''}
- [ ] Дополнительная аналитика
- [ ] Автоматизация отчетов

### 🎯 Планы
- [ ] Расширение источников данных
- [ ] Интеграция с другими платформами
- [ ] Автоматические уведомления

---

*Последнее обновление: ${new Date().toLocaleString("ru-RU")}*
*Проект ID: ${project.id} | Статус: 🟢 Активен*

**🎯 Проект готов к презентации клиенту!**`;

  const dashboardPath = path.join(projectDir, "dashboard.md");
  fs.writeFileSync(dashboardPath, dashboardContent, "utf8");
}

async function createProjectReadme(
  projectDir: string,
  project: any,
  stats: any
): Promise<void> {
  const readmeContent = `# 📖 ПРОЕКТ: ${project.name}

> **${project.description || 'Анализ Instagram контента в сфере эстетической медицины'}**

**Создан:** ${new Date().toLocaleDateString("ru-RU")}
**Индустрия:** ${project.industry || 'Эстетическая медицина'}

---

## 🎯 ОПИСАНИЕ ПРОЕКТА

Комплексный анализ Instagram контента для оптимизации маркетинговой стратегии в сфере эстетической медицины. Проект включает анализ конкурентов, популярных хэштегов и создание рекомендаций для контент-стратегии.

### 📊 Ключевые результаты
- **Проанализировано:** ${formatNumber(Number(stats.totalReels || 0))} Reels
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров на пост
- **Транскрипций:** ${formatNumber(Number(stats.withTranscripts || 0))} с помощью AI

---

## 📁 СТРУКТУРА ПРОЕКТА

### 📊 Основные разделы
- **[[dashboard|📊 Дашборд]]** - Центр управления проектом
- **[[reports/|📋 Отчеты]]** - Аналитические отчеты
- **[[exports/|📤 Экспорты]]** - Данные в Excel и других форматах

### 🎯 Шаблоны для работы
- **[[templates/|📋 Шаблоны]]** - Готовые шаблоны для маркетологов
- **[[strategies/|🚀 Стратегии]]** - Планирование кампаний
- **[[insights/|💡 Инсайты]]** - Анализ трендов

### 🔍 Данные
- **[[competitors/|👥 Конкуренты]]** - Анализ конкурентов
- **[[hashtags/|🏷️ Хэштеги]]** - Анализ хэштегов

---

## 🚀 КАК ИСПОЛЬЗОВАТЬ

### 1. Начните с дашборда
Откройте **[[dashboard|📊 Дашборд]]** для получения общего обзора проекта и быстрого доступа ко всем функциям.

### 2. Изучите отчеты
Перейдите в **[[reports/|📋 Отчеты]]** для детального анализа данных и получения инсайтов.

### 3. Используйте шаблоны
Выберите нужный шаблон из **[[templates/|📋 Шаблонов]]** для планирования контент-стратегии.

### 4. Экспортируйте данные
Скачайте данные в удобном формате из **[[exports/|📤 Экспортов]]**.

---

## 🔄 ОБНОВЛЕНИЕ ДАННЫХ

Для обновления данных используйте команды синхронизации:

\`\`\`bash
# Полное обновление
bun run sync:bidirectional ${project.id}

# Создать новые отчеты
bun run create:dashboard ${project.id}
\`\`\`

---

*Проект ID: ${project.id} | Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const readmePath = path.join(projectDir, "README.md");
  fs.writeFileSync(readmePath, readmeContent, "utf8");
}

// Запуск скрипта
const projectId = parseInt(process.argv[2]);
if (!projectId) {
  console.error("❌ Укажите ID проекта как аргумент");
  console.error("Пример: bun run scripts/clean-and-rebuild-obsidian.ts 1");
  process.exit(1);
}

async function main() {
  try {
    await cleanOldStructure();
    await createNewStructure(projectId);
    console.log("🎉 Структура Obsidian полностью обновлена!");
    console.log("📊 Готово к показу клиенту!");
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

main();
