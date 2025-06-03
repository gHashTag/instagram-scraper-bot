/**
 * Скрипт для настройки свежих данных - загрузка конкурентов и хэштегов
 * 
 * Использование:
 * npm run setup-fresh-data
 */

import dotenv from "dotenv";
import { initializeDBConnection } from "../db/neonDB";
import { competitorsTable, hashtagsTable } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../logger";

// Загружаем переменные окружения
dotenv.config();

// Обновленный список конкурентов (без lips_for_kiss)
const COMPETITORS = [
  {
    username: "clinicajoelleofficial",
    profile_url: "https://www.instagram.com/clinicajoelleofficial",
    full_name: "Clinica Joelle Official",
    notes: "Премиальная клиника эстетической медицины"
  },
  {
    username: "kayaclinicarabia",
    profile_url: "https://www.instagram.com/kayaclinicarabia/",
    full_name: "Kaya Clinic Arabia",
    notes: "Сеть клиник красоты и эстетической медицины"
  },
  {
    username: "ziedasclinic",
    profile_url: "https://www.instagram.com/ziedasclinic?igsh=ZTAxeWZhY3VzYml2",
    full_name: "Zieda's Clinic",
    notes: "Клиника эстетической медицины"
  },
  {
    username: "med_yu_med",
    profile_url: "https://www.instagram.com/med_yu_med?igsh=YndwbmQzMHlrbTFh",
    full_name: "Med Yu Med",
    notes: "Медицинский центр эстетической медицины"
  },
  {
    username: "milena_aesthetic_clinic",
    profile_url: "https://www.instagram.com/milena_aesthetic_clinic/",
    full_name: "Milena Aesthetic Clinic",
    notes: "Клиника эстетической медицины"
  },
  {
    username: "graise.aesthetics",
    profile_url: "https://www.instagram.com/graise.aesthetics",
    full_name: "Graise Aesthetics",
    notes: "Центр эстетической медицины"
  }
];

// Хэштеги эстетической медицины (актуальные для 2025)
const HASHTAGS = [
  "aestheticmedicine",
  "aestheticclinic", 
  "cosmetology",
  "hydrafacial",
  "botox",
  "fillers",
  "beautyclinic",
  "skincare",
  "prpfacial",
  "rfmicroneedling",
  "skinrejuvenation",
  "facialtreatment",
  "aesthetictreatment"
];

async function setupFreshData() {
  try {
    logger.info("🚀 Начинаем настройку свежих данных...");
    
    const db = initializeDBConnection();
    
    // Получаем проект Coco Age (ID: 1)
    const projectId = 1;
    
    logger.info("👥 Загружаем конкурентов...");
    
    // Добавляем конкурентов
    for (const competitor of COMPETITORS) {
      try {
        // Проверяем, существует ли уже такой конкурент
        const existing = await db
          .select()
          .from(competitorsTable)
          .where(
            and(
              eq(competitorsTable.project_id, projectId),
              eq(competitorsTable.username, competitor.username)
            )
          );
        
        if (existing.length > 0) {
          logger.info(`  ✅ Конкурент @${competitor.username} уже существует`);
          continue;
        }
        
        // Добавляем нового конкурента
        await db.insert(competitorsTable).values({
          project_id: projectId,
          username: competitor.username,
          profile_url: competitor.profile_url,
          full_name: competitor.full_name,
          notes: competitor.notes,
          is_active: true
        });
        
        logger.info(`  ✅ Добавлен конкурент @${competitor.username}`);
      } catch (error) {
        logger.error(`  ❌ Ошибка при добавлении конкурента @${competitor.username}:`, error);
      }
    }
    
    logger.info("🏷️ Загружаем хэштеги...");
    
    // Добавляем хэштеги
    for (const hashtag of HASHTAGS) {
      try {
        // Проверяем, существует ли уже такой хэштег
        const existing = await db
          .select()
          .from(hashtagsTable)
          .where(
            and(
              eq(hashtagsTable.project_id, projectId),
              eq(hashtagsTable.tag_name, hashtag)
            )
          );
        
        if (existing.length > 0) {
          logger.info(`  ✅ Хэштег #${hashtag} уже существует`);
          continue;
        }
        
        // Добавляем новый хэштег
        await db.insert(hashtagsTable).values({
          project_id: projectId,
          tag_name: hashtag,
          notes: `Хэштег эстетической медицины`,
          is_active: true
        });
        
        logger.info(`  ✅ Добавлен хэштег #${hashtag}`);
      } catch (error) {
        logger.error(`  ❌ Ошибка при добавлении хэштега #${hashtag}:`, error);
      }
    }
    
    // Проверяем итоговое количество
    const competitorsCount = await db
      .select()
      .from(competitorsTable)
      .where(eq(competitorsTable.project_id, projectId));
    
    const hashtagsCount = await db
      .select()
      .from(hashtagsTable)
      .where(eq(hashtagsTable.project_id, projectId));
    
    logger.info("📊 Итоговая статистика:");
    logger.info(`  👥 Конкуренты: ${competitorsCount.length}`);
    logger.info(`  🏷️ Хэштеги: ${hashtagsCount.length}`);
    
    logger.info("🎉 Настройка свежих данных завершена!");
    
  } catch (error) {
    logger.error("❌ Ошибка при настройке данных:", error);
    process.exit(1);
  }
}

// Запускаем скрипт
setupFreshData();
