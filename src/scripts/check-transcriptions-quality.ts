/**
 * Скрипт для проверки качества транскрипций
 *
 * Использование:
 * bun run src/scripts/check-transcriptions-quality.ts <projectId> [minViews] [daysBack]
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
    "Использование: bun run src/scripts/check-transcriptions-quality.ts <projectId> [minViews] [daysBack]"
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

// Список фраз, которые указывают на фейковую транскрипцию
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

// Функция для проверки, является ли транскрипция фейковой
function isFakeTranscription(transcript: string | null): boolean {
  if (!transcript) return true;

  // Проверяем, содержит ли транскрипция фейковые фразы
  for (const phrase of fakeTranscriptionPhrases) {
    if (transcript.includes(phrase)) {
      return true;
    }
  }

  // Проверяем длину транскрипции
  if (transcript.length < 10) {
    return true;
  }

  return false;
}

// Функция для проверки, является ли транскрипция заглушкой от GPT
function isPlaceholderTranscription(transcript: string | null): boolean {
  if (!transcript) return false;

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
      return true;
    }
  }

  return false;
}

// Основная функция
async function main() {
  console.log(
    `Проверка качества транскрипций для проекта ${projectId} с минимум ${minViews} просмотров за последние ${daysBack} дней`
  );

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем список всех Reels
    const result = await adapter.executeQuery(
      `SELECT id, reel_url, author_username, views_count, transcript FROM reels 
       WHERE project_id = $1 
       AND source_type = 'competitor' 
       AND views_count >= $2 
       AND published_at >= $3
       ORDER BY views_count DESC`,
      [projectId, minViews, date30DaysAgo.toISOString()]
    );

    console.log(
      `Найдено ${result.rows.length} Reels с минимум ${minViews} просмотров за последние ${daysBack} дней`
    );

    // Подсчитываем статистику
    const reelsWithTranscription = result.rows.filter(
      (reel) => reel.transcript !== null
    );
    const reelsWithoutTranscription = result.rows.filter(
      (reel) => reel.transcript === null
    );
    const reelsWithFakeTranscription = result.rows.filter(
      (reel) => reel.transcript !== null && isFakeTranscription(reel.transcript)
    );
    const reelsWithPlaceholderTranscription = result.rows.filter(
      (reel) =>
        reel.transcript !== null && isPlaceholderTranscription(reel.transcript)
    );
    const reelsWithRealTranscription = result.rows.filter(
      (reel) =>
        reel.transcript !== null &&
        !isFakeTranscription(reel.transcript) &&
        !isPlaceholderTranscription(reel.transcript)
    );

    console.log(`\nСтатистика транскрипций:`);
    console.log(`- Всего Reels: ${result.rows.length}`);
    console.log(
      `- Reels с транскрипциями: ${reelsWithTranscription.length} (${Math.round((reelsWithTranscription.length / result.rows.length) * 100)}%)`
    );
    console.log(
      `- Reels без транскрипций: ${reelsWithoutTranscription.length} (${Math.round((reelsWithoutTranscription.length / result.rows.length) * 100)}%)`
    );
    console.log(
      `- Reels с фейковыми транскрипциями: ${reelsWithFakeTranscription.length} (${Math.round((reelsWithFakeTranscription.length / result.rows.length) * 100)}%)`
    );
    console.log(
      `- Reels с заглушками от GPT: ${reelsWithPlaceholderTranscription.length} (${Math.round((reelsWithPlaceholderTranscription.length / result.rows.length) * 100)}%)`
    );
    console.log(
      `- Reels с реальными транскрипциями: ${reelsWithRealTranscription.length} (${Math.round((reelsWithRealTranscription.length / result.rows.length) * 100)}%)`
    );

    // Выводим список Reels с реальными транскрипциями
    if (reelsWithRealTranscription.length > 0) {
      console.log(`\nReels с реальными транскрипциями:`);
      for (const reel of reelsWithRealTranscription) {
        console.log(
          `- ID: ${reel.id}, Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
        );
        console.log(`  URL: ${reel.reel_url}`);
        console.log(`  Транскрипция: ${reel.transcript}`);
        console.log();
      }
    }

    // Выводим список Reels с заглушками от GPT
    if (reelsWithPlaceholderTranscription.length > 0) {
      console.log(`\nReels с заглушками от GPT:`);
      for (const reel of reelsWithPlaceholderTranscription) {
        console.log(
          `- ID: ${reel.id}, Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
        );
        console.log(`  URL: ${reel.reel_url}`);
        console.log(`  Транскрипция: ${reel.transcript}`);
        console.log();
      }
    }

    // Выводим список Reels с фейковыми транскрипциями
    if (reelsWithFakeTranscription.length > 0) {
      console.log(`\nReels с фейковыми транскрипциями:`);
      for (const reel of reelsWithFakeTranscription) {
        console.log(
          `- ID: ${reel.id}, Автор: ${reel.author_username}, Просмотры: ${reel.views_count}`
        );
        console.log(`  URL: ${reel.reel_url}`);
        console.log(`  Транскрипция: ${reel.transcript}`);
        console.log();
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке качества транскрипций:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
