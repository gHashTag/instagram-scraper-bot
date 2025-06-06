#!/usr/bin/env tsx

/**
 * 🗄️ Скрипт для выполнения миграций базы данных
 *
 * Создает все необходимые таблицы для Instagram Scraper Bot
 */

import { initializeDBConnection } from "../db/neonDB";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ: .env
dotenv.config();

async function runMigrations(): Promise<void> {
  console.log("🗄️ Запуск миграций базы данных...");

  try {
    // Инициализируем соединение с базой данных
    const db = initializeDBConnection();
    console.log("✅ Соединение с БД установлено");

    // Читаем SQL файл миграции
    const migrationPath = path.join(
      __dirname,
      "../db/migrations/create_initial_schema.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Файл миграции не найден: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    console.log("📄 Файл миграции загружен");

    // Выполняем миграцию
    console.log("🔄 Выполнение миграции...");

    // Разбиваем SQL на отдельные команды
    const commands = migrationSQL
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0);

    for (const command of commands) {
      if (command.trim()) {
        try {
          await db.execute(command);
          console.log(`✅ Выполнено: ${command.substring(0, 50)}...`);
        } catch (error) {
          console.warn(
            `⚠️ Команда пропущена (возможно, уже существует): ${command.substring(0, 50)}...`
          );
          console.warn(
            `   Ошибка: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    console.log("🎉 Миграции успешно выполнены!");

    // Проверяем, что таблицы созданы
    console.log("\n🔍 Проверка созданных таблиц...");

    const tables = [
      "users",
      "projects",
      "competitors",
      "hashtags",
      "reels",
      "parsing_runs",
    ];

    for (const table of tables) {
      try {
        const result = await db.execute(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        console.log(
          `✅ Таблица ${table}: найдено ${result.rows[0]?.count || 0} записей`
        );
      } catch (error) {
        console.error(
          `❌ Ошибка проверки таблицы ${table}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    console.log("\n🚀 База данных готова к использованию!");
  } catch (error) {
    console.error("❌ Ошибка при выполнении миграций:", error);
    process.exit(1);
  }
}

// Запускаем миграции
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch((error) => {
    console.error("💥 Критическая ошибка:", error);
    process.exit(1);
  });
}

export { runMigrations };
