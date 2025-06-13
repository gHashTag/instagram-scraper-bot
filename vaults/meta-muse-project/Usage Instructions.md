# 📖 Usage Instructions

## 🚀 **Быстрый старт**

### 1. Проверка готовности системы

```bash
cd /Users/playra/instagram-scraper-bot
bun run src/scripts/meta-muse-scraper.ts
```

**Ожидаемый результат:**

```
🕉️ Запуск MetaMouse Instagram Hashtag Scraper
═══════════════════════════════════════════════
📋 Загрузка конфигурации хэштегов...
📊 Всего категорий: 6
🏷️ Всего хэштегов: 151
✅ MetaMouse скрепер готов к работе!
```

### 2. Запуск тестов

```bash
bun test src/__tests__/strategy/meta-muse-hashtag-strategy.test.ts
```

**Ожидаемый результат:**

```
✅ 11 pass, 0 fail, 30 expect() calls
```

## 🔧 **Настройка**

### Переменные окружения

Убедитесь, что в `.env` файле настроено:

```env
DATABASE_URL="postgresql://neondb_owner:your_password@your-host/neondb?sslmode=require"
```

### Apify Token (для будущего использования)

```env
APIFY_TOKEN="your_apify_token_here"
```

## 📋 **Доступные команды**

### Основные скрипты

```bash
# Проверка готовности
bun run src/scripts/meta-muse-scraper.ts

# Будущий запуск скрепинга (не реализовано)
bun run src/scripts/meta-muse-scraper.ts --run

# Запуск тестов
bun test src/__tests__/strategy/meta-muse-hashtag-strategy.test.ts

# Проверка типов
bun run typecheck
```

## 🎯 **Использование в коде**

### Инициализация стратегии

```typescript
import { MetaMuseHashtagStrategy } from "../strategy/meta-muse-hashtag-strategy";
import { DatabaseAdapter } from "../db/neon-adapter";

// Создание экземпляра
const dbAdapter = new DatabaseAdapter();
const strategy = new MetaMuseHashtagStrategy(dbAdapter);
```

### Получение конфигурации хэштегов

```typescript
const config = strategy.createHashtagConfig();
console.log(`Категорий: ${config.categories.length}`);
console.log(`Всего хэштегов: ${config.totalHashtags}`);
```

### Создание Apify конфигурации

```typescript
const apifyConfig = strategy.createApifyConfig("#ai");
console.log(apifyConfig);
// {
//   hashtag: '#ai',
//   maxPosts: 100,
//   proxy: { useApifyProxy: true },
//   resultsLimit: 100,
//   onlyPostsWithLocation: false
// }
```

### Пакетная конфигурация

```typescript
const batchConfig = strategy.createBatchScrapingConfig(config);
console.log(`Пакетов: ${batchConfig.batches.length}`);
```

### Скрепинг по категории

```typescript
const result = await strategy.runScrapingForCategory("basic");
console.log(`Обработано хэштегов: ${result.processedHashtags}`);
console.log(`Всего постов: ${result.totalPosts}`);
```

### Генерация отчета

```typescript
const report = strategy.generateReport();
console.log(`Project ID: ${report.projectId}`);
console.log(`Категории: ${report.categories.join(", ")}`);
```

## 📊 **Мониторинг и отладка**

### Логи базы данных

```typescript
// Включить подробные логи
const dbAdapter = new DatabaseAdapter({
  debug: true,
  logging: true,
});
```

### Проверка соединения

```typescript
// Проверка подключения к Neon
await dbAdapter.testConnection();
```

### Отладка скрепинга

```typescript
// Мок данные для тестирования
const mockData = {
  id: "test_post_123",
  hashtag: "#ai",
  caption: "Test post",
  // ... другие поля
};

const processed = strategy.processScrapedData(mockData, "basic");
console.log(processed);
```

## ⚠️ **Важные моменты**

### Project ID изоляция

- **Все данные Meta Muse** сохраняются с `project_id: 999`
- Это обеспечивает изоляцию от других проектов
- При запросах всегда фильтруйте по `project_id = 999`

### Ограничения Apify

- Максимум 100 постов на хэштег
- Используется Apify Proxy для защиты
- Rate limiting встроен в скрепер

### Категории хэштегов

```
1. basic (7 хэштегов)
2. ai_influencers (30 хэштегов)
3. metaverse_tech (24 хэштега)
4. archetype_muse_magician_seer (30 хэштегов)
5. psycho_emotional_awakened_creators (30 хэштегов)
6. philosophy_spirit_tech (30 хэштегов)
```

## 🔄 **Workflow разработки**

### TDD цикл

1. **RED** - Написать падающий тест
2. **GREEN** - Реализовать минимальный код
3. **REFACTOR** - Улучшить код

### Добавление новых хэштегов

1. Отредактировать конфигурацию в `MetaMuseHashtagStrategy.createHashtagConfig()`
2. Обновить тесты в `meta-muse-hashtag-strategy.test.ts`
3. Запустить тесты: `bun test`
4. Убедиться, что все проходят

### Добавление новых категорий

1. Добавить категорию в `createHashtagConfig()`
2. Добавить тест для новой категории
3. Обновить общее количество в тестах
4. Проверить все тесты

## 🛠️ **Отладка проблем**

### Проблемы с базой данных

```bash
# Проверка подключения
bun run -e "console.log(process.env.DATABASE_URL)"

# Тест подключения
bun run src/db/test-connection.ts
```

### Проблемы с тестами

```bash
# Запуск с подробным выводом
bun test src/__tests__/strategy/meta-muse-hashtag-strategy.test.ts --verbose

# Запуск отдельного теста
bun test -t "должен создать конфигурацию для 6 категорий"
```

### Проблемы с типами

```bash
# Проверка типов
bun run typecheck

# Детальная проверка
bun exec tsc --noEmit --pretty
```

---

> 🕉️ _Следуя этим инструкциям, вы сможете эффективно использовать Meta Muse Hashtag Strategy для позиционирования аниме мыши аватара_
