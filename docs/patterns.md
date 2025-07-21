# Handler Patterns & Best Practices

This document outlines the architectural patterns and best practices for implementing MCP tools in the Figma MCP Write Server, based on analysis of the existing codebase.

## Table of Contents

1. [🏗️ Architecture Patterns](#-architecture-patterns)
2. [🏆 Reference Implementations](#-reference-implementations) 
3. [🔧 Parameter Configuration](#-parameter-configuration)
4. [📋 Implementation Standards](#-implementation-standards)
5. [⚠️ Common Pitfalls](#-common-pitfalls)
6. [🎯 Quality Guidelines](#-quality-guidelines)

---

## 🏗️ Architecture Patterns

### Modern Unified Handler Pattern (Recommended)

**Used by:** 95% of current handlers including `variables-handler.ts`, `fills-handler.ts`, `hierarchy-handler.ts`, and others.

**Key Characteristics:**
- **Interface:** `implements ToolHandler`
- **Core:** `UnifiedHandler` class for all operations
- **Structure:** Single tool per handler class
- **Parameters:** `UnifiedParamConfigs` with bulk operation support
- **Validation:** Zod schemas with optional custom validators
- **Communication:** Configurable via `UnifiedHandlerConfig`

**Template Structure:**
```typescript
export class ExampleHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;
  
  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }
  
  getTools(): Tool[] {
    return [{
      name: 'figma_example',
      description: 'Tool description',
      inputSchema: { /* JSON Schema */ }
    }];
  }
  
  async handle(toolName: string, args: any): Promise<any> {
    const config: UnifiedHandlerConfig = {
      toolName: 'figma_example',
      operation: 'example',
      bulkParams: ['nodeId'],
      paramConfigs: {
        operation: { expectedType: 'string', required: true },
        nodeId: { expectedType: 'array', arrayItemType: 'string', allowSingle: true }
      },
      pluginMessageType: 'MANAGE_EXAMPLE',
      schema: ManageExampleSchema
    };
    return this.unifiedHandler.handle(args, config);
  }
}
```

### Special Case Handler Pattern

**Used by:** Plugin status and other system-level handlers requiring direct WebSocket access.

**When to Use:** Complex custom logic requiring WebSocket server reference or system-level operations.

## 🏆 Reference Implementations

### Primary Reference: FillsHandler ⭐

**Why it's the best example:**
- Clean, focused code structure
- Consistent parameter patterns
- Schema-based validation
- Standard bulk operations
- Efficient configuration

**Use this as your template for:**
- New handler implementations
- Parameter configuration patterns
- Error handling approaches
- Bulk operation setup

### Advanced Reference: VariablesHandler

**Why it's valuable:**
- Comprehensive feature set
- Advanced validation patterns
- Complex operation handling
- Custom validator integration

**Use this for:**
- Complex multi-operation tools
- Custom validation requirements
- Advanced parameter patterns

### Simple Reference: HierarchyHandler

**Why it's useful:**
- Simple, effective implementation
- Easy to understand and maintain
- Standard patterns throughout
- Focused functionality

**Use this for:**
- Simple, focused tools
- Learning the basic patterns
- Quick implementations

## 🔧 Parameter Configuration

### Best Practice Pattern (Recommended)

```typescript
paramConfigs: {
  operation: { expectedType: 'string' as const, required: true },
  nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
  fillIndex: { expectedType: 'number' as const, allowSingle: true },
  color: { expectedType: 'string' as const, allowSingle: true }
}
```

**Key Principles:**
- Use explicit type assertions (`as const`)
- Enable `allowSingle` for arrays when appropriate
- Mark required parameters explicitly
- Keep configuration focused and clear

### Advanced Pattern (For Complex Cases)

```typescript
paramConfigs: {
  operation: { expectedType: 'string' as const, allowSingle: true },
  modes: { 
    expectedType: 'array' as const, 
    allowSingle: true, 
    validator: this.validateModes.bind(this) 
  },
  collectionId: {
    expectedType: 'string' as const,
    validator: this.validateCollectionId.bind(this)
  }
}
```

**When to Use:**
- Complex validation requirements
- Custom business logic validation
- Multi-step parameter dependencies

### Anti-Pattern (Avoid)

```typescript
paramConfigs: {
  ...UnifiedParamConfigs.basic(), // Mixed approaches
  nodeId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
  strokeWeight: CommonParamConfigs.strokeWeight, // Different config source
  // ... inconsistent patterns
}
```

**Problems:**
- Mixed configuration sources
- Inconsistent patterns
- Hard to maintain
- Unclear dependencies

## 📋 Implementation Standards

### Error Handling Standards

```typescript
// ✅ Correct: Throw exceptions
throw new Error(`Node ${nodeId} not found`);

// ❌ Incorrect: Return error objects
return { success: false, error: 'Node not found' };
```

**Key Rules:**
- Always throw exceptions (no error response objects)
- Use `error.toString()` for JSON-RPC compatibility
- Use `debugLog()` utility for safe logging
- Format responses as YAML

### Bulk Operations Support

```typescript
const config: UnifiedHandlerConfig = {
  toolName: 'figma_example',
  operation: 'update',
  bulkParams: ['nodeId'], // Enable bulk operations for nodeId
  paramConfigs: {
    nodeId: { expectedType: 'array', arrayItemType: 'string', allowSingle: true }
  },
  // ... other config
};
```

**Implementation:**
- Use `BulkOperationsParser` class automatically
- Configure `bulkParams` array in `UnifiedHandlerConfig`
- Support `failFast` parameter for error handling
- Handle custom bulk logic when needed

### Schema Validation

```typescript
// ✅ Preferred: Zod schemas with minimal custom logic
schema: ManageExampleSchema,
paramConfigs: {
  operation: { expectedType: 'string', required: true }
}

// ✅ Acceptable: Custom validators for complex cases
paramConfigs: {
  customField: { 
    expectedType: 'object',
    validator: this.validateCustomField.bind(this)
  }
}
```

## ⚠️ Common Pitfalls

### 1. Mixed Configuration Patterns
**Problem:** Using multiple configuration sources inconsistently.
**Solution:** Stick to one configuration pattern per handler.

### 2. Inconsistent Error Handling
**Problem:** Mixing exceptions and error objects.
**Solution:** Always throw exceptions, never return error objects.

### 3. Overly Complex Parameter Configs
**Problem:** Configuration becomes hard to understand and maintain.
**Solution:** Keep configurations focused and use custom validators sparingly.

### 4. Missing Bulk Operation Support
**Problem:** Not enabling bulk operations for array parameters.
**Solution:** Always configure `bulkParams` for applicable parameters.

### 5. Legacy Pattern Usage
**Problem:** Using deprecated patterns or BaseHandler.
**Solution:** Always use UnifiedHandler pattern for new implementations.

## 🎯 Quality Guidelines

### Handler Quality Checklist

**Maintainability (A-F)**
- [ ] Clear, focused code structure
- [ ] Consistent parameter patterns
- [ ] Logical organization
- [ ] Reasonable complexity

**Validation (A-F)**
- [ ] Proper Zod schema usage
- [ ] Appropriate custom validators
- [ ] Clear validation error messages
- [ ] Comprehensive input checking

**Error Handling (A-F)**
- [ ] Consistent exception throwing
- [ ] Clear error messages
- [ ] Proper debug logging
- [ ] YAML response formatting

**Consistency (A-F)**
- [ ] Follows established patterns
- [ ] Uses standard configurations
- [ ] Matches reference implementations
- [ ] Adheres to naming conventions

### Quality Targets

- **A Grade:** Reference implementation quality (like FillsHandler)
- **B Grade:** Good implementation with minor improvements needed
- **C Grade:** Functional but requires refactoring
- **Below C:** Immediate refactoring required

### Improvement Process

1. **Identify Issues:** Compare against reference implementations
2. **Plan Refactoring:** Follow established patterns
3. **Implement Changes:** Use UnifiedHandler pattern
4. **Test Thoroughly:** Maintain existing functionality
5. **Document Patterns:** Update this guide as needed

## Evolution Timeline

### Legacy Era
- Mixed patterns and inconsistent approaches
- Custom communication logic per handler
- Inconsistent error handling

### Transition Era
- Introduction of UnifiedHandler
- Gradual adoption across handlers
- Mixed legacy and modern patterns

### Modern Era (Current)
- 95% UnifiedHandler adoption
- Consistent parameter patterns
- Standardized bulk operations
- Unified error handling approaches

## Next Steps

1. **For New Handlers:** Always use FillsHandler as your template
2. **For Complex Handlers:** Study VariablesHandler patterns
3. **For Refactoring:** Follow the quality guidelines above
4. **For Maintenance:** Keep this document updated with new patterns

This pattern guide ensures consistent, maintainable, and high-quality handler implementations across the entire MCP server codebase.