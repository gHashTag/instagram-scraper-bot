# 🕉️ Instagram Strategy Manager

> **Мультиклиентская система управления стратегиями Instagram с автоматическими дашбордами в Obsidian**

## 🎯 Что это?

Система управления несколькими клиентами с разными стратегиями поиска вирусного контента в Instagram. Каждый клиент имеет свою конфигурацию, дашборды и автоматическое обновление Obsidian.

## ⚡ **Быстрое использование**

```bash
# 1. Посмотреть клиентов
npm run strategy clients

# 2. Переключиться на нужного
npm run strategy switch aesthetics

# 3. Запустить стратегию
npm run strategy run

# 4. Открыть дашборд в Obsidian
# vaults/coco-age/🥥✨ ГЛАВНЫЙ ДАШБОРД.md
```

## � Активные клиенты

### 🥥 **Coco Age (Эстетическая медицина)**
- **Конфигурация:** `config/instagram-strategy.json`
- **Obsidian:** `vaults/coco-age/🥥✨ ГЛАВНЫЙ ДАШБОРД.md`
- **Конкуренты:** @clinicajoelleofficial, @kayaclinicarabia, @ziedasclinic
- **Хэштеги:** #aestheticclinic, #botox, #antiaging

### 🤖 **TrendWatching (AI & Tech)**
- **Конфигурация:** `config/trendwatching-strategy.json`
- **Obsidian:** `vaults/trendwatching/🤖📈 ГЛАВНЫЙ ДАШБОРД.md`
- **Конкуренты:** @evolving.ai, @theaipage, @edu_v_peru
- **Хэштеги:** #ai, #artificialintelligence, #technology

## 🚀 Быстрый старт

### 1. Посмотреть всех клиентов
```bash
npm run strategy clients
```

### 2. Переключиться на нужного клиента
```bash
npm run strategy switch aesthetics     # Эстетическая медицина
npm run strategy switch trendwatching  # AI & Tech тренды
```

### 3. Запустить стратегию
```bash
npm run strategy run                   # Текущий клиент
npm run strategy run-all              # Все клиенты сразу
```

### 4. Найти дашборды в Obsidian
- **Coco Age:** `vaults/coco-age/🥥✨ ГЛАВНЫЙ ДАШБОРД.md`
- **TrendWatching:** `vaults/trendwatching/🤖📈 ГЛАВНЫЙ ДАШБОРД.md`

## 📊 Что получите

### 🥥 **Для Coco Age (Эстетическая медицина):**
- **📊 Главный дашборд** - аналитика вирусного контента (50K+ просмотров)
- **🏢 Анализ конкурентов** - @clinicajoelleofficial, @kayaclinicarabia, @ziedasclinic с реальными данными
- **🏷️ Хэштеги** - #aestheticclinic, #botox, #antiaging эффективность
- **📈 KPI дашборд** - прогресс по целям и метрикам

### 🤖 **Для TrendWatching (AI & Tech):**
- **📊 AI дашборд** - анализ AI трендов и инноваций (50K+ просмотров)
- **🏢 AI конкуренты** - @evolving.ai, @theaipage, @edu_v_peru
- **🌐 Тренды с сайтов** - мониторинг 10 источников (Google Trends, Product Hunt, etc.)
- **🤖 AI аналитика** - категории ML, Neural Networks, AI Tools

### 🔄 **Автоматизация:**
- **Ежедневное обновление** дашбордов при запуске стратегий
- **Автоматические отчеты** в папке Reports/
- **Реальные данные** вместо заглушек
- **Навигация** через [[ссылки]] между разделами

## 📁 Структура в Obsidian

```
vaults/
├── coco-age/                           # 🥥 Эстетическая медицина
│   ├── 🥥✨ ГЛАВНЫЙ ДАШБОРД.md          # Главная аналитика
│   ├── Competitors/                    # Анализ конкурентов
│   │   ├── clinicajoelleofficial.md    # @clinicajoelleofficial анализ
│   │   ├── kayaclinicarabia.md         # @kayaclinicarabia анализ
│   │   └── ziedasclinic.md             # @ziedasclinic анализ
│   ├── Reports/                        # Ежедневные отчеты
│   └── README.md                       # Описание проекта
│
└── trendwatching/                      # 🤖 AI & Tech тренды
    ├── 🤖📈 ГЛАВНЫЙ ДАШБОРД.md          # AI аналитика
    ├── Competitors/                    # AI конкуренты
    │   ├── evolving-ai.md              # @evolving.ai анализ
    │   ├── theaipage.md                # @theaipage анализ
    │   └── edu-v-peru.md               # @edu_v_peru анализ
    ├── Trends/                         # Тренды с сайтов
    ├── Reports/                        # AI отчеты
    └── Analysis/                       # AI аналитика
```

## 🛠 Основные команды

### 👥 **Управление клиентами**
| Команда | Описание |
|---------|----------|
| `npm run strategy clients` | Показать всех клиентов |
| `npm run strategy switch aesthetics` | Переключиться на Coco Age |
| `npm run strategy switch trendwatching` | Переключиться на TrendWatching |
| `npm run strategy status` | Статус текущего клиента |

### 🚀 **Запуск стратегий**
| Команда | Описание |
|---------|----------|
| `npm run strategy run` | Запустить текущую стратегию |
| `npm run strategy run-all` | Запустить все стратегии |
| `npm run strategy viral` | Применить вирусный пресет |
| `npm run strategy popular 15000` | Популярный контент с 15K просмотров |

### ⚙️ **Настройка стратегий**
| Команда | Описание |
|---------|----------|
| `npm run strategy setup viral "botox,aesthetics" "comp1,comp2" 50000` | Быстрая настройка |
| `npm run strategy custom "ai,tech" "evolving.ai" 100000` | Кастомная настройка |

## 📖 Документация

- **[docs/МАРКЕТОЛОГ_ИНСТРУКЦИЯ.md](docs/МАРКЕТОЛОГ_ИНСТРУКЦИЯ.md)** - Инструкция для маркетологов
- **[docs/OBSIDIAN_АРХИТЕКТУРА.md](docs/OBSIDIAN_АРХИТЕКТУРА.md)** - Архитектура Obsidian
- **[.cursor/rules/current_task.mdc](.cursor/rules/current_task.mdc)** - Текущее состояние проекта

## 🔧 Техническая информация

- **База данных:** Neon PostgreSQL
- **Runtime:** Node.js + TypeScript
- **ORM:** Drizzle
- **Отчеты:** Obsidian Markdown
- **Архитектура:** Мультиклиентская система стратегий
- **Деплой:** Railway.app (готов к продакшену)

## 📞 Диагностика и поддержка

```bash
# Проверка состояния
npm run db:studio        # База данных (порт 3457)
npm run typecheck        # Проверка типов TypeScript (исправлен)
npm test                 # Запуск тестов

# Диагностика скрапинга
npm run debug-apify      # Отладка Apify ответов
npm run diagnose-apify   # Диагностика данных Apify
npm run analyze-views    # Анализ просмотров vs лайков

# Работающие скрипты
npm run scrape-hashtags-working  # Рабочий скрапинг хэштегов

# Railway деплой
npm run railway:check    # Проверка готовности к деплою
npm run railway:setup    # Автоматическая настройка Railway
npm run railway:deploy   # Деплой на Railway
npm run railway:logs     # Просмотр логов Railway
```

## 🎯 Режимы работы

### 📊 **Пресеты стратегий:**
- **viral** - Вирусный контент (50K+ просмотров, 7 дней)
- **popular** - Популярный контент (10K+ просмотров, 30 дней)
- **trending** - Трендовый контент (5K+ просмотров, 14 дней)
- **research** - Исследование (1K+ просмотров, 90 дней)
- **trendwatching** - AI тренды (50K+ просмотров, 7 дней)

## � Автоматизация

### ⏰ **Ежедневный запуск (9:00 утра):**
```bash
# Автоматический запуск всех стратегий
npm run strategy run-all
```

### 📊 **Результат автоматизации:**
- ✅ Обновление всех дашбордов с реальными данными
- ✅ Создание ежедневных отчетов в Reports/
- ✅ Обновление страниц конкурентов
- ✅ Telegram уведомления (ID: 144022504)

## 🤖 **РАБОЧИЕ СКРАПЕРЫ**

### ✅ **ПРОВЕРЕННЫЕ И РАБОТАЮЩИЕ:**

#### 🏆 **Основной скрапер: `apify/instagram-scraper`**
- **Статус:** ✅ Работает
- **Назначение:** Универсальный скрапер для Instagram контента
- **Поддерживает:** Хэштеги, профили пользователей, Reels, посты
- **Конфигурация:** Residential прокси, лимиты, фильтры
- **Документация:** [docs/SCRAPERS.md](docs/SCRAPERS.md)

#### 🥈 **Резервный скрапер: `apify/instagram-reel-scraper`**
- **Статус:** ✅ Резервный
- **Назначение:** Специализированный скрапер для Instagram Reels
- **Использование:** Автоматически при сбое основного скрапера
- **Особенности:** Оптимизирован для Reels

#### 📊 **Рабочие команды для скрапинга:**
```bash
# Основные команды стратегий
npm run strategy run                    # Запуск текущей стратегии
npm run strategy run-all               # Запуск всех стратегий
npm run strategy viral                 # Вирусный контент (50K+)

# Прямые скрипты скрапинга
npx tsx src/scripts/clean-and-scrape-fresh.ts    # Очистка + свежие данные
npx tsx src/scripts/scrape-with-modes.ts         # Скрапинг с режимами
npx tsx src/scripts/check-apify-actors.ts        # Проверка скраперов
```

### ⚠️ **ТРЕБОВАНИЯ К ДАННЫМ:**
- **Минимальные просмотры:** 50,000+ (вирусный контент)
- **Период:** Последние 30 дней (только 2025 год)
- **Конкуренты:** @clinicajoelleofficial, @kayaclinicarabia, @ziedasclinic
- **Исключения:** lips_for_kiss убран (другая специализация)
- **Фильтрация:** Автоматическое удаление данных 2024 года

## 🚨 Что работает / Что не работает

### ✅ **РАБОТАЕТ:**
- ✅ Мультиклиентская система стратегий
- ✅ Переключение между клиентами (`npm run strategy switch`)
- ✅ Автоматическое обновление Obsidian дашбордов
- ✅ **Скрапер `apify/instagram-scraper`** - основной рабочий скрапер
- ✅ **Очистка базы** от старых данных и мусора
- ✅ **Получение реальных данных** с 50K+ просмотров
- ✅ Конфигурация через JSON файлы
- ✅ TypeScript типизация и проверки
- ✅ Тестовая система (17 тестов)

### ⚠️ **В РАЗРАБОТКЕ:**
- 🔄 Парсинг трендов с 10 сайтов для TrendWatching
- 🔄 Транскрипция видео через OpenAI Whisper
- 🔄 Excel экспорт с детальной аналитикой
- 🔄 TypeScript проверка (конфликт с bun-types)

### ❌ **УСТАРЕЛО (НЕ ИСПОЛЬЗОВАТЬ):**
- ❌ Старые `bun run` команды (заменены на `npm run strategy`)
- ❌ Команды `create:dashboard`, `export:report` (устарели)
- ❌ Папка `content-factory` (заменена на `vaults/`)
- ❌ **Фейковые данные:** competitor1, competitor2, демо-данные
- ❌ **lips_for_kiss** конкурент (убран из списка)
- ❌ **Данные 2024 года** (автоматически удаляются)
- ❌ **Мок-сервисы и тестовые скрипты** (удалены)

---

## 📊 **Текущий статус**

**Статус:** � Частично готов (проблемы со скрапером)
**Клиентов:** 2 активных (Coco Age + TrendWatching)
**Дашбордов:** ✅ 1 с реальными данными (138 Reels, 51 вирусных)
**Конкурентов:** 3 реальных (@clinicajoelleofficial, @kayaclinicarabia, @ziedasclinic)
**Скраперы:** ✅ apify/instagram-scraper (основной) + apify/instagram-reel-scraper (резервный)
**Архитектура:** ✅ Порядок наведен, фейковые данные удалены

---

## 🎯 **Примеры использования**

### 📊 **Для маркетолога эстетической медицины:**
```bash
# Переключиться на Coco Age
npm run strategy switch aesthetics

# Запустить поиск вирусного контента
npm run strategy viral

# Посмотреть результаты в Obsidian
# vaults/coco-age/🥥✨ ГЛАВНЫЙ ДАШБОРД.md
```

### 🤖 **Для анализа AI трендов:**
```bash
# Переключиться на TrendWatching
npm run strategy switch trendwatching

# Запустить AI анализ
npm run strategy run

# Посмотреть AI дашборд
# vaults/trendwatching/🤖📈 ГЛАВНЫЙ ДАШБОРД.md
```

### 🔄 **Для автоматизации:**
```bash
# Запустить все стратегии сразу (ежедневно в 9:00)
npm run strategy run-all

# Результат: обновятся все дашборды и отчеты
```

## 🚂 Деплой на Railway

> **✅ ПРОЕКТ ГОТОВ К ДЕПЛОЮ!** Все файлы настроены, код обновлен.

### 🚀 Быстрый деплой

```bash
# 1. Проверка готовности (все ✅)
npm run railway:check

# 2. Автоматическая настройка
npm run railway:setup

# 3. Деплой
npm run railway:deploy
```

### ⚙️ Ручная настройка

1. **Создайте проект на [railway.app](https://railway.app)**
2. **Подключите GitHub репозиторий**
3. **Добавьте PostgreSQL базу данных**
4. **Настройте переменные окружения:**
   ```env
   BOT_TOKEN=your_telegram_bot_token
   DATABASE_URL=postgresql://... (автоматически)
   APIFY_TOKEN=your_apify_token
   OPENAI_API_KEY=your_openai_key
   NODE_ENV=production
   ```
5. **Задеплойте проект**

### 📊 Мониторинг

- **Health Check:** `https://your-app.railway.app/health`
- **Логи:** `npm run railway:logs`
- **Метрики:** Railway Dashboard
- **Автоматические деплои:** при push в main

### 📚 Подробная документация

См. [docs/RAILWAY_DEPLOYMENT.md](docs/RAILWAY_DEPLOYMENT.md) для полного руководства.

---

**🕉️ README обновлен! Вся актуальная информация для управления системой.**
