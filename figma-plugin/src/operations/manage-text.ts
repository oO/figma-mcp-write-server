import { OperationResult, TextParams } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';
import { loadFont, getFontFromParams, ensureFontLoaded, loadDefaultFont } from '../utils/font-utils.js';
import { hexToRgb, createSolidPaint } from '../utils/color-utils.js';
import { findSmartPosition, checkForOverlaps, createOverlapWarning } from '../utils/smart-positioning.js';

/**
 * Handle MANAGE_TEXT operation
 * Supports: create, update, get, delete, set_range, get_range, delete_range, insert_text, delete_text, search_text, apply_text_style, create_text_style
 */
export async function handleManageText(params: TextParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageText', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['create', 'update', 'get', 'delete', 'set_range', 'get_range', 'delete_range', 'insert_text', 'delete_text', 'search_text', 'apply_text_style', 'create_text_style']
    );

    switch (operation) {
      case 'create':
        return await createTextNode(params);
      case 'update':
        return await updateTextNode(params);
      case 'get':
        return await getTextContent(params);
      case 'delete':
        return await deleteTextNode(params);
      case 'set_range':
        return await handleSetRange(params);
      case 'get_range':
        return await handleGetRange(params);
      case 'delete_range':
        return await handleDeleteRange(params);
      case 'insert_text':
        return await handleInsertText(params);
      case 'delete_text':
        return await handleDeleteText(params);
      case 'search_text':
        return await handleSearchText(params);
      case 'apply_text_style':
        return await handleApplyTextStyle(params);
      case 'create_text_style':
        return await handleCreateTextStyle(params);
      default:
        throw new Error(`Unknown text operation: ${operation}`);
    }
  });
}

async function createTextNode(params: TextParams): Promise<any> {
  // Handle array parameters - extract first value for single operations
  const characters = Array.isArray(params.characters) ? params.characters[0] : params.characters;
  const fontFamily = Array.isArray(params.fontFamily) ? params.fontFamily[0] : params.fontFamily;
  const fontStyle = Array.isArray(params.fontStyle) ? params.fontStyle[0] : params.fontStyle;
  const x = Array.isArray(params.x) ? params.x[0] : params.x;
  const y = Array.isArray(params.y) ? params.y[0] : params.y;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const width = Array.isArray(params.width) ? params.width[0] : params.width;
  const height = Array.isArray(params.height) ? params.height[0] : params.height;
  const fontSize = Array.isArray(params.fontSize) ? params.fontSize[0] : params.fontSize;
  const autoRename = Array.isArray(params.autoRename) ? params.autoRename[0] : params.autoRename;
  
  // Additional validation for non-empty characters
  if (!characters || characters.trim() === '') {
    throw new Error('Text nodes must have non-empty characters content');
  }
  
  let text: TextNode | null = null;
  
  try {
    text = figma.createText();
    
    // CRITICAL FIX: Load font FIRST before setting any text properties
    const fontResult = await loadFontWithFallback(fontFamily, fontStyle);
    text.fontName = fontResult.fontName;
    
    // STEP 1: Create text node with minimal properties (font must be loaded first)
    text.characters = characters;
    
    // Handle positioning with smart placement and overlap detection
    let finalX: number;
    let finalY: number;
    let positionReason: string | undefined;
    let warning: string | undefined;
    
    const estimatedWidth = Math.max(characters.length * ((fontSize || 16) * 0.6), 100); // Rough text width estimation
    const textHeight = (fontSize || 16) * 1.2; // Rough text height estimation
    
    if (x !== undefined || y !== undefined) {
      // Explicit position provided - use it but check for overlaps
      finalX = x || 0;
      finalY = y || 0;
      
      // Check for overlaps with existing nodes
      const overlapInfo = checkForOverlaps(
        { x: finalX, y: finalY, width: estimatedWidth, height: textHeight },
        figma.currentPage
      );
      
      if (overlapInfo.hasOverlap) {
        warning = createOverlapWarning(overlapInfo, { x: finalX, y: finalY });
      }
    } else {
      // No explicit position - use smart placement
      const smartPosition = findSmartPosition({ width: estimatedWidth, height: textHeight }, figma.currentPage);
      finalX = smartPosition.x;
      finalY = smartPosition.y;
      positionReason = smartPosition.reason;
    }
    
    text.x = finalX;
    text.y = finalY;
    text.fontSize = fontSize || 16;
    
    // Set autoRename BEFORE setting name (per Figma API: manual name setting resets autoRename to false)
    if (autoRename !== undefined) {
      text.autoRename = autoRename;
    }
    
    // If both name and autoRename=true are present, ignore the name parameter
    if (autoRename === true) {
      // Let autoRename handle the naming automatically from characters
    } else {
      // Set name manually when autoRename is not true
      text.name = name || 'Text';
    }
    
    // Set dimensions if provided
    if (width !== undefined) text.resize(width, text.height);
    if (height !== undefined) text.resize(text.width, height);
    if (width !== undefined && height !== undefined) text.resize(width, height);
  
    // Apply basic text properties
    await applyTextProperties(text, params);
    
    // STEP 2: Apply text style AFTER creation (following Figma's native pattern)
    if (params.textStyleId) {
      // Check if the style actually exists
      const allTextStyles = figma.getLocalTextStyles();
      const targetStyle = allTextStyles.find(s => s.id.replace(/,$/, '') === params.textStyleId);
      if (targetStyle) {
        // Use the actual Figma style ID for setTextStyleIdAsync
        await text.setTextStyleIdAsync(targetStyle.id);
      } else {
        throw new Error(`Text style with ID ${params.textStyleId} not found`);
      }
    }
    
    // Apply character-level styling if provided
    if (params.characterRanges && params.characterRanges.length > 0) {
      await applyCharacterRanges(text, params.characterRanges);
    }
    
    // Apply hyperlink if provided
    if (params.hyperlink) {
      applyHyperlink(text, params.hyperlink);
    }
    
    // Create text style if requested
    if (params.styleName) {
      await createTextStyleFromNode(text, {
        name: params.styleName,
        description: params.styleDescription
      });
    }
    
    // Only add to page after all operations succeed
    figma.currentPage.appendChild(text);
    
    const response = {
      ...formatNodeResponse(text, 'created'),
      appliedFont: {
        requested: fontFamily ? `${fontFamily} ${fontStyle || 'Regular'}` : 'Inter Regular',
        actual: `${fontResult.fontName.family} ${fontResult.fontName.style}`,
        substituted: fontResult.substituted,
        reason: fontResult.reason
      }
    };
    
    // Add positioning info and warnings to response
    if (warning) {
      response.warning = warning;
    }
    if (positionReason) {
      response.positionReason = positionReason;
    }
    
    return response;
  } catch (error) {
    // Rollback: Remove the text node if it was created but operations failed
    if (text) {
      try {
        text.remove();
      } catch (removeError) {
        // Ignore rollback errors
      }
    }
    throw error;
  }
}

async function updateTextNode(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  
  // CRITICAL FIX: Load current font before any text operations
  if (textNode.fontName !== figma.mixed) {
    await figma.loadFontAsync(textNode.fontName as FontName);
  }
  
  // Handle array parameters - extract first value for single operations
  const characters = Array.isArray(params.characters) ? params.characters[0] : params.characters;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;
  const x = Array.isArray(params.x) ? params.x[0] : params.x;
  const y = Array.isArray(params.y) ? params.y[0] : params.y;
  const fontFamily = Array.isArray(params.fontFamily) ? params.fontFamily[0] : params.fontFamily;
  const fontStyle = Array.isArray(params.fontStyle) ? params.fontStyle[0] : params.fontStyle;
  const fontSize = Array.isArray(params.fontSize) ? params.fontSize[0] : params.fontSize;
  const width = Array.isArray(params.width) ? params.width[0] : params.width;
  const height = Array.isArray(params.height) ? params.height[0] : params.height;
  const autoRename = Array.isArray(params.autoRename) ? params.autoRename[0] : params.autoRename;
  
  // Update content
  if (characters !== undefined) {
    textNode.characters = characters;
  }
  
  // Set autoRename BEFORE setting name (per Figma API: manual name setting resets autoRename to false)
  if (autoRename !== undefined) {
    textNode.autoRename = autoRename;
  }
  
  // If both name and autoRename=true are present, ignore the name parameter
  if (name !== undefined && autoRename !== true) {
    textNode.name = name;
  }
  // When autoRename=true, ignore any name parameter and let autoRename handle it
  
  // Update position
  if (x !== undefined) textNode.x = x;
  if (y !== undefined) textNode.y = y;
  
  // Update font
  if (fontFamily || fontStyle) {
    const font = getFontFromParams({ fontFamily, fontStyle });
    await ensureFontLoaded(font);
    textNode.fontName = font;
  }
  
  // Update font size
  if (fontSize) {
    textNode.fontSize = BaseOperation.validateNumericParam(fontSize, 'fontSize', 1, 400);
  }
  
  // Update dimensions if provided
  if (width !== undefined || height !== undefined) {
    const newWidth = width !== undefined ? width : textNode.width;
    const newHeight = height !== undefined ? height : textNode.height;
    textNode.resize(newWidth, newHeight);
  }
  
  // Apply other text properties
  await applyTextProperties(textNode, params);
  
  return formatNodeResponse(textNode, 'updated');
}

async function getTextContent(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  
  // Helper function to safely serialize mixed values
  const safeMixed = (value: any, propName?: string) => {
    if (value === figma.mixed) {
      console.log(`DEBUG: Property ${propName} is figma.mixed (symbol)`);
      return 'MIXED';
    }
    return value;
  };
  
  return {
    id: textNode.id,
    name: textNode.name,
    characters: textNode.characters,
    fontSize: safeMixed(textNode.fontSize, 'fontSize'),
    fontName: safeMixed(textNode.fontName, 'fontName'),
    textCase: safeMixed(textNode.textCase, 'textCase'),
    textDecoration: safeMixed(textNode.textDecoration, 'textDecoration'),
    letterSpacing: safeMixed(textNode.letterSpacing, 'letterSpacing'),
    lineHeight: safeMixed(textNode.lineHeight, 'lineHeight'),
    fills: safeMixed(textNode.fills, 'fills'),
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    // Missing alignment properties
    textAlignHorizontal: textNode.textAlignHorizontal,
    textAlignVertical: textNode.textAlignVertical,
    textAutoResize: textNode.textAutoResize,
    // Missing paragraph properties
    paragraphSpacing: textNode.paragraphSpacing,
    paragraphIndent: textNode.paragraphIndent,
    // Missing list properties
    listSpacing: textNode.listSpacing,
    // Missing advanced typography properties
    hangingPunctuation: textNode.hangingPunctuation,
    hangingList: textNode.hangingList,
    leadingTrim: textNode.leadingTrim,
    autoRename: textNode.autoRename,
    // Missing text overflow properties
    textTruncation: textNode.textTruncation,
    maxLines: textNode.maxLines,
    // Additional useful properties
    hasMissingFont: textNode.hasMissingFont,
    type: textNode.type
  };
}

async function deleteTextNode(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  const nodeInfo = formatNodeResponse(textNode, 'deleted');
  
  // Remove the node
  textNode.remove();
  
  return nodeInfo;
}

// Additional operations for comprehensive text management
async function handleSetRange(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  
  // Load current font before applying character ranges
  if (textNode.fontName !== figma.mixed) {
    await figma.loadFontAsync(textNode.fontName as FontName);
  }
  
  // Build character ranges from flattened parameters
  const characterRanges = buildCharacterRanges(params);
  if (characterRanges.length > 0) {
    await applyCharacterRanges(textNode, characterRanges);
  }
  
  // Return safe response without mixed symbols
  return {
    id: textNode.id,
    name: textNode.name,
    type: textNode.type,
    message: 'range styling applied',
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height
  };
}

async function handleGetRange(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  const rangeStart = Array.isArray(params.rangeStart) ? params.rangeStart[0] : params.rangeStart;
  const rangeEnd = Array.isArray(params.rangeEnd) ? params.rangeEnd[0] : params.rangeEnd;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  const textLength = textNode.characters.length;
  
  // If range is specified, return styling for that range
  if (rangeStart !== undefined && rangeEnd !== undefined) {
    if (rangeStart < 0 || rangeEnd > textLength || rangeStart >= rangeEnd) {
      throw new Error(`Invalid character range: ${rangeStart}-${rangeEnd} for text length ${textLength}`);
    }
    
    return getCharacterRangeStyling(textNode, rangeStart, rangeEnd);
  }
  
  // If no range specified, analyze all character styling in the text
  return analyzeAllCharacterStyling(textNode);
}

function getCharacterRangeStyling(textNode: TextNode, start: number, end: number): any {
  // Use Figma's native getStyledTextSegments for specific range
  const fields = ['fontSize', 'fontName', 'textCase', 'textDecoration', 'letterSpacing', 'fills'];
  const segments = textNode.getStyledTextSegments(fields, start, end);
  
  // Get hyperlink for the range separately (not included in getStyledTextSegments)
  let rangeHyperlink;
  try {
    rangeHyperlink = textNode.getRangeHyperlink(start, end);
  } catch (error) {
    console.warn(`Failed to get hyperlink for range ${start}-${end}: ${error.toString()}`);
    rangeHyperlink = null;
  }
  
  // Helper function to safely serialize mixed values and handle hyperlinks
  const safeMixed = (value: any, propName?: string) => {
    if (value === figma.mixed) {
      console.log(`DEBUG: Property ${propName} is figma.mixed (symbol) in range ${start}-${end}`);
      return 'MIXED';
    }
    return value;
  };

  // Helper function to safely handle hyperlink values
  const safeHyperlink = (hyperlink: any) => {
    if (hyperlink === null) {
      return null;
    }
    if (hyperlink === figma.mixed) {
      return 'MIXED';
    }
    
    // Ensure we have a valid hyperlink object with type and value
    if (hyperlink && typeof hyperlink === 'object' && hyperlink.type && hyperlink.value) {
      return {
        type: hyperlink.type,
        value: hyperlink.value
      };
    }
    
    // Log unexpected hyperlink structure for debugging
    console.warn(`Unexpected hyperlink structure: ${JSON.stringify(hyperlink)}`);
    return hyperlink;
  };
  
  // If the range has uniform styling, return single segment info
  if (segments.length === 1) {
    const segment = segments[0];
    return {
      nodeId: textNode.id,
      rangeStart: start,
      rangeEnd: end,
      characters: textNode.characters.substring(start, end), // Get characters directly from text node
      fontSize: safeMixed(segment.fontSize, 'fontSize'),
      fontName: safeMixed(segment.fontName, 'fontName'),
      textCase: safeMixed(segment.textCase, 'textCase'),
      textDecoration: safeMixed(segment.textDecoration, 'textDecoration'),
      letterSpacing: safeMixed(segment.letterSpacing, 'letterSpacing'),
      fills: safeMixed(segment.fills, 'fills'),
      hyperlink: safeHyperlink(rangeHyperlink)
    };
  }
  
  // If the range has mixed styling, return all segments with individual hyperlink checks
  const characterRanges = segments.map(segment => {
    let segmentHyperlink;
    try {
      segmentHyperlink = textNode.getRangeHyperlink(segment.start, segment.end);
    } catch (error) {
      console.warn(`Failed to get hyperlink for segment ${segment.start}-${segment.end}: ${error.toString()}`);
      segmentHyperlink = null;
    }
    return {
      rangeStart: segment.start,
      rangeEnd: segment.end,
      characters: textNode.characters.substring(segment.start, segment.end), // Get characters directly from text node
      fontSize: safeMixed(segment.fontSize, 'fontSize'),
      fontName: safeMixed(segment.fontName, 'fontName'),
      textCase: safeMixed(segment.textCase, 'textCase'),
      textDecoration: safeMixed(segment.textDecoration, 'textDecoration'),
      letterSpacing: safeMixed(segment.letterSpacing, 'letterSpacing'),
      fills: safeMixed(segment.fills, 'fills'),
      hyperlink: safeHyperlink(segmentHyperlink)
    };
  });
  
  return {
    nodeId: textNode.id,
    requestedRange: { start, end },
    hasMixedStyling: true,
    characterRanges: characterRanges
  };
}

function analyzeAllCharacterStyling(textNode: TextNode): any {
  // Use Figma's native getStyledTextSegments for proper analysis
  const fields = ['fontSize', 'fontName', 'textCase', 'textDecoration', 'letterSpacing', 'fills'];
  const segments = textNode.getStyledTextSegments(fields);
  
  // Helper function to safely serialize mixed values
  const safeMixed = (value: any, propName?: string) => {
    if (value === figma.mixed) {
      console.log(`DEBUG: Property ${propName} is figma.mixed (symbol) in segments`);
      return 'MIXED';
    }
    return value;
  };

  // Helper function to safely handle hyperlink values
  const safeHyperlink = (hyperlink: any) => {
    if (hyperlink === null) {
      return null;
    }
    if (hyperlink === figma.mixed) {
      return 'MIXED';
    }
    
    // Ensure we have a valid hyperlink object with type and value
    if (hyperlink && typeof hyperlink === 'object' && hyperlink.type && hyperlink.value) {
      return {
        type: hyperlink.type,
        value: hyperlink.value
      };
    }
    
    // Log unexpected hyperlink structure for debugging
    console.warn(`Unexpected hyperlink structure: ${JSON.stringify(hyperlink)}`);
    return hyperlink;
  };
  
  // Convert segments to our expected format with hyperlink information
  const characterRanges = segments.map(segment => {
    let segmentHyperlink;
    try {
      segmentHyperlink = textNode.getRangeHyperlink(segment.start, segment.end);
    } catch (error) {
      console.warn(`Failed to get hyperlink for segment ${segment.start}-${segment.end}: ${error.toString()}`);
      segmentHyperlink = null;
    }
    return {
      nodeId: textNode.id,
      rangeStart: segment.start,
      rangeEnd: segment.end,
      characters: textNode.characters.substring(segment.start, segment.end), // Get characters directly from text node
      fontSize: safeMixed(segment.fontSize, 'fontSize'),
      fontName: safeMixed(segment.fontName, 'fontName'),
      textCase: safeMixed(segment.textCase, 'textCase'),
      textDecoration: safeMixed(segment.textDecoration, 'textDecoration'),
      letterSpacing: safeMixed(segment.letterSpacing, 'letterSpacing'),
      fills: safeMixed(segment.fills, 'fills'),
      hyperlink: safeHyperlink(segmentHyperlink)
    };
  });
  
  return {
    nodeId: textNode.id,
    textLength: textNode.characters.length,
    characters: textNode.characters,
    characterRanges: characterRanges
  };
}

async function handleDeleteRange(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  const rangeStart = Array.isArray(params.rangeStart) ? params.rangeStart[0] : params.rangeStart;
  const rangeEnd = Array.isArray(params.rangeEnd) ? params.rangeEnd[0] : params.rangeEnd;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  const textLength = textNode.characters.length;
  
  // Load current font before operations
  if (textNode.fontName !== figma.mixed) {
    await figma.loadFontAsync(textNode.fontName as FontName);
  }
  
  // If range is specified, reset styling for that range only
  if (rangeStart !== undefined && rangeEnd !== undefined) {
    if (rangeStart < 0 || rangeEnd > textLength || rangeStart >= rangeEnd) {
      throw new Error(`Invalid character range: ${rangeStart}-${rangeEnd} for text length ${textLength}`);
    }
    
    await resetCharacterRangeStyling(textNode, rangeStart, rangeEnd);
    
    return {
      nodeId: textNode.id,
      message: `Range styling deleted for range ${rangeStart}-${rangeEnd}`,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      affectedCharacters: textNode.characters.substring(rangeStart, rangeEnd)
    };
  }
  
  // If no range specified, reset all character styling to node defaults
  await resetAllCharacterStyling(textNode);
  
  return {
    nodeId: textNode.id,
    message: 'All range styling deleted - text now has uniform styling',
    textLength: textLength,
    characters: textNode.characters
  };
}

async function resetCharacterRangeStyling(textNode: TextNode, start: number, end: number): Promise<void> {
  // CRITICAL: Load all fonts currently in use within the range before any modifications
  await loadAllFontsInRange(textNode, start, end);
  
  // Get the default styling from the first character or node defaults
  const defaultFontSize = typeof textNode.fontSize === 'number' ? textNode.fontSize : 16;
  const defaultFontName = textNode.fontName !== figma.mixed ? textNode.fontName as FontName : { family: 'Inter', style: 'Regular' };
  
  // Ensure the default font is loaded
  await figma.loadFontAsync(defaultFontName);
  
  // Reset all character-level styling properties to defaults
  textNode.setRangeFontSize(start, end, defaultFontSize);
  textNode.setRangeFontName(start, end, defaultFontName);
  textNode.setRangeTextCase(start, end, 'ORIGINAL');
  textNode.setRangeTextDecoration(start, end, 'NONE');
  
  // Reset letter spacing to auto
  textNode.setRangeLetterSpacing(start, end, { value: 0, unit: 'PERCENT' });
  
  // Reset fills to node default or black
  const defaultFills = textNode.fills !== figma.mixed ? textNode.fills as Paint[] : [createSolidPaint('#000000')];
  textNode.setRangeFills(start, end, defaultFills);
  
  // Remove any hyperlinks in the range
  textNode.setRangeHyperlink(start, end, null);
}

async function loadAllFontsInRange(textNode: TextNode, start: number, end: number): Promise<void> {
  // Use Figma's built-in method to get all fonts in the range efficiently
  try {
    const fontNames = textNode.getRangeAllFontNames(start, end);
    await Promise.all(fontNames.map(figma.loadFontAsync));
  } catch (error) {
    console.warn(`Could not load fonts for range ${start}-${end}: ${error}`);
    // Fallback: try to load fonts individually if batch loading fails
    await loadFontsIndividually(textNode, start, end);
  }
}

async function loadFontsIndividually(textNode: TextNode, start: number, end: number): Promise<void> {
  // Fallback method: load fonts character by character
  const uniqueFonts = new Set<string>();
  
  for (let i = start; i < end; i++) {
    try {
      const fontName = textNode.getRangeFontName(i, i + 1);
      if (fontName !== figma.mixed && typeof fontName === 'object' && fontName.family && fontName.style) {
        const fontKey = `${fontName.family}:${fontName.style}`;
        uniqueFonts.add(fontKey);
      }
    } catch (error) {
      // Skip if we can't read the font for this character
      console.warn(`Could not read font for character ${i}: ${error}`);
    }
  }
  
  // Load all unique fonts found in the range
  const fontLoadPromises = Array.from(uniqueFonts).map(async (fontKey) => {
    const [family, style] = fontKey.split(':');
    try {
      await figma.loadFontAsync({ family, style });
    } catch (error) {
      console.warn(`Could not load font ${family} ${style}: ${error}`);
    }
  });
  
  await Promise.all(fontLoadPromises);
}

async function applyAdvancedTextDecoration(textNode: TextNode, params: TextParams): Promise<void> {
  // Handle array parameters - extract first value for single operations
  const textDecorationStyle = Array.isArray(params.textDecorationStyle) ? params.textDecorationStyle[0] : params.textDecorationStyle;
  const textDecorationOffset = Array.isArray(params.textDecorationOffset) ? params.textDecorationOffset[0] : params.textDecorationOffset;
  const textDecorationOffsetUnit = Array.isArray(params.textDecorationOffsetUnit) ? params.textDecorationOffsetUnit[0] : params.textDecorationOffsetUnit;
  const textDecorationThickness = Array.isArray(params.textDecorationThickness) ? params.textDecorationThickness[0] : params.textDecorationThickness;
  const textDecorationThicknessUnit = Array.isArray(params.textDecorationThicknessUnit) ? params.textDecorationThicknessUnit[0] : params.textDecorationThicknessUnit;
  const textDecorationColor = Array.isArray(params.textDecorationColor) ? params.textDecorationColor[0] : params.textDecorationColor;
  const textDecorationColorAuto = Array.isArray(params.textDecorationColorAuto) ? params.textDecorationColorAuto[0] : params.textDecorationColorAuto;
  const textDecorationSkipInk = Array.isArray(params.textDecorationSkipInk) ? params.textDecorationSkipInk[0] : params.textDecorationSkipInk;

  // Apply text decoration style
  if (textDecorationStyle !== undefined) {
    const validatedStyle = BaseOperation.validateStringParam(
      textDecorationStyle,
      'textDecorationStyle',
      ['SOLID', 'WAVY', 'DOTTED']
    );
    textNode.textDecorationStyle = validatedStyle as 'SOLID' | 'WAVY' | 'DOTTED';
  }

  // Apply text decoration offset
  if (textDecorationOffset !== undefined || textDecorationOffsetUnit !== undefined) {
    const unit = textDecorationOffsetUnit || 'PIXELS';
    const validatedUnit = BaseOperation.validateStringParam(
      unit,
      'textDecorationOffsetUnit',
      ['PIXELS', 'PERCENT', 'AUTO']
    );

    if (validatedUnit === 'AUTO') {
      textNode.textDecorationOffset = { unit: 'AUTO' };
    } else {
      const value = textDecorationOffset || 0;
      textNode.textDecorationOffset = {
        value: BaseOperation.validateNumericParam(value, 'textDecorationOffset', -1000, 1000),
        unit: validatedUnit as 'PIXELS' | 'PERCENT'
      };
    }
  }

  // Apply text decoration thickness
  if (textDecorationThickness !== undefined || textDecorationThicknessUnit !== undefined) {
    const unit = textDecorationThicknessUnit || 'PIXELS';
    const validatedUnit = BaseOperation.validateStringParam(
      unit,
      'textDecorationThicknessUnit',
      ['PIXELS', 'PERCENT', 'AUTO']
    );

    if (validatedUnit === 'AUTO') {
      textNode.textDecorationThickness = { unit: 'AUTO' };
    } else {
      const value = textDecorationThickness || 1;
      textNode.textDecorationThickness = {
        value: BaseOperation.validateNumericParam(value, 'textDecorationThickness', 0, 100),
        unit: validatedUnit as 'PIXELS' | 'PERCENT'
      };
    }
  }

  // Apply text decoration color
  if (textDecorationColorAuto === true) {
    textNode.textDecorationColor = { value: 'AUTO' };
  } else if (textDecorationColor !== undefined) {
    const { r, g, b } = hexToRgb(textDecorationColor);
    textNode.textDecorationColor = {
      value: createSolidPaint(`#${textDecorationColor.replace('#', '')}`)
    };
  }

  // Apply text decoration skip ink
  if (textDecorationSkipInk !== undefined) {
    textNode.textDecorationSkipInk = textDecorationSkipInk;
  }
}

async function applyRangeAdvancedTextDecoration(textNode: TextNode, start: number, end: number, range: any): Promise<void> {
  // Apply text decoration style
  if (range.textDecorationStyle !== undefined) {
    const validatedStyle = BaseOperation.validateStringParam(
      range.textDecorationStyle,
      'textDecorationStyle',
      ['SOLID', 'WAVY', 'DOTTED']
    );
    textNode.setRangeTextDecorationStyle(start, end, validatedStyle as 'SOLID' | 'WAVY' | 'DOTTED');
  }

  // Apply text decoration offset
  if (range.textDecorationOffset !== undefined || range.textDecorationOffsetUnit !== undefined) {
    const unit = range.textDecorationOffsetUnit || 'PIXELS';
    const validatedUnit = BaseOperation.validateStringParam(
      unit,
      'textDecorationOffsetUnit',
      ['PIXELS', 'PERCENT', 'AUTO']
    );

    if (validatedUnit === 'AUTO') {
      textNode.setRangeTextDecorationOffset(start, end, { unit: 'AUTO' });
    } else {
      const value = range.textDecorationOffset || 0;
      textNode.setRangeTextDecorationOffset(start, end, {
        value: BaseOperation.validateNumericParam(value, 'textDecorationOffset', -1000, 1000),
        unit: validatedUnit as 'PIXELS' | 'PERCENT'
      });
    }
  }

  // Apply text decoration thickness
  if (range.textDecorationThickness !== undefined || range.textDecorationThicknessUnit !== undefined) {
    const unit = range.textDecorationThicknessUnit || 'PIXELS';
    const validatedUnit = BaseOperation.validateStringParam(
      unit,
      'textDecorationThicknessUnit',
      ['PIXELS', 'PERCENT', 'AUTO']
    );

    if (validatedUnit === 'AUTO') {
      textNode.setRangeTextDecorationThickness(start, end, { unit: 'AUTO' });
    } else {
      const value = range.textDecorationThickness || 1;
      textNode.setRangeTextDecorationThickness(start, end, {
        value: BaseOperation.validateNumericParam(value, 'textDecorationThickness', 0, 100),
        unit: validatedUnit as 'PIXELS' | 'PERCENT'
      });
    }
  }

  // Apply text decoration color
  if (range.textDecorationColorAuto === true) {
    textNode.setRangeTextDecorationColor(start, end, { value: 'AUTO' });
  } else if (range.textDecorationColor !== undefined) {
    textNode.setRangeTextDecorationColor(start, end, {
      value: createSolidPaint(`#${range.textDecorationColor.replace('#', '')}`)
    });
  }

  // Apply text decoration skip ink
  if (range.textDecorationSkipInk !== undefined) {
    textNode.setRangeTextDecorationSkipInk(start, end, range.textDecorationSkipInk);
  }
}

async function resetAllCharacterStyling(textNode: TextNode): Promise<void> {
  const textLength = textNode.characters.length;
  if (textLength === 0) return;
  
  // Reset styling for the entire text
  await resetCharacterRangeStyling(textNode, 0, textLength);
}

async function handleInsertText(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId', 'insertPosition', 'insertText']);
  
  // Handle array parameters for bulk operations
  const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
  const insertPositions = Array.isArray(params.insertPosition) ? params.insertPosition : [params.insertPosition];
  const insertTexts = Array.isArray(params.insertText) ? params.insertText : [params.insertText];
  const insertUseStyles = Array.isArray(params.insertUseStyle) ? params.insertUseStyle : [params.insertUseStyle];
  
  const maxLength = Math.max(nodeIds.length, insertPositions.length, insertTexts.length);
  
  // Build operation list with expanded parameters
  const operations = [];
  for (let i = 0; i < maxLength; i++) {
    operations.push({
      nodeId: nodeIds[i] || nodeIds[nodeIds.length - 1],
      insertPosition: insertPositions[i] || insertPositions[insertPositions.length - 1],
      insertText: insertTexts[i] || insertTexts[insertTexts.length - 1],
      insertUseStyle: insertUseStyles[i] || insertUseStyles[insertUseStyles.length - 1],
      originalIndex: i
    });
  }
  
  // Group operations by nodeId and sort by position (descending for inserts)
  const operationsByNode = new Map<string, typeof operations>();
  operations.forEach(op => {
    if (!operationsByNode.has(op.nodeId)) {
      operationsByNode.set(op.nodeId, []);
    }
    operationsByNode.get(op.nodeId)!.push(op);
  });
  
  // Sort operations within each node by position (descending for inserts - highest position first)
  operationsByNode.forEach(ops => {
    ops.sort((a, b) => b.insertPosition - a.insertPosition);
  });
  
  const results = [];
  
  // Process operations node by node
  for (const [nodeId, nodeOps] of operationsByNode) {
    try {
      const node = findNodeById(nodeId);
      if (!node || node.type !== 'TEXT') {
        throw new Error(`Text node with ID ${nodeId} not found`);
      }
      
      const textNode = node as TextNode;
      
      // Load font before inserting text
      if (textNode.fontName !== figma.mixed) {
        await figma.loadFontAsync(textNode.fontName as FontName);
      } else {
        await loadDefaultFont();
      }
      
      // Process operations in descending position order (no offset tracking needed)
      for (const op of nodeOps) {
        try {
          const currentTextLength = textNode.characters.length;
          
          // Validate position
          if (op.insertPosition < 0 || op.insertPosition > currentTextLength) {
            throw new Error(`Invalid insert position: ${op.insertPosition} for text length ${currentTextLength}`);
          }
          
          // Insert the text
          if (op.insertUseStyle && ['BEFORE', 'AFTER'].includes(op.insertUseStyle.toUpperCase())) {
            textNode.insertCharacters(op.insertPosition, op.insertText, op.insertUseStyle.toUpperCase() as 'BEFORE' | 'AFTER');
          } else {
            textNode.insertCharacters(op.insertPosition, op.insertText);
          }
          
          results[op.originalIndex] = {
            nodeId: textNode.id,
            insertPosition: op.insertPosition,
            insertText: op.insertText,
            insertUseStyle: op.insertUseStyle || 'default',
            newLength: textNode.characters.length,
            success: true
          };
          
        } catch (error) {
          if (params.failFast) {
            throw error;
          }
          results[op.originalIndex] = {
            nodeId: op.nodeId,
            insertPosition: op.insertPosition,
            insertText: op.insertText,
            success: false,
            error: error.toString()
          };
        }
      }
      
    } catch (error) {
      // If we can't even find the node, mark all operations for this node as failed
      nodeOps.forEach(op => {
        if (params.failFast) {
          throw error;
        }
        results[op.originalIndex] = {
          nodeId: op.nodeId,
          insertPosition: op.insertPosition,
          insertText: op.insertText,
          success: false,
          error: error.toString()
        };
      });
    }
  }
  
  return {
    operation: 'insert_text',
    results: results.filter(r => r !== undefined), // Remove any undefined entries
    totalNodes: maxLength,
    successfulNodes: results.filter(r => r && r.success).length
  };
}

async function handleDeleteText(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId', 'deleteStart', 'deleteEnd']);
  
  // Handle array parameters for bulk operations
  const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
  const deleteStarts = Array.isArray(params.deleteStart) ? params.deleteStart : [params.deleteStart];
  const deleteEnds = Array.isArray(params.deleteEnd) ? params.deleteEnd : [params.deleteEnd];
  
  const maxLength = Math.max(nodeIds.length, deleteStarts.length, deleteEnds.length);
  
  // Build operation list with expanded parameters
  const operations = [];
  for (let i = 0; i < maxLength; i++) {
    operations.push({
      nodeId: nodeIds[i] || nodeIds[nodeIds.length - 1],
      deleteStart: deleteStarts[i] || deleteStarts[deleteStarts.length - 1],
      deleteEnd: deleteEnds[i] || deleteEnds[deleteEnds.length - 1],
      originalIndex: i
    });
  }
  
  // Group operations by nodeId and sort by position (descending for deletes)
  const operationsByNode = new Map<string, typeof operations>();
  operations.forEach(op => {
    if (!operationsByNode.has(op.nodeId)) {
      operationsByNode.set(op.nodeId, []);
    }
    operationsByNode.get(op.nodeId)!.push(op);
  });
  
  // Sort operations within each node by position (descending for deletes - highest position first)
  operationsByNode.forEach(ops => {
    ops.sort((a, b) => b.deleteStart - a.deleteStart);
  });
  
  const results = [];
  
  // Process operations node by node
  for (const [nodeId, nodeOps] of operationsByNode) {
    try {
      const node = findNodeById(nodeId);
      if (!node || node.type !== 'TEXT') {
        throw new Error(`Text node with ID ${nodeId} not found`);
      }
      
      const textNode = node as TextNode;
      
      // Load font before deleting text
      if (textNode.fontName !== figma.mixed) {
        await figma.loadFontAsync(textNode.fontName as FontName);
      } else {
        await loadDefaultFont();
      }
      
      // Process operations in reverse position order (highest first)
      // This way, deletions don't affect the positions of earlier operations
      for (const op of nodeOps) {
        try {
          const currentTextLength = textNode.characters.length;
          
          // Validate range (no offset needed since we're going in reverse order)
          if (op.deleteStart < 0 || op.deleteEnd > currentTextLength || op.deleteStart >= op.deleteEnd) {
            throw new Error(`Invalid delete range: ${op.deleteStart}-${op.deleteEnd} for text length ${currentTextLength}`);
          }
          
          // Store the text that will be deleted
          const deletedText = textNode.characters.substring(op.deleteStart, op.deleteEnd);
          
          // Delete the text
          textNode.deleteCharacters(op.deleteStart, op.deleteEnd);
          
          results[op.originalIndex] = {
            nodeId: textNode.id,
            deleteStart: op.deleteStart,
            deleteEnd: op.deleteEnd,
            deletedText,
            deletedLength: op.deleteEnd - op.deleteStart,
            newLength: textNode.characters.length,
            success: true
          };
          
        } catch (error) {
          if (params.failFast) {
            throw error;
          }
          results[op.originalIndex] = {
            nodeId: op.nodeId,
            deleteStart: op.deleteStart,
            deleteEnd: op.deleteEnd,
            success: false,
            error: error.toString()
          };
        }
      }
      
    } catch (error) {
      // If we can't even find the node, mark all operations for this node as failed
      nodeOps.forEach(op => {
        if (params.failFast) {
          throw error;
        }
        results[op.originalIndex] = {
          nodeId: op.nodeId,
          deleteStart: op.deleteStart,
          deleteEnd: op.deleteEnd,
          success: false,
          error: error.toString()
        };
      });
    }
  }
  
  return {
    operation: 'delete_text',
    results: results.filter(r => r !== undefined), // Remove any undefined entries
    totalNodes: maxLength,
    successfulNodes: results.filter(r => r && r.success).length
  };
}

async function handleSearchText(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['searchQuery']);
  
  // Check if this is a global search (no nodeId provided)
  const isGlobalSearch = !params.nodeId;
  
  if (isGlobalSearch) {
    return await performGlobalSearch(params);
  }
  
  // Handle specific node(s) search
  const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
  const searchQueries = Array.isArray(params.searchQuery) ? params.searchQuery : [params.searchQuery];
  const searchCaseSensitives = Array.isArray(params.searchCaseSensitive) ? params.searchCaseSensitive : [params.searchCaseSensitive];
  const searchWholeWords = Array.isArray(params.searchWholeWord) ? params.searchWholeWord : [params.searchWholeWord];
  const searchMaxResultsList = Array.isArray(params.searchMaxResults) ? params.searchMaxResults : [params.searchMaxResults];
  
  const maxLength = Math.max(nodeIds.length, searchQueries.length);
  
  // Build operation list with expanded parameters
  const operations = [];
  for (let i = 0; i < maxLength; i++) {
    operations.push({
      nodeId: nodeIds[i] || nodeIds[nodeIds.length - 1],
      searchQuery: searchQueries[i] || searchQueries[searchQueries.length - 1],
      searchCaseSensitive: searchCaseSensitives[i] !== undefined ? searchCaseSensitives[i] : (searchCaseSensitives[searchCaseSensitives.length - 1] || false),
      searchWholeWord: searchWholeWords[i] !== undefined ? searchWholeWords[i] : (searchWholeWords[searchWholeWords.length - 1] || false),
      searchMaxResults: searchMaxResultsList[i] || searchMaxResultsList[searchMaxResultsList.length - 1] || 100,
      originalIndex: i
    });
  }
  
  const results = [];
  
  // Process operations
  for (const op of operations) {
    try {
      const node = findNodeById(op.nodeId);
      if (!node || node.type !== 'TEXT') {
        throw new Error(`Text node with ID ${op.nodeId} not found`);
      }
      
      const textNode = node as TextNode;
      const text = textNode.characters;
      
      // Perform search with Boyer-Moore algorithm
      const matches = searchText(text, op.searchQuery, {
        caseSensitive: op.searchCaseSensitive,
        wholeWord: op.searchWholeWord,
        maxResults: op.searchMaxResults
      });
      
      results[op.originalIndex] = {
        nodeId: textNode.id,
        searchQuery: op.searchQuery,
        textLength: text.length,
        matches: matches,
        matchCount: matches.length,
        caseSensitive: op.searchCaseSensitive,
        wholeWord: op.searchWholeWord,
        success: true
      };
      
    } catch (error) {
      if (params.failFast) {
        throw error;
      }
      results[op.originalIndex] = {
        nodeId: op.nodeId,
        searchQuery: op.searchQuery,
        success: false,
        error: error.toString()
      };
    }
  }
  
  return {
    operation: 'search_text',
    results: results.filter(r => r !== undefined),
    totalNodes: maxLength,
    successfulNodes: results.filter(r => r && r.success).length
  };
}

/**
 * Perform global search across all text nodes in the document
 */
async function performGlobalSearch(params: TextParams): Promise<any> {
  const searchQuery = Array.isArray(params.searchQuery) ? params.searchQuery[0] : params.searchQuery;
  const searchCaseSensitive = Array.isArray(params.searchCaseSensitive) ? params.searchCaseSensitive[0] : params.searchCaseSensitive;
  const searchWholeWord = Array.isArray(params.searchWholeWord) ? params.searchWholeWord[0] : params.searchWholeWord;
  const searchMaxResults = Array.isArray(params.searchMaxResults) ? params.searchMaxResults[0] : params.searchMaxResults;
  
  // Find all text nodes in the document
  const textNodes = figma.root.findAllWithCriteria({ types: ['TEXT'] }) as TextNode[];
  
  if (textNodes.length === 0) {
    return {
      operation: 'search_text',
      searchQuery,
      results: [],
      totalNodes: 0,
      successfulNodes: 0,
      totalMatches: 0
    };
  }
  
  const results = [];
  let totalMatches = 0;
  let successfulNodes = 0;
  
  // Search each text node
  for (const textNode of textNodes) {
    try {
      const text = textNode.characters;
      
      // Perform search with Boyer-Moore algorithm
      const matches = searchText(text, searchQuery, {
        caseSensitive: searchCaseSensitive || false,
        wholeWord: searchWholeWord || false,
        maxResults: searchMaxResults || 100
      });
      
      if (matches.length > 0 || !params.failFast) {
        results.push({
          nodeId: textNode.id,
          nodeName: textNode.name,
          textLength: text.length,
          matches: matches,
          matchCount: matches.length,
          caseSensitive: searchCaseSensitive || false,
          wholeWord: searchWholeWord || false,
          success: true
        });
        
        totalMatches += matches.length;
        successfulNodes++;
      }
      
    } catch (error) {
      if (params.failFast) {
        throw error;
      }
      results.push({
        nodeId: textNode.id,
        nodeName: textNode.name,
        searchQuery,
        success: false,
        error: error.toString()
      });
    }
  }
  
  return {
    operation: 'search_text',
    searchQuery,
    results: results.filter(r => r.matchCount > 0 || !r.success), // Filter out nodes with no matches (unless there was an error)
    totalNodes: textNodes.length,
    successfulNodes,
    totalMatches,
    caseSensitive: searchCaseSensitive || false,
    wholeWord: searchWholeWord || false,
    maxResults: searchMaxResults || 100
  };
}

/**
 * Search text using simplified Boyer-Moore algorithm
 * Returns array of match positions with start/end indices
 */
function searchText(text: string, query: string, options: {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxResults?: number;
} = {}): Array<{ rangeStart: number; rangeEnd: number; match: string }> {
  const { caseSensitive = false, wholeWord = false, maxResults = 100 } = options;
  
  if (!query || query.length === 0) {
    return [];
  }
  
  // Prepare search text and pattern
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchPattern = caseSensitive ? query : query.toLowerCase();
  const patternLength = searchPattern.length;
  const textLength = searchText.length;
  
  if (patternLength > textLength) {
    return [];
  }
  
  const matches: Array<{ rangeStart: number; rangeEnd: number; match: string }> = [];
  
  // Build bad character table for Boyer-Moore
  const badCharTable = new Map<string, number>();
  for (let i = 0; i < patternLength - 1; i++) {
    badCharTable.set(searchPattern[i], patternLength - 1 - i);
  }
  
  let textIndex = 0;
  
  while (textIndex <= textLength - patternLength && matches.length < maxResults) {
    let patternIndex = patternLength - 1;
    
    // Match pattern from right to left
    while (patternIndex >= 0 && searchText[textIndex + patternIndex] === searchPattern[patternIndex]) {
      patternIndex--;
    }
    
    if (patternIndex < 0) {
      // Found a match
      const rangeStart = textIndex;
      const rangeEnd = textIndex + patternLength;
      const matchText = text.substring(rangeStart, rangeEnd);
      
      // Check whole word constraint
      if (!wholeWord || isWholeWordMatch(text, rangeStart, rangeEnd)) {
        matches.push({ rangeStart, rangeEnd, match: matchText });
      }
      
      // Move to next position
      textIndex++;
    } else {
      // No match, use bad character heuristic
      const badChar = searchText[textIndex + patternIndex];
      const skip = badCharTable.get(badChar) || patternLength;
      textIndex += Math.max(1, skip);
    }
  }
  
  return matches;
}

/**
 * Check if match is a whole word (bounded by word boundaries)
 */
function isWholeWordMatch(text: string, rangeStart: number, rangeEnd: number): boolean {
  const wordBoundaryRegex = /\w/;
  
  // Check character before match
  if (rangeStart > 0) {
    const prevChar = text[rangeStart - 1];
    const matchStartChar = text[rangeStart];
    if (wordBoundaryRegex.test(prevChar) && wordBoundaryRegex.test(matchStartChar)) {
      return false;
    }
  }
  
  // Check character after match
  if (rangeEnd < text.length) {
    const nextChar = text[rangeEnd];
    const matchEndChar = text[rangeEnd - 1];
    if (wordBoundaryRegex.test(nextChar) && wordBoundaryRegex.test(matchEndChar)) {
      return false;
    }
  }
  
  return true;
}

async function handleApplyTextStyle(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Handle array parameters - extract first value for single operations
  const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
  
  const node = findNodeById(nodeId!);
  if (!node || node.type !== 'TEXT') {
    throw new Error(`Text node with ID ${nodeId} not found`);
  }
  
  const textNode = node as TextNode;
  
  if (params.textStyleId) {
    const allTextStyles = figma.getLocalTextStyles();
    const targetStyle = allTextStyles.find(s => s.id.replace(/,$/, '') === params.textStyleId);
    if (targetStyle) {
      await textNode.setTextStyleIdAsync(targetStyle.id);
    } else {
      throw new Error(`Text style with ID ${params.textStyleId} not found`);
    }
  }
  
  return formatNodeResponse(textNode, 'text style applied');
}

async function handleCreateTextStyle(params: TextParams): Promise<any> {
  BaseOperation.validateParams(params, ['styleName']);
  
  let sourceNode: TextNode | null = null;
  
  if (params.nodeId) {
    // Handle array parameters - extract first value for single operations
    const nodeId = Array.isArray(params.nodeId) ? params.nodeId[0] : params.nodeId;
    
    const node = findNodeById(nodeId);
    if (!node || node.type !== 'TEXT') {
      throw new Error(`Text node with ID ${nodeId} not found`);
    }
    sourceNode = node as TextNode;
  }
  
  const result = await createTextStyleFromNode(sourceNode, {
    name: params.styleName!,
    description: params.styleDescription
  });
  
  return result;
}

async function applyTextProperties(textNode: TextNode, params: TextParams): Promise<void> {
  // Handle array parameters - extract first value for single operations
  const textCase = Array.isArray(params.textCase) ? params.textCase[0] : params.textCase;
  const textDecoration = Array.isArray(params.textDecoration) ? params.textDecoration[0] : params.textDecoration;
  const letterSpacing = Array.isArray(params.letterSpacing) ? params.letterSpacing[0] : params.letterSpacing;
  const lineHeight = Array.isArray(params.lineHeight) ? params.lineHeight[0] : params.lineHeight;
  const textAlignHorizontal = Array.isArray(params.textAlignHorizontal) ? params.textAlignHorizontal[0] : params.textAlignHorizontal;
  const textAlignVertical = Array.isArray(params.textAlignVertical) ? params.textAlignVertical[0] : params.textAlignVertical;
  const textAutoResize = Array.isArray(params.textAutoResize) ? params.textAutoResize[0] : params.textAutoResize;
  const paragraphSpacing = Array.isArray(params.paragraphSpacing) ? params.paragraphSpacing[0] : params.paragraphSpacing;
  const paragraphIndent = Array.isArray(params.paragraphIndent) ? params.paragraphIndent[0] : params.paragraphIndent;
  const listSpacing = Array.isArray(params.listSpacing) ? params.listSpacing[0] : params.listSpacing;
  const hangingPunctuation = Array.isArray(params.hangingPunctuation) ? params.hangingPunctuation[0] : params.hangingPunctuation;
  const hangingList = Array.isArray(params.hangingList) ? params.hangingList[0] : params.hangingList;
  const leadingTrim = Array.isArray(params.leadingTrim) ? params.leadingTrim[0] : params.leadingTrim;
  const autoRename = Array.isArray(params.autoRename) ? params.autoRename[0] : params.autoRename;
  
  // Apply text case
  if (textCase !== undefined) {
    const validatedTextCase = BaseOperation.validateStringParam(
      textCase,
      'textCase',
      ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE']
    );
    textNode.textCase = validatedTextCase as TextCase;
  }
  
  // Apply text decoration
  if (textDecoration !== undefined) {
    const validatedTextDecoration = BaseOperation.validateStringParam(
      textDecoration,
      'textDecoration',
      ['NONE', 'UNDERLINE', 'STRIKETHROUGH']
    );
    textNode.textDecoration = validatedTextDecoration as TextDecoration;
  }

  // Apply advanced text decoration properties
  await applyAdvancedTextDecoration(textNode, params);
  
  // Apply letter spacing
  if (letterSpacing !== undefined) {
    if (typeof letterSpacing === 'number') {
      textNode.letterSpacing = { value: letterSpacing, unit: 'PIXELS' };
    }
  }
  
  // Apply line height
  if (lineHeight !== undefined) {
    if (typeof lineHeight === 'number') {
      textNode.lineHeight = { value: lineHeight, unit: 'PIXELS' };
    }
  }
  
  // Apply text color - handle both single values and arrays
  if (params.fillColor) {
    const fillColor = Array.isArray(params.fillColor) ? params.fillColor[0] : params.fillColor;
    textNode.fills = [createSolidPaint(fillColor)];
  }
  
  // Apply text truncation
  if (params.textTruncation !== undefined) {
    const textTruncation = Array.isArray(params.textTruncation) ? params.textTruncation[0] : params.textTruncation;
    const validatedTruncation = BaseOperation.validateStringParam(
      textTruncation,
      'textTruncation',
      ['DISABLED', 'ENDING']
    );
    textNode.textTruncation = validatedTruncation as 'DISABLED' | 'ENDING';
  }
  
  // Apply max lines
  if (params.maxLines !== undefined) {
    const maxLines = Array.isArray(params.maxLines) ? params.maxLines[0] : params.maxLines;
    textNode.maxLines = BaseOperation.validateNumericParam(maxLines, 'maxLines', 1, 1000);
  }
  
  // Apply fills if provided
  if (params.fills && params.fills.length > 0) {
    textNode.fills = params.fills.map(fill => createPaintFromFill(fill));
  }
  
  // Apply text alignment
  if (textAlignHorizontal !== undefined) {
    const alignment = BaseOperation.validateStringParam(
      textAlignHorizontal,
      'textAlignHorizontal',
      ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED']
    );
    textNode.textAlignHorizontal = alignment as 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  }
  
  if (textAlignVertical !== undefined) {
    const alignment = BaseOperation.validateStringParam(
      textAlignVertical,
      'textAlignVertical',
      ['TOP', 'CENTER', 'BOTTOM']
    );
    textNode.textAlignVertical = alignment as 'TOP' | 'CENTER' | 'BOTTOM';
  }
  
  // Apply auto resize
  if (textAutoResize !== undefined) {
    const autoResize = BaseOperation.validateStringParam(
      textAutoResize,
      'textAutoResize',
      ['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT']
    );
    textNode.textAutoResize = autoResize as 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT';
  }
  
  // Apply paragraph spacing
  if (paragraphSpacing !== undefined) {
    textNode.paragraphSpacing = BaseOperation.validateNumericParam(paragraphSpacing, 'paragraphSpacing', 0, 1000);
  }
  
  // Apply paragraph indent
  if (paragraphIndent !== undefined) {
    textNode.paragraphIndent = BaseOperation.validateNumericParam(paragraphIndent, 'paragraphIndent', 0, 1000);
  }
  
  // Apply text list options
  if (params.listType && textNode.characters.length > 0) {
    const listType = Array.isArray(params.listType) ? params.listType[0] : params.listType;
    const validatedListType = BaseOperation.validateStringParam(
      listType,
      'listType',
      ['ORDERED', 'UNORDERED', 'NONE']
    );
    
    try {
      // Ensure font is loaded before setting list options
      if (textNode.fontName !== figma.mixed) {
        await figma.loadFontAsync(textNode.fontName as FontName);
      }
      
      // Set list options for the entire text using range method
      textNode.setRangeListOptions(0, textNode.characters.length, {
        type: validatedListType as 'ORDERED' | 'UNORDERED' | 'NONE'
      });
    } catch (error) {
      // If setRangeListOptions fails, try alternative approach or log warning
      console.warn(`Failed to set list options: ${error.toString()}`);
      throw new Error(`Failed to set list type '${validatedListType}': ${error.toString()}`);
    }
  }
  
  // Apply list spacing
  if (listSpacing !== undefined) {
    textNode.listSpacing = BaseOperation.validateNumericParam(listSpacing, 'listSpacing', 0, 1000);
  }
  
  // Apply hanging punctuation
  if (hangingPunctuation !== undefined) {
    textNode.hangingPunctuation = hangingPunctuation;
  }
  
  // Apply hanging list
  if (hangingList !== undefined) {
    textNode.hangingList = hangingList;
  }
  
  // Apply leading trim
  if (leadingTrim !== undefined) {
    const validatedLeadingTrim = BaseOperation.validateStringParam(
      leadingTrim,
      'leadingTrim',
      ['NONE', 'CAP_HEIGHT', 'BASELINE', 'BOTH']
    );
    textNode.leadingTrim = validatedLeadingTrim as 'NONE' | 'CAP_HEIGHT' | 'BASELINE' | 'BOTH';
  }
  
  // Apply auto rename (Note: manual name setting resets autoRename to false per Figma API)
  if (autoRename !== undefined) {
    textNode.autoRename = autoRename;
  }
  
  // Note: OpenType features (ligatures, kerning) are read-only in Figma Plugin API
  // These parameters are accepted for API consistency but cannot be applied
}

// Helper functions
function buildCharacterRanges(params: TextParams): any[] {
  // Check if any character range parameters are provided
  if (!params.rangeStart && !params.rangeEnd) {
    return [];
  }
  
  // Extract array values
  const starts = Array.isArray(params.rangeStart) ? params.rangeStart : [params.rangeStart];
  const ends = Array.isArray(params.rangeEnd) ? params.rangeEnd : [params.rangeEnd];
  
  if (starts[0] === undefined || ends[0] === undefined) {
    return [];
  }

  const maxLength = Math.max(starts.length, ends.length);
  const ranges = [];

  for (let i = 0; i < maxLength; i++) {
    const range: any = {
      start: starts[i] || starts[starts.length - 1],
      end: ends[i] || ends[ends.length - 1]
    };

    // Add optional properties if they exist
    if (params.rangeFontSize !== undefined) {
      const fontSizes = Array.isArray(params.rangeFontSize) ? params.rangeFontSize : [params.rangeFontSize];
      range.fontSize = fontSizes[i] || fontSizes[fontSizes.length - 1];
    }

    if (params.rangeFontFamily !== undefined) {
      const fontFamilies = Array.isArray(params.rangeFontFamily) ? params.rangeFontFamily : [params.rangeFontFamily];
      range.fontFamily = fontFamilies[i] || fontFamilies[fontFamilies.length - 1];
    }

    if (params.rangeFontStyle !== undefined) {
      const fontStyles = Array.isArray(params.rangeFontStyle) ? params.rangeFontStyle : [params.rangeFontStyle];
      range.fontStyle = fontStyles[i] || fontStyles[fontStyles.length - 1];
    }

    if (params.rangeTextCase !== undefined) {
      const textCases = Array.isArray(params.rangeTextCase) ? params.rangeTextCase : [params.rangeTextCase];
      range.textCase = textCases[i] || textCases[textCases.length - 1];
    }

    if (params.rangeTextDecoration !== undefined) {
      const textDecorations = Array.isArray(params.rangeTextDecoration) ? params.rangeTextDecoration : [params.rangeTextDecoration];
      range.textDecoration = textDecorations[i] || textDecorations[textDecorations.length - 1];
    }

    // Advanced text decoration properties
    if (params.rangeTextDecorationStyle !== undefined) {
      const textDecorationStyles = Array.isArray(params.rangeTextDecorationStyle) ? params.rangeTextDecorationStyle : [params.rangeTextDecorationStyle];
      range.textDecorationStyle = textDecorationStyles[i] || textDecorationStyles[textDecorationStyles.length - 1];
    }

    if (params.rangeTextDecorationOffset !== undefined) {
      const textDecorationOffsets = Array.isArray(params.rangeTextDecorationOffset) ? params.rangeTextDecorationOffset : [params.rangeTextDecorationOffset];
      range.textDecorationOffset = textDecorationOffsets[i] || textDecorationOffsets[textDecorationOffsets.length - 1];
    }

    if (params.rangeTextDecorationOffsetUnit !== undefined) {
      const textDecorationOffsetUnits = Array.isArray(params.rangeTextDecorationOffsetUnit) ? params.rangeTextDecorationOffsetUnit : [params.rangeTextDecorationOffsetUnit];
      range.textDecorationOffsetUnit = textDecorationOffsetUnits[i] || textDecorationOffsetUnits[textDecorationOffsetUnits.length - 1];
    }

    if (params.rangeTextDecorationThickness !== undefined) {
      const textDecorationThicknesses = Array.isArray(params.rangeTextDecorationThickness) ? params.rangeTextDecorationThickness : [params.rangeTextDecorationThickness];
      range.textDecorationThickness = textDecorationThicknesses[i] || textDecorationThicknesses[textDecorationThicknesses.length - 1];
    }

    if (params.rangeTextDecorationThicknessUnit !== undefined) {
      const textDecorationThicknessUnits = Array.isArray(params.rangeTextDecorationThicknessUnit) ? params.rangeTextDecorationThicknessUnit : [params.rangeTextDecorationThicknessUnit];
      range.textDecorationThicknessUnit = textDecorationThicknessUnits[i] || textDecorationThicknessUnits[textDecorationThicknessUnits.length - 1];
    }

    if (params.rangeTextDecorationColor !== undefined) {
      const textDecorationColors = Array.isArray(params.rangeTextDecorationColor) ? params.rangeTextDecorationColor : [params.rangeTextDecorationColor];
      range.textDecorationColor = textDecorationColors[i] || textDecorationColors[textDecorationColors.length - 1];
    }

    if (params.rangeTextDecorationColorAuto !== undefined) {
      const textDecorationColorAutos = Array.isArray(params.rangeTextDecorationColorAuto) ? params.rangeTextDecorationColorAuto : [params.rangeTextDecorationColorAuto];
      range.textDecorationColorAuto = textDecorationColorAutos[i] || textDecorationColorAutos[textDecorationColorAutos.length - 1];
    }

    if (params.rangeTextDecorationSkipInk !== undefined) {
      const textDecorationSkipInks = Array.isArray(params.rangeTextDecorationSkipInk) ? params.rangeTextDecorationSkipInk : [params.rangeTextDecorationSkipInk];
      range.textDecorationSkipInk = textDecorationSkipInks[i] || textDecorationSkipInks[textDecorationSkipInks.length - 1];
    }

    if (params.rangeLetterSpacing !== undefined) {
      const letterSpacings = Array.isArray(params.rangeLetterSpacing) ? params.rangeLetterSpacing : [params.rangeLetterSpacing];
      range.letterSpacing = letterSpacings[i] || letterSpacings[letterSpacings.length - 1];
    }

    if (params.rangeFillColor !== undefined) {
      const fillColors = Array.isArray(params.rangeFillColor) ? params.rangeFillColor : [params.rangeFillColor];
      const fillColor = fillColors[i] || fillColors[fillColors.length - 1];
      // Store the hex color directly, convert to Paint object later
      range.fillColor = fillColor;
    }

    if (params.rangeHyperlinkType !== undefined && params.rangeHyperlinkValue !== undefined) {
      const hyperlinkTypes = Array.isArray(params.rangeHyperlinkType) ? params.rangeHyperlinkType : [params.rangeHyperlinkType];
      const hyperlinkValues = Array.isArray(params.rangeHyperlinkValue) ? params.rangeHyperlinkValue : [params.rangeHyperlinkValue];
      const hyperlinkType = hyperlinkTypes[i] || hyperlinkTypes[hyperlinkTypes.length - 1];
      const hyperlinkValue = hyperlinkValues[i] || hyperlinkValues[hyperlinkValues.length - 1];
      
      range.hyperlink = {
        type: hyperlinkType.toUpperCase(),
        value: hyperlinkValue
      };
    }

    ranges.push(range);
  }

  return ranges;
}

async function loadFontWithFallback(fontFamily?: string, fontStyle?: string): Promise<{ fontName: FontName, substituted: boolean, reason?: string }> {
  try {
    if (fontFamily && fontStyle) {
      const fontName = { family: fontFamily, style: fontStyle };
      await figma.loadFontAsync(fontName);
      return { fontName, substituted: false };
    } else if (fontFamily) {
      // Try to find a Regular style for the family
      const fontName = { family: fontFamily, style: 'Regular' };
      await figma.loadFontAsync(fontName);
      return { fontName, substituted: fontStyle ? true : false, reason: fontStyle ? `Style '${fontStyle}' not found, using Regular` : undefined };
    }
  } catch (error) {
    // Font not available, use fallback
  }
  
  // Fallback to default font
  try {
    const defaultFont = await loadDefaultFont();
    if (defaultFont && defaultFont.family && defaultFont.style) {
      return { fontName: defaultFont, substituted: true, reason: `Font '${fontFamily || 'specified'} ${fontStyle || ''}' not available, using default` };
    }
  } catch (error) {
    // Default font failed, use Inter Regular
  }
  
  // Final fallback
  const fallbackFont = { family: 'Inter', style: 'Regular' };
  await figma.loadFontAsync(fallbackFont);
  return { fontName: fallbackFont, substituted: true, reason: `Font '${fontFamily || 'specified'} ${fontStyle || ''}' not available, using Inter Regular` };
}

async function applyCharacterRanges(textNode: TextNode, ranges: any[]): Promise<void> {
  for (const range of ranges) {
    const { start, end } = range;
    
    if (start < 0 || end > textNode.characters.length || start >= end) {
      throw new Error(`Invalid character range: ${start}-${end} for text length ${textNode.characters.length}`);
    }
    
    // Apply font properties
    if (range.fontFamily || range.fontStyle) {
      const fontName = {
        family: range.fontFamily || (textNode.fontName as FontName).family,
        style: range.fontStyle || (textNode.fontName as FontName).style
      };
      await ensureFontLoaded(fontName);
      textNode.setRangeFontName(start, end, fontName);
    }
    
    // Apply font size
    if (range.fontSize !== undefined) {
      textNode.setRangeFontSize(start, end, range.fontSize);
    }
    
    // Apply text case
    if (range.textCase !== undefined) {
      textNode.setRangeTextCase(start, end, range.textCase);
    }
    
    // Apply text decoration
    if (range.textDecoration !== undefined) {
      textNode.setRangeTextDecoration(start, end, range.textDecoration);
    }

    // Apply advanced text decoration properties
    await applyRangeAdvancedTextDecoration(textNode, start, end, range);
    
    // Apply letter spacing
    if (range.letterSpacing !== undefined) {
      const spacing = typeof range.letterSpacing === 'number' 
        ? { value: range.letterSpacing, unit: 'PIXELS' as const }
        : range.letterSpacing;
      textNode.setRangeLetterSpacing(start, end, spacing);
    }
    
    // Apply fill color
    if (range.fillColor) {
      const paint = createSolidPaint(range.fillColor);
      textNode.setRangeFills(start, end, [paint]);
    }
    
    // Apply hyperlink
    if (range.hyperlink) {
      const validatedType = BaseOperation.validateStringParam(
        range.hyperlink.type,
        'hyperlinkType',
        ['URL', 'NODE']
      );
      
      const hyperlinkTarget = {
        type: validatedType as 'URL' | 'NODE',
        value: range.hyperlink.value
      };
      
      textNode.setRangeHyperlink(start, end, hyperlinkTarget);
    }
  }
}

function applyHyperlink(textNode: TextNode, hyperlink: any): void {
  const { type, url, nodeId } = hyperlink;
  
  if (type === 'URL' && url) {
    textNode.hyperlink = { type: 'URL', url };
  } else if (type === 'NODE' && nodeId) {
    const targetNode = figma.getNodeById(nodeId);
    if (targetNode) {
      textNode.hyperlink = { type: 'NODE', value: targetNode.id };
    }
  }
}

async function createTextStyleFromNode(textNode: TextNode | null, styleOptions: { name: string, description?: string }): Promise<any> {
  const textStyle = figma.createTextStyle();
  textStyle.name = styleOptions.name;
  
  if (styleOptions.description) {
    textStyle.description = styleOptions.description;
  }
  
  if (textNode) {
    // Copy properties from the text node
    textStyle.fontName = textNode.fontName as FontName;
    textStyle.fontSize = textNode.fontSize as number;
    textStyle.letterSpacing = textNode.letterSpacing;
    textStyle.lineHeight = textNode.lineHeight;
    textStyle.paragraphSpacing = textNode.paragraphSpacing;
    textStyle.paragraphIndent = textNode.paragraphIndent;
    textStyle.textCase = textNode.textCase;
    textStyle.textDecoration = textNode.textDecoration;
  }
  
  return {
    styleId: textStyle.id,
    styleName: textStyle.name,
    styleType: 'text',
    message: `Created text style: ${textStyle.name}`
  };
}

function createPaintFromFill(fill: any): Paint {
  switch (fill.type) {
    case 'SOLID':
      const rgb = hexToRgb(fill.color || '#000000');
      return {
        type: 'SOLID',
        color: { r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 },
        opacity: fill.opacity !== undefined ? fill.opacity : 1,
        visible: fill.visible !== undefined ? fill.visible : true
      };
    default:
      throw new Error(`Unsupported fill type: ${fill.type}`);
  }
}