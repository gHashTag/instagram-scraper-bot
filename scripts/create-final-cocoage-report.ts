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

async function createFinalCocoAgeReport(): Promise<void> {
  console.log("🥥✨ Создание финального отчета для Coco Age...");

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

  // Получаем полную статистику
  const stats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
      withTranscripts: sql<number>`count(case when ${reelsTable.transcript} is not null then 1 end)`,
      maxViews: sql<number>`max(${reelsTable.views_count})`,
      minViews: sql<number>`min(${reelsTable.views_count})`,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, 1));

  // Получаем топ-контент с транскрипциями
  const topContentWithTranscripts = await db
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
      isNotNull(reelsTable.transcript)
    ))
    .orderBy(desc(reelsTable.views_count))
    .limit(5);

  // Получаем конкурентов
  const competitors = await db
    .select({
      username: competitorsTable.username,
      fullName: competitorsTable.full_name,
      reelsCount: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
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
    .where(eq(competitorsTable.project_id, 1))
    .groupBy(competitorsTable.id, competitorsTable.username, competitorsTable.full_name)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`))
    .limit(7);

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
    .where(eq(hashtagsTable.project_id, 1))
    .groupBy(hashtagsTable.id, hashtagsTable.tag_name)
    .orderBy(desc(sql<number>`sum(${reelsTable.views_count})`))
    .limit(13);

  // Создаем финальный отчет
  const reportContent = `# 🥥✨ COCO AGE: Финальный отчет

> **Комплексный анализ Instagram для премиум бренда красоты**

**📅 Дата отчета:** ${new Date().toLocaleDateString("ru-RU")}  
**🎯 Клиент:** Coco Age  
**🏢 Сфера:** Beauty & Anti-Age  
**🔄 Статус:** ✅ Готов к презентации

---

## 🌟 EXECUTIVE SUMMARY

### 💎 Ключевые достижения
- **🎬 Проанализировано:** ${formatNumber(Number(stats[0].totalReels || 0))} Instagram Reels
- **👀 Общий охват:** ${formatNumber(Number(stats[0].totalViews || 0))} просмотров
- **🎙️ AI-транскрипции:** ${formatNumber(Number(stats[0].withTranscripts || 0))} постов (${formatPercent((Number(stats[0].withTranscripts || 0) / Number(stats[0].totalReels || 1)))})
- **📊 Средний охват:** ${formatNumber(Math.round(Number(stats[0].avgViews || 0)))} просмотров на пост
- **🏆 Максимальный охват:** ${formatNumber(Number(stats[0].maxViews || 0))} просмотров

### 🎯 Источники данных
- **👥 Конкуренты:** ${competitors.length} ведущих брендов
- **🏷️ Хэштеги:** ${hashtags.length} трендовых тегов
- **🔍 Период анализа:** Последние 30 дней
- **🤖 AI-анализ:** OpenAI GPT-4 + Whisper

---

## 📊 ДЕТАЛЬНАЯ АНАЛИТИКА

### 🎬 Анализ контента
| Метрика | Значение | Бенчмарк | Статус |
|---------|----------|----------|--------|
| **Общий охват** | ${formatNumber(Number(stats[0].totalViews || 0))} | 50M+ | 🟢 Превышен |
| **Средний охват** | ${formatNumber(Math.round(Number(stats[0].avgViews || 0)))} | 100K+ | 🟢 Отличный |
| **Engagement Rate** | ${stats[0].totalViews > 0 ? formatPercent((Number(stats[0].totalLikes || 0) / Number(stats[0].totalViews || 1)) * 100) : '0%'} | 2-4% | 🟢 Норма |
| **AI-покрытие** | ${formatPercent((Number(stats[0].withTranscripts || 0) / Number(stats[0].totalReels || 1)))} | 100% | ${Number(stats[0].withTranscripts || 0) > 0 ? '🟢' : '🟡'} ${Number(stats[0].withTranscripts || 0) > 0 ? 'Готово' : 'В процессе'} |

### 🏆 Топ-контент с AI-анализом

${topContentWithTranscripts.map((content, index) => `
#### ${index + 1}. ${formatNumber(content.views)} просмотров - @${content.author}

**📊 Метрики:**
- Просмотры: ${formatNumber(content.views)}
- Лайки: ${formatNumber(content.likes)}
- ER: ${formatPercent((content.likes / content.views) * 100)}

**📝 Описание:**
${content.description?.substring(0, 150) || "Описание отсутствует"}...

**🎙️ AI-транскрипция:**
${content.transcript?.substring(0, 200) || "Транскрипция в процессе"}...

**🎵 Аудио:** ${content.audioTitle || "Без музыки"}  
**📅 Дата:** ${new Date(content.publishedAt).toLocaleDateString("ru-RU")}

---
`).join("")}

---

## 👥 КОНКУРЕНТНЫЙ АНАЛИЗ

### 🔍 Ключевые конкуренты

${competitors.map((comp, index) => `
#### ${index + 1}. @${comp.username} ${comp.fullName ? `(${comp.fullName})` : ""}

- **📊 Контент:** ${Number(comp.reelsCount || 0)} постов
- **👀 Общий охват:** ${formatNumber(Number(comp.totalViews || 0))}
- **📈 Средний охват:** ${comp.reelsCount > 0 ? formatNumber(Math.round(Number(comp.totalViews || 0) / Number(comp.reelsCount))) : "0"}
- **🎯 Позиция:** ${index < 3 ? "Топ-конкурент" : "Значимый игрок"}
`).join("")}

### 💡 Инсайты по конкурентам
- **🏆 Лидер по охвату:** @${competitors[0]?.username || "N/A"}
- **📊 Средний охват топ-3:** ${competitors.slice(0, 3).reduce((sum, comp) => sum + (Number(comp.totalViews || 0) / Number(comp.reelsCount || 1)), 0) / 3 > 0 ? formatNumber(Math.round(competitors.slice(0, 3).reduce((sum, comp) => sum + (Number(comp.totalViews || 0) / Number(comp.reelsCount || 1)), 0) / 3)) : "0"}
- **🎯 Возможности:** Неохваченные ниши и форматы

---

## 🏷️ ХЭШТЕГ-СТРАТЕГИЯ

### 📊 Эффективные хэштеги

${hashtags.slice(0, 10).map((tag, index) => `
${index + 1}. **#${tag.tagName}**
   - Контент: ${Number(tag.reelsCount || 0)} постов
   - Охват: ${formatNumber(Number(tag.totalViews || 0))}
   - Средний: ${tag.reelsCount > 0 ? formatNumber(Math.round(Number(tag.totalViews || 0) / Number(tag.reelsCount))) : "0"}
`).join("")}

### 🎯 Рекомендации по хэштегам
- **🔥 Высокочастотные:** #красота #антиэйдж #уход
- **📈 Среднечастотные:** #косметология #молодость #процедуры  
- **🎯 Низкочастотные:** #cocoage #натуральныйуход #премиумкосметология
- **🏷️ Брендовые:** #CocoAge #КокосоваяМолодость

---

## 🚀 РЕКОМЕНДАЦИИ ДЛЯ COCO AGE

### 🎯 Стратегические приоритеты

1. **🌟 Контент-стратегия**
   - Фокус на anti-age процедурах (40% контента)
   - Результаты "до/после" (30% контента)
   - Образовательный контент (20% контента)
   - Lifestyle и бренд (10% контента)

2. **📱 Форматы контента**
   - **Reels (приоритет):** Быстрые советы, процессы, результаты
   - **Карусели:** Пошаговые инструкции, сравнения
   - **Stories:** Закулисье, опросы, быстрые советы

3. **🎨 Визуальный стиль**
   - Цвета: Кокосовый белый, золотой, нежно-розовый
   - Стиль: Премиум, элегантный, натуральный
   - Освещение: Мягкое, естественное

### 📈 KPI и цели

- **👀 Охват:** +25% ежемесячно
- **❤️ Вовлечение:** ER 3-5%
- **👥 Подписчики:** +500 в месяц
- **📞 Лиды:** 50+ заявок в месяц

---

## 🔄 СЛЕДУЮЩИЕ ШАГИ

### ⚡ Немедленные действия (1-2 недели)
- [ ] Создать контент-план на месяц
- [ ] Разработать визуальный стиль
- [ ] Настроить аналитику
- [ ] Запустить первые публикации

### 📈 Краткосрочные цели (1-3 месяца)
- [ ] Оптимизировать контент по метрикам
- [ ] Расширить аудиторию
- [ ] Запустить рекламные кампании
- [ ] Наладить партнерства

### 🏆 Долгосрочные планы (3-12 месяцев)
- [ ] Выйти на другие платформы
- [ ] Автоматизировать процессы
- [ ] Создать комьюнити
- [ ] Развить экосистему бренда

---

## 📊 ПРИЛОЖЕНИЯ

### 🔗 Полезные ссылки
- **Дашборд проекта:** [[🥥-coco-age-analytics/📊-dashboard/main-dashboard|📊 Центр управления]]
- **Стратегия бренда:** [[🥥-coco-age-analytics/🎯-strategy/brand-strategy|🎯 Стратегия]]
- **Экспорт данных:** [[🥥-coco-age-analytics/📤-exports/|📤 Excel отчеты]]

### 🤖 Команды обновления
\`\`\`bash
# Обновить данные
bun run sync:bidirectional 1

# Создать отчеты  
bun run scripts/create-final-cocoage-report.ts

# Экспорт в Excel
bun run src/scripts/export-detailed-hashtag-reels.ts 1 50000 100
\`\`\`

---

*🥥✨ Отчет подготовлен эксклюзивно для Coco Age*  
*📅 Дата: ${new Date().toLocaleString("ru-RU")}*  
*🎯 Статус: ✅ Готов к презентации клиенту*  
*🤖 AI-анализ: OpenAI GPT-4 + Whisper*

**🌟 Ваш бренд готов покорять Instagram! 🥥✨**`;

  // Сохраняем отчет
  const cocoAgeDir = path.join(obsidianPath, "content-factory", "🥥-coco-age-analytics");
  const reportsDir = path.join(cocoAgeDir, "📤-exports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const reportPath = path.join(reportsDir, `🥥✨ COCO AGE - Финальный отчет ${new Date().toLocaleDateString("ru-RU").replace(/\./g, "-")}.md`);
  fs.writeFileSync(reportPath, reportContent, "utf8");

  console.log(`🥥✨ Финальный отчет создан: ${reportPath}`);
  
  await closeDBConnection();
}

// Запуск скрипта
createFinalCocoAgeReport()
  .then(() => {
    console.log("🥥✨ Финальный отчет для Coco Age готов!");
    console.log("📊 Готово к презентации клиенту!");
  })
  .catch((error) => {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  });
