#!/bin/bash

# 🚀 Простой гид для push в main ветку

echo "🚀 PUSH В MAIN ВЕТКУ - ПОШАГОВЫЙ ГИД"
echo "=" | head -c 50 && echo

# Шаг 1: Проверяем текущую ветку
echo "📍 Шаг 1: Проверка текущей ветки"
CURRENT_BRANCH=$(git branch --show-current)
echo "Текущая ветка: $CURRENT_BRANCH"

# Шаг 2: Переключаемся на main
echo ""
echo "🔄 Шаг 2: Переключение на main"
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Переключаемся с $CURRENT_BRANCH на main..."
    git checkout main
    if [ $? -ne 0 ]; then
        echo "❌ Ошибка переключения на main"
        echo "Попробуйте: git stash && git checkout main"
        exit 1
    fi
else
    echo "✅ Уже на ветке main"
fi

# Шаг 3: Обновляем main с удаленного репозитория
echo ""
echo "📥 Шаг 3: Обновление main с GitHub"
git pull origin main
if [ $? -ne 0 ]; then
    echo "⚠️ Не удалось обновить main, продолжаем..."
fi

# Шаг 4: Мержим изменения из ветки merge (если она существует)
echo ""
echo "🔀 Шаг 4: Мерж изменений из ветки merge"
if git show-ref --verify --quiet refs/heads/merge; then
    echo "Мержим изменения из ветки merge..."
    git merge merge --no-edit
    if [ $? -ne 0 ]; then
        echo "❌ Конфликт при мерже. Разрешите конфликты и запустите скрипт снова"
        exit 1
    fi
else
    echo "ℹ️ Ветка merge не найдена, работаем с текущими изменениями"
fi

# Шаг 5: Убеждаемся, что .env файлы исключены
echo ""
echo "🛡️ Шаг 5: Проверка безопасности (.env файлы)"
if [ -f ".env.development" ]; then
    echo "⚠️ Найден .env.development - удаляем из индекса"
    git rm --cached .env.development 2>/dev/null || true
fi

if [ -f ".env.local" ]; then
    echo "⚠️ Найден .env.local - удаляем из индекса"
    git rm --cached .env.local 2>/dev/null || true
fi

# Проверяем .gitignore
if ! grep -q ".env.development" .gitignore; then
    echo "Добавляем .env.development в .gitignore"
    echo ".env.development" >> .gitignore
fi

# Шаг 6: Добавляем только нужные файлы
echo ""
echo "📁 Шаг 6: Добавление файлов"
echo "Добавляем GitHub Actions workflows..."
git add .github/

echo "Добавляем Obsidian vault..."
git add vaults/coco-age/

echo "Добавляем скрипты..."
git add scripts/

echo "Добавляем конфигурационные файлы..."
git add .gitignore package.json

echo "Добавляем документацию..."
git add *.md

echo "Добавляем .env.example (без секретов)..."
git add .env.example 2>/dev/null || true

# Шаг 7: Проверяем на секреты
echo ""
echo "🔍 Шаг 7: Проверка на секреты"
if git diff --cached | grep -E "(sk-proj|sk-[a-zA-Z0-9]{48})" > /dev/null; then
    echo "❌ КРИТИЧЕСКАЯ ОШИБКА: Обнаружены API ключи OpenAI!"
    echo "Отменяем операцию для безопасности"
    git reset
    exit 1
fi

if git diff --cached | grep -E "[0-9]{10}:[a-zA-Z0-9_-]{35}" > /dev/null; then
    echo "❌ КРИТИЧЕСКАЯ ОШИБКА: Обнаружены Telegram токены!"
    echo "Отменяем операцию для безопасности"
    git reset
    exit 1
fi

echo "✅ Секреты не обнаружены"

# Шаг 8: Показываем что будет закоммичено
echo ""
echo "📋 Шаг 8: Предварительный просмотр изменений"
echo "Файлы для коммита:"
git diff --cached --name-only | head -20

# Шаг 9: Создаем коммит
echo ""
echo "💾 Шаг 9: Создание коммита"
git commit -m "🔄 Add GitHub Actions workflows and Obsidian automation

✨ Features:
- Daily Obsidian vault updates at 9:00 MSK
- Telegram notifications to chat ID 144022504
- Automatic data sync from Neon database
- Manual workflow trigger support
- Full system testing capabilities

🔒 Security:
- All API keys moved to GitHub Secrets
- .env files properly excluded
- No sensitive data in repository

🧪 Testing:
- Test trigger files added
- Full system testing scripts
- Telegram notification testing

📱 Telegram Integration:
- Success/error notifications
- Vault statistics
- Quick links to sections

🎯 Ready for production deployment!"

if [ $? -ne 0 ]; then
    echo "❌ Ошибка создания коммита"
    exit 1
fi

echo "✅ Коммит создан успешно"

# Шаг 10: Push в GitHub
echo ""
echo "🚀 Шаг 10: Отправка в GitHub"
echo "Отправляем изменения в origin main..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 УСПЕХ! Изменения отправлены в GitHub"
    echo ""
    echo "📋 Что делать дальше:"
    echo "1. 📱 Проверьте GitHub Actions: https://github.com/gHashTag/instagram-scraper/actions"
    echo "2. 🔄 Должен появиться workflow: '🔄 Update Obsidian Vault Daily'"
    echo "3. ▶️ Запустите workflow вручную: 'Run workflow'"
    echo "4. 📲 Ожидайте Telegram уведомление через 2-3 минуты"
    echo ""
    echo "🔑 Убедитесь, что GitHub Secrets настроены:"
    echo "   - DATABASE_URL"
    echo "   - OPENAI_API_KEY"
    echo "   - TELEGRAM_BOT_TOKEN"
    echo ""
    echo "🎯 Система готова к работе!"
else
    echo ""
    echo "❌ ОШИБКА при push в GitHub"
    echo ""
    echo "🔧 Возможные причины:"
    echo "1. Нет прав доступа к репозиторию"
    echo "2. Проблемы с аутентификацией"
    echo "3. Конфликты с удаленной веткой"
    echo ""
    echo "💡 Попробуйте:"
    echo "git push origin main --force-with-lease"
    echo ""
    echo "Или создайте PR через GitHub UI"
fi
