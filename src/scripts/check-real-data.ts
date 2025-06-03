#!/usr/bin/env node

/**
 * 🕉️ CHECK REAL DATA - Проверка реальных данных в базе
 */

import { config } from 'dotenv';
import { initializeDBConnection, getDB } from '../db/neonDB';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';

config();

async function checkRealData() {
  try {
    await initializeDBConnection();
    const db = getDB();
    
    console.log('🔍 ПРОВЕРКА РЕАЛЬНЫХ ДАННЫХ В БАЗЕ:\n');
    
    // Проверяем конкурентов
    const competitors = await db.select().from(schema.competitorsTable);
    console.log('🏢 КОНКУРЕНТЫ В БАЗЕ:');
    competitors.forEach(comp => {
      console.log(`- ID: ${comp.id}, Username: ${comp.username}, URL: ${comp.profile_url}`);
    });
    
    // Проверяем Reels
    const reels = await db.select().from(schema.reelsTable).limit(5);
    console.log('\n📥 ПРИМЕРЫ REELS:');
    reels.forEach(reel => {
      console.log(`- Author: ${reel.author_username}, Views: ${reel.views_count}, Source: ${reel.source_type}:${reel.source_identifier}`);
    });
    
    // Проверяем связи
    console.log('\n🔗 ПРОВЕРКА СВЯЗЕЙ:');
    for (const comp of competitors) {
      const relatedReels = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.reelsTable)
        .where(sql`source_type = 'competitor' AND source_identifier = ${comp.id.toString()}`);
      
      console.log(`Конкурент ${comp.username}: ${relatedReels[0].count} связанных Reels`);
    }
    
    // Общая статистика
    const totalStats = await db
      .select({
        total: sql<number>`count(*)`,
        withSource: sql<number>`count(*) filter (where source_type is not null)`
      })
      .from(schema.reelsTable);
    
    console.log('\n📊 ОБЩАЯ СТАТИСТИКА:');
    console.log(`- Всего Reels: ${totalStats[0].total}`);
    console.log(`- С источником: ${totalStats[0].withSource}`);
    console.log(`- Без источника: ${totalStats[0].total - totalStats[0].withSource}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkRealData();
}
