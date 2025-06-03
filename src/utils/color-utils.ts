export function hexToRgb(hex: string): {r: number, g: number, b: number} {
  // Remove # if present
  hex = hex.replace(/^#/, '');
    
  // Parse hex values
  const bigint = parseInt(hex, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
    
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const normalized = Math.round(c * 255);
    const hex = normalized.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function validateHexColor(hex: string): boolean {
  if (!hex) return false;
  
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  // Check if it's a valid hex color (3 or 6 characters)
  return /^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(cleanHex);
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