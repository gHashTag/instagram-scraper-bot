# 🔍 RapidAPI Similar Users Parser

Документация по системе парсинга похожих пользователей Instagram через RapidAPI.

## 📋 Обзор

Система автоматически находит и сохраняет похожих пользователей Instagram для анализа конкурентов и поиска потенциальных партнеров.

## 🏗️ Архитектура

### База данных

#### Таблица `similar_users`
```sql
CREATE TABLE similar_users (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_username VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  full_name VARCHAR(255),
  biography TEXT,
  profile_pic_url TEXT,
  profile_pic_url_hd TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_business_account BOOLEAN DEFAULT FALSE,
  is_joined_recently BOOLEAN DEFAULT FALSE,
  is_professional_account BOOLEAN DEFAULT FALSE,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  external_url TEXT,
  business_category_name VARCHAR(255),
  category_name VARCHAR(255),
  similarity_score INTEGER,
  mutual_followers_count INTEGER,
  mutual_following_count INTEGER,
  raw_data JSONB,
  scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Таблица `rapid_api_logs`
```sql
CREATE TABLE rapid_api_logs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  endpoint VARCHAR(255) NOT NULL,
  username_or_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  response_code INTEGER,
  response_time_ms INTEGER,
  users_found INTEGER DEFAULT 0,
  users_saved INTEGER DEFAULT 0,
  error_message TEXT,
  raw_response JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 Использование

### Командная строка

#### Базовый парсинг
```bash
# Парсинг для проекта по умолчанию (ID: 1)
bun run parse:similar-users

# Парсинг для конкретного проекта
bun run parse:similar-users --project-id 2

# Парсинг конкретного пользователя
bun run parse:similar-users --username sooyaaa__

# Парсинг списка пользователей
bun run parse:similar-users --usernames "user1,user2,user3"

# Тестовый режим (без сохранения в БД)
bun run parse:similar-users:dry
```

#### Прямой вызов TypeScript
```bash
# Базовый парсинг
tsx src/scripts/parse-similar-users.ts

# С параметрами
tsx src/scripts/parse-similar-users.ts --project-id 1 --username sooyaaa__ --dry-run
```

### Программный API

```typescript
import { SimilarUsersParser } from './src/scripts/parse-similar-users';
import { RapidApiService } from './src/services/rapidApiService';

// Создание парсера
const parser = new SimilarUsersParser();

// Парсинг похожих пользователей
const results = await parser.parseSimilarUsers({
  projectId: 1,
  username: 'sooyaaa__',
  dryRun: false
});

// Прямое использование сервиса
const rapidApiService = new RapidApiService();
const similarUsers = await rapidApiService.getSimilarUsers('sooyaaa__', 1);

// Получение статистики
const stats = await rapidApiService.getApiStats(1, 7); // за последние 7 дней
```

## 🔧 Настройка

### Переменные окружения

Создайте файл `.env` с следующими переменными:

```env
# Database
DATABASE_URL="postgresql://neondb_owner:password@host/database?sslmode=require"

# RapidAPI Instagram Scraper
RAPIDAPI_HOST="real-time-instagram-scraper-api1.p.rapidapi.com"
RAPIDAPI_KEY="your_rapidapi_key_here"

# Telegram Bot (для уведомлений)
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_chat_id"
```

### GitHub Secrets

Для GitHub Actions добавьте следующие secrets:

- `DATABASE_URL` - строка подключения к Neon Database
- `RAPIDAPI_KEY` - ключ RapidAPI
- `TELEGRAM_BOT_TOKEN` - токен Telegram бота
- `TELEGRAM_CHAT_ID` - ID чата для уведомлений

## 📊 GitHub Actions

### Автоматический парсинг

Workflow `parse-similar-users.yml` запускается:
- **Ежедневно в 8:00 UTC** (11:00 МСК)
- **Вручную** через GitHub Actions UI

### Ручной запуск

1. Перейдите в GitHub Actions
2. Выберите workflow "Parse Similar Users Daily"
3. Нажмите "Run workflow"
4. Укажите параметры:
   - `project_id` - ID проекта (по умолчанию: 1)
   - `usernames` - список пользователей через запятую
   - `dry_run` - тестовый режим

## 📈 Мониторинг

### Логи в базе данных

Все API вызовы логируются в таблицу `rapid_api_logs`:

```sql
-- Последние вызовы
SELECT * FROM rapid_api_logs 
WHERE project_id = 1 
ORDER BY created_at DESC 
LIMIT 10;

-- Статистика успешных/неуспешных вызовов
SELECT 
  status,
  COUNT(*) as count,
  AVG(response_time_ms) as avg_response_time
FROM rapid_api_logs 
WHERE project_id = 1 
GROUP BY status;
```

### Telegram уведомления

Система отправляет уведомления в Telegram:
- ✅ Успешное завершение парсинга
- ❌ Ошибки при выполнении
- 📊 Статистика по найденным пользователям

## 🔍 Анализ данных

### Похожие пользователи

```sql
-- Топ пользователей по количеству подписчиков
SELECT 
  username,
  full_name,
  followers_count,
  is_verified,
  is_business_account,
  similarity_score
FROM similar_users 
WHERE project_id = 1 
ORDER BY followers_count DESC 
LIMIT 20;

-- Бизнес-аккаунты
SELECT 
  username,
  business_category_name,
  followers_count,
  posts_count
FROM similar_users 
WHERE project_id = 1 
  AND is_business_account = true
ORDER BY followers_count DESC;
```

### Статистика API

```sql
-- Статистика за последние 7 дней
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_calls,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_calls,
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_calls,
  AVG(response_time_ms) as avg_response_time,
  SUM(users_found) as total_users_found,
  SUM(users_saved) as total_users_saved
FROM rapid_api_logs 
WHERE project_id = 1 
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🛠️ Разработка

### Структура файлов

```
src/
├── db/
│   └── schema.ts              # Схема базы данных
├── services/
│   └── rapidApiService.ts     # Сервис для работы с RapidAPI
└── scripts/
    └── parse-similar-users.ts # Основной скрипт парсинга

.github/workflows/
└── parse-similar-users.yml    # GitHub Actions workflow
```

### Добавление новых эндпоинтов

1. Добавьте новый метод в `RapidApiService`
2. Обновите схему базы данных при необходимости
3. Добавьте логирование в `rapidApiLogsTable`
4. Обновите документацию

### Тестирование

```bash
# Тестовый режим
bun run parse:similar-users:dry

# Тест конкретного пользователя
tsx src/scripts/parse-similar-users.ts --username test_user --dry-run

# Тест с кастомными параметрами
tsx src/scripts/parse-similar-users.ts --project-id 1 --usernames "user1,user2" --dry-run
```

## 🚨 Устранение неполадок

### Частые ошибки

1. **RAPIDAPI_KEY не настроен**
   - Проверьте переменную окружения `RAPIDAPI_KEY`
   - Убедитесь, что ключ действителен

2. **Ошибки подключения к базе данных**
   - Проверьте `DATABASE_URL`
   - Убедитесь в доступности Neon Database

3. **Rate limiting от RapidAPI**
   - Добавьте задержки между запросами
   - Проверьте лимиты вашего плана

4. **Ошибки миграции**
   - Запустите `bun run db:migrate`
   - Проверьте схему базы данных

### Логи

```bash
# Просмотр логов в реальном времени
tail -f bot.log

# Поиск ошибок
grep "ERROR" bot.log

# Поиск API вызовов
grep "RapidAPI" bot.log
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи в GitHub Actions
2. Изучите таблицу `rapid_api_logs`
3. Проверьте переменные окружения
4. Убедитесь в доступности внешних сервисов

---

*🕉️ Да пребудет автоматизация с нами.* 🙏 