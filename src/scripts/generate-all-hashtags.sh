#!/bin/bash

# Скрипт для генерации демонстрационных рилсов для всех хэштегов
# Использование: bash src/scripts/generate-all-hashtags.sh <projectId> <count> <minViews>

if [ $# -lt 1 ]; then
  echo "Использование: bash src/scripts/generate-all-hashtags.sh <projectId> [count] [minViews]"
  exit 1
fi

PROJECT_ID=$1
COUNT=${2:-10}
MIN_VIEWS=${3:-50000}

# Список хэштегов косметологии
HASHTAGS=(
  "aestheticmedicine"
  "aestheticclinic"
  "cosmetology"
  "hydrafacial"
  "botox"
  "fillers"
  "beautyclinic"
  "skincare"
  "prpfacial"
  "rfmicroneedling"
  "skinrejuvenation"
  "facialtreatment"
  "aesthetictreatment"
)

# Генерируем рилсы для каждого хэштега
for hashtag in "${HASHTAGS[@]}"; do
  echo "Генерация рилсов для хэштега #$hashtag..."
  bun run src/scripts/generate-demo-reels.ts $PROJECT_ID $hashtag $COUNT $MIN_VIEWS
  echo "Пауза перед следующим хэштегом..."
  sleep 2
done

echo "Генерация рилсов для всех хэштегов завершена"
