import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

console.log(
  `🤖 Автоматическое обновление данных - ${new Date().toLocaleString("ru-RU")}`
);

async function runCommand(
  command: string,
  description: string
): Promise<boolean> {
  try {
    console.log(`\n🔄 ${description}...`);
    const output = execSync(command, {
      encoding: "utf8",
      cwd: path.join(__dirname, ".."),
      stdio: "pipe",
    });
    console.log(`✅ ${description} - завершено`);
    if (output.trim()) {
      console.log(
        `📝 Результат: ${output.trim().split("\n").slice(-3).join("\n")}`
      );
    }
    return true;
  } catch (error: any) {
    console.error(`❌ ${description} - ошибка:`, error.message);
    return false;
  }
}

async function main() {
  const projectId = process.argv[2] || process.env.DEFAULT_PROJECT_ID || "1";

  console.log(`📊 Проект для обновления: ${projectId}`);

  // 1. Скрапинг новых данных
  const scrapingSuccess = await runCommand(
    `bun run scrape:bulk ${projectId}`,
    "Скрапинг новых данных конкурентов"
  );

  if (!scrapingSuccess) {
    console.log("⚠️ Скрапинг не удался, но продолжаем с существующими данными");
  }

  // 2. Создание отчетов
  const reportSuccess = await runCommand(
    `bun run export:report ${projectId}`,
    "Создание отчета по конкурентам"
  );

  const hashtagsSuccess = await runCommand(
    `bun run export:hashtags ${projectId}`,
    "Создание отчета по хэштегам"
  );

  const overviewSuccess = await runCommand(
    `bun run create:overview ${projectId}`,
    "Создание общего обзора"
  );

  if (!reportSuccess && !hashtagsSuccess) {
    console.error("❌ Не удалось создать отчеты");
    process.exit(1);
  }

  // 3. Создание публичной версии (если настроено)
  const publicPath = process.env.PUBLIC_REPORTS_PATH;
  if (publicPath && fs.existsSync(publicPath)) {
    const publicSuccess = await runCommand(
      `bun run export:public ${projectId}`,
      "Создание публичной версии отчета"
    );

    if (publicSuccess) {
      console.log(`📢 Публичный отчет создан в: ${publicPath}`);
    }
  }

  console.log(
    `\n🎉 Автоматическое обновление завершено - ${new Date().toLocaleString("ru-RU")}`
  );
  console.log(
    `📊 Следующее обновление: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString("ru-RU")}`
  );
}

main().catch((err) => {
  console.error("❌ Критическая ошибка автоматического обновления:", err);
  process.exit(1);
});
