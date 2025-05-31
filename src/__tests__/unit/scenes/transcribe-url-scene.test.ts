import { describe, it, expect, jest, mock, beforeEach, afterEach } from "bun:test";
import { TranscribeUrlScene } from "../../../scenes/transcribe-url-scene";
import { ScraperBotContext, ScraperSceneStep } from "../../../types";
import { MockedNeonAdapterType, createMockNeonAdapter } from "../../helpers/types";

// Мокируем зависимости
mock.module("../../../logger", () => {
  return {
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  };
});

// Мокируем NeonAdapter
mock.module("../../../adapters/neon-adapter", () => {
  return {
    NeonAdapter: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// Мокируем функции для работы с видео и аудио
mock.module("../../../utils/video-utils", () => {
  return {
    downloadVideo: jest.fn().mockResolvedValue("/path/to/video.mp4"),
    extractAudio: jest.fn().mockResolvedValue("/path/to/audio.mp3"),
  };
});

// Мокируем функцию транскрибации
mock.module("../../../utils/transcription-utils", () => {
  return {
    transcribeAudio: jest.fn().mockResolvedValue("Это тестовая транскрипция видео"),
  };
});

describe("TranscribeUrlScene", () => {
  // Определяем тип для тестового контекста
  type TestContext = Partial<ScraperBotContext> & {
    scene: {
      enter: jest.Mock;
      leave: jest.Mock;
      reenter: jest.Mock;
      session: {
        step?: ScraperSceneStep;
        transcriptionUrl?: string;
        transcriptionResult?: string;
        videoPath?: string;
      };
    };
    message?: {
      text?: string;
    };
    reply: jest.Mock;
    replyWithVideo: jest.Mock;
    replyWithMarkdown: jest.Mock;
    wizard: {
      next: jest.Mock;
      selectStep: jest.Mock;
    };
  };

  let ctx: TestContext;
  let scene: TranscribeUrlScene;
  let mockAdapter: MockedNeonAdapterType;
  let videoUtils: any;
  let transcriptionUtils: any;

  beforeEach(() => {
    // Создаем мок для контекста
    ctx = {
      scene: {
        enter: jest.fn(),
        leave: jest.fn(),
        reenter: jest.fn(),
        session: {},
      },
      reply: jest.fn().mockResolvedValue(undefined),
      replyWithVideo: jest.fn().mockResolvedValue(undefined),
      replyWithMarkdown: jest.fn().mockResolvedValue(undefined),
      wizard: {
        next: jest.fn(),
        selectStep: jest.fn(),
      },
    };

    // Создаем мок для адаптера
    mockAdapter = createMockNeonAdapter();

    // Получаем моки для видео и транскрипции
    videoUtils = require("../../../utils/video-utils");
    transcriptionUtils = require("../../../utils/transcription-utils");

    // Создаем экземпляр сцены
    scene = new TranscribeUrlScene(mockAdapter);

    // Сбрасываем все моки
    jest.clearAllMocks();
  });

  describe("enter", () => {
    it("should set step to ENTER_URL and show welcome message", async () => {
      // Вызываем метод enter
      await scene.enter(ctx as any);

      // Проверяем, что был установлен правильный шаг
      expect(ctx.scene.session.step).toBe(ScraperSceneStep.TRANSCRIBE_ENTER_URL);

      // Проверяем, что было отправлено приветственное сообщение
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Отправьте ссылку на Instagram Reel"),
        expect.anything()
      );
    });
  });

  describe("handleUrl", () => {
    beforeEach(() => {
      // Устанавливаем шаг ENTER_URL
      ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_ENTER_URL;
      // Устанавливаем текст сообщения
      ctx.message = { text: "https://www.instagram.com/reel/example" };
    });

    it("should validate Instagram Reel URL", async () => {
      // Вызываем обработчик URL
      await scene.handleUrl(ctx as any);

      // Проверяем, что URL был сохранен в сессии
      expect(ctx.scene.session.transcriptionUrl).toBe("https://www.instagram.com/reel/example");

      // Проверяем, что был установлен шаг PROCESSING
      expect(ctx.scene.session.step).toBe(ScraperSceneStep.TRANSCRIBE_PROCESSING);

      // Проверяем, что было отправлено сообщение о начале обработки
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Начинаю обработку видео"),
        expect.anything()
      );
    });

    it("should reject invalid URL", async () => {
      // Устанавливаем невалидный URL
      ctx.message = { text: "not a valid url" };

      // Вызываем обработчик URL
      await scene.handleUrl(ctx as any);

      // Проверяем, что URL не был сохранен в сессии
      expect(ctx.scene.session.transcriptionUrl).toBeUndefined();

      // Проверяем, что шаг не изменился
      expect(ctx.scene.session.step).toBe(ScraperSceneStep.TRANSCRIBE_ENTER_URL);

      // Проверяем, что было отправлено сообщение об ошибке
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Некорректная ссылка"),
        expect.anything()
      );
    });
  });

  describe("processVideo", () => {
    beforeEach(() => {
      // Устанавливаем шаг PROCESSING
      ctx.scene.session.step = ScraperSceneStep.TRANSCRIBE_PROCESSING;
      // Устанавливаем URL в сессии
      ctx.scene.session.transcriptionUrl = "https://www.instagram.com/reel/example";
    });

    it("should download video, extract audio and transcribe it", async () => {
      // Вызываем метод обработки видео
      await scene.processVideo(ctx as any);

      // Проверяем, что был вызван метод скачивания видео
      expect(videoUtils.downloadVideo).toHaveBeenCalledWith(
        "https://www.instagram.com/reel/example"
      );

      // Проверяем, что был вызван метод извлечения аудио
      expect(videoUtils.extractAudio).toHaveBeenCalledWith("/path/to/video.mp4");

      // Проверяем, что был вызван метод транскрибации
      expect(transcriptionUtils.transcribeAudio).toHaveBeenCalledWith("/path/to/audio.mp3");

      // Проверяем, что результат транскрибации был сохранен в сессии
      expect(ctx.scene.session.transcriptionResult).toBe("Это тестовая транскрипция видео");
      expect(ctx.scene.session.videoPath).toBe("/path/to/video.mp4");

      // Проверяем, что был установлен шаг RESULT
      expect(ctx.scene.session.step).toBe(ScraperSceneStep.TRANSCRIBE_RESULT);

      // Проверяем, что было отправлено видео
      expect(ctx.replyWithVideo).toHaveBeenCalledWith(
        { source: "/path/to/video.mp4" },
        expect.anything()
      );

      // Проверяем, что была отправлена транскрипция
      expect(ctx.replyWithMarkdown).toHaveBeenCalledWith(
        expect.stringContaining("Это тестовая транскрипция видео")
      );
    });

    it("should handle error during video processing", async () => {
      // Мокируем ошибку при скачивании видео
      videoUtils.downloadVideo.mockRejectedValueOnce(new Error("Download error"));

      // Вызываем метод обработки видео
      await scene.processVideo(ctx as any);

      // Проверяем, что был вызван метод скачивания видео
      expect(videoUtils.downloadVideo).toHaveBeenCalledWith(
        "https://www.instagram.com/reel/example"
      );

      // Проверяем, что не был вызван метод извлечения аудио
      expect(videoUtils.extractAudio).not.toHaveBeenCalled();

      // Проверяем, что не был вызван метод транскрибации
      expect(transcriptionUtils.transcribeAudio).not.toHaveBeenCalled();

      // Проверяем, что было отправлено сообщение об ошибке
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Ошибка при обработке видео"),
        expect.anything()
      );

      // Проверяем, что был установлен шаг ENTER_URL
      expect(ctx.scene.session.step).toBe(ScraperSceneStep.TRANSCRIBE_ENTER_URL);
    });
  });

  describe("leave", () => {
    it("should clear session data and show goodbye message", async () => {
      // Устанавливаем данные в сессии
      ctx.scene.session.transcriptionUrl = "https://www.instagram.com/reel/example";
      ctx.scene.session.transcriptionResult = "Это тестовая транскрипция видео";
      ctx.scene.session.videoPath = "/path/to/video.mp4";

      // Вызываем метод leave
      await scene.leave(ctx as any);

      // Проверяем, что данные сессии были очищены
      expect(ctx.scene.session.transcriptionUrl).toBeUndefined();
      expect(ctx.scene.session.transcriptionResult).toBeUndefined();
      expect(ctx.scene.session.videoPath).toBeUndefined();

      // Проверяем, что было отправлено прощальное сообщение
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Вы вышли из режима транскрибации"),
        expect.anything()
      );
    });
  });
});
