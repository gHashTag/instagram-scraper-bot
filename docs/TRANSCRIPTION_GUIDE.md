# Руководство по транскрибации Instagram Reels

Этот документ содержит пошаговую инструкцию по транскрибации Instagram Reels и экспорту результатов в Excel.

## Содержание

1. [Подготовка](#подготовка)
2. [Генерация транскрипций](#генерация-транскрипций)
3. [Экспорт в Excel](#экспорт-в-excel)
4. [Устранение неполадок](#устранение-неполадок)
5. [Часто задаваемые вопросы](#часто-задаваемые-вопросы)

## Подготовка

Перед началом работы убедитесь, что:

1. У вас есть доступ к базе данных Neon (проверьте файл `.env` на наличие `DATABASE_URL`)
2. У вас есть действующий API-ключ OpenAI (проверьте файл `.env` на наличие `OPENAI_API_KEY`)
3. У вас установлены все необходимые зависимости (выполните `bun install`)

## Генерация транскрипций

### Вариант 1: Транскрибация конкретного рила

Если вам нужно транскрибировать конкретный рил, используйте скрипт `transcribe-specific-reel.ts`:

```bash
bun run src/scripts/transcribe-specific-reel.ts <reelId>
```

Где `<reelId>` - это ID рила в базе данных.

Пример:
```bash
bun run src/scripts/transcribe-specific-reel.ts 813
```

### Вариант 2: Транскрибация рилов по хештегам

Если вам нужно транскрибировать рилы по хештегам, используйте скрипт `transcribe-hashtag-reels-batch.ts`:

```bash
bun run src/scripts/transcribe-hashtag-reels-batch.ts <projectId> <minViews> <limit>
```

Где:
- `<projectId>` - ID проекта
- `<minViews>` - минимальное количество просмотров (по умолчанию 50000)
- `<limit>` - максимальное количество рилов для обработки (по умолчанию 100)

Пример:
```bash
bun run src/scripts/transcribe-hashtag-reels-batch.ts 5 50000 100
```

### Вариант 3: Генерация демо-транскрипций

Если у вас возникают проблемы с доступом к Instagram или API OpenAI, вы можете сгенерировать демонстрационные транскрипции:

```bash
bun run src/scripts/generate-demo-transcriptions.ts <projectId> <minViews> <limit>
```

Пример:
```bash
bun run src/scripts/generate-demo-transcriptions.ts 5 50000 100
```

## Экспорт в Excel

После того, как транскрипции сгенерированы и сохранены в базе данных, вы можете экспортировать их в Excel:

### Вариант 1: Экспорт только рилов с транскрипциями

```bash
bun run src/scripts/export-transcribed-reels.ts <projectId> <minViews> <limit>
```

Пример:
```bash
bun run src/scripts/export-transcribed-reels.ts 5 50000 100
```

### Вариант 2: Экспорт всех рилов (с транскрипциями и без)

```bash
bun run src/scripts/export-reels-to-excel.ts <projectId>
```

Пример:
```bash
bun run src/scripts/export-reels-to-excel.ts 5
```

Экспортированные файлы будут сохранены в директории `exports/`.

## Полный процесс транскрибации и экспорта

Вот полный процесс транскрибации рилов и экспорта результатов:

1. **Подготовка**:
   - Убедитесь, что у вас есть доступ к базе данных Neon
   - Убедитесь, что у вас есть действующий API-ключ OpenAI
   - Убедитесь, что у вас установлены все необходимые зависимости

2. **Генерация транскрипций**:
   ```bash
   bun run src/scripts/generate-demo-transcriptions.ts 5 50000 100
   ```

3. **Проверка количества транскрибированных рилов**:
   ```bash
   bun run src/scripts/db-query.ts "SELECT COUNT(*) FROM reels WHERE transcript IS NOT NULL AND project_id = 5"
   ```

4. **Экспорт в Excel**:
   ```bash
   bun run src/scripts/export-transcribed-reels.ts 5 50000 100
   ```

5. **Проверка созданного файла**:
   ```bash
   ls -la exports
   ```

## Устранение неполадок

### Проблема: Ошибка при скачивании видео

Если вы видите ошибку "Instagram sent an empty media response", это может означать, что:
- URL рила недействителен
- У вас нет доступа к рилу
- Instagram блокирует ваши запросы

**Решение**:
- Убедитесь, что URL рила действителен
- Попробуйте использовать параметр `--cookies-from-browser chrome` при скачивании видео
- Попробуйте использовать VPN
- Используйте скрипт `generate-demo-transcriptions.ts` для генерации демонстрационных транскрипций

### Проблема: Ошибка при транскрибации аудио

Если вы видите ошибку при транскрибации аудио, это может означать, что:
- У вас недействительный API-ключ OpenAI
- У вас недостаточно средств на счету OpenAI
- Аудиофайл поврежден или имеет неподдерживаемый формат

**Решение**:
- Проверьте ваш API-ключ OpenAI
- Пополните счет OpenAI
- Убедитесь, что аудиофайл имеет поддерживаемый формат (MP3, MP4, WAV, etc.)
- Используйте скрипт `generate-demo-transcriptions.ts` для генерации демонстрационных транскрипций

## Часто задаваемые вопросы

### Как узнать ID проекта?

Вы можете узнать ID проекта, выполнив следующий запрос:

```bash
bun run src/scripts/db-query.ts "SELECT id, name FROM projects"
```

### Как узнать ID рила?

Вы можете узнать ID рила, выполнив следующий запрос:

```bash
bun run src/scripts/db-query.ts "SELECT id, reel_url FROM reels WHERE project_id = 5 ORDER BY views_count DESC LIMIT 10"
```

### Как узнать, сколько рилов уже транскрибировано?

Вы можете узнать количество транскрибированных рилов, выполнив следующий запрос:

```bash
bun run src/scripts/db-query.ts "SELECT COUNT(*) FROM reels WHERE transcript IS NOT NULL AND project_id = 5"
```

### Как узнать, какие хештеги используются в проекте?

Вы можете узнать, какие хештеги используются в проекте, выполнив следующий запрос:

```bash
bun run src/scripts/db-query.ts "SELECT id, tag_name FROM hashtags WHERE project_id = 5"
```
