# 🚂 Railway Быстрый Старт

> **Деплой Instagram Scraper Bot на Railway за 5 минут**

## ✅ Проверка готовности

```bash
npm run railway:check
```

Если все ✅ - продолжаем!

## 🚀 Автоматический деплой

```bash
# Автоматическая настройка и деплой
npm run railway:setup
```

Скрипт выполнит:
- Установку Railway CLI
- Авторизацию в Railway
- Создание проекта
- Добавление PostgreSQL
- Настройку переменных окружения
- Деплой проекта

## 🔧 Ручной деплой

### 1. Установка Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Авторизация

```bash
railway login
```

### 3. Создание проекта

```bash
railway init
```

### 4. Добавление PostgreSQL

```bash
railway add --database postgresql
```

### 5. Настройка переменных

В Railway Dashboard → Variables добавьте:

```env
BOT_TOKEN=your_telegram_bot_token
APIFY_TOKEN=your_apify_token  
OPENAI_API_KEY=your_openai_key
NODE_ENV=production
```

`DATABASE_URL` создается автоматически с PostgreSQL.

### 6. Деплой

```bash
railway up
```

## 📊 Проверка деплоя

```bash
# Статус проекта
railway status

# Логи
railway logs --tail 100

# Переменные
railway variables
```

## 🌐 Доступ к боту

После деплоя:
- **Health Check:** `https://your-app.railway.app/health`
- **Telegram Bot:** Работает автоматически
- **API:** `https://your-app.railway.app/api`

## 🔄 Автоматические деплои

Railway автоматически деплоит при:
- Push в main ветку
- Изменениях в `src/**`
- Обновлении `package.json`

## 🆘 Проблемы?

```bash
# Перезапуск
railway redeploy

# Подключение к БД
railway connect postgresql

# Полные логи
railway logs
```

## 📚 Подробная документация

- [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md) - Полное руководство
- [Railway Docs](https://docs.railway.app) - Официальная документация

---

**🎉 Готово! Ваш бот работает на Railway!**
