import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById } from '../utils/node-utils.js';
import { hexToRgb, hexToRgba, createSolidPaint, rgbToHex } from '../utils/color-utils.js';
import { ensureFontLoaded } from '../utils/font-utils.js';
import { logMessage, logWarning, logError } from '../utils/plugin-logger.js';
import { formatStyleResponse } from '../utils/response-utils.js';

/**
 * Handle MANAGE_STYLES operation
 * Supports: create, update, list, apply, delete, get operations for paint, text, effect, and grid styles
 */
export async function handleManageStyles(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageStyles', params, async () => {
    if (!params.operation) {
      throw new Error('operation parameter is required');
    }
    
    const validOperations = ['create', 'update', 'list', 'apply', 'delete', 'get', 'duplicate'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown style operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    switch (params.operation) {
      case 'create':
        return await createStyle(params);
      case 'update':
        return await updateStyle(params);
      case 'list':
        return await listStyles(params);
      case 'apply':
        return await applyStyle(params);
      case 'delete':
        return await deleteStyle(params);
      case 'get':
        return await getStyle(params);
      case 'duplicate':
        return await duplicateStyle(params);
      default:
        throw new Error(`Unknown style operation: ${params.operation}`);
    }
  });
}

async function createStyle(params: any): Promise<any> {
  if (!params.type || !params.name) {
    throw new Error('styleType and styleName parameters are required for create operation');
  }
  
  const validStyleTypes = ['paint', 'text', 'effect', 'grid'];
  if (!validStyleTypes.includes(params.type)) {
    throw new Error(`Unknown style type: ${params.type}. Valid types: ${validStyleTypes.join(', ')}`);
  }

  switch (params.type) {
    case 'paint':
      return await createPaintStyle(params);
    case 'text':
      return await createTextStyle(params);
    case 'effect':
      return await createEffectStyle(params);
    case 'grid':
      return await createGridStyle(params);
    default:
      throw new Error(`Unknown style type: ${params.type}`);
  }
}

async function updateStyle(params: any): Promise<any> {
  if (!params.styleId) {
    throw new Error('styleId parameter is required for update operation');
  }
  
  const styleId = params.styleId.replace(/,$/, ''); // Remove trailing comma
  
  // Get all styles and find the one to update
  const paintStyles = figma.getLocalPaintStyles();
  const textStyles = figma.getLocalTextStyles();
  const effectStyles = figma.getLocalEffectStyles();
  const gridStyles = figma.getLocalGridStyles();
  const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
  
  const style = allStyles.find(s => s.id.replace(/,$/, '') === styleId);
  if (!style) {
    throw new Error(`Style with ID ${styleId} not found`);
  }
  
  // Update style name if provided
  if (params.name) {
    style.name = params.name;
  }
  
  // Update style description if provided
  if (params.description !== undefined) {
    style.description = Array.isArray(params.description) ? params.description[0] : params.description;
  }
  
  // Update style properties based on type
  if (style.type === 'PAINT') {
    await updatePaintStyle(style as PaintStyle, params);
  } else if (style.type === 'TEXT') {
    await updateTextStyle(style as TextStyle, params);
  } else if (style.type === 'EFFECT') {
    await updateEffectStyle(style as EffectStyle, params);
  } else if (style.type === 'GRID') {
    await updateGridStyle(style as GridStyle, params);
  }
  
  return {
    id: style.id,
    name: style.name,
    description: style.description || '',
    type: style.type,
    message: `Updated ${style.type.toLowerCase()} style: ${style.name}`
  };
}

async function updatePaintStyle(style: PaintStyle, params: any): Promise<void> {
  // Update paint if color, opacity, or paintType is provided
  if (params.color || params.opacity !== undefined || params.paintType) {
    // Get current paint to preserve existing values
    const currentPaint = style.paints[0];
    const isCurrentSolid = currentPaint?.type === 'SOLID';
    
    // Handle case where UnifiedHandler might wrap single values in arrays
    const paintParams = {
      ...params,
      color: params.color ? 
        (Array.isArray(params.color) ? params.color[0] : params.color) :
        (isCurrentSolid && currentPaint.color ? rgbToHex(currentPaint.color) : '#000000'),
      opacity: params.opacity !== undefined ? 
        (Array.isArray(params.opacity) ? params.opacity[0] : params.opacity) :
        (currentPaint?.opacity !== undefined ? currentPaint.opacity : 1),
      paintType: params.paintType ? 
        (Array.isArray(params.paintType) ? params.paintType[0] : params.paintType) :
        'SOLID'
    };
    
    const paint = await createPaint(paintParams);
    style.paints = [paint];
  }
}

async function updateTextStyle(style: TextStyle, params: any): Promise<void> {
  if (params.fontFamily && params.fontStyle) {
    const fontFamily = Array.isArray(params.fontFamily) ? params.fontFamily[0] : params.fontFamily;
    const fontStyle = Array.isArray(params.fontStyle) ? params.fontStyle[0] : params.fontStyle;
    const fontName = { family: fontFamily, style: fontStyle };
    await ensureFontLoaded(fontName);
    style.fontName = fontName;
  }
  
  if (params.fontSize !== undefined) {
    style.fontSize = Array.isArray(params.fontSize) ? params.fontSize[0] : params.fontSize;
  }
  
  if (params.letterSpacing !== undefined) {
    const letterSpacing = Array.isArray(params.letterSpacing) ? params.letterSpacing[0] : params.letterSpacing;
    style.letterSpacing = { unit: 'PIXELS', value: letterSpacing };
  }
  
  if (params.lineHeight !== undefined) {
    const lineHeight = Array.isArray(params.lineHeight) ? params.lineHeight[0] : params.lineHeight;
    style.lineHeight = { unit: 'PIXELS', value: lineHeight };
  }
  
  if (params.paragraphSpacing !== undefined) {
    style.paragraphSpacing = Array.isArray(params.paragraphSpacing) ? params.paragraphSpacing[0] : params.paragraphSpacing;
  }
  
  if (params.textCase !== undefined) {
    style.textCase = Array.isArray(params.textCase) ? params.textCase[0] : params.textCase;
  }
  
  if (params.textDecoration !== undefined) {
    style.textDecoration = Array.isArray(params.textDecoration) ? params.textDecoration[0] : params.textDecoration;
  }
}

async function updateEffectStyle(style: EffectStyle, params: any): Promise<void> {
  // Effect styles container properties (name, description) are updated in the main updateStyle function
  // Effects content management is delegated to figma_effects tool
  if (params.effects) {
    throw new Error('Effect style effects cannot be updated via figma_styles. Use the figma_effects tool to manage individual effects. Style container properties (name, description) can be updated here.');
  }
}

async function updateGridStyle(style: GridStyle, params: any): Promise<void> {
  if (params.layoutGrids && params.layoutGrids.length > 0) {
    style.layoutGrids = params.layoutGrids.map(grid => createLayoutGrid(grid));
  }
}

async function createPaintStyle(params: any): Promise<any> {
  const style = figma.createPaintStyle();
  style.name = params.name;
  
  if (params.description) {
    style.description = Array.isArray(params.description) ? params.description[0] : params.description;
  }
  
  if (params.color) {
    // Handle case where UnifiedHandler might wrap single values in arrays
    const paintParams = {
      ...params,
      color: Array.isArray(params.color) ? params.color[0] : params.color,
      opacity: Array.isArray(params.opacity) ? params.opacity[0] : params.opacity,
      paintType: Array.isArray(params.paintType) ? params.paintType[0] : params.paintType
    };
    
    const paint = await createPaint(paintParams);
    style.paints = [paint];
    
    return {
      id: style.id,
      name: style.name,
      description: style.description || '',
      type: style.type,
      message: `Created paint style: ${style.name}`
    };
  } else {
    return {
      id: style.id,
      name: style.name,
      description: style.description || '',
      type: style.type,
      message: `Created paint style: ${style.name} (NO FILL COLOR PROVIDED)`,
      warning: 'Paint style created without fillColor - paints array will be empty'
    };
  }
}

async function createTextStyle(params: any): Promise<any> {
  try {
    const style = figma.createTextStyle();
    style.name = params.name;
    
    if (params.description) {
      style.description = Array.isArray(params.description) ? params.description[0] : params.description;
    }
    
    // Apply text properties with array handling and error checking
    if (params.fontFamily && params.fontStyle) {
      const fontFamily = Array.isArray(params.fontFamily) ? params.fontFamily[0] : params.fontFamily;
      const fontStyle = Array.isArray(params.fontStyle) ? params.fontStyle[0] : params.fontStyle;
      const fontName = { family: fontFamily, style: fontStyle };
      
      try {
        await ensureFontLoaded(fontName);
        style.fontName = fontName;
      } catch (fontError) {
        throw new Error(`Failed to load font ${fontFamily} ${fontStyle}: ${fontError}`);
      }
    }
    
    if (params.fontSize !== undefined) {
      const fontSize = Array.isArray(params.fontSize) ? params.fontSize[0] : params.fontSize;
      if (typeof fontSize !== 'number' || fontSize <= 0) {
        throw new Error(`Invalid fontSize: ${fontSize}. Must be a positive number.`);
      }
      style.fontSize = fontSize;
    }
    
    if (params.letterSpacing !== undefined) {
      const letterSpacing = Array.isArray(params.letterSpacing) ? params.letterSpacing[0] : params.letterSpacing;
      if (typeof letterSpacing !== 'number') {
        throw new Error(`Invalid letterSpacing: ${letterSpacing}. Must be a number.`);
      }
      style.letterSpacing = { unit: 'PIXELS', value: letterSpacing };
    }
    
    if (params.lineHeight !== undefined) {
      const lineHeight = Array.isArray(params.lineHeight) ? params.lineHeight[0] : params.lineHeight;
      if (typeof lineHeight !== 'number' || lineHeight <= 0) {
        throw new Error(`Invalid lineHeight: ${lineHeight}. Must be a positive number.`);
      }
      style.lineHeight = { unit: 'PIXELS', value: lineHeight };
    }
    
    if (params.paragraphSpacing !== undefined) {
      const paragraphSpacing = Array.isArray(params.paragraphSpacing) ? params.paragraphSpacing[0] : params.paragraphSpacing;
      if (typeof paragraphSpacing !== 'number' || paragraphSpacing < 0) {
        throw new Error(`Invalid paragraphSpacing: ${paragraphSpacing}. Must be a non-negative number.`);
      }
      style.paragraphSpacing = paragraphSpacing;
    }
    
    if (params.textCase !== undefined) {
      const textCase = Array.isArray(params.textCase) ? params.textCase[0] : params.textCase;
      const validCases = ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'];
      if (!validCases.includes(textCase)) {
        throw new Error(`Invalid textCase: ${textCase}. Must be one of: ${validCases.join(', ')}`);
      }
      style.textCase = textCase;
    }
    
    if (params.textDecoration !== undefined) {
      const textDecoration = Array.isArray(params.textDecoration) ? params.textDecoration[0] : params.textDecoration;
      const validDecorations = ['NONE', 'UNDERLINE', 'STRIKETHROUGH'];
      if (!validDecorations.includes(textDecoration)) {
        throw new Error(`Invalid textDecoration: ${textDecoration}. Must be one of: ${validDecorations.join(', ')}`);
      }
      style.textDecoration = textDecoration;
    }
    
    // Verify the style was created successfully
    if (!style.id) {
      throw new Error('Text style creation failed - no ID assigned');
    }
    
    return {
      id: style.id,
      name: style.name,
      description: style.description || '',
      type: style.type,
      message: `Created text style: ${style.name}`
    };
  } catch (error) {
    throw new Error(`Text style creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createEffectStyle(params: any): Promise<any> {
  try {
    const style = figma.createEffectStyle();
    style.name = params.name;
    
    if (params.description) {
      style.description = Array.isArray(params.description) ? params.description[0] : params.description;
    }
    
    // Create empty effect style - effects should be added using figma_effects tool
    let message = `Created empty effect style: ${style.name}. Use figma_effects tool to add effects to this style.`;
    if (params.effects && params.effects.length > 0) {
      message = `Created empty effect style: ${style.name}. Effects parameter ignored - use figma_effects tool to add effects to this style.`;
    }
    
    // Verify the style was created successfully
    if (!style.id) {
      throw new Error('Effect style creation failed - no ID assigned');
    }
    
    // Debug: Check if the style is immediately available
    const allEffectStyles = figma.getLocalEffectStyles();
    const foundStyle = allEffectStyles.find(s => s.id.replace(/,$/, '') === style.id.replace(/,$/, ''));
    logMessage(`[DEBUG] Created effect style with ID: ${style.id}`);
    logMessage(`[DEBUG] Style immediately findable via getLocalEffectStyles: ${foundStyle ? 'YES' : 'NO'}`);
    logMessage(`[DEBUG] Total effect styles after creation: ${allEffectStyles.length}`);
    
    return {
      id: style.id,
      name: style.name,
      description: style.description || '',
      type: style.type,
      message: message
    };
  } catch (error) {
    throw new Error(`Effect style creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createGridStyle(params: any): Promise<any> {
  try {
    const style = figma.createGridStyle();
    style.name = params.name;
    
    if (params.description) {
      style.description = Array.isArray(params.description) ? params.description[0] : params.description;
    }
    
    if (params.layoutGrids && params.layoutGrids.length > 0) {
      style.layoutGrids = params.layoutGrids.map(grid => createLayoutGrid(grid));
    }
    
    // Verify the style was created successfully
    if (!style.id) {
      throw new Error('Grid style creation failed - no ID assigned');
    }
    
    return {
      id: style.id,
      name: style.name,
      description: style.description || '',
      type: style.type,
      message: `Created grid style: ${style.name}`
    };
  } catch (error) {
    throw new Error(`Grid style creation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function createPaint(params: any): Promise<Paint> {
  const paintType = params.paintType || 'SOLID';
  
  switch (paintType) {
    case 'SOLID':
      return {
        type: 'SOLID',
        color: hexToRgb(params.color),
        opacity: params.opacity !== undefined ? params.opacity : 1
      };
    
    case 'GRADIENT_LINEAR':
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_ANGULAR':
    case 'GRADIENT_DIAMOND':
      return {
        type: paintType as any,
        gradientStops: params.gradientStops?.map(stop => ({
          position: stop.position,
          color: hexToRgba(stop.color, stop.opacity || 1)
        })) || [],
        gradientTransform: params.gradientTransform as any
      };
    
    default:
      throw new Error(`Unsupported paint type: ${paintType}. Valid types: SOLID, GRADIENT_LINEAR, GRADIENT_RADIAL, GRADIENT_ANGULAR, GRADIENT_DIAMOND`);
  }
}

function createEffect(effectData: any): Effect {
  const effect: any = {
    type: effectData.type,
    visible: effectData.visible !== undefined ? effectData.visible : true
  };
  
  if (effectData.color) {
    const color = hexToRgb(effectData.color);
    effect.color = { 
      r: color.r, 
      g: color.g, 
      b: color.b, 
      a: effectData.opacity !== undefined ? effectData.opacity : 1 
    };
  }
  
  if (effectData.offset) {
    effect.offset = effectData.offset;
  }
  
  if (effectData.radius !== undefined) {
    effect.radius = effectData.radius;
  }
  
  if (effectData.spread !== undefined) {
    effect.spread = effectData.spread;
  }
  
  if (effectData.blendMode) {
    effect.blendMode = effectData.blendMode;
  }
  
  return effect;
}

function createLayoutGrid(gridData: any): LayoutGrid {
  const grid: any = {
    pattern: gridData.pattern,
    visible: gridData.visible !== undefined ? gridData.visible : true
  };
  
  if (gridData.sectionSize !== undefined) grid.sectionSize = gridData.sectionSize;
  if (gridData.color) grid.color = hexToRgba(gridData.color);
  if (gridData.alignment) grid.alignment = gridData.alignment;
  if (gridData.gutterSize !== undefined) grid.gutterSize = gridData.gutterSize;
  if (gridData.offset !== undefined) grid.offset = gridData.offset;
  if (gridData.count !== undefined) grid.count = gridData.count;
  
  return grid;
}

async function listStyles(params: any): Promise<any> {
  const styleType = params.type;
  let styles: (PaintStyle | TextStyle | EffectStyle | GridStyle)[] = [];
  
  switch (styleType) {
    case 'paint':
      styles = figma.getLocalPaintStyles();
      break;
    case 'text':
      styles = figma.getLocalTextStyles();
      break;
    case 'effect':
      styles = figma.getLocalEffectStyles();
      break;
    case 'grid':
      styles = figma.getLocalGridStyles();
      break;
    default:
      const paintStyles = figma.getLocalPaintStyles();
      const textStyles = figma.getLocalTextStyles();
      const effectStyles = figma.getLocalEffectStyles();
      const gridStyles = figma.getLocalGridStyles();
      styles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
  }
  
  return {
    styles: styles.map(style => formatStyleResponse(style)),
    count: styles.length,
    styleType: styleType || 'all'
  };
}

async function applyStyle(params: any): Promise<any> {
  if (!params.nodeId) {
    throw new Error('nodeId parameter is required for apply operation');
  }
  
  const node = findNodeById(params.nodeId);
  let style: PaintStyle | TextStyle | EffectStyle | GridStyle | undefined;
  
  // Find style by ID or name
  if (params.styleId) {
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
    // Clean trailing comma from style IDs for consistent matching
    style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
  } else if (params.name) {
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles] as any[];
    style = allStyles.find(s => s.name === params.name);
  }
  
  if (!style) {
    throw new Error('Style not found');
  }
  
  // Apply style based on type
  switch (style.type) {
    case 'PAINT':
      if ('fillStyleId' in node) {
        (node as any).fillStyleId = style.id;
      }
      break;
    case 'TEXT':
      if (node.type === 'TEXT') {
        (node as TextNode).textStyleId = style.id;
      }
      break;
    case 'EFFECT':
      if ('effectStyleId' in node) {
        (node as any).effectStyleId = style.id;
      }
      break;
    case 'GRID':
      if ('gridStyleId' in node) {
        (node as any).gridStyleId = style.id;
      }
      break;
  }
  
  return {
    nodeId: params.nodeId,
    nodeName: node.name,
    styleId: style.id,
    styleName: style.name,
    styleType: style.type.toLowerCase(),
    message: `Applied ${style.type.toLowerCase()} style "${style.name}" to node`
  };
}

async function deleteStyle(params: any): Promise<any> {
  if (!params.styleId) {
    throw new Error('styleId parameter is required for delete operation');
  }
  
  // Find the style by searching through all local styles
  const paintStyles = figma.getLocalPaintStyles();
  const textStyles = figma.getLocalTextStyles();
  const effectStyles = figma.getLocalEffectStyles();
  const gridStyles = figma.getLocalGridStyles();
  const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
  
  // Clean trailing comma from style IDs for consistent matching
  const style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
  
  if (!style) {
    throw new Error(`Style not found with ID: ${params.styleId}. Found ${allStyles.length} total styles in file.`);
  }
  
  // Capture style info BEFORE deletion
  const styleInfo: any = {
    id: style.id.replace(/,$/, ''), // Clean ID for response
    name: style.name,
    type: style.type
  };
  
  // Safely capture description
  try {
    styleInfo.description = style.description || '';
  } catch (e) {
    styleInfo.description = '';
  }
  
  // Safely add type-specific properties before deletion
  if (style.type === 'TEXT') {
    try {
      const textStyle = style as TextStyle;
      styleInfo.fontName = textStyle.fontName;
      styleInfo.fontSize = textStyle.fontSize;
      styleInfo.letterSpacing = textStyle.letterSpacing;
      styleInfo.lineHeight = textStyle.lineHeight;
    } catch (e) {
      // Could not capture text style properties
    }
  }
  
  // Delete the style using the correct API pattern
  style.remove();
  
  return {
    deletedStyle: styleInfo,
    message: `Successfully deleted ${styleInfo.type.toLowerCase()} style "${styleInfo.name}"`
  };
}

async function getStyle(params: any): Promise<any> {
  if (!params.styleId) {
    throw new Error('styleId parameter is required for get operation');
  }
  
  // Find the style by searching through all local styles
  const paintStyles = figma.getLocalPaintStyles();
  const textStyles = figma.getLocalTextStyles();
  const effectStyles = figma.getLocalEffectStyles();
  const gridStyles = figma.getLocalGridStyles();
  const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
  
  // Clean trailing comma from style IDs for consistent matching
  const style = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId);
  
  if (!style) {
    throw new Error(`Style not found with ID: ${params.styleId}`);
  }
  
  return formatStyleResponse(style);
}

async function duplicateStyle(params: any): Promise<any> {
  if (!params.styleId) {
    throw new Error('styleId parameter is required for duplicate operation');
  }
  
  // Find the original style by searching through all local styles
  const paintStyles = figma.getLocalPaintStyles();
  const textStyles = figma.getLocalTextStyles();
  const effectStyles = figma.getLocalEffectStyles();
  const gridStyles = figma.getLocalGridStyles();
  const allStyles = [...paintStyles, ...textStyles, ...effectStyles, ...gridStyles];
  
  // Clean trailing comma from style IDs for consistent matching
  const originalStyle = allStyles.find(s => s.id.replace(/,$/, '') === params.styleId.replace(/,$/, ''));
  
  if (!originalStyle) {
    throw new Error(`Style not found with ID: ${params.styleId}`);
  }
  
  // Duplicate based on style type
  let duplicatedStyle: any;
  
  switch (originalStyle.type) {
    case 'PAINT':
      duplicatedStyle = duplicatePaintStyle(originalStyle as PaintStyle, params);
      break;
    case 'TEXT':
      duplicatedStyle = await duplicateTextStyle(originalStyle as TextStyle, params);
      break;
    case 'EFFECT':
      duplicatedStyle = duplicateEffectStyle(originalStyle as EffectStyle, params);
      break;
    case 'GRID':
      duplicatedStyle = duplicateGridStyle(originalStyle as GridStyle, params);
      break;
    default:
      throw new Error(`Unsupported style type for duplication: ${originalStyle.type}`);
  }
  
  return {
    id: duplicatedStyle.id,
    name: duplicatedStyle.name,
    description: duplicatedStyle.description || '',
    type: duplicatedStyle.type,
    originalId: originalStyle.id,
    originalName: originalStyle.name,
    message: `Duplicated ${originalStyle.type.toLowerCase()} style "${originalStyle.name}" as "${duplicatedStyle.name}"`
  };
}

function duplicatePaintStyle(originalStyle: PaintStyle, params: any): PaintStyle {
  const newStyle = figma.createPaintStyle();
  newStyle.name = params.name || `Copy of ${originalStyle.name}`;
  newStyle.description = params.description || originalStyle.description || '';
  
  // Copy paint properties
  newStyle.paints = [...originalStyle.paints];
  
  return newStyle;
}

async function duplicateTextStyle(originalStyle: TextStyle, params: any): Promise<TextStyle> {
  const newStyle = figma.createTextStyle();
  newStyle.name = params.name || `Copy of ${originalStyle.name}`;
  newStyle.description = params.description || originalStyle.description || '';
  
  // Copy text style properties
  try {
    await ensureFontLoaded(originalStyle.fontName);
    newStyle.fontName = originalStyle.fontName;
  } catch (e) {
    // Font loading failed, use default
    logWarning(`Failed to load font for duplicated text style: ${e}`);
  }
  
  newStyle.fontSize = originalStyle.fontSize;
  newStyle.letterSpacing = originalStyle.letterSpacing;
  newStyle.lineHeight = originalStyle.lineHeight;
  newStyle.paragraphSpacing = originalStyle.paragraphSpacing;
  newStyle.textCase = originalStyle.textCase;
  newStyle.textDecoration = originalStyle.textDecoration;
  
  return newStyle;
}

function duplicateEffectStyle(originalStyle: EffectStyle, params: any): EffectStyle {
  const newStyle = figma.createEffectStyle();
  newStyle.name = params.name || `Copy of ${originalStyle.name}`;
  newStyle.description = params.description || originalStyle.description || '';
  
  // Copy effects array - this is the key feature that preserves effect complexity
  newStyle.effects = [...originalStyle.effects];
  
  return newStyle;
}

function duplicateGridStyle(originalStyle: GridStyle, params: any): GridStyle {
  const newStyle = figma.createGridStyle();
  newStyle.name = params.name || `Copy of ${originalStyle.name}`;
  newStyle.description = params.description || originalStyle.description || '';
  
  // Copy layout grids
  newStyle.layoutGrids = [...originalStyle.layoutGrids];
  
  return newStyle;
}