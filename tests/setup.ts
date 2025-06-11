// Global test setup
import { jest } from '@jest/globals';

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock WebSocket for tests
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock Figma API for plugin tests
global.figma = {
  variables: {
    createVariableCollection: jest.fn(),
    createVariable: jest.fn(),
    getVariableById: jest.fn(),
    getVariableCollectionById: jest.fn(),
    getLocalVariableCollections: jest.fn(),
    setBoundVariableForPaint: jest.fn()
  },
  getNodeById: jest.fn(),
  getStyleById: jest.fn(),
  getStyleByIdAsync: jest.fn(),
  getLocalPaintStyles: jest.fn(),
  getLocalTextStyles: jest.fn(),
  getLocalEffectStyles: jest.fn(),
  currentPage: {
    findAll: jest.fn(),
    selection: []
  }
} as any;

// Set test environment
process.env.NODE_ENV = 'test';