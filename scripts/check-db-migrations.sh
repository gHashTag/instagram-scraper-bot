#!/bin/bash

# 🗄️ Safe Database Migration Check
# Проверяет и выполняет миграции безопасно

echo "🗄️ Проверка состояния базы данных..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL не установлена"
    exit 1
fi

echo "✅ DATABASE_URL установлена"

# Try to run migrations
echo "🔄 Попытка выполнения миграций..."

if bun run db:migrate 2>&1; then
    echo "✅ Миграции выполнены успешно"
    exit 0
else
    MIGRATION_EXIT_CODE=$?
    echo "⚠️ Миграции завершились с кодом: $MIGRATION_EXIT_CODE"
    
    # Check if it's just because tables already exist
    if bun run db:migrate 2>&1 | grep -q "already exists"; then
        echo "ℹ️ Таблицы уже существуют - это нормально"
        echo "✅ База данных готова к работе"
        exit 0
    else
        echo "❌ Ошибка миграций требует внимания"
        exit $MIGRATION_EXIT_CODE
    fi
fi 