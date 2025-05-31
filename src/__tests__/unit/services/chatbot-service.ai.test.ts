import { describe, it, expect, jest, beforeEach, afterEach } from "bun:test";
import { ChatbotService } from "../../../services/chatbot-service";
import { EmbeddingsService } from "../../../services/embeddings-service";

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
  })
};

const mockEmbeddingsService = {
  createAndSaveEmbedding: jest.fn().mockResolvedValue(1),
  searchSimilarTranscripts: jest.fn().mockResolvedValue([
    { reel_id: "test_reel", transcript: "This is a test transcript", similarity: 0.9 }
  ]),
  getEmbeddingByReelId: jest.fn().mockResolvedValue({
    id: 1,
    reel_id: "test_reel",
    transcript: "This is a test transcript",
    embedding: "[0,0,0]"
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

describe("ChatbotService AI Tests", () => {
  let chatbotService: ChatbotService;

  beforeEach(() => {
    // Создаем экземпляр сервиса с моками
    chatbotService = new ChatbotService(
      mockAdapter as any,
      mockEmbeddingsService as any,
      "fake-api-key"
    );

    // Мокируем OpenAI
    (chatbotService as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should get chat history", async () => {
    const history = await chatbotService.getChatHistory("123", "test_reel");

    expect(mockAdapter.executeQuery).toHaveBeenCalled();
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe("user");
    expect(history[1].role).toBe("assistant");
  });

  it("should clear chat history", async () => {
    const result = await chatbotService.clearChatHistory("123", "test_reel");

    expect(mockAdapter.executeQuery).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it("should generate response", async () => {
    const response = await chatbotService.generateResponse(
      "123",
      "test_reel",
      "What is this video about?"
    );

    expect(mockAdapter.executeQuery).toHaveBeenCalled(); // Вставка в историю чата
    expect(response).toBe("This is a test response from the chatbot. The video is about Instagram Reels and marketing strategies.");
  });
});
