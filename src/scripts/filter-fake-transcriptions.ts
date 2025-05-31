/**
 * Скрипт для фильтрации фейковых транскрипций
 *
 * Использование:
 * bun run src/scripts/filter-fake-transcriptions.ts <projectId> [minViews] [daysBack]
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
    "Использование: bun run src/scripts/filter-fake-transcriptions.ts <projectId> [minViews] [daysBack]"
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

// Функция для очистки транскрипции в базе данных
async function clearTranscription(
  reelId: number,
  adapter: NeonAdapter
): Promise<void> {
  try {
    console.log(`Очистка транскрипции для Reel ID: ${reelId}`);

    // Обновляем транскрипцию в базе данных
    await adapter.executeQuery(
      `UPDATE reels SET transcript = NULL, updated_at = NOW() WHERE id = $1`,
      [reelId]
    );

    console.log(`Транскрипция успешно очищена для Reel ID: ${reelId}`);
  } catch (error) {
    console.error(
      `Ошибка при очистке транскрипции для Reel ID ${reelId}: ${error}`
    );
    throw new Error(
      `Ошибка при очистке транскрипции: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Основная функция
async function main() {
  console.log(
    `Фильтрация фейковых транскрипций для проекта ${projectId} с минимум ${minViews} просмотров за последние ${daysBack} дней`
  );

  // Инициализируем адаптер для работы с базой данных
  const adapter = new NeonAdapter();
  await adapter.initialize();
  console.log("Соединение с БД Neon успешно инициализировано.");

  try {
    // Получаем дату для фильтрации
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - daysBack);

    // Получаем список Reels с транскрипциями
    const result = await adapter.executeQuery(
      `SELECT id, reel_url, transcript, author_username FROM reels 
       WHERE project_id = $1 
       AND source_type = 'competitor' 
       AND views_count >= $2 
       AND published_at >= $3
       AND transcript IS NOT NULL`,
      [projectId, minViews, date30DaysAgo.toISOString()]
    );

    console.log(`Найдено ${result.rows.length} Reels с транскрипциями`);

    // Фильтруем Reels с фейковыми транскрипциями
    const reelsWithFakeTranscriptions = result.rows.filter((reel: any) =>
      isFakeTranscription(reel.transcript)
    );
    console.log(
      `Из них ${reelsWithFakeTranscriptions.length} Reels с фейковыми транскрипциями`
    );

    if (reelsWithFakeTranscriptions.length === 0) {
      console.log("Нет Reels с фейковыми транскрипциями");
      return;
    }

    // Выводим список Reels с фейковыми транскрипциями
    console.log("\nСписок Reels с фейковыми транскрипциями:");
    console.log("===========================================");
    for (const reel of reelsWithFakeTranscriptions) {
      console.log(
        `ID: ${reel.id}, URL: ${reel.reel_url}, Автор: ${reel.author_username}`
      );
      console.log(`Транскрипция: "${reel.transcript}"`);
      console.log("-------------------------------------------");
    }

    // Спрашиваем пользователя, хочет ли он очистить фейковые транскрипции
    console.log("\nХотите очистить фейковые транскрипции? (y/n)");
    const answer = await new Promise<string>((resolve) => {
      process.stdin.once("data", (data) => {
        resolve(data.toString().trim().toLowerCase());
      });
    });

    if (answer === "y" || answer === "yes") {
      console.log("\nОчистка фейковых транскрипций...");

      // Очищаем фейковые транскрипции
      for (const reel of reelsWithFakeTranscriptions) {
        await clearTranscription(reel.id, adapter);
      }

      console.log("\nФейковые транскрипции успешно очищены");
    } else {
      console.log("\nОчистка фейковых транскрипций отменена");
    }
  } catch (error) {
    console.error("Ошибка при фильтрации фейковых транскрипций:", error);
  } finally {
    // Закрываем соединение с базой данных
    await adapter.close();
  }
}

// Запускаем основную функцию
main();
