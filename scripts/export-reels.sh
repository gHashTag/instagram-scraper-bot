#!/bin/bash

# Скрипт для экспорта Reels в Excel через Node.js
# Использование: ./scripts/export-reels.sh <projectId> [sourceType] [sourceId] [outputPath]
# Где <sourceType> может быть: competitor, hashtag или all

# Проверяем количество аргументов
if [ "$#" -lt 1 ]; then
  echo "Использование: ./scripts/export-reels.sh <projectId> [sourceType] [sourceId] [outputPath]"
  echo "Где <sourceType> может быть: competitor, hashtag или all"
  exit 1
fi

# Получаем аргументы
PROJECT_ID=$1
SOURCE_TYPE=${2:-"all"}  # По умолчанию "all"
SOURCE_ID=${3:-0}        # По умолчанию 0 (все источники)
OUTPUT_PATH=${4:-"./exports"}  # По умолчанию "./exports"

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

# Запускаем экспорт
echo "Запуск экспорта Reels для проекта $PROJECT_ID, тип источника: $SOURCE_TYPE, ID источника: $SOURCE_ID, путь: $OUTPUT_PATH"
npx tsx src/scripts/export-reels-to-excel.ts $PROJECT_ID $SOURCE_TYPE $SOURCE_ID $OUTPUT_PATH
