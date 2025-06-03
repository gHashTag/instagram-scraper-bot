/**
 * 📊 Быстрая проверка статуса базы данных
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function checkDBStatus() {
  console.log('📊 ПРОВЕРКА СТАТУСА БАЗЫ ДАННЫХ');
  console.log('===============================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден');
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔌 Подключение к Neon Database...');
    
    // Общая статистика
    const reelsResult = await sql`SELECT COUNT(*) as count FROM reels`;
    const competitorsResult = await sql`SELECT COUNT(*) as count FROM competitors`;
    const hashtagsResult = await sql`SELECT COUNT(*) as count FROM hashtags`;
    const projectsResult = await sql`SELECT COUNT(*) as count FROM projects`;
    
    console.log('📊 ОБЩАЯ СТАТИСТИКА:');
    console.log(`🎬 Reels: ${reelsResult[0].count}`);
    console.log(`🏢 Конкуренты: ${competitorsResult[0].count}`);
    console.log(`🏷️ Хэштеги: ${hashtagsResult[0].count}`);
    console.log(`📁 Проекты: ${projectsResult[0].count}`);
    
    const reelsCount = parseInt(reelsResult[0].count);
    
    if (reelsCount === 0) {
      console.log('\n✅ БАЗА ПУСТАЯ - готова для скрапинга');
      return;
    }
    
    // Если есть reels, показываем детали
    console.log('\n📅 АНАЛИЗ ДАТ:');
    
    // Reels по источникам
    const sourceStats = await sql`
      SELECT source_type, COUNT(*) as count 
      FROM reels 
      GROUP BY source_type 
      ORDER BY count DESC
    `;
    
    console.log('По источникам:');
    sourceStats.forEach(stat => {
      console.log(`  - ${stat.source_type}: ${stat.count} reels`);
    });
    
    // Вирусные reels (50K+)
    const viralResult = await sql`SELECT COUNT(*) as count FROM reels WHERE views_count >= 50000`;
    const viralCount = parseInt(viralResult[0].count);
    const viralPercent = Math.round((viralCount / reelsCount) * 100);
    
    console.log(`\n🔥 ВИРУСНЫЕ (50K+): ${viralCount} из ${reelsCount} (${viralPercent}%)`);
    
    // Проверяем свежесть данных
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const recentResult = await sql`
      SELECT COUNT(*) as count 
      FROM reels 
      WHERE published_at >= ${twoWeeksAgo.toISOString()}
    `;
    
    const recentCount = parseInt(recentResult[0].count);
    const recentPercent = Math.round((recentCount / reelsCount) * 100);
    
    console.log(`📅 ЗА ПОСЛЕДНИЕ 14 ДНЕЙ: ${recentCount} из ${reelsCount} (${recentPercent}%)`);
    
    // Топ-5 reels
    const topReels = await sql`
      SELECT author_username, views_count, source_type, published_at 
      FROM reels 
      ORDER BY views_count DESC 
      LIMIT 5
    `;
    
    if (topReels.length > 0) {
      console.log('\n🏆 ТОП-5 REELS:');
      topReels.forEach((reel, index) => {
        const publishedDate = reel.published_at ? new Date(reel.published_at).toLocaleDateString() : 'Неизвестно';
        const views = reel.views_count?.toLocaleString() || 'N/A';
        console.log(`${index + 1}. @${reel.author_username} - ${views} просмотров (${reel.source_type}) - ${publishedDate}`);
      });
    }
    
    // Проверяем старые данные
    const year2025Start = new Date('2025-01-01');
    const oldDataResult = await sql`
      SELECT COUNT(*) as count 
      FROM reels 
      WHERE published_at < ${year2025Start.toISOString()}
    `;
    
    const oldDataCount = parseInt(oldDataResult[0].count);
    
    if (oldDataCount > 0) {
      console.log(`\n⚠️ СТАРЫЕ ДАННЫЕ: ${oldDataCount} reels из 2024 года`);
    } else {
      console.log(`\n✅ ТОЛЬКО 2025 ГОД: нет старых данных`);
    }
    
    // Итоговая оценка
    console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:');
    
    if (recentCount >= 50 && viralPercent >= 30) {
      console.log('✅ ОТЛИЧНЫЕ ДАННЫЕ - достаточно свежих вирусных reels');
    } else if (recentCount >= 20 && viralPercent >= 20) {
      console.log('🟡 ХОРОШИЕ ДАННЫЕ - можно добавить еще немного');
    } else if (recentCount > 0) {
      console.log('🟠 МАЛО ДАННЫХ - нужен дополнительный скрапинг');
    } else {
      console.log('🔴 НЕТ СВЕЖИХ ДАННЫХ - срочно нужен скрапинг');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке базы:', error.message);
  }
}

checkDBStatus().catch(console.error);
