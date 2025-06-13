#!/usr/bin/env bun

/**
 * 🐭 Meta Muse Daily Runner
 * Ежедневный запуск скрапинга с полным логированием
 */

import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// 🔧 Configuration
const LOG_DIR = "logs";
const PROJECT_ID = 2;

// 📅 Create log directory if it doesn't exist
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

// 📝 Setup logging
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const logFile = join(LOG_DIR, `meta-muse-daily-${timestamp}.log`);

function log(message: string): void {
  const timestampedMessage = `[${new Date().toISOString()}] ${message}`;
  console.log(timestampedMessage);

  // Append to log file
  try {
    writeFileSync(logFile, timestampedMessage + "\n", { flag: "a" });
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

async function runDailyMeta(): Promise<void> {
  log("🐭 Meta Muse Daily Runner - ЗАПУСК");
  log("═".repeat(50));
  log(`📅 Дата: ${new Date().toLocaleString()}`);
  log(`🆔 Project ID: ${PROJECT_ID}`);
  log(`📝 Лог файл: ${logFile}`);

  try {
    // 1. Check environment
    log("\n🔍 ПРОВЕРКА ОКРУЖЕНИЯ:");

    const requiredEnvVars = ["DATABASE_URL", "APIFY_TOKEN", "OPENAI_API_KEY"];
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        log(`✅ ${envVar}: настроен`);
      } else {
        throw new Error(`❌ ${envVar}: не настроен`);
      }
    }

    // 2. Run database migrations
    log("\n🗄️ МИГРАЦИИ БАЗЫ ДАННЫХ:");
    try {
      execSync("bun run db:migrate", { stdio: "pipe" });
      log("✅ Миграции выполнены успешно");
    } catch (error) {
      log(`⚠️ Миграции: ${error}`);
      // Continue anyway, migrations might not be needed
    }

    // 3. Run type check
    log("\n🔍 ПРОВЕРКА ТИПОВ:");
    try {
      execSync("bun run typecheck", { stdio: "pipe" });
      log("✅ Типы проверены успешно");
    } catch (error) {
      log(`❌ Ошибки типов: ${error}`);
      throw new Error("Проверка типов не пройдена");
    }

    // 4. Run Meta Muse scraping
    log("\n🐭 ЗАПУСК META MUSE СКРАПИНГА:");
    log("⏳ Начинаем скрапинг (это может занять до 3 часов)...");

    const startTime = Date.now();

    try {
      const output = execSync("bun run meta-muse:scrape", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 3 * 60 * 60 * 1000, // 3 hours timeout
      });

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes

      log(`✅ Скрапинг завершен успешно за ${duration} минут`);
      log("📊 Вывод скрапинга:");
      log(output);
    } catch (error: any) {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000 / 60);

      log(`❌ Скрапинг завершился с ошибкой после ${duration} минут`);
      log(`Ошибка: ${error.message}`);

      if (error.stdout) {
        log("📊 Частичный вывод:");
        log(error.stdout);
      }

      throw error;
    }

    // 5. Generate data report
    log("\n📊 ГЕНЕРАЦИЯ ОТЧЕТА:");
    try {
      const reportOutput = execSync("bun run meta-muse:check", {
        stdio: "pipe",
        encoding: "utf8",
      });

      log("✅ Отчет сгенерирован:");
      log(reportOutput);

      // Save report to file
      const reportFile = join(LOG_DIR, `meta-muse-report-${timestamp}.txt`);
      writeFileSync(reportFile, reportOutput);
      log(`📄 Отчет сохранен: ${reportFile}`);
    } catch (error) {
      log(`⚠️ Ошибка генерации отчета: ${error}`);
      // Continue anyway
    }

    // 6. Success summary
    log("\n🎉 УСПЕШНОЕ ЗАВЕРШЕНИЕ!");
    log("✅ Все этапы выполнены успешно");
    log(`📝 Полный лог: ${logFile}`);
    log("🔄 Следующий запуск: через 24 часа");
  } catch (error: any) {
    log("\n💥 КРИТИЧЕСКАЯ ОШИБКА:");
    log(`❌ ${error.message}`);
    log(`📝 Полный лог ошибки: ${logFile}`);

    // Exit with error code
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runDailyMeta().catch((error) => {
    console.error("💥 Неожиданная ошибка:", error);
    process.exit(1);
  });
}

export { runDailyMeta };
