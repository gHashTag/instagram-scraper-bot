#!/bin/bash

# 🧪 Тест Obsidian Workflow
# Имитирует выполнение GitHub Action локально

set -e

echo "🧪 ТЕСТИРОВАНИЕ OBSIDIAN WORKFLOW"
echo "════════════════════════════════════════════════════════════════"

# Шаг 1: Проверка миграций
echo "📊 Шаг 1: Проверка миграций базы данных..."
bash scripts/check-db-migrations.sh

# Шаг 2: Синхронизация vault
echo ""
echo "🔄 Шаг 2: Синхронизация Obsidian vault..."
bun run sync-obsidian 1

# Шаг 3: Проверка изменений
echo ""
echo "📊 Шаг 3: Проверка изменений в vault..."
if git diff --quiet HEAD -- vaults/coco-age/; then
    echo "ℹ️ Нет изменений в vault"
    HAS_CHANGES=false
else
    echo "✅ Обнаружены изменения в vault:"
    git diff --stat HEAD -- vaults/coco-age/
    HAS_CHANGES=true
fi

# Шаг 4: Имитация коммита (без реального коммита)
echo ""
echo "💾 Шаг 4: Имитация коммита..."
if [ "$HAS_CHANGES" = true ]; then
    echo "✅ Изменения будут закоммичены в GitHub Actions"
    echo "📝 Файлы для коммита:"
    git diff --name-only HEAD -- vaults/coco-age/
    
    # Показываем что будет в коммите
    echo ""
    echo "📋 Предварительный просмотр коммита:"
    COMMIT_DATE=$(date '+%Y-%m-%d %H:%M:%S UTC')
    echo "🔄 Auto-update Obsidian vault - $COMMIT_DATE"
    echo ""
    echo "📊 Обновлены данные:"
    echo "- Статистика проектов"
    echo "- Анализ конкурентов"
    echo "- Метрики хэштегов"
    echo "- Топ-контент с транскрипциями"
    echo ""
    echo "🤖 Автоматическое обновление через GitHub Actions"
else
    echo "ℹ️ Нет изменений для коммита"
fi

echo ""
echo "✅ ТЕСТ ЗАВЕРШЕН УСПЕШНО!"
echo "🎯 Workflow готов к выполнению в GitHub Actions" 