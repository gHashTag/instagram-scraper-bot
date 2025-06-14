import { Scenes, Markup } from "telegraf";
import type { ScraperBotContext } from "../types";
import { ScraperSceneStep } from "../types";
import { logger } from "../logger";
import { registerButtons } from "../utils/button-handler";

/**
 * Сцена для управления уведомлениями
 */
export const notificationScene = new Scenes.BaseScene<ScraperBotContext>(
  "instagram_scraper_notifications"
);

/**
 * Обработчик входа в сцену уведомлений
 */
export async function handleNotificationEnter(
  ctx: ScraperBotContext
): Promise<void> {
  logger.info("[NotificationScene] handleNotificationEnter triggered");

  // Проверяем, что пользователь определен
  if (!ctx.from) {
    await ctx.reply(
      "Не удалось определить пользователя. Попробуйте перезапустить бота командой /start."
    );
    return ctx.scene.leave();
  }

  try {
    await ctx.storage.initialize();

    // Получаем пользователя
    const user = await ctx.storage.getUserByTelegramId(ctx.from.id);

    if (!user) {
      await ctx.reply(
        "Вы не зарегистрированы. Пожалуйста, используйте /start для начала работы."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Получаем настройки уведомлений пользователя
    let settings = await ctx.storage.getNotificationSettings(user.id);

    // Если настройки не найдены, создаем настройки по умолчанию
    if (!settings) {
      settings = await ctx.storage.saveNotificationSettings({
        user_id: user.id,
        new_reels_enabled: true,
        trends_enabled: true,
        weekly_report_enabled: true,
        min_views_threshold: 1000,
        notification_time: "09:00",
        notification_days: [1, 2, 3, 4, 5, 6, 7],
      });
    }

    // Формируем сообщение с текущими настройками
    let message = `📢 *Настройки уведомлений*\n\n`;
    message += `🎬 Уведомления о новых Reels: ${settings.new_reels_enabled ? "✅ Включены" : "❌ Отключены"}\n`;
    message += `📈 Уведомления о трендах: ${settings.trends_enabled ? "✅ Включены" : "❌ Отключены"}\n`;
    message += `📊 Еженедельные отчеты: ${settings.weekly_report_enabled ? "✅ Включены" : "❌ Отключены"}\n\n`;
    message += `👁️ Минимальное количество просмотров для уведомлений: ${settings.min_views_threshold}\n`;
    message += `⏰ Время отправки уведомлений: ${settings.notification_time}\n`;
    message += `📅 Дни отправки уведомлений: ${formatDays(settings.notification_days)}\n\n`;
    message += `Выберите настройку, которую хотите изменить:`;

    // Создаем клавиатуру для управления настройками
    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `${settings.new_reels_enabled ? "🔕 Отключить" : "🔔 Включить"} уведомления о новых Reels`,
          `toggle_new_reels_${settings.new_reels_enabled ? "off" : "on"}`
        ),
      ],
      [
        Markup.button.callback(
          `${settings.trends_enabled ? "🔕 Отключить" : "🔔 Включить"} уведомления о трендах`,
          `toggle_trends_${settings.trends_enabled ? "off" : "on"}`
        ),
      ],
      [
        Markup.button.callback(
          `${settings.weekly_report_enabled ? "🔕 Отключить" : "🔔 Включить"} еженедельные отчеты`,
          `toggle_weekly_report_${settings.weekly_report_enabled ? "off" : "on"}`
        ),
      ],
      [
        Markup.button.callback(
          "👁️ Изменить порог просмотров",
          "change_views_threshold"
        ),
      ],
      [
        Markup.button.callback(
          "⏰ Изменить время уведомлений",
          "change_notification_time"
        ),
      ],
      [
        Markup.button.callback(
          "📅 Изменить дни уведомлений",
          "change_notification_days"
        ),
      ],
      [Markup.button.callback("🔙 Назад", "back_to_menu")],
    ]);

    // Отправляем сообщение с клавиатурой
    await ctx.reply(message, {
      parse_mode: "Markdown",
      ...keyboard,
    });

    // Устанавливаем шаг сцены
    ctx.scene.session.step = ScraperSceneStep.NOTIFICATION_SETTINGS;
  } catch (error) {
    logger.error(
      "[NotificationScene] Error in handleNotificationEnter:",
      error
    );
    await ctx.reply(
      "Произошла ошибка при загрузке настроек уведомлений. Попробуйте еще раз."
    );
  } finally {
    await ctx.storage.close();
  }
}

notificationScene.enter(handleNotificationEnter);

/**
 * Обработчик для включения/отключения уведомлений о новых Reels
 */
export async function handleToggleNewReelsAction(
  ctx: ScraperBotContext
): Promise<void> {
  logger.info("[NotificationScene] handleToggleNewReelsAction triggered");

  const match = ctx.match as unknown as RegExpExecArray;
  const action = match[1]; // "on" или "off"

  try {
    await ctx.storage.initialize();

    // Получаем пользователя
    const user = await ctx.storage.getUserByTelegramId(ctx.from?.id || 0);

    if (!user) {
      await ctx.reply(
        "Вы не зарегистрированы. Пожалуйста, используйте /start для начала работы."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Получаем настройки уведомлений пользователя
    const settings = await ctx.storage.getNotificationSettings(user.id);

    if (!settings) {
      await ctx.reply(
        "Настройки уведомлений не найдены. Попробуйте перезапустить бота командой /start."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Обновляем настройки
    await ctx.storage.updateNotificationSettings(user.id, {
      new_reels_enabled: action === "on",
    });

    // Отвечаем на callback query
    await ctx.answerCbQuery(
      `Уведомления о новых Reels ${action === "on" ? "включены" : "отключены"}`
    );

    // Возвращаемся к настройкам уведомлений
    await handleNotificationEnter(ctx);
  } catch (error) {
    logger.error(
      "[NotificationScene] Error in handleToggleNewReelsAction:",
      error
    );
    await ctx.reply(
      "Произошла ошибка при обновлении настроек уведомлений. Попробуйте еще раз."
    );
  } finally {
    await ctx.storage.close();
  }
}

/**
 * Обработчик для включения/отключения уведомлений о трендах
 */
export async function handleToggleTrendsAction(
  ctx: ScraperBotContext
): Promise<void> {
  logger.info("[NotificationScene] handleToggleTrendsAction triggered");

  const match = ctx.match as unknown as RegExpExecArray;
  const action = match[1]; // "on" или "off"

  try {
    await ctx.storage.initialize();

    // Получаем пользователя
    const user = await ctx.storage.getUserByTelegramId(ctx.from?.id || 0);

    if (!user) {
      await ctx.reply(
        "Вы не зарегистрированы. Пожалуйста, используйте /start для начала работы."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Получаем настройки уведомлений пользователя
    const settings = await ctx.storage.getNotificationSettings(user.id);

    if (!settings) {
      await ctx.reply(
        "Настройки уведомлений не найдены. Попробуйте перезапустить бота командой /start."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Обновляем настройки
    await ctx.storage.updateNotificationSettings(user.id, {
      trends_enabled: action === "on",
    });

    // Отвечаем на callback query
    await ctx.answerCbQuery(
      `Уведомления о трендах ${action === "on" ? "включены" : "отключены"}`
    );

    // Возвращаемся к настройкам уведомлений
    await handleNotificationEnter(ctx);
  } catch (error) {
    logger.error(
      "[NotificationScene] Error in handleToggleTrendsAction:",
      error
    );
    await ctx.reply(
      "Произошла ошибка при обновлении настроек уведомлений. Попробуйте еще раз."
    );
  } finally {
    await ctx.storage.close();
  }
}

/**
 * Обработчик для включения/отключения еженедельных отчетов
 */
export async function handleToggleWeeklyReportAction(
  ctx: ScraperBotContext
): Promise<void> {
  logger.info("[NotificationScene] handleToggleWeeklyReportAction triggered");

  const match = ctx.match as unknown as RegExpExecArray;
  const action = match[1]; // "on" или "off"

  try {
    await ctx.storage.initialize();

    // Получаем пользователя
    const user = await ctx.storage.getUserByTelegramId(ctx.from?.id || 0);

    if (!user) {
      await ctx.reply(
        "Вы не зарегистрированы. Пожалуйста, используйте /start для начала работы."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Получаем настройки уведомлений пользователя
    const settings = await ctx.storage.getNotificationSettings(user.id);

    if (!settings) {
      await ctx.reply(
        "Настройки уведомлений не найдены. Попробуйте перезапустить бота командой /start."
      );
      await ctx.storage.close();
      return ctx.scene.leave();
    }

    // Обновляем настройки
    await ctx.storage.updateNotificationSettings(user.id, {
      weekly_report_enabled: action === "on",
    });

    // Отвечаем на callback query
    await ctx.answerCbQuery(
      `Еженедельные отчеты ${action === "on" ? "включены" : "отключены"}`
    );

    // Возвращаемся к настройкам уведомлений
    await handleNotificationEnter(ctx);
  } catch (error) {
    logger.error(
      "[NotificationScene] Error in handleToggleWeeklyReportAction:",
      error
    );
    await ctx.reply(
      "Произошла ошибка при обновлении настроек уведомлений. Попробуйте еще раз."
    );
  } finally {
    await ctx.storage.close();
  }
}

/**
 * Обработчик для возврата в главное меню
 */
export async function handleBackToMenuAction(
  ctx: ScraperBotContext
): Promise<void> {
  logger.info("[NotificationScene] handleBackToMenuAction triggered");

  // Отвечаем на callback query
  await ctx.answerCbQuery();

  // Выходим из сцены
  await ctx.scene.leave();

  // Отправляем сообщение с главным меню
  await ctx.reply("Вы вернулись в главное меню. Выберите действие:", {
    reply_markup: {
      keyboard: [
        ["📊 Проекты", "🔍 Конкуренты"],
        ["#️⃣ Хэштеги", "🎬 Запустить скрапинг"],
        ["👀 Просмотр Reels", "📈 Аналитика"],
        ["🔔 Уведомления", "ℹ️ Помощь"],
      ],
      resize_keyboard: true,
    },
  });
}

// Регистрация обработчиков кнопок с использованием централизованного обработчика
registerButtons(notificationScene, [
  {
    id: /toggle_new_reels_(on|off)/,
    handler: handleToggleNewReelsAction,
    errorMessage:
      "Произошла ошибка при изменении настроек уведомлений о новых Reels. Попробуйте еще раз.",
    verbose: true,
  },
  {
    id: /toggle_trends_(on|off)/,
    handler: handleToggleTrendsAction,
    errorMessage:
      "Произошла ошибка при изменении настроек уведомлений о трендах. Попробуйте еще раз.",
    verbose: true,
  },
  {
    id: /toggle_weekly_report_(on|off)/,
    handler: handleToggleWeeklyReportAction,
    errorMessage:
      "Произошла ошибка при изменении настроек еженедельных отчетов. Попробуйте еще раз.",
    verbose: true,
  },
  {
    id: "back_to_menu",
    handler: handleBackToMenuAction,
    errorMessage:
      "Произошла ошибка при возврате в главное меню. Попробуйте еще раз.",
    verbose: true,
  },
]);

/**
 * Форматирует дни недели для отображения
 * @param days Массив дней недели (1-7, где 1 - понедельник)
 * @returns Отформатированная строка с днями недели
 */
function formatDays(days: number[]): string {
  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  if (days.length === 7) {
    return "Ежедневно";
  }

  if (
    days.length === 5 &&
    days.includes(1) &&
    days.includes(2) &&
    days.includes(3) &&
    days.includes(4) &&
    days.includes(5)
  ) {
    return "По будням";
  }

  if (days.length === 2 && days.includes(6) && days.includes(7)) {
    return "По выходным";
  }

  return days.map((day) => dayNames[day - 1]).join(", ");
}
