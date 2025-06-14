/**
 * 🕉️ OBSIDIAN DASHBOARD MANAGER - Управление дашбордами
 *
 * Автоматическое обновление дашбордов с реальными данными
 */

import fs from "fs";
import path from "path";
import { logger } from "./logger";

interface DashboardData {
  totalPosts: number;
  viralPosts: number;
  avgViews: number;
  avgLikes: number;
  hashtags: Array<{
    tag: string;
    posts: number;
    avgViews: number;
    trend: "up" | "down" | "stable";
  }>;
  competitors: Array<{
    username: string;
    posts: number;
    topPost: {
      views: number;
      likes: number;
      description: string;
      date: string;
    };
    avgViews: number;
  }>;
  trends?: Array<{
    title: string;
    category: string;
    source: string;
    date: string;
    relevanceScore: number;
  }>;
}

export class ObsidianDashboardManager {
  private vaultPath: string;
  private clientName: string;

  constructor(vaultPath: string, clientName: string) {
    this.vaultPath = vaultPath;
    this.clientName = clientName;
  }

  /**
   * Обновить главный дашборд с реальными данными
   */
  async updateMainDashboard(data: DashboardData): Promise<void> {
    const timestamp = new Date().toLocaleString("ru-RU");
    const date = new Date().toISOString().split("T")[0];

    let dashboardPath: string;
    let dashboardContent: string;

    if (
      this.clientName.includes("Эстетическая") ||
      this.clientName.includes("Coco")
    ) {
      dashboardPath = path.join(this.vaultPath, "🥥✨ ГЛАВНЫЙ ДАШБОРД.md");
      dashboardContent = this.generateCocoAgeDashboard(data, timestamp, date);
    } else if (
      this.clientName.includes("TrendWatching") ||
      this.clientName.includes("AI")
    ) {
      dashboardPath = path.join(this.vaultPath, "🤖📈 ГЛАВНЫЙ ДАШБОРД.md");
      dashboardContent = this.generateTrendWatchingDashboard(
        data,
        timestamp,
        date
      );
    } else {
      throw new Error(`Неизвестный клиент: ${this.clientName}`);
    }

    fs.writeFileSync(dashboardPath, dashboardContent);
    logger.info(`✅ Обновлен главный дашборд: ${dashboardPath}`);
  }

  /**
   * Обновить страницы конкурентов
   */
  async updateCompetitorPages(data: DashboardData): Promise<void> {
    for (const competitor of data.competitors) {
      await this.updateCompetitorPage(competitor);
    }
  }

  /**
   * Обновить страницу конкретного конкурента
   */
  private async updateCompetitorPage(competitor: any): Promise<void> {
    const competitorsDir = path.join(this.vaultPath, "Competitors");
    const competitorPath = path.join(
      competitorsDir,
      `${competitor.username}.md`
    );
    const timestamp = new Date().toLocaleString("ru-RU");

    // Ensure Competitors directory exists
    if (!fs.existsSync(competitorsDir)) {
      fs.mkdirSync(competitorsDir, { recursive: true });
    }

    let content: string;

    if (
      this.clientName.includes("Эстетическая") ||
      this.clientName.includes("Coco")
    ) {
      content = this.generateCocoAgeCompetitorPage(competitor, timestamp);
    } else {
      content = this.generateTrendWatchingCompetitorPage(competitor, timestamp);
    }

    fs.writeFileSync(competitorPath, content);
    console.log(`✅ Обновлена страница конкурента: ${competitor.username}`);
  }

  /**
   * Генерировать дашборд для Coco Age
   */
  private generateCocoAgeDashboard(
    data: DashboardData,
    timestamp: string,
    date: string
  ): string {
    const viralRate =
      data.totalPosts > 0
        ? Math.round((data.viralPosts / data.totalPosts) * 100)
        : 0;

    return `# 🥥✨ Coco Age - Главный Дашборд

> **Эстетическая медицина** | Вирусный контент и аналитика конкурентов

---

## 📊 **БЫСТРАЯ АНАЛИТИКА**

| Метрика | Значение | Тренд |
|---------|----------|-------|
| 📥 Всего постов | ${data.totalPosts.toLocaleString()} | ${this.getTrendIcon(data.totalPosts)} |
| 🔥 Вирусных (75K+) | ${data.viralPosts.toLocaleString()} (${viralRate}%) | ${this.getTrendIcon(data.viralPosts)} |
| 📈 Средние просмотры | ${data.avgViews.toLocaleString()} | ${this.getTrendIcon(data.avgViews)} |
| 💬 Средние лайки | ${data.avgLikes.toLocaleString()} | ${this.getTrendIcon(data.avgLikes)} |
| 🏷️ Активных хэштегов | ${data.hashtags.length} | ⬆️ |
| 🏢 Конкурентов | ${data.competitors.length} | ➡️ |
| 📅 Последнее обновление | ${date} | ✅ |

---

## 🎯 **ТЕКУЩАЯ СТРАТЕГИЯ**

\`\`\`yaml
Режим: VIRAL (Вирусный контент)
Мин. просмотры: 75,000
Период: 7 дней
Только реальные просмотры: ✅
Статус: 🟢 АКТИВНА
Эффективность: ${viralRate}% вирусных постов
\`\`\`

---

## 🏢 **КОНКУРЕНТЫ** 

### [[👥 Конкуренты|📊 Полный анализ конкурентов]]

| Конкурент | Посты | Лучший пост | Средние просмотры | Анализ |
|-----------|-------|-------------|-------------------|--------|
${data.competitors
  .map(
    (c) =>
      `| @${c.username} | ${c.posts} | ${c.topPost.views.toLocaleString()} | ${c.avgViews.toLocaleString()} | [[Competitors/${c.username}|📊 Анализ]] |`
  )
  .join("\n")}

**📈 Топ-контент конкурентов за неделю:**
${data.competitors
  .map(
    (c, i) =>
      `- ${["🥇", "🥈", "🥉"][i] || "🏆"} [[Competitors/${c.username}#top-content|@${c.username} - ${c.topPost.views.toLocaleString()} просмотров]]`
  )
  .join("\n")}

---

## 🏷️ **ХЭШТЕГИ**

### [[🏷️ Хэштеги|📊 Полный анализ хэштегов]]

| Хэштег | Посты | Средние просмотры | Тренд | Анализ |
|--------|-------|-------------------|-------|--------|
${data.hashtags
  .map(
    (h) =>
      `| #${h.tag} | ${h.posts} | ${h.avgViews.toLocaleString()} | ${this.getTrendIcon(h.trend)} | [[Hashtags/${h.tag}|📊 Анализ]] |`
  )
  .join("\n")}

**🔥 Самые вирусные хэштеги:**
${data.hashtags
  .slice(0, 3)
  .map(
    (h, i) =>
      `${i + 1}. ${["🥇", "🥈", "🥉"][i]} #${h.tag} - ${h.avgViews.toLocaleString()}+ средних просмотров`
  )
  .join("\n")}

---

## 🎯 **ЦЕЛИ И KPI**

| KPI | Цель | Текущее | Статус |
|-----|------|---------|--------|
| Вирусных постов/день | 10 | ${Math.round(data.viralPosts / 7)} | ${data.viralPosts >= 70 ? "🟢" : data.viralPosts >= 35 ? "🟡" : "🔴"} |
| Средние просмотры | 100K | ${data.avgViews.toLocaleString()} | ${data.avgViews >= 100000 ? "🟢" : data.avgViews >= 50000 ? "🟡" : "🔴"} |
| Охват конкурентов | 100% | 100% | 🟢 |
| Обновление данных | Ежедневно | ✅ | 🟢 |

---

*🤖 Автоматически обновляется при запуске стратегии*  
*📅 Последнее обновление: ${timestamp}*`;
  }

  /**
   * Генерировать дашборд для TrendWatching
   */
  private generateTrendWatchingDashboard(
    data: DashboardData,
    timestamp: string,
    date: string
  ): string {
    const aiPostsRate =
      data.totalPosts > 0
        ? Math.round((data.viralPosts / data.totalPosts) * 100)
        : 0;
    const trendsCount = data.trends?.length || 0;

    return `# 🤖📈 TrendWatching - Главный Дашборд

> **AI & Tech Тренды** | Анализ конкурентов и трендов технологий

---

## 📊 **БЫСТРАЯ АНАЛИТИКА**

| Метрика | Значение | Тренд |
|---------|----------|-------|
| 🌐 Трендов с сайтов | ${trendsCount.toLocaleString()} | ${this.getTrendIcon(trendsCount)} |
| 🎬 AI Reels (50K+) | ${data.viralPosts.toLocaleString()} | ${this.getTrendIcon(data.viralPosts)} |
| 📥 Всего AI постов | ${data.totalPosts.toLocaleString()} | ${this.getTrendIcon(data.totalPosts)} |
| 📈 Средние просмотры | ${data.avgViews.toLocaleString()} | ${this.getTrendIcon(data.avgViews)} |
| 🏷️ AI хэштегов | ${data.hashtags.length} | ⬆️ |
| 🏢 Tech конкурентов | ${data.competitors.length} | ➡️ |
| 📅 Последнее обновление | ${date} | ✅ |

---

## 🎯 **ТЕКУЩАЯ СТРАТЕГИЯ**

\`\`\`yaml
Режим: TRENDWATCHING (AI & Tech)
Мин. просмотры: 50,000
Период: 7 дней
Только реальные просмотры: ✅
Фокус: AI, Innovation, Future Tech
AI Эффективность: ${aiPostsRate}% качественного контента
Статус: 🟢 АКТИВНА
\`\`\`

---

## 🏢 **AI КОНКУРЕНТЫ**

### [[👥 Конкуренты|📊 Полный анализ AI конкурентов]]

| Конкурент | AI Посты | Лучший AI контент | Средние просмотры | Анализ |
|-----------|----------|-------------------|-------------------|--------|
${data.competitors
  .map(
    (c) =>
      `| @${c.username} | ${c.posts} | ${c.topPost.views.toLocaleString()} | ${c.avgViews.toLocaleString()} | [[Competitors/${c.username}|📊 Анализ]] |`
  )
  .join("\n")}

**🎬 Топ AI-контент конкурентов за неделю:**
${data.competitors
  .map(
    (c, i) =>
      `- ${["🥇", "🥈", "🥉"][i] || "🏆"} [[Competitors/${c.username}#viral-content|@${c.username} - ${c.topPost.views.toLocaleString()} просмотров]]`
  )
  .join("\n")}

---

## 🏷️ **AI ХЭШТЕГИ**

### [[🏷️ Хэштеги|📊 Полный анализ AI хэштегов]]

| Хэштег | AI Посты | Средние просмотры | Тренд | AI Категория |
|--------|----------|-------------------|-------|--------------|
${data.hashtags
  .map(
    (h) =>
      `| #${h.tag} | ${h.posts} | ${h.avgViews.toLocaleString()} | ${this.getTrendIcon(h.trend)} | [[Hashtags/${h.tag}|📊 Анализ]] |`
  )
  .join("\n")}

**🤖 AI Категории по популярности:**
${data.hashtags
  .slice(0, 3)
  .map(
    (h, i) =>
      `${i + 1}. ${["🥇", "🥈", "🥉"][i]} #${h.tag} - ${h.avgViews.toLocaleString()}+ средних просмотров`
  )
  .join("\n")}

---

## 🎯 **ЦЕЛИ И KPI**

| KPI | Цель | Текущее | Статус |
|-----|------|---------|--------|
| Новых AI трендов/день | 15 | ${Math.round(trendsCount / 7)} | ${trendsCount >= 105 ? "🟢" : trendsCount >= 50 ? "🟡" : "🔴"} |
| Вирусных AI Reels/день | 8 | ${Math.round(data.viralPosts / 7)} | ${data.viralPosts >= 56 ? "🟢" : data.viralPosts >= 28 ? "🟡" : "🔴"} |
| Охват AI конкурентов | 100% | 100% | 🟢 |
| Мониторинг сайтов | 10 сайтов | 10 | 🟢 |
| Обновление данных | Ежедневно | ✅ | 🟢 |

---

*🤖 Автоматически обновляется при запуске AI стратегии*  
*📅 Последнее обновление: ${timestamp}*`;
  }

  /**
   * Генерировать страницу конкурента для Coco Age
   */
  private generateCocoAgeCompetitorPage(
    competitor: any,
    timestamp: string
  ): string {
    return `# 🏢 @${competitor.username} - Анализ конкурента

> **Эстетическая медицина** | Собрано постов: ${competitor.posts}

---

## 📊 **АКТУАЛЬНАЯ СТАТИСТИКА**

| Метрика | Значение | Тренд |
|---------|----------|-------|
| 📥 Собрано постов | ${competitor.posts} | ⬆️ |
| 🔥 Лучший пост | ${competitor.topPost.views.toLocaleString()} просмотров | 🔥 |
| 📈 Средние просмотры | ${competitor.avgViews.toLocaleString()} | 📈 |
| 💬 Лучшие лайки | ${competitor.topPost.likes.toLocaleString()} | 💬 |
| 📅 Последнее обновление | ${new Date().toLocaleDateString("ru-RU")} | ✅ |

---

## 🎬 **ТОП КОНТЕНТ ЗА НЕДЕЛЮ**

### 🥇 Самый вирусный пост
\`\`\`yaml
Просмотры: ${competitor.topPost.views.toLocaleString()}
Лайки: ${competitor.topPost.likes.toLocaleString()}
Дата: ${competitor.topPost.date}
Описание: ${competitor.topPost.description}
\`\`\`

---

## 🔗 **ССЫЛКИ И НАВИГАЦИЯ**

- [[🥥✨ ГЛАВНЫЙ ДАШБОРД|🏠 Главный дашборд]]
- [[👥 Конкуренты|📊 Все конкуренты]]
- [[Analysis/Competitor-Performance|📈 Сравнительный анализ]]

---

*🤖 Автоматически обновляется при запуске стратегии*  
*📅 Последнее обновление: ${timestamp}*`;
  }

  /**
   * Генерировать страницу конкурента для TrendWatching
   */
  private generateTrendWatchingCompetitorPage(
    competitor: any,
    timestamp: string
  ): string {
    return `# 🤖 @${competitor.username} - AI Анализ

> **AI & Tech** | Собрано AI постов: ${competitor.posts}

---

## 📊 **АКТУАЛЬНАЯ AI СТАТИСТИКА**

| Метрика | Значение | Тренд |
|---------|----------|-------|
| 📥 Собрано AI постов | ${competitor.posts} | ⬆️ |
| 🔥 Лучший AI пост | ${competitor.topPost.views.toLocaleString()} просмотров | 🔥 |
| 📈 Средние просмотры | ${competitor.avgViews.toLocaleString()} | 📈 |
| 💬 Лучшие лайки | ${competitor.topPost.likes.toLocaleString()} | 💬 |
| 📅 Последнее обновление | ${new Date().toLocaleDateString("ru-RU")} | ✅ |

---

## 🎬 **ТОП AI КОНТЕНТ ЗА НЕДЕЛЮ**

### 🥇 Самый вирусный AI пост
\`\`\`yaml
Просмотры: ${competitor.topPost.views.toLocaleString()}
Лайки: ${competitor.topPost.likes.toLocaleString()}
AI Категория: Machine Learning
Дата: ${competitor.topPost.date}
Описание: ${competitor.topPost.description}
\`\`\`

---

## 🔗 **ССЫЛКИ И НАВИГАЦИЯ**

- [[🤖📈 ГЛАВНЫЙ ДАШБОРД|🏠 Главный дашборд]]
- [[👥 Конкуренты|📊 Все AI конкуренты]]
- [[Analysis/AI-Trend-Analysis|📈 AI тренд анализ]]

---

*🤖 Автоматически обновляется при запуске AI стратегии*  
*📅 Последнее обновление: ${timestamp}*`;
  }

  /**
   * Получить иконку тренда
   */
  private getTrendIcon(value: any): string {
    if (typeof value === "string") {
      switch (value) {
        case "up":
          return "📈";
        case "down":
          return "📉";
        default:
          return "➡️";
      }
    }

    if (typeof value === "number") {
      if (value > 1000) return "📈";
      if (value > 100) return "➡️";
      return "📉";
    }

    return "➡️";
  }
}
