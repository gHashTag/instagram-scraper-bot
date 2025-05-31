#!/bin/bash

# Скрипт для запуска парсеров Instagram Reels через Node.js
# Использование: ./scripts/run-scraper.sh <тип> <projectId> <sourceId> [limit]
# Где <тип> может быть: competitor, hashtag или all

# Проверяем количество аргументов
if [ "$#" -lt 2 ]; then
  echo "Использование: ./scripts/run-scraper.sh <тип> <projectId> <sourceId> [limit]"
  echo "Где <тип> может быть: competitor, hashtag или all"
  echo "Для типа 'all' параметр sourceId не требуется"
  exit 1
fi

# Получаем аргументы
TYPE=$1
PROJECT_ID=$2
SOURCE_ID=${3:-0}  # По умолчанию 0 (все источники)
LIMIT=${4:-10}     # По умолчанию 10

# Проверяем тип
if [[ "$TYPE" != "competitor" && "$TYPE" != "hashtag" && "$TYPE" != "all" ]]; then
  echo "Ошибка: тип должен быть 'competitor', 'hashtag' или 'all'"
  exit 1
fi

# Проверяем, что projectId и sourceId - числа
if ! [[ "$PROJECT_ID" =~ ^[0-9]+$ ]]; then
  echo "Ошибка: projectId должен быть числом"
  exit 1
fi

if [[ "$TYPE" != "all" && ! "$SOURCE_ID" =~ ^[0-9]+$ ]]; then
  echo "Ошибка: sourceId должен быть числом"
  exit 1
fi

# Проверяем, что limit - число
if ! [[ "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "Ошибка: limit должен быть числом"
  exit 1
fi

# Запускаем соответствующий скрипт
if [ "$TYPE" == "competitor" ]; then
  echo "Запуск парсинга Reels конкурента (ID: $SOURCE_ID) для проекта $PROJECT_ID с лимитом $LIMIT..."
  npx tsx src/scripts/scrape-competitor-reels.ts $PROJECT_ID $SOURCE_ID $LIMIT
elif [ "$TYPE" == "hashtag" ]; then
  echo "Запуск парсинга Reels по хештегу (ID: $SOURCE_ID) для проекта $PROJECT_ID с лимитом $LIMIT..."
  npx tsx src/scripts/scrape-hashtag-reels.ts $PROJECT_ID $SOURCE_ID $LIMIT
else
  echo "Запуск полного парсинга Reels для проекта $PROJECT_ID с лимитом $LIMIT..."
  npx tsx src/scripts/scrape-all.ts $PROJECT_ID $LIMIT
fi
