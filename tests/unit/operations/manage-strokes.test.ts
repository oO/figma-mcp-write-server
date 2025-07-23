import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleManageStrokes } from '../../../figma-plugin/src/operations/manage-strokes.js';

// Mock Figma API
const mockFigma = {
  getNodeById: vi.fn(),
  createRectangle: vi.fn(),
  createImageAsync: vi.fn(),
  createImage: vi.fn(),
  getImageByHash: vi.fn(),
  currentPage: {
    appendChild: vi.fn()
  }
};

// Mock node with strokes property
const createMockNode = (strokes: any[] = []) => ({
  id: 'test-node',
  strokes: strokes,
  type: 'RECTANGLE'
});

// Mock Paint objects
const createSolidPaint = (color = { r: 1, g: 0, b: 0 }, opacity = 1): SolidPaint => ({
  type: 'SOLID',
  color,
  opacity,
  visible: true,
  blendMode: 'NORMAL'
});

const createGradientPaint = (gradientType: string = 'GRADIENT_LINEAR'): GradientPaint => ({
  type: gradientType as any,
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientHandlePositions: [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0 }
  ],
  visible: true,
  opacity: 1,
  blendMode: 'NORMAL'
});

// Mock global figma object
(global as any).figma = mockFigma;

// Mock color-utils import with consistent return values
vi.mock('../../../figma-plugin/src/utils/color-utils.js', () => ({
  createSolidPaint: vi.fn((color) => createSolidPaint()),
  createGradientPaint: vi.fn(() => createGradientPaint()),
  validatePaint: vi.fn(() => true),
  clonePaint: vi.fn((paint) => ({ ...paint })),
  convertStopArrays: vi.fn((positions, colors) => [
    { position: positions[0], color: { r: 0, g: 1, b: 0, a: 1 } },
    { position: positions[1], color: { r: 1, g: 0, b: 1, a: 1 } }
  ]),
  convertFlattenedHandles: vi.fn(() => [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0 }
  ])
}));

// Mock figma-property-utils
vi.mock('../../../figma-plugin/src/utils/figma-property-utils.js', () => ({
  modifyStrokes: vi.fn((node, callback) => {
    const manager = {
      get: (index: number) => node.strokes[index],
      update: (index: number, paint: any) => {
        node.strokes[index] = paint;
      },
      push: (paint: any) => {
        node.strokes.push(paint);
      },
      remove: (index: number) => {
        node.strokes.splice(index, 1);
      },
      length: node.strokes.length
    };
    callback(manager);
  })
}));

// Mock stroke-validation
vi.mock('../../../figma-plugin/src/utils/stroke-validation.js', () => ({
  validateNodeForStrokes: vi.fn((nodeId) => {
    const node = mockFigma.getNodeById(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return { node, strokes: node.strokes };
  }),
  resolvePaintIndex: vi.fn((params, strokes) => {
    if (params.paintIndex === undefined) return 0;
    if (params.paintIndex < 0 || params.paintIndex >= strokes.length) {
      throw new Error(`Paint index ${params.paintIndex} out of bounds (0-${strokes.length - 1})`);
    }
    return params.paintIndex;
  }),
  validatePaintType: vi.fn(() => true),
  validateGradientStops: vi.fn(() => true)
}));

// Mock stroke-response
vi.mock('../../../figma-plugin/src/utils/stroke-response.js', () => ({
  createStrokeUpdateResponse: vi.fn((nodeId, paint, paintIndex, strokeProperties, totalPaints) => ({
    nodeId,
    paintIndex,
    updatedPaint: paint ? {
      type: paint.type,
      visible: paint.visible,
      opacity: paint.opacity,
      blendMode: paint.blendMode,
      ...(paint.type === 'SOLID' && { color: paint.color }),
      ...(paint.type.startsWith('GRADIENT_') && {
        gradientStops: "rgb(0,255,0) 0%, rgb(255,0,255) 100%",
        gradientStartX: 0,
        gradientStartY: 0,
        gradientEndX: 1,
        gradientEndY: 1,
        gradientScale: 1.414
      })
    } : undefined,
    totalPaints,
    operation: 'update'
  }))
}));

// Mock other utilities
vi.mock('../../../figma-plugin/src/utils/paint-properties.js', () => ({
  applyCommonPaintProperties: vi.fn(() => {}),
}));

vi.mock('../../../figma-plugin/src/utils/node-utils.js', () => ({
  cleanEmptyPropertiesAsync: vi.fn((data) => Promise.resolve(data))
}));

describe('Stroke Gradient Type Change Bug Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('update_gradient operation', () => {
    it('should update gradient type from LINEAR to RADIAL', async () => {
      // Create node with LINEAR gradient stroke
      const linearGradientPaint = createGradientPaint('GRADIENT_LINEAR');
      const node = createMockNode([linearGradientPaint]);
      mockFigma.getNodeById.mockReturnValue(node);

      // Call update_gradient with gradientType change
      const result = await handleManageStrokes({
        operation: 'update_gradient',
        nodeId: '4362:68',
        paintIndex: 0,
        gradientType: 'GRADIENT_RADIAL',
        stopColors: ['#00FF00', '#FF00FF'],
        stopPositions: [0, 1]
      });

      // Verify the paint type was changed to RADIAL
      expect(node.strokes[0].type).toBe('GRADIENT_RADIAL');
      
      // Verify response shows correct type
      expect(result.success).toBe(true);
      expect(result.data.updatedPaint.type).toBe('GRADIENT_RADIAL');
    });

    it('should update gradient type from RADIAL to LINEAR', async () => {
      // Create node with RADIAL gradient stroke
      const radialGradientPaint = createGradientPaint('GRADIENT_RADIAL');
      const node = createMockNode([radialGradientPaint]);
      mockFigma.getNodeById.mockReturnValue(node);

      // Call update_gradient with gradientType change
      const result = await handleManageStrokes({
        operation: 'update_gradient',
        nodeId: '4362:68',
        paintIndex: 0,
        gradientType: 'GRADIENT_LINEAR',
        stopColors: ['#FF0000', '#0000FF']
      });

      // Verify the paint type was changed to LINEAR
      expect(node.strokes[0].type).toBe('GRADIENT_LINEAR');
      
      // Verify response shows correct type
      expect(result.success).toBe(true);
      expect(result.data.updatedPaint.type).toBe('GRADIENT_LINEAR');
    });

    it('should update gradient type from LINEAR to ANGULAR', async () => {
      // Create node with LINEAR gradient stroke
      const linearGradientPaint = createGradientPaint('GRADIENT_LINEAR');
      const node = createMockNode([linearGradientPaint]);
      mockFigma.getNodeById.mockReturnValue(node);

      // Call update_gradient with gradientType change
      const result = await handleManageStrokes({
        operation: 'update_gradient',
        nodeId: '4362:68',
        paintIndex: 0,
        gradientType: 'GRADIENT_ANGULAR',
        stopColors: ['#FFFF00', '#00FFFF']
      });

      // Verify the paint type was changed to ANGULAR
      expect(node.strokes[0].type).toBe('GRADIENT_ANGULAR');
      
      // Verify response shows correct type
      expect(result.success).toBe(true);
      expect(result.data.updatedPaint.type).toBe('GRADIENT_ANGULAR');
    });

    it('should update gradient type from LINEAR to DIAMOND', async () => {
      // Create node with LINEAR gradient stroke
      const linearGradientPaint = createGradientPaint('GRADIENT_LINEAR');
      const node = createMockNode([linearGradientPaint]);
      mockFigma.getNodeById.mockReturnValue(node);

      // Call update_gradient with gradientType change
      const result = await handleManageStrokes({
        operation: 'update_gradient',
        nodeId: '4362:68',
        paintIndex: 0,
        gradientType: 'GRADIENT_DIAMOND',
        stopColors: ['#800080', '#FFA500']
      });

      // Verify the paint type was changed to DIAMOND
      expect(node.strokes[0].type).toBe('GRADIENT_DIAMOND');
      
      // Verify response shows correct type
      expect(result.success).toBe(true);
      expect(result.data.updatedPaint.type).toBe('GRADIENT_DIAMOND');
    });

    it('should update colors without changing type when gradientType not specified', async () => {
      // Create node with LINEAR gradient stroke
      const linearGradientPaint = createGradientPaint('GRADIENT_LINEAR');
      const node = createMockNode([linearGradientPaint]);
      mockFigma.getNodeById.mockReturnValue(node);

      // Call update_gradient without gradientType change
      const result = await handleManageStrokes({
        operation: 'update_gradient',
        nodeId: '4362:68',
        paintIndex: 0,
        stopColors: ['#00FF00', '#FF00FF'],
        stopPositions: [0, 1]
      });

      // Verify the paint type remained LINEAR
      expect(node.strokes[0].type).toBe('GRADIENT_LINEAR');
      
      // Verify response shows correct type
      expect(result.success).toBe(true);
      expect(result.data.updatedPaint.type).toBe('GRADIENT_LINEAR');
    });
  });
});