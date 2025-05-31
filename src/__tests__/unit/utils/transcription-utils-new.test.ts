import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { transcribeAudio } from "../../../utils/transcription-utils";
import * as fs from "fs";
import OpenAI from "openai";

// Мокируем fs
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  createReadStream: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  statSync: jest.fn().mockReturnValue({ size: 1024 }),
}));

// Мокируем OpenAI
jest.mock("openai", () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: jest.fn().mockResolvedValue({ text: "Это тестовая транскрипция аудио" }),
        },
      },
    })),
  };
});

describe("Transcription Utils", () => {
  let mockFs: any;
  let mockOpenAI: any;
  let mockOpenAIInstance: any;

  beforeEach(() => {
    // Получаем моки
    mockFs = require("fs");
    mockOpenAI = require("openai").default;
    
    // Настраиваем моки
    mockFs.createReadStream.mockReturnValue("audio-stream");
    
    // Создаем экземпляр OpenAI
    mockOpenAIInstance = new mockOpenAI();
    mockOpenAIInstance.audio.transcriptions.create.mockResolvedValue({
      text: "Это тестовая транскрипция аудио",
    });
    
    // Сбрасываем все моки
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Очищаем моки
    jest.clearAllMocks();
  });

  describe("transcribeAudio", () => {
    it("should transcribe audio using OpenAI API", async () => {
      // Вызываем функцию
      const result = await transcribeAudio("/path/to/audio.mp3");

      // Проверяем, что был вызван метод createReadStream
      expect(mockFs.createReadStream).toHaveBeenCalledWith("/path/to/audio.mp3");

      // Проверяем результат
      expect(result).toBe("Это тестовая транскрипция аудио");
    });

    it("should handle error during transcription", async () => {
      // Мокируем ошибку при транскрибации
      mockOpenAIInstance.audio.transcriptions.create.mockRejectedValue(
        new Error("Transcription error")
      );

      // Проверяем, что функция выбрасывает ошибку
      await expect(transcribeAudio("/path/to/audio.mp3")).rejects.toThrow(
        "Ошибка при транскрибации аудио"
      );
    });

    it("should check if file exists", async () => {
      // Мокируем, что файл не существует
      mockFs.existsSync.mockReturnValue(false);

      // Проверяем, что функция выбрасывает ошибку
      await expect(transcribeAudio("/path/to/audio.mp3")).rejects.toThrow(
        "Аудиофайл не найден"
      );
    });

    it("should check file size", async () => {
      // Мокируем, что файл пустой
      mockFs.statSync.mockReturnValue({ size: 0 });

      // Проверяем, что функция выбрасывает ошибку
      await expect(transcribeAudio("/path/to/audio.mp3")).rejects.toThrow(
        "Аудиофайл пустой"
      );
    });
  });
});
