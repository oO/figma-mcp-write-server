import { BaseOperation } from './base-operation.js';
import { OperationResult } from '../types.js';
import { 
  SharedPaintOperations,
  PaintOperationsConfig
} from '../utils/shared-paint-operations.js';
import { modifyStrokes, clone } from '../utils/figma-property-utils.js';
import { cleanEmptyPropertiesAsync } from '../utils/node-utils.js';
import {
  ERROR_MESSAGES,
  validateNodeForStrokes,
  resolvePaintIndex,
  validatePaintType,
  validateImageSource,
  validateGradientStops,
  validateStrokeWeight,
  validateStrokeAlign,
  validateStrokeCap,
  validateStrokeJoin,
  validateStrokeMiterLimit,
  createStrokeOperationResponse,
  createStrokeListResponse,
  createStrokeAddResponse,
  createStrokeUpdateResponse,
  createStrokeDeleteResponse,
  extractStrokeProperties
} from '../utils/stroke-utils.js';
import { createPatternPaint } from '../utils/color-utils.js';
import { applyCommonPaintProperties } from '../utils/paint-properties.js';

/**
 * Clean and format stroke response data with compact YAML formatting
 */
async function formatStrokeResponse(responseData: any): Promise<any> {
  return await cleanEmptyPropertiesAsync(responseData) || responseData;
}

/**
 * Configuration for shared paint operations specific to strokes
 */
const strokePaintConfig: PaintOperationsConfig<any, Paint> = {
  modifyPaints: modifyStrokes,
  validateNode: (nodeId: string) => {
    const result = validateNodeForStrokes(nodeId);
    return { node: result.node, paints: result.strokes }; // Map strokes to paints for consistency
  },
  resolvePaintIndex: resolvePaintIndex,
  validatePaintType: validatePaintType,
  
  createAddResponse: async (nodeId: string, paint: Paint, paintIndex: number, totalPaints: number) => {
    return await formatStrokeResponse(await createStrokeAddResponse(nodeId, paint, paintIndex, totalPaints));
  },
  
  createUpdateResponse: async (nodeId: string, paint: Paint | undefined, paintIndex: number | undefined, extraProps?: any, totalPaints?: number) => {
    return await formatStrokeResponse(await createStrokeUpdateResponse(nodeId, paint, paintIndex, extraProps, totalPaints));
  },
  
  createDeleteResponse: async (nodeId: string, paintIndex: number, totalPaints: number) => {
    return await formatStrokeResponse(await createStrokeDeleteResponse(nodeId, paintIndex, totalPaints));
  }
};

/**
 * Shared paint operations instance for strokes
 */
const strokePaintOperations = new SharedPaintOperations(strokePaintConfig);

/**
 * Apply scale mode-aware transform processing to an image paint for strokes
 * (Same logic as fills - image transforms work identically for strokes)
 */
function applyScaleModeAwareTransforms(
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
    const updatedPaint = clone(existingPaint) as ImagePaint;
    
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

/**
 * Apply stroke properties to a node
 * @param node - The Figma node
 * @param params - Parameters containing stroke properties
 */
function applyStrokeProperties(node: any, params: any): void {
  if (params.strokeWeight !== undefined) {
    validateStrokeWeight(params.strokeWeight);
    node.strokeWeight = params.strokeWeight;
  }
  if (params.strokeAlign !== undefined) {
    validateStrokeAlign(params.strokeAlign);
    node.strokeAlign = params.strokeAlign.toUpperCase();
  }
  if (params.strokeCap !== undefined) {
    validateStrokeCap(params.strokeCap);
    node.strokeCap = params.strokeCap.toUpperCase();
  }
  if (params.strokeJoin !== undefined) {
    validateStrokeJoin(params.strokeJoin);
    node.strokeJoin = params.strokeJoin.toUpperCase();
  }
  if (params.strokeMiterLimit !== undefined) {
    validateStrokeMiterLimit(params.strokeMiterLimit);
    node.strokeMiterLimit = params.strokeMiterLimit;
  }
  if (params.dashPattern !== undefined) {
    if (!Array.isArray(params.dashPattern)) {
      throw new Error('dashPattern must be an array of numbers');
    }
    node.dashPattern = params.dashPattern;
  }
}

/**
 * Handle stroke operations for Figma nodes
 * @param params - Operation parameters
 * @returns Operation result
 */
export async function MANAGE_STROKES(params: any): Promise<OperationResult> {
  try {
    const { operation, nodeId } = params;
    
    switch (operation.toLowerCase()) {
      case 'get':
        return await handleGetStrokes(params);
      case 'add_solid':
        return await strokePaintOperations.addSolid(params);
      case 'add_gradient':
        return await strokePaintOperations.addGradient(params);
      case 'add_image':
        return await strokePaintOperations.addImage(params);
      case 'add_pattern':
        return await handleAddPatternStroke(params);
      case 'update':
        return await handleUpdateStroke(params);
      case 'update_solid':
        return await strokePaintOperations.updateSolid(params);
      case 'update_gradient':
        return await strokePaintOperations.updateGradient(params);
      case 'update_image':
        return await handleUpdateImageStroke(params);
      case 'update_pattern':
        return await handleUpdatePatternStroke(params);
      case 'delete':
        return await strokePaintOperations.delete(params);
      case 'reorder':
        return await handleReorderStroke(params);
      case 'clear':
        return await strokePaintOperations.clear(params);
      case 'duplicate':
        return await handleDuplicateStrokes(params);
      default:
        throw new Error(ERROR_MESSAGES.UNKNOWN_OPERATION(operation));
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.toString() : String(error),
      data: {}
    };
  }
}

async function handleGetStrokes(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  const strokeProperties = extractStrokeProperties(node);
  
  // Apply filter if specified
  let filteredStrokes = strokes;
  if (params.filterType) {
    filteredStrokes = strokes.filter(stroke => stroke.type === params.filterType.toUpperCase());
  }
  
  // Apply paint index filter if specified
  if (params.paintIndex !== undefined) {
    const paintIndex = resolvePaintIndex(params, filteredStrokes);
    filteredStrokes = [filteredStrokes[paintIndex]];
  }
  
  const response = await createStrokeListResponse(
    params.nodeId,
    filteredStrokes,
    strokeProperties,
    params.filterType ? filteredStrokes.length : undefined,
    params.filterType
  );

  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

// handleAddSolidStroke - Now handled by shared strokePaintOperations.addSolid()

// handleAddGradientStroke - Now handled by shared strokePaintOperations.addGradient()

async function handleAddImageStroke(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  
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
    throw new Error(ERROR_MESSAGES.MISSING_IMAGE_SOURCE());
  }
  
  // Create image paint with scale mode-aware transforms
  const { paint: imagePaint, warnings } = applyScaleModeAwareTransforms(
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
  
  // Add paint to strokes array
  modifyStrokes(node, manager => {
    manager.push(imagePaint);
  });
  
  const paintIndex = strokes.length; // New paint added at end
  const response = await createStrokeAddResponse(
    params.nodeId,
    imagePaint,
    paintIndex,
    paintIndex + 1
  );
  
  // Add warnings if any
  if (warnings.length > 0) {
    response.warnings = warnings;
  }
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

async function handleAddPatternStroke(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  
  // Create pattern paint
  const patternPaint = createPatternPaint(
    params.sourceNodeId,
    {
      tileType: params.patternTileType,
      scalingFactor: params.patternScalingFactor,
      spacingX: params.patternSpacingX,
      spacingY: params.patternSpacingY,
      horizontalAlignment: params.patternHorizontalAlignment
    }
  );
  
  applyCommonPaintProperties(patternPaint, params);
  
  // Add paint to strokes array
  modifyStrokes(node, manager => {
    manager.push(patternPaint);
  });
  
  const paintIndex = strokes.length; // New paint added at end
  const response = await createStrokeAddResponse(
    params.nodeId,
    patternPaint,
    paintIndex,
    paintIndex + 1
  );
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

async function handleUpdateStroke(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  
  // Handle stroke properties (affect entire stroke)
  const hasStrokeProperties = params.strokeWeight !== undefined || 
    params.strokeAlign !== undefined || params.strokeCap !== undefined ||
    params.strokeJoin !== undefined || params.strokeMiterLimit !== undefined ||
    params.dashPattern !== undefined;
  
  // Handle paint properties (smart update logic)
  const hasPaintProperties = params.opacity !== undefined || 
    params.visible !== undefined || params.blendMode !== undefined ||
    params.color !== undefined || params.gradientType !== undefined ||
    params.imageUrl !== undefined || params.imagePath !== undefined ||
    params.imageBytes !== undefined || params.imageHash !== undefined ||
    params.sourceNodeId !== undefined;
  
  if (hasStrokeProperties) {
    applyStrokeProperties(node, params);
  }
  
  let updatedPaint: Paint | undefined;
  let paintIndex: number | undefined;
  
  if (hasPaintProperties) {
    // Smart update logic with safety guard
    if (params.paintIndex === undefined) {
      // Allow implicit paintIndex=0 only for simple cases
      if (strokes.length === 0) {
        throw new Error('Node has no stroke paints. Add a paint first using add_solid, add_gradient, etc.');
      } else if (strokes.length > 1) {
        throw new Error(
          `Node has ${strokes.length} stroke paints. Specify paintIndex to avoid ambiguity.\n` +
          `• Use paintIndex: 0 to update first paint\n` + 
          `• Use update_solid with paintIndex for type-specific updates`
        );
      }
      // Single paint - safe to use paintIndex 0
      paintIndex = 0;
    } else {
      paintIndex = resolvePaintIndex(params, strokes);
    }
    
    // Update paint properties (including smart updates for color, etc.)
    modifyStrokes(node, manager => {
      const paint = manager.get(paintIndex!);
      if (paint) {
        // Handle smart paint updates
        if (params.color !== undefined && paint.type === 'SOLID') {
          const solidPaint = paint as SolidPaint;
          const color = createSolidPaint(params.color, solidPaint.opacity);
          Object.assign(solidPaint, color);
        }
        
        // Apply common paint properties (opacity, visible, blendMode)
        applyCommonPaintProperties(paint, params);
        manager.update(paintIndex!, paint);
        updatedPaint = paint;
      }
    });
  }
  
  const strokeProperties = hasStrokeProperties ? extractStrokeProperties(node) : undefined;
  const response = await createStrokeUpdateResponse(
    params.nodeId,
    updatedPaint,
    paintIndex,
    strokeProperties,
    strokes.length
  );
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

// handleUpdateSolidStroke - Now handled by shared strokePaintOperations.updateSolid()

// handleUpdateGradientStroke - Now handled by shared strokePaintOperations.updateGradient()
// This eliminates the gradient type bug by using the shared logic that includes the fix

async function handleUpdateImageStroke(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  const paintIndex = resolvePaintIndex(params, strokes);
  
  // Validate paint type
  validatePaintType(strokes, paintIndex, 'IMAGE');
  
  let updatedPaint: Paint | undefined;
  
  // Update image paint
  modifyStrokes(node, manager => {
    const paint = manager.get(paintIndex) as ImagePaint;
    if (paint) {
      // Handle image hash update if new image provided
      let imageHash = paint.imageHash;
      if (params.imageUrl || params.imagePath || params.imageBytes || params.imageHash) {
        // This would require async handling similar to add_image
        // For now, only allow imageHash updates
        if (params.imageHash) {
          imageHash = params.imageHash;
        }
      }
      
      // Apply scale mode-aware transforms if transform parameters provided
      let updatedImagePaint = paint;
      if (params.imageScaleMode !== undefined || params.transformOffsetX !== undefined ||
          params.transformOffsetY !== undefined || params.transformScale !== undefined ||
          params.transformScaleX !== undefined || params.transformScaleY !== undefined ||
          params.transformRotation !== undefined || params.transformSkewX !== undefined ||
          params.transformSkewY !== undefined || params.imageTransform !== undefined) {
        
        const { paint: transformedPaint } = applyScaleModeAwareTransforms(
          imageHash,
          params.imageScaleMode || paint.scaleMode,
          params,
          paint
        );
        updatedImagePaint = transformedPaint;
      }
      
      // Apply image filters if specified
      if (params.filterExposure !== undefined || params.filterContrast !== undefined || 
          params.filterSaturation !== undefined || params.filterTemperature !== undefined ||
          params.filterTint !== undefined || params.filterHighlights !== undefined ||
          params.filterShadows !== undefined) {
        applyImageFilters(updatedImagePaint, {
          exposure: params.filterExposure,
          contrast: params.filterContrast,
          saturation: params.filterSaturation,
          temperature: params.filterTemperature,
          tint: params.filterTint,
          highlights: params.filterHighlights,
          shadows: params.filterShadows
        });
      }
      
      applyCommonPaintProperties(updatedImagePaint, params);
      manager.update(paintIndex, updatedImagePaint);
      updatedPaint = updatedImagePaint;
    }
  });
  
  const response = await createStrokeUpdateResponse(
    params.nodeId,
    updatedPaint,
    paintIndex,
    undefined,
    strokes.length
  );
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

async function handleUpdatePatternStroke(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  const paintIndex = resolvePaintIndex(params, strokes);
  
  // Validate paint type
  validatePaintType(strokes, paintIndex, 'PATTERN');
  
  let updatedPaint: Paint | undefined;
  
  // Update pattern paint (Note: Figma API may not support all pattern updates)
  modifyStrokes(node, manager => {
    const paint = manager.get(paintIndex) as any; // Pattern paint interface may vary
    if (paint) {
      // Update pattern properties if supported
      if (params.patternScalingFactor !== undefined && 'scalingFactor' in paint) {
        paint.scalingFactor = params.patternScalingFactor;
      }
      if (params.patternSpacingX !== undefined && 'spacingX' in paint) {
        paint.spacingX = params.patternSpacingX;
      }
      if (params.patternSpacingY !== undefined && 'spacingY' in paint) {
        paint.spacingY = params.patternSpacingY;
      }
      if (params.patternHorizontalAlignment !== undefined && 'horizontalAlignment' in paint) {
        paint.horizontalAlignment = params.patternHorizontalAlignment.toUpperCase();
      }
      
      applyCommonPaintProperties(paint, params);
      manager.update(paintIndex, paint);
      updatedPaint = paint;
    }
  });
  
  const response = await createStrokeUpdateResponse(
    params.nodeId,
    updatedPaint,
    paintIndex,
    undefined,
    strokes.length
  );
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

// handleDeleteStroke - Now handled by shared strokePaintOperations.delete()

async function handleReorderStroke(params: any): Promise<OperationResult> {
  const { node, strokes } = validateNodeForStrokes(params.nodeId);
  const paintIndex = resolvePaintIndex(params, strokes);
  const newIndex = params.newIndex;
  
  if (newIndex < 0 || newIndex >= strokes.length) {
    throw new Error(`New index ${newIndex} out of bounds (0-${strokes.length - 1})`);
  }
  
  // Reorder paint in strokes array
  modifyStrokes(node, manager => {
    manager.move(paintIndex, newIndex);
  });
  
  const response = await createStrokeOperationResponse(
    params.nodeId,
    newIndex,
    strokes[newIndex],
    strokes.length,
    undefined,
    { operation: 'reorder', oldIndex: paintIndex, newIndex }
  );
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}

// handleClearStrokes - Now handled by shared strokePaintOperations.clear()

async function handleDuplicateStrokes(params: any): Promise<OperationResult> {
  const { node: sourceNode, strokes: sourceStrokes } = validateNodeForStrokes(params.fromNodeId);
  const { node: targetNode, strokes: targetStrokes } = validateNodeForStrokes(params.toNodeId);
  
  // Determine which paints to copy
  let paintsToCopy: Paint[];
  if (params.paintIndex !== undefined) {
    const paintIndex = resolvePaintIndex({ ...params, nodeId: params.fromNodeId }, sourceStrokes);
    paintsToCopy = [sourceStrokes[paintIndex]];
  } else {
    paintsToCopy = sourceStrokes;
  }
  
  // Handle overwrite mode
  const overwrite = params.overwrite?.toUpperCase() || 'NONE';
  
  modifyStrokes(targetNode, manager => {
    if (overwrite === 'ALL') {
      // Clear existing paints
      while (manager.length > 0) {
        manager.remove(0);
      }
    } else if (overwrite === 'SINGLE' && params.paintIndex !== undefined) {
      // Replace at specific index
      const targetIndex = params.paintIndex < manager.length ? params.paintIndex : manager.length - 1;
      if (targetIndex >= 0) {
        manager.remove(targetIndex);
      }
    }
    
    // Add copied paints
    for (const paint of paintsToCopy) {
      const clonedPaint = clone(paint);
      if (overwrite === 'SINGLE' && params.paintIndex !== undefined) {
        manager.insert(params.paintIndex, clonedPaint);
      } else {
        manager.push(clonedPaint);
      }
    }
  });
  
  const response = await createStrokeOperationResponse(
    params.toNodeId,
    undefined,
    undefined,
    targetNode.strokes.length,
    undefined,
    { 
      operation: 'duplicate', 
      sourceNodeId: params.fromNodeId,
      copiedCount: paintsToCopy.length,
      overwriteMode: overwrite
    }
  );
  
  return {
    success: true,
    data: await formatStrokeResponse(response)
  };
}