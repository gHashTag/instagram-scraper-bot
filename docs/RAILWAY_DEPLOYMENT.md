# 🚂 Деплой Instagram Scraper Bot на Railway

> **Полное руководство по развертыванию Telegram бота на Railway.app**

## 🎯 Что такое Railway?

Railway - это современная платформа для деплоя приложений, которая автоматически определяет тип проекта и настраивает окружение. Идеально подходит для Node.js приложений и Telegram ботов.

**Преимущества Railway:**
- ✅ Автоматическое определение технологий (Nixpacks)
- ✅ Встроенная PostgreSQL база данных
- ✅ Простая настройка переменных окружения
- ✅ Автоматические деплои из GitHub
- ✅ Бесплатный тариф для небольших проектов
- ✅ Встроенный мониторинг и логи

## 🚀 Быстрый старт

### 1. Подготовка проекта

Проект уже настроен для Railway! Все необходимые файлы созданы:

```bash
# Проверьте наличие файлов конфигурации
ls -la railway.json .railwayignore .env.railway
```

### 2. Создание аккаунта на Railway

1. Перейдите на [railway.app](https://railway.app)
2. Войдите через GitHub аккаунт
3. Подтвердите email адрес

### 3. Создание нового проекта

**Вариант A: Через GitHub (рекомендуется)**

1. В Railway Dashboard нажмите **"New Project"**
2. Выберите **"Deploy from GitHub repo"**
3. Выберите репозиторий `instagram-scraper-bot`
4. Railway автоматически определит Node.js проект

**Вариант B: Через Railway CLI**

```bash
# Установка Railway CLI
npm install -g @railway/cli

# Логин в Railway
railway login

# Инициализация проекта
railway init

# Связывание с GitHub репозиторием
railway link
```

### 4. Настройка переменных окружения

В Railway Dashboard перейдите в **Variables** и добавьте:

```env
# Обязательные переменные
BOT_TOKEN=your_telegram_bot_token
DATABASE_URL=postgresql://username:password@host:5432/database
APIFY_TOKEN=apify_api_your_token
OPENAI_API_KEY=sk-your_openai_key

# Опциональные
NODE_ENV=production
ADMIN_USER_ID=your_telegram_user_id
```

> 💡 **Совет:** Скопируйте переменные из файла `.env.railway`

### 5. Добавление PostgreSQL базы данных

1. В проекте нажмите **"+ New"**
2. Выберите **"Database"** → **"PostgreSQL"**
3. Railway автоматически создаст `DATABASE_URL`
4. Переменная будет доступна в вашем сервисе

### 6. Деплой

Railway автоматически задеплоит проект после:
- Добавления переменных окружения
- Подключения к GitHub репозиторию

Следите за процессом в разделе **"Deployments"**.

## ⚙️ Конфигурация

### railway.json

Проект использует файл `railway.json` для конфигурации:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run typecheck"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Health Check

Бот автоматически запускает HTTP сервер на порту `$PORT` для health check:

- **Endpoint:** `/health`
- **Ответ:** `{"status": "healthy", "uptime": 123}`
- **Таймаут:** 120 секунд

### Автоматические деплои

Railway автоматически деплоит при:
- Push в main ветку
- Изменениях в файлах `src/**`
- Обновлении `package.json`

## 🔧 Управление

### Просмотр логов

```bash
# Через CLI
railway logs

# Или в Dashboard → Deployments → View Logs
```

### Подключение к базе данных

```bash
# Через CLI
railway connect postgresql

# Или получить строку подключения
railway variables
```

### Перезапуск сервиса

```bash
# Через CLI
railway redeploy

# Или в Dashboard → Deployments → Redeploy
```

## 📊 Мониторинг

### Метрики

Railway предоставляет встроенные метрики:
- CPU и память
- Сетевой трафик
- Время отклика
- Количество запросов

### Алерты

Настройте уведомления в **Settings** → **Notifications**:
- Email уведомления
- Webhook интеграции
- Slack/Discord боты

## 🛠 Отладка

### Частые проблемы

**1. Бот не отвечает**
```bash
# Проверьте логи
railway logs --tail

# Проверьте переменные
railway variables
```

**2. Ошибка подключения к БД**
```bash
# Проверьте DATABASE_URL
echo $DATABASE_URL

# Тест подключения
railway run npm run db:migrate
```

**3. Health check не проходит**
```bash
# Проверьте HTTP сервер
curl https://your-app.railway.app/health

# Проверьте порт
echo $PORT
```

### Локальная отладка

```bash
# Запуск с Railway переменными
railway run npm run dev

# Подключение к Railway БД локально
railway connect postgresql
```

## 💰 Стоимость

**Бесплатный тариф:**
- $5 кредитов в месяц
- Достаточно для небольшого бота
- Автоматическая остановка при превышении

**Pro тариф ($20/месяц):**
- $20 кредитов + $0.000463/GB-час
- Приоритетная поддержка
- Больше ресурсов

## 🔐 Безопасность

### Переменные окружения

- ✅ Все секреты хранятся в Railway Variables
- ✅ Автоматическое шифрование
- ✅ Доступ только для авторизованных пользователей

### Сетевая безопасность

- ✅ HTTPS по умолчанию
- ✅ Автоматические SSL сертификаты
- ✅ DDoS защита

## 📚 Дополнительные ресурсы

- [Railway Documentation](https://docs.railway.app)
- [Railway Templates](https://railway.app/templates)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

## 🆘 Поддержка

**Если что-то не работает:**

1. Проверьте логи: `railway logs`
2. Проверьте переменные: `railway variables`
3. Перезапустите: `railway redeploy`
4. Обратитесь в Railway Discord
5. Создайте issue в GitHub репозитории

---

**🎉 Готово! Ваш Instagram Scraper Bot теперь работает на Railway!**
