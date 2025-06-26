import { FontOperationsSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { FontService } from '../services/font-service.js';
import * as yaml from 'js-yaml';

export class FontHandlers implements ToolHandler {
  private fontService: FontService;

  constructor(sendToPluginFn: (request: any) => Promise<any>, config?: { databasePath?: string; enableDatabase?: boolean }) {
    this.fontService = new FontService(sendToPluginFn, config);
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_fonts',
        description: 'Manage Figma fonts: search fonts intelligently, check availability, find missing fonts, get project fonts, get font count, get font styles, validate fonts, get font info, and preload fonts',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: [
                'search_fonts',
                'check_availability', 
                'get_missing',
                'get_font_styles',
                'validate_font',
                'get_font_info',
                'preload_fonts',
                'get_project_fonts',
                'get_font_count'
              ],
              description: 'Font management operation to perform'
            },
            fontFamily: {
              type: 'string',
              description: 'Font family name (for specific operations)'
            },
            fontStyle: {
              type: 'string',
              description: 'Font style name (for specific operations)'
            },
            fontNames: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  family: { type: 'string' },
                  style: { type: 'string' }
                },
                required: ['family', 'style']
              },
              description: 'Array of font names to check/preload'
            },
            includeGoogle: {
              type: 'boolean',
              description: 'Include Google Fonts in results'
            },
            includeSystem: {
              type: 'boolean', 
              description: 'Include system fonts in results'
            },
            includeCustom: {
              type: 'boolean',
              description: 'Include custom fonts in results'
            },
            // Search parameters for search_fonts
            query: {
              type: 'string',
              description: 'Text search query for font names'
            },
            source: {
              type: 'string',
              enum: ['system', 'google', 'custom'],
              description: 'Filter fonts by source type'
            },
            hasStyle: {
              type: 'string',
              description: 'Filter fonts that have specific style'
            },
            minStyleCount: {
              type: 'number',
              description: 'Minimum number of available styles'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              description: 'Maximum number of results to return (default: 20)'
            },
            sortBy: {
              type: 'string',
              enum: ['alphabetical', 'style_count', 'source'],
              description: 'Sort order for results'
            },
            // Count parameters for get_font_count
            countSource: {
              type: 'string',
              enum: ['system', 'google', 'custom'],
              description: 'Source filter for font count'
            },
            countHasStyle: {
              type: 'string',
              description: 'Style filter for font count'
            },
            preloadCount: {
              type: 'number',
              description: 'Number of fonts to preload'
            },
            priority: {
              type: 'string',
              enum: ['high', 'normal', 'low'],
              description: 'Priority for font preloading'
            },
            strict: {
              type: 'boolean',
              description: 'Use strict validation vs fuzzy matching'
            },
            fallbackSuggestions: {
              type: 'boolean',
              description: 'Provide fallback font suggestions'
            }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'figma_fonts':
        return this.manageFonts(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async manageFonts(args: any): Promise<any> {
    try {
      const validatedArgs = FontOperationsSchema.parse(args);
      
      let result: any;
      
      // Route to appropriate service method based on operation
      switch (validatedArgs.operation) {
        case 'search_fonts':
          result = await this.fontService.searchFonts(validatedArgs);
          break;
        case 'get_project_fonts':
          result = await this.fontService.getProjectFonts();
          break;
        case 'get_font_count':
          result = await this.fontService.getFontCount(validatedArgs);
          break;
        default:
          // For other operations, use the generic executeOperation
          result = await this.fontService.executeOperation(validatedArgs);
          break;
      }

      return {
        content: [{
          type: 'text',
          text: yaml.dump(result, { indent: 2, lineWidth: 100 })
        }],
        isError: false
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Font management failed: ${error.toString()}`);
      }
      throw new Error('Font management failed: Unknown error');
    }
  }
}