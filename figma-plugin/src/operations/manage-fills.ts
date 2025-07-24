import { BaseOperation, OperationResult } from './base-operation.js';
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
} from '../utils/color-utils.js';
import { modifyFills } from '../utils/figma-property-utils.js';
import { cleanEmptyProperties, cleanEmptyPropertiesAsync } from '../utils/node-utils.js';
import { logMessage, logWarning, logError } from '../utils/plugin-logger.js';
import { ERROR_MESSAGES } from '../utils/fill-constants.js';
import { 
  validateNodeForFills, 
  resolveFillIndex, 
  validateFillType,
  validateImageSource,
  validateGradientStops
} from '../utils/fill-validation.js';
import { 
  applyCommonPaintProperties,
  normalizeToArray,
  createBasePaint
} from '../utils/paint-properties.js';
import { 
  handleBulkError,
  createBulkSummary,
  distributeBulkParams
} from '../utils/bulk-operations.js';
import { 
  createFillOperationResponse,
  createFillListResponse,
  createFillAddResponse,
  createFillUpdateResponse,
  createFillDeleteResponse
} from '../utils/fill-response.js';

/**
 * Clean and format fill response data with compact YAML formatting
 */
async function formatFillResponse(responseData: any): Promise<any> {
  return await cleanEmptyPropertiesAsync(responseData) || responseData;
}

/**
 * Apply scale mode-aware transform processing to an image paint
 * Handles both new image creation and existing image updates
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
    
    // Clean up conflicting properties based on scale mode
    const upperScaleMode = scaleMode.toUpperCase();
    if (upperScaleMode === 'CROP') {
      // CROP mode: remove individual properties, keep matrix
      delete (updatedPaint as any).rotation;
      delete (updatedPaint as any).scalingFactor;
    } else {
      // TILE/FILL/FIT mode: remove matrix, keep individual properties
      delete updatedPaint.imageTransform;
    }
    
    return { paint: updatedPaint, warnings };
  }
  
  return { paint: transformedPaint, warnings };
}


/**
 * Handle MANAGE_FILLS operation
 * Supports: get, list, add_solid, add_gradient, add_image, update, delete, reorder, clear, duplicate
 */
export async function handleManageFills(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageFills', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['get', 'list', 'add_solid', 'add_gradient', 'add_image', 'add_pattern', 'update', 'update_solid', 'update_gradient', 'update_image', 'update_pattern', 'delete', 'reorder', 'clear', 'duplicate']
    );

    switch (operation) {
      case 'get':
        return await getFill(params);
      case 'list':
        return await listFills(params);
      case 'add_solid':
        return await addSolidFill(params);
      case 'add_gradient':
        return await addGradientFill(params);
      case 'add_image':
        return await addImageFill(params);
      case 'add_pattern':
        return await addPatternFill(params);
      case 'update':
        return await updateFillCommon(params);
      case 'update_solid':
        return await updateSolidFill(params);
      case 'update_gradient':
        return await updateGradientFill(params);
      case 'update_image':
        return await updateImageFill(params);
      case 'update_pattern':
        return await updatePatternFill(params);
      case 'delete':
        return await deleteFill(params);
      case 'reorder':
        return await reorderFill(params);
      case 'clear':
        return await clearFills(params);
      case 'duplicate':
        return await duplicateFills(params);
      default:
        throw new Error(`Unknown fill operation: ${operation}`);
    }
  });
}

async function getFill(params: any): Promise<any> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const { node, fills } = validateNodeForFills(params.nodeId);
    
    // If fillIndex is provided, return specific fill
    if (params.fillIndex !== undefined && params.fillIndex !== null) {
      const fillIndex = resolveFillIndex(params, fills);
      const fill = fills[fillIndex];
      
      return await createFillOperationResponse(
        params.nodeId,
        fillIndex,
        fill,
        fills.length,
        {
          nodeName: node.name,
          fillType: fill.type
        }
      );
    }
    
    // If no fillIndex provided, return all fills (like list operation)
    let filteredFills = fills;
    if (params.filterType) {
      const filterType = params.filterType.toUpperCase();
      filteredFills = fills.filter((fill: Paint) => fill.type === filterType);
    }
    
    return await createFillListResponse(
      params.nodeId,
      filteredFills,
      filteredFills.length,
      params.filterType
    );
  }

async function listFills(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const nodeIds = normalizeToArray(params.nodeId);
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const { node, fills } = validateNodeForFills(nodeId);
        
        let filteredFills = fills;
        if (params.filterType) {
          const filterType = params.filterType.toUpperCase();
          filteredFills = fills.filter((fill: Paint) => fill.type === filterType);
        }
        
        const nodeResult = await createFillListResponse(
          nodeId,
          filteredFills,
          filteredFills.length,
          params.filterType
        );
        
        results.push(nodeResult);
      } catch (error) {
        handleBulkError(error, nodeId, params, results);
      }
    }
    
    const summary = createBulkSummary(results, nodeIds.length);
    return await formatFillResponse(summary);
  }

async function addSolidFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId', 'color']);
    
    const nodeIds = normalizeToArray(params.nodeId);
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const { node } = validateNodeForFills(nodeId);
        
        const solidPaint = createSolidPaint(params.color, params.opacity);
        
        // Apply common paint properties
        applyCommonPaintProperties(solidPaint, params);
        
        let insertIndex: number;
        // Use FigmaPropertyManager for proper array handling
        modifyFills(node, (manager) => {
          if (params.insertIndex !== undefined) {
            manager.insert(params.insertIndex, solidPaint);
            insertIndex = params.insertIndex;
          } else {
            manager.push(solidPaint);
            insertIndex = manager.length - 1;
          }
        });
        
        const result = await createFillAddResponse(
          nodeId,
          solidPaint,
          insertIndex,
          (node as any).fills.length
        );
        
        results.push(result);
        
      } catch (error) {
        handleBulkError(error, nodeId, params, results);
      }
    }
    
    const summary = createBulkSummary(results, nodeIds.length);
    return summary;
  }

async function addGradientFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId', 'gradientType']);
    
    // Validate gradient stops if provided
    if (params.stopPositions && params.stopColors) {
      validateGradientStops(params.stopPositions, params.stopColors);
      if (params.stopPositions.length < 2) {
        throw new Error('Gradient fills must have at least 2 color stops');
      }
    }
    
    const nodeIds = normalizeToArray(params.nodeId);
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const { node } = validateNodeForFills(nodeId);
        
        // Create gradient stops with smart defaults
        let gradientStops: ColorStop[];
        if (params.stopPositions && params.stopColors) {
          gradientStops = convertStopArrays(params.stopPositions, params.stopColors);
        } else {
          // Use default white to black gradient
          gradientStops = createDefaultGradientStops();
        }
        
        // Create gradient transform with smart defaults for each gradient type
        const gradientTransform = createGradientTransform(
          params.gradientType,
          {
            gradientStartX: params.gradientStartX,
            gradientStartY: params.gradientStartY,
            gradientEndX: params.gradientEndX,
            gradientEndY: params.gradientEndY,
            gradientScale: params.gradientScale
          }
        );
        
        const gradientPaint = createBasePaint(params.gradientType.toUpperCase(), params) as GradientPaint;
        gradientPaint.gradientStops = gradientStops;
        gradientPaint.gradientTransform = gradientTransform;
        
        // Use FigmaPropertyManager for proper array handling
        modifyFills(node, (manager) => {
          if (params.insertIndex !== undefined) {
            manager.insert(params.insertIndex, gradientPaint);
          } else {
            manager.push(gradientPaint);
          }
        });
        
        const insertIndex = params.insertIndex ?? ((node as any).fills.length - 1);
        const response = await createFillAddResponse(nodeId, gradientPaint, insertIndex, (node as any).fills.length);
        results.push(response);
        
      } catch (error) {
        handleBulkError(error, nodeId, params, results);
      }
    }
    
    return createBulkSummary(results, nodeIds.length);
  }

async function addPatternFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId', 'sourceNodeId']);
    
    const nodeIds = normalizeToArray(params.nodeId);
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const { node } = validateNodeForFills(nodeId);
        
        // Validate source node exists
        const sourceNode = figma.getNodeById(params.sourceNodeId);
        if (!sourceNode) {
          throw new Error(`Source node not found: ${params.sourceNodeId}`);
        }
        
        // Create pattern paint with flattened parameters
        const patternPaint = createPatternPaint(
          params.sourceNodeId,
          params.patternTileType,
          params.patternScalingFactor,
          params.patternSpacingX ?? 0,
          params.patternSpacingY ?? 0,
          params.patternHorizontalAlignment
        );
        
        // Apply common paint properties
        applyCommonPaintProperties(patternPaint, params);
        
        let insertIndex: number;
        // Use FigmaPropertyManager for proper array handling
        modifyFills(node, (manager) => {
          if (params.insertIndex !== undefined) {
            manager.insert(params.insertIndex, patternPaint);
            insertIndex = params.insertIndex;
          } else {
            manager.push(patternPaint);
            insertIndex = manager.length - 1;
          }
        });
        
        const result = await createFillAddResponse(
          nodeId,
          patternPaint,
          insertIndex,
          (node as any).fills.length
        );
        
        results.push(result);
        
      } catch (error) {
        handleBulkError(error, nodeId, params, results);
      }
    }
    
    const summary = createBulkSummary(results, nodeIds.length);
    return summary;
  }

async function addImageFill(params: any): Promise<OperationResult> {
    // Debug: Log what parameters we received
    logMessage('🔍 addImageFill called with params:', {
      hasImageUrl: !!params.imageUrl,
      hasImagePath: !!params.imagePath,
      hasImageHash: !!params.imageHash,
      hasImageBytes: !!params.imageBytes,
      imageUrl: params.imageUrl,
      imagePath: params.imagePath,
      imageHash: params.imageHash,
      imageBytesType: typeof params.imageBytes,
      imageBytesLength: typeof params.imageBytes === 'string' ? params.imageBytes.length : 
                       Array.isArray(params.imageBytes) ? params.imageBytes.length : 'unknown',
      allParamKeys: Object.keys(params)
    });

    // Validate that at least one image source is provided
    validateImageSource(params);
    
    logMessage('✅ addImageFill validation passed');
    
    // Note: nodeId is optional for image fills - if not provided, creates a new node
    if (params.nodeId) {
      BaseOperation.validateParams(params, ['nodeId']);
    }
    
    let imageHash: string;
    let imageDimensions: {width: number, height: number} | null = null;
    
    // Create image from source
    if (params.imageUrl) {
      const result = await createImageFromUrl(params.imageUrl);
      imageHash = result.imageHash;
      imageDimensions = result.dimensions;
    } else if (params.imageBytes) {
      // CRITICAL: UI Thread Base64 Conversion Approach
      // 
      // This implementation uses the UI thread to convert Base64 to Uint8Array for a specific reason:
      // The Figma plugin main thread does NOT have access to browser APIs like `atob()` or `Uint8Array.fromBase64()`.
      // Only the UI thread (iframe context) has access to these browser APIs.
      //
      // Alternative approaches that DO NOT WORK:
      // 1. Direct Base64 decoding in main thread - `atob is not defined` error
      // 2. Sending large number arrays - causes JSON serialization hanging (681K+ numbers)
      // 3. Using Node.js Buffer - not available in Figma plugin context
      // 4. Manual Base64 decoding - complex and error-prone
      //
      // This UI thread approach is the ONLY reliable solution because:
      // - UI thread has `window.atob` for Base64 decoding
      // - Base64 strings serialize efficiently in JSON (vs large arrays)
      // - Maintains original image file format headers (PNG/JPEG/GIF)
      // - Works consistently across all Figma plugin environments
      //
      // WARNING: Do not "optimize" this by:
      // - Moving Base64 decoding to main thread (will fail)
      // - Using raw byte arrays for transmission (will hang)
      // - Attempting to use Node.js APIs (not available)
      // - Implementing manual Base64 decoding (unnecessary complexity)
      //
      // This architecture is intentional and required for Figma plugin constraints.
      
      logMessage('🔄 Sending Base64 to UI for conversion, length:', typeof params.imageBytes === 'string' ? params.imageBytes.length : 'not string');
      
      try {
        const base64String = typeof params.imageBytes === 'string' ? params.imageBytes : params.imageBytes[0];
        
        // Send to UI thread for Base64 conversion
        const bytesArray = await new Promise<Uint8Array>((resolve, reject) => {
          const messageId = Math.random().toString(36).substr(2, 9);
          
          // Set up one-time message listener
          const handleMessage = (msg: any) => {
            if (msg?.id === messageId) {
              figma.ui.off('message', handleMessage);
              if (msg.error) {
                reject(new Error(msg.error));
              } else {
                logMessage('✅ Received Uint8Array from UI, length:', msg.result.length);
                resolve(new Uint8Array(msg.result));
              }
            }
          };
          
          figma.ui.on('message', handleMessage);
          
          // Send Base64 to UI for conversion
          figma.ui.postMessage({
            type: 'CONVERT_BASE64_TO_UINT8ARRAY',
            id: messageId,
            base64: base64String
          });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            figma.ui.off('message', handleMessage);
            reject(new Error('Base64 conversion timeout'));
          }, 5000);
        });
        
        const result = await createImageFromBytes(bytesArray);
        logMessage('✅ createImageFromBytes successful, hash:', result.imageHash);
        imageHash = result.imageHash;
        imageDimensions = result.dimensions;
      } catch (bytesError) {
        logMessage('❌ Error in imageBytes processing:', bytesError.toString());
        throw new Error(`Failed to process imageBytes: ${bytesError.toString()}`);
      }
    } else if (params.imagePath) {
      // This would be handled by the server for file I/O
      throw new Error('imagePath must be handled by server - use imageUrl, imageHash, or imageBytes instead');
    } else {
      imageHash = params.imageHash;
    }
    
    // Handle node creation if no ID provided
    let nodeIds: string[];
    if (!params.nodeId) {
      // Create new rectangle node for image
      const rect = figma.createRectangle();
      rect.x = params.x ?? 0;
      rect.y = params.y ?? 0;
      
      if (imageDimensions) {
        rect.resize(imageDimensions.width, imageDimensions.height);
      } else {
        rect.resize(100, 100); // Default size
      }
      
      figma.currentPage.appendChild(rect);
      nodeIds = [rect.id];
    } else {
      nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    }
    
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        
        if (!('fills' in node)) {
          throw new Error(`Node ${nodeId} does not support fills`);
        }
        
        // Apply scale mode-aware transform processing
        const { paint: basePaint, warnings } = applyScaleModeAwareTransforms(
          imageHash,
          params.imageScaleMode ?? 'FILL',
          params
        );
        
        // Log any transform warnings for debugging
        if (warnings.length > 0) {
          logMessage('⚠️ Image transform warnings:', warnings);
        }
        
        // Apply image filters if provided
        let imagePaint = basePaint;
        if (params.filterExposure !== undefined || params.filterContrast !== undefined ||
            params.filterSaturation !== undefined || params.filterTemperature !== undefined ||
            params.filterTint !== undefined || params.filterHighlights !== undefined ||
            params.filterShadows !== undefined) {
          imagePaint = applyImageFilters(imagePaint, params);
        }
        
        // Apply common paint properties
        applyCommonPaintProperties(imagePaint, params);
        
        // Use FigmaPropertyManager for proper array handling
        modifyFills(node, (manager) => {
          if (params.insertIndex !== undefined) {
            manager.insert(params.insertIndex, imagePaint);
          } else {
            manager.push(imagePaint);
          }
        });
        
        const insertIndex = params.insertIndex ?? ((node as any).fills.length - 1);
        const response = await createFillAddResponse(nodeId, imagePaint, insertIndex, (node as any).fills.length);
        // Add image-specific data to response
        Object.assign(response, {
          imageHash,
          imageDimensions,
          transformWarnings: warnings.length > 0 ? warnings : undefined
        });
        results.push(response);
        
      } catch (error) {
        handleBulkError(error, nodeId, params, results);
      }
    }
    
    const allWarnings = results.flatMap(r => r.transformWarnings || []);
    const bulkSummary = createBulkSummary(results, nodeIds.length);
    
    // Add image-specific metadata to bulk summary
    return {
      ...bulkSummary,
      imageHash,
      imageDimensions,
      transformWarnings: allWarnings.length > 0 ? allWarnings : undefined
    };
  }

async function updateFillCommon(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    
    const currentFill = fills[fillIndex];
    
    // Check if user is trying to update type-specific properties
    if (params.color || params.stopColors || params.stopPositions || params.gradientType || 
        params.imageScaleMode || params.filterExposure !== undefined) {
      const fillType = currentFill.type;
      let suggestedOperation = '';
      
      if (fillType === 'SOLID') {
        suggestedOperation = 'update_solid';
      } else if (fillType.startsWith('GRADIENT_')) {
        suggestedOperation = 'update_gradient';
      } else if (fillType === 'IMAGE') {
        suggestedOperation = 'update_image';
      }
      
      throw new Error(`Cannot update ${fillType.toLowerCase()} fill properties with generic 'update' operation. Use '${suggestedOperation}' instead for type-specific updates.`);
    }
    
    // Use FigmaPropertyManager for proper array handling
    modifyFills(node, (manager) => {
      const updatedFill = clonePaint(currentFill);
      applyCommonPaintProperties(updatedFill, params);
      manager.update(fillIndex, updatedFill);
    });
    
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      (node as any).fills[fillIndex],
      (node as any).fills.length
    );
  }

async function updateSolidFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    
    validateFillType(fills, fillIndex, 'SOLID');
    
    const currentFill = fills[fillIndex];
    
    // Use FigmaPropertyManager for proper array handling
    modifyFills(node, (manager) => {
      const updatedFill = clonePaint(currentFill) as SolidPaint;
      
      // Update solid-specific properties
      if (params.color) {
        updatedFill.color = createSolidPaint(params.color).color;
      }
      
      // Update common properties
      applyCommonPaintProperties(updatedFill, params);
      
      manager.update(fillIndex, updatedFill);
    });
    
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      (node as any).fills[fillIndex],
      (node as any).fills.length
    );
  }

async function updateGradientFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    
    const currentFill = fills[fillIndex];
    if (!currentFill.type.startsWith('GRADIENT_')) {
      throw new Error(ERROR_MESSAGES.INVALID_FILL_TYPE(fillIndex, currentFill.type, 'gradient'));
    }
    
    // Use FigmaPropertyManager for proper array handling
    modifyFills(node, (manager) => {
      const updatedFill = clonePaint(currentFill) as GradientPaint;
      
      // Update gradient-specific properties
      if (params.stopColors) {
        if (params.stopPositions) {
          // Both colors and positions provided
          validateGradientStops(params.stopPositions, params.stopColors);
          updatedFill.gradientStops = convertStopArrays(params.stopPositions, params.stopColors);
        } else {
          // Only colors provided - use existing positions or create default positions
          const existingStops = updatedFill.gradientStops || [];
          const positions = existingStops.length === params.stopColors.length 
            ? existingStops.map(stop => stop.position)
            : params.stopColors.map((_, i) => i / Math.max(1, params.stopColors.length - 1));
          updatedFill.gradientStops = convertStopArrays(positions, params.stopColors);
        }
      } else if (params.stopPositions) {
        // Only positions provided - use existing colors
        const existingStops = updatedFill.gradientStops || [];
        if (existingStops.length === params.stopPositions.length) {
          const colors = existingStops.map(stop => {
            const color = stop.color;
            return `rgb(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)})`;
          });
          validateGradientStops(params.stopPositions, colors);
          updatedFill.gradientStops = convertStopArrays(params.stopPositions, colors);
        } else {
          throw new Error('Cannot update positions without colors when stop count differs');
        }
      }
      
      if (params.gradientType) {
        updatedFill.type = params.gradientType.toUpperCase() as any;
      }
      
      // Update gradient transform if coordinate parameters provided
      if (params.gradientStartX !== undefined || params.gradientStartY !== undefined ||
          params.gradientEndX !== undefined || params.gradientEndY !== undefined ||
          params.gradientScale !== undefined) {
        updatedFill.gradientTransform = createGradientTransform(
          updatedFill.type,
          {
            gradientStartX: params.gradientStartX,
            gradientStartY: params.gradientStartY,
            gradientEndX: params.gradientEndX,
            gradientEndY: params.gradientEndY,
            gradientScale: params.gradientScale
          }
        );
      }
      
      // Update common properties
      applyCommonPaintProperties(updatedFill, params);
      
      manager.update(fillIndex, updatedFill);
    });
    
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      (node as any).fills[fillIndex],
      (node as any).fills.length
    );
  }

async function updateImageFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${params.nodeId}`);
    }
    
    if (!('fills' in node)) {
      throw new Error(`Node ${params.nodeId} does not support fills`);
    }
    
    const fills = (node as any).fills;
    if (!Array.isArray(fills)) {
      throw new Error(`Node ${params.nodeId} has mixed fills`);
    }
    
    // Handle optional fillIndex - default to 0 for single fill, require explicit for multiple
    let fillIndex: number;
    if (params.fillIndex !== undefined && params.fillIndex !== null) {
      fillIndex = params.fillIndex;
    } else {
      if (fills.length === 0) {
        throw new Error(`Node ${params.nodeId} has no fills to update`);
      } else if (fills.length === 1) {
        fillIndex = 0; // Default to first fill for single-fill nodes
      } else {
        throw new Error(`Node ${params.nodeId} has ${fills.length} fills. Please specify fillIndex (0-${fills.length - 1}) to update a specific fill.`);
      }
    }
    
    if (fillIndex < 0 || fillIndex >= fills.length) {
      throw new Error(`Fill index ${fillIndex} out of bounds (0-${fills.length - 1})`);
    }
    
    const currentFill = fills[fillIndex];
    if (currentFill.type !== 'IMAGE') {
      throw new Error(`Fill at index ${fillIndex} is not an image fill (type: ${currentFill.type}). Use update_solid or update_gradient for other fill types.`);
    }
    
    // Use FigmaPropertyManager for proper array handling
    modifyFills(node, (manager) => {
      const updatedFill = clonePaint(currentFill) as ImagePaint;
      
      // Update image-specific properties
      if (params.imageScaleMode) {
        updatedFill.scaleMode = params.imageScaleMode.toUpperCase();
      }
      
      // Handle transformation and scale mode updates using scale mode-aware processing
      if (params.imageScaleMode || params.imageTransform || 
          params.transformOffsetX !== undefined || params.transformOffsetY !== undefined ||
          params.transformScale !== undefined || params.transformScaleX !== undefined || params.transformScaleY !== undefined ||
          params.transformRotation !== undefined || params.transformSkewX !== undefined || params.transformSkewY !== undefined ||
          params.imageTranslateX !== undefined || params.imageTranslateY !== undefined ||
          params.imageFlipHorizontal !== undefined || params.imageFlipVertical !== undefined) {
        
        // Determine the target scale mode (new mode takes precedence over current mode)
        const targetScaleMode = params.imageScaleMode?.toUpperCase() || updatedFill.scaleMode || 'FILL';
        
        // Apply scale mode-aware transform processing
        const { paint: transformedPaint, warnings } = applyScaleModeAwareTransforms(
          updatedFill.imageHash,
          targetScaleMode,
          params,
          updatedFill // Pass existing paint for property preservation
        );
        
        // Replace the updatedFill with the transformed paint
        Object.assign(updatedFill, transformedPaint);
        
        // Log warnings if any
        if (warnings.length > 0) {
          logWarning('Transform warnings:', warnings.join(', '));
        }
      }
      
      // Apply filter updates
      if (params.filterExposure !== undefined || params.filterContrast !== undefined ||
          params.filterSaturation !== undefined || params.filterTemperature !== undefined ||
          params.filterTint !== undefined || params.filterHighlights !== undefined ||
          params.filterShadows !== undefined) {
        const filteredPaint = applyImageFilters(updatedFill, params);
        Object.assign(updatedFill, filteredPaint);
      }
      
      // Update common properties
      if (params.opacity !== undefined) updatedFill.opacity = params.opacity;
      if (params.visible !== undefined) updatedFill.visible = params.visible;
      if (params.blendMode) updatedFill.blendMode = params.blendMode;
      
      manager.update(fillIndex, updatedFill);
    });
    
    const responseData = {
      nodeId: params.nodeId,
      fillIndex: fillIndex,
      updatedFill: (node as any).fills[fillIndex],
      totalFills: (node as any).fills.length
    };
    
    return await formatFillResponse(responseData);
  }

async function updatePatternFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const { node, fills } = validateNodeForFills(params.nodeId);
    const fillIndex = resolveFillIndex(params, fills);
    
    const currentFill = fills[fillIndex];
    if (currentFill.type !== 'PATTERN') {
      throw new Error(`Fill at index ${fillIndex} is not a pattern fill (type: ${currentFill.type}). Use update_solid, update_gradient, or update_image for other fill types.`);
    }
    
    // Use FigmaPropertyManager for proper array handling
    modifyFills(node, (manager) => {
      const updatedFill = clonePaint(currentFill) as PatternPaint;
      
      // Update pattern-specific properties
      if (params.sourceNodeId) {
        const sourceNode = figma.getNodeById(params.sourceNodeId);
        if (!sourceNode) {
          throw new Error(`Source node not found: ${params.sourceNodeId}`);
        }
        updatedFill.sourceNodeId = params.sourceNodeId;
      }
      
      if (params.patternTileType) {
        updatedFill.tileType = params.patternTileType.toUpperCase();
      }
      
      if (params.patternScalingFactor !== undefined) {
        updatedFill.scalingFactor = params.patternScalingFactor;
      }
      
      if (params.patternSpacingX !== undefined || params.patternSpacingY !== undefined) {
        updatedFill.spacing = {
          x: params.patternSpacingX ?? (updatedFill.spacing?.x ?? 0),
          y: params.patternSpacingY ?? (updatedFill.spacing?.y ?? 0)
        };
      }
      
      if (params.patternHorizontalAlignment) {
        updatedFill.horizontalAlignment = params.patternHorizontalAlignment.toUpperCase();
      }
      
      // Update common properties
      applyCommonPaintProperties(updatedFill, params);
      
      manager.update(fillIndex, updatedFill);
    });
    
    return await createFillUpdateResponse(
      params.nodeId,
      fillIndex,
      (node as any).fills[fillIndex],
      (node as any).fills.length
    );
  }

async function deleteFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId', 'fillIndex']);
    
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        
        if (!('fills' in node)) {
          throw new Error(`Node ${nodeId} does not support fills`);
        }
        
        const fills = (node as any).fills;
        if (!Array.isArray(fills)) {
          throw new Error(`Node ${nodeId} has mixed fills`);
        }
        
        if (params.fillIndex < 0 || params.fillIndex >= fills.length) {
          throw new Error(`Fill index ${params.fillIndex} out of bounds (0-${fills.length - 1})`);
        }
        
        let deletedFill: Paint;
        
        // Use FigmaPropertyManager for proper array handling
        modifyFills(node, (manager) => {
          deletedFill = manager.remove(params.fillIndex);
        });
        
        results.push({
          nodeId,
          deletedFill: deletedFill!,
          fillIndex: params.fillIndex,
          remainingFills: (node as any).fills.length
        });
        
      } catch (error) {
        if (params.failFast !== false) {
          throw error;
        }
        results.push({
          nodeId,
          error: error.toString()
        });
      }
    }
    
    return {
      results,
      totalNodes: nodeIds.length,
      successfulNodes: results.filter(r => !r.error).length
    };
  }

async function reorderFill(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId', 'fillIndex', 'newIndex']);
    
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      throw new Error(`Node not found: ${params.nodeId}`);
    }
    
    if (!('fills' in node)) {
      throw new Error(`Node ${params.nodeId} does not support fills`);
    }
    
    const fills = (node as any).fills;
    if (!Array.isArray(fills)) {
      throw new Error(`Node ${params.nodeId} has mixed fills`);
    }
    
    if (params.fillIndex < 0 || params.fillIndex >= fills.length) {
      throw new Error(`Fill index ${params.fillIndex} out of bounds (0-${fills.length - 1})`);
    }
    
    if (params.newIndex < 0 || params.newIndex >= fills.length) {
      throw new Error(`New index ${params.newIndex} out of bounds (0-${fills.length - 1})`);
    }
    
    // Use FigmaPropertyManager for proper array handling
    modifyFills(node, (manager) => {
      manager.move(params.fillIndex, params.newIndex);
    });
    
    return {
      nodeId: params.nodeId,
      fromIndex: params.fillIndex,
      toIndex: params.newIndex,
      reorderedFill: fills[params.newIndex],
      totalFills: fills.length
    };
  }

async function clearFills(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
    const results: any[] = [];
    
    for (const nodeId of nodeIds) {
      try {
        const node = figma.getNodeById(nodeId);
        if (!node) {
          throw new Error(`Node not found: ${nodeId}`);
        }
        
        if (!('fills' in node)) {
          throw new Error(`Node ${nodeId} does not support fills`);
        }
        
        const originalFillsCount = Array.isArray((node as any).fills) ? (node as any).fills.length : 0;
        
        // Clear all fills
        (node as any).fills = [];
        
        results.push({
          nodeId,
          clearedFillsCount: originalFillsCount
        });
        
      } catch (error) {
        if (params.failFast !== false) {
          throw error;
        }
        results.push({
          nodeId,
          error: error.toString()
        });
      }
    }
    
    return {
      results,
      totalNodes: nodeIds.length,
      successfulNodes: results.filter(r => !r.error).length
    };
  }

async function duplicateFills(params: any): Promise<OperationResult> {
    BaseOperation.validateParams(params, ['fromNodeId', 'toNodeId']);
    
    // Support both single source node and multiple source nodes
    const sourceNodeIds = Array.isArray(params.fromNodeId) ? params.fromNodeId : [params.fromNodeId];
    const sourceResults: any[] = [];
    let allFillsToCopy: Paint[] = [];
    
    // Collect fills from all source nodes
    for (const sourceNodeId of sourceNodeIds) {
      try {
        const sourceNode = figma.getNodeById(sourceNodeId);
        if (!sourceNode) {
          throw new Error(`Source node not found: ${sourceNodeId}`);
        }
        
        if (!('fills' in sourceNode)) {
          throw new Error(`Source node ${sourceNodeId} does not support fills`);
        }
        
        const sourceFills = (sourceNode as any).fills;
        if (!Array.isArray(sourceFills)) {
          throw new Error(`Source node ${sourceNodeId} has mixed fills`);
        }
        
        // Determine which fills to duplicate from this source
        let nodeSpecificFills: Paint[];
        if (params.fillIndex !== undefined) {
          // Duplicate single fill by index from each source node
          if (params.fillIndex < 0 || params.fillIndex >= sourceFills.length) {
            throw new Error(`Fill index ${params.fillIndex} out of bounds (0-${sourceFills.length - 1}) for source node ${sourceNodeId}`);
          }
          nodeSpecificFills = [sourceFills[params.fillIndex]];
        } else {
          // Duplicate all fills (default behavior)
          nodeSpecificFills = sourceFills;
        }
        
        // Add to the master collection
        allFillsToCopy.push(...nodeSpecificFills);
        
        sourceResults.push({
          sourceNodeId,
          sourceNodeName: sourceNode.name,
          sourceFillsCount: sourceFills.length,
          duplicatedFillsCount: nodeSpecificFills.length
        });
        
      } catch (error) {
        if (params.failFast !== false) {
          throw error;
        }
        sourceResults.push({
          sourceNodeId,
          error: error.toString()
        });
      }
    }
    
    // If no fills were collected due to errors, handle appropriately
    if (allFillsToCopy.length === 0) {
      if (sourceResults.some(r => r.error)) {
        throw new Error(`No fills could be collected from source nodes due to errors`);
      } else {
        throw new Error(`No fills found in source nodes to duplicate`);
      }
    }
    
    const fillsToCopy = allFillsToCopy;
    
    const targetNodeIds = Array.isArray(params.toNodeId) ? params.toNodeId : [params.toNodeId];
    const results: any[] = [];
    const overwrite = params.overwrite || 'NONE'; // 'NONE', 'SINGLE', 'ALL'
    
    for (const targetNodeId of targetNodeIds) {
      try {
        const targetNode = figma.getNodeById(targetNodeId);
        if (!targetNode) {
          throw new Error(`Target node not found: ${targetNodeId}`);
        }
        
        if (!('fills' in targetNode)) {
          throw new Error(`Target node ${targetNodeId} does not support fills`);
        }
        
        const targetFills = (targetNode as any).fills;
        if (!Array.isArray(targetFills)) {
          throw new Error(`Target node ${targetNodeId} has mixed fills`);
        }
        
        // Deep clone the fills to duplicate
        const clonedFills = fillsToCopy.map(fill => clonePaint(fill));
        
        let finalFills: Paint[];
        let originalFillsCount = targetFills.length;
        
        if (overwrite === 'ALL') {
          // Replace all existing fills
          finalFills = clonedFills;
        } else if (overwrite === 'SINGLE' && params.fillIndex !== undefined) {
          // Replace single fill at the same index
          if (params.fillIndex < targetFills.length) {
            finalFills = [...targetFills];
            finalFills[params.fillIndex] = clonedFills[0];
          } else {
            // Index out of bounds, add at end
            finalFills = [...targetFills, ...clonedFills];
          }
        } else {
          // NONE - add fills to existing ones (default)
          finalFills = [...targetFills, ...clonedFills];
        }
        
        // Apply fills to target node
        (targetNode as any).fills = finalFills;
        
        results.push({
          targetNodeId,
          targetNodeName: targetNode.name,
          overwrite,
          originalFillsCount,
          duplicatedFillsCount: clonedFills.length,
          finalFillsCount: finalFills.length,
          duplicatedFills: clonedFills
        });
        
      } catch (error) {
        if (params.failFast !== false) {
          throw error;
        }
        results.push({
          targetNodeId,
          error: error.toString()
        });
      }
    }
    
    const responseData = {
      // Updated to support bulk source operations
      sourceNodes: sourceResults,
      totalSourceNodes: sourceNodeIds.length,
      successfulSourceNodes: sourceResults.filter(r => !r.error).length,
      totalFillsCollected: fillsToCopy.length,
      
      // Target operation results
      overwrite,
      fillSelection: params.fillIndex !== undefined ? 'single' : 'all',
      targetResults: results,
      totalTargetNodes: targetNodeIds.length,
      successfulTargetNodes: results.filter(r => !r.error).length,
      
      // Legacy fields for backward compatibility (single source scenarios)
      ...(sourceNodeIds.length === 1 && sourceResults.length === 1 && !sourceResults[0].error ? {
        sourceNodeId: sourceNodeIds[0],
        sourceNodeName: sourceResults[0].sourceNodeName,
        sourceFillsCount: sourceResults[0].sourceFillsCount,
        duplicatedFillsCount: sourceResults[0].duplicatedFillsCount,
        results: results  // Legacy field name
      } : {})
    };
    
    return await formatFillResponse(responseData);
  }