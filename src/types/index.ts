// ================================================================================
// Figma MCP Write Server - Type System Index
// ================================================================================

// NEW: Consolidated type system exports
// Centralized enums and constants
export * from './figma-enums.js';

// Reusable field components and mixins
export * from './common-fields.js';

// Operation schema factory and utilities
export * from './operation-factory.js';

// Core Figma types (colors, paints, effects, typography)
export * from './figma-base.js';

// Base schemas and common node properties
export * from './schemas.js';

// Node creation, update, and management operations
export * from './node-operations.js';

// Style management operations
export * from './style-operations.js';

// Auto layout and constraints operations
export * from './layout-operations.js';

// Hierarchy management operations
export * from './hierarchy-operations.js';

// Page management operations
export * from './page-operations.js';

// Component system operations
export * from './component-operations.js';

// Variable system operations
export * from './variable-operations.js';

// Export operations
export * from './export-operations.js';

// Fill management operations (Paint objects)
export * from './fill-operations.js';

// Font management operations
export * from './font-operations.js';

// Text operations (replaces create_text with comprehensive manage_text)
export * from './text-operations.js';

// Effects management operations
export * from './effect-operations.js';

// Selection management operations
export * from './selection-operations.js';

// Plugin communication and MCP server types
export * from './plugin-communication.js';

// Server configuration and connection management
export * from './server-config.js';

// Validation utilities and type guards
export * from './validation-utils.js';

