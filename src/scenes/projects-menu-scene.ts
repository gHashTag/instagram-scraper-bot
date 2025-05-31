import { Scenes, Markup } from "telegraf";
import { ScraperBotContext } from "../types";
import { logger } from "../utils/logger";
import { Project } from "../schemas";
import { LogType } from "../utils/logger";
import { меню } from "./components/projects-menu";

// Создаем обычную сцену (не wizard) для меню проектов
const projectsMenuScene = new Scenes.BaseScene<ScraperBotContext>(
  "projects_menu"
);

// Функция для генерации клавиатуры списка проектов
function generateProjectsMenuKeyboard(projects: Project[]) {
  const buttons = [];

  // Добавляем кнопки для каждого проекта с кнопкой удаления справа
  for (const project of projects) {
    buttons.push([
      Markup.button.callback(
        `📁 ${project.name}`,
        `select_project_${project.id}`
      ),
      Markup.button.callback("🗑️", `delete_project_${project.id}`),
    ]);
  }

  // Добавляем управляющие кнопки
  buttons.push([
    Markup.button.callback("➕ Создать новый проект", "create_new_project"),
  ]);

  buttons.push([
    Markup.button.callback("⬅️ Назад в главное меню", "back_to_main_menu"),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// Обработчик входа в сцену
projectsMenuScene.enter(async (ctx) => {
  console.log(
    "[USER_SCENARIO_DEBUG] >>> SCENE 'projects_menu': ENTER handler START"
  );
  if (!ctx.session) {
    console.error(
      "[USER_SCENARIO_DEBUG] SCENE 'projects_menu': ERROR - ctx.session is UNDEFINED on enter!"
    );
    await ctx.reply(
      "Произошла ошибка сессии при входе в меню проектов. Пожалуйста, попробуйте /start."
    );
    return ctx.scene.leave();
  }
  const userId = ctx.session.user?.id;

  if (!userId) {
    console.error(
      "[USER_SCENARIO_DEBUG] SCENE 'projects_menu': ERROR - User ID not found in session on enter!"
    );
    await ctx.reply(
      "Не удалось определить ваш ID. Пожалуйста, попробуйте /start."
    );
    return ctx.scene.leave();
  }
  console.log(
    `[USER_SCENARIO_DEBUG] SCENE 'projects_menu': User ID in session: ${userId}`
  );

  try {
    console.log(
      `[USER_SCENARIO_DEBUG] SCENE 'projects_menu': Attempting to get projects for user ID: ${userId}`
    );
    const projects = await ctx.storage.getProjectsByUserId(userId);
    console.log(
      `[USER_SCENARIO_DEBUG] SCENE 'projects_menu': Found ${projects.length} projects.`
    );

    if (projects.length === 0) {
      console.log(
        "[USER_SCENARIO_DEBUG] SCENE 'projects_menu': No projects found, showing 'no projects' message and create button."
      );
      await ctx.reply(
        "У вас пока нет проектов. Хотите создать новый?",
        Markup.inlineKeyboard([
          Markup.button.callback("➕ Создать новый проект", "create_project"),
          Markup.button.callback("Главное меню", "main_menu_leave"),
        ])
      );
    } else {
      console.log(
        "[USER_SCENARIO_DEBUG] SCENE 'projects_menu': Projects found, generating projects menu keyboard."
      );
      const keyboard = меню.generateProjectsMenuKeyboard(projects);
      await ctx.reply("Ваши проекты:", Markup.inlineKeyboard(keyboard));
      console.log(
        "[USER_SCENARIO_DEBUG] SCENE 'projects_menu': Projects menu keyboard sent."
      );
    }
  } catch (error) {
    logger.error(
      "Ошибка при получении проектов или отображении меню проектов:",
      error,
      { userId, type: "ERROR" } // Добавляем type: "ERROR"
    );
    console.error(
      "[USER_SCENARIO_DEBUG] SCENE 'projects_menu': ERROR while getting/displaying projects:",
      error
    );
    await ctx.reply(
      "Произошла ошибка при загрузке ваших проектов. Попробуйте еще раз."
    );
  }
  console.log(
    "[USER_SCENARIO_DEBUG] <<< SCENE 'projects_menu': ENTER handler END"
  );
});

// Обработчик выбора проекта
projectsMenuScene.action(/select_project_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Project ${projectId} selected`);

  try {
    await ctx.storage.initialize();
    const project = await ctx.storage.getProjectById(projectId);

    if (!project) {
      await ctx.reply("Проект не найден. Возможно, он был удален.");
      return;
    }

    // Получаем пользователя для установки контекста
    const user = await ctx.storage.getUserByTelegramId(ctx.from?.id || 0);
    if (!user) {
      await ctx.reply("Ошибка: пользователь не найден.");
      return;
    }

    // УСТАНАВЛИВАЕМ ГЛОБАЛЬНЫЙ КОНТЕКСТ ПРОЕКТА
    const userId = typeof user.id === "string" ? user.id : String(user.id);
    ctx.projectContext.set(projectId, project.name, userId);
    logger.info(
      `[ProjectsMenu] Установлен глобальный контекст проекта: ${project.name} (ID: ${projectId}) для пользователя ${ctx.from?.id}`
    );

    // Убираем нижнее меню и показываем меню проекта
    await ctx.reply(
      `📁 *Проект: ${project.name}* \\(выбран\\)\n\nВыберите действие:`,
      {
        parse_mode: "MarkdownV2",
        reply_markup: {
          remove_keyboard: true, // Убираем нижнее меню
          inline_keyboard: [
            [
              {
                text: "🏷️ Хештеги",
                callback_data: `manage_hashtags_${projectId}`,
              },
              {
                text: "🏢 Конкуренты",
                callback_data: `manage_competitors_${projectId}`,
              },
            ],
            [
              {
                text: "🎬 Рилсы",
                callback_data: `view_reels_${projectId}`,
              },
              {
                text: "📊 Аналитика",
                callback_data: `view_analytics_${projectId}`,
              },
            ],
            [
              {
                text: "🚀 Скрапинг",
                callback_data: `start_scraping_${projectId}`,
              },
              {
                text: "🔔 Уведомления",
                callback_data: `manage_notifications_${projectId}`,
              },
            ],
            [
              {
                text: "🤖 Чат-бот",
                callback_data: `manage_chatbot_${projectId}`,
              },
              {
                text: "📚 Коллекции",
                callback_data: `manage_collections_${projectId}`,
              },
            ],
            [
              {
                text: "⬅️ Назад к проектам",
                callback_data: "back_to_projects_list",
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    logger.error(`[ProjectsMenu] Error selecting project ${projectId}:`, {
      type: LogType.ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    await ctx.reply("Произошла ошибка при выборе проекта.");
  } finally {
    await ctx.storage.close();
  }
});

// Обработчик создания нового проекта
projectsMenuScene.action("create_new_project", async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  logger.info("[ProjectsMenu] Create new project button clicked");

  // Переходим в wizard сцену для создания проекта
  await ctx.scene.enter("project_wizard");
  // Wizard автоматически начнет с шага 1, логика перехода к созданию будет внутри wizard'а
});

// Обработчик удаления конкретного проекта
projectsMenuScene.action(/delete_project_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Delete project ${projectId} requested`);

  try {
    await ctx.storage.initialize();

    const project = await ctx.storage.getProjectById(projectId);
    if (!project) {
      await ctx.reply("Проект не найден.");
      return;
    }

    // Показываем подтверждение удаления
    await ctx.editMessageText(
      `🗑️ *Подтверждение удаления*\n\nВы действительно хотите удалить проект "${project.name}"?\n\n⚠️ Это действие нельзя отменить!`,
      {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Да, удалить",
              `confirm_delete_${projectId}`
            ),
            Markup.button.callback("❌ Отмена", "back_to_projects_list"),
          ],
        ]),
      }
    );
  } catch (error) {
    logger.error(
      `[ProjectsMenu] Error preparing delete for project ${projectId}:`,
      {
        type: LogType.ERROR,
        error: error instanceof Error ? error : new Error(String(error)),
      }
    );
    await ctx.reply("Произошла ошибка при подготовке удаления.");
  } finally {
    await ctx.storage.close();
  }
});

// Обработчик подтверждения удаления
projectsMenuScene.action(/confirm_delete_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Confirming delete project ${projectId}`);

  try {
    await ctx.storage.initialize();

    const project = await ctx.storage.getProjectById(projectId);
    if (!project) {
      await ctx.reply("Проект не найден.");
      return;
    }

    // Удаляем проект (нужно будет добавить метод в адаптер)
    await ctx.storage.deleteProject(projectId);

    await ctx.editMessageText(
      `✅ Проект "${project.name}" успешно удален.`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "⬅️ Назад к списку проектов",
            "back_to_projects_list"
          ),
        ],
      ])
    );

    logger.info(`[ProjectsMenu] Project ${projectId} deleted successfully`);
  } catch (error) {
    logger.error(`[ProjectsMenu] Error deleting project ${projectId}:`, {
      type: LogType.ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    await ctx.reply("Произошла ошибка при удалении проекта.");
  } finally {
    await ctx.storage.close();
  }
});

// Обработчик возврата к списку проектов
projectsMenuScene.action("back_to_projects_list", async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  logger.info("[ProjectsMenu] Back to projects list requested");

  // Перезагружаем сцену (вызываем enter заново)
  await ctx.scene.reenter();
});

// Обработчик возврата в главное меню
projectsMenuScene.action("back_to_main_menu", async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  logger.info("[ProjectsMenu] Back to main menu requested");

  // Выходим из сцены и показываем главное меню
  await ctx.scene.leave();

  const username =
    ctx.session?.user?.username || ctx.from?.first_name || "пользователь";
  const welcomeMessage = `Привет, ${username}! Чем могу помочь?`;

  // Убираем нижнее меню - отправляем сообщение без клавиатуры
  await ctx.reply(welcomeMessage, {
    reply_markup: { remove_keyboard: true },
  });
});

// Обработчики кнопок меню проекта
projectsMenuScene.action(/manage_hashtags_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Manage hashtags for project ${projectId}`);

  // Сохраняем projectId в сессии и переходим в hashtag_wizard
  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("hashtag_wizard");
});

projectsMenuScene.action(/manage_competitors_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Manage competitors for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("competitor_wizard");
});

projectsMenuScene.action(/view_reels_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] View reels for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("reels_wizard");
});

projectsMenuScene.action(/view_analytics_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] View analytics for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("analytics_wizard");
});

projectsMenuScene.action(/start_scraping_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Start scraping for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("scraping_wizard");
});

projectsMenuScene.action(/manage_notifications_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Manage notifications for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("notification_wizard");
});

projectsMenuScene.action(/manage_chatbot_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Manage chatbot for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("chatbot_wizard");
});

projectsMenuScene.action(/manage_collections_(\d+)/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[ProjectsMenu] Ошибка answerCbQuery:", error);
  }

  const projectId = parseInt(ctx.match[1]);
  logger.info(`[ProjectsMenu] Manage collections for project ${projectId}`);

  if (ctx.session) {
    ctx.session.selectedProjectId = projectId;
    ctx.session.currentProjectId = projectId;
  }

  await ctx.scene.enter("reels_collection_wizard");
});

export default projectsMenuScene;
