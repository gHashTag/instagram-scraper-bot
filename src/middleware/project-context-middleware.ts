/**
 * Middleware для автоматического внедрения контекста проекта
 * Добавляет информацию о выбранном проекте в контекст каждого запроса
 */

import { Context, MiddlewareFn } from "telegraf";
import { projectContextService } from "../services/project-context-service";
import { logger } from "../utils/logger";
import { ScraperBotContext } from "../types";

// Расширяем контекст Telegraf для включения информации о проекте
declare module "../types" {
  interface ScraperBotContext {
    // Информация о выбранном проекте
    selectedProject?: {
      id: number;
      name: string;
      userId: string;
      selectedAt: Date;
    } | null;

    // Удобные методы для работы с контекстом проекта
    projectContext: {
      get(): {
        id: number;
        name: string;
        userId: string;
        selectedAt: Date;
      } | null;
      set(projectId: number, projectName: string, userId: string): void;
      clear(): void;
      has(): boolean;
      getId(): number | null;
      getName(): string | null;
      requireProject(): {
        id: number;
        name: string;
        userId: string;
        selectedAt: Date;
      };
    };
  }
}

/**
 * Middleware для внедрения контекста проекта
 */
export const projectContextMiddleware: MiddlewareFn<ScraperBotContext> = (
  ctx,
  next
) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    logger.warn("[ProjectContextMiddleware] Нет Telegram ID пользователя");
    return next();
  }

  // Получаем выбранный проект для пользователя
  const selectedProject = projectContextService.getSelectedProject(telegramId);

  // Добавляем информацию о проекте в контекст
  ctx.selectedProject = selectedProject;

  // Добавляем удобные методы для работы с контекстом проекта
  ctx.projectContext = {
    /**
     * Получить информацию о выбранном проекте
     */
    get(): {
      id: number;
      name: string;
      userId: string;
      selectedAt: Date;
    } | null {
      return projectContextService.getSelectedProject(telegramId);
    },

    /**
     * Установить выбранный проект
     */
    set(projectId: number, projectName: string, userId: string): void {
      projectContextService.setSelectedProject(
        telegramId,
        projectId,
        projectName,
        userId
      );
      // Обновляем контекст для текущего запроса
      ctx.selectedProject =
        projectContextService.getSelectedProject(telegramId);
    },

    /**
     * Очистить выбранный проект
     */
    clear(): void {
      projectContextService.clearSelectedProject(telegramId);
      ctx.selectedProject = null;
    },

    /**
     * Проверить, есть ли выбранный проект
     */
    has(): boolean {
      return projectContextService.hasSelectedProject(telegramId);
    },

    /**
     * Получить ID выбранного проекта
     */
    getId(): number | null {
      return projectContextService.getSelectedProjectId(telegramId);
    },

    /**
     * Получить название выбранного проекта
     */
    getName(): string | null {
      return projectContextService.getSelectedProjectName(telegramId);
    },

    /**
     * Получить проект или выбросить ошибку, если проект не выбран
     * Используется в сценах, которые требуют обязательного выбора проекта
     */
    requireProject(): {
      id: number;
      name: string;
      userId: string;
      selectedAt: Date;
    } {
      const project = projectContextService.getSelectedProject(telegramId);
      if (!project) {
        throw new Error(
          "Проект не выбран. Пожалуйста, выберите проект в разделе 'Проекты'."
        );
      }
      return project;
    },
  };

  // Логируем информацию о контексте для отладки
  if (selectedProject) {
    logger.debug(
      `[ProjectContextMiddleware] Пользователь ${telegramId} работает с проектом: ${selectedProject.name} (ID: ${selectedProject.id})`
    );
  } else {
    logger.debug(
      `[ProjectContextMiddleware] Пользователь ${telegramId} не выбрал проект`
    );
  }

  return next();
};

/**
 * Middleware для проверки обязательного выбора проекта
 * Используется в сценах, которые требуют выбранного проекта
 */
export const requireProjectMiddleware: MiddlewareFn<ScraperBotContext> = async (
  ctx,
  next
) => {
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply("Ошибка: не удалось определить пользователя.");
    return;
  }

  const hasProject = projectContextService.hasSelectedProject(telegramId);

  if (!hasProject) {
    await ctx.reply(
      "⚠️ Для выполнения этого действия необходимо выбрать проект.\n\n" +
        "Пожалуйста, перейдите в раздел '📊 Проекты' и выберите проект.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Перейти к проектам", callback_data: "goto_projects" }],
          ],
        },
      }
    );
    return;
  }

  return next();
};

/**
 * Обработчик для кнопки "Перейти к проектам"
 */
export const handleGotoProjects = async (ctx: ScraperBotContext) => {
  try {
    await ctx.answerCbQuery();
    await ctx.scene.enter("projects_menu");
  } catch (error) {
    logger.error(
      "[ProjectContextMiddleware] Ошибка при переходе к проектам:",
      error
    );
    await ctx.reply(
      "Произошла ошибка при переходе к проектам. Попробуйте еще раз."
    );
  }
};
