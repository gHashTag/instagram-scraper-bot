# 🕉️ Instagram Scraping Strategy - Единственный Источник Правды

## 📋 **ОБЗОР**

Instagram Strategy - это унифицированная система для скрапинга Instagram контента, которая позволяет маркетологам получать отличные результаты, указав необходимые параметры в одном объекте.

## 🎯 **ОСНОВНЫЕ ВОЗМОЖНОСТИ**

- ✅ **Единая конфигурация** - все параметры в одном месте
- ✅ **Предустановленные режимы** - viral, popular, normal, test
- ✅ **Умная фильтрация** - реальные просмотры vs лайки
- ✅ **Категории контента** - aesthetics, beauty, skincare, medical
- ✅ **TDD подход** - 17 тестов покрывают всю функциональность
- ✅ **CLI интерфейс** - простое использование для маркетологов

## 🚀 **БЫСТРЫЙ СТАРТ**

### Базовое использование:
```bash
# Вирусный контент по эстетической медицине
npm run scrape-strategy viral aesthetics

# Популярный контент по красоте с кастомным лимитом
npm run scrape-strategy popular beauty 15000

# Тестовый режим для skincare
npm run scrape-strategy test skincare 500 50
```

### Программное использование:
```typescript
import { InstagramStrategy } from "./strategy/instagram-strategy";

// Создание стратегии для вирусного контента
const strategy = InstagramStrategy.createViralStrategy(
  ["aestheticclinic", "botox"], 
  ["competitor1", "competitor2"]
);

// Применение фильтров
const filteredPosts = strategy.applyFilters(posts);
```

## 📊 **РЕЖИМЫ СКРАПИНГА**

### 🔥 **VIRAL** - Вирусный контент
- **Просмотры:** 50,000+
- **Возраст:** 7 дней
- **Источник:** Только реальные просмотры
- **Лимит:** 1,000 постов (50 на источник)

### 📈 **POPULAR** - Популярный контент  
- **Просмотры:** 10,000+
- **Возраст:** 30 дней
- **Источник:** Реальные просмотры + оценка по лайкам
- **Лимит:** 2,000 постов (100 на источник)

### 📋 **NORMAL** - Обычный контент
- **Просмотры:** 1,000+
- **Возраст:** 30 дней
- **Источник:** Реальные просмотры + оценка по лайкам
- **Лимит:** 5,000 постов (200 на источник)

### 🧪 **TEST** - Тестовый режим
- **Просмотры:** 100+
- **Возраст:** 90 дней
- **Источник:** Реальные просмотры + оценка по лайкам
- **Лимит:** 100 постов (10 на источник)

## 🏷️ **КАТЕГОРИИ КОНТЕНТА**

### 💉 **AESTHETICS** - Эстетическая медицина
```
Хэштеги: aestheticclinic, aestheticmedicine, aesthetictreatment, botox, dermalfillers, antiaging
Конкуренты: competitor1, competitor2, competitor3
```

### 💄 **BEAUTY** - Красота и уход
```
Хэштеги: skincare, skinrejuvenation, hydrafacial, prpfacial, rfmicroneedling
Конкуренты: beautycompetitor1, beautycompetitor2
```

### 🧴 **SKINCARE** - Уход за кожей
```
Хэштеги: skincare, glowingskin, healthyskin, skincareproducts, skincareroutine
Конкуренты: (пусто)
```

### 🏥 **MEDICAL** - Медицинская косметология
```
Хэштеги: medicalaesthetics, cosmeticdermatology, plasticsurgery, nonsurgical, injectables
Конкуренты: (пусто)
```

## ⚙️ **КОНФИГУРАЦИЯ**

### Структура конфигурации:
```typescript
interface InstagramScrapingConfig {
  mode: ScrapingMode;
  filters: FilterCriteria;
  limits: ScrapingLimits;
  scrapers: ScraperOptions;
  sources: ScrapingSources;
  options?: AdditionalOptions;
}
```

### Пример кастомной конфигурации:
```typescript
const customStrategy = InstagramStrategy.fromMode("viral", 
  { 
    hashtags: ["customtag1", "customtag2"], 
    competitors: ["competitor1"] 
  },
  {
    filters: { minViews: 75000 },
    limits: { totalLimit: 500 },
    options: { exportToExcel: true }
  }
);
```

## 🔧 **ФИЛЬТРАЦИЯ**

### Умная система фильтрации:
1. **Реальные просмотры** - приоритет videoViewCount и videoPlayCount
2. **Fallback на лайки** - если нет реальных просмотров, используем лайки × 15
3. **Фильтр по дате** - контент не старше указанного периода
4. **Режим строгости** - requireRealViews отклоняет посты без реальных просмотров

### Пример фильтрации:
```typescript
// Пост с реальными просмотрами
{ videoViewCount: 75000, likesCount: 5000 } // ✅ Пройдет (75K просмотров)

// Пост только с лайками (requireRealViews = false)
{ likesCount: 4000 } // ✅ Пройдет (60K оценочных просмотров)

// Пост только с лайками (requireRealViews = true)  
{ likesCount: 4000 } // ❌ Отклонен (нет реальных просмотров)
```

## 🧪 **ТЕСТИРОВАНИЕ**

Система покрыта 17 unit-тестами:
```bash
# Запуск тестов
npx bun test src/__tests__/unit/strategy/instagram-strategy.test.ts

# Результат: ✓ 17 pass, 0 fail
```

## 📈 **ИНТЕГРАЦИЯ**

### Следующие шаги для полной интеграции:
1. **Интеграция с instagram-scraper.ts** - применение стратегий к существующим скриптам
2. **Сохранение в БД** - автоматическое сохранение отфильтрованных результатов
3. **Excel экспорт** - генерация отчетов для маркетологов
4. **Автоматизация** - запуск по расписанию

## 🎯 **ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ**

### Для маркетолога:
```bash
# Найти вирусный контент конкурентов
npm run scrape-strategy viral aesthetics 50000

# Исследовать популярные тренды
npm run scrape-strategy popular beauty 20000 100

# Быстрый тест новой ниши
npm run scrape-strategy test medical 1000 20
```

### Для разработчика:
```typescript
// Создание кастомной стратегии
const strategy = new InstagramStrategy({
  mode: "viral",
  filters: { minViews: 100000, maxAgeDays: 3, requireRealViews: true },
  limits: { totalLimit: 200, perSourceLimit: 20 },
  scrapers: { primary: "apify/instagram-scraper", fallback: [] },
  sources: { hashtags: ["luxury"], competitors: [] }
});

// Применение к данным
const results = strategy.applyFilters(rawPosts);
```

## 🔮 **БУДУЩИЕ ВОЗМОЖНОСТИ**

- 🤖 **AI-анализ контента** - автоматическая категоризация
- 📊 **Аналитика трендов** - выявление растущих хэштегов
- 🎯 **Персонализация** - стратегии под конкретного клиента
- 🔄 **Автообновление** - динамическая корректировка параметров
- 📱 **Telegram интеграция** - уведомления о новом вирусном контенте

---

**🕉️ Создано с любовью для маркетологов эстетической медицины**
