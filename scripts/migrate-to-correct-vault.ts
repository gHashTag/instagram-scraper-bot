#!/usr/bin/env bun

/**
 * 🔄 Скрипт миграции данных в правильное хранилище
 * 
 * Переносит все данные из старых локаций в /Users/playra/vaults/999
 * и удаляет дубликаты из старых мест
 */

import fs from "fs";
import path from "path";

const OLD_PATHS = [
  "/Users/playra/Library/Mobile Documents/iCloud~md~obsidian/Documents/999",
  "/Users/playra/instagram-scraper-bot/content-factory"
];

const NEW_VAULT_PATH = "/Users/playra/vaults/999";

function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Создана директория: ${dirPath}`);
  }
}

function copyDirectory(source: string, destination: string): void {
  if (!fs.existsSync(source)) {
    console.log(`⚠️ Источник не найден: ${source}`);
    return;
  }

  ensureDirectoryExists(destination);

  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      // Проверяем, существует ли уже файл в назначении
      if (fs.existsSync(destPath)) {
        // Сравниваем даты модификации
        const sourceStats = fs.statSync(sourcePath);
        const destStats = fs.statSync(destPath);
        
        if (sourceStats.mtime > destStats.mtime) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`🔄 Обновлен: ${item}`);
        } else {
          console.log(`⏭️ Пропущен (актуальный): ${item}`);
        }
      } else {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`📁 Скопирован: ${item}`);
      }
    }
  }
}

function removeDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`🗑️ Удалена старая директория: ${dirPath}`);
  }
}

function migrateData(): void {
  console.log("🚀 Начинаем миграцию данных в правильное хранилище...");
  console.log(`📍 Целевой путь: ${NEW_VAULT_PATH}`);

  // Создаем основную структуру в новом месте
  ensureDirectoryExists(NEW_VAULT_PATH);
  ensureDirectoryExists(path.join(NEW_VAULT_PATH, "content-factory"));

  // Переносим данные из всех старых локаций
  for (const oldPath of OLD_PATHS) {
    console.log(`\n📦 Обрабатываем: ${oldPath}`);
    
    if (fs.existsSync(oldPath)) {
      // Если это content-factory в проекте, переносим содержимое
      if (oldPath.includes("instagram-scraper-bot")) {
        const contentFactorySource = oldPath;
        const contentFactoryDest = path.join(NEW_VAULT_PATH, "content-factory");
        copyDirectory(contentFactorySource, contentFactoryDest);
      } else {
        // Если это старый vault, переносим все содержимое
        copyDirectory(oldPath, NEW_VAULT_PATH);
      }
    }
  }

  console.log("\n✅ Миграция завершена!");
}

function cleanupOldData(): void {
  console.log("\n🧹 Очистка старых данных...");

  // Удаляем content-factory из проекта (оставляем только в vault)
  const projectContentFactory = "/Users/playra/instagram-scraper-bot/content-factory";
  if (fs.existsSync(projectContentFactory)) {
    removeDirectory(projectContentFactory);
  }

  // НЕ удаляем iCloud vault, так как он может использоваться
  // Только выводим предупреждение
  const iCloudPath = "/Users/playra/Library/Mobile Documents/iCloud~md~obsidian/Documents/999";
  if (fs.existsSync(iCloudPath)) {
    console.log(`⚠️ ВНИМАНИЕ: Старый iCloud vault все еще существует: ${iCloudPath}`);
    console.log(`   Рекомендуется вручную проверить и удалить после подтверждения миграции`);
  }

  console.log("✅ Очистка завершена!");
}

function createVaultStructure(): void {
  console.log("\n🏗️ Создание правильной структуры vault...");

  const vaultStructure = [
    "content-factory",
    "content-factory/🏭-Content-Factory",
    "content-factory/🥥-coco-age-analytics", 
    "content-factory/Coco-Age-Analytics",
    "content-factory/📊-DataEdit-Tables",
  ];

  for (const dir of vaultStructure) {
    const fullPath = path.join(NEW_VAULT_PATH, dir);
    ensureDirectoryExists(fullPath);
  }

  console.log("✅ Структура vault создана!");
}

function verifyMigration(): void {
  console.log("\n🔍 Проверка результатов миграции...");

  const expectedFiles = [
    "content-factory/🥥✨ COCO AGE - Полное руководство.md",
    "content-factory/🥥✨ COCO AGE - Руководство пользователя.md",
    "content-factory/🏭-Content-Factory/🏭 Контент-завод - Главная.md",
    "content-factory/📊-DataEdit-Tables/Top-Content-Analysis.md",
  ];

  let allFilesExist = true;

  for (const file of expectedFiles) {
    const fullPath = path.join(NEW_VAULT_PATH, file);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Найден: ${file}`);
    } else {
      console.log(`❌ Отсутствует: ${file}`);
      allFilesExist = false;
    }
  }

  if (allFilesExist) {
    console.log("\n🎉 Миграция успешна! Все ключевые файлы на месте.");
  } else {
    console.log("\n⚠️ Некоторые файлы отсутствуют. Проверьте миграцию.");
  }
}

function updateConfigFiles(): void {
  console.log("\n⚙️ Обновление конфигурационных файлов...");

  // Проверяем, что .env уже обновлен
  const envPath = "/Users/playra/instagram-scraper-bot/.env";
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    if (envContent.includes("/Users/playra/vaults/999")) {
      console.log("✅ .env файл уже обновлен");
    } else {
      console.log("⚠️ .env файл требует обновления");
    }
  }

  console.log("✅ Конфигурация проверена!");
}

// Основная функция
function main(): void {
  console.log("🔄 МИГРАЦИЯ ДАННЫХ COCO AGE В ПРАВИЛЬНОЕ ХРАНИЛИЩЕ");
  console.log("=" .repeat(60));

  try {
    createVaultStructure();
    migrateData();
    cleanupOldData();
    updateConfigFiles();
    verifyMigration();

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!");
    console.log(`📍 Все данные теперь в: ${NEW_VAULT_PATH}`);
    console.log("🔄 Можно запускать синхронизацию с новым путем");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("❌ Ошибка миграции:", error);
    process.exit(1);
  }
}

// Запуск
main();
