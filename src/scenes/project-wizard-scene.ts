import { Scenes, Markup } from "telegraf";
import type { ScraperBotContext, Project } from "../types";
import {
  generateProjectsKeyboard,
  generateProjectMenuKeyboard,
} from "./components/project-keyboard";
import { isValidProjectName } from "../utils/validation";
import { logger } from "../logger";

/**
 * Очищает состояние сессии перед выходом из сцены
 * @param ctx Контекст Telegraf
 * @param reason Причина очистки состояния (для логирования)
 */
function clearSessionState(
  ctx: ScraperBotContext,
  reason: string = "general"
): void {
  if (ctx.scene.session) {
    logger.info(
      `[ProjectWizard] Clearing session state before leaving (reason: ${reason})`
    );
    // Очистка всех необходимых полей состояния
    ctx.scene.session.step = undefined;
    ctx.scene.session.currentProjectId = undefined;
    // Для Wizard-сцен - очищаем только нужные поля, не перезаписываем весь объект
    if (ctx.wizard && ctx.wizard.state) {
      delete (ctx.wizard.state as any).currentProjectId;
    }
  }
}

/**
 * Выполняет безопасный переход в другую сцену с обработкой ошибок
 * @param ctx Контекст Telegraf
 * @param targetScene Целевая сцена
 * @param reason Причина перехода (для логирования)
 */
async function safeSceneTransition(
  ctx: ScraperBotContext,
  targetScene: string = "instagram_scraper_projects",
  reason: string = "general"
): Promise<void> {
  try {
    logger.info(
      `[ProjectWizard] Transitioning to ${targetScene} scene (reason: ${reason})`
    );
    await ctx.scene.enter(targetScene);
  } catch (error) {
    logger.error(`[ProjectWizard] Error entering ${targetScene} scene:`, error);
    await ctx.scene.leave();
  }
}

// Обработчики кнопок
async function handleCreateProjectAction(ctx: ScraperBotContext) {
  console.log(`[DEBUG] Обработчик кнопки 'create_project' вызван`);
  logger.info(`[ProjectWizard] Обработчик кнопки 'create_project' вызван`);

  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО В САМОМ НАЧАЛЕ
  try {
    await ctx.answerCbQuery();
    console.log(`[DEBUG] answerCbQuery() выполнен успешно`);
  } catch (error) {
    console.error(`[ERROR] Ошибка answerCbQuery:`, error);
    // НЕ прерываем выполнение, продолжаем работу
  }

  try {
    console.log(`[DEBUG] Отправка сообщения пользователю`);
    await ctx.reply(
      "Введите название нового проекта (например, 'Клиника Аврора МСК'):",
      Markup.inlineKeyboard([
        Markup.button.callback("Отмена", "back_to_projects"),
      ])
    );
    console.log(`[DEBUG] ctx.reply() выполнен успешно`);

    // Переходим к шагу создания проекта
    console.log(`[DEBUG] Переход к следующему шагу (ctx.wizard.next())`);
    return ctx.wizard.next();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка в обработчике кнопки 'create_project':`,
      error
    );
    try {
      await ctx.reply(
        "Произошла ошибка при создании проекта. Пожалуйста, попробуйте позже."
      );
    } catch (replyError) {
      console.error(
        `[ERROR] Ошибка при отправке сообщения об ошибке:`,
        replyError
      );
    }
    return ctx.wizard.selectStep(0);
  }
}

async function handleExitSceneAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleExitSceneAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'exit_scene' вызван`);
  await ctx.reply("Вы вышли из меню проектов.");

  // Очистка состояния и выход из сцены
  clearSessionState(ctx, "exit_button_clicked");
  return ctx.scene.leave();
}

async function handleBackToProjectsAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleBackToProjectsAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'back_to_projects' вызван`);

  // Возвращаемся к списку проектов (шаг 1)
  return ctx.wizard.selectStep(0);
}

async function handleProjectSelectionAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleProjectSelectionAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'project_id' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn("[ProjectWizard] Invalid project ID from action match");
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  (ctx.wizard.state as any).currentProjectId = projectId;

  // Переходим к шагу меню проекта
  return ctx.wizard.selectStep(2);
}

async function handleManageHashtagsAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleManageHashtagsAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'manage_hashtags' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for hashtags from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;
  ctx.scene.session.projectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "manage_hashtags_clicked");
  await safeSceneTransition(ctx, "hashtag_wizard", "manage_hashtags_clicked");
  return;
}

async function handleScrapeProjectAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleScrapeProjectAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'scrape_project' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for scraping from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "scrape_project_clicked");
  await safeSceneTransition(ctx, "scraping_wizard", "scrape_project_clicked");
  return;
}

async function handleReelsListAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleReelsListAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'reels_list' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for reels from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "reels_list_clicked");
  await safeSceneTransition(ctx, "reels_wizard", "reels_list_clicked");
  return;
}

async function handleAnalyticsListAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleAnalyticsListAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'analytics_list' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for analytics from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "analytics_list_clicked");
  await safeSceneTransition(ctx, "analytics_wizard", "analytics_list_clicked");
  return;
}

async function handleCompetitorsProjectAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleCompetitorsProjectAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'competitors_project' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for competitors from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;
  ctx.scene.session.projectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "competitors_project_clicked");
  await safeSceneTransition(
    ctx,
    "competitor_wizard",
    "competitors_project_clicked"
  );
  return;
}

async function handleNotificationsProjectAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleNotificationsProjectAction:`,
      error
    );
  }

  logger.info(
    `[ProjectWizard] Обработчик кнопки 'notifications_project' вызван`
  );
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for notifications from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;
  ctx.scene.session.projectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "notifications_project_clicked");
  await safeSceneTransition(
    ctx,
    "notification_wizard",
    "notifications_project_clicked"
  );
  return;
}

async function handleChatbotProjectAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleChatbotProjectAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'chatbot_project' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for chatbot from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;
  ctx.scene.session.projectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "chatbot_project_clicked");
  await safeSceneTransition(ctx, "chatbot_wizard", "chatbot_project_clicked");
  return;
}

async function handleCollectionsProjectAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleCollectionsProjectAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'collections_project' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for collections from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  ctx.scene.session.currentProjectId = projectId;
  ctx.scene.session.projectId = projectId;

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "collections_project_clicked");
  await safeSceneTransition(
    ctx,
    "reels_collection_wizard",
    "collections_project_clicked"
  );
  return;
}

async function handleDeleteProjectAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleDeleteProjectAction:`,
      error
    );
  }

  logger.info(`[ProjectWizard] Обработчик кнопки 'delete_project' вызван`);
  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);

  if (isNaN(projectId)) {
    logger.warn(
      "[ProjectWizard] Invalid project ID for deletion from action match"
    );
    await ctx.reply("Ошибка: неверный ID проекта.");
    return ctx.wizard.selectStep(0);
  }

  try {
    await ctx.storage.initialize();

    const project = await ctx.storage.getProjectById(projectId);
    if (!project) {
      await ctx.reply("Проект не найден.");
      return ctx.wizard.selectStep(0);
    }

    // Показываем подтверждение удаления
    await ctx.editMessageText(
      `🗑️ **Подтверждение удаления**\n\nВы действительно хотите удалить проект "${project.name}"?\n\n⚠️ Это действие нельзя отменить!`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "✅ Да, удалить",
            `confirm_delete_${projectId}`
          ),
          Markup.button.callback("❌ Отмена", "back_to_projects"),
        ],
      ])
    );
  } catch (error) {
    logger.error(
      `[ProjectWizard] Error preparing delete for project ${projectId}:`,
      error
    );
    await ctx.reply("Произошла ошибка при подготовке удаления.");
    return ctx.wizard.selectStep(0);
  } finally {
    await ctx.storage.close();
  }

  // Возвращаем undefined для корректности типов
  return;
}

async function handleConfirmDeleteAction(ctx: ScraperBotContext) {
  // КРИТИЧЕСКИ ВАЖНО: Отвечаем на callback query МГНОВЕННО
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error(
      `[ERROR] Ошибка answerCbQuery в handleConfirmDeleteAction:`,
      error
    );
  }

  const match = ctx.match as RegExpExecArray;
  const projectId = parseInt(match[1], 10);
  logger.info(`[ProjectWizard] Confirming delete project ${projectId}`);

  try {
    await ctx.storage.initialize();

    const project = await ctx.storage.getProjectById(projectId);
    if (!project) {
      await ctx.reply("Проект не найден.");
      return ctx.wizard.selectStep(0);
    }

    // Удаляем проект
    await ctx.storage.deleteProject(projectId);

    await ctx.editMessageText(
      `✅ Проект "${project.name}" успешно удален.`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "⬅️ Назад к списку проектов",
            "back_to_projects"
          ),
        ],
      ])
    );

    logger.info(`[ProjectWizard] Project ${projectId} deleted successfully`);
  } catch (error) {
    logger.error(`[ProjectWizard] Error deleting project ${projectId}:`, error);
    await ctx.reply("Произошла ошибка при удалении проекта.");
  } finally {
    await ctx.storage.close();
  }

  // Возвращаем undefined для корректности типов
  return;
}

// Создаем wizard-сцену для управления проектами
logger.info("[ProjectWizard] Создание визард-сцены project_wizard");
export const projectWizardScene = new Scenes.WizardScene<ScraperBotContext>(
  "project_wizard",

  // Шаг 1: Отображение списка проектов
  async (ctx) => {
    logger.info(`[ProjectWizard] Шаг 1: Отображение списка проектов`);
    if (ctx.wizard) {
      logger.debug(
        `[ProjectWizard] Содержимое ctx.wizard.state:`,
        ctx.wizard.state
      );
    }

    // ПЕРВЫМ ДЕЛОМ проверяем параметры сцены
    const sceneState = (ctx.scene as any).state;
    logger.debug("[ProjectWizard] Scene state:", sceneState);

    if (sceneState && sceneState.currentProjectId) {
      logger.info(
        `[ProjectWizard] Found projectId in scene state: ${sceneState.currentProjectId}, going to step 3`
      );

      // Устанавливаем projectId в wizard state
      if (ctx.wizard) {
        (ctx.wizard.state as any).currentProjectId =
          sceneState.currentProjectId;
        return ctx.wizard.selectStep(2); // Переходим к шагу 3 (меню проекта)
      }
    }

    // Проверяем, есть ли projectId в wizard state (переданный через enter handler)
    const projectIdFromState = ctx.wizard
      ? (ctx.wizard.state as any).currentProjectId
      : undefined;
    if (projectIdFromState) {
      logger.info(
        `[ProjectWizard] Found projectId in wizard state: ${projectIdFromState}, transitioning to step 3`
      );
      return ctx.wizard.selectStep(2); // Переходим к шагу 3 (меню проекта)
    }

    if (!ctx.from) {
      logger.error("[ProjectWizard] ctx.from is undefined");
      await ctx.reply(
        "Не удалось определить пользователя. Попробуйте перезапустить бота командой /start."
      );
      clearSessionState(ctx, "missing_user");
      return ctx.scene.leave();
    }

    const telegramId = ctx.from.id;
    const username = ctx.from.username;
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name;

    try {
      await ctx.storage.initialize();
      logger.info(`[ProjectWizard] User ${telegramId} entered project scene.`);

      const user = await ctx.storage.saveUser({
        telegramId,
        username,
        firstName,
        lastName,
      });

      if (!user) {
        logger.error(
          `[ProjectWizard] Could not find or create user for telegram_id: ${telegramId}`
        );
        await ctx.reply(
          "Произошла ошибка при получении данных пользователя. Попробуйте позже."
        );
        clearSessionState(ctx, "user_not_found");
        return ctx.scene.leave();
      }

      logger.info(
        `[ProjectWizard] User found/created: ${user.id} (tg: ${telegramId})`
      );

      const projects: Project[] | null = await ctx.storage.getProjectsByUserId(
        user.id // Метод принимает string | number, поэтому передаем напрямую
      );

      if (!projects || projects.length === 0) {
        logger.info(`[ProjectWizard] No projects found for user ${user.id}`);
        await ctx.reply("*Управление проектами*\n\nВыберите действие:", {
          parse_mode: "MarkdownV2",
          ...generateProjectsKeyboard([]),
        });
      } else {
        logger.info(
          `[ProjectWizard] Found ${projects.length} projects for user ${user.id}`
        );
        await ctx.reply(
          `*Управление проектами*\n\nВаши проекты \\(${projects.length}\\):`,
          {
            parse_mode: "MarkdownV2",
            ...generateProjectsKeyboard(projects),
          }
        );
      }
    } catch (error) {
      logger.error("[ProjectWizard] Error in enter handler:", error);
      await ctx.reply(
        "Произошла ошибка при загрузке ваших проектов. Попробуйте еще раз."
      );
      clearSessionState(ctx, "error_loading_projects");
      return ctx.scene.leave();
    } finally {
      await ctx.storage.close();
    }

    // Остаемся на текущем шаге
    return;
  },

  // Шаг 2: Создание нового проекта
  async (ctx) => {
    logger.info(`[ProjectWizard] Шаг 2: Создание нового проекта`);
    if (ctx.wizard) {
      logger.debug(
        `[ProjectWizard] Содержимое ctx.wizard.state:`,
        ctx.wizard.state
      );
    }

    // Проверяем, есть ли текст сообщения
    if (ctx.message && "text" in ctx.message) {
      if (!ctx.from) {
        logger.error("[ProjectWizard] ctx.from is undefined");
        await ctx.reply(
          "Не удалось определить пользователя. Попробуйте /start."
        );
        clearSessionState(ctx, "missing_user_on_input");
        return ctx.scene.leave();
      }

      const telegramId = ctx.from.id;
      const projectName = ctx.message.text.trim();

      if (!isValidProjectName(projectName)) {
        await ctx.reply(
          "Название проекта должно быть от 3 до 100 символов. Пожалуйста, введите корректное название:"
        );
        return;
      }

      try {
        await ctx.storage.initialize();
        const user = await ctx.storage.getUserByTelegramId(telegramId);
        if (!user) {
          logger.error(
            `[ProjectWizard] User not found for telegram_id: ${telegramId} during project creation`
          );
          await ctx.reply(
            "Произошла ошибка: пользователь не найден. Попробуйте /start."
          );
          clearSessionState(ctx, "user_not_found_on_input");
          return ctx.scene.leave();
        }

        const newProject = await ctx.storage.createProject(
          String(user.id), // Метод createProject принимает только string (UUID)
          projectName
        );
        if (newProject) {
          logger.info(
            `[ProjectWizard] Project "${projectName}" created for user ${user.id}`
          );
          await ctx.reply(`Проект "${newProject.name}" успешно создан!`);
          if (ctx.wizard) {
            (ctx.wizard.state as any).currentProjectId = newProject.id;
            // Переходим к меню созданного проекта (шаг 3)
            return ctx.wizard.selectStep(2);
          }
        } else {
          logger.error(
            `[ProjectWizard] Failed to create project "${projectName}" for user ${user.id}`
          );
          await ctx.reply(
            "Не удалось создать проект. Попробуйте еще раз или обратитесь в поддержку."
          );
        }
      } catch (error) {
        logger.error(
          `[ProjectWizard] Error creating project "${projectName}":`,
          error
        );
        await ctx.reply("Произошла серьезная ошибка при создании проекта.");
        clearSessionState(ctx, "error_creating_project");
        return ctx.scene.leave();
      } finally {
        await ctx.storage.close();
      }
    } else {
      await ctx.reply("Пожалуйста, введите название нового проекта:");
    }

    // Остаемся на текущем шаге
    return;
  },

  // Шаг 3: Меню проекта
  async (ctx) => {
    logger.info(`[ProjectWizard] Шаг 3: Меню проекта`);
    if (ctx.wizard) {
      logger.debug(
        `[ProjectWizard] Содержимое ctx.wizard.state:`,
        ctx.wizard.state
      );
    }

    const projectId = ctx.wizard
      ? (ctx.wizard.state as any).currentProjectId
      : undefined;

    if (!projectId) {
      logger.error("[ProjectWizard] Project ID is undefined in step 3");
      logger.debug("[ProjectWizard] ctx.wizard:", ctx.wizard);
      logger.debug("[ProjectWizard] ctx.wizard.state:", ctx.wizard?.state);
      logger.debug("[ProjectWizard] ctx.session:", ctx.session);

      await ctx.reply(
        "⚠️ Ошибка: не удалось определить проект\\. Вернитесь к списку проектов\\.",
        {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([
            Markup.button.callback("⬅️ К списку проектов", "back_to_projects"),
          ]),
        }
      );
      if (ctx.wizard) {
        return ctx.wizard.selectStep(0);
      }
      return;
    }

    try {
      await ctx.storage.initialize();
      const project = await ctx.storage.getProjectById(projectId);

      if (project) {
        await ctx.reply(
          `Проект "${project.name}". Что вы хотите сделать?`,
          generateProjectMenuKeyboard(project.id)
        );
      } else {
        await ctx.reply("Проект не найден. Возможно, он был удален.");
        if (ctx.wizard) {
          return ctx.wizard.selectStep(0);
        }
      }
    } catch (error) {
      logger.error(`[ProjectWizard] Error loading project menu:`, error);
      await ctx.reply("Произошла ошибка при загрузке меню проекта.");
      if (ctx.wizard) {
        return ctx.wizard.selectStep(0);
      }
    } finally {
      await ctx.storage.close();
    }

    // Остаемся на текущем шаге
    return;
  }
);

// Регистрируем обработчики кнопок на уровне сцены (как в других wizard сценах)
projectWizardScene.action("create_project", handleCreateProjectAction);
projectWizardScene.action("exit_scene", handleExitSceneAction);
projectWizardScene.action("back_to_projects", handleBackToProjectsAction);
projectWizardScene.action(/project_(\d+)/, handleProjectSelectionAction);
projectWizardScene.action(/manage_hashtags_(\d+)/, handleManageHashtagsAction);
projectWizardScene.action(/scrape_project_(\d+)/, handleScrapeProjectAction);
projectWizardScene.action(/reels_list_(\d+)/, handleReelsListAction);
projectWizardScene.action(/analytics_list_(\d+)/, handleAnalyticsListAction);
projectWizardScene.action(
  /competitors_project_(\d+)/,
  handleCompetitorsProjectAction
);
projectWizardScene.action(
  /notifications_project_(\d+)/,
  handleNotificationsProjectAction
);
projectWizardScene.action(/chatbot_project_(\d+)/, handleChatbotProjectAction);
projectWizardScene.action(
  /collections_project_(\d+)/,
  handleCollectionsProjectAction
);
projectWizardScene.action(/delete_project_(\d+)/, handleDeleteProjectAction);
projectWizardScene.action(/confirm_delete_(\d+)/, handleConfirmDeleteAction);

// Добавляем обработчик для команды /projects
export function setupProjectWizard(bot: any) {
  bot.command("projects", async (ctx: any) => {
    logger.info("[ProjectWizard] Command /projects triggered");
    await ctx.scene.enter("project_wizard");
  });
}

export default projectWizardScene;
