import { RGB, RGBA } from '../types.js';
import { logger } from '../logger.js';
import { clone } from './figma-property-utils.js';

export function hexToRgb(hex: string): RGB {
  // Support both 6-digit (#RRGGBB) and 8-digit (#RRGGBBAA) hex colors
  // For 8-digit colors, we extract just the RGB part
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    };
  } else {
    return { r: 0.5, g: 0.5, b: 0.5 }; // Default gray
  }
}

export function hexToRgba(hex: string, alpha: number = 1): RGBA {
  const rgb = hexToRgb(hex);
  return Object.assign({}, rgb, { a: alpha });
}

export function rgbToHex(color: RGB): string {
  const toHex = (c: number) => {
    const normalized = Math.round(c * 255);
    const hex = normalized.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

export function validateHexColor(hex: string): boolean {
  if (!hex) return false;
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/.test(hex);
}

export function normalizeHexColor(hex: string): string {
  if (!validateHexColor(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  let cleanHex = hex.replace(/^#/, '');
  
  // Convert 3-digit hex to 6-digit (RGB)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  // Convert 4-digit hex to 8-digit (RGBA)
  else if (cleanHex.length === 4) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  return `#${cleanHex.toUpperCase()}`;
}

/**
 * Extract alpha channel from hex color
 * Returns 1.0 for 6-digit hex, extracted alpha for 8-digit hex
 */
export function extractAlphaFromHex(hex: string): number {
  const cleanHex = hex.replace(/^#/, '');
  
  if (cleanHex.length === 8) {
    // Extract alpha from AA in #RRGGBBAA
    const alphaHex = cleanHex.substring(6, 8);
    return parseInt(alphaHex, 16) / 255;
  } else if (cleanHex.length === 4) {
    // Extract alpha from A in #RGBA (after normalization it becomes AA)
    const normalizedHex = normalizeHexColor(hex).replace(/^#/, '');
    const alphaHex = normalizedHex.substring(6, 8);
    return parseInt(alphaHex, 16) / 255;
  }
  
  // 6-digit or 3-digit hex colors have full opacity
  return 1.0;
}

/**
 * Remove alpha channel from hex color, returning just RGB portion
 */
export function stripAlphaFromHex(hex: string): string {
  const cleanHex = hex.replace(/^#/, '');
  
  if (cleanHex.length === 8) {
    // Return just RGB portion from #RRGGBBAA
    return `#${cleanHex.substring(0, 6)}`;
  } else if (cleanHex.length === 4) {
    // Return just RGB portion from #RGBA
    return `#${cleanHex.substring(0, 3)}`;
  }
  
  // Already RGB-only
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Parse hex color and extract both RGB and alpha components
 */
export function parseHexColor(hex: string): { rgb: string; alpha: number } {
  const alpha = extractAlphaFromHex(hex);
  const rgb = stripAlphaFromHex(hex);
  
  return { rgb, alpha };
}

export function createSolidPaint(hex: string, opacity?: number): SolidPaint {
  // If opacity is not provided, extract it from the hex color's alpha channel
  const finalOpacity = opacity !== undefined ? opacity : extractAlphaFromHex(hex);
  
  // Always use RGB portion for the color
  const rgbHex = stripAlphaFromHex(hex);
  
  return {
    type: 'SOLID',
    color: hexToRgb(rgbHex),
    opacity: finalOpacity
  };
}

export function createGradientPaint(type: string, stops: any[], transform?: number[]): GradientPaint {
  const paint: any = {
    type: type.toUpperCase() as any,
    gradientStops: stops.map(stop => ({
      position: stop.position,
      color: hexToRgba(stop.color, stop.opacity || 1)
    }))
  };
  
  if (transform) {
    paint.gradientTransform = transform as Transform;
  }
  
  return paint as GradientPaint;
}

/**
 * Transform strategy types based on scale mode constraints
 */
type TransformStrategy = 'MATRIX_TRANSFORM' | 'INDIVIDUAL_PROPERTIES' | 'ROTATION_LIMITED';

/**
 * Determine transform strategy based on scale mode
 */
function getTransformStrategy(scaleMode: string): TransformStrategy {
  switch (scaleMode.toUpperCase()) {
    case 'CROP':
      return 'MATRIX_TRANSFORM';
    case 'TILE': 
      return 'INDIVIDUAL_PROPERTIES';
    case 'FILL':
    case 'FIT':
      return 'ROTATION_LIMITED';
    default:
      return 'MATRIX_TRANSFORM'; // fallback
  }
}

/**
 * Validate transform parameters for scale mode and return warnings
 */
function validateTransformParams(scaleMode: string, params: any): { 
  valid: boolean; 
  warnings: string[]; 
  rotation?: number; 
} {
  const warnings: string[] = [];
  const upperScaleMode = scaleMode.toUpperCase();
  
  switch (upperScaleMode) {
    case 'CROP':
      // All parameters valid for CROP mode
      return { valid: true, warnings: [] };
      
    case 'TILE':
      if (params.transformRotation && params.transformRotation % 90 !== 0) {
        warnings.push('TILE mode rotation rounded to nearest 90° increment');
      }
      return { 
        valid: true, 
        warnings, 
        rotation: params.transformRotation ? Math.round(params.transformRotation / 90) * 90 : 0
      };
      
    case 'FILL':
    case 'FIT':
      if (params.transformScale || params.transformScaleX || params.transformScaleY) {
        warnings.push(`Scaling ignored in ${upperScaleMode} mode (auto-computed by Figma)`);
      }
      if (params.transformSkewX || params.transformSkewY) {
        warnings.push(`Skewing not supported in ${upperScaleMode} mode`);
      }
      if (params.transformOffsetX || params.transformOffsetY || params.imageTranslateX || params.imageTranslateY) {
        warnings.push(`Translation ignored in ${upperScaleMode} mode (auto-computed by Figma)`);
      }
      if (params.transformRotation && params.transformRotation % 90 !== 0) {
        warnings.push(`${upperScaleMode} mode rotation rounded to nearest 90° increment`);
      }
      return { 
        valid: true, 
        warnings,
        rotation: params.transformRotation ? Math.round(params.transformRotation / 90) * 90 : 0
      };
      
    default:
      return { valid: true, warnings: [] };
  }
}

/**
 * Generate individual properties for TILE/FILL/FIT modes
 */
function generateIndividualProperties(params: any, validation: any): { 
  rotation?: number; 
  scalingFactor?: number; 
} {
  const result: any = {};
  
  if (validation.rotation !== undefined) {
    result.rotation = validation.rotation;
  }
  
  if (params.transformScale && params.transformScale !== 1) {
    result.scalingFactor = params.transformScale;
  }
  
  return result;
}

/**
 * Create a pattern paint with proper defaults from flattened parameters
 */
export function createPatternPaint(
  sourceNodeId: string,
  tileType: string = 'RECTANGULAR',
  scalingFactor: number = 1.0,
  spacingX: number = 0,
  spacingY: number = 0,
  horizontalAlignment: string = 'START'
): PatternPaint {
  return {
    type: 'PATTERN',
    sourceNodeId,
    tileType: tileType.toUpperCase() as any,
    scalingFactor,
    spacing: { x: spacingX, y: spacingY },
    horizontalAlignment: horizontalAlignment.toUpperCase() as any,
    visible: true,
    opacity: 1
  };
}

/**
 * Create an ImagePaint object with scale mode-aware transform handling
 */
export function createImagePaint(
  imageHash: string, 
  scaleMode: string = 'FILL', 
  transformParams?: any, 
  filters?: any
): { paint: ImagePaint; warnings: string[] } {
  const paint: any = {
    type: 'IMAGE',
    imageHash,
    scaleMode: scaleMode.toUpperCase()
  };
  
  let warnings: string[] = [];
  
  if (transformParams) {
    const strategy = getTransformStrategy(scaleMode);
    const validation = validateTransformParams(scaleMode, transformParams);
    warnings = validation.warnings;
    
    switch (strategy) {
      case 'MATRIX_TRANSFORM':
        // CROP mode: Use full matrix transform
        paint.imageTransform = flattenedToImageMatrix(transformParams);
        break;
        
      case 'INDIVIDUAL_PROPERTIES':
        // TILE mode: Use individual rotation and scalingFactor properties
        const tileProps = generateIndividualProperties(transformParams, validation);
        if (tileProps.rotation !== undefined) {
          paint.rotation = tileProps.rotation;
        }
        if (tileProps.scalingFactor !== undefined) {
          paint.scalingFactor = tileProps.scalingFactor;
        }
        break;
        
      case 'ROTATION_LIMITED':
        // FILL/FIT mode: Only rotation property (90° increments)
        if (validation.rotation !== undefined && validation.rotation !== 0) {
          paint.rotation = validation.rotation;
        }
        break;
    }
  }
  
  if (filters) {
    paint.filters = filters;
  }
  
  return { paint: paint as ImagePaint, warnings };
}

/**
 * Extract mode-specific transform parameters from ImagePaint
 * Only returns parameters that are actually effective for the given scale mode
 */
export function extractFlattenedImageParams(paint: ImagePaint): Record<string, number> {
  const scaleMode = paint.scaleMode || 'FILL';
  const result: Record<string, number> = {};
  
  switch (scaleMode.toUpperCase()) {
    case 'CROP':
      // CROP mode: Extract full transform parameters from matrix
      if (paint.imageTransform) {
        const flattened = imageMatrixToFlattened(paint.imageTransform);
        result.transformOffsetX = flattened.transformOffsetX;
        result.transformOffsetY = flattened.transformOffsetY;
        result.transformScaleX = flattened.transformScaleX;
        result.transformScaleY = flattened.transformScaleY;
        result.transformRotation = flattened.transformRotation;
        result.transformSkewX = flattened.transformSkewX;
        result.transformSkewY = flattened.transformSkewY;
      }
      break;
      
    case 'TILE':
      // TILE mode: Only rotation and uniform scale
      if ('rotation' in paint && paint.rotation !== undefined) {
        result.transformRotation = paint.rotation;
      }
      if ('scalingFactor' in paint && paint.scalingFactor !== undefined) {
        result.transformScale = paint.scalingFactor;
      }
      break;
      
    case 'FILL':
    case 'FIT':
      // FILL/FIT mode: Only rotation (scaling is auto-computed by Figma)
      if ('rotation' in paint && paint.rotation !== undefined) {
        result.transformRotation = paint.rotation;
      }
      break;
      
    default:
      // Unknown scale mode, return empty
      break;
  }
  
  return result;
}

/**
 * Create image from URL and return hash with dimensions
 */
export async function createImageFromUrl(url: string): Promise<{imageHash: string, dimensions: {width: number, height: number}}> {
  try {
    const image = await figma.createImageAsync(url);
    const size = await image.getSizeAsync();
    return {
      imageHash: image.hash,
      dimensions: { width: size.width, height: size.height }
    };
  } catch (error) {
    throw new Error(`Failed to create image from URL: ${error}`);
  }
}

/**
 * Create image from local file bytes and return hash with dimensions
 */
export async function createImageFromBytes(bytes: Uint8Array): Promise<{imageHash: string, dimensions: {width: number, height: number}}> {
  try {
    logger.log('🔄 createImageFromBytes called with bytes length:', bytes.length);
    logger.log('🔄 Checking figma object:', typeof figma);
    logger.log('🔄 Checking figma.createImage:', typeof figma.createImage);
    
    if (typeof figma.createImage !== 'function') {
      throw new Error(`figma.createImage is not a function, it is: ${typeof figma.createImage}`);
    }
    
    logger.log('🔄 About to call figma.createImage...');
    const image = figma.createImage(bytes);
    logger.log('🔄 figma.createImage successful, got image:', !!image);
    logger.log('🔄 Image hash:', image.hash);
    logger.log('🔄 About to get size...');
    const size = await image.getSizeAsync();
    logger.log('🔄 getSizeAsync successful, size:', size);
    
    return {
      imageHash: image.hash,
      dimensions: { width: size.width, height: size.height }
    };
  } catch (error) {
    logger.log('❌ Error in createImageFromBytes:', error.toString());
    throw new Error(`Failed to create image from bytes: ${error.toString()}`);
  }
}

/**
 * Validate Paint object structure
 */
export function validatePaint(paint: Paint): boolean {
  if (!paint || typeof paint !== 'object' || !paint.type) {
    return false;
  }
  
  switch (paint.type) {
    case 'SOLID':
      return !!(paint as SolidPaint).color;
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_ANGULAR':
    case 'GRADIENT_DIAMOND':
      return Array.isArray((paint as GradientPaint).gradientStops);
    case 'IMAGE':
      return !!(paint as ImagePaint).imageHash;
    default:
      return false;
  }
}


/**
 * Check if paint is of specific type
 */
export function isPaintType(paint: Paint, type: string): boolean {
  return paint.type === type.toUpperCase();
}

/**
 * Get image dimensions from hash
 */
export async function getImageDimensions(imageHash: string): Promise<{width: number, height: number} | null> {
  try {
    const image = figma.getImageByHash(imageHash);
    if (!image) return null;
    const size = await image.getSizeAsync();
    return { width: size.width, height: size.height };
  } catch (error) {
    return null;
  }
}

/**
 * Apply image filters to ImagePaint
 */
export function applyImageFilters(paint: ImagePaint, filterValues: any): ImagePaint {
  const clonedPaint = clone(paint) as ImagePaint;
  
  if (filterValues) {
    clonedPaint.filters = {
      // Start with existing filters (if any)
      ...clonedPaint.filters,
      // Override with new filter values (using !== undefined to allow 0 values)
      ...(filterValues.filterExposure !== undefined && { exposure: filterValues.filterExposure }),
      ...(filterValues.filterContrast !== undefined && { contrast: filterValues.filterContrast }),
      ...(filterValues.filterSaturation !== undefined && { saturation: filterValues.filterSaturation }),
      ...(filterValues.filterTemperature !== undefined && { temperature: filterValues.filterTemperature }),
      ...(filterValues.filterTint !== undefined && { tint: filterValues.filterTint }),
      ...(filterValues.filterHighlights !== undefined && { highlights: filterValues.filterHighlights }),
      ...(filterValues.filterShadows !== undefined && { shadows: filterValues.filterShadows })
    };
  }
  
  return clonedPaint;
}

/**
 * Convert parallel arrays of positions and colors to ColorStop array
 */
export function convertStopArrays(positions: number[], colors: string[]): ColorStop[] {
  if (positions.length !== colors.length) {
    throw new Error('Position and color arrays must have the same length');
  }
  
  return positions.map((position, index) => ({
    position,
    color: hexToRgba(colors[index])
  }));
}

/**
 * Convert flattened gradient handle coordinates to Vector array
 */
export function convertFlattenedHandles(flattenedHandles: {
  gradientStartX?: number;
  gradientStartY?: number;
  gradientEndX?: number;
  gradientEndY?: number;
  gradientWidthX?: number;
  gradientWidthY?: number;
}): Vector[] {
  return [
    { x: flattenedHandles.gradientStartX || 0, y: flattenedHandles.gradientStartY || 0.5 },
    { x: flattenedHandles.gradientEndX || 1, y: flattenedHandles.gradientEndY || 0.5 },
    { x: flattenedHandles.gradientWidthX || 0.5, y: flattenedHandles.gradientWidthY || 0 }
  ];
}

/**
 * Create gradient transform with smart defaults for each gradient type
 */
export function createGradientTransform(
  gradientType: string,
  coordinates: {
    gradientStartX?: number;
    gradientStartY?: number;
    gradientEndX?: number;
    gradientEndY?: number;
    gradientScale?: number;
  }
): Transform {
  const type = gradientType.toUpperCase();
  
  // If custom coordinates provided, use them
  if (coordinates.gradientStartX !== undefined || coordinates.gradientStartY !== undefined ||
      coordinates.gradientEndX !== undefined || coordinates.gradientEndY !== undefined ||
      coordinates.gradientScale !== undefined) {
    return flattenedToMatrix(coordinates);
  }
  
  // Smart defaults for each gradient type
  switch (type) {
    case 'GRADIENT_LINEAR':
      // Horizontal left-to-right gradient
      return [[1, 0, 0], [0, 1, 0]];
      
    case 'GRADIENT_RADIAL':
      // Radial gradient from center
      return [[0.5, 0, 0.5], [0, 0.5, 0.5]];
      
    case 'GRADIENT_ANGULAR':
      // Angular gradient from center
      return [[0.5, 0, 0.5], [0, 0.5, 0.5]];
      
    case 'GRADIENT_DIAMOND':
      // Diamond gradient from center
      return [[0.5, 0, 0.5], [0, 0.5, 0.5]];
      
    default:
      // Default to linear horizontal
      return [[1, 0, 0], [0, 1, 0]];
  }
}

/**
 * Create default gradient stops (white to black)
 */
export function createDefaultGradientStops(): ColorStop[] {
  return [
    { position: 0, color: { r: 1, g: 1, b: 1, a: 1 } }, // white
    { position: 1, color: { r: 0, g: 0, b: 0, a: 1 } }  // black
  ];
}

/**
 * Convert flattened gradient parameters to Figma Transform matrix
 * Fixed to properly handle gradient coordinate system and scaling
 */
export function flattenedToMatrix(params: {
  gradientStartX?: number;
  gradientStartY?: number;
  gradientEndX?: number;
  gradientEndY?: number;
  gradientScale?: number;
}): Transform {
  // Extract gradient parameters with sensible defaults
  const startX = params.gradientStartX ?? 0;
  const startY = params.gradientStartY ?? 0.5;
  const endX = params.gradientEndX ?? 1;
  const endY = params.gradientEndY ?? 0.5;
  const explicitScale = params.gradientScale;
  
  // Calculate direction vector from start to end points
  const directionX = endX - startX;
  const directionY = endY - startY;
  
  // Determine final gradient vector based on whether scale is explicitly provided
  let gradientVectorX: number, gradientVectorY: number;
  
  if (explicitScale !== undefined) {
    // Scale is provided - normalize direction and apply scale
    const naturalLength = Math.sqrt(directionX * directionX + directionY * directionY);
    const normalizedX = naturalLength > 0 ? directionX / naturalLength : 1;
    const normalizedY = naturalLength > 0 ? directionY / naturalLength : 0;
    gradientVectorX = normalizedX * explicitScale;
    gradientVectorY = normalizedY * explicitScale;
  } else {
    // No explicit scale - use direction vector as-is (scale = distance between start and end)
    gradientVectorX = directionX;
    gradientVectorY = directionY;
  }
  
  // Create perpendicular vector for gradient width (90-degree rotation)
  const perpendicularX = -gradientVectorY;
  const perpendicularY = gradientVectorX;
  
  // Build gradient transformation matrix
  // Format: [[vectorX, perpX, startX], [vectorY, perpY, startY]]
  return [
    [gradientVectorX, perpendicularX, startX],
    [gradientVectorY, perpendicularY, startY]
  ];
}

/**
 * Convert Figma Transform matrix to flattened gradient parameters
 * Fixed to properly extract gradient start, end, and scale
 */
export function matrixToFlattened(matrix: Transform): {
  gradientStartX: number;
  gradientStartY: number;
  gradientEndX: number;
  gradientEndY: number;
  gradientScale: number;
} {
  // Gradient matrix format: [[vectorX, perpX, startX], [vectorY, perpY, startY]]
  // Where: vectorX,vectorY = primary gradient direction vector
  //        perpX,perpY = perpendicular vector for gradient width (unused in flattened form)
  //        startX,startY = gradient start position
  const [[vectorX, perpX, startX], [vectorY, perpY, startY]] = matrix;
  
  // Extract start position from translation components
  const gradientStartX = startX;
  const gradientStartY = startY;
  
  // Extract the gradient vector length (this is the effective scale)
  const vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
  
  // Calculate end position by adding the direction vector to start position
  const gradientEndX = gradientStartX + vectorX;
  const gradientEndY = gradientStartY + vectorY;
  
  return {
    gradientStartX: Number(gradientStartX.toFixed(3)),
    gradientStartY: Number(gradientStartY.toFixed(3)),
    gradientEndX: Number(gradientEndX.toFixed(3)),
    gradientEndY: Number(gradientEndY.toFixed(3)),
    gradientScale: Number(vectorLength.toFixed(3))
  };
}

/**
 * Convert image transformation matrix to flattened parameters
 * Using correct 2D matrix decomposition formulas
 * 
 * Matrix format follows CSS matrix(a, b, c, d, e, f) specification:
 * a = scaleX(), b = skewY(), c = skewX(), d = scaleY(), e = translateX(), f = translateY()
 * Source: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
 * 
 * Internal representation: [[a, c, e], [b, d, f]] = [[scaleX, skewX, translateX], [skewY, scaleY, translateY]]
 */
export function imageMatrixToFlattened(matrix: Transform): {
  transformOffsetX: number;
  transformOffsetY: number;
  transformScale: number;
  transformScaleX: number;
  transformScaleY: number;
  transformRotation: number;
  transformSkewX: number;
  transformSkewY: number;
  imageTranslateX: number;
  imageTranslateY: number;
} {
  // 2D transformation matrix format: [[m11, m12, tx], [m21, m22, ty]]
  // Where: m11,m12 = first row (X-axis transform), m21,m22 = second row (Y-axis transform)
  //        tx,ty = translation components
  const [[m11, m12, tx], [m21, m22, ty]] = matrix;
  
  // Extract translation components (straightforward)
  const imageTranslateX = tx;
  const imageTranslateY = ty;
  
  // Extract scale values using the magnitude of each axis vector
  // Preserve sign to handle flips correctly
  const scaleX = Math.sqrt(m11 * m11 + m12 * m12) * Math.sign(m11 || 1);
  const scaleY = Math.sqrt(m21 * m21 + m22 * m22) * Math.sign(m22 || 1);
  const averageScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
  
  // Extract rotation angle from the first column vector (X-axis)
  const rotationRadians = Math.atan2(m12, m11);
  const rotationDegrees = rotationRadians * (180 / Math.PI);
  
  // Extract skew by removing rotation from the Y-axis vector
  const cosRotation = Math.cos(-rotationRadians);
  const sinRotation = Math.sin(-rotationRadians);
  
  // Rotate the Y-axis vector back to isolate skew
  const derotatedYx = m21 * cosRotation - m22 * sinRotation;
  const derotatedYy = m21 * sinRotation + m22 * cosRotation;
  
  // Calculate skew angle from the derotated Y vector
  const skewRadians = Math.abs(scaleX) > 0 ? Math.atan2(derotatedYx, Math.abs(scaleX)) : 0;
  const skewDegrees = skewRadians * (180 / Math.PI);
  
  // Calculate relative offset (-1 to 1 range, normalized to 200px reference)
  const offsetX = Math.max(-1, Math.min(1, imageTranslateX / 200));
  const offsetY = Math.max(-1, Math.min(1, imageTranslateY / 200));
  
  return {
    transformOffsetX: Number(offsetX.toFixed(3)),
    transformOffsetY: Number(offsetY.toFixed(3)),
    transformScale: Number(averageScale.toFixed(3)),
    transformScaleX: Number(scaleX.toFixed(3)),
    transformScaleY: Number(scaleY.toFixed(3)),
    transformRotation: Number(rotationDegrees.toFixed(1)),
    transformSkewX: Number(skewDegrees.toFixed(1)),
    transformSkewY: 0, // Y-skew is typically absorbed into X-skew for 2D transforms
    imageTranslateX: Number(imageTranslateX.toFixed(1)),
    imageTranslateY: Number(imageTranslateY.toFixed(1))
  };
}

/**
 * Convert flattened image parameters to transformation matrix
 * Creates a 2D transformation matrix from individual transform components
 * 
 * Matrix format follows CSS matrix(a, b, c, d, e, f) specification:
 * a = scaleX(), b = skewY(), c = skewX(), d = scaleY(), e = translateX(), f = translateY()
 * Source: https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
 * 
 * Internal representation: [[a, c, e], [b, d, f]] = [[scaleX, skewX, translateX], [skewY, scaleY, translateY]]
 */
export function flattenedToImageMatrix(params: {
  transformOffsetX?: number;
  transformOffsetY?: number;
  transformScale?: number;
  transformScaleX?: number;
  transformScaleY?: number;
  transformRotation?: number;
  transformSkewX?: number;
  transformSkewY?: number;
  imageTranslateX?: number;
  imageTranslateY?: number;
  imageFlipHorizontal?: boolean;
  imageFlipVertical?: boolean;
}): Transform {
  // Extract parameters with defaults
  const rotation = (params.transformRotation ?? 0) * Math.PI / 180; // Convert to radians
  const skewX = (params.transformSkewX ?? 0) * Math.PI / 180; // Convert to radians
  const skewY = (params.transformSkewY ?? 0) * Math.PI / 180; // Convert to radians
  
  // Handle scale parameters (scaleX/Y override uniform scale)
  let scaleX = params.transformScaleX ?? params.transformScale ?? 1;
  let scaleY = params.transformScaleY ?? params.transformScale ?? 1;
  
  // Apply flips as negative scale
  if (params.imageFlipHorizontal) scaleX *= -1;
  if (params.imageFlipVertical) scaleY *= -1;
  
  // Handle translation (offset vs translate parameters)
  let translateX = 0;
  let translateY = 0;
  
  // Use either translate or offset parameters, with translate taking precedence
  if (params.imageTranslateX !== undefined) {
    translateX = params.imageTranslateX;
  } else if (params.transformOffsetX !== undefined) {
    translateX = params.transformOffsetX * 200; // Convert offset to pixels
  }
  
  if (params.imageTranslateY !== undefined) {
    translateY = params.imageTranslateY;
  } else if (params.transformOffsetY !== undefined) {
    translateY = params.transformOffsetY * 200; // Convert offset to pixels
  }
  
  // Build transformation matrix step by step
  // Order: Scale -> Skew -> Rotate -> Translate
  
  // 1. Scale matrix
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const tanSkewX = Math.tan(skewX);
  const tanSkewY = Math.tan(skewY);
  
  // Combined transformation matrix: Scale * Skew * Rotate
  // This follows the standard order for CSS transforms
  const a = scaleX * cos - scaleY * tanSkewY * sin;
  const b = scaleX * sin + scaleY * tanSkewY * cos;
  const c = scaleY * tanSkewX * cos - scaleX * tanSkewX * cos + scaleY * sin;
  const d = scaleY * tanSkewX * sin - scaleX * tanSkewX * sin + scaleY * cos;
  
  // Simplify for common case (no skew)
  if (Math.abs(tanSkewX) < 0.001 && Math.abs(tanSkewY) < 0.001) {
    return [
      [scaleX * cos, scaleX * sin, translateX],
      [-scaleY * sin, scaleY * cos, translateY]
    ];
  }
  
  // Full matrix with skew
  return [
    [a, b, translateX],
    [c, d, translateY]
  ];
}