// Global test setup - configures mocks and test environment
import { vi } from 'vitest';

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock WebSocket for tests
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock Figma API for plugin tests
global.figma = {
  variables: {
    createVariableCollection: vi.fn(),
    createVariable: vi.fn(),
    getVariableById: vi.fn(),
    getVariableCollectionById: vi.fn(),
    getLocalVariableCollections: vi.fn(),
    setBoundVariableForPaint: vi.fn()
  },
  getNodeById: vi.fn(),
  getStyleById: vi.fn(),
  getStyleByIdAsync: vi.fn(),
  getLocalPaintStyles: vi.fn(),
  getLocalTextStyles: vi.fn(),
  getLocalEffectStyles: vi.fn(),
  currentPage: {
    findAll: vi.fn(),
    selection: []
  }
} as any;

// Set test environment
process.env.NODE_ENV = 'test';