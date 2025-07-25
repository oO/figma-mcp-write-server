import { ManageTextSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';

export class TextHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_text',
        description: 'Create, update, format text nodes with advanced typography features including character-level styling, text editing (insert/delete), text search, hyperlinks, and advanced text decoration',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'get', 'delete', 'set_range', 'get_range', 'delete_range', 'insert_text', 'delete_text', 'search_text'],
              description: 'Text operation to perform (case-insensitive: create, update, get, delete, set_range, get_range, delete_range, insert_text, delete_text, search_text)'
            },
            nodeId: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Text node ID(s) for update/styling operations - single string or array for bulk operations. For search_text operation, omit this parameter to perform global search across all text nodes in the document.'
            },
            parentId: {
              type: 'string',
              description: 'Optional parent container ID for create operations. When provided, the text node will be created inside this container and coordinates will be relative to the parent.'
            },
            characters: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Text content(s) - single string or array for bulk operations'
            },
            x: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'X position(s) - single number or array for bulk operations'
            },
            y: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Y position(s) - single number or array for bulk operations'
            },
            name: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Node name(s) - single string or array for bulk operations'
            },
            width: {
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'Text node width(s) in pixels - single number or array for bulk operations'
            },
            height: {
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'Text node height(s) in pixels - single number or array for bulk operations'
            },
            fontSize: {
              oneOf: [
                { type: 'number', minimum: 1, maximum: 400 },
                { type: 'array', items: { type: 'number', minimum: 1, maximum: 400 } }
              ],
              description: 'Font size(s) in pixels - single number or array for bulk operations'
            },
            fontFamily: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Font family name(s) - single string or array for bulk operations'
            },
            fontStyle: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Font style(s) (e.g., Regular, Bold, Italic) - single string or array for bulk operations'
            },
            fillColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Text color(s) in hex format - single string or array for bulk operations'
            },
            textCase: {
              oneOf: [
                { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] },
                { type: 'array', items: { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] } }
              ],
              description: 'Text case transformation(s) (case-insensitive: ORIGINAL, UPPER, LOWER, TITLE) - single value or array for bulk operations'
            },
            textDecoration: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] } }
              ],
              description: 'Text decoration(s) (case-insensitive: NONE, UNDERLINE, STRIKETHROUGH) - single value or array for bulk operations'
            },
            textDecorationStyle: {
              oneOf: [
                { type: 'string', enum: ['SOLID', 'WAVY', 'DOTTED'] },
                { type: 'array', items: { type: 'string', enum: ['SOLID', 'WAVY', 'DOTTED'] } }
              ],
              description: 'Text decoration style(s) (case-insensitive: SOLID, WAVY, DOTTED) - single value or array for bulk operations'
            },
            textDecorationOffset: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Text decoration offset value(s) - single number or array for bulk operations'
            },
            textDecorationOffsetUnit: {
              oneOf: [
                { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] },
                { type: 'array', items: { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] } }
              ],
              description: 'Text decoration offset unit(s) (case-insensitive: PIXELS, PERCENT, AUTO) - single value or array for bulk operations'
            },
            textDecorationThickness: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Text decoration thickness value(s) - single number or array for bulk operations'
            },
            textDecorationThicknessUnit: {
              oneOf: [
                { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] },
                { type: 'array', items: { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] } }
              ],
              description: 'Text decoration thickness unit(s) (case-insensitive: PIXELS, PERCENT, AUTO) - single value or array for bulk operations'
            },
            textDecorationColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Text decoration color(s) in hex format - single string or array for bulk operations'
            },
            textDecorationColorAuto: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Use automatic text decoration color (overrides textDecorationColor) - single boolean or array for bulk operations'
            },
            textDecorationSkipInk: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Skip text decoration over descenders - single boolean or array for bulk operations'
            },
            textAlignHorizontal: {
              oneOf: [
                { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] },
                { type: 'array', items: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] } }
              ],
              description: 'Horizontal text alignment(s) (case-insensitive: LEFT, CENTER, RIGHT, JUSTIFIED) - single value or array for bulk operations'
            },
            textAlignVertical: {
              oneOf: [
                { type: 'string', enum: ['TOP', 'CENTER', 'BOTTOM'] },
                { type: 'array', items: { type: 'string', enum: ['TOP', 'CENTER', 'BOTTOM'] } }
              ],
              description: 'Vertical text alignment(s) (case-insensitive: TOP, CENTER, BOTTOM) - single value or array for bulk operations'
            },
            textAutoResize: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'] } }
              ],
              description: 'Auto resize behavior(s) (case-insensitive: NONE, WIDTH_AND_HEIGHT, HEIGHT, TRUNCATE) - single value or array for bulk operations'
            },
            textTruncation: {
              oneOf: [
                { type: 'string', enum: ['DISABLED', 'ENDING'] },
                { type: 'array', items: { type: 'string', enum: ['DISABLED', 'ENDING'] } }
              ],
              description: 'Text truncation behavior(s) (case-insensitive: DISABLED, ENDING) - ENDING adds ellipsis when text exceeds bounds - single value or array for bulk operations'
            },
            maxLines: {
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'Maximum lines before truncation (requires textTruncation: ENDING) - single number or array for bulk operations'
            },
            letterSpacing: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Letter spacing value(s) in pixels - single number or array for bulk operations'
            },
            lineHeight: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Line height value(s) in pixels - single number or array for bulk operations'
            },
            paragraphSpacing: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Paragraph spacing value(s) in pixels - single number or array for bulk operations'
            },
            paragraphIndent: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Paragraph indent value(s) in pixels - single number or array for bulk operations'
            },
            // Character range parameters for character_styling operation
            rangeStart: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Character range start position(s) - single number or array for bulk operations'
            },
            rangeEnd: {
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'Character range end position(s) - single number or array for bulk operations'
            },
            rangeFontSize: {
              oneOf: [
                { type: 'number', minimum: 1, maximum: 400 },
                { type: 'array', items: { type: 'number', minimum: 1, maximum: 400 } }
              ],
              description: 'Font size(s) for character ranges - single number or array for bulk operations'
            },
            rangeFontFamily: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Font family name(s) for character ranges - single string or array for bulk operations'
            },
            rangeFontStyle: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Font style(s) for character ranges - single string or array for bulk operations'
            },
            rangeTextCase: {
              oneOf: [
                { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] },
                { type: 'array', items: { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] } }
              ],
              description: 'Text case(s) for character ranges (case-insensitive: ORIGINAL, UPPER, LOWER, TITLE) - single value or array for bulk operations'
            },
            rangeTextDecoration: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] } }
              ],
              description: 'Text decoration(s) for character ranges (case-insensitive: NONE, UNDERLINE, STRIKETHROUGH) - single value or array for bulk operations'
            },
            rangeTextDecorationStyle: {
              oneOf: [
                { type: 'string', enum: ['SOLID', 'WAVY', 'DOTTED'] },
                { type: 'array', items: { type: 'string', enum: ['SOLID', 'WAVY', 'DOTTED'] } }
              ],
              description: 'Text decoration style(s) for character ranges (case-insensitive: SOLID, WAVY, DOTTED) - single value or array for bulk operations'
            },
            rangeTextDecorationOffset: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Text decoration offset value(s) for character ranges - single number or array for bulk operations'
            },
            rangeTextDecorationOffsetUnit: {
              oneOf: [
                { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] },
                { type: 'array', items: { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] } }
              ],
              description: 'Text decoration offset unit(s) for character ranges (case-insensitive: PIXELS, PERCENT, AUTO) - single value or array for bulk operations'
            },
            rangeTextDecorationThickness: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Text decoration thickness value(s) for character ranges - single number or array for bulk operations'
            },
            rangeTextDecorationThicknessUnit: {
              oneOf: [
                { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] },
                { type: 'array', items: { type: 'string', enum: ['PIXELS', 'PERCENT', 'AUTO'] } }
              ],
              description: 'Text decoration thickness unit(s) for character ranges (case-insensitive: PIXELS, PERCENT, AUTO) - single value or array for bulk operations'
            },
            rangeTextDecorationColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Text decoration color(s) for character ranges in hex format - single string or array for bulk operations'
            },
            rangeTextDecorationColorAuto: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Use automatic text decoration color for character ranges (overrides rangeTextDecorationColor) - single boolean or array for bulk operations'
            },
            rangeTextDecorationSkipInk: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Skip text decoration over descenders for character ranges - single boolean or array for bulk operations'
            },
            rangeLetterSpacing: {
              oneOf: [
                { type: 'number' },
                { type: 'array', items: { type: 'number' } }
              ],
              description: 'Letter spacing value(s) for character ranges - single number or array for bulk operations'
            },
            rangeFillColor: {
              oneOf: [
                { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                { type: 'array', items: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' } }
              ],
              description: 'Fill color(s) for character ranges in hex format - single string or array for bulk operations'
            },
            rangeHyperlinkType: {
              oneOf: [
                { type: 'string', enum: ['URL', 'NODE'] },
                { type: 'array', items: { type: 'string', enum: ['URL', 'NODE'] } }
              ],
              description: 'Hyperlink type(s) for character ranges (case-insensitive: URL, NODE) - single value or array for bulk operations'
            },
            rangeHyperlinkValue: {
              oneOf: [
                { type: 'string' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Hyperlink value(s) for character ranges (URL or node ID) - single string or array for bulk operations'
            },
            // List parameters
            listType: {
              oneOf: [
                { type: 'string', enum: ['ORDERED', 'UNORDERED', 'NONE'] },
                { type: 'array', items: { type: 'string', enum: ['ORDERED', 'UNORDERED', 'NONE'] } }
              ],
              description: 'List type(s) (case-insensitive: ORDERED, UNORDERED, NONE) - ORDERED (numbered), UNORDERED (bulleted), NONE (plain text) - single value or array for bulk operations'
            },
            listSpacing: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Vertical distance between list items in pixels - single number or array for bulk operations'
            },
            hangingPunctuation: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Enable quotation marks hanging outside text box - single boolean or array for bulk operations'
            },
            hangingList: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Enable list bullets/numbers hanging outside text box - single boolean or array for bulk operations'
            },
            leadingTrim: {
              oneOf: [
                { type: 'string', enum: ['NONE', 'CAP_HEIGHT', 'BASELINE', 'BOTH'] },
                { type: 'array', items: { type: 'string', enum: ['NONE', 'CAP_HEIGHT', 'BASELINE', 'BOTH'] } }
              ],
              description: 'Leading trim behavior (case-insensitive: NONE, CAP_HEIGHT, BASELINE, BOTH) - removes vertical space above/below text glyphs - single value or array for bulk operations'
            },
            autoRename: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Enable automatic layer renaming based on text content - single boolean or array for bulk operations'
            },
            // Text editing parameters
            insertPosition: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Position(s) to insert text at (0-based index) - single number or array for bulk operations'
            },
            insertText: {
              oneOf: [
                { type: 'string', minLength: 1 },
                { type: 'array', items: { type: 'string', minLength: 1 } }
              ],
              description: 'Text content(s) to insert - single string or array for bulk operations'
            },
            insertUseStyle: {
              oneOf: [
                { type: 'string', enum: ['BEFORE', 'AFTER'] },
                { type: 'array', items: { type: 'string', enum: ['BEFORE', 'AFTER'] } }
              ],
              description: 'Style inheritance for inserted text (case-insensitive: BEFORE uses style from preceding character, AFTER uses style from following character) - single value or array for bulk operations'
            },
            deleteStart: {
              oneOf: [
                { type: 'number', minimum: 0 },
                { type: 'array', items: { type: 'number', minimum: 0 } }
              ],
              description: 'Start position(s) for text deletion (0-based index, inclusive) - single number or array for bulk operations'
            },
            deleteEnd: {
              oneOf: [
                { type: 'number', minimum: 1 },
                { type: 'array', items: { type: 'number', minimum: 1 } }
              ],
              description: 'End position(s) for text deletion (0-based index, exclusive) - single number or array for bulk operations'
            },
            // Text search parameters
            searchQuery: {
              oneOf: [
                { type: 'string', minLength: 1 },
                { type: 'array', items: { type: 'string', minLength: 1 } }
              ],
              description: 'Text search query string(s) to find within text content - single string or array for bulk operations'
            },
            searchCaseSensitive: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Whether search should be case-sensitive (default: false) - single boolean or array for bulk operations'
            },
            searchWholeWord: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'boolean' } }
              ],
              description: 'Whether to match whole words only (default: false) - single boolean or array for bulk operations'
            },
            searchMaxResults: {
              oneOf: [
                { type: 'number', minimum: 1, maximum: 1000 },
                { type: 'array', items: { type: 'number', minimum: 1, maximum: 1000 } }
              ],
              description: 'Maximum number of search results to return per text node (default: 100) - single number or array for bulk operations'
            },
            // Note: OpenType features (ligatures, kerning) are read-only in Figma Plugin API
            failFast: {
              type: 'boolean',
              description: 'Stop on first error in bulk operations (default: false)'
            }
          },
          required: ['operation']
        },
        examples: [
          // Basic text creation
          '{"operation": "create", "characters": "Hello World", "fontSize": 24, "fontFamily": "Inter", "fontStyle": "Bold"}',
          '{"operation": "create", "characters": "Styled Text", "x": 100, "y": 100, "fillColor": "#FF5733", "textCase": "UPPER"}',
          
          // Advanced text decoration
          '{"operation": "create", "characters": "Underlined Text", "textDecoration": "UNDERLINE", "textDecorationStyle": "WAVY", "textDecorationColor": "#0000FF", "textDecorationThickness": 2, "textDecorationThicknessUnit": "PIXELS"}',
          '{"operation": "create", "characters": "Dotted Underline", "textDecoration": "UNDERLINE", "textDecorationStyle": "DOTTED", "textDecorationOffset": 5, "textDecorationOffsetUnit": "PIXELS", "textDecorationSkipInk": true}',
          '{"operation": "create", "characters": "Fixed Size Text", "width": 200, "height": 100, "textAutoResize": "NONE"}',
          '{"operation": "create", "characters": "Truncated Text", "width": 150, "textTruncation": "ENDING", "maxLines": 3}',
          
          // Text updates and formatting
          '{"operation": "update", "nodeId": "123:456", "characters": "Updated Text", "fontSize": 18}',
          '{"operation": "update", "nodeId": "123:456", "width": 300, "height": 150}',
          '{"operation": "update", "nodeId": "123:456", "textAlignHorizontal": "CENTER", "letterSpacing": 2}',
          
          // Range-based styling with flattened parameters
          '{"operation": "set_range", "nodeId": "123:456", "rangeStart": 0, "rangeEnd": 5, "rangeFontSize": 20, "rangeTextDecoration": "UNDERLINE"}',
          '{"operation": "set_range", "nodeId": "123:456", "rangeStart": [0, 6], "rangeEnd": [5, 11], "rangeFontSize": [20, 16], "rangeFillColor": ["#FF0000", "#0000FF"]}',
          
          // Advanced range text decoration
          '{"operation": "set_range", "nodeId": "123:456", "rangeStart": 0, "rangeEnd": 8, "rangeTextDecoration": "UNDERLINE", "rangeTextDecorationStyle": "WAVY", "rangeTextDecorationColor": "#FF0000", "rangeTextDecorationThickness": 3, "rangeTextDecorationThicknessUnit": "PIXELS"}',
          '{"operation": "set_range", "nodeId": "123:456", "rangeStart": 10, "rangeEnd": 15, "rangeTextDecoration": "STRIKETHROUGH", "rangeTextDecorationStyle": "DOTTED", "rangeTextDecorationColorAuto": true, "rangeTextDecorationSkipInk": false}',
          '{"operation": "set_range", "nodeId": "123:456", "rangeStart": 0, "rangeEnd": 12, "rangeHyperlinkType": "URL", "rangeHyperlinkValue": "https://example.com"}',
          '{"operation": "set_range", "nodeId": "123:456", "rangeStart": 0, "rangeEnd": 5, "rangeHyperlinkType": "NODE", "rangeHyperlinkValue": "789:123"}',
          
          // Get range styling
          '{"operation": "get_range", "nodeId": "123:456"}',
          '{"operation": "get_range", "nodeId": "123:456", "rangeStart": 0, "rangeEnd": 5}',
          
          // Delete range styling
          '{"operation": "delete_range", "nodeId": "123:456"}',
          '{"operation": "delete_range", "nodeId": "123:456", "rangeStart": 0, "rangeEnd": 5}',
          
          
          // Advanced text features with flattened parameters
          '{"operation": "create", "characters": "Paragraph Text", "paragraphSpacing": 16, "lineHeight": 24, "textAutoResize": "WIDTH_AND_HEIGHT"}',
          '{"operation": "create", "characters": "Ordered List Item", "listType": "ORDERED", "listSpacing": 8, "hangingList": true}',
          '{"operation": "create", "characters": "Refined Typography", "hangingPunctuation": true, "leadingTrim": "BOTH", "autoRename": false}',
          '{"operation": "create", "characters": "Link Text", "hyperlinkType": "URL", "hyperlinkUrl": "https://example.com"}',
          '{"operation": "create", "characters": "Text with fills", "fillType": "SOLID", "fillOpacity": 0.8, "fillVisible": true}',
          
          // Bulk operations
          '{"operation": "create", "characters": ["Text 1", "Text 2"], "fontSize": [24, 18], "fillColor": ["#FF0000", "#00FF00"]}',
          '{"operation": "update", "nodeId": ["123:456", "123:789"], "textCase": ["UPPER", "LOWER"], "textDecoration": ["UNDERLINE", "NONE"]}',
          
          // Content retrieval
          '{"operation": "get", "nodeId": "123:456"}',
          
          // Delete text nodes
          '{"operation": "delete", "nodeId": "123:456"}',
          '{"operation": "delete", "nodeId": ["123:456", "123:789"]}',
          
          // Text editing operations
          '{"operation": "insert_text", "nodeId": "123:456", "insertPosition": 5, "insertText": " inserted", "insertUseStyle": "BEFORE"}',
          '{"operation": "insert_text", "nodeId": ["123:456", "123:789"], "insertPosition": [0, 10], "insertText": ["Prefix: ", " - suffix"], "insertUseStyle": ["AFTER", "BEFORE"]}',
          '{"operation": "delete_text", "nodeId": "123:456", "deleteStart": 5, "deleteEnd": 10}',
          '{"operation": "delete_text", "nodeId": ["123:456", "123:789"], "deleteStart": [0, 5], "deleteEnd": [3, 8]}',
          
          // Text search operations
          '{"operation": "search_text", "nodeId": "123:456", "searchQuery": "hello"}',
          '{"operation": "search_text", "nodeId": "123:456", "searchQuery": "Hello", "searchCaseSensitive": true, "searchWholeWord": true}',
          '{"operation": "search_text", "nodeId": ["123:456", "123:789"], "searchQuery": ["hello", "world"], "searchMaxResults": [5, 10]}',
          '{"operation": "search_text", "searchQuery": "hello"}',
          '{"operation": "search_text", "searchQuery": "error", "searchCaseSensitive": true, "searchMaxResults": 50}',
          
          // Note: For text style operations, use figma_styles tool:
          // figma_styles create type="text" name="Heading 1" nodeId="123:456"
          // figma_styles apply nodeId="123:456" id="S:abc123"
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_text') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_text',
      operation: 'text',
      bulkParams: ['nodeId', 'characters', 'x', 'y', 'name', 'width', 'height', 'fontSize', 'fontFamily', 'fontStyle', 'fillColor', 'textCase', 'textDecoration', 'textDecorationStyle', 'textDecorationOffset', 'textDecorationOffsetUnit', 'textDecorationThickness', 'textDecorationThicknessUnit', 'textDecorationColor', 'textDecorationColorAuto', 'textDecorationSkipInk', 'textAlignHorizontal', 'textAlignVertical', 'textAutoResize', 'textTruncation', 'maxLines', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent', 'rangeStart', 'rangeEnd', 'rangeFontSize', 'rangeFontFamily', 'rangeFontStyle', 'rangeTextCase', 'rangeTextDecoration', 'rangeTextDecorationStyle', 'rangeTextDecorationOffset', 'rangeTextDecorationOffsetUnit', 'rangeTextDecorationThickness', 'rangeTextDecorationThicknessUnit', 'rangeTextDecorationColor', 'rangeTextDecorationColorAuto', 'rangeTextDecorationSkipInk', 'rangeLetterSpacing', 'rangeFillColor', 'rangeHyperlinkType', 'rangeHyperlinkValue', 'listType', 'listSpacing', 'hangingPunctuation', 'hangingList', 'leadingTrim', 'autoRename', 'insertPosition', 'insertText', 'insertUseStyle', 'deleteStart', 'deleteEnd', 'searchQuery', 'searchCaseSensitive', 'searchWholeWord', 'searchMaxResults'],
      paramConfigs: {
        ...UnifiedParamConfigs.withNodeId(),
        ...UnifiedParamConfigs.withPositioning(),
        parentId: { expectedType: 'string' as const },
        characters: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        width: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        height: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fontSize: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        fontFamily: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fontStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fillColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textCase: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecoration: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecorationStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecorationOffset: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        textDecorationOffsetUnit: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecorationThickness: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        textDecorationThicknessUnit: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecorationColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textDecorationColorAuto: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        textDecorationSkipInk: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        textAlignHorizontal: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textAlignVertical: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textAutoResize: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        textTruncation: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        maxLines: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        letterSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        lineHeight: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paragraphSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        paragraphIndent: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        // Character range parameters
        rangeStart: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rangeEnd: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rangeFontSize: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rangeFontFamily: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeFontStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextCase: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextDecoration: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextDecorationStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextDecorationOffset: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rangeTextDecorationOffsetUnit: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextDecorationThickness: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rangeTextDecorationThicknessUnit: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextDecorationColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeTextDecorationColorAuto: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        rangeTextDecorationSkipInk: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        rangeLetterSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        rangeFillColor: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeHyperlinkType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        rangeHyperlinkValue: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        // List parameters
        listType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        listSpacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        hangingPunctuation: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        hangingList: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        leadingTrim: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        autoRename: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        // Text editing parameters
        insertPosition: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        insertText: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        insertUseStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        deleteStart: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        deleteEnd: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
        
        // Text search parameters
        searchQuery: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        searchCaseSensitive: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        searchWholeWord: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
        searchMaxResults: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true }
      },
      pluginMessageType: 'MANAGE_TEXT',
      schema: ManageTextSchema,
      operationParameters: {
        create: ['characters', 'parentId', 'x', 'y', 'name', 'width', 'height', 'fontSize', 'fontFamily', 'fontStyle', 'fillColor', 'textCase', 'textDecoration', 'textDecorationStyle', 'textDecorationOffset', 'textDecorationOffsetUnit', 'textDecorationThickness', 'textDecorationThicknessUnit', 'textDecorationColor', 'textDecorationColorAuto', 'textDecorationSkipInk', 'textAlignHorizontal', 'textAlignVertical', 'textAutoResize', 'textTruncation', 'maxLines', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent', 'listType', 'listSpacing', 'hangingPunctuation', 'hangingList', 'leadingTrim', 'autoRename', 'failFast'],
        update: ['nodeId', 'characters', 'x', 'y', 'name', 'width', 'height', 'fontSize', 'fontFamily', 'fontStyle', 'fillColor', 'textCase', 'textDecoration', 'textDecorationStyle', 'textDecorationOffset', 'textDecorationOffsetUnit', 'textDecorationThickness', 'textDecorationThicknessUnit', 'textDecorationColor', 'textDecorationColorAuto', 'textDecorationSkipInk', 'textAlignHorizontal', 'textAlignVertical', 'textAutoResize', 'textTruncation', 'maxLines', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent', 'listType', 'listSpacing', 'hangingPunctuation', 'hangingList', 'leadingTrim', 'autoRename', 'failFast'],
        get: ['nodeId', 'failFast'],
        delete: ['nodeId', 'failFast'],
        set_range: ['nodeId', 'rangeStart', 'rangeEnd', 'rangeFontSize', 'rangeFontFamily', 'rangeFontStyle', 'rangeTextCase', 'rangeTextDecoration', 'rangeTextDecorationStyle', 'rangeTextDecorationOffset', 'rangeTextDecorationOffsetUnit', 'rangeTextDecorationThickness', 'rangeTextDecorationThicknessUnit', 'rangeTextDecorationColor', 'rangeTextDecorationColorAuto', 'rangeTextDecorationSkipInk', 'rangeLetterSpacing', 'rangeFillColor', 'rangeHyperlinkType', 'rangeHyperlinkValue', 'failFast'],
        get_range: ['nodeId', 'rangeStart', 'rangeEnd', 'failFast'],
        delete_range: ['nodeId', 'rangeStart', 'rangeEnd', 'failFast'],
        insert_text: ['nodeId', 'insertPosition', 'insertText', 'insertUseStyle', 'failFast'],
        delete_text: ['nodeId', 'deleteStart', 'deleteEnd', 'failFast'],
        search_text: ['searchQuery', 'nodeId', 'searchCaseSensitive', 'searchWholeWord', 'searchMaxResults', 'failFast'],
      },
      customHandler: async (normalizedArgs) => {
        // Send to plugin with the standard MANAGE_TEXT message type
        return this.unifiedHandler.sendPluginRequest({
          type: 'MANAGE_TEXT',
          payload: normalizedArgs
        });
      }
    };

    return this.unifiedHandler.handle(args, config);
  }

}