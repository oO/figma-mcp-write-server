/**
 * Generic utility for managing Figma object/array properties
 * Implements the clone-modify-assign pattern to make properties appear read-write
 * Based on Figma API best practices: https://www.figma.com/plugin-docs/editing-properties/
 */

/**
 * Deep clone function following Figma API documentation
 */
export function clone(val: any): any {
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Array) return val.map(clone);
  if (typeof val === 'object') {
    const cloned: any = {};
    for (const key in val) {
      cloned[key] = clone(val[key]);
    }
    return cloned;
  }
  return val;
}

/**
 * Clean clone function that removes Figma internal properties
 * Strips properties like boundVariables that Figma tracks but doesn't accept on assignment
 */
function cleanClone(val: any): any {
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Array) return val.map(cleanClone);
  if (typeof val === 'object') {
    const cloned: any = {};
    for (const key in val) {
      // Skip Figma internal properties that cause validation errors
      if (key === 'boundVariables') continue;
      cloned[key] = cleanClone(val[key]);
    }
    return cloned;
  }
  return val;
}

/**
 * Generic property manager that makes Figma array/object properties appear read-write
 */
export class FigmaPropertyManager<T> {
  private target: any;
  private propertyName: string;
  private clonedArray: T[];

  constructor(target: any, propertyName: string) {
    this.target = target;
    this.propertyName = propertyName;
    // Use cleanClone for effects to remove boundVariables, regular clone for other properties
    const cloneFn = propertyName === 'effects' ? cleanClone : clone;
    this.clonedArray = cloneFn(target[propertyName] || []);
  }

  /**
   * Get the current array (cloned)
   */
  get array(): T[] {
    return this.clonedArray;
  }

  /**
   * Get item at index
   */
  get(index: number): T | undefined {
    return this.clonedArray[index];
  }

  /**
   * Add item to end of array
   */
  push(item: T): this {
    this.clonedArray.push(item);
    return this;
  }

  /**
   * Add item at specific index
   */
  insert(index: number, item: T): this {
    this.clonedArray.splice(index, 0, item);
    return this;
  }

  /**
   * Update item at index
   */
  update(index: number, item: T): this {
    if (index >= 0 && index < this.clonedArray.length) {
      this.clonedArray[index] = item;
    }
    return this;
  }

  /**
   * Remove item at index
   */
  remove(index: number): T | undefined {
    if (index >= 0 && index < this.clonedArray.length) {
      return this.clonedArray.splice(index, 1)[0];
    }
    return undefined;
  }

  /**
   * Move item from one index to another
   */
  move(fromIndex: number, toIndex: number): this {
    if (fromIndex >= 0 && fromIndex < this.clonedArray.length &&
        toIndex >= 0 && toIndex < this.clonedArray.length) {
      const item = this.clonedArray.splice(fromIndex, 1)[0];
      this.clonedArray.splice(toIndex, 0, item);
    }
    return this;
  }

  /**
   * Duplicate item at index to new index
   */
  duplicate(fromIndex: number, toIndex: number): this {
    if (fromIndex >= 0 && fromIndex < this.clonedArray.length &&
        toIndex >= 0 && toIndex <= this.clonedArray.length) {
      // Use cleanClone for effects to remove boundVariables, regular clone for other properties
      const cloneFn = this.propertyName === 'effects' ? cleanClone : clone;
      const item = cloneFn(this.clonedArray[fromIndex]);
      this.clonedArray.splice(toIndex, 0, item);
    }
    return this;
  }

  /**
   * Get array length
   */
  get length(): number {
    return this.clonedArray.length;
  }

  /**
   * Check if index is valid
   */
  isValidIndex(index: number): boolean {
    return index >= 0 && index < this.clonedArray.length;
  }

  /**
   * Apply all changes back to the Figma property
   */
  commit(): void {
    try {
      this.target[this.propertyName] = this.clonedArray;
    } catch (error) {
      // Handle known Figma API bug with pattern fills
      // Reference: https://forum.figma.com/report-a-problem-6/plugin-api-bug-fills-assignment-fails-when-there-s-a-pattern-fill-in-the-array-40378
      if (error.toString().includes('Invalid discriminator value') && 
          this.propertyName === 'fills' &&
          this.clonedArray.some((item: any) => item.type === 'PATTERN')) {
        throw new Error('Pattern fills are currently not supported due to a known Figma Plugin API bug. While pattern fills are available in the Figma UI and documented in the API, the Plugin API validation rejects PATTERN type fills. This is a Figma API limitation, not an implementation issue. Reference: https://forum.figma.com/report-a-problem-6/plugin-api-bug-fills-assignment-fails-when-there-s-a-pattern-fill-in-the-array-40378');
      }
      throw error;
    }
  }

  /**
   * Static convenience method for simple operations
   */
  static modify<T>(target: any, propertyName: string, modifier: (manager: FigmaPropertyManager<T>) => void): void {
    const manager = new FigmaPropertyManager<T>(target, propertyName);
    modifier(manager);
    manager.commit();
  }
}

/**
 * Convenience function for effects specifically
 */
export function modifyEffects(target: any, modifier: (manager: FigmaPropertyManager<any>) => void): void {
  FigmaPropertyManager.modify(target, 'effects', modifier);
}

/**
 * Convenience function for fills
 */
export function modifyFills(target: any, modifier: (manager: FigmaPropertyManager<any>) => void): void {
  FigmaPropertyManager.modify(target, 'fills', modifier);
}

/**
 * Convenience function for strokes
 */
export function modifyStrokes(target: any, modifier: (manager: FigmaPropertyManager<any>) => void): void {
  FigmaPropertyManager.modify(target, 'strokes', modifier);
}

/**
 * Convenience function for page backgrounds
 */
export function modifyBackgrounds(target: any, modifier: (manager: FigmaPropertyManager<any>) => void): void {
  FigmaPropertyManager.modify(target, 'backgrounds', modifier);
}

/**
 * Convenience function for page prototype backgrounds
 */
export function modifyPrototypeBackgrounds(target: any, modifier: (manager: FigmaPropertyManager<any>) => void): void {
  FigmaPropertyManager.modify(target, 'prototypeBackgrounds', modifier);
}

/**
 * Convenience function for export settings
 */
export function modifyExportSettings(target: any, modifier: (manager: FigmaPropertyManager<any>) => void): void {
  FigmaPropertyManager.modify(target, 'exportSettings', modifier);
}