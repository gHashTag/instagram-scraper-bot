# 🕉️ Meta Muse Instagram Scraper

**"संघर्षस्य फलं मिष्टं निष्कामस्य विशेषतः"**  
_"Плоды усилий сладки, особенно когда они бескорыстны"_

Автоматический скрепер Instagram для Meta Muse с транскрибацией видео и автоматизацией на 2 недели.

## 🎯 Что делает скрепер

- 📊 **151 хэштег** в 6 категориях
- 🤖 **Автоматическая транскрибация** видео через OpenAI Whisper
- 💾 **Сохранение в PostgreSQL** (Project ID: 2)
- ⏰ **Автоматизация на 14 дней** с ежедневным запуском
- 📈 **Детальная отчетность** и логирование

## 🏷️ Категории хэштегов

1. **Базовые хэштеги (7)**: #ai, #aiavatar, #future, #femtech, #futuretech, #aimodel, #aimodels
2. **AI-инфлюенсеры (30)**: #AIInfluencer, #VirtualInfluencer, #LilMiquela, и др.
3. **Метавселенные и технологии (24)**: #metaverse, #nft, #cryptoArt, #VR, #Web3, и др.
4. **Архетип: Муза/Маг/Провидец (30)**: #spiritualawakening, #consciousness, и др.
5. **Психоэмоциональный сегмент (30)**: #creativepreneur, #transformationalLeader, и др.
6. **Философия: дух + технологии (30)**: #spiritualTech, #techSpirituality, и др.

## 🚀 Быстрый старт

### 0. 🔧 Инициализация проекта (ОБЯЗАТЕЛЬНО)

```bash
# Создаем проект Meta Muse в базе данных и добавляем все 151 хэштег
bun run src/scripts/meta-muse-init-project.ts init
```

**Что происходит:**

- 📊 Создается проект "Meta Muse" (ID: 2) в таблице `projects`
- 🏷️ Добавляются все 151 хэштег в таблицу `hashtags` с привязкой к project_id=2
- 🔗 Настраиваются связи между таблицами
- ✅ Проверяется готовность к скрепингу

### 1. 🧪 Демо-запуск (рекомендуется для начала)

```bash
# Тестовый запуск с 6 хэштегами и 5 постами на каждый
bun run src/scripts/meta-muse-demo.ts
```

**Что происходит:**

- ⚡ Скрепит по 5 постов из 6 тестовых хэштегов
- 💾 Сохраняет в базу данных (project_id=2)
- 📊 Генерирует отчет в `exports/`
- ⏱️ Выполняется 2-5 минут

### 2. 🕷️ Полный запуск

```bash
# Полный скрепинг всех 151 хэштега
bun run src/scripts/meta-muse-automated-scraper.ts
```

**Что происходит:**

- 📊 Обрабатывает все 151 хэштег
- 🎤 Автоматическая транскрибация видео
- ⏰ Распределение по 14 дням
- 📈 До 100 постов на хэштег

### 3. ⏰ Автоматизация на 2 недели

```bash
# Генерируем файлы автоматизации
bun run src/scripts/meta-muse-scheduler.ts generate
```

Создаются файлы в `automation/meta-muse/`:

- 🌐 **GitHub Actions** (рекомендуется)
- 🐳 **Docker Compose**
- 🟢 **Node.js Scheduler**
- 🐧 **Linux Systemd**
- 🪟 **Windows Task Scheduler**

## ⚙️ Настройка

### Переменные окружения (.env)

```env
# Обязательные
APIFY_TOKEN=your_apify_token_here
DATABASE_URL=your_neon_postgresql_url

# Для транскрибации (опционально)
OPENAI_API_KEY=sk-your_openai_key_here
```

### Получение токенов

1. **Apify Token**: https://console.apify.com/account/integrations
2. **OpenAI API Key**: https://platform.openai.com/api-keys
3. **Neon Database**: уже настроена (Project ID: 2)

## 📊 Мониторинг и отчеты

### Логи выполнения

- 📄 Реалтайм прогресс в консоли
- 📊 Статистика после каждого дня
- 🎯 Финальный отчет в JSON

### Структура отчета

```json
{
  "totalHashtags": 151,
  "processedHashtags": 45,
  "totalPosts": 1250,
  "processedPosts": 1180,
  "transcribedPosts": 340,
  "errors": [],
  "startTime": "2024-01-15T09:00:00.000Z",
  "endTime": "2024-01-15T12:30:00.000Z"
}
```

## 🗄️ База данных

### Таблица: `reels`

- 🆔 **project_id**: 2 (Meta Muse)
- 🔗 **reel_url**: ссылка на Instagram пост
- 👤 **author_username**: автор поста
- 📝 **description**: описание поста
- 📊 **views_count, likes_count, comments_count**
- 🎤 **transcript**: транскрибация видео
- 📅 **published_at**: дата публикации
- 🔍 **source_identifier**: хэштег

### Запросы для анализа

```sql
-- Статистика по project_id=2
SELECT COUNT(*) as total_posts,
       COUNT(transcript) as transcribed_posts,
       AVG(views_count) as avg_views
FROM reels
WHERE project_id = 2;

-- Топ хэштеги по количеству постов
SELECT source_identifier, COUNT(*) as posts_count
FROM reels
WHERE project_id = 2
GROUP BY source_identifier
ORDER BY posts_count DESC;

-- Посты с транскрипциями
SELECT author_username, description, transcript, views_count
FROM reels
WHERE project_id = 2 AND transcript IS NOT NULL
ORDER BY views_count DESC;
```

## 🔧 Варианты автоматизации

### 1. 🌐 GitHub Actions (рекомендуется)

**Преимущества:**

- ✅ Бесплатно (до 2000 минут/месяц)
- ☁️ Выполняется в облаке
- 📋 Автоматические логи и отчеты
- 🔄 Надежные повторные запуски

**Настройка:**

```bash
# Скопируйте workflow
cp automation/meta-muse/github-action.yml .github/workflows/

# Добавьте секреты в GitHub Settings:
# APIFY_TOKEN, DATABASE_URL, OPENAI_API_KEY
```

### 2. 🐳 Docker Compose

**Преимущества:**

- 🔒 Изолированная среда
- 📦 Воспроизводимые запуски
- 🖥️ Локальное выполнение

```bash
cd automation/meta-muse/
docker-compose up -d
```

### 3. 🟢 Node.js Scheduler

**Преимущества:**

- 🎛️ Полный контроль
- ⚡ Быстрая настройка

```bash
cd automation/meta-muse/
npm install node-cron
node node-scheduler.js
```

## 📈 Ожидаемые результаты

### Объем данных (за 14 дней)

- 📊 **151 хэштег** обработано
- 📄 **~7,500 постов** собрано (50-100 на хэштег)
- 🎤 **~2,000 транскрипций** создано
- 💾 **~1.5 ГБ** данных в базе

### Время выполнения

- 🧪 **Демо**: 2-5 минут
- 📅 **Ежедневно**: 2-4 часа
- 🔄 **Полный цикл**: 14 дней

## 🆘 Устранение неполадок

### Ошибки токенов

```bash
# Проверьте .env файл
cat .env | grep -E "(APIFY_TOKEN|DATABASE_URL|OPENAI_API_KEY)"
```

### Ошибки базы данных

```bash
# Проверьте подключение к Neon
bun exec drizzle-kit introspect:pg
```

### Ошибки Apify

- 🔍 Проверьте лимиты аккаунта: https://console.apify.com
- 💰 Убедитесь в наличии кредитов
- 🌐 Проверьте прокси настройки

## 📞 Поддержка

При проблемах:

1. 📋 Проверьте логи в консоли
2. 📊 Изучите отчеты в `exports/`
3. 🔍 Проанализируйте ошибки в статистике

---

🕉️ **"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"**  
_"Ты имеешь право только на действие, но не на плоды действия"_

**Meta Muse готова к запуску! 🐭⚡**
