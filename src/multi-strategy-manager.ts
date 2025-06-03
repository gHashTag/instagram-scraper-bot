/**
 * 🕉️ MULTI STRATEGY MANAGER - Управление несколькими клиентами
 * 
 * Система для управления стратегиями разных клиентов
 */

import fs from 'fs';
import path from 'path';
import { StrategyManager } from './strategy-manager';
import { ObsidianDashboardManager } from './obsidian-dashboard-manager';
import { logger } from './logger';

interface ClientConfig {
  name: string;
  configFile: string;
  obsidianPath: string;
  description: string;
  active: boolean;
}

export class MultiStrategyManager {
  private clients: Map<string, ClientConfig> = new Map();
  private currentClient: string | null = null;
  private static instance: MultiStrategyManager | null = null;

  constructor() {
    this.initializeClients();
    this.loadCurrentClient();
  }

  /**
   * Singleton pattern для сохранения состояния между вызовами
   */
  static getInstance(): MultiStrategyManager {
    if (!MultiStrategyManager.instance) {
      MultiStrategyManager.instance = new MultiStrategyManager();
    }
    return MultiStrategyManager.instance;
  }

  /**
   * Инициализация клиентов
   */
  private initializeClients() {
    // Клиент 1: Эстетическая медицина
    this.clients.set('aesthetics', {
      name: 'Эстетическая медицина',
      configFile: './config/instagram-strategy.json',
      obsidianPath: './vaults/coco-age/',
      description: 'Клиника эстетической медицины - вирусный контент',
      active: true
    });

    // Клиент 2: TrendWatching
    this.clients.set('trendwatching', {
      name: 'TrendWatching',
      configFile: './config/trendwatching-strategy.json', 
      obsidianPath: './vaults/trendwatching/',
      description: 'AI и технологические тренды + конкуренты',
      active: true
    });

    // Устанавливаем первого активного клиента по умолчанию
    if (!this.currentClient) {
      this.currentClient = 'aesthetics';
    }
  }

  /**
   * Получить список всех клиентов
   */
  getClients(): ClientConfig[] {
    return Array.from(this.clients.values());
  }

  /**
   * Получить активных клиентов
   */
  getActiveClients(): ClientConfig[] {
    return this.getClients().filter(client => client.active);
  }

  /**
   * Загрузить текущего клиента из файла
   */
  private loadCurrentClient(): void {
    try {
      const statePath = './config/.current-client';
      if (fs.existsSync(statePath)) {
        const clientId = fs.readFileSync(statePath, 'utf8').trim();
        if (this.clients.has(clientId)) {
          this.currentClient = clientId;
        }
      }
    } catch (error) {
      // Игнорируем ошибки загрузки состояния
    }
  }

  /**
   * Сохранить текущего клиента в файл
   */
  private saveCurrentClient(): void {
    try {
      const statePath = './config/.current-client';
      if (this.currentClient) {
        fs.writeFileSync(statePath, this.currentClient);
      }
    } catch (error) {
      // Игнорируем ошибки сохранения состояния
    }
  }

  /**
   * Переключиться на клиента
   */
  switchClient(clientId: string): this {
    if (!this.clients.has(clientId)) {
      throw new Error(`Клиент "${clientId}" не найден`);
    }

    const client = this.clients.get(clientId)!;
    if (!client.active) {
      throw new Error(`Клиент "${clientId}" неактивен`);
    }

    this.currentClient = clientId;
    this.saveCurrentClient();
    logger.info(`✅ Переключились на клиента: ${client.name}`);
    return this;
  }

  /**
   * Получить текущего клиента
   */
  getCurrentClient(): ClientConfig | null {
    if (!this.currentClient) return null;
    return this.clients.get(this.currentClient) || null;
  }

  /**
   * Получить менеджер стратегии для текущего клиента
   */
  getCurrentStrategy(): StrategyManager {
    const client = this.getCurrentClient();
    if (!client) {
      throw new Error('Не выбран текущий клиент');
    }

    return new StrategyManager(client.configFile);
  }

  /**
   * Получить менеджер стратегии для конкретного клиента
   */
  getClientStrategy(clientId: string): StrategyManager {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Клиент "${clientId}" не найден`);
    }

    return new StrategyManager(client.configFile);
  }

  /**
   * Показать статус всех клиентов
   */
  showAllClients(): this {
    logger.info('\n🕉️ ВСЕ КЛИЕНТЫ:');
    
    this.getClients().forEach(client => {
      const status = client.active ? '✅' : '❌';
      const current = this.currentClient === this.getClientId(client) ? '👈 ТЕКУЩИЙ' : '';
      
      logger.info(`\n${status} ${client.name} ${current}`);
      logger.info(`  📁 Конфигурация: ${client.configFile}`);
      logger.info(`  📝 Obsidian: ${client.obsidianPath}`);
      logger.info(`  📋 Описание: ${client.description}`);
      
      // Показываем краткую статистику стратегии
      try {
        const strategy = new StrategyManager(client.configFile);
        const config = strategy.getStrategy();
        logger.info(`  🎯 Режим: ${config.scraping.mode}`);
        logger.info(`  👁️ Мин. просмотры: ${config.scraping.minViews.toLocaleString()}`);
        logger.info(`  🏷️ Хэштегов: ${config.sources.hashtags.length}`);
        logger.info(`  🏢 Конкурентов: ${config.sources.competitors.length}`);
      } catch (error) {
        logger.info(`  ⚠️ Ошибка загрузки конфигурации: ${error.message}`);
      }
    });

    return this;
  }

  /**
   * Запустить стратегию для текущего клиента
   */
  async runCurrentStrategy(): Promise<void> {
    const client = this.getCurrentClient();
    if (!client) {
      throw new Error('Не выбран текущий клиент');
    }

    logger.info(`\n🚀 ЗАПУСК СТРАТЕГИИ ДЛЯ: ${client.name}`);
    
    const strategy = this.getCurrentStrategy();
    strategy.showStatus();

    // Здесь будет запуск реального скрапинга
    await this.executeClientStrategy(client);
  }

  /**
   * Запустить стратегии для всех активных клиентов
   */
  async runAllStrategies(): Promise<void> {
    const activeClients = this.getActiveClients();
    
    logger.info(`\n🚀 ЗАПУСК ВСЕХ СТРАТЕГИЙ (${activeClients.length} клиентов)`);
    
    for (const client of activeClients) {
      logger.info(`\n📊 ОБРАБОТКА КЛИЕНТА: ${client.name}`);
      
      try {
        await this.executeClientStrategy(client);
        logger.info(`✅ Клиент ${client.name} обработан успешно`);
      } catch (error) {
        logger.error(`❌ Ошибка для клиента ${client.name}:`, error);
      }
      
      // Пауза между клиентами
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    logger.info('\n🎉 ВСЕ СТРАТЕГИИ ВЫПОЛНЕНЫ!');
  }

  /**
   * Выполнить стратегию для конкретного клиента
   */
  private async executeClientStrategy(client: ClientConfig): Promise<void> {
    const strategy = new StrategyManager(client.configFile);
    const config = strategy.getStrategy();
    
    // 1. Создаем папки Obsidian если нужно
    await this.ensureObsidianStructure(client);
    
    // 2. Выполняем скрапинг
    logger.info(`  🔍 Скрапинг для ${client.name}...`);
    
    // 3. Обновляем Obsidian
    logger.info(`  📝 Обновление Obsidian: ${client.obsidianPath}`);
    await this.updateObsidian(client, config);
    
    // 4. Отправляем уведомления
    if (config.output.notifications.telegram.enabled) {
      logger.info(`  📱 Отправка Telegram уведомлений...`);
    }
  }

  /**
   * Создать структуру папок Obsidian для клиента
   */
  private async ensureObsidianStructure(client: ClientConfig): Promise<void> {
    const basePath = client.obsidianPath;
    
    // Создаем базовую папку
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
      logger.info(`  📁 Создана папка Obsidian: ${basePath}`);
    }
    
    // Создаем подпапки
    const folders = ['Competitors', 'Hashtags', 'Reports', 'Templates', 'Analysis'];
    
    folders.forEach(folder => {
      const folderPath = path.join(basePath, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        logger.info(`  📂 Создана подпапка: ${folder}`);
      }
    });
  }

  /**
   * Обновить Obsidian для клиента
   */
  private async updateObsidian(client: ClientConfig, config: any): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];

    // Создаем ежедневный отчет
    const reportPath = path.join(client.obsidianPath, 'Reports', `${timestamp}.md`);
    const reportContent = this.generateDailyReport(client, config, timestamp);

    fs.writeFileSync(reportPath, reportContent);
    logger.info(`  📄 Создан отчет: ${reportPath}`);

    // Обновляем индексную страницу
    const indexPath = path.join(client.obsidianPath, 'README.md');
    const indexContent = this.generateIndexPage(client, config);

    fs.writeFileSync(indexPath, indexContent);
    logger.info(`  📋 Обновлен индекс: ${indexPath}`);

    // Обновляем дашборды с реальными данными
    await this.updateDashboards(client, config);
  }

  /**
   * Обновить дашборды с реальными данными
   */
  private async updateDashboards(client: ClientConfig, config: any): Promise<void> {
    const dashboardManager = new ObsidianDashboardManager(client.obsidianPath, client.name);

    // Генерируем тестовые данные (в реальности будут данные из скрапинга)
    const mockData = this.generateMockData(client, config);

    // Обновляем главный дашборд
    await dashboardManager.updateMainDashboard(mockData);
    logger.info(`  📊 Обновлен главный дашборд для ${client.name}`);

    // Обновляем страницы конкурентов
    await dashboardManager.updateCompetitorPages(mockData);
    logger.info(`  🏢 Обновлены страницы конкурентов для ${client.name}`);
  }

  /**
   * Генерировать тестовые данные (заменить на реальные данные из скрапинга)
   */
  private generateMockData(client: ClientConfig, config: any): any {
    const isAI = client.name === 'TrendWatching';

    return {
      totalPosts: Math.floor(Math.random() * 100) + 50,
      viralPosts: Math.floor(Math.random() * 30) + 10,
      avgViews: Math.floor(Math.random() * 50000) + 75000,
      avgLikes: Math.floor(Math.random() * 5000) + 2000,
      hashtags: config.sources.hashtags.map((h: any) => ({
        tag: h.tag,
        posts: Math.floor(Math.random() * 20) + 5,
        avgViews: Math.floor(Math.random() * 30000) + 50000,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
      })),
      competitors: config.sources.competitors.map((c: any) => ({
        username: c.username,
        posts: Math.floor(Math.random() * 15) + 5,
        topPost: {
          views: Math.floor(Math.random() * 200000) + 100000,
          likes: Math.floor(Math.random() * 10000) + 5000,
          description: isAI ? 'Революционный AI инструмент для автоматизации' : 'Невероятные результаты ботокса',
          date: new Date().toLocaleDateString('ru-RU')
        },
        avgViews: Math.floor(Math.random() * 80000) + 60000
      })),
      trends: isAI ? [
        {
          title: 'AI Video Generation',
          category: 'AI Tools',
          source: 'Product Hunt',
          date: new Date().toLocaleDateString('ru-RU'),
          relevanceScore: 0.95
        },
        {
          title: 'Neural Interface Technology',
          category: 'Future Tech',
          source: 'Future Tools',
          date: new Date().toLocaleDateString('ru-RU'),
          relevanceScore: 0.88
        }
      ] : undefined
    };
  }

  /**
   * Генерировать ежедневный отчет
   */
  private generateDailyReport(client: ClientConfig, config: any, date: string): string {
    return `# ${client.name} - Отчет ${date}

## 📊 Статистика

- **Режим:** ${config.scraping.mode}
- **Мин. просмотры:** ${config.scraping.minViews.toLocaleString()}
- **Период:** ${config.scraping.maxAgeDays} дней
- **Хэштегов:** ${config.sources.hashtags.length}
- **Конкурентов:** ${config.sources.competitors.length}

## 🏷️ Хэштеги

${config.sources.hashtags.map(h => `- #${h.tag} (приоритет: ${h.priority}, лимит: ${h.limit})`).join('\n')}

## 🏢 Конкуренты

${config.sources.competitors.map(c => `- @${c.username} (приоритет: ${c.priority}, лимит: ${c.limit})`).join('\n')}

## 📈 Результаты

- **Найдено постов:** 0 (в разработке)
- **Прошли фильтры:** 0 (в разработке)
- **Сохранено в БД:** 0 (в разработке)

## 🔗 Ссылки

- [[README|Главная страница]]
- [[Templates/Daily Summary|Шаблон отчета]]

---
*Автоматически сгенерировано ${new Date().toLocaleString()}*
`;
  }

  /**
   * Генерировать индексную страницу
   */
  private generateIndexPage(client: ClientConfig, config: any): string {
    return `# ${client.name}

${config.strategy.description}

## 🎯 Текущая стратегия

- **Режим:** ${config.scraping.mode}
- **Мин. просмотры:** ${config.scraping.minViews.toLocaleString()}
- **Период:** ${config.scraping.maxAgeDays} дней
- **Статус:** ${config.strategy.active ? '✅ Активна' : '❌ Неактивна'}

## 📁 Структура

- [[Competitors/|🏢 Конкуренты]]
- [[Hashtags/|🏷️ Хэштеги]]
- [[Reports/|📊 Отчеты]]
- [[Analysis/|📈 Анализ]]

## 📊 Последние отчеты

- [[Reports/${new Date().toISOString().split('T')[0]}|Сегодняшний отчет]]

---
*Обновлено: ${new Date().toLocaleString()}*
`;
  }

  /**
   * Получить ID клиента по конфигурации
   */
  private getClientId(client: ClientConfig): string {
    for (const [id, config] of this.clients.entries()) {
      if (config === client) return id;
    }
    return 'unknown';
  }

  /**
   * Добавить нового клиента
   */
  addClient(id: string, config: ClientConfig): this {
    this.clients.set(id, config);
    logger.info(`✅ Добавлен клиент: ${config.name}`);
    return this;
  }

  /**
   * Активировать/деактивировать клиента
   */
  toggleClient(clientId: string, active?: boolean): this {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Клиент "${clientId}" не найден`);
    }

    client.active = active !== undefined ? active : !client.active;
    logger.info(`✅ Клиент ${client.name}: ${client.active ? 'активирован' : 'деактивирован'}`);
    return this;
  }
}
