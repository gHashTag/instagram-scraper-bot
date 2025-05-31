#!/usr/bin/env bun

/**
 * Тест глобального контекста проекта
 * Проверяет работу ProjectContextService
 */

import { projectContextService } from "../src/services/project-context-service";

async function testGlobalProjectContext() {
  console.log("🧪 Тестирование глобального контекста проекта...");

  const testTelegramId = 123456789;
  const testProjectId = 6;
  const testProjectName = "Тестовый проект";
  const testUserId = "test-user-uuid";

  try {
    // Тест 1: Очищаем контекст и проверяем, что проект не выбран
    console.log("📝 Тест 1: Очистка и проверка отсутствия выбранного проекта");
    projectContextService.clearSelectedProject(testTelegramId);
    const initialProject =
      projectContextService.getSelectedProject(testTelegramId);
    if (initialProject === null || initialProject === undefined) {
      console.log("✅ Изначально проект не выбран - корректно");
    } else {
      console.log("❌ Ошибка: изначально проект уже выбран:", initialProject);
      return;
    }

    // Тест 2: Устанавливаем проект
    console.log("📝 Тест 2: Установка выбранного проекта");
    projectContextService.setSelectedProject(
      testTelegramId,
      testProjectId,
      testProjectName,
      testUserId
    );
    console.log("✅ Проект установлен");

    // Тест 3: Проверяем, что проект установлен
    console.log("📝 Тест 3: Проверка установленного проекта");
    const selectedProject =
      projectContextService.getSelectedProject(testTelegramId);
    if (
      selectedProject &&
      selectedProject.id === testProjectId &&
      selectedProject.name === testProjectName
    ) {
      console.log("✅ Проект корректно установлен и получен");
      console.log(`   - ID: ${selectedProject.id}`);
      console.log(`   - Название: ${selectedProject.name}`);
      console.log(`   - Пользователь: ${selectedProject.userId}`);
      console.log(`   - Время выбора: ${selectedProject.selectedAt}`);
    } else {
      console.log("❌ Ошибка: проект не установлен или данные некорректны");
      return;
    }

    // Тест 4: Проверяем удобные методы
    console.log("📝 Тест 4: Проверка удобных методов");
    const hasProject = projectContextService.hasSelectedProject(testTelegramId);
    const projectId =
      projectContextService.getSelectedProjectId(testTelegramId);
    const projectName =
      projectContextService.getSelectedProjectName(testTelegramId);

    if (
      hasProject &&
      projectId === testProjectId &&
      projectName === testProjectName
    ) {
      console.log("✅ Удобные методы работают корректно");
      console.log(`   - hasSelectedProject(): ${hasProject}`);
      console.log(`   - getSelectedProjectId(): ${projectId}`);
      console.log(`   - getSelectedProjectName(): ${projectName}`);
    } else {
      console.log("❌ Ошибка: удобные методы работают некорректно");
      return;
    }

    // Тест 5: Проверяем статистику
    console.log("📝 Тест 5: Проверка статистики");
    const stats = projectContextService.getStats();
    if (stats.totalUsers >= 1 && stats.activeContexts >= 1) {
      console.log("✅ Статистика работает корректно");
      console.log(`   - Всего пользователей: ${stats.totalUsers}`);
      console.log(`   - Активных контекстов: ${stats.activeContexts}`);
    } else {
      console.log("❌ Ошибка: статистика работает некорректно");
      return;
    }

    // Тест 6: Очищаем контекст
    console.log("📝 Тест 6: Очистка контекста");
    projectContextService.clearSelectedProject(testTelegramId);
    const clearedProject =
      projectContextService.getSelectedProject(testTelegramId);
    if (clearedProject === null || clearedProject === undefined) {
      console.log("✅ Контекст успешно очищен");
    } else {
      console.log("❌ Ошибка: контекст не очищен:", clearedProject);
      return;
    }

    console.log(
      "\n🎉 Все тесты глобального контекста проекта пройдены успешно!"
    );
  } catch (error) {
    console.error("❌ Ошибка при тестировании глобального контекста:", error);
  }
}

// Запускаем тест
testGlobalProjectContext();
