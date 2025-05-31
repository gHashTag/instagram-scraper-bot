/**
 * Скрипт для проверки Reels по хэштегам
 *
 * Использование:
 * bun run src/scripts/check-hashtags-reels.ts <projectId> [minViews] [daysBack]
 *
 * Параметры:
 * - projectId: ID проекта
 * - minViews: (опционально) Минимальное количество просмотров (по умолчанию 50000)
 * - daysBack: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
 */

import { NeonAdapter } from "../adapters/neon-adapter";

// Получаем аргументы командной строки
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    "Использование: bun run src/scripts/check-hashtags-reels.ts <projectId> [minViews] [daysBack]"
  );
  process.exit(1);
}

const projectId = parseInt(args[0], 10);
const minViews = args[1] ? parseInt(args[1], 10) : 50000;
const daysBack = args[2] ? parseInt(args[2], 10) : 30;

if (isNaN(projectId) || isNaN(minViews) || isNaN(daysBack)) {
  console.error("Ошибка: projectId, minViews и daysBack должны быть числами");
  process.exit(1);
}

// Функция для проверки, является ли транскрипция реальной
function isRealTranscription(transcript: string | null): boolean {
  if (!transcript) return false;

  // Проверяем, содержит ли транскрипция фейковые фразы
  const fakeTranscriptionPhrases = [
    "Субтитры делал",
    "Субтитры сделал",
    "Субтитры добавил",
    "Субтитры подготовил",
    "ПОДПИШИСЬ",
    "С вами был",
    "Спасибо за субтитры",
    "Один, два, три",
    "Фристайлер",
  ];

  for (const phrase of fakeTranscriptionPhrases) {
    if (transcript.includes(phrase)) {
      return false;
    }
  }

  // Проверяем, содержит ли транскрипция фразы-заглушки от GPT
  const placeholderPhrases = [
    "Так как в предоставленном тексте нет",
    "К сожалению, в представленном вами тексте нет",
    "Так как представленный текст не содержит",
    "Пожалуйста, предоставьте более подробный текст",
    "исправить или улучшить его невозможно",
    "улучшить его не представляется возможным",
    "Спасибо за просмотр",
    "Благодарю за просмотр",
  ];

  for (const phrase of placeholderPhrases) {
    if (transcript.includes(phrase)) {
      return false;
    }
  }

  // Проверяем длину транскрипции
  if (transcript.length < 10) {
    return false;
  }

  return true;
}

// Основная функция
async function main() {
  console.log(
    `Проверка Reels по хэштегам для проекта ${projectId} с минимум ${minViews} просмотров за последние ${daysBack} дней`
  );

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем список хэштегов проекта
    const hashtagsResult = await adapter.executeQuery(
      `SELECT * FROM hashtags WHERE project_id = $1`,
      [projectId]
    );

    console.log(
      `Найдено ${hashtagsResult.rows.length} хэштегов для проекта ${projectId}`
    );

    if (hashtagsResult.rows.length === 0) {
      console.log("Нет хэштегов для проверки");
      return;
    }

    // Получаем список Reels по хэштегам

    try {
      const reelsResult = await adapter.executeQuery(
        `SELECT r.*, h.tag_name as hashtag_name
         FROM reels r, hashtags h
         WHERE r.project_id = $1
         AND h.project_id = $1
         AND r.source_type = 'hashtag'
         AND r.views_count >= $2
         AND h.id::text = r.source_identifier
         ORDER BY r.views_count DESC`,
        [projectId, minViews]
      );

      if (!reelsResult || !reelsResult.rows) {
        console.log("Запрос не вернул результатов или произошла ошибка");
        return;
      }

      console.log(
        `Найдено ${reelsResult.rows.length} Reels по хэштегам с минимум ${minViews} просмотров за последние ${daysBack} дней`
      );

      if (reelsResult.rows.length === 0) {
        console.log("Нет Reels по хэштегам для проверки");
        return;
      }

      // Группируем Reels по хэштегам
      const reelsByHashtag = new Map<string, any[]>();
      for (const reel of reelsResult.rows) {
        const hashtagName = reel.hashtag_name;
        if (!reelsByHashtag.has(hashtagName)) {
          reelsByHashtag.set(hashtagName, []);
        }
        reelsByHashtag.get(hashtagName)!.push(reel);
      }

      // Выводим статистику по хэштегам
      console.log("\nСтатистика по хэштегам:");
      console.log("=======================");

      for (const [hashtagName, reels] of reelsByHashtag.entries()) {
        const reelsWithTranscription = reels.filter(
          (reel) => reel.transcript !== null
        );
        const reelsWithRealTranscription = reels.filter((reel) =>
          isRealTranscription(reel.transcript)
        );

        console.log(`\nХэштег: #${hashtagName}`);
        console.log(`- Всего Reels: ${reels.length}`);
        console.log(
          `- Reels с транскрипциями: ${reelsWithTranscription.length} (${Math.round((reelsWithTranscription.length / reels.length) * 100)}%)`
        );
        console.log(
          `- Reels с реальными транскрипциями: ${reelsWithRealTranscription.length} (${Math.round((reelsWithRealTranscription.length / reels.length) * 100)}%)`
        );
        console.log(
          `- Reels без транскрипций: ${reels.length - reelsWithTranscription.length} (${Math.round(((reels.length - reelsWithTranscription.length) / reels.length) * 100)}%)`
        );

        // Выводим топ-5 Reels по просмотрам
        console.log("\nТоп-5 Reels по просмотрам:");
        const top5Reels = reels.slice(0, 5);
        for (const reel of top5Reels) {
          console.log(
            `- ID: ${reel.id}, Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
          );
          console.log(`  URL: ${reel.reel_url}`);
          console.log(
            `  Транскрипция: ${reel.transcript ? (isRealTranscription(reel.transcript) ? "✅" : "❌") : "❌"}`
          );
        }
      }

      // Выводим общую статистику
      const totalReels = reelsResult.rows.length;
      const reelsWithTranscription = reelsResult.rows.filter(
        (reel) => reel.transcript !== null
      ).length;
      const reelsWithRealTranscription = reelsResult.rows.filter((reel) =>
        isRealTranscription(reel.transcript)
      ).length;

      console.log("\nОбщая статистика:");
      console.log("================");
      console.log(`- Всего Reels: ${totalReels}`);
      console.log(
        `- Reels с транскрипциями: ${reelsWithTranscription} (${Math.round((reelsWithTranscription / totalReels) * 100)}%)`
      );
      console.log(
        `- Reels с реальными транскрипциями: ${reelsWithRealTranscription} (${Math.round((reelsWithRealTranscription / totalReels) * 100)}%)`
      );
      console.log(
        `- Reels без транскрипций: ${totalReels - reelsWithTranscription} (${Math.round(((totalReels - reelsWithTranscription) / totalReels) * 100)}%)`
      );

      // Выводим топ-10 Reels по просмотрам
      console.log("\nТоп-10 Reels по просмотрам (все хэштеги):");
      const top10Reels = reelsResult.rows.slice(0, 10);
      for (const reel of top10Reels) {
        console.log(
          `- ID: ${reel.id}, Хэштег: #${reel.hashtag_name}, Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
        );
        console.log(`  URL: ${reel.reel_url}`);
        console.log(
          `  Транскрипция: ${reel.transcript ? (isRealTranscription(reel.transcript) ? "✅" : "❌") : "❌"}`
        );
      }
    } catch (error) {
      console.error("Ошибка при получении Reels по хэштегам:", error);
    }
  } catch (error) {
    console.error("Ошибка при проверке Reels по хэштегам:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
