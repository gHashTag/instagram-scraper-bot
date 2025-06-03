# 🏷️ #{{hashtag_name}} - Анализ хэштега

> **{{hashtag_description}}** | Собрано постов: {{posts_count}}

---

## 📊 **СТАТИСТИКА ХЭШТЕГА**

| Метрика | Значение | Тренд |
|---------|----------|-------|
| 📥 Собрано постов | {{posts_count}} | {{posts_trend}} |
| 🔥 Лучший пост | {{max_views}} просмотров | {{views_trend}} |
| 📈 Средние просмотры | {{avg_views}} | {{avg_trend}} |
| 💬 Средние лайки | {{avg_likes}} | {{likes_trend}} |
| 📊 Engagement Rate | {{engagement_rate}}% | {{engagement_trend}} |

---

## 🎯 **АНАЛИЗ ЭФФЕКТИВНОСТИ**

### 📈 **Потенциал хэштега:**
- **Популярность:** {{popularity_level}}
- **Конкуренция:** {{competition_level}}
- **Целевая аудитория:** {{target_audience}}
- **Сезонность:** {{seasonality}}

### 💡 **Рекомендации по использованию:**
{{usage_recommendations}}

---

## 🔥 **ТОП КОНТЕНТ ПО ХЭШТЕГУ**

{{#each top_posts}}
### {{@index}}. {{views_count}} просмотров
- **Автор:** @{{author_username}}
- **Лайки:** {{likes_count}}
- **Комментарии:** {{comments_count}}
- **Дата:** {{published_date}}
- **Описание:** {{description}}
- **Engagement:** {{engagement_rate}}%
- **Ссылка:** [Открыть Reel]({{reel_url}})

{{/each}}

---

## 📝 **СВЯЗАННЫЕ ХЭШТЕГИ**

### 🎯 **Рекомендуемые комбинации:**
{{#each recommended_combinations}}
- {{combination}}
{{/each}}

### 🔍 **Альтернативные хэштеги:**
{{#each alternative_hashtags}}
- {{hashtag}}
{{/each}}

---

## 📊 **ВРЕМЕННЫЕ ПАТТЕРНЫ**

### 🕐 **Лучшее время публикации:**
{{best_posting_times}}

### 📅 **Сезонные тренды:**
{{seasonal_trends}}

---

## 🎨 **ВИЗУАЛЬНЫЕ ТРЕНДЫ**

### 📸 **Популярные форматы:**
{{popular_formats}}

### 🎬 **Эффективные стили:**
{{effective_styles}}

---

## 🔗 **НАВИГАЦИЯ**

- [[🥥✨ ГЛАВНЫЙ ДАШБОРД|🏠 Главный дашборд]]
- [[Analysis/hashtag-effectiveness|📊 Эффективность хэштегов]]
{{#each related_hashtags}}
- [[Hashtags/{{name}}|🏷️ #{{name}}]]
{{/each}}

---

**📅 Последнее обновление:** {{timestamp}}  
**🤖 Статус:** {{scraping_status}}
