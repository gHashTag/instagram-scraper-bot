#!/bin/bash

# 🔒 Безопасный коммит без секретов

echo "🔒 Безопасный коммит GitHub Actions без секретов"
echo "=" | head -c 50 && echo

# Убеждаемся, что .env файлы исключены
echo "🛡️ Проверка .gitignore..."
if ! grep -q ".env.development" .gitignore; then
    echo "⚠️ Добавляем .env.development в .gitignore"
    echo ".env.development" >> .gitignore
fi

# Удаляем .env файлы из индекса если они там есть
echo "🧹 Очистка .env файлов из Git..."
git rm --cached .env.development 2>/dev/null || true
git rm --cached .env.local 2>/dev/null || true
git rm --cached .env 2>/dev/null || true

# Добавляем только безопасные файлы
echo "📁 Добавление безопасных файлов..."
git add .github/
git add vaults/coco-age/
git add scripts/
git add .gitignore
git add .env.example
git add package.json
git add TEST_GITHUB_ACTIONS.md

# Проверяем, что секреты не попадут в коммит
echo "🔍 Проверка на секреты..."
if git diff --cached | grep -i "sk-proj\|sk-" > /dev/null; then
    echo "❌ ОШИБКА: Обнаружены API ключи в коммите!"
    echo "Отменяем операцию..."
    exit 1
fi

echo "✅ Секреты не обнаружены"

# Создаем коммит
echo "📝 Создание безопасного коммита..."
git commit -m "🔒 Add GitHub Actions workflows (secure)

✨ Features:
- GitHub Actions for daily Obsidian vault updates
- Telegram notifications system
- Automatic data synchronization
- Web dashboard generation
- Full system testing scripts

🔒 Security:
- All API keys moved to GitHub Secrets
- .env files properly excluded from Git
- No sensitive data in repository

🧪 Testing:
- Test trigger files added
- Full system testing capability
- Manual workflow trigger support

📱 Telegram Integration:
- Notifications to specified chat ID
- Success, error, and status updates
- Quick links to vault sections

🎯 Ready for production deployment!"

echo ""
echo "🚀 Отправка в GitHub..."
git push origin merge

echo ""
echo "✅ Готово! Теперь:"
echo "1. 📱 GitHub Actions должен появиться в интерфейсе"
echo "2. 🔐 Добавьте секреты в GitHub Settings"
echo "3. 🧪 Запустите тест workflow"

echo ""
echo "🔑 Необходимые GitHub Secrets:"
echo "- DATABASE_URL"
echo "- OPENAI_API_KEY" 
echo "- TELEGRAM_BOT_TOKEN"
