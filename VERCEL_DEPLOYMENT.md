# 🚀 Деплой Instagram Scraper Bot на Vercel

## ✅ Статус деплоя

**Приложение успешно задеплоено!**

- **URL:** https://instagram-scraper-aanpf542v-ghashtag.vercel.app
- **Health Check:** https://instagram-scraper-aanpf542v-ghashtag.vercel.app/api/health
- **Webhook:** https://instagram-scraper-aanpf542v-ghashtag.vercel.app/api/webhook

## 🔧 Настройка переменных окружения

Перейдите в [Vercel Dashboard](https://vercel.com/ghashtag/instagram-scraper-bot/settings/environment-variables) и добавьте:

### Обязательные переменные:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
DATABASE_URL=your_neon_database_url
ADMIN_USER_ID=your_telegram_user_id
```

### Дополнительные переменные:

```
APIFY_TOKEN=your_apify_token
OPENAI_API_KEY=your_openai_key
OBSIDIAN_VAULT_PATH=/path/to/obsidian/vault
NODE_ENV=production
```

## 🔗 Настройка Telegram Webhook

После добавления переменных окружения:

1. **Локально (с токеном в .env):**

   ```bash
   bun run setup:webhook https://instagram-scraper-aanpf542v-ghashtag.vercel.app
   ```

2. **Или через Telegram API напрямую:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{
          "url": "https://instagram-scraper-aanpf542v-ghashtag.vercel.app/api/webhook",
          "allowed_updates": ["message", "callback_query"],
          "drop_pending_updates": true
        }'
   ```

## 📊 Проверка работы

1. **Health Check:**

   ```bash
   curl https://instagram-scraper-aanpf542v-ghashtag.vercel.app/api/health
   ```

2. **Webhook Info:**

   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

3. **Тест бота:**
   - Отправьте `/start` вашему боту в Telegram
   - Должен ответить: "🏭 Контент-завод запущен!"

## 🔄 Обновление деплоя

```bash
# Внести изменения в код
git add .
git commit -m "Update bot"

# Задеплоить обновления
bun run deploy:vercel
```

## 📝 Логи и мониторинг

- **Vercel Dashboard:** https://vercel.com/ghashtag/instagram-scraper-bot
- **Function Logs:** Доступны в реальном времени в дашборде
- **Metrics:** Автоматически собираются Vercel

## ⚠️ Важные замечания

1. **Приватность:** Приложение требует аутентификацию Vercel для доступа к health endpoint
2. **Webhook:** Telegram webhook работает без аутентификации (как и должно быть)
3. **Timeout:** Functions имеют лимит 30 секунд для webhook, 10 секунд для health
4. **Environment:** Переменные окружения нужно настроить в Vercel Dashboard

## 🎯 Следующие шаги

1. ✅ Деплой завершен
2. ⏳ Настроить переменные окружения в Vercel
3. ⏳ Настроить webhook
4. ⏳ Протестировать бота

---

**Создано:** 2024-12-19  
**Статус:** �� Готово к настройке
