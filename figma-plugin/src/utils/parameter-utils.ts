/**
 * Parameter utility functions for handling common parameter patterns
 */

/**
 * Unwraps array parameters to single values
 * Handles the common pattern: Array.isArray(param) ? param[0] : param
 * @param param - Single value or array that should be unwrapped to single value
 * @returns The first element if array, otherwise the value itself
 */
export function unwrapArrayParam<T>(param: T | T[]): T {
  return Array.isArray(param) ? param[0] : param;
}

/**
 * Ensures parameter is an array
 * Handles the common pattern: Array.isArray(param) ? param : [param]
 * @param param - Single value or array that should be wrapped to array
 * @returns Array containing the value(s)
 */
export function ensureArray<T>(param: T | T[]): T[] {
  return Array.isArray(param) ? param : [param];
}

/**
 * Unwraps multiple array parameters at once
 * @param params - Object with parameters that may be arrays
 * @param keys - Keys to unwrap from arrays
 * @returns Object with unwrapped parameters
 */
export function unwrapArrayParams<T extends Record<string, any>>(
  params: T, 
  keys: (keyof T)[]
): T {
  const result = { ...params };
  for (const key of keys) {
    if (result[key] !== undefined) {
      result[key] = unwrapArrayParam(result[key]);
    }
  }
  return result;
}

/**
 * Clean style ID by removing trailing comma
 * Handles the common pattern: id.replace(/,$/, '')
 * @param id - Style ID that may have trailing comma
 * @returns Cleaned style ID
 */
export function cleanStyleId(id: string): string {
  return id?.replace(/,$/, '') || id;
}