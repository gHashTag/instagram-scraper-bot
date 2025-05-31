import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { Telegraf, Scenes } from "telegraf";
import type { ScraperBotContext } from "../../types";
import { NeonAdapter } from "../../adapters/neon-adapter";
import { projectWizardScene } from "../../scenes/project-wizard-scene";

describe("Project Wizard - Create Button Integration Test", () => {
  let bot: Telegraf<ScraperBotContext>;
  let storageAdapter: NeonAdapter;
  let stage: Scenes.Stage<ScraperBotContext>;
  let testUserId: number;

  beforeEach(async () => {
    // Создаем реальный адаптер
    storageAdapter = new NeonAdapter();
    await storageAdapter.initialize();

    // Создаем уникального тестового пользователя для каждого теста
    const uniqueTelegramId = Math.floor(Math.random() * 1000000) + 100000000;
    const testUser = await storageAdapter.createUser(
      uniqueTelegramId,
      `testuser_${uniqueTelegramId}`
    );
    testUserId =
      typeof testUser!.id === "string" ? parseInt(testUser!.id) : testUser!.id;

    // Создаем бота
    bot = new Telegraf<ScraperBotContext>("test-token");

    // Создаем stage с project wizard
    stage = new Scenes.Stage<ScraperBotContext>([projectWizardScene]);

    // Добавляем middleware
    bot.use((ctx, next) => {
      ctx.storage = storageAdapter;
      ctx.scraperConfig = { telegramBotToken: "test-token" };
      return next();
    });

    bot.use(stage.middleware());
  });

  afterEach(async () => {
    // Очищаем тестовые данные
    if (testUserId) {
      try {
        // Удаляем проекты пользователя
        const projects = await storageAdapter.getProjectsByUserId(testUserId);
        for (const project of projects) {
          await storageAdapter.deleteProject(project.id);
        }
        // Удаляем пользователя (метод deleteUser не реализован в адаптере)
        // await storageAdapter.deleteUser(testUserId);
      } catch (error) {
        console.warn("Ошибка при очистке тестовых данных:", error);
      }
    }
    await storageAdapter.close();
  });

  it("should handle create_project button click", async () => {
    const uniqueTelegramId = Math.floor(Math.random() * 1000000) + 100000000;

    // Создаем контекст для имитации нажатия кнопки
    const mockContext = {
      from: { id: uniqueTelegramId, username: "testuser" },
      callbackQuery: {
        id: "test-callback",
        data: "create_project",
        from: { id: uniqueTelegramId, username: "testuser" },
      },
      storage: storageAdapter,
      scraperConfig: { telegramBotToken: "test-token" },
      scene: {
        enter: mock(() => {}),
        leave: mock(() => {}),
        reenter: mock(() => {}),
        session: {},
      },
      wizard: {
        state: {},
        next: mock(() => {}),
        selectStep: mock(() => {}),
      },
      answerCbQuery: mock(() => Promise.resolve()),
      reply: mock(() => Promise.resolve()),
      match: null,
    } as unknown as ScraperBotContext;

    // Получаем обработчик кнопки create_project из сцены
    const scene = projectWizardScene as any;

    // Проверяем, что обработчик зарегистрирован
    expect(scene.handlers).toBeDefined();

    // Ищем обработчик create_project
    let createProjectHandler = null;
    for (const handler of scene.handlers) {
      if (handler.trigger === "create_project") {
        createProjectHandler = handler.middleware;
        break;
      }
    }

    expect(createProjectHandler).toBeTruthy();

    // Вызываем обработчик
    await createProjectHandler(mockContext);

    // Проверяем, что были вызваны нужные методы
    expect(mockContext.answerCbQuery).toHaveBeenCalled();
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining("Введите название нового проекта"),
      expect.any(Object)
    );
    expect(mockContext.wizard.next).toHaveBeenCalled();
  });

  it("should handle project creation flow", async () => {
    const uniqueTelegramId = Math.floor(Math.random() * 1000000) + 100000000;
    const testUser = await storageAdapter.createUser(
      uniqueTelegramId,
      `testuser_${uniqueTelegramId}`
    );
    expect(testUser).toBeTruthy();

    // Создаем контекст для имитации ввода текста
    const mockContext = {
      from: { id: uniqueTelegramId, username: "testuser" },
      message: {
        text: "Test Project Name",
      },
      storage: storageAdapter,
      scraperConfig: { telegramBotToken: "test-token" },
      scene: {
        enter: mock(() => {}),
        leave: mock(() => {}),
        reenter: mock(() => {}),
        session: {},
      },
      wizard: {
        state: {},
        next: mock(() => {}),
        selectStep: mock(() => {}),
      },
      reply: mock(() => Promise.resolve()),
      match: null,
    } as unknown as ScraperBotContext;

    // Получаем второй шаг wizard'а (создание проекта)
    const scene = projectWizardScene as any;
    const createProjectStep = scene.steps[1]; // Второй шаг - создание проекта

    expect(createProjectStep).toBeTruthy();

    // Вызываем шаг создания проекта
    await createProjectStep(mockContext);

    // Проверяем, что проект был создан
    const projects = await storageAdapter.getProjectsByUserId(testUser!.id);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0].name).toBe("Test Project Name");

    // Проверяем, что было отправлено сообщение об успехе
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining("успешно создан")
    );

    // Очищаем созданные данные
    await storageAdapter.deleteProject(projects[0].id);
    // await storageAdapter.deleteUser(testUser!.id); // Метод не реализован
  });

  it("should handle invalid project name", async () => {
    const uniqueTelegramId = Math.floor(Math.random() * 1000000) + 100000000;
    const testUser = await storageAdapter.createUser(
      uniqueTelegramId,
      `testuser_${uniqueTelegramId}`
    );
    expect(testUser).toBeTruthy();

    // Создаем контекст с коротким именем проекта
    const mockContext = {
      from: { id: uniqueTelegramId, username: "testuser" },
      message: {
        text: "AB", // Слишком короткое имя
      },
      storage: storageAdapter,
      scraperConfig: { telegramBotToken: "test-token" },
      scene: {
        enter: mock(() => {}),
        leave: mock(() => {}),
        reenter: mock(() => {}),
        session: {},
      },
      wizard: {
        state: {},
        next: mock(() => {}),
        selectStep: mock(() => {}),
      },
      reply: mock(() => Promise.resolve()),
      match: null,
    } as unknown as ScraperBotContext;

    // Получаем второй шаг wizard'а (создание проекта)
    const scene = projectWizardScene as any;
    const createProjectStep = scene.steps[1];

    // Вызываем шаг создания проекта
    await createProjectStep(mockContext);

    // Проверяем, что было отправлено сообщение об ошибке
    expect(mockContext.reply).toHaveBeenCalledWith(
      expect.stringContaining("не менее 3 символов")
    );

    // Проверяем, что проект НЕ был создан
    const projects = await storageAdapter.getProjectsByUserId(testUser!.id);
    expect(projects.length).toBe(0);

    // Очищаем созданные данные
    // await storageAdapter.deleteUser(testUser!.id); // Метод не реализован
  });
});
