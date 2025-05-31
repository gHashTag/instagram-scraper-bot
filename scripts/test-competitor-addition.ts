#!/usr/bin/env bun

/**
 * Тест добавления конкурентов
 * Проверяет работу метода addCompetitorAccount в NeonAdapter
 */

import { NeonAdapter } from "../src/adapters/neon-adapter";

async function testCompetitorAddition() {
  console.log("🧪 Тестирование добавления конкурентов...");

  const adapter = new NeonAdapter();

  try {
    // Инициализация адаптера
    await adapter.initialize();
    console.log("✅ Адаптер инициализирован");

    // Получаем тестовый проект (предполагаем, что проект с ID 6 существует)
    const projectId = 6;
    const testUsername = "test_competitor_" + Date.now();
    const testUrl = `https://www.instagram.com/${testUsername}`;

    console.log(`📝 Добавляем тестового конкурента: ${testUsername}`);

    // Добавляем конкурента
    const competitor = await adapter.addCompetitorAccount(
      projectId,
      testUsername,
      testUrl
    );

    console.log("✅ Конкурент успешно добавлен:", {
      id: competitor.id,
      username: competitor.username,
      instagram_url: competitor.instagram_url,
      project_id: competitor.project_id,
    });

    // Получаем список конкурентов для проверки
    const competitors = await adapter.getCompetitorsByProjectId(projectId);
    console.log(
      `📊 Всего конкурентов в проекте ${projectId}: ${competitors.length}`
    );

    // Удаляем тестового конкурента
    console.log(`🗑️ Удаляем тестового конкурента: ${testUsername}`);
    const deleted = await adapter.deleteCompetitorAccount(
      projectId,
      testUsername
    );

    if (deleted) {
      console.log("✅ Тестовый конкурент успешно удален");
    } else {
      console.log("⚠️ Не удалось удалить тестового конкурента");
    }

    console.log("🎉 Тест завершен успешно!");
  } catch (error) {
    console.error("❌ Ошибка в тесте:", error);
    throw error;
  } finally {
    await adapter.close();
    console.log("🔒 Соединение с базой данных закрыто");
  }
}

// Запуск теста
testCompetitorAddition()
  .then(() => {
    console.log("✅ Все тесты пройдены!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Тест провален:", error);
    process.exit(1);
  });
