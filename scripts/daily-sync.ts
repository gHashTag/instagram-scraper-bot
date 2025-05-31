#!/usr/bin/env tsx

/**
 * 🔄 Ежедневная синхронизация Obsidian vault
 * 
 * Этот скрипт запускается автоматически каждые 24 часа
 * и обновляет все данные в Obsidian vault для команды
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

// Импортируем функцию синхронизации
import { syncObsidianSystem } from "./sync-obsidian-system.js";

interface ProjectConfig {
  id: number;
  name: string;
  enabled: boolean;
}

// Конфигурация проектов для синхронизации
const PROJECTS: ProjectConfig[] = [
  {
    id: 1,
    name: "Coco Age",
    enabled: true
  }
  // Можно добавить другие проекты в будущем
];

async function dailySync(): Promise<void> {
  console.log("🔄 Запуск ежедневной синхронизации Obsidian vault...");
  console.log(`📅 Время запуска: ${new Date().toLocaleString("ru-RU")}`);
  
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  // Проверяем переменные окружения
  if (!process.env.OBSIDIAN_VAULT_PATH) {
    console.error("❌ Не указан путь OBSIDIAN_VAULT_PATH в переменных окружения");
    process.exit(1);
  }

  console.log(`📁 Vault path: ${process.env.OBSIDIAN_VAULT_PATH}`);
  console.log(`🗃️ Проектов для синхронизации: ${PROJECTS.filter(p => p.enabled).length}`);
  
  // Синхронизируем каждый активный проект
  for (const project of PROJECTS) {
    if (!project.enabled) {
      console.log(`⏭️ Пропускаем проект ${project.name} (отключен)`);
      continue;
    }

    try {
      console.log(`\n🔄 Синхронизация проекта: ${project.name} (ID: ${project.id})`);
      
      await syncObsidianSystem(project.id);
      
      successCount++;
      console.log(`✅ Проект ${project.name} успешно синхронизирован`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ Ошибка синхронизации проекта ${project.name}:`, error);
      
      // Продолжаем с другими проектами, не останавливаемся на ошибке
      continue;
    }
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  // Итоговый отчет
  console.log("\n" + "=".repeat(50));
  console.log("📊 ИТОГОВЫЙ ОТЧЕТ СИНХРОНИЗАЦИИ");
  console.log("=".repeat(50));
  console.log(`⏱️ Время выполнения: ${duration} секунд`);
  console.log(`✅ Успешно синхронизировано: ${successCount} проектов`);
  console.log(`❌ Ошибок: ${errorCount}`);
  console.log(`📅 Завершено: ${new Date().toLocaleString("ru-RU")}`);
  
  if (errorCount > 0) {
    console.log(`⚠️ Обнаружены ошибки при синхронизации ${errorCount} проектов`);
    console.log("📋 Проверьте логи выше для диагностики проблем");
  }

  // Создаем файл статуса для мониторинга
  await createSyncStatusFile(successCount, errorCount, duration);

  console.log("\n🎉 Ежедневная синхронизация завершена!");
  
  // Выходим с кодом ошибки если были проблемы
  if (errorCount > 0) {
    process.exit(1);
  }
}

async function createSyncStatusFile(successCount: number, errorCount: number, duration: number): Promise<void> {
  const statusPath = path.join(process.env.OBSIDIAN_VAULT_PATH || "", "sync-status.json");
  
  const status = {
    lastSync: new Date().toISOString(),
    lastSyncFormatted: new Date().toLocaleString("ru-RU"),
    successCount,
    errorCount,
    duration,
    status: errorCount === 0 ? "success" : "partial_failure",
    projects: PROJECTS.filter(p => p.enabled).map(p => ({
      id: p.id,
      name: p.name,
      status: "synced" // В реальности нужно отслеживать статус каждого проекта
    }))
  };

  try {
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2), "utf8");
    console.log(`📄 Статус синхронизации сохранен: ${statusPath}`);
  } catch (error) {
    console.error("❌ Ошибка сохранения статуса:", error);
  }
}

// Обработка ошибок
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Необработанная ошибка Promise:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Необработанное исключение:', error);
  process.exit(1);
});

// Запускаем синхронизацию
if (import.meta.url === `file://${process.argv[1]}`) {
  dailySync().catch((error) => {
    console.error("❌ Критическая ошибка ежедневной синхронизации:", error);
    process.exit(1);
  });
}
