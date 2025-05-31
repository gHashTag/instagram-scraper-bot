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

async function createCocoAgeBrand(): Promise<void> {
  console.log("🥥✨ Создание брендированной структуры для Coco Age...");

  await initializeDBConnection();
  const db = getDB();

  // Получаем информацию о проекте
  const projectInfo = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, 1))
    .limit(1);

  if (!projectInfo.length) {
    console.error("❌ Проект Coco Age не найден");
    return;
  }

  const project = projectInfo[0];

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
    .where(eq(reelsTable.project_id, 1));

  const competitorCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, 1));

  const hashtagCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(hashtagsTable)
    .where(eq(hashtagsTable.project_id, 1));

  // Очищаем старую структуру
  const contentFactoryPath = path.join(obsidianPath, "content-factory");
  if (fs.existsSync(contentFactoryPath)) {
    fs.rmSync(contentFactoryPath, { recursive: true, force: true });
  }

  // Создаем новую структуру для Coco Age
  const cocoAgeDir = path.join(contentFactoryPath, "🥥-coco-age-analytics");
  
  const dirs = [
    cocoAgeDir,
    path.join(cocoAgeDir, "📊-dashboard"),
    path.join(cocoAgeDir, "🎯-strategy"),
    path.join(cocoAgeDir, "📈-analytics"),
    path.join(cocoAgeDir, "👥-competitors"),
    path.join(cocoAgeDir, "🏷️-hashtags"),
    path.join(cocoAgeDir, "📋-templates"),
    path.join(cocoAgeDir, "📤-exports"),
    path.join(cocoAgeDir, "💡-insights"),
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Создаем главный README
  await createCocoAgeMainReadme(contentFactoryPath, project, stats[0], competitorCount[0], hashtagCount[0]);

  // Создаем дашборд
  await createCocoAgeDashboard(cocoAgeDir, project, stats[0], competitorCount[0], hashtagCount[0]);

  // Создаем стратегический план
  await createCocoAgeStrategy(cocoAgeDir, project, stats[0]);

  console.log("🥥✨ Брендированная структура Coco Age создана!");
  console.log(`📁 Путь: ${cocoAgeDir}`);
  
  await closeDBConnection();
}

async function createCocoAgeMainReadme(
  contentFactoryPath: string,
  project: any,
  stats: any,
  competitorCount: any,
  hashtagCount: any
): Promise<void> {
  const readmeContent = `# 🥥✨ COCO AGE: Instagram Analytics Dashboard

> **Профессиональная аналитика Instagram для бренда красоты и anti-age**

**🗓️ Обновлено:** ${new Date().toLocaleDateString("ru-RU")} в ${new Date().toLocaleTimeString("ru-RU")}  
**🎯 Проект:** ${project.name}  
**🏢 Индустрия:** ${project.industry}

---

## 🌟 ОСНОВНЫЕ ДОСТИЖЕНИЯ

### 💎 Ключевые показатели
| Метрика | Значение | Статус |
|---------|----------|--------|
| 🎬 **Проанализировано Reels** | ${formatNumber(Number(stats.totalReels || 0))} | 🟢 Завершено |
| 👀 **Общий охват аудитории** | ${formatNumber(Number(stats.totalViews || 0))} | 🚀 Впечатляет |
| ❤️ **Общее вовлечение** | ${formatNumber(Number(stats.totalLikes || 0))} | 💫 Активно |
| 📊 **Средний охват поста** | ${formatNumber(Math.round(Number(stats.avgViews || 0)))} | ⭐ Стабильно |
| 🎙️ **AI транскрипции** | ${formatNumber(Number(stats.withTranscripts || 0))} (${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}) | ${Number(stats.withTranscripts || 0) > 0 ? '✨' : '🔄'} ${Number(stats.withTranscripts || 0) > 0 ? 'Готово' : 'В процессе'} |

### 🔍 Источники инсайтов
- **👥 Конкуренты:** ${competitorCount.count || 0} ведущих брендов
- **🏷️ Хэштеги:** ${hashtagCount.count || 0} трендовых тегов
- **🎯 Общий охват:** ${(competitorCount.count || 0) + (hashtagCount.count || 0)} источников данных

---

## 🚀 НАВИГАЦИЯ ПО ПРОЕКТУ

### 📊 Центр управления
- **[[🥥-coco-age-analytics/📊-dashboard/main-dashboard|📊 Главный дашборд]]** - Центр управления проектом
- **[[🥥-coco-age-analytics/🎯-strategy/brand-strategy|🎯 Стратегия бренда]]** - Стратегическое планирование
- **[[🥥-coco-age-analytics/📈-analytics/performance-overview|📈 Обзор эффективности]]** - Детальная аналитика

### 🎨 Для маркетинг-команды
- **[[🥥-coco-age-analytics/📋-templates/content-calendar|📅 Контент-календарь]]** - Планирование публикаций
- **[[🥥-coco-age-analytics/📋-templates/campaign-planner|🚀 Планировщик кампаний]]** - Маркетинговые кампании
- **[[🥥-coco-age-analytics/💡-insights/trend-analysis|💡 Анализ трендов]]** - Актуальные тренды

### 🔍 Конкурентная разведка
- **[[🥥-coco-age-analytics/👥-competitors/competitor-analysis|👥 Анализ конкурентов]]** - Конкурентная среда
- **[[🥥-coco-age-analytics/🏷️-hashtags/hashtag-strategy|🏷️ Хэштег-стратегия]]** - Оптимизация тегов
- **[[🥥-coco-age-analytics/📤-exports/data-exports|📤 Экспорт данных]]** - Excel отчеты

---

## 🎯 СТРАТЕГИЧЕСКИЕ ИНСАЙТЫ

### 💫 Что работает для Coco Age
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров на пост
- **Коэффициент вовлечения:** ${stats.totalViews > 0 ? formatPercent((Number(stats.totalLikes || 0) / Number(stats.totalViews || 1)) * 100) : '0%'}
- **Покрытие AI-анализом:** ${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}

### 🌟 Конкурентные преимущества
- **Глубокая аналитика:** ${formatNumber(Number(stats.totalReels || 0))} проанализированных постов
- **AI-инсайты:** Транскрипция и анализ контента
- **Реальные данные:** Актуальная информация из Instagram

---

## 🔄 ОБНОВЛЕНИЕ ДАННЫХ

### ⚡ Команды синхронизации
\`\`\`bash
# Полное обновление данных
bun run sync:bidirectional 1

# Создать новые отчеты
bun run create:dashboard 1

# Экспорт для презентации
bun run src/scripts/export-detailed-hashtag-reels.ts 1 50000 100
\`\`\`

### 📊 Создание отчетов
\`\`\`bash
# Брендированные шаблоны
bun run scripts/create-cocoage-brand.ts

# Анализ конкурентов
bun run export:report 1

# Анализ хэштегов
bun run export:hashtags 1
\`\`\`

---

## 🎨 БРЕНДИНГ COCO AGE

### 🥥 Фирменные элементы
- **Цвета:** Кокосовый белый, золотой, нежно-розовый
- **Стиль:** Премиум, элегантный, anti-age
- **Аудитория:** Женщины 25-45 лет, заботящиеся о красоте
- **Позиционирование:** Натуральная красота и молодость

### ✨ Ключевые темы контента
- **Anti-age процедуры** 🌟
- **Натуральный уход** 🌿
- **Результаты "до/после"** ✨
- **Экспертные советы** 💎
- **Lifestyle контент** 🥥

---

## 📈 СТАТУС ПРОЕКТА

### ✅ Завершено
- [x] 🎬 Сбор и анализ ${formatNumber(Number(stats.totalReels || 0))} Reels
- [x] 👥 Анализ ${competitorCount.count || 0} конкурентов
- [x] 🏷️ Исследование ${hashtagCount.count || 0} хэштегов
- [x] 🎙️ AI-транскрипция контента
- [x] 📊 Создание аналитических отчетов
- [x] 🔄 Настройка синхронизации данных

### 🔄 В процессе
- [ ] 📈 Расширенная аналитика трендов
- [ ] 🎯 Персонализированные рекомендации
- [ ] 🤖 Автоматизация отчетов

### 🚀 Планы развития
- [ ] 📱 Интеграция с другими платформами
- [ ] 🎨 Креативные инсайты
- [ ] 📊 Предиктивная аналитика

---

*🥥✨ Создано специально для Coco Age*  
*📅 Последнее обновление: ${new Date().toLocaleString("ru-RU")}*  
*🎯 Статус: 🟢 Готово к презентации*

**🌟 Ваш бренд сияет в Instagram! 🥥✨**`;

  const readmePath = path.join(contentFactoryPath, "🥥✨ COCO AGE - Главная.md");
  fs.writeFileSync(readmePath, readmeContent, "utf8");
}

async function createCocoAgeDashboard(
  cocoAgeDir: string,
  project: any,
  stats: any,
  competitorCount: any,
  hashtagCount: any
): Promise<void> {
  const dashboardContent = `# 📊 COCO AGE: Центр управления

> **🥥✨ Премиум аналитика Instagram для бренда красоты**

**📅 Обновлено:** ${new Date().toLocaleDateString("ru-RU")} в ${new Date().toLocaleTimeString("ru-RU")}

---

## 🌟 ПАНЕЛЬ ПОКАЗАТЕЛЕЙ

### 💎 Основные метрики
| 🎯 Показатель | 📊 Значение | 📈 Статус | 🎨 Тренд |
|---------------|-------------|-----------|----------|
| 🎬 **Контент-база** | ${formatNumber(Number(stats.totalReels || 0))} Reels | 🟢 Полная | ⬆️ Растет |
| 👀 **Охват аудитории** | ${formatNumber(Number(stats.totalViews || 0))} | 🚀 Мощный | ⬆️ Активный |
| ❤️ **Вовлечение** | ${formatNumber(Number(stats.totalLikes || 0))} лайков | 💫 Высокое | ⬆️ Стабильно |
| 📊 **Средний охват** | ${formatNumber(Math.round(Number(stats.avgViews || 0)))} | ⭐ Отличный | ➡️ Стабильно |
| 🎙️ **AI-анализ** | ${formatNumber(Number(stats.withTranscripts || 0))} (${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}) | ${Number(stats.withTranscripts || 0) > 0 ? '✨ Готово' : '🔄 Процесс'} | ${Number(stats.withTranscripts || 0) > 0 ? '✅' : '⏳'} |

### 🔍 Источники инсайтов
- **👥 Конкуренты:** ${competitorCount.count || 0} премиум-брендов
- **🏷️ Хэштеги:** ${hashtagCount.count || 0} трендовых тегов
- **🎯 Покрытие:** ${(competitorCount.count || 0) + (hashtagCount.count || 0)} источников данных

---

## 🚀 БЫСТРЫЕ ДЕЙСТВИЯ

### 📊 Аналитика и отчеты
- **[[📈-analytics/performance-overview|📈 Обзор эффективности]]** - Детальная аналитика
- **[[📤-exports/data-exports|📤 Экспорт данных]]** - Excel отчеты для презентаций
- **[[💡-insights/trend-analysis|💡 Анализ трендов]]** - Актуальные инсайты

### 🎯 Стратегическое планирование
- **[[🎯-strategy/brand-strategy|🎯 Стратегия бренда]]** - Общая стратегия Coco Age
- **[[📋-templates/content-calendar|📅 Контент-календарь]]** - Планирование публикаций
- **[[📋-templates/campaign-planner|🚀 Планировщик кампаний]]** - Маркетинговые активности

### 🔍 Конкурентная разведка
- **[[👥-competitors/competitor-analysis|👥 Анализ конкурентов]]** - Изучение конкурентов
- **[[🏷️-hashtags/hashtag-strategy|🏷️ Хэштег-стратегия]]** - Оптимизация тегов

---

## 🎨 COCO AGE BRAND INSIGHTS

### 🥥 Фирменный стиль в цифрах
- **Средний охват:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров
- **Engagement Rate:** ${stats.totalViews > 0 ? formatPercent((Number(stats.totalLikes || 0) / Number(stats.totalViews || 1)) * 100) : '0%'}
- **AI-покрытие:** ${formatPercent((Number(stats.withTranscripts || 0) / Number(stats.totalReels || 1)))}

### ✨ Ключевые темы для контента
1. **🌟 Anti-age процедуры** - Основная специализация
2. **🥥 Натуральный уход** - Философия бренда
3. **✨ Результаты "до/после"** - Социальные доказательства
4. **💎 Экспертные советы** - Позиционирование эксперта
5. **🌸 Lifestyle контент** - Эмоциональная связь

---

## 🔄 УПРАВЛЕНИЕ ДАННЫМИ

### ⚡ Синхронизация
\`\`\`bash
# Обновить все данные
bun run sync:bidirectional 1

# Создать отчеты
bun run create:dashboard 1

# Экспорт для клиента
bun run src/scripts/export-detailed-hashtag-reels.ts 1 50000 100
\`\`\`

### 📊 Создание отчетов
\`\`\`bash
# Брендированные материалы
bun run scripts/create-cocoage-brand.ts

# Конкурентный анализ
bun run export:report 1

# Хэштег-аналитика
bun run export:hashtags 1
\`\`\`

---

## 📈 СТАТУС ПРОЕКТА COCO AGE

### ✅ Завершенные этапы
- [x] 🎬 Анализ ${formatNumber(Number(stats.totalReels || 0))} постов конкурентов
- [x] 👥 Исследование ${competitorCount.count || 0} ключевых конкурентов
- [x] 🏷️ Анализ ${hashtagCount.count || 0} релевантных хэштегов
- [x] 🎙️ AI-транскрипция и анализ контента
- [x] 📊 Создание аналитических дашбордов
- [x] 🔄 Настройка автоматической синхронизации

### 🔄 Текущие задачи
- [ ] 📈 Углубленный анализ трендов beauty-индустрии
- [ ] 🎯 Персонализированные рекомендации для Coco Age
- [ ] 🤖 Автоматизация еженедельных отчетов

### 🚀 Планы развития
- [ ] 📱 Интеграция с TikTok и YouTube
- [ ] 🎨 Анализ визуального контента
- [ ] 📊 Предиктивная аналитика трендов

---

*🥥✨ Эксклюзивно для Coco Age*
*📅 Обновлено: ${new Date().toLocaleString("ru-RU")}*
*🎯 Статус: 🟢 Готово к работе*

**🌟 Ваш бренд готов покорять Instagram! 🥥✨**`;

  const dashboardPath = path.join(cocoAgeDir, "📊-dashboard", "main-dashboard.md");
  fs.writeFileSync(dashboardPath, dashboardContent, "utf8");
}

async function createCocoAgeStrategy(
  cocoAgeDir: string,
  project: any,
  stats: any
): Promise<void> {
  const strategyContent = `# 🎯 COCO AGE: Стратегия бренда

> **🥥✨ Премиум стратегия развития в Instagram**

**📅 Создано:** ${new Date().toLocaleDateString("ru-RU")}
**🎯 Бренд:** Coco Age
**🏢 Сфера:** Beauty & Anti-Age

---

## 🌟 ПОЗИЦИОНИРОВАНИЕ БРЕНДА

### 🥥 Философия Coco Age
**"Натуральная красота. Вечная молодость. Кокосовая нежность."**

- **🎯 Миссия:** Помогать женщинам сохранять молодость и красоту естественными методами
- **✨ Видение:** Стать №1 брендом anti-age в премиум сегменте
- **💎 Ценности:** Натуральность, эффективность, индивидуальный подход

### 👥 Целевая аудитория
- **🎯 Основная:** Женщины 28-45 лет
- **💰 Доход:** Средний+ и высокий
- **🏙️ География:** Крупные города
- **💭 Интересы:** Красота, здоровье, anti-age, премиум уход

---

## 📊 АНАЛИЗ ТЕКУЩЕЙ ПОЗИЦИИ

### 🏆 Наши преимущества
- **📈 База данных:** ${formatNumber(Number(stats.totalReels || 0))} проанализированных постов
- **🎙️ AI-анализ:** ${formatNumber(Number(stats.withTranscripts || 0))} транскрипций контента
- **👀 Охват:** ${formatNumber(Number(stats.totalViews || 0))} просмотров в анализе
- **📊 Средний результат:** ${formatNumber(Math.round(Number(stats.avgViews || 0)))} просмотров на пост

### 🎯 Ключевые инсайты
1. **🌟 Anti-age контент** показывает высокую вовлеченность
2. **🥥 Натуральные ингредиенты** вызывают доверие аудитории
3. **✨ Результаты "до/после"** генерируют максимальный охват
4. **💎 Экспертный контент** повышает авторитет бренда

---

## 🚀 КОНТЕНТ-СТРАТЕГИЯ

### 📅 Контент-микс (рекомендуемый)
- **🌟 Образовательный (40%)** - Советы по anti-age уходу
- **✨ Результаты (30%)** - До/после, кейсы клиентов
- **🥥 Продуктовый (20%)** - Презентация процедур
- **💎 Lifestyle (10%)** - Философия бренда, команда

### 🎨 Форматы контента
1. **🎬 Reels (приоритет)**
   - Быстрые советы по уходу
   - Процесс процедур
   - Результаты клиентов

2. **📸 Карусели**
   - Пошаговые инструкции
   - Сравнения "до/после"
   - Инфографика о процедурах

3. **📱 Stories**
   - Закулисье клиники
   - Опросы и вопросы
   - Быстрые советы

---

## 🏷️ ХЭШТЕГ-СТРАТЕГИЯ

### 🎯 Фирменные хэштеги
- **#CocoAge** - основной бренд-хэштег
- **#КокосоваяМолодость** - философия бренда
- **#AntiAgeЭксперт** - позиционирование
- **#НатуральнаяКрасота** - ценности

### 📊 Категории хэштегов
- **🔥 Высокочастотные (5-7):** #красота #антиэйдж #уход
- **📈 Среднечастотные (15-20):** #косметология #молодость #процедуры
- **🎯 Низкочастотные (5-8):** #cocoage #натуральныйуход #премиумкосметология
- **🏷️ Брендовые (2-3):** #CocoAge #КокосоваяМолодость

---

## 📈 KPI И МЕТРИКИ

### 🎯 Основные показатели
- **👀 Охват:** +25% ежемесячно
- **❤️ Вовлечение:** ER 3-5%
- **👥 Подписчики:** +500 в месяц
- **💬 Комментарии:** +30% активности
- **📞 Лиды:** 50+ заявок в месяц

### 📊 Отслеживание
- **📱 Instagram Insights** - базовая аналитика
- **📈 Наша система** - углубленный анализ
- **🎙️ AI-транскрипция** - анализ контента конкурентов
- **📊 Еженедельные отчеты** - динамика показателей

---

## 🎨 ВИЗУАЛЬНАЯ КОНЦЕПЦИЯ

### 🥥 Цветовая палитра
- **Основной:** Кокосовый белый (#F8F6F0)
- **Акцент:** Золотой (#D4AF37)
- **Дополнительный:** Нежно-розовый (#F5E6E8)
- **Текст:** Темно-серый (#2C2C2C)

### ✨ Стиль фотографий
- **Освещение:** Мягкое, естественное
- **Композиция:** Минималистичная, элегантная
- **Модели:** Женщины 25-45 лет, естественная красота
- **Настроение:** Спокойствие, уверенность, роскошь

---

## 🚀 ПЛАН РЕАЛИЗАЦИИ

### 📅 Этап 1: Запуск (1-2 месяца)
- [ ] Создание контент-плана на месяц
- [ ] Разработка визуального стиля
- [ ] Запуск регулярных публикаций
- [ ] Настройка аналитики

### 📈 Этап 2: Развитие (3-6 месяцев)
- [ ] Оптимизация контента по метрикам
- [ ] Расширение аудитории
- [ ] Партнерства с инфлюенсерами
- [ ] Запуск рекламных кампаний

### 🏆 Этап 3: Масштабирование (6+ месяцев)
- [ ] Выход на другие платформы
- [ ] Автоматизация процессов
- [ ] Создание комьюнити
- [ ] Развитие экосистемы бренда

---

*🥥✨ Стратегия создана эксклюзивно для Coco Age*
*📅 Дата: ${new Date().toLocaleString("ru-RU")}*
*🎯 Статус: 🟢 Готова к реализации*

**🌟 Время сиять в Instagram! 🥥✨**`;

  const strategyPath = path.join(cocoAgeDir, "🎯-strategy", "brand-strategy.md");
  fs.writeFileSync(strategyPath, strategyContent, "utf8");
}

// Запуск скрипта
createCocoAgeBrand()
  .then(() => {
    console.log("🥥✨ Брендированная структура Coco Age готова!");
  })
  .catch((error) => {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  });
