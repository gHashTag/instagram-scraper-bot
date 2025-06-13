# 🕉️ Meta Muse Automation Setup

Автоматизация скрепинга Meta Muse (аниме мышь) на 14 дней с ежедневным запуском.

## 🎯 Варианты автоматизации

### 1. 🌐 GitHub Actions (Рекомендуется)

**Преимущества:** Бесплатно, надежно, логи в облаке, не требует сервера

```bash
# 1. Скопируйте github-action.yml в .github/workflows/
cp github-action.yml ../.github/workflows/meta-muse-daily.yml

# 2. Добавьте секреты в GitHub Repository Settings:
# - DATABASE_URL
# - APIFY_TOKEN  
# - OPENAI_API_KEY

# 3. Workflow запустится автоматически каждый день в 9:00 UTC
```

### 2. 🐳 Docker Compose

**Преимущества:** Изолированная среда, легко масштабировать

```bash
# Настройте .env файл с переменными
cp .env.example .env

# Запустите контейнеры
docker-compose up -d

# Планировщик будет запускать скрепер каждый день в 9:00
```

### 3. 🟢 Node.js Scheduler

**Преимущества:** Простота, гибкость настройки

```bash
# Установите зависимости
npm install node-cron

# Запустите планировщик
node node-scheduler.js

# Процесс будет работать в фоне и запускать скрепер ежедневно
```

### 4. 🐧 Linux Systemd

**Преимущества:** Интеграция с системой, автозапуск

```bash
# Скопируйте файлы systemd
sudo cp meta-muse.service /etc/systemd/system/
sudo cp meta-muse.timer /etc/systemd/system/

# Включите и запустите
sudo systemctl enable meta-muse.timer
sudo systemctl start meta-muse.timer

# Проверьте статус
sudo systemctl status meta-muse.timer
```

### 5. 🪟 Windows Task Scheduler

**Преимущества:** Встроен в Windows, графический интерфейс

```powershell
# Запустите PowerShell как администратор
# Выполните скрипт настройки
.\setup-windows-scheduler.ps1

# Задача появится в Task Scheduler
```

## ⚙️ Настройки

### Время запуска
По умолчанию: **9:00 UTC** (12:00 МСК)

Изменить время в файлах:
- GitHub Actions: `cron: '0 9 * * *'`
- Docker: schedule в node-scheduler
- Systemd: `OnCalendar=*-*-* 09:00:00`
- Windows: `-At "09:00"`

### Переменные окружения

```env
DATABASE_URL=postgresql://user:pass@host:port/db
APIFY_TOKEN=your_apify_token
OPENAI_API_KEY=sk-your_openai_key
```

## 📊 Мониторинг

### Логи
- GitHub Actions: в интерфейсе GitHub
- Docker: `docker-compose logs -f`
- Node.js: в консоли
- Systemd: `journalctl -u meta-muse.service`
- Windows: Event Viewer

### Отчеты
Отчеты сохраняются в `exports/meta-muse-report-*.json`

## 🔧 Устранение неполадок

### Проблемы с токенами
Проверьте актуальность токенов в переменных окружения

### Проблемы с сетью
Убедитесь в доступности Apify API и Instagram

### Проблемы с базой данных
Проверьте подключение к Neon PostgreSQL

## 📅 Расписание на 14 дней

День 1-14: Обработка по 10-11 хэштегов ежедневно
Всего: 151 хэштег в 6 категориях

**Категории:**
1. Базовые хэштеги (7)
2. AI-инфлюенсеры (30) 
3. Метавселенные и технологии (24)
4. Архетип: Муза/Маг/Провидец (30)
5. Психоэмоциональный сегмент (30)
6. Философия: дух + технологии (30)

---

🕉️ **"धृतिश्च तेजो धैर्यं च गुणाश्च सत्यवादिता"** 
"Стойкость, энергия, терпение, честность - вот качества успеха"