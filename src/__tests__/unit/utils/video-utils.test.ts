import { describe, it, expect, jest, mock, beforeEach, afterEach } from "bun:test";
import { downloadVideo, extractAudio } from "../../../utils/video-utils";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

// Мокируем fs
mock.module("fs", () => {
  return {
    ...jest.requireActual("fs"),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    createWriteStream: jest.fn(),
    unlinkSync: jest.fn(),
  };
});

// Мокируем path
mock.module("path", () => {
  return {
    ...jest.requireActual("path"),
    join: jest.fn().mockImplementation((...args) => args.join("/")),
    dirname: jest.fn().mockImplementation((p) => p.split("/").slice(0, -1).join("/")),
  };
});

// Мокируем child_process
mock.module("child_process", () => {
  return {
    exec: jest.fn(),
  };
});

// Мокируем axios
mock.module("axios", () => {
  return {
    default: {
      get: jest.fn(),
    },
  };
});

// Мокируем yt-dlp
mock.module("../../../utils/yt-dlp", () => {
  return {
    downloadWithYtDlp: jest.fn(),
  };
});

describe("Video Utils", () => {
  let mockFs: any;
  let mockPath: any;
  let mockExec: jest.Mock;
  let mockAxios: any;
  let mockYtDlp: any;

  beforeEach(() => {
    // Получаем моки
    mockFs = require("fs");
    mockPath = require("path");
    mockExec = require("child_process").exec;
    mockAxios = require("axios").default;
    mockYtDlp = require("../../../utils/yt-dlp");

    // Настраиваем моки
    mockFs.existsSync.mockReturnValue(false);
    mockPath.join.mockImplementation((...args) => args.join("/"));
    mockExec.mockImplementation((cmd, callback) => {
      callback(null, { stdout: "success", stderr: "" });
      return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
    });
    mockAxios.get.mockResolvedValue({
      data: {
        pipe: jest.fn().mockImplementation((writer) => {
          writer.on.mock.calls.find(call => call[0] === "finish")[1]();
        }),
      },
      headers: {
        "content-type": "video/mp4",
      },
    });
    mockYtDlp.downloadWithYtDlp.mockResolvedValue("/path/to/video.mp4");

    // Мокируем createWriteStream
    mockFs.createWriteStream.mockReturnValue({
      on: jest.fn().mockImplementation(function(event, callback) {
        this[event] = callback;
        return this;
      }),
    });

    // Сбрасываем все моки
    jest.clearAllMocks();
  });

  describe("downloadVideo", () => {
    it("should download video using yt-dlp", async () => {
      // Вызываем функцию
      const result = await downloadVideo("https://www.instagram.com/reel/example");

      // Проверяем, что был вызван метод downloadWithYtDlp
      expect(mockYtDlp.downloadWithYtDlp).toHaveBeenCalledWith(
        "https://www.instagram.com/reel/example",
        expect.any(String)
      );

      // Проверяем результат
      expect(result).toBe("/path/to/video.mp4");
    });

    it("should return existing video if it already exists", async () => {
      // Мокируем существование файла
      mockFs.existsSync.mockReturnValue(true);

      // Вызываем функцию
      const result = await downloadVideo("https://www.instagram.com/reel/example");

      // Проверяем, что не был вызван метод downloadWithYtDlp
      expect(mockYtDlp.downloadWithYtDlp).not.toHaveBeenCalled();

      // Проверяем результат
      expect(result).toMatch(/\/temp\/videos\/.*\.mp4$/);
    });

    it("should handle error during download", async () => {
      // Мокируем ошибку при скачивании
      mockYtDlp.downloadWithYtDlp.mockRejectedValue(new Error("Download error"));

      // Проверяем, что функция выбрасывает ошибку
      await expect(downloadVideo("https://www.instagram.com/reel/example")).rejects.toThrow(
        "Ошибка при скачивании видео"
      );
    });
  });

  describe("extractAudio", () => {
    it("should extract audio from video", async () => {
      // Вызываем функцию
      const result = await extractAudio("/path/to/video.mp4");

      // Проверяем, что был вызван метод exec с правильной командой
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("ffmpeg -i \"/path/to/video.mp4\""),
        expect.any(Function)
      );

      // Проверяем результат
      expect(result).toMatch(/\/temp\/audio\/.*\.mp3$/);
    });

    it("should return existing audio if it already exists", async () => {
      // Мокируем существование файла
      mockFs.existsSync.mockReturnValue(true);

      // Вызываем функцию
      const result = await extractAudio("/path/to/video.mp4");

      // Проверяем, что не был вызван метод exec
      expect(mockExec).not.toHaveBeenCalled();

      // Проверяем результат
      expect(result).toMatch(/\/temp\/audio\/.*\.mp3$/);
    });

    it("should handle error during extraction", async () => {
      // Мокируем ошибку при извлечении аудио
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error("Extraction error"), null);
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
      });

      // Проверяем, что функция выбрасывает ошибку
      await expect(extractAudio("/path/to/video.mp4")).rejects.toThrow(
        "Ошибка при извлечении аудио"
      );
    });
  });
});
