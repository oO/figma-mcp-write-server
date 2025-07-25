import { ToolHandler, Tool } from '../types/index.js';
import { UnifiedHandler, UnifiedHandlerConfig, UnifiedParamConfigs } from '../utils/unified-handler.js';
import { FontOperationsSchema } from '../types/font-operations.js';
import { FontService } from '../services/font-service.js';

export class FontsHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;
  private fontServiceAccessor: (() => FontService | null) | undefined;

  constructor(sendToPluginFn: (request: any) => Promise<any>, fontServiceAccessor?: () => FontService | null) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
    this.fontServiceAccessor = fontServiceAccessor;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_fonts',
        description: 'Search, check availability, validate, and manage fonts in the Figma document',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['search_fonts', 'check_availability', 'get_missing', 'get_font_styles', 'validate_font', 'get_font_info', 'preload_fonts', 'get_project_fonts', 'get_font_count'], 
              description: 'Font operation to perform'
            },
            query: {
              type: 'string',
              description: 'Search query for font families. Supports wildcards (*) for partial matching (for search_fonts operation)'
            },
            source: {
              type: 'string',
              enum: ['google', 'system', 'custom'],
              description: 'Font source filter (for search_fonts operation)'
            },
            includeGoogle: {
              type: 'boolean',
              description: 'Include Google Fonts in search results (default: true)'
            },
            includeSystem: {
              type: 'boolean',
              description: 'Include system fonts in search results (default: true)'
            },
            includeCustom: {
              type: 'boolean',
              description: 'Include custom fonts in search results (default: true)'
            },
            hasStyle: {
              type: 'string',
              description: 'Filter fonts that have a specific style (e.g., Bold, Italic)'
            },
            minStyleCount: {
              type: 'number',
              minimum: 1,
              description: 'Filter fonts with minimum number of styles'
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
              description: 'Sort order for search results (default: alphabetical)'
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
              description: 'Font style(s) - single string or array for bulk operations'
            },
            fallbackSuggestions: {
              type: 'boolean',
              description: 'Include suggested alternative fonts for missing fonts (default: false)'
            },
            includeUnused: {
              type: 'boolean',
              description: 'Include unused fonts in project font listing (default: false)'
            },
            failFast: {
              type: 'boolean',
              description: 'Stop on first error in bulk operations (default: false)'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "search_fonts", "query": "Inter", "limit": 10}',
          '{"operation": "search_fonts", "query": "Hel*", "limit": 10}',
          '{"operation": "search_fonts", "source": "google", "minStyleCount": 5, "sortBy": "style_count"}',
          '{"operation": "check_availability", "fontFamily": "Inter", "fontStyle": "Regular"}',
          '{"operation": "check_availability", "fontFamily": ["Inter", "Roboto"], "fontStyle": ["Regular", "Bold"]}',
          '{"operation": "check_availability", "fontFamily": "Inter", "fontStyle": ["Regular", "Bold", "Italic"]}',
          '{"operation": "check_availability", "fontFamily": ["Inter", "Roboto", "Open Sans"], "fontStyle": ["Regular", "Bold", "Regular"]}',
          '{"operation": "check_availability", "fontFamily": ["Inter", "Roboto"], "fontStyle": ["Regular", "Bold"], "failFast": true}',
          '{"operation": "get_missing", "fallbackSuggestions": true}',
          '{"operation": "get_font_styles", "fontFamily": "Inter"}',
          '{"operation": "validate_font", "fontFamily": "Inter", "fontStyle": "Regular"}',
          '{"operation": "get_font_info", "fontFamily": "Inter", "fontStyle": "Regular"}',
          '{"operation": "preload_fonts", "fontFamily": "Inter", "fontStyle": "Regular"}',
          '{"operation": "preload_fonts", "fontFamily": ["Inter", "Roboto"], "fontStyle": ["Regular", "Bold"]}',
          '{"operation": "preload_fonts", "fontFamily": "Inter", "fontStyle": ["Regular", "Bold", "Italic"]}',
          '{"operation": "preload_fonts", "fontFamily": ["Inter", "Roboto", "Open Sans"], "fontStyle": ["Regular", "Bold", "Regular"]}',
          '{"operation": "preload_fonts", "fontFamily": ["Inter", "Roboto"], "fontStyle": ["Regular", "Bold"], "failFast": true}',
          '{"operation": "get_project_fonts", "includeUnused": true}',
          '{"operation": "get_font_count"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_fonts') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_fonts',
      operation: 'fonts',
      bulkParams: ['fontFamily', 'fontStyle', 'query', 'source', 'hasStyle', 'minStyleCount', 'limit', 'sortBy', 'includeGoogle', 'includeSystem', 'includeCustom', 'fallbackSuggestions', 'includeUnused'],
      paramConfigs: {
        ...UnifiedParamConfigs.basic(),
        fontFamily: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        fontStyle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
        query: { expectedType: 'string' as const },
        source: { expectedType: 'string' as const },
        includeGoogle: { expectedType: 'boolean' as const },
        includeSystem: { expectedType: 'boolean' as const },
        includeCustom: { expectedType: 'boolean' as const },
        hasStyle: { expectedType: 'string' as const },
        minStyleCount: { expectedType: 'number' as const },
        limit: { expectedType: 'number' as const },
        sortBy: { expectedType: 'string' as const },
        fallbackSuggestions: { expectedType: 'boolean' as const },
        includeUnused: { expectedType: 'boolean' as const }
      },
      pluginMessageType: 'MANAGE_FONTS',
      schema: FontOperationsSchema,
      // Use custom handler for database-eligible operations
      customHandler: this.isDatabaseEligible(args.operation) 
        ? (validatedArgs: any) => this.handleWithFontService(validatedArgs)
        : undefined,
      operationParameters: {
        search_fonts: ['query', 'source', 'includeGoogle', 'includeSystem', 'includeCustom', 'hasStyle', 'minStyleCount', 'limit', 'sortBy', 'failFast'],
        check_availability: ['fontFamily', 'fontStyle', 'failFast'],
        get_missing: ['fallbackSuggestions', 'failFast'],
        get_font_styles: ['fontFamily', 'failFast'],
        validate_font: ['fontFamily', 'fontStyle', 'failFast'],
        get_font_info: ['fontFamily', 'fontStyle', 'failFast'],
        preload_fonts: ['fontFamily', 'fontStyle', 'failFast'],
        get_project_fonts: ['includeUnused', 'failFast'],
        get_font_count: ['failFast']
      }
    };

    return this.unifiedHandler.handle(args, config);
  }

  private isDatabaseEligible(operation: string): boolean {
    // Operations that benefit from database optimization
    return ['search_fonts', 'get_font_count', 'check_availability', 'get_font_styles', 'validate_font', 'get_font_info'].includes(operation);
  }

  private async handleWithFontService(args: any): Promise<any> {
    const fontService = this.fontServiceAccessor?.();
    if (!fontService) {
      throw new Error('FontService not available');
    }

    switch (args.operation) {
      case 'search_fonts':
        return await fontService.searchFonts({
          query: args.query,
          source: args.source,
          includeGoogle: args.includeGoogle,
          includeSystem: args.includeSystem,
          includeCustom: args.includeCustom,
          hasStyle: args.hasStyle,
          minStyleCount: args.minStyleCount,
          limit: args.limit,
          sortBy: args.sortBy
        });
      
      case 'get_font_count':
        return await fontService.getFontCount({
          countSource: args.source,
          countHasStyle: args.hasStyle
        });

      case 'check_availability':
        const fontNames = this.prepareFontNamesForCheck(args);
        return await fontService.checkFontAvailability(fontNames, {
          fallbackSuggestions: args.fallbackSuggestions
        });

      case 'get_font_styles':
        return await fontService.getFontStyles(args.fontFamily);

      case 'validate_font':
        return await fontService.validateFont(args.fontFamily, args.fontStyle, {
          strict: args.strict,
          fallbackSuggestions: args.fallbackSuggestions
        });

      case 'get_font_info':
        return await fontService.getFontInfo(args.fontFamily, args.fontStyle);
        
      default:
        throw new Error(`FontService operation ${args.operation} not implemented`);
    }
  }

  private prepareFontNamesForCheck(args: any): Array<{ family: string; style: string }> {
    // Handle array parameters - prepare font name pairs
    const families = Array.isArray(args.fontFamily) ? args.fontFamily : [args.fontFamily];
    const styles = Array.isArray(args.fontStyle) ? args.fontStyle : [args.fontStyle];
    
    const maxLength = Math.max(families.length, styles.length);
    const fontNames = [];
    
    for (let i = 0; i < maxLength; i++) {
      const family = families[i] || families[families.length - 1];
      const style = styles[i] || styles[styles.length - 1];
      fontNames.push({ family, style });
    }
    
    return fontNames;
  }

}