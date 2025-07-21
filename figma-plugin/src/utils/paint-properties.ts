import { FILL_DEFAULTS } from './fill-constants.js';

/**
 * Applies common paint properties (opacity, visible, blendMode) to a paint object
 * @param paint - The paint object to modify
 * @param params - Parameters containing optional common properties
 */
export function applyCommonPaintProperties(paint: Paint, params: {
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
}): void {
  if (params.opacity !== undefined) paint.opacity = params.opacity;
  if (params.visible !== undefined) paint.visible = params.visible;
  if (params.blendMode) paint.blendMode = params.blendMode;
}

/**
 * Sets default values for paint properties if not already set
 * @param paint - The paint object to set defaults on
 */
export function setDefaultPaintProperties(paint: Paint): void {
  if (paint.opacity === undefined) paint.opacity = FILL_DEFAULTS.opacity;
  if (paint.visible === undefined) paint.visible = FILL_DEFAULTS.visible;
  if (!paint.blendMode) paint.blendMode = FILL_DEFAULTS.blendMode;
}

/**
 * Utility to normalize array parameters to always be arrays
 * @param value - Single value or array of values
 * @returns Array of values
 */
export function normalizeToArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/**
 * Creates a base paint object with common properties
 * @param type - The paint type
 * @param params - Parameters containing common properties
 * @returns Base paint object with common properties applied
 */
export function createBasePaint(type: string, params: {
  opacity?: number;
  visible?: boolean;
  blendMode?: string;
}): Paint {
  const basePaint: Paint = {
    type: type as any
  };
  
  setDefaultPaintProperties(basePaint);
  applyCommonPaintProperties(basePaint, params);
  
  return basePaint;
}