/**
 * 🗑️ Очистка всех reels из Neon Database
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function clearNeonReels() {
  console.log('🗑️ ОЧИСТКА ВСЕХ REELS ИЗ NEON DATABASE');
  console.log('====================================\n');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL не найден в .env файле');
    return;
  }

  console.log('🔌 Подключение к Neon Database...');
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Проверяем количество reels до удаления
    console.log('📊 Проверка текущего состояния...');
    const beforeResult = await sql`SELECT COUNT(*) FROM reels`;
    const beforeCount = beforeResult[0].count;
    console.log(`📊 Reels в базе до очистки: ${beforeCount}`);
    
    if (beforeCount === 0) {
      console.log('✅ База уже пустая - нечего удалять');
      return;
    }
    
    // Показываем примеры данных которые будут удалены
    console.log('\n🔍 Примеры данных которые будут удалены:');
    const examples = await sql`
      SELECT author_username, views_count, source_type, published_at 
      FROM reels 
      ORDER BY views_count DESC 
      LIMIT 5
    `;
    
    examples.forEach((reel, index) => {
      const publishedDate = reel.published_at ? new Date(reel.published_at).toLocaleDateString() : 'Неизвестно';
      console.log(`${index + 1}. @${reel.author_username} - ${reel.views_count?.toLocaleString() || 'N/A'} просмотров (${reel.source_type}) - ${publishedDate}`);
    });
    
    // Удаляем ВСЕ reels
    console.log('\n🗑️ Удаление всех reels...');
    const deleteResult = await sql`DELETE FROM reels`;
    console.log(`✅ Команда удаления выполнена`);
    
    // Проверяем что база пустая
    const afterResult = await sql`SELECT COUNT(*) FROM reels`;
    const afterCount = afterResult[0].count;
    console.log(`📊 Reels в базе после очистки: ${afterCount}`);
    
    if (afterCount === 0) {
      console.log('\n🎉 БАЗА ДАННЫХ ПОЛНОСТЬЮ ОЧИЩЕНА!');
      console.log('✅ Готова для свежего скрапинга');
      
      // Показываем статистику других таблиц
      console.log('\n📊 Статистика других таблиц:');
      const competitorsResult = await sql`SELECT COUNT(*) FROM competitors`;
      const hashtagsResult = await sql`SELECT COUNT(*) FROM hashtags`;
      const projectsResult = await sql`SELECT COUNT(*) FROM projects`;
      
      console.log(`🏢 Конкуренты: ${competitorsResult[0].count}`);
      console.log(`🏷️ Хэштеги: ${hashtagsResult[0].count}`);
      console.log(`📁 Проекты: ${projectsResult[0].count}`);
      
    } else {
      console.log('\n⚠️ Остались reels в базе - возможна ошибка');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы:', error.message);
    console.error('Детали ошибки:', error);
  }
}

clearNeonReels().catch(console.error);
