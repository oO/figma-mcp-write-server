# Parameter Debugging Checklist

When encountering parameter-related issues (e.g., "Unknown parameter", parameters being stripped, validation errors), check these locations in order:

## 1. Handler Tool Schema (`src/handlers/*-handler.ts`)
- Check `getTools()` method - defines JSON Schema for MCP tool
- Look for the parameter in `properties` object
- Verify parameter type definition (string, array, oneOf, etc.)
- Check if parameter is in the `examples` array

## 2. Zod Type Schema (`src/types/*-operations.ts`)
- Find the corresponding schema (e.g., `UnifiedNodeOperationsSchema`)
- **CRITICAL**: Ensure ALL parameters are defined here
- Missing parameters here = stripped by validation
- Check parameter types match handler schema

## 3. UnifiedHandler Configuration (in handler's `handle()` method)
- **paramConfigs**: Defines expected types and transformations
  - `expectedType`: 'string', 'array', 'number', 'boolean'
  - `arrayItemType`: for array parameters
  - `allowSingle`: allows single value to be treated as array
- **bulkParams**: Array of parameter names that trigger bulk operations
  - Empty array `[]` = no bulk operations
  - Parameters listed here will split operations
- **operationParameters**: Maps operations to allowed parameters
  - Each operation lists its valid parameters
  - Parameters not listed = rejected for that operation

## 4. Plugin Operation Handler (`figma-plugin/src/operations/*.ts`)
- Check the actual operation implementation
- Verify parameter is extracted and used
- Look for parameter validation or defaults

## 5. Common Issues and Solutions

### "Unknown parameter" Error
1. Check if parameter is in Zod schema (#2)
2. Check if parameter is in operationParameters (#3)
3. Check if parameter name matches exactly (case-sensitive)

### Parameter Being Stripped
1. Missing from Zod schema (#2) - most common cause
2. Wrong type in paramConfigs (#3)

### Bulk Operation Issues
1. Check bulkParams array (#3)
2. Parameters for filtering should NOT be in bulkParams
3. Only parameters that vary per operation go in bulkParams

### Type Validation Errors
1. Check JSON Schema type (#1) matches Zod type (#2)
2. Check paramConfigs expectedType (#3)
3. Verify allowSingle is set for single-or-array params

## 6. Testing Checklist
- Add test cases for new parameters
- Test single value and array values if applicable
- Test parameter validation rejection
- Test parameter in combination with others

## 7. Quick Debug Commands
```bash
# Search for parameter definition across codebase
grep -r "parameterName" src/

# Check handler file for all parameter locations
grep -n "parameterName" src/handlers/specific-handler.ts

# Check type definitions
grep -n "parameterName" src/types/*-operations.ts
```

## 8. Parameter Flow Diagram
```
MCP Client Request
    ↓
Handler Tool Schema (JSON Schema validation)
    ↓
Zod Schema Validation (strips unknown params!)
    ↓
UnifiedHandler paramConfigs (type transformation)
    ↓
bulkParams check (splits into multiple operations?)
    ↓
operationParameters check (allowed for this operation?)
    ↓
Plugin Operation Handler (actual execution)
```

Remember: A parameter must be defined at EVERY layer to work correctly!