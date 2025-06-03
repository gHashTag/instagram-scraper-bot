/**
 * 🔌 Instagram Scraper API Client для Obsidian
 * 
 * Подключается к облачному API и обновляет дашборды
 */

const API_BASE_URL = 'https://instagram-scraper-bot.vercel.app';

class InstagramScraperAPI {
    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // ===== COMPETITORS =====

    async getCompetitors() {
        return await this.request('/api/competitors');
    }

    async getCompetitorReels(competitorId, filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/api/competitors/${competitorId}/reels?${params}`);
    }

    async scrapeCompetitors(options = {}) {
        return await this.request('/api/scrape/competitors', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }

    // ===== HASHTAGS =====

    async getHashtags() {
        return await this.request('/api/hashtags');
    }

    async getHashtagReels(hashtag, filters = {}) {
        const params = new URLSearchParams(filters);
        return await this.request(`/api/hashtags/${hashtag}/reels?${params}`);
    }

    async scrapeHashtags(options = {}) {
        return await this.request('/api/scrape/hashtags', {
            method: 'POST',
            body: JSON.stringify(options)
        });
    }

    // ===== TRANSCRIPTION =====

    async transcribeVideo(videoUrl, language = 'auto') {
        return await this.request('/api/transcribe', {
            method: 'POST',
            body: JSON.stringify({ videoUrl, language })
        });
    }

    async transcribeReel(reelId, language = 'auto') {
        return await this.request('/api/transcribe', {
            method: 'POST',
            body: JSON.stringify({ reelId, language })
        });
    }

    // ===== HEALTH =====

    async getHealth() {
        return await this.request('/health');
    }

    async getAPIInfo() {
        return await this.request('/api');
    }
}

// ===== OBSIDIAN INTEGRATION =====

class ObsidianDashboardUpdater {
    constructor(api) {
        this.api = api;
    }

    async updateCompetitorsDashboard() {
        try {
            console.log('🔄 Updating competitors dashboard...');
            
            const response = await this.api.getCompetitors();
            const competitors = response.data;

            // Генерируем таблицу конкурентов
            let tableMarkdown = `| Конкурент | Постов | Лучший пост | Средние просмотры | Статус |\n`;
            tableMarkdown += `|-----------|--------|-------------|-------------------|--------|\n`;

            competitors.forEach(comp => {
                const stats = comp.stats || {};
                tableMarkdown += `| [[Competitors/${comp.username}\\|@${comp.username}]] | ${stats.total_reels || 0} | ${stats.max_views || 0} | ${stats.avg_views || 0} | ${comp.is_active ? '✅ Активен' : '❌ Неактивен'} |\n`;
            });

            console.log('✅ Competitors table generated:', tableMarkdown);
            return tableMarkdown;

        } catch (error) {
            console.error('❌ Failed to update competitors dashboard:', error);
            return `❌ Ошибка загрузки данных: ${error.message}`;
        }
    }

    async updateHashtagsDashboard() {
        try {
            console.log('🔄 Updating hashtags dashboard...');
            
            const response = await this.api.getHashtags();
            const hashtags = response.data;

            // Генерируем таблицу хэштегов
            let tableMarkdown = `| Хэштег | Постов | Лучший пост | Engagement Rate | Потенциал |\n`;
            tableMarkdown += `|--------|--------|-------------|-----------------|-----------|\n`;

            hashtags.forEach(tag => {
                const stats = tag.stats || {};
                const potential = stats.trending_score >= 8 ? '🔥 Очень высокий' : 
                                stats.trending_score >= 6 ? '📊 Высокий' : 
                                stats.trending_score >= 4 ? '📊 Средний' : '⚠️ Низкий';
                
                tableMarkdown += `| [[Hashtags/${tag.tag_name}\\|#${tag.tag_name}]] | ${stats.total_reels || 0} | ${stats.max_views || 0} | ${stats.engagement_rate || 0}% | ${potential} |\n`;
            });

            console.log('✅ Hashtags table generated:', tableMarkdown);
            return tableMarkdown;

        } catch (error) {
            console.error('❌ Failed to update hashtags dashboard:', error);
            return `❌ Ошибка загрузки данных: ${error.message}`;
        }
    }

    async updateViralContent() {
        try {
            console.log('🔄 Updating viral content...');
            
            // Получаем топ reels от первого конкурента для демо
            const competitorsResponse = await this.api.getCompetitors();
            if (competitorsResponse.data.length === 0) {
                return '❌ Нет данных о конкурентах';
            }

            const firstCompetitor = competitorsResponse.data[0];
            const reelsResponse = await this.api.getCompetitorReels(firstCompetitor.id, {
                minViews: 50000,
                limit: 5
            });

            let viralMarkdown = `## 🔥 ТОП ВИРУСНЫЕ REELS\n\n`;

            if (reelsResponse.data.length === 0) {
                viralMarkdown += `❌ Нет вирусного контента (50K+ просмотров)\n`;
            } else {
                reelsResponse.data.forEach((reel, index) => {
                    viralMarkdown += `### ${index + 1}. ${reel.views_count.toLocaleString()} просмотров\n`;
                    viralMarkdown += `- **Автор:** @${reel.author_username}\n`;
                    viralMarkdown += `- **Лайки:** ${reel.likes_count.toLocaleString()}\n`;
                    viralMarkdown += `- **Комментарии:** ${reel.comments_count.toLocaleString()}\n`;
                    viralMarkdown += `- **Дата:** ${new Date(reel.published_at).toLocaleDateString()}\n`;
                    viralMarkdown += `- **Описание:** ${reel.description || 'Нет описания'}\n`;
                    if (reel.transcription) {
                        viralMarkdown += `- **Транскрипция:** ${reel.transcription.substring(0, 100)}...\n`;
                    }
                    viralMarkdown += `- **Ссылка:** [Открыть Reel](${reel.reel_url})\n\n`;
                });
            }

            console.log('✅ Viral content generated');
            return viralMarkdown;

        } catch (error) {
            console.error('❌ Failed to update viral content:', error);
            return `❌ Ошибка загрузки вирусного контента: ${error.message}`;
        }
    }

    async generateFullDashboard() {
        console.log('🚀 Generating full dashboard...');
        
        const [competitorsTable, hashtagsTable, viralContent] = await Promise.all([
            this.updateCompetitorsDashboard(),
            this.updateHashtagsDashboard(),
            this.updateViralContent()
        ]);

        const dashboard = `# 🥥✨ ГЛАВНЫЙ ДАШБОРД

> **Автоматически обновлено:** ${new Date().toLocaleString()}

## 📊 **ОБЩАЯ СТАТИСТИКА**

| Метрика | Значение |
|---------|----------|
| 🏢 Конкуренты | Загружается... |
| 🏷️ Хэштеги | Загружается... |
| 🎬 Всего Reels | Загружается... |
| 🔥 Вирусный контент | Загружается... |

---

## 🏢 **КОНКУРЕНТЫ**

${competitorsTable}

---

## 🏷️ **ХЭШТЕГИ**

${hashtagsTable}

---

${viralContent}

---

## 🔗 **БЫСТРАЯ НАВИГАЦИЯ**

- [[Analysis/competitor-performance|📊 Анализ конкурентов]]
- [[Analysis/hashtag-effectiveness|📊 Эффективность хэштегов]]
- [[Reports/Проблемы скрапинга|🚨 Отчеты о проблемах]]

---

**📅 Последнее обновление:** ${new Date().toISOString()}  
**🤖 Источник:** Instagram Scraper API (${API_BASE_URL})`;

        return dashboard;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====

// Создаем экземпляры
const api = new InstagramScraperAPI();
const updater = new ObsidianDashboardUpdater(api);

// Экспортируем для использования в Obsidian
window.InstagramScraperAPI = InstagramScraperAPI;
window.ObsidianDashboardUpdater = ObsidianDashboardUpdater;
window.instagramAPI = api;
window.dashboardUpdater = updater;

// Функции для быстрого использования
window.updateDashboard = () => updater.generateFullDashboard();
window.updateCompetitors = () => updater.updateCompetitorsDashboard();
window.updateHashtags = () => updater.updateHashtagsDashboard();
window.updateViral = () => updater.updateViralContent();

console.log('🔌 Instagram Scraper API Client loaded!');
console.log('📋 Available functions: updateDashboard(), updateCompetitors(), updateHashtags(), updateViral()');
console.log('🌐 API Base URL:', API_BASE_URL);
