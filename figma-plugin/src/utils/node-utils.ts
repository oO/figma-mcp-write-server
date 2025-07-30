import { NodeInfo, SimpleNodeInfo, DetailedNodeInfo } from '../types.js';
import { imageMatrixToFlattened, extractFlattenedImageParams } from './color-utils.js';
import { logger } from '../logger.js';

// Exportable node types for scene node validation
const EXPORTABLE_NODE_TYPES = [
  'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'RECTANGLE', 'ELLIPSE', 
  'POLYGON', 'STAR', 'VECTOR', 'TEXT', 'LINE', 'BOOLEAN_OPERATION', 'SLICE', 'SECTION'
] as const;

/**
 * Check if a node is a scene node (can be rendered/exported)
 */
function isSceneNode(node: BaseNode): node is SceneNode {
  return EXPORTABLE_NODE_TYPES.includes(node.type as any);
}

export function findNodeById(nodeId: string): SceneNode | null {
  try {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      return null;
    }
    
    return isSceneNode(node) ? node : null;
  } catch (error) {
    // figma.getNodeById can throw if nodeId is invalid format
    return null;
  }
}

/**
 * Find a node within a specific page by ID
 */
export function findNodeInPage(page: PageNode, nodeId: string): SceneNode | null {
  try {
    const node = figma.getNodeById(nodeId);
    if (!node || !isSceneNode(node)) {
      return null;
    }
    
    // Check if this node is within the specified page
    let current = node;
    while (current.parent) {
      if (current.parent.id === page.id) {
        return node; // Already validated as scene node above
      }
      current = current.parent;
    }
    
    return null; // Node not in this page
  } catch (error) {
    return null;
  }
}

/**
 * Find a node or page by ID - supports both scene nodes and pages
 * This is the unified function for export operations that can work with both nodes and pages
 */
export function findNodeOrPageById(id: string): (SceneNode | PageNode) | null {
  try {
    // First try to find as scene node
    const node = findNodeById(id);
    if (node) {
      return node;
    }
    
    // Then try to find as page
    const page = Array.from(figma.root.children).find(child => child.id === id);
    if (page && page.type === 'PAGE') {
      return page as PageNode;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Apply corner radius properties to a node (DRY utility)
 * Handles the try/catch for mixed corner values
 */
export function applyCornerRadius(node: any, params: any, index: number = 0): void {
  // Apply uniform corner radius if specified
  const cornerRadius = Array.isArray(params.cornerRadius) ? params.cornerRadius[index] : params.cornerRadius;
  if (cornerRadius !== undefined) {
    try {
      node.cornerRadius = cornerRadius;
    } catch (error) {
      // Some nodes may not support cornerRadius or value may be invalid
      // This is expected behavior for certain node types
    }
  }
  
  // Apply individual corner radii if specified
  const topLeftRadius = Array.isArray(params.topLeftRadius) ? params.topLeftRadius[index] : params.topLeftRadius;
  if (topLeftRadius !== undefined && 'topLeftRadius' in node) {
    node.topLeftRadius = topLeftRadius;
  }
  
  const topRightRadius = Array.isArray(params.topRightRadius) ? params.topRightRadius[index] : params.topRightRadius;
  if (topRightRadius !== undefined && 'topRightRadius' in node) {
    node.topRightRadius = topRightRadius;
  }
  
  const bottomLeftRadius = Array.isArray(params.bottomLeftRadius) ? params.bottomLeftRadius[index] : params.bottomLeftRadius;
  if (bottomLeftRadius !== undefined && 'bottomLeftRadius' in node) {
    node.bottomLeftRadius = bottomLeftRadius;
  }
  
  const bottomRightRadius = Array.isArray(params.bottomRightRadius) ? params.bottomRightRadius[index] : params.bottomRightRadius;
  if (bottomRightRadius !== undefined && 'bottomRightRadius' in node) {
    node.bottomRightRadius = bottomRightRadius;
  }
  
  // Apply corner smoothing if specified
  const cornerSmoothing = Array.isArray(params.cornerSmoothing) ? params.cornerSmoothing[index] : params.cornerSmoothing;
  if (cornerSmoothing !== undefined && 'cornerSmoothing' in node) {
    node.cornerSmoothing = cornerSmoothing;
  }
}

/**
 * Extract corner radius properties safely from a node (DRY utility)
 * Handles the exception when mixed corner values exist
 */
export function extractCornerRadiusProperties(node: any): Partial<NodeInfo> {
  const cornerProps: any = {};
  
  // Try to get global cornerRadius (may throw for mixed values)
  if ('cornerRadius' in node) {
    try {
      cornerProps.cornerRadius = node.cornerRadius;
    } catch (error) {
      // Expected: Mixed corner values cause cornerRadius to throw
      // This is normal behavior - just skip global cornerRadius
    }
  }
  
  // Individual corner properties (always work)
  if ('topLeftRadius' in node) cornerProps.topLeftRadius = node.topLeftRadius;
  if ('topRightRadius' in node) cornerProps.topRightRadius = node.topRightRadius;
  if ('bottomLeftRadius' in node) cornerProps.bottomLeftRadius = node.bottomLeftRadius;
  if ('bottomRightRadius' in node) cornerProps.bottomRightRadius = node.bottomRightRadius;
  
  return cornerProps;
}

/**
 * Format and safely serialize node response (DRY utility)
 * Combines formatNodeResponse + cleanEmptyPropertiesAsync pattern
 */
export async function formatNodeResponseAsync(node: SceneNode, message?: string): Promise<NodeInfo> {
  const nodeData = formatNodeResponse(node, message);
  return await cleanEmptyPropertiesAsync(nodeData) || nodeData;
}

export function formatNodeResponse(node: SceneNode, message?: string): NodeInfo {
  const response: NodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : 0,
    y: 'y' in node ? node.y : 0,
    width: 'width' in node ? node.width : 0,
    height: 'height' in node ? node.height : 0
  };

  // Include visual properties that are commonly set during creation
  if ('visible' in node) response.visible = (node as any).visible;
  if ('locked' in node) response.locked = (node as any).locked;
  if ('opacity' in node) response.opacity = (node as any).opacity;
  
  // Include fill and stroke information
  if ('fills' in node) response.fills = (node as any).fills;
  
  // Only include stroke information if there are actual strokes applied
  if ('strokes' in node) {
    const strokes = (node as any).strokes;
    if (strokes && strokes.length > 0) {
      response.strokes = strokes;
      if ('strokeWeight' in node) response.strokeWeight = (node as any).strokeWeight;
      if ('strokeAlign' in node) response.strokeAlign = (node as any).strokeAlign;
    }
  }
  
  // Include corner properties for relevant node types using DRY utility
  const cornerProps = extractCornerRadiusProperties(node);
  Object.assign(response, cornerProps);
  
  // CRITICAL: Include variable binding information for ALL properties
  if ('boundVariables' in node) {
    const boundVars = (node as any).boundVariables;
    if (boundVars && Object.keys(boundVars).length > 0) {
      response.boundVariables = boundVars;
    }
  }
  
  // Add additional properties that can be variable-bound
  if ('rotation' in node) response.rotation = (node as any).rotation; // Figma API stores degrees directly
  if ('strokeWeight' in node && !response.strokeWeight) response.strokeWeight = (node as any).strokeWeight;
  
  // Typography properties for text nodes
  if (node.type === 'TEXT') {
    if ('characters' in node) response.characters = (node as any).characters;
    if ('fontSize' in node) response.fontSize = (node as any).fontSize;
    if ('fontName' in node) response.fontName = (node as any).fontName;
    if ('textCase' in node) response.textCase = (node as any).textCase;
    if ('textDecoration' in node) response.textDecoration = (node as any).textDecoration;
    if ('letterSpacing' in node) response.letterSpacing = (node as any).letterSpacing;
    if ('lineHeight' in node) response.lineHeight = (node as any).lineHeight;
  }
  
  // Corner radius properties are handled above using DRY utility
  
  // Layout properties for frames
  if ('spacing' in node) response.spacing = (node as any).spacing;
  if ('paddingTop' in node) response.paddingTop = (node as any).paddingTop;
  if ('paddingRight' in node) response.paddingRight = (node as any).paddingRight;
  if ('paddingBottom' in node) response.paddingBottom = (node as any).paddingBottom;
  if ('paddingLeft' in node) response.paddingLeft = (node as any).paddingLeft;
  
  // Add message if provided
  if (message) {
    (response as any).message = message;
  }
  
  return response;
}

export function validateNodeType(node: SceneNode, expectedTypes: string[]): void {
  if (!expectedTypes.includes(node.type)) {
    throw new Error(`Expected node type to be one of [${expectedTypes.join(', ')}], but got ${node.type}`);
  }
}

export function getAllNodes(
  node: BaseNode, 
  detail: string = 'standard', 
  includeHidden: boolean = false,
  maxDepth: number | null = null,
  depth: number = 0, 
  parentId: string | null = null
): any[] {
  // Stop if max depth reached
  if (maxDepth !== null && depth > maxDepth) {
    return [];
  }

  // Skip hidden nodes unless explicitly requested
  if (!includeHidden && 'visible' in node && !(node as any).visible) {
    return [];
  }

  const nodeData = createNodeData(node, detail, depth, parentId);
  const result = [nodeData];

  if ('children' in node) {
    for (const child of node.children) {
      result.push(...getAllNodes(child, detail, includeHidden, maxDepth, depth + 1, node.id));
    }
  }

  return result;
}

export function createNodeData(node: BaseNode, detail: string, depth: number, parentId: string | null): any {
  if (detail === 'minimal') {
    return {
      id: node.id,
      name: node.name,
      parentId: parentId || undefined,
      // Include essential properties needed for filtering
      type: node.type,
      visible: 'visible' in node ? (node as any).visible : true
    };
  }

  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  const standardData = {
    ...baseData,
    x: 'x' in node ? (node as any).x : 0,
    y: 'y' in node ? (node as any).y : 0,
    width: 'width' in node ? (node as any).width : 0,
    height: 'height' in node ? (node as any).height : 0,
    depth,
    parentId: parentId || undefined,
    visible: 'visible' in node ? (node as any).visible : true,
    locked: 'locked' in node ? (node as any).locked : false
  };

  if (detail === 'standard') {
    return standardData;
  }

  // Detailed mode - include all available properties
  const detailedData = { ...standardData };

  // CRITICAL FIX: Add boundVariables property for variable binding visibility
  if ('boundVariables' in node) {
    detailedData.boundVariables = (node as any).boundVariables;
  }

  // Add optional properties if they exist
  if ('opacity' in node) detailedData.opacity = (node as any).opacity;
  if ('rotation' in node) detailedData.rotation = (node as any).rotation; // Figma API stores degrees directly
  if ('cornerRadius' in node) detailedData.cornerRadius = (node as any).cornerRadius;
  if ('fills' in node) detailedData.fills = (node as any).fills;
  if ('strokes' in node) detailedData.strokes = (node as any).strokes;
  if ('effects' in node) detailedData.effects = (node as any).effects;
  if ('constraints' in node) detailedData.constraints = (node as any).constraints;
  if ('absoluteTransform' in node) detailedData.absoluteTransform = (node as any).absoluteTransform;
  if ('relativeTransform' in node) detailedData.relativeTransform = (node as any).relativeTransform;

  // Layout properties for frames
  if ('layoutMode' in node) detailedData.layoutMode = (node as any).layoutMode;
  if ('itemSpacing' in node) detailedData.itemSpacing = (node as any).itemSpacing;
  if ('paddingLeft' in node) detailedData.paddingLeft = (node as any).paddingLeft;
  if ('paddingRight' in node) detailedData.paddingRight = (node as any).paddingRight;
  if ('paddingTop' in node) detailedData.paddingTop = (node as any).paddingTop;
  if ('paddingBottom' in node) detailedData.paddingBottom = (node as any).paddingBottom;
  if ('clipsContent' in node) detailedData.clipsContent = (node as any).clipsContent;

  // Text properties
  if ('characters' in node) detailedData.characters = (node as any).characters;
  if ('fontSize' in node) detailedData.fontSize = (node as any).fontSize;
  if ('fontName' in node) detailedData.fontName = (node as any).fontName;
  if ('textAlignHorizontal' in node) detailedData.textAlignHorizontal = (node as any).textAlignHorizontal;
  if ('textAlignVertical' in node) detailedData.textAlignVertical = (node as any).textAlignVertical;

  // Clean empty properties before returning (removes empty {} and [] objects)
  return cleanEmptyProperties(detailedData) || detailedData;
}

export function selectAndFocus(nodes: SceneNode[]): void {
  figma.currentPage.selection = nodes;
  if (nodes.length > 0) {
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
}

export function getNodeParent(node: SceneNode): BaseNode & ChildrenMixin | null {
  return node.parent;
}

export function validateParentChildRelationship(parentNode: BaseNode, childNode: SceneNode): void {
  if (!('children' in parentNode)) {
    throw new Error(`Parent node ${parentNode.id} cannot contain children`);
  }
}

export function getNodeIndex(node: SceneNode): number {
  const parent = getNodeParent(node);
  if (!parent || !('children' in parent)) {
    return -1;
  }
  
  return parent.children.indexOf(node);
}

export function clampIndex(index: number, maxLength: number): number {
  return Math.max(0, Math.min(index, maxLength));
}

export function ensureNodeExists(nodeId: string): SceneNode {
  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found or is not exportable`);
  }
  return node;
}

export function getNodesByIds(nodeIds: string[]): SceneNode[] {
  return nodeIds.map(id => ensureNodeExists(id));
}

export function getNodePath(node: SceneNode): string[] {
  const path: string[] = [];
  let current: BaseNode | null = node;
  
  while (current) {
    path.unshift(current.name);
    current = current.parent;
  }
  
  return path;
}

export function isNodeVisible(node: SceneNode): boolean {
  return node.visible;
}

export function setNodeVisibility(node: SceneNode, visible: boolean): void {
  node.visible = visible;
}

export function getNodeBounds(node: SceneNode): { x: number; y: number; width: number; height: number } {
  if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    };
  }
  
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function moveNodeToPosition(node: SceneNode, x: number, y: number): void {
  if ('x' in node && 'y' in node) {
    (node as any).x = x;
    (node as any).y = y;
  } else {
    throw new Error(`Node type ${(node as any).type} does not support positioning`);
  }
}

export function resizeNode(node: SceneNode, width: number, height: number): void {
  if ('resize' in node) {
    (node as any).resize(width, height);
  } else {
    throw new Error(`Node type ${node.type} does not support resizing`);
  }
}

/**
 * Enhance image fills with metadata from imageHash
 */
async function enhanceImageMetadata(imageHash: string): Promise<{
  imageSizeX?: number;
  imageSizeY?: number;
  imageFileSize?: number;
}> {
  try {
    logger.log('🖼️ Processing imageHash:', imageHash);
    const image = figma.getImageByHash(imageHash);
    if (image) {
      // Get image dimensions
      const size = await image.getSizeAsync();
      logger.log('📏 Image dimensions:', size);
      
      // Get file size from bytes
      const bytes = await image.getBytesAsync();
      logger.log('📦 Image file size:', bytes.length, 'bytes');
      
      return {
        imageSizeX: size.width,
        imageSizeY: size.height,
        imageFileSize: bytes.length
      };
    }
  } catch (error) {
    logger.log('❌ Failed to get image metadata:', error);
  }
  
  return {};
}

/**
 * Remove empty objects and arrays from response data
 * 
 * GENERAL RULE: Don't return empty branches like {} or []
 * 
 * This function recursively cleans response objects to remove:
 * - Empty objects: {} 
 * - Empty arrays: []
 * - Objects that become empty after cleaning nested content
 * 
 * Common use cases:
 * - Remove empty boundVariables: {} 
 * - Remove empty effects: []
 * - Remove empty filters: {}
 * - Remove any other empty nested structures
 * 
 * Usage: Always apply to response data before returning to Agent
 * Example: return cleanEmptyProperties(responseData) || responseData;
 */
/**
 * Convert RGBA color to CSS-style notation for compact YAML output
 */
export function formatColorCompact(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = Math.round(color.a * 100) / 100; // Round to 2 decimal places
  
  if (a === 1) {
    return `rgb(${r},${g},${b})`;
  } else {
    return `rgba(${r},${g},${b},${a})`;
  }
}

/**
 * Round number to 3 decimal places for cleaner output
 */
function roundTo3(num: number): number {
  return Math.round(num * 1000) / 1000;
}

/**
 * Check if number is approximately zero
 */
function isApproxZero(num: number, tolerance: number = 0.001): boolean {
  return Math.abs(num) < tolerance;
}

/**
 * Check if numbers are approximately equal
 */
function isApproxEqual(a: number, b: number, tolerance: number = 0.001): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Convert Transform matrix to standard CSS transform notation
 */
export function formatTransformCompact(transform: Transform): string {
  const [[a, b, c], [d, e, f]] = transform;
  
  // Round values for cleaner output
  const ra = roundTo3(a);
  const rb = roundTo3(b);
  const rc = roundTo3(c);
  const rd = roundTo3(d);
  const re = roundTo3(e);
  const rf = roundTo3(f);
  
  // Check for identity transform
  if (isApproxEqual(ra, 1) && isApproxZero(rb) && isApproxZero(rc) && 
      isApproxZero(rd) && isApproxEqual(re, 1) && isApproxZero(rf)) {
    return 'none';
  }
  
  // Check for simple translate
  if (isApproxEqual(ra, 1) && isApproxZero(rb) && isApproxZero(rd) && isApproxEqual(re, 1)) {
    if (isApproxZero(rc) && isApproxZero(rf)) {
      return 'none';
    }
    if (isApproxZero(rf)) {
      return `translateX(${rc})`;
    }
    if (isApproxZero(rc)) {
      return `translateY(${rf})`;
    }
    return `translate(${rc}, ${rf})`;
  }
  
  // Check for simple scale
  if (isApproxZero(rb) && isApproxZero(rc) && isApproxZero(rd) && isApproxZero(rf)) {
    if (isApproxEqual(ra, re)) {
      return `scale(${ra})`;
    }
    return `scale(${ra}, ${re})`;
  }
  
  // Check for scale + translate
  if (isApproxZero(rb) && isApproxZero(rd)) {
    const transforms = [];
    if (!isApproxEqual(ra, 1) || !isApproxEqual(re, 1)) {
      if (isApproxEqual(ra, re)) {
        transforms.push(`scale(${ra})`);
      } else {
        transforms.push(`scale(${ra}, ${re})`);
      }
    }
    if (!isApproxZero(rc) || !isApproxZero(rf)) {
      if (isApproxZero(rf)) {
        transforms.push(`translateX(${rc})`);
      } else if (isApproxZero(rc)) {
        transforms.push(`translateY(${rf})`);
      } else {
        transforms.push(`translate(${rc}, ${rf})`);
      }
    }
    return transforms.join(' ');
  }
  
  // Default to standard CSS matrix notation: matrix(a, b, c, d, e, f)
  return `matrix(${ra}, ${rb}, ${rc}, ${rd}, ${re}, ${rf})`;
}

/**
 * Format gradient stops with compact color notation
 */
export function formatGradientStopsCompact(gradientStops: ColorStop[]): string {
  return gradientStops.map(stop => {
    const colorStr = formatColorCompact(stop.color);
    return `${colorStr} ${Math.round(stop.position * 100)}%`;
  }).join(', ');
}

/**
 * Check if object is an RGBA color
 */
function isRGBAColor(obj: any): obj is RGBA {
  return obj && typeof obj === 'object' && 
         typeof obj.r === 'number' && typeof obj.g === 'number' && 
         typeof obj.b === 'number' && typeof obj.a === 'number';
}

/**
 * Check if object is a Transform matrix
 */
function isTransformMatrix(obj: any): obj is Transform {
  // Check basic structure: array of 2 arrays, each with 3 numbers
  if (!Array.isArray(obj) || obj.length !== 2) {
    return false;
  }
  
  // Check first row
  if (!Array.isArray(obj[0]) || obj[0].length !== 3) {
    return false;
  }
  
  // Check second row
  if (!Array.isArray(obj[1]) || obj[1].length !== 3) {
    return false;
  }
  
  // Check all elements are finite numbers
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 3; j++) {
      const val = obj[i][j];
      if (typeof val !== 'number' || !isFinite(val)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Check if object is a ColorStop array
 */
function isColorStopArray(obj: any): obj is ColorStop[] {
  return Array.isArray(obj) && obj.length > 0 &&
         obj.every((stop: any) => 
           stop && typeof stop === 'object' &&
           typeof stop.position === 'number' &&
           isRGBAColor(stop.color)
         );
}

/**
 * Async version of cleanEmptyProperties that can enhance image fills with metadata
 */
export async function cleanEmptyPropertiesAsync(obj: any): Promise<any> {
  try {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // Special handling for RGBA colors (must come before array check)
    if (isRGBAColor(obj)) {
      return formatColorCompact(obj);
    }
    
    if (Array.isArray(obj)) {
      // Special handling for ColorStop arrays
      if (isColorStopArray(obj)) {
        return formatGradientStopsCompact(obj);
      }
      
      const cleaned = [];
      for (const item of obj) {
        const cleanedItem = await cleanEmptyPropertiesAsync(item);
        if (cleanedItem !== undefined) {
          cleaned.push(cleanedItem);
      }
    }
    return cleaned.length > 0 ? cleaned : undefined;
  }
  
  const cleaned: any = {};
  let hasProperties = false;
  
  // Special handling for IMAGE fills - enhance with metadata
  let enhancedObj = obj;
  if (obj.type === 'IMAGE' && obj.imageHash) {
    try {
      const imageMetadata = await enhanceImageMetadata(obj.imageHash);
      // Deep clone the object to avoid "object is not extensible" errors
      enhancedObj = JSON.parse(JSON.stringify(obj));
      Object.assign(enhancedObj, imageMetadata);
    } catch (error) {
      // If metadata enhancement fails, use original object
      enhancedObj = obj;
    }
  }
  
  // Special handling for IMAGE fills - extract unified flat parameters
  if (enhancedObj.type === 'IMAGE') {
    try {
      const flatParams = extractFlattenedImageParams(enhancedObj as ImagePaint);
      Object.assign(cleaned, flatParams);
      hasProperties = true;
    } catch (error) {
      // If extraction fails, continue with normal processing
    }
  }

  for (const [key, value] of Object.entries(enhancedObj)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    // Hide gradientTransform matrix but add flattened parameters for gradient fills
    if (key === 'gradientTransform') {
      // Check if this is part of a gradient fill (parent object has gradient type)
      if (enhancedObj.type && enhancedObj.type.startsWith('GRADIENT_')) {
        // Skip the matrix - MCP client only sees flat parameters
        // Try to add flattened parameters instead
        try {
          const { matrixToFlattened } = require('../utils/color-utils.js');
          const flattened = matrixToFlattened(value);
          cleaned['gradientStartX'] = Number(flattened.gradientStartX.toFixed(3));
          cleaned['gradientStartY'] = Number(flattened.gradientStartY.toFixed(3));
          cleaned['gradientEndX'] = Number(flattened.gradientEndX.toFixed(3));
          cleaned['gradientEndY'] = Number(flattened.gradientEndY.toFixed(3));
          cleaned['gradientScale'] = Number(flattened.gradientScale.toFixed(3));
          hasProperties = true;
        } catch (error) {
          // Flattening failed, but we still skip the matrix for cleaner output
        }
      }
      continue;
    }
    
    // Hide spacing object but add flattened parameters for pattern fills
    if (key === 'spacing') {
      // Check if this is part of a pattern fill (parent object has PATTERN type)
      if (enhancedObj.type && enhancedObj.type === 'PATTERN') {
        // Skip the spacing object - MCP client only sees flat parameters
        try {
          cleaned['patternSpacingX'] = Number((value.x || 0).toFixed(3));
          cleaned['patternSpacingY'] = Number((value.y || 0).toFixed(3));
          hasProperties = true;
        } catch (error) {
          // Flattening failed, skip spacing
        }
      }
      continue;
    }
    
    // Hide filters from output, but convert to flattened parameters for image fills
    if (key === 'filters') {
      // Check if this is part of an image fill (parent object has IMAGE type)
      if (enhancedObj.type && enhancedObj.type === 'IMAGE') {
        try {
          // Add flattened filter parameters to the cleaned object
          if (value.exposure !== undefined) cleaned['filterExposure'] = Number(value.exposure.toFixed(3));
          if (value.contrast !== undefined) cleaned['filterContrast'] = Number(value.contrast.toFixed(3));
          if (value.saturation !== undefined) cleaned['filterSaturation'] = Number(value.saturation.toFixed(3));
          if (value.temperature !== undefined) cleaned['filterTemperature'] = Number(value.temperature.toFixed(3));
          if (value.tint !== undefined) cleaned['filterTint'] = Number(value.tint.toFixed(3));
          if (value.highlights !== undefined) cleaned['filterHighlights'] = Number(value.highlights.toFixed(3));
          if (value.shadows !== undefined) cleaned['filterShadows'] = Number(value.shadows.toFixed(3));
          hasProperties = true;
        } catch (error) {
          // If conversion fails, skip the filters entirely
        }
      }
      continue;
    }
    
    // Include imageHash (metadata will be added separately in async processing)
    if (key === 'imageHash') {
      // Always preserve the imageHash
      cleaned[key] = value;
      hasProperties = true;
      continue;
    }

    // Hide Figma API implementation details for image fills - flat parameters already extracted above
    if (key === 'imageTransform' || key === 'rotation' || key === 'scalingFactor' || key === 'scaleMode') {
      // Check if this is part of an image fill (parent object has IMAGE type)
      if (enhancedObj.type && enhancedObj.type === 'IMAGE') {
        // Skip these implementation details - MCP client only sees flat parameters
        continue;
      }
    }
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        const cleanedArray = await cleanEmptyPropertiesAsync(value);
        if (cleanedArray !== undefined) {
          cleaned[key] = cleanedArray;
          hasProperties = true;
        }
      }
    } else if (typeof value === 'object') {
      // Check if object is empty
      if (Object.keys(value).length > 0) {
        const cleanedObj = await cleanEmptyPropertiesAsync(value);
        if (cleanedObj !== undefined && Object.keys(cleanedObj).length > 0) {
          cleaned[key] = cleanedObj;
          hasProperties = true;
        }
      }
    } else {
      cleaned[key] = value;
      hasProperties = true;
    }
  }
  
  
  return hasProperties ? cleaned : undefined;
  } catch (error) {
    throw error;
  }
}

export function cleanEmptyProperties(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Special handling for RGBA colors (must come before array check)
  if (isRGBAColor(obj)) {
    return formatColorCompact(obj);
  }
  
  // Special handling for Transform matrices (must come before array check)
  // Note: Transform matrices are now hidden from output
  
  if (Array.isArray(obj)) {
    // Special handling for ColorStop arrays
    if (isColorStopArray(obj)) {
      return formatGradientStopsCompact(obj);
    }
    
    const cleaned = obj.map(cleanEmptyProperties).filter(item => item !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  
  const cleaned: any = {};
  let hasProperties = false;
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    // Hide gradientTransform matrix but add flattened parameters for gradient fills
    if (key === 'gradientTransform') {
      // Check if this is part of a gradient fill (parent object has gradient type)
      if (obj.type && obj.type.startsWith('GRADIENT_')) {
        // Skip the matrix - MCP client only sees flat parameters
        // Try to add flattened parameters instead
        try {
          const { matrixToFlattened } = require('../utils/color-utils.js');
          const flattened = matrixToFlattened(value);
          cleaned['gradientStartX'] = Number(flattened.gradientStartX.toFixed(3));
          cleaned['gradientStartY'] = Number(flattened.gradientStartY.toFixed(3));
          cleaned['gradientEndX'] = Number(flattened.gradientEndX.toFixed(3));
          cleaned['gradientEndY'] = Number(flattened.gradientEndY.toFixed(3));
          cleaned['gradientScale'] = Number(flattened.gradientScale.toFixed(3));
          hasProperties = true;
        } catch (error) {
          // Flattening failed, but we still skip the matrix for cleaner output
        }
      }
      continue;
    }
    
    // Hide spacing object but add flattened parameters for pattern fills
    if (key === 'spacing') {
      // Check if this is part of a pattern fill (parent object has PATTERN type)
      if (obj.type && obj.type === 'PATTERN') {
        // Skip the spacing object - MCP client only sees flat parameters
        try {
          cleaned['patternSpacingX'] = Number((value.x || 0).toFixed(3));
          cleaned['patternSpacingY'] = Number((value.y || 0).toFixed(3));
          hasProperties = true;
        } catch (error) {
          // Flattening failed, skip spacing
        }
      }
      continue;
    }
    
    // Hide filters from output, but convert to flattened parameters for image fills
    if (key === 'filters') {
      // Check if this is part of an image fill (parent object has IMAGE type)
      if (obj.type && obj.type === 'IMAGE') {
        try {
          // Add flattened filter parameters to the cleaned object
          if (value.exposure !== undefined) cleaned['filterExposure'] = Number(value.exposure.toFixed(3));
          if (value.contrast !== undefined) cleaned['filterContrast'] = Number(value.contrast.toFixed(3));
          if (value.saturation !== undefined) cleaned['filterSaturation'] = Number(value.saturation.toFixed(3));
          if (value.temperature !== undefined) cleaned['filterTemperature'] = Number(value.temperature.toFixed(3));
          if (value.tint !== undefined) cleaned['filterTint'] = Number(value.tint.toFixed(3));
          if (value.highlights !== undefined) cleaned['filterHighlights'] = Number(value.highlights.toFixed(3));
          if (value.shadows !== undefined) cleaned['filterShadows'] = Number(value.shadows.toFixed(3));
          hasProperties = true;
        } catch (error) {
          // If conversion fails, skip the filters entirely
        }
      }
      continue;
    }
    
    // Include imageHash (metadata will be added separately in async processing)
    if (key === 'imageHash') {
      // Always preserve the imageHash
      cleaned[key] = value;
      hasProperties = true;
      continue;
    }

    // Hide Figma API implementation details for image fills - flat parameters already extracted above
    if (key === 'imageTransform' || key === 'rotation' || key === 'scalingFactor' || key === 'scaleMode') {
      // Check if this is part of an image fill (parent object has IMAGE type)
      if (obj.type && obj.type === 'IMAGE') {
        // Skip these implementation details - MCP client only sees flat parameters
        continue;
      }
    }
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        const cleanedArray = cleanEmptyProperties(value);
        if (cleanedArray !== undefined) {
          cleaned[key] = cleanedArray;
          hasProperties = true;
        }
      }
    } else if (typeof value === 'object') {
      // Check if object is empty
      if (Object.keys(value).length > 0) {
        const cleanedObj = cleanEmptyProperties(value);
        if (cleanedObj !== undefined && Object.keys(cleanedObj).length > 0) {
          cleaned[key] = cleanedObj;
          hasProperties = true;
        }
      }
    } else {
      cleaned[key] = value;
      hasProperties = true;
    }
  }
  
  
  return hasProperties ? cleaned : undefined;
}

/**
 * Format Paint objects for compact YAML output
 */
export function formatPaintCompact(paint: Paint): any {
  const compactPaint: any = { ...paint };
  
  if (paint.type === 'SOLID' && 'color' in paint) {
    compactPaint.color = formatColorCompact(paint.color);
  }
  
  if (paint.type.startsWith('GRADIENT_') && 'gradientStops' in paint && 'gradientTransform' in paint) {
    compactPaint.gradientStops = formatGradientStopsCompact(paint.gradientStops);
    compactPaint.gradientTransform = formatTransformCompact(paint.gradientTransform);
  }
  
  if (paint.type === 'PATTERN' && 'spacing' in paint) {
    compactPaint.patternSpacingX = paint.spacing.x || 0;
    compactPaint.patternSpacingY = paint.spacing.y || 0;
    delete compactPaint.spacing;
  }
  
  return compactPaint;
}

