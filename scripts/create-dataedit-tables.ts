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
import { eq, and, desc, sql, isNotNull, gt } from "drizzle-orm";

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

async function createDataEditTables(): Promise<void> {
  console.log("📊 Создание редактируемых таблиц DataEdit для Coco Age...");

  await initializeDBConnection();
  const db = getDB();

  // Получаем данные для таблиц
  const topReels = await db
    .select({
      url: reelsTable.reel_url,
      author: reelsTable.author_username,
      views: reelsTable.views_count,
      likes: reelsTable.likes_count,
      description: reelsTable.description,
      transcript: reelsTable.transcript,
      audioTitle: reelsTable.audio_title,
      publishedAt: reelsTable.published_at,
    })
    .from(reelsTable)
    .where(and(
      eq(reelsTable.project_id, 1),
      gt(reelsTable.views_count, 100000)
    ))
    .orderBy(desc(reelsTable.views_count))
    .limit(50);

  const competitors = await db
    .select({
      username: competitorsTable.username,
      fullName: competitorsTable.full_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
      maxViews: sql<number>`max(${reelsTable.views_count})`,
    })
    .from(competitorsTable)
    .leftJoin(reelsTable, and(
      eq(reelsTable.project_id, competitorsTable.project_id),
      eq(reelsTable.source_type, "competitor"),
      eq(reelsTable.source_identifier, sql`${competitorsTable.id}::text`)
    ))
    .where(eq(competitorsTable.project_id, 1))
    .groupBy(competitorsTable.id, competitorsTable.username, competitorsTable.full_name)
    .having(sql`count(${reelsTable.id}) > 0`)
    .orderBy(desc(sql<number>`avg(${reelsTable.views_count})`));

  // Создаем директорию для таблиц
  const contentFactoryPath = path.join(obsidianPath, "content-factory");
  const tablesDir = path.join(contentFactoryPath, "📊-DataEdit-Tables");
  fs.mkdirSync(tablesDir, { recursive: true });

  // Создаем редактируемые таблицы
  await createTopContentTable(tablesDir, topReels);
  await createCompetitorsTable(tablesDir, competitors);
  await createContentPlanningTable(tablesDir);
  await createContentIdeasTable(tablesDir);

  console.log(`📊 Редактируемые таблицы созданы: ${tablesDir}`);
  await closeDBConnection();
}

async function createTopContentTable(tablesDir: string, topReels: any[]): Promise<void> {
  const tableContent = `# 📊 Топ-контент для анализа (DataEdit)

#DataEdit #TopContent #CocoAge #ViralAnalysis

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 🔥 Редактируемая таблица топ-контента

> **Используйте DataEdit плагин для редактирования данных прямо в таблице**

### 📋 Инструкция по использованию
1. **Анализ:** Изучите метрики успешного контента
2. **Планирование:** Отметьте идеи для адаптации
3. **Статус:** Обновляйте статус работы с контентом
4. **Заметки:** Добавляйте свои инсайты и идеи

---

## 📊 Таблица топ-контента

\`\`\`dataedit
TABLE author, views, likes, engagement_rate, adaptation_status, notes, content_idea
FROM "top-content"
\`\`\`

---

## 📝 Данные для анализа

${topReels.map((reel, index) => {
  const engagementRate = ((reel.likes / reel.views) * 100).toFixed(2);
  return `
### ${index + 1}. @${reel.author} - ${formatNumber(reel.views)} просмотров

---
author: "${reel.author}"
views: ${reel.views}
likes: ${reel.likes}
engagement_rate: "${engagementRate}%"
adaptation_status: "Не начато"
notes: ""
content_idea: ""
url: "${reel.url}"
description: "${reel.description?.substring(0, 100) || 'Без описания'}..."
transcript: "${reel.transcript?.substring(0, 150) || 'Нет транскрипции'}..."
audio: "${reel.audioTitle || 'Оригинальный звук'}"
published: "${new Date(reel.publishedAt).toLocaleDateString('ru-RU')}"
tags: [viral, high-engagement, ${reel.views > 1000000 ? 'mega-viral' : 'popular'}]
---
`;
}).join('')}

---

## 🎯 Статусы адаптации

### 📋 Возможные статусы
- **Не начато** - Контент не анализировался
- **В анализе** - Изучаем структуру и подход
- **Планируется** - Готовим адаптацию для Coco Age
- **В работе** - Создаем контент на основе анализа
- **Готово** - Контент адаптирован и опубликован
- **Отклонено** - Не подходит для нашего бренда

### 💡 Примеры заметок
- "Отличная структура хука - адаптировать для anti-age"
- "Использовать аналогичную цветовую схему"
- "Формат до/после идеален для наших кейсов"
- "Эмоциональная подача - взять за основу"

---

**Возврат к заводу:** [[🏭 Контент-завод - Главная|🏭 Главная]]

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#DataEdit #TopContent #CocoAge #ViralAnalysis`;

  const tablePath = path.join(tablesDir, "Top-Content-Analysis.md");
  fs.writeFileSync(tablePath, tableContent, "utf8");
}

async function createCompetitorsTable(tablesDir: string, competitors: any[]): Promise<void> {
  const tableContent = `# 👥 Анализ конкурентов (DataEdit)

#DataEdit #Competitors #CocoAge #CompetitiveAnalysis

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 🔍 Редактируемая таблица конкурентов

> **Отслеживайте и анализируйте стратегии конкурентов**

### 📋 Как использовать
1. **Мониторинг:** Регулярно обновляйте данные о конкурентах
2. **Анализ:** Изучайте их успешные стратегии
3. **Планирование:** Определяйте возможности для Coco Age
4. **Действия:** Планируйте конкретные шаги

---

## 📊 Таблица конкурентов

\`\`\`dataedit
TABLE username, avg_views, max_views, content_count, analysis_status, key_strengths, opportunities, action_plan
FROM "competitors"
\`\`\`

---

## 📝 Данные конкурентов

${competitors.map((comp, index) => `
### ${index + 1}. @${comp.username}

---
username: "${comp.username}"
full_name: "${comp.fullName || 'Не указано'}"
avg_views: ${Math.round(Number(comp.avgViews || 0))}
max_views: ${Number(comp.maxViews || 0)}
content_count: ${Number(comp.reelsCount || 0)}
analysis_status: "Требует анализа"
key_strengths: ""
opportunities: ""
action_plan: ""
last_updated: "${new Date().toLocaleDateString('ru-RU')}"
priority: "${index < 3 ? 'Высокий' : 'Средний'}"
tags: [competitor, ${index < 3 ? 'top-tier' : 'mid-tier'}, beauty]
---
`).join('')}

---

## 🎯 Статусы анализа

### 📋 Возможные статусы
- **Требует анализа** - Конкурент добавлен, но не изучен
- **В процессе** - Анализируем контент и стратегию
- **Проанализирован** - Анализ завершен, инсайты получены
- **Мониторинг** - Регулярно отслеживаем изменения
- **Неактивен** - Конкурент потерял актуальность

### 💪 Примеры сильных сторон
- "Высокое качество видео"
- "Эффективные хуки в первые 3 секунды"
- "Сильная экспертная позиция"
- "Отличное взаимодействие с аудиторией"

### 🎯 Примеры возможностей
- "Не используют тренды - можем опередить"
- "Слабая визуальная подача - наше преимущество"
- "Не показывают процесс - можем быть более открытыми"
- "Мало образовательного контента - наша ниша"

---

**Возврат к заводу:** [[🏭 Контент-завод - Главная|🏭 Главная]]

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#DataEdit #Competitors #CocoAge #CompetitiveAnalysis`;

  const tablePath = path.join(tablesDir, "Competitors-Analysis.md");
  fs.writeFileSync(tablePath, tableContent, "utf8");
}

async function createContentPlanningTable(tablesDir: string): Promise<void> {
  const tableContent = `# 📅 Планирование контента (DataEdit)

#DataEdit #ContentPlanning #CocoAge #Schedule

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 📋 Редактируемый план контента

> **Планируйте и отслеживайте создание контента для Coco Age**

### 🎯 Как использовать
1. **Планирование:** Добавляйте новые идеи контента
2. **Статус:** Отслеживайте прогресс создания
3. **Метрики:** Планируйте ожидаемые результаты
4. **Анализ:** Сравнивайте план с фактическими результатами

---

## 📊 Таблица планирования

\`\`\`dataedit
TABLE content_title, content_type, planned_date, status, expected_views, actual_views, notes, inspiration_source
FROM "content-planning"
\`\`\`

---

## 📝 Шаблоны контента для планирования

### Неделя 1

---
content_title: "5 ошибок в anti-age уходе"
content_type: "Образовательный"
planned_date: "2025-01-06"
status: "Планируется"
expected_views: 50000
actual_views: 0
notes: "Адаптация топ-поста конкурента"
inspiration_source: "@competitor_username"
format: "Reels"
duration: "30 сек"
hashtags: "#antiage #уход #ошибки #красота"
cta: "Записывайтесь на консультацию"
tags: [educational, viral-potential, high-priority]
---

---
content_title: "Преображение Анны за месяц"
content_type: "Кейс"
planned_date: "2025-01-08"
status: "В работе"
expected_views: 75000
actual_views: 0
notes: "Реальный кейс клиентки"
inspiration_source: "Собственный контент"
format: "Reels"
duration: "25 сек"
hashtags: "#доипосле #результат #преображение"
cta: "Хотите такой же результат?"
tags: [case-study, before-after, conversion-focused]
---

---
content_title: "Как проходит биоревитализация"
content_type: "Продуктовый"
planned_date: "2025-01-10"
status: "Идея"
expected_views: 40000
actual_views: 0
notes: "Показать процесс процедуры"
inspiration_source: "Запросы клиентов"
format: "Reels"
duration: "30 сек"
hashtags: "#биоревитализация #процедуры #коcoage"
cta: "Записывайтесь на процедуру"
tags: [product, educational, behind-scenes]
---

### Неделя 2

---
content_title: "Мифы о косметологии"
content_type: "Образовательный"
planned_date: "2025-01-13"
status: "Планируется"
expected_views: 60000
actual_views: 0
notes: "Развеиваем популярные мифы"
inspiration_source: "Вопросы клиентов"
format: "Карусель"
duration: "N/A"
hashtags: "#мифы #косметология #правда"
cta: "Узнайте правду на консультации"
tags: [educational, myth-busting, engagement]
---

---
content_title: "Кокосовая философия красоты"
content_type: "Lifestyle"
planned_date: "2025-01-15"
status: "Идея"
expected_views: 30000
actual_views: 0
notes: "Философия бренда Coco Age"
inspiration_source: "Брендинг"
format: "Reels"
duration: "20 сек"
hashtags: "#cocoage #философия #красота"
cta: "Согласны с нашей философией?"
tags: [lifestyle, brand, philosophy]
---

---

## 🎯 Статусы контента

### 📋 Возможные статусы
- **Идея** - Концепция контента сформулирована
- **Планируется** - Добавлено в календарь публикаций
- **В работе** - Создается контент (съемка, монтаж)
- **Готов** - Контент готов к публикации
- **Опубликован** - Контент опубликован в Instagram
- **Анализируется** - Изучаем результаты публикации

### 📊 Типы контента
- **Образовательный** (40%) - Советы, инструкции, мифы
- **Кейс** (30%) - Результаты клиентов, до/после
- **Продуктовый** (20%) - Процедуры, услуги, процессы
- **Lifestyle** (10%) - Философия бренда, команда

### 🎬 Форматы
- **Reels** - Основной формат для охвата
- **Карусель** - Для детальной информации
- **Stories** - Для взаимодействия с аудиторией
- **IGTV** - Для длинного контента

---

**Возврат к заводу:** [[🏭 Контент-завод - Главная|🏭 Главная]]

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#DataEdit #ContentPlanning #CocoAge #Schedule`;

  const planningPath = path.join(tablesDir, "Content-Planning.md");
  fs.writeFileSync(planningPath, tableContent, "utf8");
}

async function createContentIdeasTable(tablesDir: string): Promise<void> {
  const tableContent = `# 💡 Банк идей контента (DataEdit)

#DataEdit #ContentIdeas #CocoAge #CreativeBank

**Обновлено:** ${new Date().toLocaleString("ru-RU")}

---

## 🧠 Редактируемый банк идей

> **Собирайте и развивайте идеи для контента Coco Age**

### 💭 Как использовать
1. **Сбор идей:** Добавляйте любые идеи, которые приходят в голову
2. **Развитие:** Дорабатывайте концепции до готовых планов
3. **Приоритизация:** Оценивайте потенциал каждой идеи
4. **Планирование:** Переносите лучшие идеи в календарь

---

## 📊 Таблица идей

\`\`\`dataedit
TABLE idea_title, category, priority, viral_potential, difficulty, status, notes, inspiration
FROM "content-ideas"
\`\`\`

---

## 💡 Банк идей для разработки

### Образовательные идеи

---
idea_title: "10 секретов молодой кожи"
category: "Образовательный"
priority: "Высокий"
viral_potential: "8/10"
difficulty: "Легко"
status: "Новая идея"
notes: "Список простых, но эффективных советов"
inspiration: "Популярные запросы в Google"
estimated_views: 70000
target_audience: "Женщины 25-40"
hook: "Эти секреты знают только косметологи"
cta: "Сохраняйте и применяйте"
tags: [educational, tips, viral-potential]
---

---
idea_title: "Что происходит с кожей во время сна"
category: "Образовательный"
priority: "Средний"
viral_potential: "6/10"
difficulty: "Средне"
status: "Новая идея"
notes: "Научный подход к ночному восстановлению"
inspiration: "Исследования о сне и коже"
estimated_views: 45000
target_audience: "Женщины 30-50"
hook: "Ваша кожа работает, пока вы спите"
cta: "Узнайте, как помочь коже восстанавливаться"
tags: [educational, science, night-care]
---

### Кейсы и результаты

---
idea_title: "Мама и дочь: семейное преображение"
category: "Кейс"
priority: "Высокий"
viral_potential: "9/10"
difficulty: "Сложно"
status: "Требует клиента"
notes: "Эмоциональная история семьи"
inspiration: "Семейные ценности"
estimated_views: 100000
target_audience: "Женщины всех возрастов"
hook: "Мама и дочь решили преобразиться вместе"
cta: "Приводите близких - скидка на парные процедуры"
tags: [case-study, family, emotional]
---

---
idea_title: "Невеста за 3 месяца до свадьбы"
category: "Кейс"
priority: "Высокий"
viral_potential: "8/10"
difficulty: "Средне"
status: "Ищем клиентку"
notes: "Подготовка к важному дню"
inspiration: "Свадебный сезон"
estimated_views: 80000
target_audience: "Невесты, женщины 25-35"
hook: "Как стать самой красивой невестой"
cta: "Готовитесь к свадьбе? Мы поможем!"
tags: [case-study, wedding, transformation]
---

### Продуктовые идеи

---
idea_title: "Создание индивидуального коктейля"
category: "Продуктовый"
priority: "Средний"
viral_potential: "7/10"
difficulty: "Средне"
status: "Новая идея"
notes: "Показать процесс подбора ингредиентов"
inspiration: "Персонализация услуг"
estimated_views: 55000
target_audience: "Женщины 30-45"
hook: "Каждая кожа уникальна, как и уход за ней"
cta: "Создадим ваш персональный коктейль"
tags: [product, personalization, behind-scenes]
---

### Lifestyle идеи

---
idea_title: "Утренний ритуал косметолога"
category: "Lifestyle"
priority: "Низкий"
viral_potential: "5/10"
difficulty: "Легко"
status: "Новая идея"
notes: "Личный уход специалиста"
inspiration: "Интерес к экспертам"
estimated_views: 35000
target_audience: "Женщины 25-40"
hook: "Как ухаживает за собой косметолог"
cta: "Хотите такую же кожу?"
tags: [lifestyle, expert, morning-routine]
---

---

## 🎯 Система оценки идей

### 📊 Приоритет
- **Высокий** - Реализовать в первую очередь
- **Средний** - Хорошая идея для будущего
- **Низкий** - Резерв на случай нехватки идей

### 🔥 Вирусный потенциал (1-10)
- **9-10** - Очень высокий шанс стать вирусным
- **7-8** - Хороший потенциал охвата
- **5-6** - Средний охват
- **3-4** - Низкий охват
- **1-2** - Нишевый контент

### ⚡ Сложность реализации
- **Легко** - Можно снять за 1-2 часа
- **Средне** - Требует подготовки и планирования
- **Сложно** - Нужны особые условия или участники

### 📋 Статусы идей
- **Новая идея** - Только добавлена в банк
- **В разработке** - Прорабатываем детали
- **Готова к съемке** - Все подготовлено
- **Требует клиента** - Нужен участник
- **Отложена** - Не актуальна сейчас
- **Реализована** - Контент создан

---

**Возврат к заводу:** [[🏭 Контент-завод - Главная|🏭 Главная]]

*Обновлено: ${new Date().toLocaleString("ru-RU")}*

#DataEdit #ContentIdeas #CocoAge #CreativeBank`;

  const ideasPath = path.join(tablesDir, "Content-Ideas-Bank.md");
  fs.writeFileSync(ideasPath, ideasContent, "utf8");
}
