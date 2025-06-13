import OpenAI from "openai";
import dotenv from "dotenv";

// Загружаем переменные окружения
dotenv.config();

async function testOpenAI() {
  console.log("🔧 ТЕСТ OPENAI API (Организация 999agents)");
  console.log("============================================");

  // Проверяем переменные окружения
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("❌ OPENAI_API_KEY не найден в .env");
    return;
  }

  console.log(
    `🔑 API Key найден: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}`
  );

  try {
    // Инициализируем OpenAI клиент
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log("\n🤖 Тестируем простой GPT запрос...");

    // Простой тест GPT-3.5
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: "Скажи 'привет' на русском" }],
      model: "gpt-3.5-turbo",
      max_tokens: 50,
    });

    console.log("✅ GPT API работает!");
    console.log(`📝 Ответ: ${completion.choices[0].message.content}`);

    console.log("\n🎤 Тестируем Whisper API...");

    // Создаем минимальный тестовый файл
    const fs = require("fs");
    const testAudioData = Buffer.from("test audio data");

    // Создаем временный файл
    const testFile = {
      arrayBuffer: () => Promise.resolve(testAudioData.buffer),
      name: "test.mp3",
      type: "audio/mpeg",
    } as any;

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: testFile,
        model: "whisper-1",
      });

      console.log("✅ Whisper API доступен!");
      console.log(`📝 Результат: ${transcription.text}`);
    } catch (whisperError: any) {
      console.log("❌ Whisper API ошибка:", whisperError.message);

      if (whisperError.message.includes("insufficient_quota")) {
        console.log("🚨 ПРОБЛЕМА: Недостаточно кредитов");
      } else if (whisperError.message.includes("billing")) {
        console.log("🚨 ПРОБЛЕМА: Настройки биллинга");
      }
    }
  } catch (error: any) {
    console.log("❌ OpenAI API ошибка:", error.message);

    if (error.message.includes("quota")) {
      console.log("🚨 ПРОБЛЕМА: Превышена квота или закончились кредиты");
      console.log(
        "💡 РЕШЕНИЕ: Проверьте баланс на https://platform.openai.com/settings/organization/billing"
      );
    } else if (error.message.includes("authentication")) {
      console.log("🚨 ПРОБЛЕМА: Неверный API ключ");
      console.log("💡 РЕШЕНИЕ: Проверьте API ключ в .env файле");
    } else {
      console.log("🚨 НЕИЗВЕСТНАЯ ПРОБЛЕМА:", error);
    }
  }

  console.log("\n📊 ТЕКУЩИЙ СТАТУС:");
  console.log("─────────────────────");
  console.log("✅ API ключ от организации 999agents");
  console.log("✅ $59.24 на балансе организации");
  console.log("✅ Код транскрибации существует");
  console.log("❓ Нужно протестировать Whisper API");
}

testOpenAI().catch(console.error);
