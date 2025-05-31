/**
 * Скрипт для проверки структуры таблицы reels
 */

import { NeonAdapter } from "../adapters/neon-adapter";

async function checkReelsTable() {
  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");
  
  try {
    // Проверяем структуру таблицы reels
    const tableInfo = await adapter.executeQuery(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'reels'"
    );
    
    console.log("Структура таблицы reels:");
    console.log(tableInfo.rows.map((row: any) => row.column_name));
    
    // Получаем количество записей в таблице reels
    const countResult = await adapter.executeQuery("SELECT COUNT(*) FROM reels");
    console.log(`Количество записей в таблице reels: ${countResult.rows[0].count}`);
    
    // Получаем пример записи из таблицы reels
    if (parseInt(countResult.rows[0].count) > 0) {
      const sampleResult = await adapter.executeQuery("SELECT * FROM reels LIMIT 1");
      console.log("Пример записи из таблицы reels:");
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    }
    
    // Получаем Reels с минимальным количеством просмотров
    const minViews = 50000;
    const daysAgo = 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysAgo);
    
    const reelsResult = await adapter.executeQuery(
      `SELECT * FROM reels 
       WHERE views_count >= $1 
       AND published_at >= $2 
       LIMIT 5`,
      [minViews, fromDate.toISOString()]
    );
    
    console.log(`Найдено ${reelsResult.rowCount} Reels с минимум ${minViews} просмотров за последние ${daysAgo} дней`);
    
    if (reelsResult.rowCount > 0) {
      console.log("Примеры Reels:");
      reelsResult.rows.forEach((row: any, index: number) => {
        console.log(`Reel ${index + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  URL: ${row.reel_url}`);
        console.log(`  Просмотры: ${row.views_count}`);
        console.log(`  Дата публикации: ${row.published_at}`);
        console.log(`  Транскрипция: ${row.transcript ? row.transcript.substring(0, 100) + "..." : "Нет"}`);
        console.log("---");
      });
    }
  } catch (error) {
    console.error("Ошибка при проверке таблицы reels:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем проверку таблицы reels
checkReelsTable();
