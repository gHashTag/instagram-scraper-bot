import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL || process.argv[2];

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения");
  process.exit(1);
}

if (!VERCEL_URL) {
  console.error("❌ Укажите URL Vercel приложения:");
  console.error("   bun run setup:webhook https://your-app.vercel.app");
  process.exit(1);
}

async function setupWebhook() {
  try {
    const webhookUrl = `${VERCEL_URL}/api/webhook`;

    console.log(`🔗 Настройка webhook: ${webhookUrl}`);

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: true,
        }),
      }
    );

    const result = await response.json();

    if (result.ok) {
      console.log("✅ Webhook успешно настроен!");
      console.log(`📍 URL: ${webhookUrl}`);

      // Проверяем статус webhook
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      );
      const info = await infoResponse.json();

      if (info.ok) {
        console.log("\n📊 Информация о webhook:");
        console.log(`   URL: ${info.result.url}`);
        console.log(`   Pending updates: ${info.result.pending_update_count}`);
        console.log(
          `   Last error: ${info.result.last_error_message || "Нет"}`
        );
      }
    } else {
      console.error("❌ Ошибка настройки webhook:", result);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

setupWebhook();
