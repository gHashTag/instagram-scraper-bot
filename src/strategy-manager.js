/**
 * 🕉️ STRATEGY MANAGER - Единственный источник правды
 * 
 * Простое управление Instagram стратегией через JSON конфигурацию
 */

const fs = require('fs');
const path = require('path');

class StrategyManager {
  constructor(configPath = './config/instagram-strategy.json') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  /**
   * Загрузить конфигурацию из JSON
   */
  loadConfig() {
    try {
      const configFile = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(configFile);
    } catch (error) {
      throw new Error(`Ошибка загрузки конфигурации: ${error.message}`);
    }
  }

  /**
   * Сохранить конфигурацию в JSON
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('✅ Конфигурация сохранена');
    } catch (error) {
      throw new Error(`Ошибка сохранения конфигурации: ${error.message}`);
    }
  }

  /**
   * Получить текущую стратегию
   */
  getStrategy() {
    return this.config;
  }

  /**
   * Применить пресет
   */
  applyPreset(presetName) {
    if (!this.config.presets[presetName]) {
      throw new Error(`Пресет "${presetName}" не найден`);
    }

    const preset = this.config.presets[presetName];
    
    // Применяем настройки пресета
    this.config.scraping.mode = presetName;
    this.config.scraping.minViews = preset.minViews;
    this.config.scraping.maxAgeDays = preset.maxAgeDays;
    this.config.scraping.onlyRealViews = preset.onlyRealViews;

    console.log(`✅ Применен пресет: ${presetName} - ${preset.description}`);
    return this;
  }

  /**
   * Установить минимальные просмотры
   */
  setMinViews(views) {
    this.config.scraping.minViews = views;
    console.log(`✅ Минимальные просмотры: ${views}`);
    return this;
  }

  /**
   * Установить лимит результатов
   */
  setLimit(total, perSource = null) {
    this.config.scraping.totalLimit = total;
    if (perSource) {
      this.config.scraping.perSourceLimit = perSource;
    }
    console.log(`✅ Лимиты: ${total} общий, ${perSource || 'без изменений'} на источник`);
    return this;
  }

  /**
   * Добавить хэштег
   */
  addHashtag(tag, priority = 3, limit = 50) {
    const hashtag = {
      tag: tag.replace('#', ''),
      priority,
      limit
    };
    
    // Проверяем, есть ли уже такой хэштег
    const existingIndex = this.config.sources.hashtags.findIndex(h => h.tag === hashtag.tag);
    
    if (existingIndex >= 0) {
      this.config.sources.hashtags[existingIndex] = hashtag;
      console.log(`✅ Обновлен хэштег: #${hashtag.tag}`);
    } else {
      this.config.sources.hashtags.push(hashtag);
      console.log(`✅ Добавлен хэштег: #${hashtag.tag}`);
    }
    
    return this;
  }

  /**
   * Удалить хэштег
   */
  removeHashtag(tag) {
    const cleanTag = tag.replace('#', '');
    this.config.sources.hashtags = this.config.sources.hashtags.filter(h => h.tag !== cleanTag);
    console.log(`✅ Удален хэштег: #${cleanTag}`);
    return this;
  }

  /**
   * Добавить конкурента
   */
  addCompetitor(username, priority = 3, limit = 30, notes = '') {
    const competitor = {
      username: username.replace('@', ''),
      priority,
      limit,
      notes
    };
    
    // Проверяем, есть ли уже такой конкурент
    const existingIndex = this.config.sources.competitors.findIndex(c => c.username === competitor.username);
    
    if (existingIndex >= 0) {
      this.config.sources.competitors[existingIndex] = competitor;
      console.log(`✅ Обновлен конкурент: @${competitor.username}`);
    } else {
      this.config.sources.competitors.push(competitor);
      console.log(`✅ Добавлен конкурент: @${competitor.username}`);
    }
    
    return this;
  }

  /**
   * Удалить конкурента
   */
  removeCompetitor(username) {
    const cleanUsername = username.replace('@', '');
    this.config.sources.competitors = this.config.sources.competitors.filter(c => c.username !== cleanUsername);
    console.log(`✅ Удален конкурент: @${cleanUsername}`);
    return this;
  }

  /**
   * Включить/выключить экспорт в Excel
   */
  toggleExcel(enabled = null) {
    if (enabled === null) {
      this.config.output.excel.enabled = !this.config.output.excel.enabled;
    } else {
      this.config.output.excel.enabled = enabled;
    }
    
    console.log(`✅ Excel экспорт: ${this.config.output.excel.enabled ? 'включен' : 'выключен'}`);
    return this;
  }

  /**
   * Включить/выключить Obsidian синхронизацию
   */
  toggleObsidian(enabled = null) {
    if (enabled === null) {
      this.config.output.obsidian.enabled = !this.config.output.obsidian.enabled;
    } else {
      this.config.output.obsidian.enabled = enabled;
    }
    
    console.log(`✅ Obsidian синхронизация: ${this.config.output.obsidian.enabled ? 'включена' : 'выключена'}`);
    return this;
  }

  /**
   * Включить/выключить Telegram уведомления
   */
  toggleTelegram(enabled = null) {
    if (enabled === null) {
      this.config.output.notifications.telegram.enabled = !this.config.output.notifications.telegram.enabled;
    } else {
      this.config.output.notifications.telegram.enabled = enabled;
    }
    
    console.log(`✅ Telegram уведомления: ${this.config.output.notifications.telegram.enabled ? 'включены' : 'выключены'}`);
    return this;
  }

  /**
   * Получить список всех хэштегов
   */
  getHashtags() {
    return this.config.sources.hashtags.map(h => `#${h.tag} (приоритет: ${h.priority}, лимит: ${h.limit})`);
  }

  /**
   * Получить список всех конкурентов
   */
  getCompetitors() {
    return this.config.sources.competitors.map(c => `@${c.username} (приоритет: ${c.priority}, лимит: ${c.limit})`);
  }

  /**
   * Показать текущие настройки
   */
  showStatus() {
    console.log('\n🕉️ ТЕКУЩАЯ СТРАТЕГИЯ:');
    console.log(`📝 Название: ${this.config.strategy.name}`);
    console.log(`🎯 Режим: ${this.config.scraping.mode}`);
    console.log(`👁️ Мин. просмотры: ${this.config.scraping.minViews.toLocaleString()}`);
    console.log(`📅 Макс. возраст: ${this.config.scraping.maxAgeDays} дней`);
    console.log(`✅ Только реальные просмотры: ${this.config.scraping.onlyRealViews ? 'да' : 'нет'}`);
    console.log(`🔢 Лимиты: ${this.config.scraping.totalLimit} общий, ${this.config.scraping.perSourceLimit} на источник`);
    
    console.log('\n🏷️ ХЭШТЕГИ:');
    this.getHashtags().forEach(tag => console.log(`  ${tag}`));
    
    console.log('\n🏢 КОНКУРЕНТЫ:');
    this.getCompetitors().forEach(comp => console.log(`  ${comp}`));
    
    console.log('\n📊 ЭКСПОРТ:');
    console.log(`  📄 Excel: ${this.config.output.excel.enabled ? '✅' : '❌'}`);
    console.log(`  📝 Obsidian: ${this.config.output.obsidian.enabled ? '✅' : '❌'}`);
    console.log(`  📱 Telegram: ${this.config.output.notifications.telegram.enabled ? '✅' : '❌'}`);
    
    return this;
  }

  /**
   * Быстрая настройка для маркетолога
   */
  quickSetup(preset, hashtags = [], competitors = [], minViews = null) {
    console.log('\n🚀 БЫСТРАЯ НАСТРОЙКА СТРАТЕГИИ...');
    
    // Применяем пресет
    this.applyPreset(preset);
    
    // Очищаем старые источники
    this.config.sources.hashtags = [];
    this.config.sources.competitors = [];
    
    // Добавляем новые хэштеги
    hashtags.forEach(tag => this.addHashtag(tag));
    
    // Добавляем новых конкурентов
    competitors.forEach(comp => this.addCompetitor(comp));
    
    // Устанавливаем кастомные просмотры
    if (minViews) {
      this.setMinViews(minViews);
    }
    
    console.log('\n✅ БЫСТРАЯ НАСТРОЙКА ЗАВЕРШЕНА!');
    this.showStatus();
    
    return this;
  }
}

module.exports = StrategyManager;

// Пример использования для маркетолога:
if (require.main === module) {
  console.log('🕉️ ПРИМЕР ИСПОЛЬЗОВАНИЯ STRATEGY MANAGER\n');
  
  const strategy = new StrategyManager();
  
  // Быстрая настройка
  strategy
    .quickSetup(
      'viral',                                    // Пресет
      ['aestheticclinic', 'botox', 'antiaging'], // Хэштеги
      ['competitor1', 'competitor2'],             // Конкуренты
      75000                                       // Мин. просмотры
    )
    .toggleExcel(true)                           // Включить Excel
    .toggleObsidian(true)                        // Включить Obsidian
    .toggleTelegram(true)                        // Включить Telegram
    .saveConfig();                               // Сохранить
}
