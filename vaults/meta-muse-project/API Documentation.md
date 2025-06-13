# 📚 API Documentation

## 🔧 **MetaMuseHashtagStrategy Class**

### Конструктор

```typescript
constructor(db: DatabaseAdapter)
```

**Параметры:**

- `db: DatabaseAdapter` - Адаптер базы данных (Neon PostgreSQL)

**Пример:**

```typescript
const dbAdapter = new DatabaseAdapter();
const strategy = new MetaMuseHashtagStrategy(dbAdapter);
```

---

## 📋 **Методы конфигурации**

### `createHashtagConfig(): HashtagConfig`

Создает конфигурацию всех 6 категорий хэштегов для Meta Muse.

**Возвращает:**

```typescript
interface HashtagConfig {
  categories: Array<{
    name: string;
    description: string;
    hashtags: string[];
  }>;
  totalHashtags: number;
}
```

**Пример использования:**

```typescript
const config = strategy.createHashtagConfig();
console.log(`Категорий: ${config.categories.length}`); // 6
console.log(`Всего хэштегов: ${config.totalHashtags}`); // 151
```

**Категории:**

1. `basic` - 7 хэштегов
2. `ai_influencers` - 30 хэштегов
3. `metaverse_tech` - 24 хэштега
4. `archetype_muse_magician_seer` - 30 хэштегов
5. `psycho_emotional_awakened_creators` - 30 хэштегов
6. `philosophy_spirit_tech` - 30 хэштегов

---

## 🔌 **Методы интеграции с Apify**

### `createApifyConfig(hashtag: string): ApifyConfig`

Создает конфигурацию для Apify скрепера специально для одного хэштега.

**Параметры:**

- `hashtag: string` - Хэштег для скрепинга (например, "#ai")

**Возвращает:**

```typescript
interface ApifyConfig {
  hashtag: string;
  maxPosts: number;
  proxy: {
    useApifyProxy: boolean;
  };
  resultsLimit: number;
  onlyPostsWithLocation: boolean;
}
```

**Пример использования:**

```typescript
const config = strategy.createApifyConfig("#ai");
// {
//   hashtag: '#ai',
//   maxPosts: 100,
//   proxy: { useApifyProxy: true },
//   resultsLimit: 100,
//   onlyPostsWithLocation: false
// }
```

### `createBatchScrapingConfig(config: HashtagConfig): BatchScrapingConfig`

Создает конфигурацию для пакетного скрепинга по всем категориям.

**Параметры:**

- `config: HashtagConfig` - Конфигурация хэштегов

**Возвращает:**

```typescript
interface BatchScrapingConfig {
  batches: Array<{
    category: string;
    hashtags: string[];
  }>;
  totalHashtags: number;
}
```

**Пример использования:**

```typescript
const hashtagConfig = strategy.createHashtagConfig();
const batchConfig = strategy.createBatchScrapingConfig(hashtagConfig);
console.log(`Пакетов: ${batchConfig.batches.length}`); // 6
```

---

## 💾 **Методы обработки данных**

### `processScrapedData(data: any, category: string): InstagramPost`

Обрабатывает данные, полученные от Apify скрепера, и готовит их для сохранения в БД.

**Параметры:**

- `data: any` - Сырые данные от Apify
- `category: string` - Название категории

**Возвращает:**

```typescript
interface InstagramPost {
  id?: number;
  instagram_id: string;
  project_id: number; // Всегда 999 для Meta Muse
  source_type: string; // Всегда 'instagram_hashtag'
  hashtag: string;
  category: string;
  // ... другие поля из схемы БД
}
```

**Пример использования:**

```typescript
const mockData = {
  id: "insta_123",
  hashtag: "#ai",
  caption: "Amazing AI technology",
  // ... другие поля
};

const processed = strategy.processScrapedData(mockData, "basic");
console.log(processed.project_id); // 999
console.log(processed.category); // 'basic'
```

---

## 🚀 **Методы выполнения скрепинга**

### `async runScrapingForCategory(categoryName: string): Promise<ScrapingResult>`

Выполняет скрепинг для одной конкретной категории.

**Параметры:**

- `categoryName: string` - Название категории ('basic', 'ai_influencers', и т.д.)

**Возвращает:**

```typescript
interface ScrapingResult {
  category: string;
  processedHashtags: number;
  totalPosts: number;
}
```

**Пример использования:**

```typescript
const result = await strategy.runScrapingForCategory("basic");
console.log(`Категория: ${result.category}`);
console.log(`Обработано хэштегов: ${result.processedHashtags}`);
console.log(`Всего постов: ${result.totalPosts}`);
```

**Поддерживаемые категории:**

- `basic`
- `ai_influencers`
- `metaverse_tech`
- `archetype_muse_magician_seer`
- `psycho_emotional_awakened_creators`
- `philosophy_spirit_tech`

---

## 📊 **Методы отчетности**

### `generateReport(): ScrapingReport`

Генерирует отчет о готовности системы к скрепингу.

**Возвращает:**

```typescript
interface ScrapingReport {
  projectId: number;
  categories: string[];
  totalHashtags: number;
  generatedAt: Date;
}
```

**Пример использования:**

```typescript
const report = strategy.generateReport();
console.log(`Project ID: ${report.projectId}`); // 999
console.log(`Категории: ${report.categories.length}`); // 6
console.log(`Всего хэштегов: ${report.totalHashtags}`); // 151
console.log(`Создан: ${report.generatedAt}`);
```

---

## 🏗️ **Интерфейсы и типы**

### HashtagConfig

```typescript
interface HashtagConfig {
  categories: Array<{
    name: string;
    description: string;
    hashtags: string[];
  }>;
  totalHashtags: number;
}
```

### ApifyConfig

```typescript
interface ApifyConfig {
  hashtag: string;
  maxPosts: number;
  proxy: {
    useApifyProxy: boolean;
  };
  resultsLimit: number;
  onlyPostsWithLocation: boolean;
}
```

### BatchScrapingConfig

```typescript
interface BatchScrapingConfig {
  batches: Array<{
    category: string;
    hashtags: string[];
  }>;
  totalHashtags: number;
}
```

### InstagramPost

```typescript
interface InstagramPost {
  id?: number;
  instagram_id: string;
  project_id: number;
  source_type: string;
  hashtag: string;
  category: string;
  url?: string;
  caption?: string;
  likes_count?: number;
  view_count?: number;
  ownerUsername?: string;
  locationName?: string;
  created_at?: Date;
  updated_at?: Date;
}
```

### ScrapingResult

```typescript
interface ScrapingResult {
  category: string;
  processedHashtags: number;
  totalPosts: number;
}
```

### ScrapingReport

```typescript
interface ScrapingReport {
  projectId: number;
  categories: string[];
  totalHashtags: number;
  generatedAt: Date;
}
```

---

## 🔒 **Константы и настройки**

### Project ID

```typescript
private readonly projectId: number = 999;
```

- Изолированный Project ID для всех данных Meta Muse
- Обеспечивает отделение от других проектов в той же БД

### Apify Settings

```typescript
const APIFY_SETTINGS = {
  MAX_POSTS: 100,
  USE_PROXY: true,
  RESULTS_LIMIT: 100,
  LOCATION_FILTER: false,
};
```

### Source Type

```typescript
const SOURCE_TYPE = "instagram_hashtag";
```

- Идентификатор источника данных для фильтрации

---

## ⚠️ **Ошибки и исключения**

### Типичные ошибки:

1. **CategoryNotFoundError**

   ```typescript
   // Возникает при передаче несуществующей категории
   await strategy.runScrapingForCategory("nonexistent");
   ```

2. **DatabaseConnectionError**

   ```typescript
   // Возникает при проблемах с подключением к БД
   const strategy = new MetaMuseHashtagStrategy(invalidDbAdapter);
   ```

3. **ApifyConfigurationError**
   ```typescript
   // Возникает при неправильной конфигурации Apify
   strategy.createApifyConfig(""); // Пустой хэштег
   ```

### Обработка ошибок:

```typescript
try {
  const result = await strategy.runScrapingForCategory("basic");
  console.log("Успех:", result);
} catch (error) {
  console.error("Ошибка скрепинга:", error.message);
}
```

---

> 🕉️ _API документация покрывает все публичные методы и интерфейсы MetaMuseHashtagStrategy_
