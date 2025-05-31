import { describe, it, expect, jest, mock, beforeEach, afterEach } from "bun:test";
import { downloadWithYtDlp } from "../../../utils/yt-dlp";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

// Мокируем fs
mock.module("fs", () => {
  return {
    ...jest.requireActual("fs"),
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
});

// Мокируем path
mock.module("path", () => {
  return {
    ...jest.requireActual("path"),
    join: jest.fn().mockImplementation((...args) => args.join("/")),
  };
});

// Мокируем child_process
mock.module("child_process", () => {
  return {
    exec: jest.fn(),
  };
});

describe("yt-dlp Utils", () => {
  let mockFs: any;
  let mockPath: any;
  let mockExec: jest.Mock;

  beforeEach(() => {
    // Получаем моки
    mockFs = require("fs");
    mockPath = require("path");
    mockExec = require("child_process").exec;

    // Настраиваем моки
    mockFs.existsSync.mockReturnValue(false);
    mockPath.join.mockImplementation((...args) => args.join("/"));
    mockExec.mockImplementation((cmd, callback) => {
      callback(null, { stdout: "success", stderr: "" });
      return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
    });

    // Сбрасываем все моки
    jest.clearAllMocks();
  });

  describe("downloadWithYtDlp", () => {
    it("should download video using yt-dlp", async () => {
      // Вызываем функцию
      const result = await downloadWithYtDlp("https://www.instagram.com/reel/example", "/path/to/output.mp4");

      // Проверяем, что был вызван метод exec с правильной командой
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("yt-dlp \"https://www.instagram.com/reel/example\" -o \"/path/to/output.mp4\""),
        expect.any(Function)
      );

      // Проверяем результат
      expect(result).toBe("/path/to/output.mp4");
    });

    it("should create output directory if it doesn't exist", async () => {
      // Вызываем функцию
      await downloadWithYtDlp("https://www.instagram.com/reel/example", "/path/to/output.mp4");

      // Проверяем, что был вызван метод existsSync
      expect(mockFs.existsSync).toHaveBeenCalledWith("/path/to");

      // Проверяем, что был вызван метод mkdirSync
      expect(mockFs.mkdirSync).toHaveBeenCalledWith("/path/to", { recursive: true });
    });

    it("should not create output directory if it already exists", async () => {
      // Мокируем существование директории
      mockFs.existsSync.mockReturnValue(true);

      // Вызываем функцию
      await downloadWithYtDlp("https://www.instagram.com/reel/example", "/path/to/output.mp4");

      // Проверяем, что был вызван метод existsSync
      expect(mockFs.existsSync).toHaveBeenCalledWith("/path/to");

      // Проверяем, что не был вызван метод mkdirSync
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should handle error during download", async () => {
      // Мокируем ошибку при скачивании
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error("Download error"), null);
        return { stdout: { on: jest.fn() }, stderr: { on: jest.fn() } };
      });

      // Проверяем, что функция выбрасывает ошибку
      await expect(downloadWithYtDlp("https://www.instagram.com/reel/example", "/path/to/output.mp4")).rejects.toThrow(
        "Ошибка при скачивании видео с помощью yt-dlp"
      );
    });
  });
});
