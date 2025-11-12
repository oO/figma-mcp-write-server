/**
 * Image Transform Utilities
 *
 * Provides intuitive designer-friendly API for CROP mode image transforms
 * Converts between designer thinking (pixels, natural scale) and Figma's UV texture mapping
 *
 * KEY INSIGHT: Figma's imageTransform is an INVERSE mapping (texture UV coordinates)
 * - Designer scale 2.0 (2x bigger) → Figma UV scale 0.5 (texture covers half the frame)
 * - Designer position 100px right → Figma UV offset negative (texture shifted left)
 */

export interface IntuitiveImageParams {
  // Position in pixels from frame top-left corner
  imagePositionX?: number;
  imagePositionY?: number;

  // Size in pixels (alternative to scale)
  imageWidth?: number;
  imageHeight?: number;

  // Scale relative to natural image size (1.0 = natural size, 2.0 = twice as big)
  imageScaleX?: number;
  imageScaleY?: number;

  // Rotation in degrees
  imageRotation?: number;
}

export interface FigmaUVParams {
  // UV coordinates (0-1 normalized, relative to frame)
  transformOffsetX: number;
  transformOffsetY: number;

  // UV scale (inverse of designer scale)
  transformScaleX: number;
  transformScaleY: number;

  // Rotation in degrees (same as designer)
  transformRotation?: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface FrameDimensions {
  width: number;
  height: number;
}

/**
 * Convert intuitive designer parameters to Figma UV coordinates
 *
 * @param intuitive - Designer-friendly parameters (pixels, natural scale)
 * @param frameDimensions - Frame/node dimensions
 * @param imageDimensions - Natural image dimensions
 * @returns Figma UV transform parameters
 *
 * @example
 * // Place 200x200 image at (100, 100) in 400x400 frame
 * intuitiveToCropTransform(
 *   { imagePositionX: 100, imagePositionY: 100, imageScale: 1.0 },
 *   { width: 400, height: 400 },
 *   { width: 200, height: 200 }
 * )
 * // Returns: { transformOffsetX: -0.25, transformOffsetY: -0.25, transformScaleX: 0.5, transformScaleY: 0.5 }
 */
export function intuitiveToCropTransform(
  intuitive: IntuitiveImageParams,
  frameDimensions: FrameDimensions,
  imageDimensions: ImageDimensions
): FigmaUVParams {

  // Step 1: Determine designer scale
  let designerScaleX: number;
  let designerScaleY: number;

  if (intuitive.imageWidth !== undefined || intuitive.imageHeight !== undefined) {
    // Explicit dimensions provided - convert to scale
    designerScaleX = (intuitive.imageWidth ?? imageDimensions.width) / imageDimensions.width;
    designerScaleY = (intuitive.imageHeight ?? imageDimensions.height) / imageDimensions.height;
  } else if (intuitive.imageScaleX !== undefined || intuitive.imageScaleY !== undefined) {
    // Explicit X/Y scales provided
    designerScaleX = intuitive.imageScaleX ?? 1.0;
    designerScaleY = intuitive.imageScaleY ?? 1.0;
  } else {
    // No scale specified - use natural size (1.0)
    designerScaleX = 1.0;
    designerScaleY = 1.0;
  }

  // Step 2: Convert designer scale to Figma UV scale (INVERSE)
  // Designer scale 2.0 (twice as big) → Figma UV 0.5 (texture covers half)
  const uvScaleX = 1 / designerScaleX;
  const uvScaleY = 1 / designerScaleY;

  // Step 3: Determine designer position (pixels from top-left)
  const positionX = intuitive.imagePositionX ?? 0;
  const positionY = intuitive.imagePositionY ?? 0;

  // Step 4: Convert pixel position to UV offset (NEGATIVE and normalized)
  // Designer position 100px right → Texture shifts LEFT in UV space
  // Formula: uvOffset = -position / frameSize
  const uvOffsetX = -positionX / frameDimensions.width;
  const uvOffsetY = -positionY / frameDimensions.height;

  return {
    transformOffsetX: uvOffsetX,
    transformOffsetY: uvOffsetY,
    transformScaleX: uvScaleX,
    transformScaleY: uvScaleY,
    transformRotation: intuitive.imageRotation
  };
}

/**
 * Convert Figma UV coordinates to intuitive designer parameters
 *
 * @param uv - Figma UV transform parameters
 * @param frameDimensions - Frame/node dimensions
 * @param imageDimensions - Natural image dimensions
 * @returns Designer-friendly parameters (pixels, natural scale)
 *
 * @example
 * // Read back transform
 * cropTransformToIntuitive(
 *   { transformOffsetX: -0.25, transformOffsetY: -0.25, transformScaleX: 0.5, transformScaleY: 0.5 },
 *   { width: 400, height: 400 },
 *   { width: 200, height: 200 }
 * )
 * // Returns: { imagePositionX: 100, imagePositionY: 100, imageScaleX: 2.0, imageScaleY: 2.0, ... }
 */
export function cropTransformToIntuitive(
  uv: FigmaUVParams,
  frameDimensions: FrameDimensions,
  imageDimensions: ImageDimensions
): IntuitiveImageParams & { imageWidth: number; imageHeight: number } {

  // Step 1: Convert UV scale to designer scale (INVERSE)
  // Figma UV 0.5 → Designer scale 2.0 (twice as big)
  const designerScaleX = 1 / uv.transformScaleX;
  const designerScaleY = 1 / uv.transformScaleY;

  // Step 2: Convert UV offset to pixel position (NEGATIVE and denormalize)
  // UV offset -0.25 → Position 100px (for 400px frame)
  const positionX = -uv.transformOffsetX * frameDimensions.width;
  const positionY = -uv.transformOffsetY * frameDimensions.height;

  // Step 3: Calculate explicit dimensions
  const imageWidth = imageDimensions.width * designerScaleX;
  const imageHeight = imageDimensions.height * designerScaleY;

  return {
    imagePositionX: Math.round(positionX * 100) / 100,
    imagePositionY: Math.round(positionY * 100) / 100,
    imageScaleX: Math.round(designerScaleX * 1000) / 1000,
    imageScaleY: Math.round(designerScaleY * 1000) / 1000,
    imageWidth: Math.round(imageWidth * 100) / 100,
    imageHeight: Math.round(imageHeight * 100) / 100,
    imageRotation: uv.transformRotation
  };
}

/**
 * Check if user is using intuitive API parameters
 */
export function hasIntuitiveParams(params: any): boolean {
  return !!(
    params.imagePositionX !== undefined ||
    params.imagePositionY !== undefined ||
    params.imageWidth !== undefined ||
    params.imageHeight !== undefined ||
    params.imageScaleX !== undefined ||
    params.imageScaleY !== undefined ||
    params.imageRotation !== undefined
  );
}

/**
 * Check if user is using legacy UV API parameters
 */
export function hasLegacyUVParams(params: any): boolean {
  return !!(
    params.transformOffsetX !== undefined ||
    params.transformOffsetY !== undefined ||
    params.transformScaleX !== undefined ||
    params.transformScaleY !== undefined ||
    params.transformScale !== undefined ||
    params.transformRotation !== undefined
  );
}
