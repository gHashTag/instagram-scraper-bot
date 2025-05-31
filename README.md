# 🏭 КОНТЕНТ-ЗАВОД: Instagram Scraper Bot

> **Система анализа конкурентов и хэштегов в Instagram с автоматическими отчетами в Obsidian**

## 🎯 Что это?

Контент-завод автоматически собирает данные о конкурентах в Instagram и создает красивые отчеты в Obsidian для маркетологов.

## 🚀 Быстрый старт

### 1. Создать отчеты для проекта

```bash
# Дашборд проекта
bun run create:dashboard 1

# Анализ конкурентов
bun run export:report 1

# Анализ хэштегов
bun run export:hashtags 1

# Общий обзор завода
bun run create:overview
```

### 2. Найти отчеты в Obsidian

Откройте Obsidian → папка `content-factory` → выберите проект

## 📊 Что получите

- **📈 Анализ конкурентов** - кто лидер, статистика, топ-контент
- **🏷️ Анализ хэштегов** - эффективность, тренды, рекомендации
- **📊 Дашборды проектов** - центральное управление
- **🔄 Автоматизация** - ежедневные обновления

## 📁 Структура в Obsidian

```
content-factory/
├── overview-dashboard.md          # Общий обзор всех проектов
└── project-{название}/            # Папка проекта
    ├── dashboard.md               # Дашборд проекта
    ├── competitors/               # Анализ конкурентов
    ├── hashtags/                  # Анализ хэштегов
    └── reports/                   # Архив отчетов
```

## 🛠 Основные команды

| Команда                         | Описание           |
| ------------------------------- | ------------------ |
| `bun run create:dashboard {ID}` | Дашборд проекта    |
| `bun run export:report {ID}`    | Анализ конкурентов |
| `bun run export:hashtags {ID}`  | Анализ хэштегов    |
| `bun run create:overview`       | Общий обзор завода |
| `bun run export:public {ID}`    | Публичный отчет    |
| `bun run auto:update {ID}`      | Автообновление     |

## 📖 Документация

- **[OBSIDIAN_GUIDE.md](OBSIDIAN_GUIDE.md)** - Полное руководство по работе с отчетами
- **[CURRENT_STATE.md](CURRENT_STATE.md)** - Текущее состояние системы

## 🔧 Техническая информация

- **База данных:** Neon PostgreSQL
- **Runtime:** Bun + TypeScript
- **ORM:** Drizzle
- **Отчеты:** Obsidian Markdown

## 📞 Поддержка

```bash
# Проверка состояния
bun run db:studio        # База данных
bun run typecheck        # Проверка типов
bun test                 # Тесты
```

## 🚀 Деплой на Vercel

### Подготовка к деплою

1. **Установите Vercel CLI:**

   ```bash
   npm i -g vercel
   ```

2. **Настройте переменные окружения в Vercel:**
   - `TELEGRAM_BOT_TOKEN` - токен вашего Telegram бота
   - `DATABASE_URL` - строка подключения к Neon Database
   - `APIFY_TOKEN` - токен Apify для скрапинга
   - `OPENAI_API_KEY` - ключ OpenAI для анализа
   - `ADMIN_USER_ID` - ваш Telegram ID
   - `NODE_ENV=production`

### Деплой

1. **Первый деплой:**

   ```bash
   bun run deploy:vercel
   ```

2. **Настройка webhook:**

   ```bash
   bun run setup:webhook https://your-app.vercel.app
   ```

3. **Проверка работы:**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

### Мониторинг

- **Health Check:** `https://your-app.vercel.app/api/health`
- **Webhook Endpoint:** `https://your-app.vercel.app/api/webhook`
- **Vercel Dashboard:** Логи и метрики в панели Vercel

### Обновление

```bash
# Обновить код и задеплоить
git add .
git commit -m "Update bot"
bun run deploy:vercel
```

---

**Статус:** 🟢 Готов к использованию  
**Проектов:** 1 активный (АвтоСид Проект Клиники)  
**Данных:** 775+ Reels, 112M+ просмотров
