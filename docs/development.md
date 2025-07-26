# Development

Technical reference for contributors.

## Architecture

### Server Components
- **MCP Server** (`src/`): Handles tool registration and Claude communication
- **WebSocket Bridge** (`src/services/websocket.ts`): Connects to Figma plugin
- **Handlers** (`src/handlers/`): Tool implementations organized by domain
- **Font Database** (`src/services/font-database.ts`): SQLite-based font search

### Plugin Components
- **Main Thread** (`figma-plugin/src/`): Figma API access, no browser APIs
- **UI Thread** (`figma-plugin/ui/`): Browser APIs, no Figma access
- **Operations** (`figma-plugin/src/operations/`): Auto-discovered handlers

### Communication Flow
```
Claude → MCP Server → WebSocket → UI Thread → Main Plugin Thread → Figma API
```

## Adding Features

### New Operation
1. Create handler in `figma-plugin/src/operations/my-operation.ts`:
```typescript
export async function MY_OPERATION(payload: {param: string}): Promise<any> {
  // Access Figma API here
  const node = figma.createRectangle();
  node.name = payload.param;
  return { id: node.id };
}
```

2. Add MCP method in appropriate handler:
```typescript
async myNewTool(args: {param: string}): Promise<string> {
  const result = await this.executeOperation('MY_OPERATION', args);
  return formatYamlResponse(result);
}
```

3. Register in `getTools()`:
```typescript
{
  name: 'my_new_tool',
  description: 'Does something new',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Parameter description' }
    },
    required: ['param']
  }
}
```

### Handler Organization
- `geometry-handler.ts`: Shapes, fills, strokes, effects
- `text-handler.ts`: Text creation and styling
- `layout-handler.ts`: Auto layout, constraints, alignment
- `design-system-handler.ts`: Styles, components, variables
- `advanced-handler.ts`: Boolean ops, vectors, exports
- `system-handler.ts`: Plugin status, diagnostics

## Key Patterns

### Figma Property Updates
```typescript
// WRONG - Direct mutation doesn't trigger updates
node.fills.push(newFill);

// CORRECT - Clone, modify, reassign
import { modifyFills } from '../utils/figma-property-utils.js';
modifyFills(node, manager => {
  manager.push(newFill);
});
```

### Binary Data
```typescript
// Main thread - no atob/btoa available
figma.ui.postMessage({ 
  type: 'DECODE_BASE64',
  data: base64String 
});

// UI thread - has browser APIs
if (msg.type === 'DECODE_BASE64') {
  const bytes = atob(msg.data);
  // Process bytes...
}
```

### Error Handling
```typescript
// In operations
throw new Error('Specific error message');

// In handlers
try {
  const result = await this.executeOperation(...);
  return formatYamlResponse(result);
} catch (error) {
  throw error; // Let MCP handle it
}
```

## Testing

### Unit Tests
```bash
npm run test:unit
```
- Test individual functions
- Mock Figma API
- Located in `tests/unit/`

### Integration Tests
```bash
npm run test:integration
```
- Test full tool flow
- Mock WebSocket connection
- Located in `tests/integration/`

### Manual Testing
```bash
npm run test:manual
```
Provides step-by-step testing guide.

## Build System

### Development
```bash
npm run dev        # Watch mode
npm run dev:plugin # Plugin only
npm run dev:server # Server only
```

### Production
```bash
npm run build      # Build all
npm run build:plugin
npm run build:server
```

### Plugin Build Process
1. TypeScript compilation
2. Inline CSS into HTML
3. Bundle with esbuild
4. Copy manifest.json

## Common Issues

### WebSocket Connection Failed
- Ensure plugin is running in Figma
- Check port isn't blocked (default: 8765)
- Verify no other instances running

### Operation Not Found
- Operation name must match export name
- File must be in `operations/` directory
- Check for typos in UPPER_SNAKE_CASE

### Figma API Errors
- Some properties are read-only
- Parent constraints affect operations
- Check node type compatibility

### Type Errors
- Use `figma.d.ts` for API types
- Import from `@figma/plugin-typings`
- Check for null/undefined nodes

## Performance

### Batch Operations
- Combine multiple updates in single operation
- Use `figma.commitUndo()` for atomic changes
- Minimize plugin<->UI communication

### Large Selections
- Process in chunks for 100+ nodes
- Show progress for long operations
- Use `figma.currentPage.selection` efficiently

### Font Database
- SQLite indexes on family, style, weight
- Cached for 24 hours by default
- Background sync to avoid blocking

## Release Process

1. Update version in `package.json`
2. Run tests: `npm test`
3. Build: `npm run build`
4. Update CHANGELOG.md
5. Commit with format:
```
type: description (vX.X.X)

- Change 1
- Change 2

Designed with ❤️ by oO. Coded with ✨ by Claude Sonnet 4
Co-authored-by: Claude.AI <noreply@anthropic.com>
```