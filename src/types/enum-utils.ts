import { z } from 'zod';

// ================================================================================
// Enum Utilities - Case-Insensitive Preprocessing
// ================================================================================

/**
 * Case-insensitive enum preprocessor that normalizes input values to match
 * expected enum cases, improving Agent Experience by eliminating trial-and-error
 */
export class EnumPreprocessor {
  private static enumMappings = new Map<string, Map<string, string>>();

  /**
   * Register an enum with its case variations for preprocessing
   */
  static registerEnum(enumValues: readonly string[], caseSensitive: boolean = false): z.ZodEnum<any> {
    const enumSchema = z.enum(enumValues as [string, ...string[]]);
    
    if (!caseSensitive) {
      // Create mapping of all case variations to canonical values
      const mappings = new Map<string, string>();
      
      enumValues.forEach(canonicalValue => {
        // Add exact match
        mappings.set(canonicalValue, canonicalValue);
        // Add lowercase variation
        mappings.set(canonicalValue.toLowerCase(), canonicalValue);
        // Add uppercase variation
        mappings.set(canonicalValue.toUpperCase(), canonicalValue);
        // Add title case variation
        mappings.set(canonicalValue.charAt(0).toUpperCase() + canonicalValue.slice(1).toLowerCase(), canonicalValue);
        // Add camelCase/PascalCase handling for multi-word enums
        if (canonicalValue.includes('_')) {
          const camelCase = canonicalValue.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          mappings.set(camelCase, canonicalValue);
          mappings.set(camelCase.charAt(0).toUpperCase() + camelCase.slice(1), canonicalValue);
        }
      });
      
      this.enumMappings.set(enumValues.join('|'), mappings);
    }
    
    return enumSchema;
  }

  /**
   * Preprocess enum value to canonical form before Zod validation
   */
  static preprocessEnumValue(value: any, enumValues: readonly string[]): any {
    if (typeof value !== 'string') return value;
    
    const enumKey = enumValues.join('|');
    const mappings = this.enumMappings.get(enumKey);
    
    if (mappings && mappings.has(value)) {
      return mappings.get(value);
    }
    
    return value; // Return original if no mapping found
  }

  /**
   * Create a case-insensitive enum schema with preprocessing
   */
  static createCaseInsensitiveEnum<T extends readonly [string, ...string[]]>(
    enumValues: T
  ): z.ZodEffects<z.ZodEnum<[...T]>, T[number], unknown> {
    const baseEnum = this.registerEnum(enumValues, false);
    
    return z.preprocess(
      (value) => this.preprocessEnumValue(value, enumValues),
      baseEnum as z.ZodEnum<[...T]>
    );
  }

  /**
   * Create multiple case-insensitive enums from enum definition object
   */
  static createCaseInsensitiveEnums<T extends Record<string, z.ZodEnum<any>>>(
    enumDefs: T
  ): { [K in keyof T]: z.ZodEffects<T[K], z.infer<T[K]>, unknown> } {
    const result = {} as { [K in keyof T]: z.ZodEffects<T[K], z.infer<T[K]>, unknown> };
    
    (Object.keys(enumDefs) as Array<keyof T>).forEach((key) => {
      const enumSchema = enumDefs[key];
      if (enumSchema instanceof z.ZodEnum) {
        const options = enumSchema.options as readonly [string, ...string[]];
        result[key] = this.createCaseInsensitiveEnum(options) as any;
      } else {
        result[key] = enumSchema as any; // Pass through non-enum schemas
      }
    });
    
    return result;
  }
}

/**
 * Helper function to create case-insensitive enum with cleaner syntax
 */
export function caseInsensitiveEnum<T extends readonly [string, ...string[]]>(values: T) {
  return EnumPreprocessor.createCaseInsensitiveEnum(values);
}

/**
 * Preprocess object fields that contain enum values
 */
export function preprocessEnumFields<T extends Record<string, any>>(
  data: T,
  enumFieldMappings: Partial<Record<keyof T, readonly string[]>>
): T {
  const processed = { ...data } as Record<string, any>;
  
  // Null-safe Object.entries check (defensive against Claude Desktop bugs)
  if (enumFieldMappings && typeof enumFieldMappings === 'object') {
    Object.entries(enumFieldMappings).forEach(([fieldName, enumValues]) => {
      if (enumValues && processed[fieldName] !== undefined) {
        processed[fieldName] = EnumPreprocessor.preprocessEnumValue(
          processed[fieldName],
          enumValues
        );
      }
    });
  }
  
  return processed as T;
}