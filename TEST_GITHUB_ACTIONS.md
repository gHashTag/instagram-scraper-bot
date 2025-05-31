# 🧪 Тестирование GitHub Actions и Telegram уведомлений

## 🎯 Цель
Проверить, что система автоматического обновления и Telegram уведомления работают корректно.

---

## 🚀 Запуск теста

### **Способ 1: Автоматический запуск (рекомендуемый)**

Просто сделайте коммит и push - GitHub Actions запустится автоматически:

```bash
# Добавляем все изменения
git add .

# Коммитим с описанием теста
git commit -m "🧪 Test GitHub Actions and Telegram notifications

- Added test trigger file
- Testing automatic vault updates
- Checking Telegram notifications to ID 144022504"

# Пушим в main ветку
git push origin main
```

### **Способ 2: Ручной запуск через GitHub UI**

1. Перейдите: https://github.com/gHashTag/instagram-scraper/actions
2. Выберите workflow: "🔄 Update Obsidian Vault Daily"
3. Нажмите "Run workflow"
4. Выберите branch: main
5. Project ID: 1 (по умолчанию)
6. Нажмите "Run workflow"

---

## 📊 Что проверяется

### ✅ **GitHub Actions**
- Workflow запускается при изменении файлов в `vaults/coco-age/`
- Все шаги выполняются без ошибок
- Данные обновляются из базы Neon
- Изменения коммитятся автоматически

### ✅ **Telegram уведомления**
- Сообщение отправляется на ID: 144022504
- Бот: @neuro_blogger_bot
- Содержит статистику vault
- Включает быстрые ссылки

### ✅ **Обновление данных**
- Подключение к базе Neon работает
- Данные о конкурентах обновляются
- Статистика хэштегов актуализируется
- AI-транскрипции синхронизируются

---

## 📱 Ожидаемое Telegram уведомление

```
🔄 Coco Age Vault Update

📅 Дата: 29.05.2025 12:30 UTC
🎯 Проект: Coco Age (ID: 1)
📊 Статус: ✅ Успешно обновлен

📁 Статистика vault:
• Файлов: 9
• Размер: ~160K

🔗 Быстрые ссылки:
• Центральная карта
• Планирование
• Конкуренты

🤖 Автообновление через GitHub Actions
```

---

## 🔍 Мониторинг результатов

### **GitHub Actions**
- **URL:** https://github.com/gHashTag/instagram-scraper/actions
- **Workflow:** "🔄 Update Obsidian Vault Daily"
- **Время выполнения:** 2-5 минут
- **Статус:** Должен быть зеленый ✅

### **Логи для проверки**
1. **📥 Checkout repository** - скачивание кода
2. **🟢 Setup Node.js** - установка Node.js
3. **📦 Install dependencies** - установка пакетов
4. **🔄 Update Obsidian vault data** - обновление данных
5. **📊 Check for changes** - проверка изменений
6. **💾 Commit and push changes** - сохранение изменений
7. **📱 Send Telegram notification** - отправка уведомления

### **Telegram**
- **Время получения:** Через 2-3 минуты после запуска
- **Отправитель:** @neuro_blogger_bot
- **Получатель:** Ваш Telegram (ID: 144022504)

---

## 🚨 Возможные проблемы

### **GitHub Actions не запускается**
- ✅ Проверьте, что workflow файл в ветке main
- ✅ Убедитесь, что нет синтаксических ошибок в YAML
- ✅ Проверьте права доступа к репозиторию

### **Ошибки в workflow**
- ❌ **DATABASE_URL не настроен** → Добавьте в GitHub Secrets
- ❌ **OPENAI_API_KEY отсутствует** → Добавьте в GitHub Secrets
- ❌ **TELEGRAM_BOT_TOKEN не найден** → Добавьте в GitHub Secrets

### **Telegram уведомления не приходят**
- ❌ **Chat not found** → Напишите боту /start
- ❌ **Invalid token** → Проверьте токен в @BotFather
- ❌ **Bot blocked** → Разблокируйте бота в Telegram

---

## 🔧 Настройка GitHub Secrets

Если тест показывает ошибки, добавьте секреты:

1. **Перейдите:** https://github.com/gHashTag/instagram-scraper/settings/secrets/actions
2. **New repository secret**
3. **Добавьте:**
   - `DATABASE_URL` - строка подключения к Neon
   - `OPENAI_API_KEY` - ключ OpenAI для транскрипций
   - `TELEGRAM_BOT_TOKEN` - токен бота @neuro_blogger_bot

---

## 📈 Успешный результат

### ✅ **GitHub Actions**
- Workflow завершился с зеленым статусом
- Все шаги выполнены успешно
- Время выполнения: 2-5 минут
- Автоматический коммит создан

### ✅ **Telegram**
- Уведомление получено в течение 3 минут
- Содержит актуальную статистику
- Быстрые ссылки работают
- Статус: "Успешно обновлен"

### ✅ **Vault**
- Файлы обновлены актуальными данными
- Статистика конкурентов свежая
- Хэштеги проанализированы
- Новый коммит в истории Git

---

## 🎉 После успешного теста

Система готова к автоматической работе:

- **Ежедневные обновления** в 9:00 МСК
- **Telegram уведомления** о каждом обновлении
- **Актуальные данные** в Obsidian vault
- **Командная работа** через Git синхронизацию

**🚀 Запустите тест прямо сейчас!**

```bash
git add . && git commit -m "🧪 Test system" && git push
```

---

*Создано: 29.05.2025*  
*Telegram ID: 144022504*  
*Bot: @neuro_blogger_bot*
