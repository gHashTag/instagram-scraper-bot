# Скрипты для работы с Instagram Scraper Bot

В этой директории находятся скрипты для работы с Instagram Scraper Bot, включая парсинг, экспорт, транскрибацию и анализ данных.

## Предварительные требования

1. Установленный [Bun](https://bun.sh/) или Node.js
2. Токен доступа к Apify API (должен быть указан в переменной окружения `APIFY_TOKEN`)
3. Доступ к базе данных Neon (должен быть указан в переменной окружения `DATABASE_URL`)
4. Для транскрибации: API ключ OpenAI (должен быть указан в переменной окружения `OPENAI_API_KEY`)

## Категории скриптов

- **Скрапинг**: Скрипты для сбора данных из Instagram
- **Экспорт**: Скрипты для экспорта данных в различные форматы
- **Транскрибация**: Скрипты для преобразования аудио в текст
- **Анализ**: Скрипты для анализа и визуализации данных
- **Утилиты**: Вспомогательные скрипты для работы с базой данных и API

## Доступные скрипты

### 1. Парсинг Reels конкурентов

Скрипт для парсинга Reels конкурентов.

```bash
bun run src/scripts/scrape-competitor-reels.ts <projectId> <competitorId> [limit]
```

**Параметры:**
- `projectId`: ID проекта
- `competitorId`: ID конкурента (если указан 0, будут обработаны все конкуренты проекта)
- `limit`: (опционально) максимальное количество Reels для парсинга (по умолчанию 10)

**Примеры:**
```bash
# Парсинг Reels для конкурента с ID 5 в проекте с ID 1, лимит 20 Reels
bun run src/scripts/scrape-competitor-reels.ts 1 5 20

# Парсинг Reels для всех конкурентов в проекте с ID 1, лимит 50 Reels
bun run src/scripts/scrape-competitor-reels.ts 1 0 50
```

### 1.1. Парсинг Reels конкурентов с явным указанием токена

Скрипт для парсинга Reels конкурентов с явным указанием токена Apify.

```bash
bun run src/scripts/scrape-with-token.ts <projectId> <competitorId> <token> [limit]
```

**Параметры:**
- `projectId`: ID проекта
- `competitorId`: ID конкурента (если указан 0, будут обработаны все конкуренты проекта)
- `token`: Токен Apify API (начинается с "apify_api_")
- `limit`: (опционально) максимальное количество Reels для парсинга (по умолчанию 5)

**Примеры:**
```bash
# Парсинг Reels для конкурента с ID 1 в проекте с ID 1, с указанием токена, лимит 5 Reels
bun run src/scripts/scrape-with-token.ts 1 1 apify_api_1k4iDib6gFRa6iHYhl6cpVIgcPUJah1MnaM2 5

# Парсинг Reels для всех конкурентов в проекте с ID 1, с указанием токена, лимит 10 Reels
bun run src/scripts/scrape-with-token.ts 1 0 apify_api_1k4iDib6gFRa6iHYhl6cpVIgcPUJah1MnaM2 10
```

### 2. Парсинг Reels по хештегам

Скрипт для парсинга Reels по хештегам.

```bash
bun run src/scripts/scrape-hashtag-reels.ts <projectId> <hashtagId> [limit]
```

**Параметры:**
- `projectId`: ID проекта
- `hashtagId`: ID хештега (если указан 0, будут обработаны все хештеги проекта)
- `limit`: (опционально) максимальное количество Reels для парсинга (по умолчанию 10)

**Примеры:**
```bash
# Парсинг Reels для хештега с ID 3 в проекте с ID 1, лимит 20 Reels
bun run src/scripts/scrape-hashtag-reels.ts 1 3 20

# Парсинг Reels для всех хештегов в проекте с ID 1, лимит 50 Reels
bun run src/scripts/scrape-hashtag-reels.ts 1 0 50
```

### 3. Полный парсинг (конкуренты + хештеги)

Скрипт для полного парсинга Reels (конкуренты + хештеги).

```bash
bun run src/scripts/scrape-all.ts <projectId> [limit]
```

**Параметры:**
- `projectId`: ID проекта
- `limit`: (опционально) общий максимальный лимит Reels для парсинга (по умолчанию 20)

**Примеры:**
```bash
# Полный парсинг для проекта с ID 1, общий лимит 50 Reels
bun run src/scripts/scrape-all.ts 1 50
```

## Логирование

Все скрипты выводят подробную информацию о процессе парсинга в консоль. Кроме того, информация о запусках парсинга сохраняется в таблице `parsing_runs` в базе данных.

## Настройка параметров парсинга

В скриптах можно настроить следующие параметры парсинга:

- `minViews`: Минимальное количество просмотров Reels (по умолчанию 1000)
- `maxAgeDays`: Максимальный возраст Reels в днях (по умолчанию 90)

Эти параметры можно изменить в коде скриптов при необходимости.

### 4. Массовый скрапинг конкурентов

Скрипт для массового скрапинга Reels конкурентов.

```bash
bun run src/scripts/bulk-scrape-competitors.ts <projectId> [limit]
```

### 5. Массовый скрапинг хэштегов

Скрипт для массового скрапинга Reels по хэштегам.

```bash
bun run src/scripts/bulk-scrape-hashtags.ts <projectId> [limit]
```

### 6. Экспорт Reels конкурентов в Excel

Скрипт для экспорта Reels конкурентов в Excel.

```bash
bun run src/scripts/export-competitor-reels.ts <projectId> [minViews] [daysBack] [outputPath]
```

**Параметры:**
- `projectId`: ID проекта
- `minViews`: (опционально) Минимальное количество просмотров (по умолчанию 50000)
- `daysBack`: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
- `outputPath`: (опционально) Путь для сохранения Excel файла

### 7. Транскрибация Reels с использованием OpenAI Whisper API

Скрипт для транскрибации Reels с использованием OpenAI Whisper API.

```bash
bun run src/scripts/transcribe-reels-with-whisper.ts <projectId> [minViews] [daysBack] [limit]
```

**Параметры:**
- `projectId`: ID проекта
- `minViews`: (опционально) Минимальное количество просмотров (по умолчанию 50000)
- `daysBack`: (опционально) Количество дней назад для фильтрации (по умолчанию 30)
- `limit`: (опционально) Максимальное количество Reels для обработки (по умолчанию 10)

### 8. Просмотр списка конкурентов и их Reels

Скрипт для просмотра списка конкурентов и их Reels.

```bash
bun run src/scripts/list-competitors.ts <projectId>
```

### 9. Подсчет Reels с просмотрами более указанного количества

Скрипт для подсчета Reels с просмотрами более указанного количества.

```bash
bun run src/scripts/count-popular-reels.ts <projectId> [minViews] [daysBack]
```

## Примечания

1. Скрипты используют модуль `instagram-scraper.ts` для взаимодействия с Apify API.
2. Данные сохраняются в базу данных Neon с использованием функций из модуля `neonDB.ts`.
3. Для каждого запуска парсинга создается запись в таблице `parsing_runs` с уникальным ID.
4. Скрипты обрабатывают ошибки и продолжают работу даже при сбоях отдельных источников.
5. Для транскрибации используется OpenAI Whisper API, требующий активный аккаунт OpenAI с платежными данными.
