declare module "bun:test" {
  export interface MockFunction<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T>;
    mockReturnValue(value: ReturnType<T>): this;
    mockResolvedValue(value: ReturnType<T>): this;
    mockRejectedValue(value: any): this;
    mockImplementation(fn: T): this;
    mockReturnValueOnce(value: ReturnType<T>): this;
    mockResolvedValueOnce(value: ReturnType<T>): this;
    mockRejectedValueOnce(value: any): this;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): this;
    mock: {
      calls: any[][];
      instances: any[];
      contexts: any[];
      results: Array<{ type: 'return' | 'throw'; value: any }>;
      lastCall?: any[];
    };
  }

  export interface ExpectMatchers {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledWith(...args: any[]): void;
    toHaveBeenCalledTimes(times: number): void;
    toThrow(error?: string | RegExp | Error): void;
    toContain(item: any): void;
    toMatch(regexp: RegExp | string): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeInstanceOf(constructor: any): void;
    toHaveProperty(propertyPath: string, value?: any): void;
    stringContaining(value: string): any;
    objectContaining(value: any): any;
    arrayContaining(value: any[]): any;
  }

  export interface JestMockCompatible {
    fn(): MockFunction<() => any>;
    fn<T extends (...args: any[]) => any>(implementation?: T): MockFunction<T>;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    requireActual(moduleName: string): any;
    module: {
      [key: string]: any;
    };
  }

  export const jest: JestMockCompatible;

  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(actual: any): ExpectMatchers & {
    stringContaining(value: string): any;
    objectContaining(value: any): any;
    arrayContaining(value: any[]): any;
  };
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function mock(fn: () => any): MockFunction<() => any>;
  export function mock<T extends (...args: any[]) => any>(fn: T): MockFunction<T>;
}

// Дополнительные типы для совместимости с Jest
declare global {
  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> extends MockFunction<(...args: Y) => T> {}
  }
}