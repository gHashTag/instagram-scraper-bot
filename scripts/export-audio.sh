#!/bin/bash

# Скрипт для экспорта аудио из видео Reels через Node.js
# Использование: ./scripts/export-audio.sh <projectId> [sourceType] [sourceId] [limit] [outputDir]
# Где <sourceType> может быть: competitor, hashtag или all

# Проверяем количество аргументов
if [ "$#" -lt 1 ]; then
  echo "Использование: ./scripts/export-audio.sh <projectId> [sourceType] [sourceId] [limit] [outputDir]"
  echo "Где <sourceType> может быть: competitor, hashtag или all"
  exit 1
fi

# Получаем аргументы
PROJECT_ID=$1
SOURCE_TYPE=${2:-"all"}  # По умолчанию "all"
SOURCE_ID=${3:-0}        # По умолчанию 0 (все источники)
LIMIT=${4:-10}           # По умолчанию 10
OUTPUT_DIR=${5:-"./exports/audio"}  # По умолчанию "./exports/audio"

# Проверяем, что projectId - число
if ! [[ "$PROJECT_ID" =~ ^[0-9]+$ ]]; then
  echo "Ошибка: projectId должен быть числом"
  exit 1
fi

# Проверяем тип источника
if [[ "$SOURCE_TYPE" != "competitor" && "$SOURCE_TYPE" != "hashtag" && "$SOURCE_TYPE" != "all" ]]; then
  echo "Ошибка: sourceType должен быть 'competitor', 'hashtag' или 'all'"
  exit 1
fi

# Проверяем, что sourceId - число
if ! [[ "$SOURCE_ID" =~ ^[0-9]+$ ]]; then
  echo "Ошибка: sourceId должен быть числом"
  exit 1
fi

# Проверяем, что limit - число
if ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "Ошибка: limit должен быть числом"
  exit 1
fi

# Запускаем экспорт аудио
echo "Запуск экспорта аудио для проекта $PROJECT_ID, тип источника: $SOURCE_TYPE, ID источника: $SOURCE_ID, лимит: $LIMIT, директория: $OUTPUT_DIR"
npx tsx src/scripts/export-audio.ts $PROJECT_ID $SOURCE_TYPE $SOURCE_ID $LIMIT "$OUTPUT_DIR"
