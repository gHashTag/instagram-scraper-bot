#!/bin/bash

# Скрипт для экспорта данных по хэштегам эстетической медицины для проекта АвтоСид

# Проверяем статус парсинга
echo "Проверка статуса парсинга..."
bun run src/scripts/check-parsing-status.ts 1

# Проверяем количество собранных Reels
echo "Проверка количества собранных Reels..."
bun run src/scripts/db-query.ts "SELECT COUNT(*) FROM reels WHERE project_id = 1 AND views_count >= 50000"

# Экспортируем данные в Excel
echo "Экспорт данных в Excel..."
bun run src/scripts/export-autosid-reels.ts 50000 "exports/autosid_aesthetic_medicine_$(date +%Y-%m-%d).xlsx"

echo "Экспорт завершен!"
