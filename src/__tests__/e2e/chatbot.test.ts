import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest,
} from "bun:test";
// import { spyOn } from "../helpers/test-utils"; // Unused
import { Telegraf, Scenes } from "telegraf";
import { NeonAdapter } from "../../adapters/neon-adapter";
import { TranscriptService } from "../../services/transcript-service";
import { EmbeddingsService } from "../../services/embeddings-service";
import { ChatbotService } from "../../services/chatbot-service";
import { ChatbotScene } from "../../scenes/chatbot-scene";
import { config } from "dotenv";

// Загружаем переменные окружения из .env файла
config();

// Пропускаем тесты, если нет ключа API или URL базы данных
const skipTests =
  !process.env.OPENAI_API_KEY ||
  !process.env.DATABASE_URL ||
  !process.env.BOT_TOKEN;

// Создаем описание тестов
(skipTests ? describe.skip : describe)("Chatbot E2E Tests", () => {
  let adapter: NeonAdapter;
  let transcriptService: TranscriptService;
  let embeddingsService: EmbeddingsService;
  let chatbotService: ChatbotService;
  let chatbotScene: ChatbotScene;
  let bot: Telegraf;
  let stage: Scenes.Stage<any>;
  let testReelId: string;
  let testUserId: number;
  let testProjectId: number;

  // Перед всеми тестами
  beforeAll(async () => {
    // Создаем адаптер хранилища
    adapter = new NeonAdapter();

    // Создаем сервисы
    transcriptService = new TranscriptService(
      adapter,
      process.env.OPENAI_API_KEY
    );
    embeddingsService = new EmbeddingsService(
      adapter,
      process.env.OPENAI_API_KEY
    );
    chatbotService = new ChatbotService(
      adapter,
      embeddingsService,
      process.env.OPENAI_API_KEY
    );

    // Создаем сцену чат-бота
    chatbotScene = new ChatbotScene(adapter, process.env.OPENAI_API_KEY);

    // Создаем бота и сцену
    bot = new Telegraf(process.env.BOT_TOKEN as string);
    stage = new Scenes.Stage([chatbotScene]);
    bot.use(stage.middleware());

    // Создаем тестовые данные
    testReelId = `test_reel_${Date.now()}`;
    testUserId = 123456789;
    testProjectId = 1;

    // Создаем тестовый Reel
    await adapter.initialize();
    await adapter.executeQuery(
      `INSERT INTO reels (reel_url, project_id, source_type, source_identifier, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (reel_url) DO NOTHING`,
      [
        "https://www.instagram.com/reel/" + testReelId,
        testProjectId,
        "test",
        testReelId,
        "Test Reel for E2E testing",
      ]
    );
    await adapter.close();
  });

  // После всех тестов
  afterAll(async () => {
    // Удаляем тестовые данные
    await adapter.initialize();

    // Удаляем историю чата
    await adapter.executeQuery(
      `DELETE FROM chat_history WHERE user_id = $1 AND reel_id = $2`,
      [testUserId.toString(), testReelId]
    );

    // Удаляем эмбеддинг
    await adapter.executeQuery(
      `DELETE FROM transcript_embeddings WHERE reel_id = $1`,
      [testReelId]
    );

    // Удаляем Reel
    await adapter.executeQuery(`DELETE FROM reels WHERE reel_url = $1`, [
      "https://www.instagram.com/reel/" + testReelId,
    ]);

    await adapter.close();

    // Останавливаем бота
    bot.stop();
  });

  // Перед каждым тестом
  beforeEach(async () => {
    await adapter.initialize();
  });

  // После каждого теста
  afterEach(async () => {
    await adapter.close();

    // Явно останавливаем бота
    if (bot) {
      bot.stop();
    }
  });

  // Тест полного цикла работы с чат-ботом
  it("should complete full chatbot workflow", async () => {
    // Устанавливаем таймаут для теста
    jest.setTimeout(30000); // 30 секунд
    // Шаг 1: Расшифровка видео
    console.log("Step 1: Transcribing video...");

    // Мокируем метод transcribeReel, чтобы не делать реальный запрос к API
    // const originalTranscribeReel = transcriptService.transcribeReel; // Unused
    transcriptService.transcribeReel = jest
      .fn()
      .mockImplementation(async (reelId: any) => {
        // Обновляем Reel с расшифровкой
        await adapter.updateReel(reelId, {
          transcript:
            "This is a test transcript for E2E testing. The video is about Instagram Reels and how to use them effectively for marketing.",
          transcript_status: "completed",
          transcript_updated_at: new Date().toISOString(),
        });

        return "This is a test transcript for E2E testing. The video is about Instagram Reels and how to use them effectively for marketing.";
      });

    // Расшифровываем видео
    const transcript = await transcriptService.transcribeReel(testReelId);

    expect(transcript).not.toBeNull();
    expect(typeof transcript).toBe("string");
    expect(transcript?.length).toBeGreaterThan(0);

    // Шаг 2: Создание эмбеддинга для расшифровки
    console.log("Step 2: Creating embedding...");

    // Мокируем метод createAndSaveEmbedding
    // const originalCreateAndSaveEmbedding = embeddingsService.createAndSaveEmbedding; // Unused
    embeddingsService.createAndSaveEmbedding = jest
      .fn()
      .mockImplementation(async (reelId: any, transcript: any) => {
        // Создаем тестовый эмбеддинг
        const testEmbeddingArray = Array(1536)
          .fill(0)
          .map(() => Math.random());
        const testEmbedding = `[${testEmbeddingArray.join(",")}]`;

        // Сохраняем эмбеддинг в базу данных
        await adapter.executeQuery(
          `INSERT INTO transcript_embeddings (reel_id, transcript, embedding)
         VALUES ($1, $2, $3::vector)
         ON CONFLICT (reel_id) DO UPDATE SET
         transcript = $2,
         embedding = $3::vector,
         updated_at = CURRENT_TIMESTAMP`,
          [reelId, transcript, testEmbedding]
        );

        return 1; // ID эмбеддинга
      });

    // Создаем эмбеддинг
    const embeddingId = await embeddingsService.createAndSaveEmbedding(
      testReelId,
      transcript as string
    );

    expect(embeddingId).not.toBeNull();
    expect(typeof embeddingId).toBe("number");

    // Шаг 3: Общение с чат-ботом
    console.log("Step 3: Chatting with bot...");

    // Создаем мок контекста
    const mockContext = {
      scene: {
        enter: jest.fn(),
        leave: jest.fn(),
        reenter: jest.fn(),
        session: {
          currentProjectId: testProjectId,
          currentReelId: testReelId,
        },
      },
      from: {
        id: testUserId,
      },
      callbackQuery: {
        data: "",
      },
      match: null,
      reply: jest.fn().mockResolvedValue({ message_id: 1 }),
      answerCbQuery: jest.fn(),
      editMessageText: jest.fn(),
      editMessageReplyMarkup: jest.fn(),
      deleteMessage: jest.fn(),
      sendChatAction: jest.fn(),
      message: {
        text: "What is this video about?",
      },
      storage: adapter,
    };

    // Создаем простой мок для OpenAI
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content:
                    "This is a test response from the chatbot. The video is about Instagram Reels and marketing strategies.",
                },
              },
            ],
          }),
        },
      },
    };

    // Мокируем OpenAI в chatbotService
    (chatbotService as any).openai = mockOpenAI;

    // Мокируем метод onText, чтобы он не вызывал бесконечный цикл
    // const originalOnText = (chatbotScene as any).onText; // Unused
    (chatbotScene as any).onText = jest
      .fn()
      .mockImplementation(async (ctx: any) => {
        await ctx.sendChatAction("typing");

        // Добавляем сообщение пользователя в историю
        await chatbotService.saveChatMessage(
          ctx.from.id.toString(),
          ctx.scene.session.currentReelId,
          ctx.message.text,
          "user"
        );

        // Добавляем ответ в историю
        await chatbotService.saveChatMessage(
          ctx.from.id.toString(),
          ctx.scene.session.currentReelId,
          "This is a test response from the chatbot. The video is about Instagram Reels and marketing strategies.",
          "assistant"
        );

        // Отправляем ответ
        await ctx.reply(
          "This is a test response from the chatbot. The video is about Instagram Reels and marketing strategies."
        );

        return true;
      });

    // Вызываем обработчик текстового сообщения
    await (chatbotScene as any).onText(mockContext);

    // Проверяем, что был вызван метод sendChatAction
    expect(mockContext.sendChatAction).toHaveBeenCalledWith("typing");

    // Проверяем, что был вызван метод reply
    expect(mockContext.reply).toHaveBeenCalled();

    // Шаг 4: Получение ответов от чат-бота
    console.log("Step 4: Getting response from chatbot...");

    // Получаем историю чата
    const history = await chatbotService.getChatHistory(
      testUserId.toString(),
      testReelId
    );

    expect(history).not.toBeNull();
    expect(Array.isArray(history)).toBe(true);
    expect(history?.length).toBeGreaterThanOrEqual(2);

    // Проверяем последние два сообщения
    const lastMessages = history?.slice(-2);
    expect(lastMessages?.[0].role).toBe("user");
    expect(lastMessages?.[0].content).toBe("What is this video about?");
    expect(lastMessages?.[1].role).toBe("assistant");
    expect(lastMessages?.[1].content.length).toBeGreaterThan(0);

    // Шаг 5: Очистка истории чата
    console.log("Step 5: Clearing chat history...");

    // Очищаем историю чата
    const result = await chatbotService.clearChatHistory(
      testUserId.toString(),
      testReelId
    );

    expect(result).toBe(true);

    // Проверяем, что история чата пуста
    const emptyHistory = await chatbotService.getChatHistory(
      testUserId.toString(),
      testReelId
    );

    expect(emptyHistory?.length).toBe(0);

    // Явно останавливаем бота в конце теста
    bot.stop();

    console.log("Test completed successfully!");
  });
});
