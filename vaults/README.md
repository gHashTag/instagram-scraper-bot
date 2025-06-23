# 🗂️ Vaults Master Index - Навигация по всей документации

> **🎯 ПРИНЦИП:** Вся документация проектов организована по vault'ам  
> **📅 Обновлено:** 2025-01-XX | **Статус:** ✅ АКТУАЛЬНО

---

## 📚 **ТРИ ОСНОВНЫХ VAULT'А**

### 🥥 **[Coco Age Vault](./coco-age/)**

**🎯 Фокус:** Эстетическая медицина и красота | **Project ID: 1**

#### 📊 **Ключевые документы:**

- **[🎯 ГЛАВНЫЙ ДАШБОРД](./coco-age/🎯%20ГЛАВНЫЙ%20ДАШБОРД.md)** - Центральная аналитика и метрики
- **[📋 Technical Specification](./coco-age/📋%20Technical%20Specification.md)** - Полная техспецификация (805 строк)
- **[🏠 Project Index](./coco-age/🏠%20Project%20Index%20-%20Navigation%20Hub.md)** - Навигационный хаб
- **[👥 Team Structure & Roles](./coco-age/👥%20Team%20Structure%20&%20Roles.md)** - Структура команды
- **[📊 Conv.Rules](./coco-age/📊%20Conv.Rules%20-%20Content%20Factory%20Conversion%20Framework.md)** - Фреймворк конверсии
- **[🤖 Content Factory Manager](./coco-age/🤖%20Content%20Factory%20Manager%20Agent%20-%20Job%20Description.md)** - AI-агент описание

#### 📁 **Структура папок:**

```
coco-age/
├── 🎯 ГЛАВНЫЙ ДАШБОРД.md (живой дашборд)
├── Analytics/ (аналитические отчеты)
├── Competitors/ (профили конкурентов)
├── Hashtags/ (анализ хэштегов)
├── Reports/ (отчеты)
├── content-factory/project-coco-age/ (редактируемые дашборды)
└── .obsidian/ (настройки Obsidian)
```

**🔄 Автоматизация:** Каждые 6 часов через `update-obsidian.yml`

---

### 🐭 **[Meta Muse Vault](./meta-muse-project/)**

**🎯 Фокус:** AI-инфлюенсер проект | **Project ID: 2**

#### 📊 **Ключевые документы:**

- **[📚 API Documentation](./meta-muse-project/API%20Documentation.md)** - Полная API документация (395 строк)
- **[📋 Usage Instructions](./meta-muse-project/Usage%20Instructions.md)** - Инструкции по использованию
- **[🧪 Test Results](./meta-muse-project/Test%20Results.md)** - Результаты тестирования

#### 📁 **Структура папок:**

```
meta-muse-project/
├── API Documentation.md (техническая документация)
├── Usage Instructions.md (руководства)
├── Test Results.md (результаты тестов)
└── .obsidian/ (настройки Obsidian)
```

**🔄 Автоматизация:** Ежедневно 02:00 UTC через `meta-muse-daily.yml`

---

### 🤖 **[TrendWatching Vault](./trendwatching/)**

**🎯 Фокус:** AI & Tech тренды | **Project ID: 3**

#### 📊 **Ключевые документы:**

- **[🤖📈 ГЛАВНЫЙ ДАШБОРД](./trendwatching/🤖📈%20ГЛАВНЫЙ%20ДАШБОРД.md)** - AI & Tech тренды центр

#### 📁 **Структура папок:**

```
trendwatching/
├── 🤖📈 ГЛАВНЫЙ ДАШБОРД.md (AI аналитика)
├── Analysis/ (анализ трендов)
├── Competitors/ (AI конкуренты)
├── Hashtags/ (AI хэштеги)
├── Reports/ (отчеты трендов)
└── .obsidian/ (настройки Obsidian)
```

**🔄 Режим:** TRENDWATCHING (аналитический)

---

## 🚀 **БЫСТРАЯ НАВИГАЦИЯ**

### 📊 **По типу документов:**

#### 🎯 **Дашборды и аналитика:**

- [Coco Age - Главный дашборд](./coco-age/🎯%20ГЛАВНЫЙ%20ДАШБОРД.md) - Эстетическая медицина
- [TrendWatching - AI дашборд](./trendwatching/🤖📈%20ГЛАВНЫЙ%20ДАШБОРД.md) - AI & Tech тренды

#### 📋 **Техническая документация:**

- [Coco Age - Technical Spec](./coco-age/📋%20Technical%20Specification.md) - Полная техспецификация
- [Meta Muse - API Docs](./meta-muse-project/API%20Documentation.md) - API документация
- [Meta Muse - Usage Instructions](./meta-muse-project/Usage%20Instructions.md) - Инструкции

#### 👥 **Команда и процессы:**

- [Coco Age - Team Structure](./coco-age/👥%20Team%20Structure%20&%20Roles.md) - Структура команды
- [Coco Age - Content Factory Manager](./coco-age/🤖%20Content%20Factory%20Manager%20Agent%20-%20Job%20Description.md) - AI-агент

#### 📊 **Фреймворки и правила:**

- [Coco Age - Conv.Rules](./coco-age/📊%20Conv.Rules%20-%20Content%20Factory%20Conversion%20Framework.md) - Конверсионный фреймворк

---

## 🔄 **АВТОМАТИЗАЦИЯ И ОБНОВЛЕНИЯ**

### 🥥 **Coco Age:**

- **Частота:** Каждые 6 часов
- **GitHub Action:** `update-obsidian.yml`
- **Команда:** `bun run sync-obsidian 1`

### 🐭 **Meta Muse:**

- **Частота:** Ежедневно 02:00 UTC
- **GitHub Action:** `meta-muse-daily.yml`
- **Команда:** `bun run meta-muse:daily`

### 🤖 **TrendWatching:**

- **Режим:** Аналитический (по требованию)
- **Команда:** `bun run analyze:ai-trends 3`

---

## 🎯 **СТАТУСЫ ПРОЕКТОВ**

| Проект               | Статус          | Автоматизация    | Документация   | Приоритет  |
| -------------------- | --------------- | ---------------- | -------------- | ---------- |
| **🥥 Coco Age**      | ✅ Активен      | 🔄 Полная        | 📚 Полная      | 🥇 Высокий |
| **🐭 Meta Muse**     | ✅ Активен      | 🔄 Полная        | 📚 Техническая | 🥇 Высокий |
| **🤖 TrendWatching** | ✅ Исследования | 📊 Аналитическая | 📚 Базовая     | 🥉 Средний |

---

## 🧹 **ПРИНЦИПЫ ОРГАНИЗАЦИИ**

### ✅ **Что работает хорошо:**

- **Живые дашборды** с автообновлением
- **Четкая структура папок** по типам данных
- **Obsidian интеграция** для навигации
- **Автоматизированные процессы** обновления

### 🔧 **Что можно улучшить:**

- **Единообразие** в названиях файлов
- **Кросс-ссылки** между проектами
- **Общие шаблоны** для документов
- **Централизованный** мониторинг всех проектов

---

## 🔗 **СВЯЗАННЫЕ ТЕХНИЧЕСКИЕ ФАЙЛЫ**

### 📁 **Код и скрипты:**

- `src/scripts/meta-muse-robust-cycle.ts` - Meta Muse парсер
- `src/scripts/sync-obsidian-vault.ts` - Coco Age синхронизация
- `.github/workflows/meta-muse-daily.yml` - Meta Muse автоматизация
- `.github/workflows/update-obsidian.yml` - Coco Age автоматизация

### ⚙️ **Конфигурация:**

- `package.json` - npm команды для всех проектов
- `drizzle.config.ts` - конфигурация БД

---

_🕉️ Порядок в документации - порядок в мыслях_  
_📅 Последнее обновление: 2025-01-XX_  
_🗂️ Три vault'а, одна цель - организованное знание_
