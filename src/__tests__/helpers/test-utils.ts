import { jest } from "bun:test";

/**
 * Простая замена для jest.spyOn в Bun Test
 * @param object Объект для мокирования
 * @param method Метод для мокирования
 * @returns Мок функция
 */
export function spyOn<T extends object, K extends keyof T>(
  object: T,
  method: K
): jest.Mock {
  const originalMethod = object[method];
  const mockFn = jest.fn();

  // Сохраняем оригинальный метод для возможности восстановления
  (mockFn as any).mockRestore = () => {
    (object as any)[method] = originalMethod;
  };

  // Заменяем метод на мок
  (object as any)[method] = mockFn;

  return mockFn;
}

/**
 * Восстанавливает все моки объекта
 * @param object Объект для восстановления
 */
export function restoreAllMocks<T extends object>(object: T): void {
  Object.keys(object).forEach((key) => {
    const value = (object as any)[key];
    if (value && typeof value.mockRestore === "function") {
      value.mockRestore();
    }
  });
}

/**
 * Создает мок объекта с заданными методами
 * @param methods Методы для мокирования
 * @returns Мок объект
 */
export function createMockObject<T extends Record<string, any>>(
  methods: Partial<T>
): T {
  const mock = {} as T;

  Object.keys(methods).forEach((key) => {
    (mock as any)[key] = jest.fn().mockImplementation((methods as any)[key]);
  });

  return mock;
}
