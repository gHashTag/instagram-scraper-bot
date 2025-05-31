export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  // Устанавливаем CORS заголовки
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  });

  // Обрабатываем OPTIONS запрос
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  try {
    // Получаем данные из запроса
    const body = request.method === "POST" ? await request.json() : null;

    // Логируем входящий webhook
    console.log("📨 Telegram webhook received (Edge):", {
      method: request.method,
      url: request.url,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: new Date().toISOString(),
    });

    // Обрабатываем Telegram сообщение
    if (body && body.message) {
      const message = body.message;
      const chatId = message.chat?.id;
      const userId = message.from?.id;
      const username = message.from?.username;
      const text = message.text;

      console.log("💬 Message received:", {
        chat_id: chatId,
        user_id: userId,
        username: username,
        text: text,
        timestamp: new Date(message.date * 1000).toISOString(),
      });

      // Обрабатываем команды и сообщения
      if (chatId && text) {
        const botToken = process.env.BOT_TOKEN;
        let replyText = "";
        let keyboard = null;

        // Обрабатываем команды
        if (text.startsWith("/")) {
          const command = text.split(" ")[0].toLowerCase();

          switch (command) {
            case "/start":
              replyText = `👋 Привет, ${username || "друг"}! \n\n🤖 Я Instagram Scraper Bot для эстетической медицины.\n\n📋 Вот что я умею:\n\n🎤 /transcribe - Транскрибировать видео по URL\n📊 /projects - Управление проектами\n🔍 /competitors - Конкуренты\n#️⃣ /hashtags - Хэштеги\n🎬 /scrape - Запуск скрапинга\n👀 /reels - Просмотр Reels\n📈 /analytics - Аналитика\n🔔 /notifications - Уведомления\n📋 /collections - Коллекции\n🤖 /chatbot - Чат-бот\n❓ /help - Помощь\n\n✨ Выберите действие из меню!`;
              keyboard = {
                keyboard: [
                  ["🎤 Транскрибировать видео"],
                  ["📊 Проекты", "🔍 Конкуренты"],
                  ["#️⃣ Хэштеги", "🎬 Запустить скрапинг"],
                  ["👀 Просмотр Reels", "📈 Аналитика"],
                  ["🔔 Уведомления", "📋 Коллекции Reels"],
                  ["🤖 Чат-бот"],
                  ["ℹ️ Помощь"],
                ],
                resize_keyboard: true,
              };
              break;

            case "/transcribe":
              replyText = `🎬 *Транскрибация Instagram Reels* 🎬\n\nОтправьте ссылку на Instagram Reel, который вы хотите транскрибировать.\n\n🔄 Я скачаю видео\n🔊 Извлеку аудио\n📝 Преобразую речь в текст\n\n✅ *Пример ссылки:*\nhttps://www.instagram.com/reel/ABC123/\n\n⚡ **НОВОЕ**: Используется улучшенная логика из Telegraf сцен!`;
              break;

            case "/help":
              replyText = `❓ *Справка по командам*\n\n🎤 */transcribe* - Транскрибировать видео (УЛУЧШЕНО!)\n📊 */projects* - Управление проектами\n🔍 */competitors* - Управление конкурентами\n#️⃣ */hashtags* - Управление хэштегами\n🎬 */scrape* - Запустить скрапинг\n👀 */reels* - Просмотр Reels\n📈 */analytics* - Аналитика данных\n🔔 */notifications* - Настройка уведомлений\n📋 */collections* - Коллекции Reels\n🤖 */chatbot* - Чат-бот для общения с видео\n\n💡 *Совет:* Используйте кнопки меню для удобной навигации!\n\n⚡ **ОБНОВЛЕНИЕ**: Транскрибация теперь использует логику из полноценных Telegraf сцен!`;
              break;

            case "/projects":
              replyText = `📊 *Управление проектами*\n\nЗдесь вы можете создавать и управлять проектами для скрапинга Instagram.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/competitors":
              replyText = `🔍 *Управление конкурентами*\n\nДобавляйте и отслеживайте аккаунты конкурентов.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/hashtags":
              replyText = `#️⃣ *Управление хэштегами*\n\nНастройте хэштеги для мониторинга и скрапинга.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/scrape":
              replyText = `🎬 *Запуск скрапинга*\n\nЗапустите сбор данных с Instagram.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/reels":
              replyText = `👀 *Просмотр Reels*\n\nПросматривайте собранные Reels и их данные.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/analytics":
              replyText = `📈 *Аналитика данных*\n\nПолучайте подробную аналитику собранных данных.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/notifications":
              replyText = `🔔 *Настройка уведомлений*\n\nНастройте уведомления о новых данных.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/collections":
              replyText = `📋 *Коллекции Reels*\n\nСоздавайте и управляйте коллекциями Reels.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            case "/chatbot":
              replyText = `🤖 *Чат-бот для общения с видео*\n\nОбщайтесь с ИИ о содержании ваших видео.\n\n🔧 Эта функция требует полного интерфейса бота.\n\n💡 Используйте команду */start* для доступа к главному меню.`;
              break;

            default:
              replyText = `❓ Неизвестная команда: *${command}*\n\n📋 Доступные команды:\n🎤 /transcribe\n📊 /projects\n🔍 /competitors\n#️⃣ /hashtags\n🎬 /scrape\n👀 /reels\n📈 /analytics\n🔔 /notifications\n📋 /collections\n🤖 /chatbot\n❓ /help\n\n💡 Используйте /start для главного меню.`;
          }
        }
        // Обрабатываем кнопки меню
        else if (text === "🎤 Транскрибировать видео") {
          replyText = `🎬 *Транскрибация Instagram Reels* 🎬\n\nОтправьте ссылку на Instagram Reel, который вы хотите транскрибировать.\n\n🔄 Я скачаю видео\n🔊 Извлеку аудио\n📝 Преобразую речь в текст\n\n✅ *Пример ссылки:*\nhttps://www.instagram.com/reel/ABC123/\n\n⚡ **НОВОЕ**: Адаптированная логика из Telegraf сцен!\n💡 Прогресс транскрибации будет показан пошагово!`;
        } else if (text === "ℹ️ Помощь") {
          replyText = `❓ *Справка по боту*\n\n🤖 Я Instagram Scraper Bot для эстетической медицины.\n\n🎬 *Основная функция:* Транскрибация видео из Instagram Reels\n\n📋 *Другие функции:*\n• Управление проектами\n• Отслеживание конкурентов\n• Мониторинг хэштегов\n• Сбор и анализ данных\n• ИИ-чат с видео\n\n🔧 *Полный функционал доступен в основном интерфейсе бота.*\n\n💡 Начните с команды /start`;
        }
        // Проверяем, является ли текст Instagram URL
        else if (
          text.includes("instagram.com/reel/") ||
          text.includes("instagram.com/p/")
        ) {
          replyText = `🔗 *Instagram ссылка получена!*\n\n📎 URL: ${text}\n\n🔄 *Запускаю улучшенную транскрибацию...*\n\n⚡ **ОБНОВЛЕНИЕ**: Используем адаптированную логику из Telegraf сцен!\n\nОжидайте результат...`;

          // Запускаем транскрибацию асинхронно
          try {
            // Используем текущий домен
            const currentUrl = new URL(request.url);
            const baseUrl = `${currentUrl.protocol}//${currentUrl.host}`;

            // Отправляем запрос на улучшенную транскрибацию
            fetch(`${baseUrl}/api/transcribe-serverless`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: text,
                chatId: chatId,
              }),
            }).catch((error) => {
              console.error(
                "Ошибка при запуске улучшенной транскрибации:",
                error
              );

              // Отправляем сообщение об ошибке
              fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  chat_id: chatId,
                  text: `❌ *Ошибка запуска транскрибации*\n\n📝 ${error.message}\n\n💡 Попробуйте позже или используйте другую ссылку.`,
                  parse_mode: "Markdown",
                }),
              });
            });
          } catch (error) {
            console.error("Ошибка при инициализации транскрибации:", error);
            replyText = `❌ *Ошибка при запуске транскрибации*\n\n📝 ${error.message}\n\n💡 Попробуйте позже или используйте другую ссылку.`;
          }
        }
        // Обрабатываем другие кнопки меню
        else if (
          [
            "📊 Проекты",
            "🔍 Конкуренты",
            "#️⃣ Хэштеги",
            "🎬 Запустить скрапинг",
            "👀 Просмотр Reels",
            "📈 Аналитика",
            "🔔 Уведомления",
            "📋 Коллекции Reels",
            "🤖 Чат-бот",
          ].includes(text)
        ) {
          replyText = `🔧 *Функция "${text}"*\n\nЭта функция требует полного интерфейса бота с подключением к базе данных и сложной логикой.\n\n💡 *Что доступно сейчас:*\n🎤 Транскрибация видео (в разработке)\n❓ Справочная информация\n📋 Навигация по меню\n\n🚀 *Для полного функционала:*\nИспользуйте основной интерфейс бота с полной настройкой окружения.`;
        }
        // Обычное сообщение
        else {
          replyText = `💬 *Сообщение получено:* "${text}"\n\n👤 *От:* ${username || "Пользователь"}\n🆔 *ID:* ${userId}\n💬 *Чат:* ${chatId}\n⏰ *Время:* ${new Date().toLocaleString("ru-RU")}\n\n🤖 *Я понимаю команды и Instagram ссылки.*\n\n📋 Используйте /help для списка команд или /start для главного меню.`;
        }

        // Отправляем сообщение через Telegram API
        const telegramPayload = {
          chat_id: chatId,
          text: replyText,
          parse_mode: "Markdown",
        };

        if (keyboard) {
          telegramPayload.reply_markup = keyboard;
        }

        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(telegramPayload),
          }
        );

        const telegramResult = await telegramResponse.json();

        console.log("📤 Telegram API response:", {
          status: telegramResponse.status,
          result: telegramResult,
          timestamp: new Date().toISOString(),
        });

        // Возвращаем успешный ответ
        return new Response(
          JSON.stringify({
            ok: true,
            message: "Message processed and reply sent",
            telegram_response: telegramResult,
            timestamp: new Date().toISOString(),
            method: request.method,
            bodyReceived: !!body,
            runtime: "edge",
            command_processed: text.startsWith("/")
              ? text.split(" ")[0]
              : "message",
          }),
          { status: 200, headers }
        );
      }
    }

    // Отвечаем Telegram что все ОК (для других типов обновлений)
    return new Response(
      JSON.stringify({
        ok: true,
        message: "Telegram webhook received successfully (Edge Function)",
        timestamp: new Date().toISOString(),
        method: request.method,
        bodyReceived: !!body,
        runtime: "edge",
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("❌ Webhook error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        runtime: "edge",
      }),
      { status: 500, headers }
    );
  }
}
