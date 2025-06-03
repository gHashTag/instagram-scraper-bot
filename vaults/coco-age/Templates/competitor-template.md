# 🏢 @{{competitor_username}} - Анализ конкурента

> **{{competitor_description}}** | Собрано постов: {{posts_count}}

---

## 📊 **АКТУАЛЬНАЯ СТАТИСТИКА**

| Метрика | Значение | Тренд |
|---------|----------|-------|
| 📥 Собрано постов | {{posts_count}} | {{posts_trend}} |
| 🔥 Лучший пост | {{max_views}} просмотров | {{views_trend}} |
| 📈 Средние просмотры | {{avg_views}} | {{avg_trend}} |
| 💬 Лучшие лайки | {{max_likes}} | {{likes_trend}} |
| 📅 Последнее обновление | {{last_update}} | {{update_status}} |

---

## 🎬 **ТОП КОНТЕНТ ЗА НЕДЕЛЮ**

{{#each top_posts}}
### {{@index}}. {{views_count}} просмотров
- **Автор:** @{{author_username}}
- **Лайки:** {{likes_count}}
- **Комментарии:** {{comments_count}}
- **Дата:** {{published_date}}
- **Описание:** {{description}}
- **Ссылка:** [Открыть Reel]({{reel_url}})

{{/each}}

---

## 📝 **ЗАМЕТКИ О КОНКУРЕНТЕ**

### 🎯 **Специализация:**
{{competitor_specialization}}

### 💡 **Стратегия контента:**
{{content_strategy}}

### 🔍 **Что анализировать:**
{{analysis_points}}

---

## 📊 **МЕТРИКИ ЭФФЕКТИВНОСТИ**

### 📈 **Engagement Rate:** {{engagement_rate}}%
### 👁️ **Средние просмотры:** {{avg_views}}
### 💬 **Средние лайки:** {{avg_likes}}
### 📝 **Средние комментарии:** {{avg_comments}}

---

## 🎨 **ВИЗУАЛЬНЫЙ СТИЛЬ**

### 🎨 **Цветовая палитра:**
{{color_palette}}

### 📸 **Стиль съемки:**
{{photography_style}}

### 🎬 **Типы контента:**
{{content_types}}

---

## 🔗 **ССЫЛКИ И НАВИГАЦИЯ**

- [[🥥✨ ГЛАВНЫЙ ДАШБОРД|🏠 Главный дашборд]]
- [[Analysis/competitor-performance|📊 Сравнительный анализ]]
{{#each related_competitors}}
- [[Competitors/{{username}}|🏢 {{display_name}}]]
{{/each}}

---

**📅 Последнее обновление:** {{timestamp}}  
**🤖 Статус:** {{scraping_status}}
