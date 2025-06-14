#!/usr/bin/env bun

/**
 * 🔄 Sync Obsidian Vault
 * Синхронизация данных с базой данных в Obsidian vault
 */

import { db } from "../db/index";
import {
  projectsTable,
  competitorsTable,
  hashtagsTable,
  reelsTable,
} from "../db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { ObsidianDashboardManager } from "../obsidian-dashboard-manager";
import fs from "fs";
import path from "path";

// 🔧 Configuration
const PROJECT_ID = parseInt(process.argv[2] || "1"); // Default to project 1 (Coco Age)
const VAULT_BASE_PATH =
  process.env.OBSIDIAN_VAULT_PATH || path.join(process.cwd(), "vaults");

interface ProjectInfo {
  id: number;
  name: string;
  vaultPath: string;
  description: string;
}

// 📊 Project configurations
const PROJECTS: Record<number, ProjectInfo> = {
  1: {
    id: 1,
    name: "Coco Age",
    vaultPath: path.join(VAULT_BASE_PATH, "coco-age"),
    description: "Эстетическая медицина и красота",
  },
  2: {
    id: 2,
    name: "Meta Muse",
    vaultPath: path.join(VAULT_BASE_PATH, "meta-muse-project"),
    description: "AI-инфлюенсер проект",
  },
  3: {
    id: 3,
    name: "TrendWatching",
    vaultPath: path.join(VAULT_BASE_PATH, "trendwatching"),
    description: "AI & Tech тренды",
  },
};

async function syncObsidianVault(): Promise<void> {
  console.log("🔄 Sync Obsidian Vault - ЗАПУСК");
  console.log("═".repeat(50));

  const project = PROJECTS[PROJECT_ID];
  if (!project) {
    throw new Error(`❌ Проект с ID ${PROJECT_ID} не найден`);
  }

  console.log(`📊 Проект: ${project.name} (ID: ${PROJECT_ID})`);
  console.log(`📁 Vault Path: ${project.vaultPath}`);

  try {
    // 1. Ensure vault directory exists
    if (!fs.existsSync(project.vaultPath)) {
      fs.mkdirSync(project.vaultPath, { recursive: true });
      console.log(`📁 Создана директория vault: ${project.vaultPath}`);
    }

    // 2. Get project data from database
    console.log("\n📊 Получение данных из базы данных...");

    const [projectData] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, PROJECT_ID))
      .limit(1);

    if (!projectData) {
      throw new Error(`❌ Проект с ID ${PROJECT_ID} не найден в базе данных`);
    }

    // 3. Get competitors data
    const competitors = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.project_id, PROJECT_ID));

    console.log(`👥 Найдено конкурентов: ${competitors.length}`);

    // 4. Get hashtags data
    const hashtags = await db
      .select()
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, PROJECT_ID));

    console.log(`🏷️ Найдено хэштегов: ${hashtags.length}`);

    // 5. Get reels statistics
    const reelsStats = await db
      .select({
        totalPosts: sql<number>`count(*)`,
        viralPosts: sql<number>`count(*) filter (where ${reelsTable.views_count} >= 75000)`,
        avgViews: sql<number>`avg(${reelsTable.views_count})`,
        avgLikes: sql<number>`avg(${reelsTable.likes_count})`,
      })
      .from(reelsTable)
      .where(eq(reelsTable.project_id, PROJECT_ID));

    const stats = reelsStats[0];
    console.log(`📊 Статистика рилсов:`);
    console.log(`   📥 Всего постов: ${stats.totalPosts}`);
    console.log(`   🔥 Вирусных: ${stats.viralPosts}`);
    console.log(`   📈 Средние просмотры: ${Math.round(stats.avgViews || 0)}`);
    console.log(`   💬 Средние лайки: ${Math.round(stats.avgLikes || 0)}`);

    // 6. Get top competitors with their best posts
    const competitorsWithStats = await Promise.all(
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
          .orderBy(desc(reelsTable.views_count))
          .limit(1);

        const topPost = competitorReels[0];
        const allReels = await db
          .select({
            avgViews: sql<number>`avg(${reelsTable.views_count})`,
          })
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.project_id, PROJECT_ID),
              eq(reelsTable.source_identifier, competitor.username)
            )
          );

        return {
          username: competitor.username,
          posts: competitorReels.length,
          topPost: topPost
            ? {
                views: topPost.views_count || 0,
                likes: topPost.likes_count || 0,
                description: topPost.description || "",
                date: topPost.published_at?.toISOString().split("T")[0] || "",
              }
            : {
                views: 0,
                likes: 0,
                description: "Нет данных",
                date: "",
              },
          avgViews: Math.round(allReels[0]?.avgViews || 0),
        };
      })
    );

    // 7. Get hashtag statistics
    const hashtagsWithStats = await Promise.all(
      hashtags.slice(0, 10).map(async (hashtag: any) => {
        const hashtagReels = await db
          .select({
            count: sql<number>`count(*)`,
            avgViews: sql<number>`avg(${reelsTable.views_count})`,
          })
          .from(reelsTable)
          .where(
            and(
              eq(reelsTable.project_id, PROJECT_ID),
              sql`${reelsTable.description} ILIKE ${`%${hashtag.tag_name}%`}`
            )
          );

        const stats = hashtagReels[0];
        return {
          tag: hashtag.tag_name.replace("#", ""),
          posts: stats.count || 0,
          avgViews: Math.round(stats.avgViews || 0),
          trend: "stable" as const,
        };
      })
    );

    // 8. Prepare dashboard data
    const dashboardData = {
      totalPosts: stats.totalPosts || 0,
      viralPosts: stats.viralPosts || 0,
      avgViews: Math.round(stats.avgViews || 0),
      avgLikes: Math.round(stats.avgLikes || 0),
      hashtags: hashtagsWithStats,
      competitors: competitorsWithStats,
    };

    // 9. Initialize Obsidian Dashboard Manager
    const dashboardManager = new ObsidianDashboardManager(
      project.vaultPath,
      project.name
    );

    // 10. Update dashboard
    console.log("\n📝 Обновление Obsidian dashboard...");
    await dashboardManager.updateMainDashboard(dashboardData);

    // 11. Update competitor pages
    console.log("👥 Обновление страниц конкурентов...");
    await dashboardManager.updateCompetitorPages(dashboardData);

    // 12. Create summary files
    await createSummaryFiles(project, dashboardData);

    console.log("\n✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!");
    console.log(`📁 Vault обновлен: ${project.vaultPath}`);
    console.log(`📊 Обновлено файлов: ${competitors.length + 3}`); // dashboard + competitors + summary files
  } catch (error) {
    console.error("❌ ОШИБКА СИНХРОНИЗАЦИИ:", error);
    process.exit(1);
  }
}

async function createSummaryFiles(
  project: ProjectInfo,
  data: any
): Promise<void> {
  // Create project overview
  const overviewPath = path.join(
    project.vaultPath,
    `${project.name} - Центральная карта.md`
  );
  const overviewContent = `# ${project.name} - Центральная карта

## 📊 Быстрая статистика
- **Всего постов:** ${data.totalPosts.toLocaleString()}
- **Вирусных постов:** ${data.viralPosts.toLocaleString()}
- **Средние просмотры:** ${data.avgViews.toLocaleString()}
- **Конкурентов:** ${data.competitors.length}
- **Хэштегов:** ${data.hashtags.length}

## 🔗 Быстрые ссылки
- [[👥 Конкуренты]]
- [[🏷️ Хэштеги]]
- [[📊 Планирование контента]]

*Обновлено: ${new Date().toLocaleString("ru-RU")}*
`;

  fs.writeFileSync(overviewPath, overviewContent);
  console.log(`✅ Создан файл: ${path.basename(overviewPath)}`);

  // Create competitors summary
  const competitorsPath = path.join(project.vaultPath, "👥 Конкуренты.md");
  const competitorsContent = `# 👥 Конкуренты

## Топ конкуренты по активности

${data.competitors
  .map(
    (c: any, i: number) => `
### ${i + 1}. @${c.username}
- **Постов:** ${c.posts}
- **Лучший пост:** ${c.topPost.views.toLocaleString()} просмотров
- **Средние просмотры:** ${c.avgViews.toLocaleString()}
- **Анализ:** [[Competitors/${c.username}]]
`
  )
  .join("\n")}

*Обновлено: ${new Date().toLocaleString("ru-RU")}*
`;

  fs.writeFileSync(competitorsPath, competitorsContent);
  console.log(`✅ Создан файл: ${path.basename(competitorsPath)}`);
}

// Run if called directly
if (require.main === module) {
  syncObsidianVault().catch((error) => {
    console.error("💥 Неожиданная ошибка:", error);
    process.exit(1);
  });
}

export { syncObsidianVault };
