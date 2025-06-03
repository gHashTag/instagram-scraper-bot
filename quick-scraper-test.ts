/**
 * 🚀 Быстрый тест скрапера на 1 хэштеге
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

async function quickScraperTest() {
  console.log('🚀 БЫСТРЫЙ ТЕСТ СКРАПЕРА');
  console.log('========================\n');

  // 1. Проверка переменных
  console.log('🔍 Проверка переменных окружения:');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Есть' : '❌ Нет'}`);
  console.log(`APIFY_TOKEN: ${process.env.APIFY_TOKEN ? '✅ Есть' : '❌ Нет'}`);

  if (!process.env.DATABASE_URL || !process.env.APIFY_TOKEN) {
    console.log('❌ Отсутствуют необходимые переменные');
    return;
  }

  // 2. Проверка базы данных
  console.log('\n🗄️ Проверка базы данных:');
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Проверяем хэштеги
    const hashtags = await sql`
      SELECT id, tag_name, is_active 
      FROM hashtags 
      WHERE is_active = true 
      LIMIT 3
    `;

    console.log(`✅ Найдено активных хэштегов: ${hashtags.length}`);
    hashtags.forEach(tag => {
      console.log(`   - #${tag.tag_name} (ID: ${tag.id})`);
    });

    if (hashtags.length === 0) {
      console.log('❌ Нет активных хэштегов для теста');
      return;
    }

    // 3. Тестовый запрос к Apify
    console.log('\n🕷️ Тестовый запрос к Apify:');
    const testHashtag = hashtags[0];
    
    try {
      const response = await fetch(`https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashtags: [testHashtag.tag_name],
          resultsLimit: 3, // Только 3 для теста
          proxy: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"]
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ Получено ${data.length} reels от Apify`);
        
        // Показываем первый результат
        const firstReel = data[0];
        console.log(`   Пример: @${firstReel.ownerUsername} - ${firstReel.videoViewCount?.toLocaleString() || 'N/A'} просмотров`);
        
        // 4. Проверяем фильтры
        console.log('\n📊 Проверка фильтров:');
        
        const recentReels = data.filter(reel => {
          if (!reel.timestamp) return false;
          const publishedDate = new Date(reel.timestamp);
          const daysAgo = (new Date().getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 14; // Последние 14 дней
        });
        
        const viralReels = data.filter(reel => {
          const views = reel.videoViewCount || 0;
          return views >= 50000; // 50K+ просмотров
        });
        
        console.log(`   За последние 14 дней: ${recentReels.length} из ${data.length}`);
        console.log(`   С 50K+ просмотров: ${viralReels.length} из ${data.length}`);
        
        // 5. Тестовое сохранение в БД
        console.log('\n💾 Тестовое сохранение в БД:');
        
        if (viralReels.length > 0) {
          const testReel = viralReels[0];
          
          // Проверяем существует ли уже
          const existing = await sql`
            SELECT id FROM reels WHERE reel_url = ${testReel.url}
          `;
          
          if (existing.length > 0) {
            console.log(`⚠️ Reel уже существует в БД (ID: ${existing[0].id})`);
          } else {
            // Сохраняем тестовый reel
            const saved = await sql`
              INSERT INTO reels (
                reel_url, project_id, source_type, source_identifier,
                author_username, views_count, likes_count, comments_count,
                published_at, description, created_at
              ) VALUES (
                ${testReel.url}, 1, 'hashtag', ${testHashtag.id.toString()},
                ${testReel.ownerUsername}, ${testReel.videoViewCount || 0}, 
                ${testReel.likesCount || 0}, ${testReel.commentsCount || 0},
                ${testReel.timestamp ? new Date(testReel.timestamp) : null},
                ${testReel.caption || null}, NOW()
              ) RETURNING id
            `;
            
            console.log(`✅ Тестовый reel сохранен (ID: ${saved[0].id})`);
          }
        } else {
          console.log(`⚠️ Нет вирусных reels для сохранения`);
        }
        
        // 6. Итоговая оценка
        console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:');
        
        if (recentReels.length > 0 && viralReels.length > 0) {
          console.log('✅ СКРАПЕР РАБОТАЕТ ОТЛИЧНО!');
          console.log('   - Apify API доступен');
          console.log('   - Фильтры работают');
          console.log('   - База данных доступна');
          console.log('   - Есть качественные данные');
          
          console.log('\n🚀 Можно запускать полный скрапинг:');
          console.log(`npx tsx src/scripts/bulk-scrape-hashtags.ts 1 $APIFY_TOKEN 14 50000 50`);
          
        } else if (data.length > 0) {
          console.log('🟡 СКРАПЕР РАБОТАЕТ, НО МАЛО КАЧЕСТВЕННЫХ ДАННЫХ');
          console.log('   - Apify API доступен');
          console.log('   - Нужно снизить фильтры или увеличить лимит');
          
        } else {
          console.log('🔴 ПРОБЛЕМЫ СО СКРАПЕРОМ');
          console.log('   - Apify возвращает пустые данные');
          console.log('   - Возможно проблемы с хэштегом или лимитами');
        }
        
      } else {
        console.log('❌ Apify вернул пустые данные');
        console.log('Возможные причины:');
        console.log('   - Хэштег не популярен');
        console.log('   - Проблемы с прокси');
        console.log('   - Лимиты Instagram');
      }

    } catch (apifyError) {
      console.log(`❌ Ошибка Apify API: ${apifyError.message}`);
    }

  } catch (dbError) {
    console.log(`❌ Ошибка базы данных: ${dbError.message}`);
  }
}

quickScraperTest().catch(console.error);
