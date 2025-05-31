# Руководство по работе с рилсами по хэштегам

Это руководство описывает процесс поиска, сохранения, транскрибации и экспорта популярных рилсов по хэштегам косметологии в Instagram.

## Содержание

1. [Обзор](#обзор)
2. [Поиск популярных рилсов](#поиск-популярных-рилсов)
3. [Сохранение рилсов в базу данных](#сохранение-рилсов-в-базу-данных)
4. [Транскрибация рилсов](#транскрибация-рилсов)
5. [Экспорт рилсов в Excel](#экспорт-рилсов-в-excel)
6. [Полный процесс](#полный-процесс)

## Обзор

Процесс работы с рилсами по хэштегам состоит из следующих этапов:

1. Поиск популярных рилсов по хэштегам косметологии в Instagram
2. Сохранение найденных рилсов в базу данных
3. Транскрибация рилсов с помощью OpenAI Whisper API
4. Экспорт рилсов с транскрипциями в Excel

## Поиск популярных рилсов

Для поиска популярных рилсов по хэштегам косметологии в Instagram используется скрипт `apify-instagram-scraper.ts`. Этот скрипт использует Apify Instagram Reel Scraper API для поиска рилсов по хэштегам.

```bash
bun run src/scripts/apify-instagram-scraper.ts [minViews] [outputPath]
```

Параметры:
- `minViews`: (опционально) Минимальное количество просмотров (по умолчанию 50000)
- `outputPath`: (опционально) Путь для сохранения Excel файла (по умолчанию "exports/popular_hashtag_reels.xlsx")

Пример:
```bash
bun run src/scripts/apify-instagram-scraper.ts 100000 exports/popular_hashtag_reels_100k.xlsx
```

## Сохранение рилсов в базу данных

Для сохранения найденных рилсов в базу данных используется скрипт `save-popular-hashtag-reels.ts`. Этот скрипт использует Apify Instagram Reel Scraper API для поиска рилсов по хэштегам и сохраняет их в базу данных.

```bash
bun run src/scripts/save-popular-hashtag-reels.ts <projectId> [minViews]
```

Параметры:
- `projectId`: ID проекта
- `minViews`: (опционально) Минимальное количество просмотров (по умолчанию 50000)

Пример:
```bash
bun run src/scripts/save-popular-hashtag-reels.ts 5 100000
```

## Транскрибация рилсов

Для транскрибации рилсов используется скрипт `transcribe-hashtag-reels-batch.ts`. Этот скрипт скачивает видео, извлекает аудио, транскрибирует его с помощью OpenAI Whisper API и сохраняет транскрипцию в базу данных.

```bash
bun run src/scripts/transcribe-hashtag-reels-batch.ts <projectId> [minViews] [limit]
```

Параметры:
- `projectId`: ID проекта
- `minViews`: (опционально) Минимальное количество просмотров (по умолчанию 50000)
- `limit`: (опционально) Максимальное количество рилсов для обработки (по умолчанию 5)

Пример:
```bash
bun run src/scripts/transcribe-hashtag-reels-batch.ts 5 100000 10
```

Также можно транскрибировать конкретный рил с помощью скрипта `transcribe-specific-reel.ts`:

```bash
bun run src/scripts/transcribe-specific-reel.ts <reelId>
```

Параметры:
- `reelId`: ID рила для транскрибации

Пример:
```bash
bun run src/scripts/transcribe-specific-reel.ts 123
```

## Экспорт рилсов в Excel

Для экспорта рилсов с транскрипциями в Excel используется скрипт `export-popular-hashtag-reels.ts`. Этот скрипт экспортирует рилсы с транскрипциями в Excel файл.

```bash
bun run src/scripts/export-popular-hashtag-reels.ts <projectId> [minViews] [outputPath]
```

Параметры:
- `projectId`: ID проекта
- `minViews`: (опционально) Минимальное количество просмотров (по умолчанию 50000)
- `outputPath`: (опционально) Путь для сохранения Excel файла (по умолчанию "exports/popular_hashtag_reels.xlsx")

Пример:
```bash
bun run src/scripts/export-popular-hashtag-reels.ts 5 100000 exports/popular_hashtag_reels_100k.xlsx
```

## Полный процесс

Полный процесс работы с рилсами по хэштегам выглядит следующим образом:

1. Сохранение рилсов в базу данных:
```bash
bun run src/scripts/save-popular-hashtag-reels.ts 5 50000
```

2. Проверка качества транскрипций:
```bash
bun run src/scripts/check-hashtags-reels.ts 5 50000
```

3. Транскрибация рилсов:
```bash
bun run src/scripts/transcribe-hashtag-reels-batch.ts 5 50000 10
```

4. Экспорт рилсов в Excel:
```bash
bun run src/scripts/export-popular-hashtag-reels.ts 5 50000 exports/popular_hashtag_reels.xlsx
```

## Список хэштегов косметологии

В скриптах используются следующие хэштеги косметологии:

- aestheticmedicine
- aestheticclinic
- cosmetology
- hydrafacial
- botox
- fillers
- beautyclinic
- skincare
- prpfacial
- rfmicroneedling
- skinrejuvenation
- facialtreatment
- aesthetictreatment

## Примечания

- Для использования Apify Instagram Reel Scraper API необходимо заменить `apify_api_YOUR_TOKEN` на ваш токен Apify API в скриптах `apify-instagram-scraper.ts` и `save-popular-hashtag-reels.ts`.
- Для транскрибации рилсов используется OpenAI Whisper API. Убедитесь, что у вас есть действующий API ключ OpenAI.
- Скрипты используют yt-dlp для скачивания видео и ffmpeg для извлечения аудио. Убедитесь, что эти инструменты установлены в вашей системе.
- Для экспорта в Excel используется библиотека ExcelJS. Убедитесь, что она установлена в вашем проекте.

## Требования

- Node.js 14+
- Bun 1.0+
- yt-dlp
- ffmpeg
- OpenAI API ключ
- Apify API ключ (для поиска рилсов в Instagram)
- ExcelJS (для экспорта в Excel)
- axios (для HTTP запросов)

## Установка зависимостей

```bash
bun add exceljs axios openai
```

## Установка yt-dlp и ffmpeg

### macOS

```bash
brew install yt-dlp ffmpeg
```

### Linux

```bash
sudo apt-get install ffmpeg
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### Windows

```bash
choco install yt-dlp ffmpeg
```

или

```bash
scoop install yt-dlp ffmpeg
```
