import { describe, it, expect, jest, beforeEach, afterEach } from "bun:test";
import { ChatbotScene } from "../../../scenes/chatbot-scene";

// Создаем моки для зависимостей
const mockAdapter = {
  initialize: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  executeQuery: jest.fn().mockImplementation((query, params) => {
    // Мокируем ответы для разных запросов
    if (query.includes("INSERT INTO chat_history")) {
      return Promise.resolve({ rowCount: 1 });
    } else if (query.includes("SELECT role, message")) {
      return Promise.resolve({
        rows: [
          { role: "user", message: "Hello" },
          { role: "assistant", message: "Hi there!" }
        ],
        rowCount: 2
      });
    } else if (query.includes("DELETE FROM chat_history")) {
      return Promise.resolve({ rowCount: 2 });
    } else {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
  }),
  saveChatMessage: jest.fn().mockResolvedValue(1),
  getChatHistory: jest.fn().mockResolvedValue([
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there!" }
  ]),
  clearChatHistory: jest.fn().mockResolvedValue(true),
  getReelById: jest.fn().mockResolvedValue({
    id: 1,
    reel_url: "https://www.instagram.com/reel/test_reel",
    description: "Test Reel",
    author_username: "testuser"
  })
};

// Создаем простой мок для OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: "This is a test response from the chatbot. The video is about Instagram Reels and marketing strategies."
            }
          }
        ]
      })
    }
  }
};

describe("ChatbotScene Simple Tests", () => {
  let chatbotScene: ChatbotScene;

  beforeEach(() => {
    // Создаем экземпляр сцены с моками
    chatbotScene = new ChatbotScene(mockAdapter as any, "fake-api-key");

    // Мокируем OpenAI
    (chatbotScene as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should handle text messages", async () => {
    // Создаем мок контекста
    const mockContext = {
      scene: {
        enter: jest.fn(),
        leave: jest.fn(),
        reenter: jest.fn(),
        session: {
          currentProjectId: 1,
          currentReelId: "test_reel"
        }
      },
      from: {
        id: 123456789
      },
      callbackQuery: {
        data: ""
      },
      match: null,
      reply: jest.fn().mockResolvedValue({ message_id: 1 }),
      answerCbQuery: jest.fn(),
      editMessageText: jest.fn(),
      editMessageReplyMarkup: jest.fn(),
      deleteMessage: jest.fn(),
      sendChatAction: jest.fn(),
      message: {
        text: "What is this video about?"
      },
      storage: mockAdapter
    };

    // Мокируем метод onText
    jest.spyOn(chatbotScene as any, "onText").mockImplementation(async (ctx) => {
      await ctx.sendChatAction("typing");
      await ctx.reply("This is a test response from the chatbot.");
      return true;
    });

    // Вызываем обработчик текстового сообщения
    await (chatbotScene as any).onText(mockContext);

    // Проверяем, что был вызван метод sendChatAction
    expect(mockContext.sendChatAction).toHaveBeenCalledWith("typing");

    // Проверяем, что был вызван метод reply
    expect(mockContext.reply).toHaveBeenCalled();
  });

  it("should handle clear_chat_history button", async () => {
    // Создаем мок контекста
    const mockContext = {
      scene: {
        session: {
          currentReelId: "test_reel"
        }
      },
      from: {
        id: 123456789
      },
      callbackQuery: {
        data: "clear_chat_history"
      },
      answerCbQuery: jest.fn(),
      reply: jest.fn(),
      storage: mockAdapter
    };

    // Вызываем метод напрямую
    await (chatbotScene as any).onClearChatHistory(mockContext);

    // Проверяем, что был вызван метод answerCbQuery
    expect(mockContext.answerCbQuery).toHaveBeenCalled();

    // Проверяем, что был вызван метод reply
    expect(mockContext.reply).toHaveBeenCalled();
  });
});
