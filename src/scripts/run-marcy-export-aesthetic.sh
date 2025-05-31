#!/bin/bash

# Скрипт для экспорта данных по хэштегам эстетической медицины для проекта Марси

# Проверяем, завершился ли парсинг
echo "Проверка статуса парсинга..."
bun run src/scripts/check-parsing-status.ts 5

# Проверяем количество собранных Reels
echo "Проверка количества собранных Reels..."
bun run src/scripts/db-query.ts "SELECT COUNT(*) FROM reels WHERE project_id = 5"

# Экспортируем данные в Excel
echo "Экспорт данных в Excel..."
bun run src/scripts/export-marcy-aesthetic-reels.ts 5 50000 "exports/marcy_aesthetic_medicine_$(date +%Y-%m-%d).xlsx"

echo "Экспорт завершен!"
