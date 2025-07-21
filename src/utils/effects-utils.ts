/**
 * Effect Transformation Utilities
 * 
 * Extracted from effects-handler.ts to improve maintainability and reusability
 */

export interface EffectParams {
  type: string;
  visible?: boolean;
  color?: { r: number; g: number; b: number; a: number };
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  blendMode?: string;
  showShadowBehindNode?: boolean;
  size?: number;
  density?: number;
  noiseType?: string;
  secondaryColor?: { r: number; g: number; b: number; a: number };
  opacity?: number;
}

/**
 * Color conversion utilities
 */
export class ColorUtils {
  /**
   * Convert hex color to RGBA object that Figma expects
   */
  static hexToRgba(hex: string): { r: number; g: number; b: number; a: number } {
    const hexPattern = /^#([0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?)$/;
    if (!hexPattern.test(hex)) {
      throw new Error(`Invalid hex color format. Expected '#RRGGBB' or '#RRGGBBAA', got '${hex}'. Example: '#FF5733' or '#FF573380'`);
    }
    
    const hexValue = hex.slice(1);
    const r = parseInt(hexValue.substring(0, 2), 16) / 255;
    const g = parseInt(hexValue.substring(2, 4), 16) / 255;
    const b = parseInt(hexValue.substring(4, 6), 16) / 255;
    const a = hexValue.length === 8 ? parseInt(hexValue.substring(6, 8), 16) / 255 : 1;
    
    return { r, g, b, a };
  }

  /**
   * Validate if a hex color string is valid
   */
  static isValidHexColor(hex: string): boolean {
    const hexPattern = /^#([0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?)$/;
    return hexPattern.test(hex);
  }

  /**
   * Convert RGBA object back to hex string (for debugging/testing)
   */
  static rgbaToHex(rgba: { r: number; g: number; b: number; a?: number }): string {
    const toHex = (value: number) => Math.round(value * 255).toString(16).padStart(2, '0');
    const hex = `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
    return rgba.a !== undefined && rgba.a !== 1 ? `${hex}${toHex(rgba.a)}` : hex;
  }
}

/**
 * Effect parameter transformation utilities
 */
export class EffectTransformUtils {
  /**
   * Transform flat parameters into structured effect parameters
   */
  static transformFlatParamsToEffectParams(args: any): any {
    const transformedArgs = { ...args };

    // If creating or updating an effect, structure the effect parameters
    if ((args.operation === 'create' || args.operation === 'update') && args.effectType) {
      transformedArgs.effectParams = this.buildEffectParams(args);
    }

    return transformedArgs;
  }

  /**
   * Build structured effect parameters from flat parameters
   */
  static buildEffectParams(args: any): EffectParams {
    const effectType = args.effectType;
    const baseParams: any = {
      type: effectType,
      visible: args.visible !== undefined ? args.visible : true
    };

    // Build parameters based on effect type
    switch (effectType) {
      case 'DROP_SHADOW':
        return this.buildShadowEffectParams(baseParams, args, true);

      case 'INNER_SHADOW':
        return this.buildShadowEffectParams(baseParams, args, false);

      case 'LAYER_BLUR':
      case 'BACKGROUND_BLUR':
        return this.buildBlurEffectParams(baseParams, args);

      case 'NOISE':
        return this.buildNoiseEffectParams(baseParams, args);

      case 'TEXTURE':
        return this.buildTextureEffectParams(baseParams, args);

      default:
        throw new Error(`Unsupported effect type: ${effectType}. Supported types: DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR, NOISE, TEXTURE`);
    }
  }

  /**
   * Build shadow effect parameters (for DROP_SHADOW and INNER_SHADOW)
   */
  private static buildShadowEffectParams(baseParams: any, args: any, isDropShadow: boolean): EffectParams {
    const params: EffectParams = {
      ...baseParams,
      color: args.color ? ColorUtils.hexToRgba(args.color) : undefined,
      offset: args.offsetX !== undefined && args.offsetY !== undefined 
        ? { x: args.offsetX, y: args.offsetY } 
        : undefined,
      radius: args.radius,
      spread: args.spread,
      blendMode: args.blendMode
    };

    // showShadowBehindNode is only available for DROP_SHADOW
    if (isDropShadow) {
      params.showShadowBehindNode = args.showShadowBehindNode;
    }

    return params;
  }

  /**
   * Build blur effect parameters (for LAYER_BLUR and BACKGROUND_BLUR)
   */
  private static buildBlurEffectParams(baseParams: any, args: any): EffectParams {
    return {
      ...baseParams,
      radius: args.radius
    };
  }

  /**
   * Build noise effect parameters
   */
  private static buildNoiseEffectParams(baseParams: any, args: any): EffectParams {
    return {
      ...baseParams,
      blendMode: args.blendMode,
      size: args.size,
      density: args.density,
      noiseType: args.noiseType,
      secondaryColor: args.secondaryColor ? ColorUtils.hexToRgba(args.secondaryColor) : undefined,
      opacity: args.opacity
    };
  }

  /**
   * Build texture effect parameters
   */
  private static buildTextureEffectParams(baseParams: any, args: any): EffectParams {
    return {
      ...baseParams,
      size: args.size,
      radius: args.radius
    };
  }

  /**
   * Validate effect parameters based on effect type
   */
  static validateEffectParams(effectType: string, args: any): string[] {
    const errors: string[] = [];

    switch (effectType) {
      case 'DROP_SHADOW':
      case 'INNER_SHADOW':
        if (args.color && !ColorUtils.isValidHexColor(args.color)) {
          errors.push(`Invalid color format: ${args.color}`);
        }
        if (args.offsetX !== undefined && typeof args.offsetX !== 'number') {
          errors.push('offsetX must be a number');
        }
        if (args.offsetY !== undefined && typeof args.offsetY !== 'number') {
          errors.push('offsetY must be a number');
        }
        break;

      case 'LAYER_BLUR':
      case 'BACKGROUND_BLUR':
        if (args.radius !== undefined && (typeof args.radius !== 'number' || args.radius < 0)) {
          errors.push('radius must be a non-negative number');
        }
        break;

      case 'NOISE':
        if (args.secondaryColor && !ColorUtils.isValidHexColor(args.secondaryColor)) {
          errors.push(`Invalid secondaryColor format: ${args.secondaryColor}`);
        }
        break;
    }

    return errors;
  }
}