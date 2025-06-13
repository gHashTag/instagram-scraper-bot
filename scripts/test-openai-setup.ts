/**
 * 🔧 ДИАГНОСТИКА OPENAI АККАУНТА И API
 *
 * Проверяет все возможные причины ошибки "billing_hard_limit_reached"
 * Основано на актуальной информации с форумов OpenAI 2024-2025
 */

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function diagnoseOpenAISetup() {
  console.log("🔧 ПОЛНАЯ ДИАГНОСТИКА OPENAI АККАУНТА");
  console.log("=====================================");
  console.log("");

  // 1. Проверка API ключа
  const apiKey = process.env.OPENAI_API_KEY;
  console.log("📋 ПРОВЕРКА API КЛЮЧА:");
  console.log(`✅ API Key найден: ${apiKey ? "ДА" : "НЕТ"}`);

  if (apiKey) {
    console.log(
      `📝 Тип ключа: ${apiKey.startsWith("sk-proj-") ? "PROJECT KEY (sk-proj-)" : "ORGANIZATION KEY (sk-)"}`
    );
    console.log(`🔑 Первые символы: ${apiKey.substring(0, 20)}...`);
    console.log(`📏 Длина ключа: ${apiKey.length} символов`);
  }
  console.log("");

  // 2. Простой тест API
  try {
    console.log("🧪 ТЕСТ БАЗОВОГО ДОСТУПА К API:");

    // Пробуем самый простой запрос
    const models = await openai.models.list();
    console.log("✅ API работает - модели доступны");
    console.log(`📊 Количество доступных моделей: ${models.data.length}`);

    // Проверим, есть ли Whisper
    const whisperModels = models.data.filter((m) => m.id.includes("whisper"));
    console.log(
      `🎤 Whisper модели: ${whisperModels.length > 0 ? whisperModels.map((m) => m.id).join(", ") : "НЕ НАЙДЕНЫ"}`
    );
  } catch (error: any) {
    console.log("❌ ОШИБКА API:", error.message);

    if (error.message.includes("billing_hard_limit_reached")) {
      console.log("🚨 НАЙДЕНА ПРОБЛЕМА: billing_hard_limit_reached");
      console.log("");
      console.log("📋 ВОЗМОЖНЫЕ ПРИЧИНЫ:");
      console.log("1. ❌ API ключ привязан к неправильной организации");
      console.log("2. ❌ Лимит организации установлен слишком низко");
      console.log("3. ❌ Лимит проекта установлен слишком низко");
      console.log("4. ❌ Используется старый (user) ключ вместо project ключа");
      console.log("5. ❌ Бюджет организации != реальные средства");
      console.log("6. ❌ Требуется верификация аккаунта");
      console.log("");
    }

    if (error.message.includes("insufficient_quota")) {
      console.log("🚨 НАЙДЕНА ПРОБЛЕМА: insufficient_quota");
      console.log("");
      console.log("📋 ВОЗМОЖНЫЕ ПРИЧИНЫ:");
      console.log("1. ❌ Закончились кредиты ($9.39 может быть недоступно)");
      console.log("2. ❌ Превышен месячный лимит организации");
      console.log("3. ❌ Превышен месячный лимит проекта");
      console.log("4. ❌ Кредиты истекли (free credits expire after 3 months)");
      console.log("");
    }
  }

  // 3. Тест транскрибации (самый простой)
  try {
    console.log("🎤 ТЕСТ ДОСТУПА К WHISPER API:");

    // Создаем минимальный аудио файл для тестирования
    const testBlob = new Blob(["test"], { type: "audio/mpeg" });
    const testFile = new File([testBlob], "test.mp3", { type: "audio/mpeg" });

    await openai.audio.transcriptions.create({
      file: testFile,
      model: "whisper-1",
    });

    console.log("✅ Whisper API доступен!");
  } catch (error: any) {
    console.log("❌ Whisper API недоступен:", error.message);

    if (error.message.includes("billing")) {
      console.log("🚨 ПОДТВЕРЖДЕНА ПРОБЛЕМА С БИЛЛИНГОМ");
    }
  }

  console.log("");
  console.log("🎯 РЕКОМЕНДАЦИИ ДЛЯ РЕШЕНИЯ ПРОБЛЕМЫ:");
  console.log("=====================================");
  console.log("");
  console.log("1. 🌐 ПРОВЕРЬТЕ В ВЕБ-ИНТЕРФЕЙСЕ:");
  console.log(
    "   → https://platform.openai.com/settings/organization/billing/overview"
  );
  console.log("   → Убедитесь, что баланс действительно $9.39");
  console.log("   → Проверьте, что кредиты не истекли");
  console.log("");
  console.log("2. 🏢 ПРОВЕРЬТЕ ЛИМИТЫ ОРГАНИЗАЦИИ:");
  console.log("   → https://platform.openai.com/settings/organization/limits");
  console.log("   → Установите лимит организации >= $20");
  console.log("");
  console.log("3. 📁 ПРОВЕРЬТЕ ЛИМИТЫ ПРОЕКТА:");
  console.log("   → Выберите проект → Settings → Limits");
  console.log("   → Установите лимит проекта >= $10");
  console.log("   → Убедитесь, что Whisper модели включены");
  console.log("");
  console.log("4. 🔑 СОЗДАЙТЕ НОВЫЙ API КЛЮЧ:");
  console.log("   → Удалите старый ключ");
  console.log("   → Создайте новый PROJECT ключ (sk-proj-)");
  console.log("   → Обновите переменную окружения");
  console.log("");
  console.log("5. 💳 ЕСЛИ НИЧЕГО НЕ ПОМОГАЕТ:");
  console.log("   → Добавьте еще $5-10 кредитов");
  console.log("   → Включите Auto-recharge");
  console.log("   → Обратитесь в поддержку OpenAI");

  console.log("");
  console.log("📞 КОНТАКТ ПОДДЕРЖКИ:");
  console.log("   → https://help.openai.com/");
  console.log('   → Внизу справа: кнопка "Help" для чата');
  console.log("");
}

diagnoseOpenAISetup().catch(console.error);
