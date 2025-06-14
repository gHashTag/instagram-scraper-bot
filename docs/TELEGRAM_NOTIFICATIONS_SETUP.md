# 📱 Настройка Telegram уведомлений для Coco Age

## 🎯 Цель
Получать автоматические уведомления в Telegram о статусе обновления Obsidian vault каждые 24 часа.

---

## 🤖 Настройка бота neuro_blogger_bot

### 1. **Получение токена бота**
Если у вас уже есть бот `neuro_blogger_bot`, найдите его токен в настройках.

Если нет бота:
1. Напишите [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Укажите имя: `Neuro Blogger Bot`
4. Укажите username: `neuro_blogger_bot` (или другой доступный)
5. Скопируйте токен (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. **Ваш Telegram ID**
Уже указан в коде: `144022504`

---

## ⚙️ Настройка GitHub Secrets

### 1. **Добавление TELEGRAM_BOT_TOKEN**
1. Перейдите в репозиторий: https://github.com/gHashTag/instagram-scraper
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**
4. **Name:** `TELEGRAM_BOT_TOKEN`
5. **Secret:** Вставьте токен вашего бота
6. **Add secret**

### 2. **Проверка других секретов**
Убедитесь, что также настроены:
- ✅ `DATABASE_URL` - подключение к Neon
- ✅ `OPENAI_API_KEY` - для транскрипций
- ✅ `TELEGRAM_BOT_TOKEN` - для уведомлений

---

## 🧪 Тестирование уведомлений

### **Локальное тестирование**
```bash
# Добавьте TELEGRAM_BOT_TOKEN в .env.development
echo "TELEGRAM_BOT_TOKEN=your_bot_token_here" >> .env.development

# Запустите тест
npm run test:telegram
```

### **Ожидаемый результат:**
```
🚀 Запуск тестирования Telegram уведомлений
==================================================
🤖 Информация о боте:
   • Имя: Neuro Blogger Bot
   • Username: @neuro_blogger_bot
   • ID: 123456789
==================================================
📱 Тестирование Telegram уведомлений...
📤 Отправка тестового сообщения об успешном обновлении...
✅ Сообщение успешно отправлено в Telegram
✅ Тест успешного уведомления прошел
📤 Отправка тестового сообщения об ошибке...
✅ Сообщение успешно отправлено в Telegram
✅ Тест уведомления об ошибке прошел

📊 Результаты тестирования:
✅ Успешное уведомление: Работает
🚨 Уведомление об ошибке: Работает

🎉 Telegram уведомления настроены корректно!
📱 Проверьте ваш Telegram бот neuro_blogger_bot
```

---

## 📱 Примеры уведомлений

### ✅ **Успешное обновление**
```
🔄 Coco Age Vault Update

📅 Дата: 29.05.2025 09:00 UTC
🎯 Проект: Coco Age (ID: 1)
📊 Статус: ✅ Успешно обновлен

📁 Статистика vault:
• Файлов: 8
• Размер: 156K

🔗 Быстрые ссылки:
• Центральная карта
• Планирование
• Конкуренты

🤖 Автообновление через GitHub Actions
```

### ℹ️ **Нет изменений**
```
📊 Coco Age Vault Update

📅 Дата: 29.05.2025 09:00 UTC
🎯 Проект: Coco Age (ID: 1)
📊 Статус: ℹ️ Нет изменений

📁 Статистика vault:
• Файлов: 8
• Размер: 156K

🔗 Быстрые ссылки:
• Центральная карта
• Планирование
• Конкуренты

🤖 Автообновление через GitHub Actions
```

### 🚨 **Ошибка обновления**
```
🚨 Ошибка обновления Coco Age Vault

📅 Дата: 29.05.2025 09:00 UTC
❌ Статус: Обновление не удалось
🎯 Проект: Coco Age

🔍 Действия:
• Проверьте логи в GitHub Actions
• Убедитесь в доступности базы данных
• Проверьте переменные окружения

🔗 Посмотреть логи

🤖 Автоматическое уведомление об ошибке
```

---

## 🕐 Расписание уведомлений

### **Автоматические уведомления:**
- **Время:** Каждый день в 9:00 МСК (6:00 UTC)
- **Условие:** После выполнения обновления vault
- **Статусы:** Успех, нет изменений, ошибка

### **Ручные уведомления:**
```bash
# Ручной запуск обновления с уведомлением
# GitHub Actions → Update Obsidian Vault Daily → Run workflow
```

---

## 🔧 Настройка бота (опционально)

### **Команды для бота:**
Если хотите добавить интерактивность боту:

```
/start - Приветствие
/status - Статус последнего обновления
/vault - Ссылка на vault
/help - Помощь
```

### **Webhook для мгновенных уведомлений:**
Можно настроить webhook для получения уведомлений сразу после коммита:

```yaml
# .github/workflows/notify-on-push.yml
on:
  push:
    paths: ['vaults/coco-age/**']
```

---

## 🚨 Решение проблем

### **Уведомления не приходят:**
1. ✅ Проверьте `TELEGRAM_BOT_TOKEN` в GitHub Secrets
2. ✅ Убедитесь, что бот активен
3. ✅ Проверьте ваш Telegram ID: `144022504`
4. ✅ Запустите тест: `npm run test:telegram`

### **Ошибка "Chat not found":**
1. Напишите боту `/start` в личных сообщениях
2. Убедитесь, что бот не заблокирован

### **Ошибка "Invalid token":**
1. Проверьте токен в [@BotFather](https://t.me/BotFather)
2. Обновите `TELEGRAM_BOT_TOKEN` в GitHub Secrets

---

## 📊 Мониторинг

### **GitHub Actions логи:**
- Переходите в **Actions** → **Update Obsidian Vault Daily**
- Проверяйте шаг "📱 Send Telegram notification"

### **Статус отправки:**
```
📱 Telegram уведомление отправлено
```

### **Ошибки отправки:**
```
⚠️ TELEGRAM_BOT_TOKEN не настроен
❌ Ошибка отправки в Telegram: {...}
```

---

## 🎯 Результат

После настройки вы будете получать:

✅ **Ежедневные уведомления** в 9:00 МСК  
✅ **Статус обновления** vault  
✅ **Статистику файлов** и размера  
✅ **Быстрые ссылки** на важные разделы  
✅ **Уведомления об ошибках** для быстрого реагирования  

**📱 Теперь вы всегда будете в курсе состояния вашей системы Coco Age!**

---

*Создано: 29.05.2025*  
*Статус: 🟢 Готово к использованию*  
*Telegram ID: 144022504*  
*Bot: @neuro_blogger_bot*
