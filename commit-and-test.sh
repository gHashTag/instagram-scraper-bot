#!/bin/bash

# 🚀 Скрипт для коммита изменений и запуска GitHub Actions

echo "🚀 Коммит изменений и запуск тестирования GitHub Actions"
echo "=" | head -c 60 && echo

# Проверяем текущий статус
echo "📊 Проверка статуса Git..."
git status --porcelain

echo ""
echo "📝 Добавление всех изменений..."
git add .

echo ""
echo "📋 Создание коммита..."
git commit -m "🧪 Add GitHub Actions workflows and Telegram notifications

✨ Features:
- GitHub Actions workflow for daily Obsidian vault updates
- Telegram notifications to ID 144022504 via @neuro_blogger_bot
- Automatic data synchronization from Neon database
- Web dashboard generation
- Full system testing scripts

🔄 Automation:
- Runs daily at 9:00 MSK (6:00 UTC)
- Updates competitor analysis, hashtag metrics, transcriptions
- Sends status notifications to Telegram
- Commits changes automatically

🧪 Testing:
- Added test trigger file in vault
- Full system testing script
- Telegram notification testing
- Manual workflow trigger capability

📱 Telegram Integration:
- Bot: @neuro_blogger_bot
- Chat ID: 144022504
- Success, error, and no-changes notifications
- Quick links to vault sections

🎯 Ready for production use!"

echo ""
echo "🚀 Отправка в GitHub..."
git push origin main

echo ""
echo "✅ Готово! Теперь:"
echo "1. 📱 Проверьте GitHub Actions: https://github.com/gHashTag/instagram-scraper/actions"
echo "2. 🔄 Workflow должен появиться в списке"
echo "3. 📲 Можете запустить вручную или дождаться автоматического запуска"
echo "4. 📱 Telegram уведомление придет через 2-3 минуты после запуска"

echo ""
echo "🎉 Система готова к работе!"
