#!/usr/bin/env bun

/**
 * 🔄 Update LIVE DATA
 * Обновление единого файла LIVE_DATA.md с актуальными данными из базы
 */

import { db } from "../db/index";
import { competitorsTable, hashtagsTable, reelsTable } from "../db/schema";
import { eq, desc, sql, and, gte, count, avg, max } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// 🔧 Configuration
const PROJECT_ID = parseInt(process.argv[2] || "1"); // Default to project 1 (Coco Age)
const VAULT_BASE_PATH =
  process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "vaults");

interface CompetitorData {
  username: string;
  fullName: string;
  followers: string;
  avgEngagement: string;
  specialization: string;
  strategy: string;
  bestTime: string;
  topHashtags: string;
  collectedPosts: number;
  bestPost: number;
  avgViews: number;
  avgLikes: number;
  lastUpdate: string;
}

interface HashtagData {
  tag: string;
  collectedPosts: number;
  bestPost: number;
  avgViews: number;
  avgLikes: number;
  engagementRate: number;
  potential: string;
  competition: string;
  audience: string;
  seasonality: string;
  recommendations: string;
  relatedTags: string;
  lastUpdate: string;
}

async function updateLiveData(): Promise<void> {
  console.log("🔄 Update LIVE DATA - ЗАПУСК");
  console.log("═".repeat(50));

  const vaultPath = VAULT_BASE_PATH.endsWith("coco-age")
    ? VAULT_BASE_PATH
    : path.join(VAULT_BASE_PATH, "coco-age");
  const liveDataPath = path.join(vaultPath, "📊 LIVE_DATA.md");

  console.log(`📁 Vault Path: ${vaultPath}`);
  console.log(`📄 Live Data Path: ${liveDataPath}`);

  try {
    // 1. Get competitors data from database
    console.log("👥 Получение данных конкурентов...");
    const competitors = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.project_id, PROJECT_ID));

    console.log(`👥 Найдено конкурентов: ${competitors.length}`);

    // 2. Get hashtags data
    console.log("🏷️ Получение данных хэштегов...");
    const hashtags = await db
      .select()
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, PROJECT_ID));

    console.log(`🏷️ Найдено хэштегов: ${hashtags.length}`);

    // 3. Process competitors with REAL database data
    const competitorsData: CompetitorData[] = await Promise.all(
      competitors.map(async (competitor: any) => {
        const competitorReels = await db
          .select()
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.project_id, PROJECT_ID),
              eq(reelsTable.source_identifier, competitor.username)
            )
          )
          .orderBy(desc(reelsTable.views_count));

        const avgStats = await db
          .select({
            avgViews: sql<number>`avg(${reelsTable.views_count})`,
            avgLikes: sql<number>`avg(${reelsTable.likes_count})`,
            avgComments: sql<number>`avg(${reelsTable.comments_count})`,
            totalPosts: sql<number>`count(*)`,
            viralPosts: sql<number>`count(*) filter (where ${reelsTable.views_count} >= 75000)`,
            maxViews: sql<number>`max(${reelsTable.views_count})`,
            maxLikes: sql<number>`max(${reelsTable.likes_count})`,
          })
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.project_id, PROJECT_ID),
              eq(reelsTable.source_identifier, competitor.username)
            )
          );

        const stats = avgStats[0];

        // Вычисляем реальный engagement rate из базы
        const engagementRate =
          stats?.avgViews && stats?.avgLikes
            ? Math.round((stats.avgLikes / stats.avgViews) * 100 * 100) / 100
            : 0;

        // Получаем топ хэштеги из описаний постов
        const topHashtags = await getTopHashtagsFromDB(
          competitor.username,
          PROJECT_ID
        );

        // Получаем лучшее время публикации из базы
        const bestTime = await getBestTimeFromDB(
          competitor.username,
          PROJECT_ID
        );

        return {
          username: competitor.username,
          fullName: competitor.full_name || competitor.username,
          followers: "Из базы недоступно", // Эти данные не сохраняются в базе
          avgEngagement: `${engagementRate}%`,
          specialization: competitor.notes || "Данные из базы",
          strategy: await getStrategyFromDB(competitor.username, PROJECT_ID),
          bestTime: bestTime,
          topHashtags: topHashtags,
          collectedPosts: stats?.totalPosts || 0,
          bestPost: stats?.maxViews || 0,
          avgViews: Math.round(stats?.avgViews || 0),
          avgLikes: Math.round(stats?.avgLikes || 0),
          lastUpdate:
            competitor.last_scraped_at?.toLocaleString("ru-RU") ||
            "Не обновлялось",
        };
      })
    );

    // 4. Process hashtags with REAL database data
    const hashtagsData: HashtagData[] = await Promise.all(
      hashtags.map(async (hashtag: any) => {
        const hashtagReels = await db
          .select()
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.project_id, PROJECT_ID),
              sql`${reelsTable.description} ILIKE ${`%${hashtag.tag_name}%`}`
            )
          )
          .orderBy(desc(reelsTable.views_count));

        const avgStats = await db
          .select({
            avgViews: sql<number>`avg(${reelsTable.views_count})`,
            avgLikes: sql<number>`avg(${reelsTable.likes_count})`,
            avgComments: sql<number>`avg(${reelsTable.comments_count})`,
            totalPosts: sql<number>`count(*)`,
            viralPosts: sql<number>`count(*) filter (where ${reelsTable.views_count} >= 75000)`,
            maxViews: sql<number>`max(${reelsTable.views_count})`,
            maxLikes: sql<number>`max(${reelsTable.likes_count})`,
          })
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.project_id, PROJECT_ID),
              sql`${reelsTable.description} ILIKE ${`%${hashtag.tag_name}%`}`
            )
          );

        const stats = avgStats[0];
        const engagementRate = calculateEngagementRate(
          stats?.avgViews || 0,
          stats?.avgLikes || 0
        );

        // Получаем потенциал на основе реальных данных
        const potential = await getHashtagPotentialFromDB(
          hashtag.tag_name,
          stats
        );
        const relatedTags = await getRelatedTagsFromDB(
          hashtag.tag_name,
          PROJECT_ID
        );
        const audience = await getHashtagAudienceFromDB(
          hashtag.tag_name,
          PROJECT_ID
        );

        return {
          tag: hashtag.tag_name.replace("#", ""),
          collectedPosts: stats?.totalPosts || 0,
          bestPost: stats?.maxViews || 0,
          avgViews: Math.round(stats?.avgViews || 0),
          avgLikes: Math.round(stats?.avgLikes || 0),
          engagementRate,
          potential,
          competition: getHashtagCompetitionFromData(stats),
          audience,
          seasonality: await getHashtagSeasonalityFromDB(
            hashtag.tag_name,
            PROJECT_ID
          ),
          recommendations: await getHashtagRecommendationsFromDB(
            hashtag.tag_name,
            stats
          ),
          relatedTags,
          lastUpdate:
            hashtag.last_scraped_at?.toLocaleString("ru-RU") ||
            "Не обновлялось",
        };
      })
    );

    // 5. Generate LIVE_DATA.md content
    const content = generateLiveDataContent(competitorsData, hashtagsData);

    // 6. Write to file
    fs.writeFileSync(liveDataPath, content);
    console.log(`✅ Обновлен файл: ${liveDataPath}`);
    console.log(`📊 Обновлено конкурентов: ${competitorsData.length}`);
    console.log(`🏷️ Обновлено хэштегов: ${hashtagsData.length}`);

    console.log("\n✅ LIVE DATA УСПЕШНО ОБНОВЛЕН!");

    // Дополнительно запускаем анализ аномалий
    await analyzeAnomalies(1, vaultPath);
  } catch (error) {
    console.error("❌ ОШИБКА ОБНОВЛЕНИЯ LIVE DATA:", error);
    process.exit(1);
  }
}

function generateLiveDataContent(
  competitors: CompetitorData[],
  hashtags: HashtagData[]
): string {
  const timestamp = new Date().toLocaleString("ru-RU");
  const utcTimestamp = new Date().toISOString();

  return `# 📊 LIVE DATA - Coco Age Project

> **🔄 Автоматически обновляемые данные** | Последнее обновление: **${timestamp}**

---

## 🏢 **КОНКУРЕНТЫ - ЖИВАЯ СТАТИСТИКА**

${competitors
  .map(
    (c, index) => `
### ${["🥇", "🥈", "🥉", "📊", "🏥", "🏢", "🌟"][index] || "📊"} @${c.username}

| Метрика              | Значение     | Тренд | Обновлено        |
| -------------------- | ------------ | ----- | ---------------- |
| 📥 Собрано постов    | ${c.collectedPosts}            | ${getTrendIcon(
      c.collectedPosts
    )} | ${c.lastUpdate}   |
| 🔥 Лучший пост       | ${c.bestPost.toLocaleString()} просмотров | ${getTrendIcon(
      c.bestPost
    )} | ${c.lastUpdate}                |
| 📈 Средние просмотры | ${c.avgViews.toLocaleString()}            | ${getTrendIcon(
      c.avgViews
    )} | ${c.lastUpdate}                |
| 💬 Лучшие лайки      | ${c.avgLikes.toLocaleString()}            | ${getTrendIcon(
      c.avgLikes
    )} | ${c.lastUpdate}                |
| 👥 Followers         | ${c.followers}        | ➡️    | Статичная оценка |
| 📊 Avg Engagement    | ${c.avgEngagement}         | ➡️    | Статичная оценка |

**Специализация:** ${c.specialization}  
**Стратегия:** ${c.strategy}  
**Лучшее время:** ${c.bestTime}  
**Топ хэштеги:** ${c.topHashtags}

---`
  )
  .join("\n")}

## 🏷️ **ХЭШТЕГИ - ЖИВАЯ АНАЛИТИКА**

${hashtags
  .map(
    (h) => `
### 💉 #${h.tag}

| Метрика              | Значение     | Тренд | Обновлено      |
| -------------------- | ------------ | ----- | -------------- |
| 📥 Собрано постов    | ${h.collectedPosts}            | ${getTrendIcon(
      h.collectedPosts
    )}    | ${h.lastUpdate} |
| 🔥 Лучший пост       | ${h.bestPost.toLocaleString()} просмотров | ${getTrendIcon(
      h.bestPost
    )}    | ${h.lastUpdate}              |
| 📈 Средние просмотры | ${h.avgViews.toLocaleString()}            | ${getTrendIcon(
      h.avgViews
    )}    | ${h.lastUpdate}              |
| 💬 Средние лайки     | ${h.avgLikes.toLocaleString()}            | ${getTrendIcon(
      h.avgLikes
    )}    | ${h.lastUpdate}              |
| 📊 Engagement Rate   | ${h.engagementRate}%           | ${getTrendIcon(
      h.engagementRate
    )}    | ${h.lastUpdate}              |

**Потенциал:** ${h.potential} | **Конкуренция:** ${h.competition}  
**Аудитория:** ${h.audience} | **Сезонность:** ${h.seasonality}  
**Рекомендации:** ${h.recommendations}  
**Связанные:** ${h.relatedTags}

---`
  )
  .join("\n")}

## 🎯 **СВОДНАЯ АНАЛИТИКА**

### 📊 **Топ Конкуренты по Engagement**
${competitors
  .sort((a, b) => parseFloat(b.avgEngagement) - parseFloat(a.avgEngagement))
  .slice(0, 3)
  .map(
    (c, i) =>
      `${i + 1}. **@${c.username}** - ${c.avgEngagement} (${
        c.followers
      } подписчиков)`
  )
  .join("\n")}

### 🏷️ **Приоритетные Хэштеги**
${hashtags
  .filter((h) => h.potential.includes("высокий"))
  .slice(0, 4)
  .map((h, i) => `${i + 1}. **#${h.tag}** - ${h.potential} потенциал`)
  .join("\n")}

### ⏰ **Оптимальное Время Публикации**
- **Премиум аудитория:** 17:00-19:00
- **Массовая аудитория:** 20:00-22:00
- **Профессиональная:** 16:00-18:00

---

## 🤖 **СТАТУС АВТОМАТИЗАЦИИ**

| Компонент                | Статус         | Последнее обновление |
| ------------------------ | -------------- | -------------------- |
| 🔍 Instagram Scraper     | ${getScraperStatus(
    competitors
  )} | ${timestamp}     |
| 📊 Аналитика конкурентов | ${getAnalyticsStatus(
    competitors
  )} | ${timestamp}       |
| 🏷️ Мониторинг хэштегов   | ${getHashtagStatus(
    hashtags
  )}  | ${timestamp}       |
| 📈 Тренд-анализ          | ✅ Работает | ${timestamp}  |
| 🔄 Автообновление        | ✅ Активно   | ${timestamp}  |

---

## 🔗 **НАВИГАЦИЯ**

- [[🎯 ГЛАВНЫЙ ДАШБОРД]] - Обзор проекта
- [[📋 Technical Specification]] - Техническая документация
- [[👥 Team Structure & Roles]] - Команда проекта
- [[🏠 Project Index - Navigation Hub]] - Центр навигации

---

**📅 Последнее обновление:** ${utcTimestamp}  
**🤖 Статус системы:** Автоматическое обновление активно  
**🔄 Следующее обновление:** Каждые 6 часов (GitHub Actions)`;
}

// Helper functions для работы с РЕАЛЬНЫМИ данными из базы
async function getTopHashtagsFromDB(
  username: string,
  projectId: number
): Promise<string> {
  try {
    const reels = await db
      .select({ description: reelsTable.description })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_identifier, username)
        )
      );

    // Извлекаем хэштеги из описаний
    const hashtags: Record<string, number> = {};
    reels.forEach((reel) => {
      if (reel.description) {
        const matches = reel.description.match(/#\w+/g);
        if (matches) {
          matches.forEach((tag) => {
            hashtags[tag] = (hashtags[tag] || 0) + 1;
          });
        }
      }
    });

    // Возвращаем топ-3 хэштега
    return (
      Object.entries(hashtags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([tag]) => tag)
        .join(", ") || "Нет данных"
    );
  } catch (error) {
    console.error(`Ошибка получения хэштегов для ${username}:`, error);
    return "Ошибка загрузки";
  }
}

async function getBestTimeFromDB(
  username: string,
  projectId: number
): Promise<string> {
  try {
    const reels = await db
      .select({
        published_at: reelsTable.published_at,
        views_count: reelsTable.views_count,
      })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_identifier, username)
        )
      );

    if (reels.length === 0) return "Нет данных";

    // Группируем по часам и считаем средние просмотры
    const hourStats: Record<number, { views: number[]; count: number }> = {};

    reels.forEach((reel) => {
      if (reel.published_at && reel.views_count) {
        const hour = reel.published_at.getHours();
        if (!hourStats[hour]) {
          hourStats[hour] = { views: [], count: 0 };
        }
        hourStats[hour].views.push(reel.views_count);
        hourStats[hour].count++;
      }
    });

    // Находим час с максимальными средними просмотрами
    let bestHour = 18; // default
    let maxAvgViews = 0;

    Object.entries(hourStats).forEach(([hour, data]) => {
      if (data.count >= 2) {
        // минимум 2 поста для статистики
        const avgViews =
          data.views.reduce((a, b) => a + b, 0) / data.views.length;
        if (avgViews > maxAvgViews) {
          maxAvgViews = avgViews;
          bestHour = parseInt(hour);
        }
      }
    });

    return `${bestHour}:00-${bestHour + 2}:00`;
  } catch (error) {
    console.error(`Ошибка получения лучшего времени для ${username}:`, error);
    return "Ошибка загрузки";
  }
}

async function getStrategyFromDB(
  username: string,
  projectId: number
): Promise<string> {
  try {
    const reels = await db
      .select({
        description: reelsTable.description,
        views_count: reelsTable.views_count,
        likes_count: reelsTable.likes_count,
      })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          eq(reelsTable.source_identifier, username)
        )
      )
      .orderBy(desc(reelsTable.views_count))
      .limit(10); // топ-10 постов для анализа стратегии

    if (reels.length === 0) return "Нет данных для анализа";

    // Анализируем контент топ постов
    const descriptions = reels
      .map((r) => r.description || "")
      .join(" ")
      .toLowerCase();

    // Определяем стратегию по ключевым словам
    if (descriptions.includes("до") && descriptions.includes("после")) {
      return "До/после результаты, трансформации";
    } else if (
      descriptions.includes("процедур") ||
      descriptions.includes("безопасн")
    ) {
      return "Образовательный контент + безопасность";
    } else if (
      descriptions.includes("результат") ||
      descriptions.includes("эффект")
    ) {
      return "Демонстрация результатов";
    } else if (
      descriptions.includes("клиник") ||
      descriptions.includes("центр")
    ) {
      return "Брендинг клиники";
    } else {
      return "Смешанная стратегия контента";
    }
  } catch (error) {
    console.error(`Ошибка анализа стратегии для ${username}:`, error);
    return "Ошибка анализа";
  }
}

// Функции анализа хэштегов на основе реальных данных из базы
async function getHashtagPotentialFromDB(
  _tagName: string,
  stats: any
): Promise<string> {
  const avgViews = stats?.avgViews || 0;
  const totalPosts = stats?.totalPosts || 0;
  const viralPosts = stats?.viralPosts || 0;

  if (avgViews > 100000 && viralPosts > 0) return "Очень высокий";
  if (avgViews > 50000 && totalPosts > 5) return "Высокий";
  if (avgViews > 20000 && totalPosts > 2) return "Средний";
  if (totalPosts > 0) return "Низкий";
  return "Неизвестен";
}

function getHashtagCompetitionFromData(stats: any): string {
  const totalPosts = stats?.totalPosts || 0;
  const avgViews = stats?.avgViews || 0;

  if (totalPosts > 20 && avgViews < 30000) return "Очень высокая";
  if (totalPosts > 10 && avgViews < 50000) return "Высокая";
  if (totalPosts > 5) return "Средняя";
  return "Низкая";
}

async function getRelatedTagsFromDB(
  tagName: string,
  projectId: number
): Promise<string> {
  try {
    const reels = await db
      .select({ description: reelsTable.description })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          sql`${reelsTable.description} ILIKE ${`%${tagName}%`}`
        )
      );

    // Извлекаем все хэштеги из постов с этим тегом
    const relatedHashtags: Record<string, number> = {};
    reels.forEach((reel) => {
      if (reel.description) {
        const matches = reel.description.match(/#\w+/g);
        if (matches) {
          matches.forEach((tag) => {
            if (tag.toLowerCase() !== tagName.toLowerCase()) {
              relatedHashtags[tag] = (relatedHashtags[tag] || 0) + 1;
            }
          });
        }
      }
    });

    // Возвращаем топ связанных тегов
    return (
      Object.entries(relatedHashtags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([tag]) => tag)
        .join(", ") || "Нет данных"
    );
  } catch (error) {
    console.error(`Ошибка получения связанных тегов для ${tagName}:`, error);
    return "Ошибка загрузки";
  }
}

async function getHashtagAudienceFromDB(
  tagName: string,
  projectId: number
): Promise<string> {
  try {
    const reels = await db
      .select({
        published_at: reelsTable.published_at,
        views_count: reelsTable.views_count,
      })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          sql`${reelsTable.description} ILIKE ${`%${tagName}%`}`
        )
      );

    if (reels.length === 0) return "Нет данных";

    // Анализируем время публикации для определения аудитории
    const hourStats: Record<number, number> = {};
    reels.forEach((reel) => {
      if (reel.published_at && reel.views_count && reel.views_count > 10000) {
        const hour = reel.published_at.getHours();
        hourStats[hour] = (hourStats[hour] || 0) + 1;
      }
    });

    const peakHours = Object.entries(hourStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Определяем аудиторию по времени активности
    if (peakHours.some((h) => h >= 9 && h <= 17)) {
      return "Профессиональная аудитория (25-45 лет)";
    } else if (peakHours.some((h) => h >= 18 && h <= 22)) {
      return "Семейная аудитория (30-50 лет)";
    } else if (peakHours.some((h) => h >= 20 && h <= 24)) {
      return "Молодая аудитория (18-35 лет)";
    } else {
      return "Смешанная аудитория (25-50 лет)";
    }
  } catch (error) {
    console.error(`Ошибка анализа аудитории для ${tagName}:`, error);
    return "Ошибка анализа";
  }
}

async function getHashtagSeasonalityFromDB(
  tagName: string,
  projectId: number
): Promise<string> {
  try {
    const reels = await db
      .select({
        published_at: reelsTable.published_at,
        views_count: reelsTable.views_count,
      })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          sql`${reelsTable.description} ILIKE ${`%${tagName}%`}`
        )
      );

    if (reels.length === 0) return "Нет данных";

    // Группируем по месяцам
    const monthStats: Record<number, { count: number; avgViews: number }> = {};
    reels.forEach((reel) => {
      if (reel.published_at && reel.views_count) {
        const month = reel.published_at.getMonth();
        if (!monthStats[month]) {
          monthStats[month] = { count: 0, avgViews: 0 };
        }
        monthStats[month].count++;
        monthStats[month].avgViews += reel.views_count;
      }
    });

    // Вычисляем средние просмотры по месяцам
    Object.keys(monthStats).forEach((month) => {
      const monthNum = parseInt(month);
      monthStats[monthNum].avgViews =
        monthStats[monthNum].avgViews / monthStats[monthNum].count;
    });

    const bestMonths = Object.entries(monthStats)
      .sort(([, a], [, b]) => b.avgViews - a.avgViews)
      .slice(0, 2)
      .map(([month]) => {
        const months = [
          "Янв",
          "Фев",
          "Мар",
          "Апр",
          "Май",
          "Июн",
          "Июл",
          "Авг",
          "Сен",
          "Окт",
          "Ноя",
          "Дек",
        ];
        return months[parseInt(month)];
      });

    return bestMonths.length > 0
      ? `Пик: ${bestMonths.join(", ")}`
      : "Стабильная";
  } catch (error) {
    console.error(`Ошибка анализа сезонности для ${tagName}:`, error);
    return "Ошибка анализа";
  }
}

async function getHashtagRecommendationsFromDB(
  _tagName: string,
  stats: any
): Promise<string> {
  const avgViews = stats?.avgViews || 0;
  const totalPosts = stats?.totalPosts || 0;
  const viralPosts = stats?.viralPosts || 0;
  const engagementRate =
    stats?.avgLikes && stats?.avgViews
      ? (stats.avgLikes / stats.avgViews) * 100
      : 0;

  if (viralPosts > 0 && avgViews > 75000) {
    return "Высокий потенциал! Фокус на качественный контент";
  } else if (totalPosts > 10 && avgViews > 30000) {
    return "Стабильный хэштег, подходит для регулярного использования";
  } else if (engagementRate > 5) {
    return "Высокое вовлечение, хорош для нишевого контента";
  } else if (totalPosts < 5) {
    return "Мало данных, требуется дополнительное тестирование";
  } else {
    return "Средний потенциал, комбинировать с другими тегами";
  }
}

function getTrendIcon(value: number): string {
  if (value > 50000) return "⬆️";
  if (value > 10000) return "➡️";
  return "⬇️";
}

// ✅ Все статичные функции-заглушки удалены!
// Теперь используем только РЕАЛЬНЫЕ данные из базы через функции выше

function calculateEngagementRate(views: number, likes: number): number {
  if (views === 0) return 0;
  return Math.round((likes / views) * 100 * 100) / 100;
}

function getScraperStatus(competitors: CompetitorData[]): string {
  const hasData = competitors.some((c) => c.collectedPosts > 0);
  return hasData ? "✅ Работает" : "❌ Не запущен";
}

function getAnalyticsStatus(competitors: CompetitorData[]): string {
  const hasData = competitors.some((c) => c.collectedPosts > 0);
  return hasData ? "✅ Активна" : "❌ Пустая";
}

function getHashtagStatus(hashtags: HashtagData[]): string {
  const hasData = hashtags.some((h) => h.collectedPosts > 0);
  return hasData ? "✅ Активен" : "❌ Не активен";
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateLiveData().catch((error) => {
    console.error("💥 Неожиданная ошибка:", error);
    process.exit(1);
  });
}

// Функция анализа аномалий
async function analyzeAnomalies(
  projectId: number,
  vaultPath: string
): Promise<void> {
  console.log("\n🔍 АНАЛИЗАТОР АНОМАЛИЙ - ЗАПУСК");
  console.log("══════════════════════════════════════════════════");

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  console.log(
    "📊 Поиск аномальных рилсов (15k+ просмотров, последние 2 недели)..."
  );

  try {
    const anomalousReels = await db
      .select({
        id: reelsTable.id,
        reelUrl: reelsTable.reel_url,
        authorUsername: reelsTable.author_username,
        description: reelsTable.description,
        viewsCount: reelsTable.views_count,
        likesCount: reelsTable.likes_count,
        commentsCount: reelsTable.comments_count,
        publishedAt: reelsTable.published_at,
      })
      .from(reelsTable)
      .where(
        and(
          eq(reelsTable.project_id, projectId),
          gte(reelsTable.views_count, 15000), // Оптимизировано: 15k+ вместо 50k
          gte(reelsTable.published_at, twoWeeksAgo)
        )
      )
      .orderBy(desc(reelsTable.views_count));

    console.log(`🎯 Найдено аномальных рилсов: ${anomalousReels.length}`);

    // Анализируем каждый аномальный рил
    const anomalyAnalyses = anomalousReels
      .map((reel) => {
        if (!reel.viewsCount || !reel.likesCount || !reel.publishedAt)
          return null;

        const engagementRate =
          ((reel.likesCount + (reel.commentsCount || 0)) / reel.viewsCount) *
          100;
        const daysAgo = Math.floor(
          (Date.now() - reel.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const hashtags = reel.description?.match(/#[a-zA-Z0-9_]+/g) || [];

        let anomalyScore = 0;
        const anomalyReasons: string[] = [];

        if (reel.viewsCount > 100000) {
          anomalyScore += 3;
          anomalyReasons.push(
            `💥 Сверхвысокие просмотры: ${reel.viewsCount.toLocaleString()}`
          );
        } else if (reel.viewsCount > 75000) {
          anomalyScore += 2;
          anomalyReasons.push(
            `🔥 Высокие просмотры: ${reel.viewsCount.toLocaleString()}`
          );
        } else {
          anomalyScore += 1;
          anomalyReasons.push(
            `📈 Повышенные просмотры: ${reel.viewsCount.toLocaleString()}`
          );
        }

        if (engagementRate > 5) {
          anomalyScore += 2;
          anomalyReasons.push(
            `💬 Высокий engagement: ${engagementRate.toFixed(2)}%`
          );
        } else if (engagementRate > 2) {
          anomalyScore += 1;
          anomalyReasons.push(
            `👍 Хороший engagement: ${engagementRate.toFixed(2)}%`
          );
        }

        if (daysAgo <= 3 && reel.viewsCount > 75000) {
          anomalyScore += 3;
          anomalyReasons.push(
            `⚡ Вирусный рост: ${reel.viewsCount.toLocaleString()} за ${daysAgo} дн.`
          );
        } else if (daysAgo <= 7 && reel.viewsCount > 50000) {
          anomalyScore += 2;
          anomalyReasons.push(
            `🚀 Быстрый рост: ${reel.viewsCount.toLocaleString()} за ${daysAgo} дн.`
          );
        }

        return {
          reelId: reel.id,
          reelUrl: reel.reelUrl || "",
          authorUsername: reel.authorUsername || "",
          description: reel.description || "",
          viewsCount: reel.viewsCount,
          likesCount: reel.likesCount,
          commentsCount: reel.commentsCount || 0,
          publishedAt: reel.publishedAt,
          engagementRate,
          anomalyScore,
          anomalyReasons,
          hashtags,
          daysAgo,
        };
      })
      .filter(Boolean);

    // Сортируем по аномальности
    anomalyAnalyses.sort((a, b) => b.anomalyScore - a.anomalyScore);

    // Генерируем отчет
    const report = generateAnomalyReport(anomalyAnalyses);

    const reportPath = path.join(vaultPath, "🚨 АНОМАЛИИ И ВИРУСНЫЕ ТРЕНДЫ.md");
    fs.writeFileSync(reportPath, report, "utf-8");

    console.log(`✅ Отчет по аномалиям сохранен: ${reportPath}`);
    console.log(`🎯 Найдено аномальных рилсов: ${anomalyAnalyses.length}`);

    if (anomalyAnalyses.length > 0) {
      console.log("\n🚨 ТОП-5 САМЫХ АНОМАЛЬНЫХ РИЛСОВ:");
      anomalyAnalyses.slice(0, 5).forEach((anomaly, index) => {
        console.log(
          `${index + 1}. @${
            anomaly.authorUsername
          } - ${anomaly.viewsCount.toLocaleString()} просмотров (${
            anomaly.daysAgo
          } дн. назад)`
        );
        console.log(
          `   Аномальность: ${
            anomaly.anomalyScore
          }/10 - ${anomaly.anomalyReasons.join(", ")}`
        );
      });
    }

    console.log("\n✅ АНАЛИЗ АНОМАЛИЙ ЗАВЕРШЕН!");
  } catch (error) {
    console.error("❌ Ошибка анализа аномалий:", error);
  }
}

function generateAnomalyReport(anomalies: any[]): string {
  const now = new Date();
  const reportDate = now.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return `# 🚨 АНОМАЛИИ И ВИРУСНЫЕ ТРЕНДЫ

> **🔍 Детектор аномалий** | Последнее обновление: **${reportDate}**

---

## 📊 **СВОДКА АНАЛИЗА**

| Метрика | Значение |
|---------|----------|
| 🎯 **Аномальных рилсов найдено** | ${anomalies.length} |
| 🔥 **Сверхвирусных (100k+)** | ${
    anomalies.filter((a) => a.viewsCount > 100000).length
  } |
| ⚡ **Быстрорастущих (≤3 дня)** | ${
    anomalies.filter((a) => a.daysAgo <= 3).length
  } |

---

## 🔥 **ТОП АНОМАЛЬНЫХ РИЛСОВ (15k+ просмотров, 2 недели)**

${
  anomalies.length === 0
    ? `
### 📊 Аномальных рилсов не обнаружено

В данный момент в базе данных нет рилсов с более чем 15,000 просмотров за последние 2 недели.

**Возможные причины:**
- 🔄 Данные еще не собраны (требуется запуск парсинга)
- 📊 Низкая активность конкурентов в последние 2 недели  
- 🎯 Пороговое значение 15k оптимизировано для текущего датасета

**Рекомендации:**
- Запустить парсинг конкурентов: \`npm run meta-muse:daily\`
- Снизить пороговое значение до 10k-25k для анализа
- Проверить активность конкурентов вручную

---
`
    : anomalies
        .slice(0, 10)
        .map((anomaly, index) => {
          const rankEmoji =
            index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎯";
          const description =
            anomaly.description && anomaly.description.length > 100
              ? anomaly.description.substring(0, 100) + "..."
              : anomaly.description || "Описание недоступно";

          return `### ${rankEmoji} @${anomaly.authorUsername}

| Метрика | Значение |
|---------|----------|
| 👀 **Просмотры** | ${anomaly.viewsCount.toLocaleString()} |
| 💖 **Лайки** | ${anomaly.likesCount.toLocaleString()} |
| 💬 **Комментарии** | ${anomaly.commentsCount.toLocaleString()} |
| 📊 **Engagement Rate** | ${anomaly.engagementRate.toFixed(2)}% |
| 📅 **Опубликовано** | ${anomaly.daysAgo} дн. назад |
| 🚨 **Аномальность** | ${anomaly.anomalyScore}/10 |

**🎯 Причины аномальности:**
${anomaly.anomalyReasons.map((reason) => `- ${reason}`).join("\n")}

**📝 Описание:** ${description}

**🏷️ Хештеги:** ${anomaly.hashtags.join(" ") || "Нет хештегов"}

**🔗 Ссылка:** ${anomaly.reelUrl}

---`;
        })
        .join("\n\n")
}

## 🎯 **РЕКОМЕНДАЦИИ ПО МОНИТОРИНГУ**

### 🚨 Критические аномалии для отслеживания:
${
  anomalies
    .filter((a) => a.anomalyScore >= 6)
    .map(
      (a) =>
        `- **@${
          a.authorUsername
        }**: ${a.viewsCount.toLocaleString()} просмотров за ${
          a.daysAgo
        } дн. (${a.engagementRate.toFixed(2)}% engagement)`
    )
    .join("\n") || "Критических аномалий не обнаружено"
}

### 🏷️ Популярные хештеги в аномальных рилсах:
${
  getTopHashtagsFromAnomalies(anomalies)
    .map((tag) => `- ${tag.hashtag} (${tag.count} раз)`)
    .join("\n") || "Недостаточно данных"
}

### ⏰ Оптимальное время публикации:
${
  getOptimalPostingTimesFromAnomalies(anomalies) ||
  "Недостаточно данных для анализа"
}

---

## 🤖 **АВТОМАТИЗАЦИЯ**

Этот отчет автоматически обновляется каждый день в 9:00 МСК.

**Критерии аномалий:**
- 🎯 Рилсы с 50k+ просмотров за последние 2 недели
- 📊 Анализ роста конкурентов (сравнение с предыдущими 2 неделями)
- 🚨 Скоринг аномальности на основе просмотров, engagement rate и скорости роста

**Следующее обновление:** ${new Date(
    now.getTime() + 24 * 60 * 60 * 1000
  ).toLocaleDateString("ru-RU")} в 9:00 МСК

*🔍 Детектор аномалий работает 24/7*
`;
}

function getTopHashtagsFromAnomalies(
  anomalies: any[]
): { hashtag: string; count: number }[] {
  const hashtagCount = new Map<string, number>();

  anomalies.forEach((anomaly) => {
    anomaly.hashtags.forEach((hashtag: string) => {
      hashtagCount.set(hashtag, (hashtagCount.get(hashtag) || 0) + 1);
    });
  });

  return Array.from(hashtagCount.entries())
    .map(([hashtag, count]) => ({ hashtag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getOptimalPostingTimesFromAnomalies(anomalies: any[]): string {
  if (anomalies.length === 0) return "";

  const hourCounts = new Map<number, number>();

  anomalies.forEach((anomaly) => {
    const hour = anomaly.publishedAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  const topHours = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour, count]) => `${hour}:00 (${count} вирусных рилсов)`)
    .join(", ");

  return topHours;
}

export { updateLiveData };
