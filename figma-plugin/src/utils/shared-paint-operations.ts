import { OperationResult } from '../types.js';
import { 
  createSolidPaint, 
  createGradientPaint, 
  createImagePaint,
  createPatternPaint,
  createImageFromUrl,
  createImageFromBytes,
  validatePaint,
  clonePaint,
  isPaintType,
  applyImageFilters,
  convertStopArrays,
  convertFlattenedHandles,
  createGradientTransform,
  createDefaultGradientStops,
  flattenedToImageMatrix
} from './color-utils.js';
import { 
  applyCommonPaintProperties,
  normalizeToArray,
  createBasePaint
} from './paint-properties.js';
import { validateGradientStops, validateImageSource } from './fill-validation.js';

/**
 * Configuration interface for paint operations
 */
export interface PaintOperationsConfig<TNode, TPaint> {
  // Property manager function (modifyFills or modifyStrokes)
  modifyPaints: (node: TNode, callback: (manager: PaintManager<TPaint>) => void) => void;
  
  // Node and paints validation function
  validateNode: (nodeId: string) => { node: TNode; paints: TPaint[] };
  
  // Paint index resolution function
  resolvePaintIndex: (params: any, paints: TPaint[]) => number;
  
  // Response creation functions
  createAddResponse: (nodeId: string, paint: TPaint, paintIndex: number, totalPaints: number) => Promise<any>;
  createUpdateResponse: (nodeId: string, paint: TPaint | undefined, paintIndex: number | undefined, extraProps?: any, totalPaints?: number) => Promise<any>;
  createDeleteResponse: (nodeId: string, paintIndex: number, totalPaints: number) => Promise<any>;
  
  // Paint type validation
  validatePaintType: (paints: TPaint[], paintIndex: number, expectedType: string) => void;
}

/**
 * Paint manager interface (abstraction over FigmaPropertyManager)
 */
export interface PaintManager<TPaint> {
  get(index: number): TPaint;
  update(index: number, paint: TPaint): void;
  push(paint: TPaint): void;
  insert(index: number, paint: TPaint): void;
  remove(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  duplicate(fromIndex: number, toIndex: number): void;
  length: number;
}

/**
 * Shared paint operations utility class
 */
export class SharedPaintOperations<TNode, TPaint extends Paint> {
  constructor(private config: PaintOperationsConfig<TNode, TPaint>) {}

  /**
   * Add solid paint operation
   */
  async addSolid(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    
    // Create solid paint
    const solidPaint = createSolidPaint(params.color) as TPaint;
    applyCommonPaintProperties(solidPaint, params);
    
    // Add paint using property manager
    let actualPaintIndex: number;
    let totalPaints: number;
    
    this.config.modifyPaints(node, manager => {
      if (params.insertIndex !== undefined) {
        manager.insert(params.insertIndex, solidPaint);
        actualPaintIndex = params.insertIndex;
      } else {
        manager.push(solidPaint);
        actualPaintIndex = paints.length; // This was the index where it was added
      }
      totalPaints = manager.length; // Get current length after addition
    });
    
    const response = await this.config.createAddResponse(
      params.nodeId,
      solidPaint,
      actualPaintIndex,
      totalPaints
    );
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Add gradient paint operation
   */
  async addGradient(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    
    // Validate gradient parameters
    if (params.stopPositions || params.stopColors) {
      validateGradientStops(params.stopPositions, params.stopColors);
    }
    
    // Create gradient stops
    const stopPositions = params.stopPositions || [0, 1];
    const stopColors = params.stopColors || ['#FFFFFF', '#000000'];
    const gradientStops = convertStopArrays(stopPositions, stopColors);
    
    // Create gradient transform from flattened coordinates
    const coordinates = {
      gradientStartX: params.gradientStartX,
      gradientStartY: params.gradientStartY,
      gradientEndX: params.gradientEndX,
      gradientEndY: params.gradientEndY,
      gradientScale: params.gradientScale
    };
    const gradientTransform = createGradientTransform(params.gradientType, coordinates);
    
    // Create gradient paint with proper structure
    const gradientPaint = createGradientPaint(
      params.gradientType,
      gradientStops,
      gradientTransform
    ) as TPaint;
    
    applyCommonPaintProperties(gradientPaint, params);
    
    // Add paint using property manager
    let actualPaintIndex: number;
    let totalPaints: number;
    
    this.config.modifyPaints(node, manager => {
      if (params.insertIndex !== undefined) {
        manager.insert(params.insertIndex, gradientPaint);
        actualPaintIndex = params.insertIndex;
      } else {
        manager.push(gradientPaint);
        actualPaintIndex = paints.length; // This was the index where it was added
      }
      totalPaints = manager.length; // Get current length after addition
    });
    
    const response = await this.config.createAddResponse(
      params.nodeId,
      gradientPaint,
      actualPaintIndex,
      totalPaints
    );
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Add image paint operation
   */
  async addImage(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    
    // Validate image source
    validateImageSource(params);
    
    let imageHash: string;
    
    if (params.imageUrl) {
      const result = await createImageFromUrl(params.imageUrl);
      imageHash = result.imageHash;
    } else if (params.imageBytes) {
      // Convert Base64 string to Uint8Array in UI thread for efficiency
      figma.ui.postMessage({
        type: 'CONVERT_BASE64_TO_BYTES',
        base64: params.imageBytes,
        requestId: `image_${Date.now()}`
      });
      
      const result = await new Promise<{ imageHash: string }>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Base64 conversion timeout')), 10000);
        
        function handleMessage(event: MessageEvent) {
          if (event.data.type === 'BASE64_CONVERSION_RESULT') {
            clearTimeout(timeout);
            figma.ui.off('message', handleMessage);
            
            if (event.data.success) {
              createImageFromBytes(event.data.bytes).then(result => {
                resolve(result);
              }).catch(reject);
            } else {
              reject(new Error(event.data.error || 'Base64 conversion failed'));
            }
          }
        }
        
        figma.ui.on('message', handleMessage);
      });
      
      imageHash = result.imageHash;
    } else if (params.imageHash) {
      imageHash = params.imageHash;
    } else {
      throw new Error('Must provide imageUrl, imageBytes, or imageHash');
    }
    
    // Create image paint with scale mode-aware transforms
    const { paint: imagePaint, warnings } = this.applyScaleModeAwareTransforms(
      imageHash,
      params.imageScaleMode || 'FILL',
      params
    );
    
    // Apply image filters if specified
    if (params.filterExposure !== undefined || params.filterContrast !== undefined || 
        params.filterSaturation !== undefined || params.filterTemperature !== undefined ||
        params.filterTint !== undefined || params.filterHighlights !== undefined ||
        params.filterShadows !== undefined) {
      applyImageFilters(imagePaint, {
        exposure: params.filterExposure,
        contrast: params.filterContrast,
        saturation: params.filterSaturation,
        temperature: params.filterTemperature,
        tint: params.filterTint,
        highlights: params.filterHighlights,
        shadows: params.filterShadows
      });
    }
    
    applyCommonPaintProperties(imagePaint, params);
    
    // Add paint using property manager
    let actualPaintIndex: number;
    let totalPaints: number;
    
    this.config.modifyPaints(node, manager => {
      if (params.insertIndex !== undefined) {
        manager.insert(params.insertIndex, imagePaint as TPaint);
        actualPaintIndex = params.insertIndex;
      } else {
        manager.push(imagePaint as TPaint);
        actualPaintIndex = paints.length; // This was the index where it was added
      }
      totalPaints = manager.length; // Get current length after addition
    });
    
    const response = await this.config.createAddResponse(
      params.nodeId,
      imagePaint as TPaint,
      actualPaintIndex,
      totalPaints
    );
    
    // Add warnings if any
    if (warnings.length > 0) {
      response.warnings = warnings;
    }
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Update solid paint operation
   */
  async updateSolid(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    const paintIndex = this.config.resolvePaintIndex(params, paints);
    
    // Validate paint type
    this.config.validatePaintType(paints, paintIndex, 'SOLID');
    
    let updatedPaint: TPaint | undefined;
    
    // Update solid paint
    this.config.modifyPaints(node, manager => {
      const paint = manager.get(paintIndex) as SolidPaint & TPaint;
      if (paint) {
        if (params.color !== undefined) {
          const solidPaint = createSolidPaint(params.color);
          paint.color = solidPaint.color;
        }
        applyCommonPaintProperties(paint, params);
        manager.update(paintIndex, paint);
        updatedPaint = paint;
      }
    });
    
    const response = await this.config.createUpdateResponse(
      params.nodeId,
      updatedPaint,
      paintIndex,
      undefined,
      paints.length
    );
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Update gradient paint operation - THE CRITICAL SHARED LOGIC
   */
  async updateGradient(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    const paintIndex = this.config.resolvePaintIndex(params, paints);
    
    // Validate paint is gradient type
    const currentPaint = paints[paintIndex];
    if (!currentPaint.type.startsWith('GRADIENT_')) {
      this.config.validatePaintType(paints, paintIndex, 'GRADIENT');
    }
    
    let updatedPaint: TPaint | undefined;
    
    // Update gradient paint
    this.config.modifyPaints(node, manager => {
      const paint = manager.get(paintIndex) as GradientPaint & TPaint;
      if (paint) {
        // Update gradient stops
        if (params.stopPositions || params.stopColors) {
          validateGradientStops(params.stopPositions, params.stopColors);
          
          if (params.stopPositions && params.stopColors) {
            paint.gradientStops = convertStopArrays(params.stopPositions, params.stopColors);
          } else if (params.stopColors) {
            // Update colors only, preserve positions
            const positions = paint.gradientStops.map(stop => stop.position);
            paint.gradientStops = convertStopArrays(positions, params.stopColors);
          }
        }
        
        // 🔥 CRITICAL: Update gradient type if provided
        if (params.gradientType) {
          paint.type = params.gradientType.toUpperCase() as any;
        }
        
        // Update gradient handles if provided
        if (params.gradientStartX !== undefined || params.gradientStartY !== undefined ||
            params.gradientEndX !== undefined || params.gradientEndY !== undefined ||
            params.gradientScale !== undefined) {
          const handles = convertFlattenedHandles(
            params.gradientStartX ?? paint.gradientHandlePositions[0]?.x ?? 0,
            params.gradientStartY ?? paint.gradientHandlePositions[0]?.y ?? 0.5,
            params.gradientEndX ?? paint.gradientHandlePositions[1]?.x ?? 1,
            params.gradientEndY ?? paint.gradientHandlePositions[1]?.y ?? 0.5,
            params.gradientScale ?? 1
          );
          paint.gradientHandlePositions = handles;
        }
        
        applyCommonPaintProperties(paint, params);
        manager.update(paintIndex, paint);
        updatedPaint = paint;
      }
    });
    
    const response = await this.config.createUpdateResponse(
      params.nodeId,
      updatedPaint,
      paintIndex,
      undefined,
      paints.length
    );
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Delete paint operation
   */
  async delete(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    const paintIndex = this.config.resolvePaintIndex(params, paints);
    
    // Remove paint using property manager
    this.config.modifyPaints(node, manager => {
      manager.remove(paintIndex);
    });
    
    const response = await this.config.createDeleteResponse(
      params.nodeId,
      paintIndex,
      paints.length - 1
    );
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Clear all paints operation
   */
  async clear(params: any): Promise<OperationResult> {
    const { node, paints } = this.config.validateNode(params.nodeId);
    
    // Clear all paints using property manager
    this.config.modifyPaints(node, manager => {
      while (manager.length > 0) {
        manager.remove(0);
      }
    });
    
    const response = {
      nodeId: params.nodeId,
      operation: 'clear',
      clearedCount: paints.length,
      totalPaints: 0
    };
    
    return {
      success: true,
      data: response
    };
  }

  /**
   * Apply scale mode-aware transform processing to an image paint
   * (Same logic used by both fills and strokes)
   */
  private applyScaleModeAwareTransforms(
    imageHash: string,
    scaleMode: string,
    params: any,
    existingPaint?: ImagePaint
  ): { paint: ImagePaint; warnings: string[] } {
    // Collect transform parameters for scale mode-aware processing
    const transformParams = {
      transformOffsetX: params.transformOffsetX,
      transformOffsetY: params.transformOffsetY,
      transformScale: params.transformScale,
      transformScaleX: params.transformScaleX,
      transformScaleY: params.transformScaleY,
      transformRotation: params.transformRotation,
      transformSkewX: params.transformSkewX,
      transformSkewY: params.transformSkewY,
      imageTransform: params.imageTransform // Allow explicit matrix override
    };
    
    // Create image paint with scale mode-aware transform handling
    const { paint: transformedPaint, warnings } = createImagePaint(
      imageHash,
      scaleMode,
      transformParams
    );
    
    // If updating existing paint, preserve non-transform properties
    if (existingPaint) {
      const updatedPaint = clonePaint(existingPaint) as ImagePaint;
      
      // Apply scale mode and transform properties from scale mode-aware processing
      updatedPaint.scaleMode = transformedPaint.scaleMode;
      if ('imageTransform' in transformedPaint) {
        updatedPaint.imageTransform = transformedPaint.imageTransform;
      }
      if ('rotation' in transformedPaint) {
        updatedPaint.rotation = transformedPaint.rotation;
      }
      if ('scalingFactor' in transformedPaint) {
        updatedPaint.scalingFactor = transformedPaint.scalingFactor;
      }
      
      return { paint: updatedPaint, warnings };
    }
    
    return { paint: transformedPaint, warnings };
  }
}