import { Markup, Scenes } from "telegraf";
import {
  isValidInstagramUrl,
  extractUsernameFromUrl,
} from "../utils/validation";
import { logger } from "../logger";
import { ScraperBotContext } from "../types";

// Определяем типы для проектов и конкурентов
interface Project {
  id: number;
  name: string;
}

interface Competitor {
  id: number;
  username: string;
  instagram_url: string;
}

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
      `[CompetitorWizard] Clearing session state before leaving (reason: ${reason})`
    );
    // Очистка всех необходимых полей состояния
    ctx.scene.session.step = undefined;
    ctx.scene.session.currentProjectId = undefined;
    // Для Wizard-сцен
    if (ctx.wizard && ctx.wizard.state) {
      ctx.wizard.state = {};
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
  targetScene: string = "project_wizard",
  reason: string = "general"
): Promise<void> {
  try {
    logger.info(
      `[CompetitorWizard] Transitioning to ${targetScene} scene (reason: ${reason})`
    );
    await ctx.scene.enter(targetScene);
  } catch (error) {
    logger.error(
      `[CompetitorWizard] Error entering ${targetScene} scene:`,
      error
    );
    await ctx.scene.leave();
  }
}

// Создаем визард-сцену для управления конкурентами
logger.info("[CompetitorWizard] Создание визард-сцены competitor_wizard");
export const competitorWizardScene = new Scenes.WizardScene<ScraperBotContext>(
  "competitor_wizard",

  // Шаг 1: Проверка глобального контекста проекта
  async (ctx) => {
    console.log("[WIZARD] Шаг 1: Проверка глобального контекста проекта");

    try {
      // Проверяем, есть ли выбранный проект в глобальном контексте
      const selectedProject = ctx.projectContext.get();

      if (selectedProject) {
        console.log(
          `[DEBUG] Найден выбранный проект в глобальном контексте: ${selectedProject.name} (ID: ${selectedProject.id})`
        );

        // Устанавливаем данные проекта в состояние wizard'а
        ctx.wizard.state.projectId = selectedProject.id;
        ctx.wizard.state.projectName = selectedProject.name;

        // Переходим сразу к шагу 2 (список конкурентов)
        console.log(`[DEBUG] Переход к шагу 2 (список конкурентов)`);
        await ctx.wizard.next();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      }

      // Если проект не выбран, показываем сообщение и предлагаем выбрать
      console.log("[DEBUG] Проект не выбран в глобальном контексте");
      await ctx.reply(
        "⚠️ Для управления конкурентами необходимо выбрать проект.\n\n" +
          "Пожалуйста, перейдите в раздел '📊 Проекты' и выберите проект.",
        Markup.inlineKeyboard([
          [Markup.button.callback("📊 Перейти к проектам", "goto_projects")],
          [Markup.button.callback("❌ Выйти", "exit_wizard")],
        ])
      );
    } catch (error) {
      console.error("[ERROR] Ошибка при проверке контекста проекта:", error);
      await ctx.reply("Произошла ошибка. Пожалуйста, попробуйте позже.");
      return ctx.scene.leave();
    }
  },

  // Шаг 2: Отображение списка конкурентов и действий
  async (ctx) => {
    console.log(
      "[WIZARD] Шаг 2: Отображение списка конкурентов - НАЧАЛО ВЫПОЛНЕНИЯ"
    );

    // Проверяем, что ctx существует и содержит необходимые свойства
    if (!ctx) {
      console.error("[ERROR] Шаг 2: ctx отсутствует!");
      return;
    }

    if (!ctx.wizard) {
      console.error("[ERROR] Шаг 2: ctx.wizard отсутствует!");
      return;
    }

    if (!ctx.storage) {
      console.error("[ERROR] Шаг 2: ctx.storage отсутствует!");
      return;
    }

    console.log("[DEBUG] Контекст шага 2:", {
      from: ctx.from ? "Есть" : "Отсутствует",
      scene: ctx.scene ? "Есть" : "Отсутствует",
      wizard: ctx.wizard ? "Есть" : "Отсутствует",
      storage: ctx.storage ? "Есть" : "Отсутствует",
      wizardState: ctx.wizard && ctx.wizard.state ? "Есть" : "Отсутствует",
    });

    if (ctx.wizard && ctx.wizard.state) {
      console.log(
        "[DEBUG] Содержимое ctx.wizard.state:",
        JSON.stringify(ctx.wizard.state, null, 2)
      );
    }

    try {
      const { projectId, projectName } = ctx.wizard.state;
      console.log(
        `[DEBUG] Шаг 2: Получены данные из wizard.state: projectId=${projectId}, projectName=${projectName}`
      );

      if (!projectId) {
        await ctx.reply("Ошибка: не выбран проект. Начните сначала.");
        return ctx.scene.leave();
      }

      // Получаем список конкурентов для выбранного проекта
      console.log(
        `[DEBUG] Получение конкурентов для проекта с ID: ${projectId}`
      );

      try {
        // Проверяем, есть ли конкуренты в базе данных
        const competitorsCount = await ctx.storage.executeQuery(
          "SELECT COUNT(*) as count FROM competitors WHERE project_id = $1",
          [projectId]
        );
        console.log(
          `[DEBUG] Количество конкурентов в базе данных: ${competitorsCount.rows[0].count}`
        );

        if (parseInt(competitorsCount.rows[0].count) > 0) {
          // Получаем конкурентов напрямую из базы данных
          const competitorsData = await ctx.storage.executeQuery(
            "SELECT * FROM competitors WHERE project_id = $1",
            [projectId]
          );
          console.log(
            `[DEBUG] Получено конкурентов из базы данных: ${competitorsData.rows.length}`
          );

          if (competitorsData.rows.length > 0) {
            console.log(
              `[DEBUG] Первый конкурент из базы данных:`,
              competitorsData.rows[0]
            );

            // Преобразуем данные в формат Competitor
            const competitors = competitorsData.rows.map((row: any) => ({
              id: row.id,
              project_id: row.project_id,
              username: row.username,
              instagram_url: row.instagram_url || row.profile_url || "",
              created_at:
                row.created_at || row.added_at || new Date().toISOString(),
              is_active: row.is_active === undefined ? true : row.is_active,
            }));

            console.log(
              `[DEBUG] Преобразованные конкуренты:`,
              competitors.map((c: Competitor) => ({
                id: c.id,
                username: c.username,
              }))
            );
            ctx.wizard.state.competitors = competitors;
          } else {
            console.log(`[DEBUG] Конкуренты не найдены в базе данных`);
            ctx.wizard.state.competitors = [];
          }
        } else {
          console.log(`[DEBUG] Конкуренты не найдены в базе данных`);
          ctx.wizard.state.competitors = [];
        }
      } catch (error) {
        console.error(`[ERROR] Ошибка при получении конкурентов:`, error);

        // Пробуем получить конкурентов через стандартный метод
        console.log(
          `[DEBUG] Попытка получения конкурентов через стандартный метод`
        );
        const competitors =
          await ctx.storage.getCompetitorsByProjectId(projectId);
        console.log(
          `[DEBUG] Получено конкурентов через стандартный метод: ${competitors ? competitors.length : 0}`
        );
        if (competitors && competitors.length > 0) {
          console.log(
            `[DEBUG] Конкуренты:`,
            competitors.map((c: Competitor) => ({
              id: c.id,
              username: c.username,
            }))
          );
        }
        ctx.wizard.state.competitors = competitors;
      }

      // Формируем сообщение и кнопки
      let message = `🔍 Конкуренты для проекта "${projectName}":\n\n`;
      const competitors = ctx.wizard.state.competitors || [];

      if (!competitors || competitors.length === 0) {
        message += "В этом проекте нет добавленных конкурентов.";

        await ctx.reply(
          message,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                "➕ Добавить конкурента",
                "add_competitor"
              ),
            ],
            [Markup.button.callback("❌ Выйти", "exit_wizard")],
          ])
        );
      } else {
        // Создаем кнопки для каждого конкурента с кнопкой удаления справа (по аналогии с проектами)
        const competitorButtons = competitors.map(
          (competitor: Competitor, index: number) => {
            message += `${index + 1}. @${competitor.username} - ${competitor.instagram_url}\n`;

            return [
              Markup.button.callback(
                `👤 @${competitor.username}`,
                `view_competitor_${competitor.id}`
              ),
              Markup.button.callback(
                "🗑️",
                `delete_competitor_${projectId}_${competitor.username}`
              ),
            ];
          }
        );

        // Добавляем основные кнопки управления
        const controlButtons = [
          [Markup.button.callback("➕ Добавить конкурента", "add_competitor")],
          [Markup.button.callback("🔄 Обновить список", "refresh_competitors")],
          [Markup.button.callback("❌ Выйти", "exit_wizard")],
        ];

        // Объединяем все кнопки
        await ctx.reply(
          message,
          Markup.inlineKeyboard([...competitorButtons, ...controlButtons])
        );
      }
    } catch (error) {
      console.error(
        "[ERROR] Ошибка при отображении списка конкурентов:",
        error
      );
      await ctx.reply(
        "Произошла ошибка при загрузке списка конкурентов. Пожалуйста, попробуйте позже."
      );
      return ctx.scene.leave();
    }
  },

  // Шаг 3: Добавление конкурента
  async (ctx) => {
    console.log("[WIZARD] Шаг 3: Добавление конкурента");
    console.log("[DEBUG] Контекст шага 3:", {
      from: ctx.from,
      scene: ctx.scene ? "Есть" : "Отсутствует",
      wizard: ctx.wizard ? "Есть" : "Отсутствует",
      storage: ctx.storage ? "Есть" : "Отсутствует",
      wizardState: ctx.wizard ? ctx.wizard.state : "Отсутствует",
      message: ctx.message ? "Есть" : "Отсутствует",
      messageType: ctx.message ? typeof ctx.message : "Отсутствует",
      messageText:
        ctx.message && "text" in ctx.message ? ctx.message.text : "Отсутствует",
    });

    // Проверяем, что получили текстовое сообщение
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Пожалуйста, введите URL Instagram-аккаунта конкурента.");
      return;
    }

    const instagramUrl = ctx.message.text;
    const { projectId } = ctx.wizard.state;

    if (!projectId) {
      await ctx.reply("Ошибка: не указан проект. Начните сначала.");
      return ctx.scene.leave();
    }

    // Проверяем валидность URL
    if (!isValidInstagramUrl(instagramUrl)) {
      await ctx.reply(
        "Пожалуйста, введите корректный URL Instagram-аккаунта (например, https://www.instagram.com/example):"
      );
      return;
    }

    const username = extractUsernameFromUrl(instagramUrl);
    if (!username) {
      await ctx.reply(
        "Не удалось извлечь имя пользователя из URL. Пожалуйста, проверьте URL и попробуйте снова."
      );
      return;
    }

    try {
      // Добавляем конкурента
      const competitor = await ctx.storage.addCompetitorAccount(
        projectId,
        username,
        instagramUrl
      );

      if (competitor) {
        await ctx.reply(
          `Конкурент @${username} успешно добавлен!`,
          Markup.inlineKeyboard([
            [Markup.button.callback("Добавить еще", "add_more")],
            [Markup.button.callback("Вернуться к списку", "back_to_list")],
            [Markup.button.callback("Выйти", "exit_wizard")],
          ])
        );
      } else {
        await ctx.reply(
          `Не удалось добавить конкурента @${username}. Возможно, он уже добавлен или произошла ошибка базы данных.`,
          Markup.inlineKeyboard([
            [Markup.button.callback("Попробовать еще раз", "add_more")],
            [Markup.button.callback("Вернуться к списку", "back_to_list")],
            [Markup.button.callback("Выйти", "exit_wizard")],
          ])
        );
      }

      // Обработчики кнопок зарегистрированы на уровне сцены
    } catch (error) {
      console.error("[ERROR] Ошибка при добавлении конкурента:", error);
      await ctx.reply(
        "Произошла ошибка при добавлении конкурента. Пожалуйста, попробуйте позже.",
        Markup.inlineKeyboard([
          [Markup.button.callback("Попробовать еще раз", "add_more")],
          [Markup.button.callback("Вернуться к списку", "back_to_list")],
          [Markup.button.callback("Выйти", "exit_wizard")],
        ])
      );
    }
  }
);

// Регистрируем обработчики кнопок для сцены
// Обработчик для кнопок выбора проекта
// Динамически регистрируем обработчики для всех возможных ID проектов (от 1 до 100)
for (let i = 1; i <= 100; i++) {
  competitorWizardScene.action(`select_project_${i}`, async (ctx: any) => {
    console.log(`[DEBUG] Обработчик кнопки 'select_project_${i}' вызван`);
    ctx.wizard.state.projectId = i;

    // Получаем имя проекта из базы данных
    try {
      const project = await ctx.storage.getProjectById(i);
      if (project) {
        ctx.wizard.state.projectName = project.name;
      } else {
        ctx.wizard.state.projectName = `Проект ${i}`;
      }
    } catch (error) {
      console.error(`[ERROR] Ошибка при получении проекта с ID=${i}:`, error);
      ctx.wizard.state.projectName = `Проект ${i}`;
    }

    console.log(
      `[DEBUG] Установлены данные в wizard.state: projectId=${i}, projectName=${ctx.wizard.state.projectName}`
    );
    await ctx.answerCbQuery();
    console.log(`[DEBUG] Переход к следующему шагу (шаг 2)`);
    return ctx.wizard.next();
  });
}

competitorWizardScene.action("add_competitor", async (ctx: any) => {
  console.log(`[DEBUG] Обработчик кнопки 'add_competitor' вызван`);
  console.log(`[DEBUG] Контекст в обработчике add_competitor:`, {
    from: ctx.from,
    scene: ctx.scene ? "Есть" : "Отсутствует",
    wizard: ctx.wizard ? "Есть" : "Отсутствует",
    wizardState: ctx.wizard ? ctx.wizard.state : "Отсутствует",
  });

  await ctx.answerCbQuery();
  await ctx.reply(
    "Введите Instagram URL конкурента (например, https://www.instagram.com/example):"
  );
  console.log(`[DEBUG] Переход к следующему шагу (шаг 3)`);
  return ctx.wizard.next();
});

// Обработчик для кнопки просмотра конкурента
competitorWizardScene.action(/view_competitor_(\d+)/, async (ctx: any) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error("[DEBUG] Ошибка answerCbQuery:", error);
  }

  const competitorId = parseInt(ctx.match[1]);
  console.log(`[DEBUG] Просмотр конкурента с ID: ${competitorId}`);

  try {
    // Получаем информацию о конкуренте из состояния
    const competitors = ctx.wizard.state.competitors || [];
    const competitor = competitors.find(
      (c: Competitor) => c.id === competitorId
    );

    if (competitor) {
      await ctx.reply(
        `👤 *Конкурент: @${competitor.username}*\n\n` +
          `🔗 Instagram: ${competitor.instagram_url}\n` +
          `📅 Добавлен: ${new Date(competitor.created_at).toLocaleDateString("ru-RU")}\n` +
          `✅ Активен: ${competitor.is_active ? "Да" : "Нет"}`,
        {
          parse_mode: "MarkdownV2",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("⬅️ Назад к списку", "back_to_list")],
          ]),
        }
      );
    } else {
      await ctx.reply("Конкурент не найден.");
    }
  } catch (error) {
    console.error(
      `[ERROR] Ошибка при просмотре конкурента ${competitorId}:`,
      error
    );
    await ctx.reply("Произошла ошибка при получении информации о конкуренте.");
  }
});

competitorWizardScene.action("refresh_competitors", async (ctx: any) => {
  console.log(`[DEBUG] Обработчик кнопки 'refresh_competitors' вызван`);
  await ctx.answerCbQuery("Обновление списка...");

  // Очищаем список конкурентов в состоянии, чтобы он был обновлен при переходе на шаг 2
  if (ctx.wizard && ctx.wizard.state) {
    delete ctx.wizard.state.competitors;
    console.log(`[DEBUG] Очищен список конкурентов в состоянии`);
  }

  // Перезапускаем текущий шаг
  console.log(`[DEBUG] Переход к шагу 1 (список конкурентов) и его выполнение`);

  try {
    // Сначала отправляем сообщение о том, что список обновляется
    console.log(`[DEBUG] Отправка сообщения об обновлении списка`);
    await ctx.reply("Обновление списка конкурентов...");

    // Получаем список конкурентов напрямую из базы данных
    const projectId = ctx.wizard.state.projectId;
    console.log(`[DEBUG] Получение конкурентов для проекта с ID: ${projectId}`);

    console.log(`[DEBUG] Запрос количества конкурентов в базе данных`);
    const competitorsCount = await ctx.storage.executeQuery(
      "SELECT COUNT(*) as count FROM competitors WHERE project_id = $1",
      [projectId]
    );
    console.log(
      `[DEBUG] Количество конкурентов в базе данных: ${competitorsCount.rows[0].count}`
    );

    if (parseInt(competitorsCount.rows[0].count) > 0) {
      console.log(`[DEBUG] Запрос списка конкурентов из базы данных`);
      const competitorsData = await ctx.storage.executeQuery(
        "SELECT * FROM competitors WHERE project_id = $1",
        [projectId]
      );
      console.log(
        `[DEBUG] Получено конкурентов из базы данных: ${competitorsData.rows.length}`
      );

      if (competitorsData.rows.length > 0) {
        console.log(
          `[DEBUG] Первый конкурент из базы данных:`,
          competitorsData.rows[0]
        );

        // Преобразуем данные в формат Competitor
        console.log(`[DEBUG] Преобразование данных конкурентов`);
        const competitors = competitorsData.rows.map((row: any) => ({
          id: row.id,
          project_id: row.project_id,
          username: row.username,
          instagram_url: row.instagram_url || row.profile_url || "",
          created_at:
            row.created_at || row.added_at || new Date().toISOString(),
          is_active: row.is_active === undefined ? true : row.is_active,
        }));

        console.log(
          `[DEBUG] Преобразованные конкуренты:`,
          competitors.map((c: Competitor) => ({
            id: c.id,
            username: c.username,
          }))
        );
        console.log(
          `[DEBUG] Сохранение списка конкурентов в состоянии: ${competitors.length} конкурентов`
        );
        ctx.wizard.state.competitors = competitors;
      } else {
        console.log(
          `[DEBUG] Нет конкурентов в результате запроса, устанавливаем пустой массив`
        );
        ctx.wizard.state.competitors = [];
      }
    } else {
      console.log(
        `[DEBUG] Нет конкурентов в базе данных, устанавливаем пустой массив`
      );
      ctx.wizard.state.competitors = [];
    }

    // Вызываем шаг 2 напрямую
    console.log(`[DEBUG] Вызов selectStep(1)`);
    await ctx.wizard.selectStep(1);
    console.log(`[DEBUG] Вызов шага 1: ctx.wizard.steps[1](ctx)`);
    return ctx.wizard.steps[1](ctx);
  } catch (error) {
    console.error(`[ERROR] Ошибка при обновлении списка конкурентов:`, error);
    await ctx.reply(
      "Произошла ошибка при обновлении списка конкурентов. Попробуйте еще раз."
    );
    console.log(`[DEBUG] Возврат к списку конкурентов после ошибки`);
    return ctx.wizard.selectStep(1);
  }
});

competitorWizardScene.action("exit_wizard", async (ctx: any) => {
  logger.info(`[CompetitorWizard] Обработчик кнопки 'exit_wizard' вызван`);
  await ctx.answerCbQuery();
  await ctx.reply("Вы вышли из режима управления конкурентами.");

  // Очистка состояния и безопасный переход в другую сцену
  clearSessionState(ctx, "exit_wizard_clicked");
  await safeSceneTransition(ctx, "project_wizard", "exit_wizard_clicked");
});

competitorWizardScene.action("add_more", async (ctx: any) => {
  console.log(`[DEBUG] Обработчик кнопки 'add_more' вызван`);
  await ctx.answerCbQuery();
  await ctx.reply(
    "Введите Instagram URL конкурента (например, https://www.instagram.com/example):"
  );
  // Остаемся на текущем шаге
  return;
});

competitorWizardScene.action("back_to_list", async (ctx: any) => {
  console.log(`[DEBUG] Обработчик кнопки 'back_to_list' вызван`);
  await ctx.answerCbQuery("Возврат к списку...");

  // Очищаем список конкурентов в состоянии, чтобы он был обновлен при переходе на шаг 2
  if (ctx.wizard && ctx.wizard.state) {
    delete ctx.wizard.state.competitors;
    console.log(`[DEBUG] Очищен список конкурентов в состоянии`);
    console.log(
      `[DEBUG] Содержимое ctx.wizard.state:`,
      JSON.stringify(ctx.wizard.state)
    );
  } else {
    console.log(`[DEBUG] ctx.wizard.state отсутствует или null`);
  }

  // Возвращаемся к списку конкурентов
  console.log(`[DEBUG] Переход к шагу 1 (список конкурентов)`);

  try {
    // Получаем список конкурентов напрямую из базы данных
    const projectId = ctx.wizard.state.projectId;
    console.log(`[DEBUG] Получение конкурентов для проекта с ID: ${projectId}`);

    console.log(`[DEBUG] Запрос количества конкурентов в базе данных`);
    const competitorsCount = await ctx.storage.executeQuery(
      "SELECT COUNT(*) as count FROM competitors WHERE project_id = $1",
      [projectId]
    );
    console.log(
      `[DEBUG] Количество конкурентов в базе данных: ${competitorsCount.rows[0].count}`
    );

    if (parseInt(competitorsCount.rows[0].count) > 0) {
      console.log(`[DEBUG] Запрос списка конкурентов из базы данных`);
      const competitorsData = await ctx.storage.executeQuery(
        "SELECT * FROM competitors WHERE project_id = $1",
        [projectId]
      );
      console.log(
        `[DEBUG] Получено конкурентов из базы данных: ${competitorsData.rows.length}`
      );

      if (competitorsData.rows.length > 0) {
        console.log(
          `[DEBUG] Первый конкурент из базы данных:`,
          competitorsData.rows[0]
        );

        // Преобразуем данные в формат Competitor
        console.log(`[DEBUG] Преобразование данных конкурентов`);
        const competitors = competitorsData.rows.map((row: any) => ({
          id: row.id,
          project_id: row.project_id,
          username: row.username,
          instagram_url: row.instagram_url || row.profile_url || "",
          created_at:
            row.created_at || row.added_at || new Date().toISOString(),
          is_active: row.is_active === undefined ? true : row.is_active,
        }));

        console.log(
          `[DEBUG] Преобразованные конкуренты:`,
          competitors.map((c: Competitor) => ({
            id: c.id,
            username: c.username,
          }))
        );
        console.log(
          `[DEBUG] Сохранение списка конкурентов в состоянии: ${competitors.length} конкурентов`
        );
        ctx.wizard.state.competitors = competitors;
      } else {
        console.log(
          `[DEBUG] Нет конкурентов в результате запроса, устанавливаем пустой массив`
        );
        ctx.wizard.state.competitors = [];
      }
    } else {
      console.log(
        `[DEBUG] Нет конкурентов в базе данных, устанавливаем пустой массив`
      );
      ctx.wizard.state.competitors = [];
    }

    // Вызываем шаг 2 напрямую
    console.log(`[DEBUG] Вызов selectStep(1)`);
    await ctx.wizard.selectStep(1);
    console.log(`[DEBUG] Вызов шага 1: ctx.wizard.steps[1](ctx)`);
    console.log(`[DEBUG] Контекст шага 1:`, {
      from: ctx.from ? "Есть" : "Нет",
      scene: ctx.scene ? "Есть" : "Нет",
      wizard: ctx.wizard ? "Есть" : "Нет",
      storage: ctx.storage ? "Есть" : "Нет",
      wizardState: ctx.wizard && ctx.wizard.state ? "Есть" : "Нет",
    });
    console.log(
      `[DEBUG] Содержимое ctx.wizard.state:`,
      JSON.stringify(ctx.wizard.state)
    );
    return ctx.wizard.steps[1](ctx);
  } catch (error) {
    console.error(`[ERROR] Ошибка при возврате к списку конкурентов:`, error);
    await ctx.reply(
      "Произошла ошибка при возврате к списку конкурентов. Попробуйте еще раз."
    );
    console.log(`[DEBUG] Возврат к списку конкурентов после ошибки`);
    return ctx.wizard.selectStep(1);
  }
});

// Добавляем обработчик для удаления конкурентов
// Используем один обработчик с регулярным выражением для всех проектов
competitorWizardScene.action(
  /delete_competitor_(\d+)_(.+)/,
  async (ctx: any) => {
    console.log(`[DEBUG] Обработчик кнопки 'delete_competitor' вызван`);
    await ctx.answerCbQuery("Удаление конкурента...");

    const projectId = parseInt(ctx.match[1]);
    const username = ctx.match[2];
    console.log(
      `[DEBUG] Удаление конкурента: projectId=${projectId}, username=${username}`
    );

    try {
      // Удаляем конкурента
      console.log(
        `[DEBUG] Вызов метода deleteCompetitorAccount с параметрами: projectId=${projectId}, username=${username}`
      );
      const success = await ctx.storage.deleteCompetitorAccount(
        projectId,
        username
      );
      console.log(
        `[DEBUG] Результат удаления конкурента: ${success ? "успешно" : "неуспешно"}`
      );

      if (success) {
        console.log(`[DEBUG] Конкурент @${username} успешно удален`);
        await ctx.reply(`Конкурент @${username} успешно удален!`);
      } else {
        console.log(`[DEBUG] Не удалось удалить конкурента @${username}`);
        await ctx.reply(
          `Не удалось удалить конкурента @${username}. Возможно, он уже был удален.`
        );
      }

      // Очищаем список конкурентов в состоянии, чтобы он был обновлен при переходе на шаг 2
      if (ctx.wizard && ctx.wizard.state) {
        delete ctx.wizard.state.competitors;
        console.log(`[DEBUG] Очищен список конкурентов в состоянии`);
      }

      // Получаем список конкурентов напрямую из базы данных
      console.log(
        `[DEBUG] Запрос количества конкурентов в базе данных после удаления`
      );
      const competitorsCount = await ctx.storage.executeQuery(
        "SELECT COUNT(*) as count FROM competitors WHERE project_id = $1",
        [projectId]
      );
      console.log(
        `[DEBUG] Количество конкурентов в базе данных после удаления: ${competitorsCount.rows[0].count}`
      );

      if (parseInt(competitorsCount.rows[0].count) > 0) {
        console.log(
          `[DEBUG] Запрос списка конкурентов из базы данных после удаления`
        );
        const competitorsData = await ctx.storage.executeQuery(
          "SELECT * FROM competitors WHERE project_id = $1",
          [projectId]
        );
        console.log(
          `[DEBUG] Получено конкурентов из базы данных после удаления: ${competitorsData.rows.length}`
        );

        if (competitorsData.rows.length > 0) {
          console.log(`[DEBUG] Преобразование данных конкурентов`);
          // Преобразуем данные в формат Competitor
          const competitors = competitorsData.rows.map((row: any) => ({
            id: row.id,
            project_id: row.project_id,
            username: row.username,
            instagram_url: row.instagram_url || row.profile_url || "",
            created_at:
              row.created_at || row.added_at || new Date().toISOString(),
            is_active: row.is_active === undefined ? true : row.is_active,
          }));

          console.log(
            `[DEBUG] Сохранение списка конкурентов в состоянии: ${competitors.length} конкурентов`
          );
          ctx.wizard.state.competitors = competitors;
        } else {
          console.log(
            `[DEBUG] Нет конкурентов в результате запроса, устанавливаем пустой массив`
          );
          ctx.wizard.state.competitors = [];
        }
      } else {
        console.log(
          `[DEBUG] Нет конкурентов в базе данных, устанавливаем пустой массив`
        );
        ctx.wizard.state.competitors = [];
      }

      // Возвращаемся к списку конкурентов
      console.log(`[DEBUG] Возврат к списку конкурентов после удаления`);
      console.log(`[DEBUG] Вызов selectStep(1)`);
      await ctx.wizard.selectStep(1);
      console.log(`[DEBUG] Вызов шага 1: ctx.wizard.steps[1](ctx)`);
      return ctx.wizard.steps[1](ctx);
    } catch (error) {
      console.error(`[ERROR] Ошибка при удалении конкурента:`, error);
      await ctx.reply(
        "Произошла ошибка при удалении конкурента. Пожалуйста, попробуйте позже."
      );
      console.log(`[DEBUG] Возврат к списку конкурентов после ошибки`);
      return ctx.wizard.selectStep(1);
    }
  }
);

// Добавляем обработчик для команды /competitors
export function setupCompetitorWizard(bot: any) {
  bot.command("competitors", async (ctx: any) => {
    await ctx.scene.enter("competitor_wizard");
  });

  // Добавляем обработчик для кнопки "Конкуренты" в главном меню
  bot.hears("🔍 Конкуренты", async (ctx: any) => {
    console.log("[DEBUG] Обработчик кнопки '🔍 Конкуренты' вызван");
    await ctx.scene.enter("competitor_wizard");
  });
}

export default competitorWizardScene;
