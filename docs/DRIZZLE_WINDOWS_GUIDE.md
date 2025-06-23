# 🪟 Drizzle на Windows: Полное руководство

## 🚨 Основные проблемы и решения

### **Проблема 1: CompressionStream is not defined**

**Симптомы:**
```bash
error: Can't find variable: CompressionStream
ReferenceError: CompressionStream is not defined
```

**Причина:** Bun не полностью поддерживает Web API `CompressionStream`, который используется в Drizzle Studio версии 0.28+

**✅ Решения:**

#### **Способ 1: Использовать Node.js вместо Bun**
```bash
# Вместо
bun run db:studio

# Используйте
npm run db:studio-launcher
npm run db:studio-windows
npm run db:studio-safe
```

#### **Способ 2: Откатиться к совместимой версии**
```bash
bun remove drizzle-kit
bun add drizzle-kit@0.21.1 -D
```

#### **Способ 3: Использовать пользовательский лаунчер**
```bash
node scripts/run-drizzle-studio.js
```

---

### **Проблема 2: async_hooks.createHook не реализован**

**Симптомы:**
```bash
[bun] Warning: async_hooks.createHook is not implemented in Bun
```

**Решение:** Это предупреждение, не критическая ошибка. Можно игнорировать или использовать Node.js.

---

### **Проблема 3: Drizzle Kit exit code 1**

**Симптомы:**
```bash
error: script "db:studio" exited with code 1
```

**Решения:**
1. Проверить переменные окружения в `.env.development`
2. Убедиться, что `DATABASE_URL` правильно установлена
3. Использовать Node.js версию команд

---

## 📋 Рекомендуемые команды для Windows

### **Запуск Drizzle Studio:**
```bash
# Основной способ (Node.js)
npm run db:studio-launcher

# Альтернативы
npm run db:studio-windows
npm run db:studio-safe
npx drizzle-kit studio --port 3457
```

### **Генерация миграций:**
```bash
# Через Node.js (рекомендуется)
npm run db:generate-node

# Через Bun (может не работать)
bun run db:generate
```

### **Push схемы:**
```bash
# Через Node.js
npm run db:push-node

# Прямой способ
npx drizzle-kit push
```

---

## 🛠️ Настройки для стабильной работы

### **package.json скрипты:**
```json
{
  "scripts": {
    "db:studio-launcher": "node scripts/run-drizzle-studio.js",
    "db:studio-windows": "dotenv -e .env.development -- npx drizzle-kit studio --port 3457", 
    "db:studio-safe": "npx drizzle-kit studio --port 3457",
    "db:generate-node": "dotenv -e .env.development -- node ./node_modules/.bin/drizzle-kit generate",
    "db:push-node": "dotenv -e .env.development -- node --import=tsx ./node_modules/.bin/drizzle-kit push"
  }
}
```

### **drizzle.config.ts для Windows:**
```typescript
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql', 
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Дополнительные настройки для Windows
  verbose: true,
  strict: true,
});
```

---

## 🔧 Диагностика проблем

### **Проверка соединения с БД:**
```bash
bun scripts/simple-db-viewer.ts
```

### **Проверка переменных окружения:**
```bash
node -e "require('dotenv').config({path:'.env.development'}); console.log('DATABASE_URL:', !!process.env.DATABASE_URL)"
```

### **Проверка версий:**
```bash
bunx drizzle-kit --version
bun --version
node --version
```

---

## ⚠️ Что НЕ работает на Windows с Bun

1. ❌ `bunx drizzle-kit studio` (CompressionStream issue)
2. ❌ `bun run db:studio` (async_hooks issue)  
3. ❌ Drizzle Kit версии 0.28+ с Bun
4. ❌ Параллельные запросы в Bun SQL (известная проблема)

## ✅ Что работает стабильно

1. ✅ `npx drizzle-kit studio`
2. ✅ `node scripts/run-drizzle-studio.js` 
3. ✅ Drizzle Kit 0.21.1 с Bun
4. ✅ Все ORM операции через Bun
5. ✅ Миграции через Node.js

---

## 🚀 Быстрый старт для Windows

```bash
# 1. Установить правильные версии
bun add drizzle-kit@0.21.1 -D

# 2. Настроить переменные окружения
cp .env.example .env.development

# 3. Запустить Drizzle Studio
npm run db:studio-launcher

# 4. Запустить бота
bun --bun src/bot.ts

# 5. Проверить базу данных
bun scripts/simple-db-viewer.ts
```

---

## 📚 Полезные ссылки

- [Drizzle GitHub Issues - CompressionStream](https://github.com/drizzle-team/drizzle-orm/issues/3880)
- [Bun GitHub Issues - Drizzle compatibility](https://github.com/oven-sh/bun/issues/7343)
- [Drizzle Documentation - Windows](https://orm.drizzle.team/docs/overview)

---

*Обновлено: $(date)* 