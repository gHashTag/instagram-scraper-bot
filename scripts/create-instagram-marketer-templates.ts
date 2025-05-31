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

async function createInstagramMarketerTemplates(projectId: number): Promise<void> {
  console.log(`🎨 Создание шаблонов для Instagram-маркетологов для проекта ${projectId}...`);

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

  // Получаем статистику
  const stats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId));

  // Получаем топ-контент
  const topContent = await db
    .select({
      url: reelsTable.reel_url,
      author: reelsTable.author_username,
      views: reelsTable.views_count,
      likes: reelsTable.likes_count,
      description: reelsTable.description,
      audioTitle: reelsTable.audio_title,
      publishedAt: reelsTable.published_at,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId))
    .orderBy(desc(reelsTable.views_count))
    .limit(10);

  // Получаем конкурентов
  const competitors = await db
    .select({
      username: competitorsTable.username,
      fullName: competitorsTable.full_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
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
    .groupBy(competitorsTable.id, competitorsTable.username, competitorsTable.full_name)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`))
    .limit(5);

  // Получаем хэштеги
  const hashtags = await db
    .select({
      tagName: hashtagsTable.tag_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
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
    .limit(10);

  const projectDir = path.join(
    obsidianPath,
    "content-factory",
    `project-${projectSlug}`
  );

  // Создаем директории
  const templatesDir = path.join(projectDir, "templates");
  const strategiesDir = path.join(projectDir, "strategies");
  const insightsDir = path.join(projectDir, "insights");
  
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(strategiesDir, { recursive: true });
  fs.mkdirSync(insightsDir, { recursive: true });

  // Создаем шаблоны
  await createContentStrategyTemplate(templatesDir, project, stats[0], topContent, competitors, hashtags);
  await createCompetitorAnalysisTemplate(templatesDir, project, competitors, topContent);
  await createHashtagStrategyTemplate(templatesDir, project, hashtags, topContent);
  await createContentPlanTemplate(templatesDir, project, topContent, hashtags);
  await createPerformanceReportTemplate(templatesDir, project, stats[0], topContent);
  await createTrendAnalysisTemplate(insightsDir, project, topContent, hashtags);
  await createInfluencerOutreachTemplate(strategiesDir, project, competitors);
  await createCampaignPlanningTemplate(strategiesDir, project, hashtags, topContent);

  console.log(`✅ Шаблоны для Instagram-маркетологов созданы в: ${templatesDir}`);
  console.log(`📊 Стратегии созданы в: ${strategiesDir}`);
  console.log(`💡 Инсайты созданы в: ${insightsDir}`);
}

async function createContentStrategyTemplate(
  templatesDir: string,
  project: any,
  stats: any,
  topContent: any[],
  competitors: any[],
  hashtags: any[]
): Promise<void> {
  const template = `# 🎯 КОНТЕНТ-СТРАТЕГИЯ: ${project.name}

> **Шаблон для разработки контент-стратегии в Instagram**

**Дата создания:** ${new Date().toLocaleDateString("ru-RU")}
**Проект:** ${project.name}
**Индустрия:** ${project.industry || "Эстетическая медицина"}

---

## 📊 ТЕКУЩИЕ ПОКАЗАТЕЛИ

### 🎬 Контент-метрики
- **Всего публикаций:** ${formatNumber(Number(stats.totalReels || 0))}
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров
- **Общее вовлечение:** ${formatNumber(Number(stats.totalLikes || 0))} лайков

### 🎯 Цели на месяц
- [ ] **Охват:** Увеличить на ____%
- [ ] **Вовлечение:** Достичь ER ____%
- [ ] **Подписчики:** Прирост +____
- [ ] **Конверсии:** ____ лидов

---

## 🏆 АНАЛИЗ УСПЕШНОГО КОНТЕНТА

### 📈 Топ-форматы по охвату
${topContent.slice(0, 5).map((content, index) => `
${index + 1}. **${formatNumber(content.views)} просмотров** - @${content.author}
   - **Формат:** ${content.audioTitle ? "С музыкой" : "Без музыки"}
   - **Тема:** ${content.description?.substring(0, 100) || "Описание отсутствует"}...
   - **Дата:** ${new Date(content.publishedAt).toLocaleDateString("ru-RU")}
`).join("")}

### 💡 Выводы для стратегии
- **Лучшее время публикации:** _____ (анализ по датам)
- **Эффективные форматы:** _____
- **Популярные темы:** _____
- **Оптимальная длительность:** _____ секунд

---

## 👥 КОНКУРЕНТНЫЙ АНАЛИЗ

### 🔍 Топ-конкуренты
${competitors.map((comp, index) => `
${index + 1}. **@${comp.username}** ${comp.fullName ? `(${comp.fullName})` : ""}
   - **Публикаций:** ${Number(comp.reelsCount || 0)}
   - **Общий охват:** ${formatNumber(Number(comp.totalViews || 0))}
   - **Средний охват:** ${comp.reelsCount > 0 ? formatNumber(Math.round(Number(comp.totalViews || 0) / Number(comp.reelsCount))) : "0"}
   - **Что копировать:** _____
   - **Что улучшить:** _____
`).join("")}

### 📋 Задачи по конкурентам
- [ ] Проанализировать контент-план топ-3 конкурентов
- [ ] Выявить их слабые места
- [ ] Найти неохваченные темы
- [ ] Создать уникальное позиционирование

---

## 🏷️ ХЭШТЕГ-СТРАТЕГИЯ

### 📊 Эффективные хэштеги
${hashtags.slice(0, 8).map((tag, index) => `
${index + 1}. **#${tag.tagName}**
   - **Публикаций:** ${Number(tag.reelsCount || 0)}
   - **Общий охват:** ${formatNumber(Number(tag.totalViews || 0))}
   - **Средний охват:** ${tag.reelsCount > 0 ? formatNumber(Math.round(Number(tag.totalViews || 0) / Number(tag.reelsCount))) : "0"}
`).join("")}

### 🎯 Хэштег-микс (30 хэштегов)
- **Высокочастотные (5-7):** _____
- **Среднечастотные (15-20):** _____
- **Низкочастотные (5-8):** _____
- **Брендовые (2-3):** _____

---

## 📅 КОНТЕНТ-ПЛАН НА МЕСЯЦ

### 📊 Распределение контента
- **Образовательный (40%):** _____ постов
- **Развлекательный (30%):** _____ постов
- **Продающий (20%):** _____ постов
- **Личный бренд (10%):** _____ постов

### 🗓️ Календарь публикаций
| День недели | Время | Тип контента | Тема |
|-------------|-------|--------------|------|
| Понедельник | _____ | _____ | _____ |
| Вторник | _____ | _____ | _____ |
| Среда | _____ | _____ | _____ |
| Четверг | _____ | _____ | _____ |
| Пятница | _____ | _____ | _____ |
| Суббота | _____ | _____ | _____ |
| Воскресенье | _____ | _____ | _____ |

---

## 🎨 КРЕАТИВНЫЕ ИДЕИ

### 💡 Форматы для тестирования
- [ ] **До/После** - трансформации клиентов
- [ ] **Процесс работы** - закулисье процедур
- [ ] **Обучающий контент** - советы и лайфхаки
- [ ] **Отзывы клиентов** - социальные доказательства
- [ ] **Тренды и челленджи** - актуальные форматы
- [ ] **Мифы vs Реальность** - развенчание заблуждений

### 🎬 Идеи для Reels
1. **"Секреты красоты"** - быстрые советы
2. **"День из жизни косметолога"** - личный бренд
3. **"Результаты за 30 секунд"** - до/после
4. **"Отвечаю на вопросы"** - экспертность
5. **"Разбор процедуры"** - образование

---

## 📈 KPI И МЕТРИКИ

### 🎯 Еженедельные цели
- **Охват:** _____ просмотров
- **Вовлечение:** _____ лайков/комментариев
- **Сохранения:** _____ saves
- **Переходы в профиль:** _____ кликов
- **Новые подписчики:** _____ человек

### 📊 Отслеживание результатов
| Неделя | Охват | ER | Подписчики | Лиды |
|--------|-------|----|-----------|----- |
| 1 | _____ | _____ | _____ | _____ |
| 2 | _____ | _____ | _____ | _____ |
| 3 | _____ | _____ | _____ | _____ |
| 4 | _____ | _____ | _____ | _____ |

---

## 🔄 ОПТИМИЗАЦИЯ И ТЕСТИРОВАНИЕ

### A/B тесты для проведения
- [ ] **Время публикации:** утро vs вечер
- [ ] **Тип обложки:** лицо vs текст
- [ ] **Длительность:** 15 сек vs 30 сек
- [ ] **Хэштеги:** много vs мало
- [ ] **CTA:** разные призывы к действию

### 📝 Выводы и корректировки
- **Что работает:** _____
- **Что не работает:** _____
- **Что тестировать дальше:** _____

---

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

**🎯 Используйте этот шаблон для планирования и анализа вашей Instagram-стратегии!**`;

  const filePath = path.join(templatesDir, "content-strategy-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createCompetitorAnalysisTemplate(
  templatesDir: string,
  project: any,
  competitors: any[],
  topContent: any[]
): Promise<void> {
  const template = `# 🔍 АНАЛИЗ КОНКУРЕНТОВ: ${project.name}

> **Шаблон для глубокого анализа конкурентов в Instagram**

**Дата анализа:** ${new Date().toLocaleDateString("ru-RU")}
**Проект:** ${project.name}
**Индустрия:** ${project.industry || "Эстетическая медицина"}

---

## 👥 ОСНОВНЫЕ КОНКУРЕНТЫ

${competitors.map((comp, index) => `
### ${index + 1}. @${comp.username} ${comp.fullName ? `(${comp.fullName})` : ""}

#### 📊 Статистика
- **Публикаций:** ${Number(comp.reelsCount || 0)}
- **Общий охват:** ${formatNumber(Number(comp.totalViews || 0))}
- **Средний охват:** ${comp.reelsCount > 0 ? formatNumber(Math.round(Number(comp.totalViews || 0) / Number(comp.reelsCount))) : "0"}

#### 🎯 Позиционирование
- **Основная ниша:** _____
- **Целевая аудитория:** _____
- **Уникальное предложение:** _____
- **Ценовой сегмент:** _____

#### 📱 Контент-стратегия
- **Основные форматы:** _____
- **Частота публикаций:** _____
- **Лучшее время постинга:** _____
- **Популярные темы:** _____

#### 💪 Сильные стороны
- [ ] _____
- [ ] _____
- [ ] _____

#### ⚠️ Слабые стороны
- [ ] _____
- [ ] _____
- [ ] _____

#### 💡 Что можно перенять
- [ ] _____
- [ ] _____
- [ ] _____

#### 🚀 Как можем превзойти
- [ ] _____
- [ ] _____
- [ ] _____

---
`).join("")}

## 📈 СРАВНИТЕЛЬНЫЙ АНАЛИЗ

### 🏆 Рейтинг по метрикам
| Конкурент | Охват | Вовлечение | Качество | Частота | Общий балл |
|-----------|-------|------------|----------|---------|------------|
${competitors.map(comp => `| @${comp.username} | ___/10 | ___/10 | ___/10 | ___/10 | ___/40 |`).join("\n")}

### 📊 Анализ контента
| Тип контента | Лидер | Наша позиция | Возможности |
|--------------|-------|--------------|-------------|
| Образовательный | _____ | _____ | _____ |
| Развлекательный | _____ | _____ | _____ |
| Продающий | _____ | _____ | _____ |
| До/После | _____ | _____ | _____ |
| Процессы | _____ | _____ | _____ |

---

## 🎨 КРЕАТИВНЫЙ АНАЛИЗ

### 💡 Успешные форматы конкурентов
1. **Формат:** _____
   - **Кто использует:** _____
   - **Средний охват:** _____
   - **Почему работает:** _____
   - **Как адаптировать:** _____

2. **Формат:** _____
   - **Кто использует:** _____
   - **Средний охват:** _____
   - **Почему работает:** _____
   - **Как адаптировать:** _____

3. **Формат:** _____
   - **Кто использует:** _____
   - **Средний охват:** _____
   - **Почему работает:** _____
   - **Как адаптировать:** _____

### 🎬 Неиспользуемые ниши
- [ ] **Ниша 1:** _____
- [ ] **Ниша 2:** _____
- [ ] **Ниша 3:** _____

---

## 🏷️ ХЭШТЕГ-АНАЛИЗ

### 📊 Популярные хэштеги конкурентов
| Хэштег | Частота | Охват | Конкуренция | Рекомендация |
|--------|---------|-------|-------------|--------------|
| #_____ | _____ | _____ | Высокая/Средняя/Низкая | Использовать/Избегать |
| #_____ | _____ | _____ | Высокая/Средняя/Низкая | Использовать/Избегать |
| #_____ | _____ | _____ | Высокая/Средняя/Низкая | Использовать/Избегать |

### 🎯 Наша хэштег-стратегия
- **Уникальные хэштеги:** _____
- **Брендовые хэштеги:** _____
- **Локальные хэштеги:** _____

---

## 📱 СОЦИАЛЬНЫЕ СЕТИ

### 📊 Присутствие конкурентов
| Конкурент | Instagram | TikTok | YouTube | Telegram | Сайт |
|-----------|-----------|--------|---------|----------|------|
${competitors.map(comp => `| @${comp.username} | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |`).join("\n")}

### 🎯 Возможности для нас
- [ ] **Неохваченные платформы:** _____
- [ ] **Кросс-промо возможности:** _____
- [ ] **Интеграция с другими каналами:** _____

---

## 💰 МОНЕТИЗАЦИЯ

### 💵 Модели заработка конкурентов
1. **@_____:** _____
2. **@_____:** _____
3. **@_____:** _____

### 🎯 Наши возможности
- [ ] **Услуги:** _____
- [ ] **Продукты:** _____
- [ ] **Партнерства:** _____
- [ ] **Реклама:** _____

---

## 📋 ПЛАН ДЕЙСТВИЙ

### 🚀 Краткосрочные задачи (1 месяц)
- [ ] _____
- [ ] _____
- [ ] _____

### 🎯 Среднесрочные задачи (3 месяца)
- [ ] _____
- [ ] _____
- [ ] _____

### 🏆 Долгосрочные цели (6-12 месяцев)
- [ ] _____
- [ ] _____
- [ ] _____

---

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

**🔍 Регулярно обновляйте этот анализ для отслеживания изменений в конкурентной среде!**`;

  const filePath = path.join(templatesDir, "competitor-analysis-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createHashtagStrategyTemplate(
  templatesDir: string,
  project: any,
  hashtags: any[],
  topContent: any[]
): Promise<void> {
  const template = `# 🏷️ ХЭШТЕГ-СТРАТЕГИЯ: ${project.name}

> **Шаблон для оптимизации хэштег-стратегии в Instagram**

**Дата:** ${new Date().toLocaleDateString("ru-RU")}

## 📊 ТЕКУЩИЕ ХЭШТЕГИ

${hashtags.slice(0, 10).map((tag, index) => `
### ${index + 1}. #${tag.tagName}
- **Публикаций:** ${Number(tag.reelsCount || 0)}
- **Общий охват:** ${formatNumber(Number(tag.totalViews || 0))}
- **Эффективность:** ${tag.reelsCount > 0 ? formatNumber(Math.round(Number(tag.totalViews || 0) / Number(tag.reelsCount))) : "0"} просмотров/пост
`).join("")}

## 🎯 ХЭШТЕГ-МИКС

### Высокочастотные (5-7 хэштегов)
- #_____
- #_____

### Среднечастотные (15-20 хэштегов)
- #_____
- #_____

### Низкочастотные (5-8 хэштегов)
- #_____
- #_____

### Брендовые (2-3 хэштега)
- #_____
- #_____

## 📈 ПЛАН ТЕСТИРОВАНИЯ

- [ ] Тест 1: _____
- [ ] Тест 2: _____
- [ ] Тест 3: _____

*Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const filePath = path.join(templatesDir, "hashtag-strategy-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createContentPlanTemplate(
  templatesDir: string,
  project: any,
  topContent: any[],
  hashtags: any[]
): Promise<void> {
  const template = `# 📅 КОНТЕНТ-ПЛАН: ${project.name}

> **Шаблон для планирования контента в Instagram**

**Месяц:** ${new Date().toLocaleDateString("ru-RU")}

## 📊 ЦЕЛИ НА МЕСЯЦ

- **Охват:** _____ просмотров
- **Вовлечение:** _____ лайков
- **Подписчики:** +_____ человек
- **Лиды:** _____ заявок

## 🗓️ КАЛЕНДАРЬ ПУБЛИКАЦИЙ

| Дата | Время | Тип | Тема | Хэштеги | Статус |
|------|-------|-----|------|---------|--------|
| _____ | _____ | _____ | _____ | _____ | ⏳/✅ |

## 🎨 ИДЕИ ДЛЯ КОНТЕНТА

### Образовательный контент (40%)
- [ ] Идея 1: _____
- [ ] Идея 2: _____

### Развлекательный контент (30%)
- [ ] Идея 1: _____
- [ ] Идея 2: _____

### Продающий контент (20%)
- [ ] Идея 1: _____
- [ ] Идея 2: _____

### Личный бренд (10%)
- [ ] Идея 1: _____
- [ ] Идея 2: _____

*Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const filePath = path.join(templatesDir, "content-plan-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createPerformanceReportTemplate(
  templatesDir: string,
  project: any,
  stats: any,
  topContent: any[]
): Promise<void> {
  const template = `# 📈 ОТЧЕТ О РЕЗУЛЬТАТАХ: ${project.name}

> **Шаблон для анализа эффективности Instagram-аккаунта**

**Период:** ${new Date().toLocaleDateString("ru-RU")}

## 📊 ОСНОВНЫЕ МЕТРИКИ

- **Всего публикаций:** ${formatNumber(Number(stats.totalReels || 0))}
- **Общий охват:** ${formatNumber(Number(stats.totalViews || 0))}
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))}
- **Общее вовлечение:** ${formatNumber(Number(stats.totalLikes || 0))}

## 🏆 ТОП-КОНТЕНТ

${topContent.slice(0, 5).map((content, index) => `
${index + 1}. **${formatNumber(content.views)} просмотров** - @${content.author}
   - Дата: ${new Date(content.publishedAt).toLocaleDateString("ru-RU")}
`).join("")}

## 📋 ВЫВОДЫ И РЕКОМЕНДАЦИИ

### ✅ Что работает хорошо
- _____
- _____

### ⚠️ Что нужно улучшить
- _____
- _____

### 🚀 Планы на следующий период
- _____
- _____

*Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const filePath = path.join(templatesDir, "performance-report-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createTrendAnalysisTemplate(
  insightsDir: string,
  project: any,
  topContent: any[],
  hashtags: any[]
): Promise<void> {
  const template = `# 📊 АНАЛИЗ ТРЕНДОВ: ${project.name}

> **Инсайты и тренды в индустрии**

**Дата:** ${new Date().toLocaleDateString("ru-RU")}

## 🔥 АКТУАЛЬНЫЕ ТРЕНДЫ

### 1. Тренд: _____
- **Описание:** _____
- **Как использовать:** _____
- **Примеры:** _____

### 2. Тренд: _____
- **Описание:** _____
- **Как использовать:** _____
- **Примеры:** _____

## 💡 ИНСАЙТЫ ИЗ ДАННЫХ

- **Лучшее время публикации:** _____
- **Самые эффективные форматы:** _____
- **Популярные темы:** _____

## 🎯 РЕКОМЕНДАЦИИ

- [ ] Рекомендация 1: _____
- [ ] Рекомендация 2: _____
- [ ] Рекомендация 3: _____

*Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const filePath = path.join(insightsDir, "trend-analysis-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createInfluencerOutreachTemplate(
  strategiesDir: string,
  project: any,
  competitors: any[]
): Promise<void> {
  const template = `# 🤝 СТРАТЕГИЯ РАБОТЫ С ИНФЛЮЕНСЕРАМИ: ${project.name}

> **План сотрудничества с блогерами и экспертами**

**Дата:** ${new Date().toLocaleDateString("ru-RU")}

## 🎯 ЦЕЛИ СОТРУДНИЧЕСТВА

- **Охват:** _____ новых подписчиков
- **Узнаваемость:** _____ упоминаний
- **Лиды:** _____ заявок
- **Продажи:** _____ клиентов

## 👥 ТИПЫ ИНФЛЮЕНСЕРОВ

### Микро-инфлюенсеры (10K-100K)
- **Бюджет:** _____
- **Количество:** _____
- **Формат:** _____

### Макро-инфлюенсеры (100K-1M)
- **Бюджет:** _____
- **Количество:** _____
- **Формат:** _____

## 📋 ПЛАН ДЕЙСТВИЙ

- [ ] Составить список потенциальных партнеров
- [ ] Разработать предложения
- [ ] Запустить кампанию
- [ ] Отследить результаты

*Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const filePath = path.join(strategiesDir, "influencer-outreach-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

async function createCampaignPlanningTemplate(
  strategiesDir: string,
  project: any,
  hashtags: any[],
  topContent: any[]
): Promise<void> {
  const template = `# 🚀 ПЛАНИРОВАНИЕ КАМПАНИИ: ${project.name}

> **Шаблон для планирования маркетинговых кампаний**

**Дата:** ${new Date().toLocaleDateString("ru-RU")}

## 🎯 ЦЕЛИ КАМПАНИИ

- **Основная цель:** _____
- **Метрики успеха:** _____
- **Бюджет:** _____
- **Сроки:** _____

## 📊 ЦЕЛЕВАЯ АУДИТОРИЯ

- **Возраст:** _____
- **Пол:** _____
- **Интересы:** _____
- **Локация:** _____

## 📅 ПЛАН КАМПАНИИ

### Этап 1: Подготовка
- [ ] Задача 1: _____
- [ ] Задача 2: _____

### Этап 2: Запуск
- [ ] Задача 1: _____
- [ ] Задача 2: _____

### Этап 3: Анализ
- [ ] Задача 1: _____
- [ ] Задача 2: _____

## 📈 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

- **Охват:** _____ человек
- **Вовлечение:** _____ взаимодействий
- **Конверсии:** _____ лидов

*Обновлено: ${new Date().toLocaleString("ru-RU")}*`;

  const filePath = path.join(strategiesDir, "campaign-planning-template.md");
  fs.writeFileSync(filePath, template, "utf8");
}

// Запуск скрипта
const projectId = parseInt(process.argv[2]);
if (!projectId) {
  console.error("❌ Укажите ID проекта как аргумент");
  console.error("Пример: bun run scripts/create-instagram-marketer-templates.ts 1");
  process.exit(1);
}

createInstagramMarketerTemplates(projectId)
  .then(() => {
    console.log("🎉 Шаблоны для Instagram-маркетологов успешно созданы!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Ошибка при создании шаблонов:", error);
    process.exit(1);
  });
