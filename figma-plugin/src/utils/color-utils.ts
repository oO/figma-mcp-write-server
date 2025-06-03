import { RGB, RGBA } from '../types.js';

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.5, g: 0.5, b: 0.5 }; // Default gray
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
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

export function normalizeHexColor(hex: string): string {
  if (!validateHexColor(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  let cleanHex = hex.replace(/^#/, '');
  
  // Convert 3-digit hex to 6-digit
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  return `#${cleanHex.toUpperCase()}`;
}

export function createSolidPaint(hex: string, opacity: number = 1): Paint {
  return {
    type: 'SOLID',
    color: hexToRgb(hex),
    opacity
  };
}

export function createGradientPaint(type: string, stops: any[], transform?: number[]): Paint {
  const paint: Paint = {
    type: type.toUpperCase(),
    gradientStops: stops.map(stop => ({
      position: stop.position,
      color: hexToRgba(stop.color, stop.opacity || 1)
    }))
  };
  
  if (transform) {
    paint.gradientTransform = transform as Transform;
  }
  
  return paint;
}

interface Paint {
  type: string;
  color?: RGB;
  opacity?: number;
  gradientStops?: any[];
  gradientTransform?: Transform;
}

interface Transform extends Array<number> {
  readonly length: 6;
}