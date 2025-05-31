/**
 * Мок для логгера
 */

import { jest } from 'bun:test';

export const logger = {
  userAction: jest.fn(),
  botAction: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
};

export const LogType = {
  SYSTEM: 'SYSTEM',
  USER_ACTION: 'USER_ACTION',
  BOT_ACTION: 'BOT_ACTION',
  ERROR: 'ERROR'
};
