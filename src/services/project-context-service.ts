/**
 * Сервис для управления глобальным контекстом выбранного проекта
 * Обеспечивает единое состояние проекта во всех сценах бота
 */

import { logger } from "../utils/logger";

interface ProjectContext {
  id: number;
  name: string;
  userId: string;
  selectedAt: Date;
}

interface UserProjectContext {
  [telegramId: number]: ProjectContext | null;
}

/**
 * Глобальный сервис управления контекстом проектов
 * Хранит информацию о выбранном проекте для каждого пользователя
 */
export class ProjectContextService {
  private static instance: ProjectContextService;
  private userContexts: UserProjectContext = {};

  private constructor() {
    logger.info("[ProjectContext] Инициализация сервиса контекста проектов");
  }

  /**
   * Получить единственный экземпляр сервиса (Singleton)
   */
  public static getInstance(): ProjectContextService {
    if (!ProjectContextService.instance) {
      ProjectContextService.instance = new ProjectContextService();
    }
    return ProjectContextService.instance;
  }

  /**
   * Установить выбранный проект для пользователя
   */
  public setSelectedProject(
    telegramId: number,
    projectId: number,
    projectName: string,
    userId: string
  ): void {
    this.userContexts[telegramId] = {
      id: projectId,
      name: projectName,
      userId,
      selectedAt: new Date(),
    };

    logger.info(
      `[ProjectContext] Установлен проект для пользователя ${telegramId}: ${projectName} (ID: ${projectId})`
    );
  }

  /**
   * Получить выбранный проект для пользователя
   */
  public getSelectedProject(telegramId: number): ProjectContext | null {
    const context = this.userContexts[telegramId];

    if (context && context !== null) {
      logger.debug(
        `[ProjectContext] Получен контекст для пользователя ${telegramId}: ${context.name} (ID: ${context.id})`
      );
      return context;
    } else {
      logger.debug(
        `[ProjectContext] Нет выбранного проекта для пользователя ${telegramId}`
      );
      return null;
    }
  }

  /**
   * Очистить выбранный проект для пользователя
   */
  public clearSelectedProject(telegramId: number): void {
    const previousContext = this.userContexts[telegramId];
    delete this.userContexts[telegramId];

    if (previousContext) {
      logger.info(
        `[ProjectContext] Очищен контекст проекта для пользователя ${telegramId}: ${previousContext.name}`
      );
    }
  }

  /**
   * Проверить, есть ли выбранный проект у пользователя
   */
  public hasSelectedProject(telegramId: number): boolean {
    return (
      this.userContexts[telegramId] !== undefined &&
      this.userContexts[telegramId] !== null
    );
  }

  /**
   * Получить ID выбранного проекта (удобный метод)
   */
  public getSelectedProjectId(telegramId: number): number | null {
    const context = this.userContexts[telegramId];
    return context ? context.id : null;
  }

  /**
   * Получить название выбранного проекта (удобный метод)
   */
  public getSelectedProjectName(telegramId: number): string | null {
    const context = this.userContexts[telegramId];
    return context ? context.name : null;
  }

  /**
   * Обновить название проекта (при переименовании)
   */
  public updateProjectName(telegramId: number, newName: string): boolean {
    const context = this.userContexts[telegramId];
    if (context) {
      const oldName = context.name;
      context.name = newName;
      logger.info(
        `[ProjectContext] Обновлено название проекта для пользователя ${telegramId}: ${oldName} -> ${newName}`
      );
      return true;
    }
    return false;
  }

  /**
   * Получить статистику активных контекстов
   */
  public getStats(): {
    totalUsers: number;
    activeContexts: number;
    contexts: Array<{
      telegramId: number;
      projectId: number;
      projectName: string;
      selectedAt: Date;
    }>;
  } {
    const contexts = Object.entries(this.userContexts).map(
      ([telegramId, context]) => ({
        telegramId: parseInt(telegramId),
        projectId: context!.id,
        projectName: context!.name,
        selectedAt: context!.selectedAt,
      })
    );

    return {
      totalUsers: Object.keys(this.userContexts).length,
      activeContexts: contexts.length,
      contexts,
    };
  }

  /**
   * Очистить устаревшие контексты (старше указанного времени)
   */
  public cleanupOldContexts(maxAgeHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [telegramId, context] of Object.entries(this.userContexts)) {
      if (context && context.selectedAt < cutoffTime) {
        delete this.userContexts[parseInt(telegramId)];
        cleanedCount++;
        logger.info(
          `[ProjectContext] Очищен устаревший контекст для пользователя ${telegramId}: ${context.name}`
        );
      }
    }

    if (cleanedCount > 0) {
      logger.info(
        `[ProjectContext] Очищено ${cleanedCount} устаревших контекстов (старше ${maxAgeHours} часов)`
      );
    }

    return cleanedCount;
  }
}

// Экспортируем единственный экземпляр для использования в приложении
export const projectContextService = ProjectContextService.getInstance();
