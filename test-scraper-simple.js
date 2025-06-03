/**
 * 🚀 Простой тест скрапера
 */

require('dotenv').config();

async function testScraper() {
  console.log('🚀 ПРОСТОЙ ТЕСТ СКРАПЕРА');
  console.log('========================\n');

  // 1. Проверка переменных
  console.log('🔍 Переменные окружения:');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Есть' : '❌ Нет'}`);
  console.log(`APIFY_TOKEN: ${process.env.APIFY_TOKEN ? '✅ Есть' : '❌ Нет'}`);

  if (!process.env.APIFY_TOKEN) {
    console.log('❌ APIFY_TOKEN не найден');
    return;
  }

  // 2. Тест Apify API
  console.log('\n🕷️ Тест Apify API:');
  
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hashtags: ['botox'], // Простой популярный хэштег
        resultsLimit: 5, // Только 5 для теста
        proxy: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"]
        }
      })
    });

    console.log(`Статус ответа: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Ошибка HTTP: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log(`✅ Получено результатов: ${Array.isArray(data) ? data.length : 'не массив'}`);

    if (Array.isArray(data) && data.length > 0) {
      console.log('\n📊 Примеры результатов:');
      
      data.slice(0, 3).forEach((reel, index) => {
        const views = reel.videoViewCount || reel.viewCount || 0;
        const author = reel.ownerUsername || reel.author || 'Unknown';
        const url = reel.url || reel.shortCode || 'No URL';
        
        console.log(`${index + 1}. @${author}`);
        console.log(`   Просмотры: ${views.toLocaleString()}`);
        console.log(`   URL: ${url}`);
        console.log(`   Тип: ${reel.type || 'unknown'}`);
      });

      // Анализ качества данных
      console.log('\n🎯 Анализ качества:');
      
      const viralReels = data.filter(reel => {
        const views = reel.videoViewCount || reel.viewCount || 0;
        return views >= 50000;
      });
      
      const recentReels = data.filter(reel => {
        if (!reel.timestamp) return false;
        const publishedDate = new Date(reel.timestamp);
        const daysAgo = (new Date() - publishedDate) / (1000 * 60 * 60 * 24);
        return daysAgo <= 14;
      });

      console.log(`Вирусные (50K+): ${viralReels.length} из ${data.length}`);
      console.log(`За 14 дней: ${recentReels.length} из ${data.length}`);
      
      // Итоговая оценка
      if (viralReels.length > 0 && recentReels.length > 0) {
        console.log('\n🎉 ОТЛИЧНО! Скрапер работает и находит качественные данные');
        console.log('✅ Можно запускать полный скрапинг');
        
        console.log('\n🚀 Рекомендуемые команды:');
        console.log('npx tsx src/scripts/bulk-scrape-hashtags.ts 1 $APIFY_TOKEN 14 50000 50');
        console.log('npx tsx src/scripts/bulk-scrape-competitors.ts 1 $APIFY_TOKEN 1 50');
        
      } else if (data.length > 0) {
        console.log('\n🟡 ХОРОШО! Скрапер работает, но мало качественных данных');
        console.log('💡 Рекомендации:');
        console.log('   - Снизить minViews до 10000');
        console.log('   - Увеличить maxAgeDays до 30');
        console.log('   - Попробовать другие хэштеги');
        
      } else {
        console.log('\n🔴 ПРОБЛЕМА! Скрапер не находит данные');
      }

    } else {
      console.log('❌ Apify вернул пустые данные или неверный формат');
      console.log('Возможные причины:');
      console.log('   - Неверный токен');
      console.log('   - Проблемы с хэштегом');
      console.log('   - Лимиты Instagram');
    }

  } catch (error) {
    console.log(`❌ Ошибка при тестировании: ${error.message}`);
    console.log('Возможные причины:');
    console.log('   - Нет интернет соединения');
    console.log('   - Неверный APIFY_TOKEN');
    console.log('   - Проблемы с fetch API');
  }

  // 3. Проверка базы данных (если доступна)
  if (process.env.DATABASE_URL) {
    console.log('\n🗄️ Проверка базы данных:');
    
    try {
      const { neon } = require('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      
      const result = await sql`SELECT COUNT(*) as count FROM reels`;
      console.log(`✅ Подключение к БД успешно`);
      console.log(`📊 Reels в базе: ${result[0].count}`);
      
      // Проверяем последние добавленные
      const recent = await sql`
        SELECT author_username, views_count, created_at 
        FROM reels 
        ORDER BY created_at DESC 
        LIMIT 3
      `;
      
      if (recent.length > 0) {
        console.log('📅 Последние добавленные:');
        recent.forEach((reel, index) => {
          const createdDate = new Date(reel.created_at).toLocaleDateString();
          console.log(`${index + 1}. @${reel.author_username} - ${reel.views_count?.toLocaleString() || 'N/A'} (${createdDate})`);
        });
      }
      
    } catch (dbError) {
      console.log(`⚠️ Проблема с БД: ${dbError.message}`);
    }
  }

  console.log('\n📋 ИТОГ ДИАГНОСТИКИ:');
  console.log('====================');
  console.log('1. Проверьте что APIFY_TOKEN корректный');
  console.log('2. Убедитесь что есть активные хэштеги в БД');
  console.log('3. Запустите тестовый скрапинг с малыми лимитами');
  console.log('4. Постепенно увеличивайте объемы');
}

testScraper().catch(console.error);
