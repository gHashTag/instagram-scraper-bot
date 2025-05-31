/**
 * Wizard-сцена для транскрибации URL
 */

import { Telegraf } from "telegraf";
import { TranscribeUrlScene } from "./transcribe-url-scene";
import { ScraperBotContext, StorageAdapter } from "../types";

/**
 * Создает экземпляр Wizard-сцены для транскрибации URL
 * @param adapter Адаптер хранилища
 * @returns Экземпляр Wizard-сцены
 */
export function createTranscribeUrlWizardScene(adapter: StorageAdapter) {
  return new TranscribeUrlScene(adapter);
}

/**
 * Экземпляр сцены для транскрибации URL
 */
export const transcribeUrlScene = createTranscribeUrlWizardScene(null as any);

/**
 * Настраивает обработчики для Wizard-сцены транскрибации URL
 * @param bot Экземпляр бота
 */
export function setupTranscribeUrlWizard(bot: Telegraf<ScraperBotContext>) {
  // Обработчик для команды /transcribe
  bot.command("transcribe", (ctx) => {
    return ctx.scene.enter("transcribe_url_scene");
  });

  // Обработчик для кнопки "🎤 Транскрибировать видео"
  bot.hears("🎤 Транскрибировать видео", (ctx) => {
    return ctx.scene.enter("transcribe_url_scene");
  });
}
