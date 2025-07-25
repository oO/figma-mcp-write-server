/**
 * Recursively sanitize payload to handle null values
 * Converts null to undefined for safer destructuring and skips null values entirely
 */
export function sanitizePayload(obj: any): any {
  if (obj === null || obj === undefined) {
    return undefined; // Convert null to undefined for safer destructuring
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePayload(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null) {
        // Skip null values entirely to prevent destructuring issues
        continue;
      }
      sanitized[key] = sanitizePayload(value);
    }
    return sanitized;
  }
  
  return obj;
}