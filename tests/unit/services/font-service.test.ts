import { FontService } from '../../../src/services/font-service.js';

describe('FontService', () => {
  let fontService: FontService;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    fontService = new FontService(mockSendToPlugin);
  });

  describe('searchFonts', () => {
    it('should call plugin with correct parameters', async () => {
      const mockResponse = {
        fonts: [
          { family: 'Inter', source: 'google', styleCount: 2, availableStyles: ['Regular', 'Bold'], isLoaded: true }
        ],
        totalFound: 1,
        totalReturned: 1,
        hasMore: false,
        searchSummary: 'Found 1 font',
        searchCriteria: { appliedFilters: [], resultLimit: 20 }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.searchFonts({ query: 'Inter' });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: { operation: 'search_fonts', query: 'Inter' }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should pass filter options to plugin', async () => {
      const mockResponse = {
        fonts: [],
        totalFound: 0,
        totalReturned: 0,
        hasMore: false,
        searchSummary: 'No fonts found',
        searchCriteria: { appliedFilters: [], resultLimit: 20 }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await fontService.searchFonts({
        includeGoogle: true,
        includeSystem: false,
        query: 'Inter'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'search_fonts',
          includeGoogle: true,
          includeSystem: false,
          query: 'Inter'
        }
      });
    });
  });

  describe('getProjectFonts', () => {
    it('should call plugin with correct parameters', async () => {
      const mockResponse = {
        fonts: [
          { family: 'Inter', source: 'google', styleCount: 2, availableStyles: ['Regular', 'Bold'], isLoaded: true }
        ],
        totalUsed: 1,
        summary: 'Using 1 font family in project'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.getProjectFonts();

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: { operation: 'get_project_fonts' }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFontCount', () => {
    it('should call plugin with correct parameters', async () => {
      const mockResponse = {
        count: 50,
        source: 'google',
        summary: 'Found 50 fonts'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.getFontCount({ countSource: 'google' });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: { operation: 'get_font_count', countSource: 'google' }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMissingFonts', () => {
    it('should call plugin with correct parameters', async () => {
      const mockResponse = { missingFonts: [], suggestions: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.getMissingFonts({ fallbackSuggestions: true });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_missing',
          fallbackSuggestions: true
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFontStyles', () => {
    it('should call plugin with font family parameter', async () => {
      const mockResponse = ['Regular', 'Bold', 'Medium'];
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.getFontStyles('Inter');

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_font_styles',
          fontFamily: 'Inter'
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('checkFontAvailability', () => {
    it('should call plugin with font names', async () => {
      const fontNames = [
        { family: 'Inter', style: 'Regular' },
        { family: 'Arial', style: 'Bold' }
      ];
      const mockResponse = [
        { family: 'Inter', style: 'Regular', status: 'available' },
        { family: 'Arial', style: 'Bold', status: 'available' }
      ];
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.checkFontAvailability(fontNames);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'check_availability',
          fontNames
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateFont', () => {
    it('should call plugin with font family and style', async () => {
      const mockResponse = {
        isValid: true,
        fontName: { family: 'Inter', style: 'Bold' },
        status: 'available'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.validateFont('Inter', 'Bold', { strict: true });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'validate_font',
          fontFamily: 'Inter',
          fontStyle: 'Bold',
          strict: true
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFontInfo', () => {
    it('should call plugin with font family and style', async () => {
      const mockResponse = {
        family: 'Inter',
        style: 'Bold',
        status: 'available',
        category: 'google'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.getFontInfo('Inter', 'Bold');

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_font_info',
          fontFamily: 'Inter',
          fontStyle: 'Bold'
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('preloadFonts', () => {
    it('should call plugin with font names and options', async () => {
      const fontNames = [
        { family: 'Inter', style: 'Regular' },
        { family: 'Inter', style: 'Bold' }
      ];
      const mockResponse = {
        preloaded: fontNames,
        failed: [],
        priority: 'high'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.preloadFonts(fontNames, {
        priority: 'high',
        preloadCount: 2
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'preload_fonts',
          fontNames,
          priority: 'high',
          preloadCount: 2
        }
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('executeOperation', () => {
    it('should call plugin with raw payload', async () => {
      const payload = {
        operation: 'search_fonts',
        includeGoogle: true,
        query: 'Inter'
      };
      const mockResponse = [];
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await fontService.executeOperation(payload);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should propagate plugin errors', async () => {
      const error = new Error('Plugin communication failed');
      mockSendToPlugin.mockRejectedValue(error);

      await expect(fontService.searchFonts({ query: 'test' })).rejects.toThrow('Plugin communication failed');
    });
  });
});