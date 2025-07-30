import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, formatNodeResponseAsync, moveNodeToPosition, resizeNode } from '../utils/node-utils.js';
import { hexToRgb, rgbToHex } from '../utils/color-utils.js';
import { findSmartPosition } from '../utils/smart-positioning.js';
import { logger } from '../logger.js';
import { clone } from '../utils/figma-property-utils.js';
import { figmaToSparse, sparseToFigma, createDefaultVectorFill, removeSymbols } from '../utils/vector-sparse-format.js';
import { 
  handleBulkError,
  createBulkSummary,
  distributeBulkParams
} from '../utils/bulk-operations.js';
import { normalizeToArray } from '../utils/paint-properties.js';
import { extractRegionFromSparse, extractPathFromSparse } from './extract-element-helpers.js';


/**
 * Add a node to the specified parent container or page
 * Validates parent container type and throws descriptive errors
 */
function addNodeToParent(node: SceneNode, parentId?: string): BaseNode & ChildrenMixin {
  if (parentId) {
    const parentNode = findNodeById(parentId);
    if (!parentNode) {
      throw new Error(`Parent node with ID ${parentId} not found`);
    }
    
    // Validate that the parent can contain children
    const containerTypes = ['DOCUMENT', 'PAGE', 'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'SLIDE', 'SLIDE_ROW', 'SECTION', 'STICKY', 'SHAPE_WITH_TEXT', 'TABLE', 'CODE_BLOCK'];
    if (!containerTypes.includes(parentNode.type)) {
      throw new Error(`Parent node type '${parentNode.type}' cannot contain child nodes. Valid container types: ${containerTypes.join(', ')}`);
    }
    
    // Add to parent container
    (parentNode as BaseNode & ChildrenMixin).appendChild(node);
    return parentNode as BaseNode & ChildrenMixin;
  } else {
    // Add to current page
    figma.currentPage.appendChild(node);
    return figma.currentPage;
  }
}

/**
 * Handle MANAGE_VECTORS - comprehensive vector operations
 */
export async function MANAGE_VECTORS(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('vectorsOperation', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      [
        // VectorNetwork Format  
        'create_vector', 'get_vector', 'update_vector',
        // Line Format
        'create_line', 'get_line', 'update_line',
        // Utility Operations
        'flatten', 'convert_stroke', 'convert_shape', 'convert_text', 'extract_element'
      ]
    );
    
    switch (operation) {
      // VectorNetwork Format operations
      case 'create_vector':
        return await createVector(params);
      case 'get_vector':
        return await getVector(params);
      case 'update_vector':
        return await updateVector(params);
        
      // Line Format operations
      case 'create_line':
        return await createLine(params);
      case 'get_line':
        return await getLine(params);
      case 'update_line':
        return await updateLine(params);
        
      // Utility operations
      case 'flatten':
        return await flattenNodes(params);
      case 'convert_stroke':
        return await convertStroke(params);
      case 'convert_shape':
        return await convertShape(params);
      case 'convert_text':
        return await convertText(params);
      case 'extract_element':
        return await extractElement(params);
        
      default:
        throw new Error(`Unknown vectors operation: ${operation}`);
    }
  });
}

// ===== VectorNetwork Format Operations =====

async function createVector(params: any): Promise<any> {
  // Check if params contain a vectorNetwork object (sparse format)
  if (params.vectorNetwork) {
    // Extract sparse data from vectorNetwork parameter
    const sparseData = params.vectorNetwork;
    params.vertices = sparseData.vertices;
    params.paths = sparseData.paths;  // Fixed: was incorrectly 'segments'
    params.regions = sparseData.regions;
    params.fills = sparseData.fills;
    params.handles = sparseData.handles;
    params.vertexProps = sparseData.vertexProps;
  }
  
  // Always expect sparse format (string vertices)
  BaseOperation.validateParams(params, ['vertices']);
  
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const vectorNode = figma.createVector();
      vectorNode.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Vector Network');
      
      // STEP 1: Set vector network data first (vector changes)
      try {
        // Build the sparse vector data object
        const sparseData: any = {
          vertices: params.vertices // Always string format
        };
        
        // Handle regions
        if (params.regions) {
          sparseData.regions = Array.isArray(params.regions[0]) ? params.regions[i] : params.regions;
        }
        
        // Handle paths
        if (params.paths) {
          sparseData.paths = Array.isArray(params.paths[0]) ? params.paths[i] : params.paths;
        }
        
        // Handle sparse format properties
        if (params.handles) {
          sparseData.handles = params.handles;
        }
        if (params.vertexProps) {
          sparseData.vertexProps = params.vertexProps;
        }
        if (params.fills) {
          sparseData.fills = params.fills;
        }
        
        // Convert sparse format to Figma format
        const vectorNetwork = sparseToFigma(sparseData);
        
        vectorNode.vectorNetwork = vectorNetwork;
      } catch (error) {
        // Provide user-friendly sparse format error messages
        const errorMsg = error.toString();
        if (errorMsg.includes('JSON.parse') || errorMsg.includes('Unexpected token')) {
          throw new Error(`Invalid sparse format: vertices must be a valid JSON array string like "[0,0,100,0,50,100]", loops must be JSON arrays like "[0,1,2,3]"`);
        } else if (errorMsg.includes('segments') && errorMsg.includes('Expected number')) {
          throw new Error(`Invalid sparse format: region loops contain invalid vertex indices. Ensure all vertex indices in loops are valid numbers referencing the vertices array.`);
        } else if (errorMsg.includes('vectorNetwork')) {
          throw new Error(`Invalid sparse format: ${errorMsg.replace(/vectorNetwork|segments|Expected number, received string/g, '').trim()}`);
        } else {
          throw new Error(`Invalid sparse vector format: Please check that vertices is a JSON array string "[x,y,x,y...]" and region loops are JSON arrays "[0,1,2,3]"`);
        }
      }
      
      // STEP 2: Add to parent
      const parentId = Array.isArray(params.parentId) ? params.parentId[i] : params.parentId;
      const parentContainer = addNodeToParent(vectorNode, parentId);
      
      // STEP 3: Apply all node-level transforms (position, size, rotation)
      const transformMode = Array.isArray(params.transformMode) ? params.transformMode[i] : (params.transformMode || 'absolute');
      
      // Position (x, y)
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      if (x !== undefined || y !== undefined) {
        const targetX = x !== undefined ? x : 0;
        const targetY = y !== undefined ? y : 0;
        moveNodeToPosition(vectorNode, targetX, targetY);
      } else {
        // Use smart positioning
        const position = findSmartPosition({ width: vectorNode.width, height: vectorNode.height }, parentContainer);
        moveNodeToPosition(vectorNode, position.x, position.y);
      }
      
      // Size (width, height)
      const width = Array.isArray(params.width) ? params.width[i] : params.width;
      const height = Array.isArray(params.height) ? params.height[i] : params.height;
      if (width !== undefined || height !== undefined) {
        const targetWidth = width !== undefined ? width : vectorNode.width;
        const targetHeight = height !== undefined ? height : vectorNode.height;
        resizeNode(vectorNode, targetWidth, targetHeight);
      }
      
      // Rotation
      const rotation = Array.isArray(params.rotation) ? params.rotation[i] : params.rotation;
      if (rotation !== undefined) {
        vectorNode.rotation = rotation * Math.PI / 180; // Convert degrees to radians
      }
      
      // STEP 4: Apply styling
      const fillColor = Array.isArray(params.fillColor) ? params.fillColor[i] : params.fillColor;
      const defaultFill = createDefaultVectorFill(fillColor);
      if (defaultFill.length > 0) {
        vectorNode.fills = defaultFill;
      }
      // Note: Figma automatically applies default fills to vectors with closed regions
      
      const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[i] : params.strokeColor;
      if (strokeColor) {
        vectorNode.strokes = [{ type: 'SOLID', color: hexToRgb(strokeColor) }];
      } else {
        // For open paths without explicit stroke, add a default stroke for visibility
        const hasOpenPaths = sparseData.paths && sparseData.paths.length > 0;
        const hasRegions = sparseData.regions && sparseData.regions.length > 0;
        if (hasOpenPaths && !hasRegions) {
          // Pure open path vector - needs stroke to be visible
          vectorNode.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; // Default black stroke
          vectorNode.strokeWeight = 1;
        }
      }
      
      const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
      if (strokeWidth !== undefined) {
        vectorNode.strokeWeight = strokeWidth;
      }
      
      const cornerRadius = Array.isArray(params.cornerRadius) ? params.cornerRadius[i] : params.cornerRadius;
      if (cornerRadius !== undefined) {
        vectorNode.cornerRadius = cornerRadius;
      }
      
      results.push(formatNodeResponse(vectorNode, 'Vector network created with transforms applied'));
    } catch (error) {
      handleBulkError(error, `vector_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function getVector(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (!('vectorNetwork' in node)) {
        throw new Error(`Node ${nodeId} is not a vector node`);
      }
      
      const vectorNode = node as VectorNode;
      
      // Convert to sparse format for compact response
      const sparseNetwork = await figmaToSparse(vectorNode.vectorNetwork);
      
      const response = {
        nodeId: vectorNode.id,
        name: vectorNode.name,
        type: vectorNode.type,
        x: vectorNode.x,
        y: vectorNode.y,
        width: vectorNode.width,
        height: vectorNode.height,
        vectorNetwork: sparseNetwork,
        vertexCount: JSON.parse(sparseNetwork.vertices).length / 2,
        segmentCount: (sparseNetwork.regions?.reduce((sum, r) => sum + r.loops.reduce((loopSum, loop) => loopSum + JSON.parse(loop).length, 0), 0) || 0) + (sparseNetwork.paths?.reduce((sum, path) => sum + JSON.parse(path).length - 1, 0) || 0),
        regionCount: sparseNetwork.regions?.length || 0,
        pathCount: sparseNetwork.paths?.length || 0,
        visible: vectorNode.visible,
        locked: vectorNode.locked,
        opacity: vectorNode.opacity,
        fills: removeSymbols(vectorNode.fills),
        strokes: removeSymbols(vectorNode.strokes),
        strokeWeight: vectorNode.strokeWeight,
        strokeAlign: vectorNode.strokeAlign,
        rotation: vectorNode.rotation,
        message: 'Vector network data retrieved in sparse format'
      };
      // Apply removeSymbols to entire response to ensure no symbols anywhere
      results.push(removeSymbols(response));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

async function updateVector(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  // Check if params contain a vectorNetwork object (sparse format)
  if (params.vectorNetwork) {
    // Extract sparse data from vectorNetwork parameter
    const sparseData = params.vectorNetwork;
    params.vertices = sparseData.vertices;
    params.paths = sparseData.paths;  // Fixed: was incorrectly 'segments'
    params.regions = sparseData.regions;
    params.fills = sparseData.fills;
    params.handles = sparseData.handles;
    params.vertexProps = sparseData.vertexProps;
  }
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (!('vectorNetwork' in node)) {
        throw new Error(`Node ${nodeId} is not a vector node`);
      }
      
      const vectorNode = node as VectorNode;
      
      try {
        // Only update if we have vector data
        if (params.vertices || params.regions || params.paths || params.handles || params.vertexProps) {
          // Build the sparse vector data object
          const sparseData: any = {};
          
          // Handle vertices (always string format)
          if (params.vertices) {
            sparseData.vertices = params.vertices;
          }
          
          // Handle regions
          if (params.regions) {
            sparseData.regions = Array.isArray(params.regions[0]) ? params.regions[i] : params.regions;
          }
          
          // Handle paths
          if (params.paths) {
            sparseData.paths = Array.isArray(params.paths[0]) ? params.paths[i] : params.paths;
          }
          
          // Handle sparse format properties
          if (params.handles) {
            sparseData.handles = params.handles;
          }
          if (params.vertexProps) {
            sparseData.vertexProps = params.vertexProps;
          }
          if (params.fills) {
            sparseData.fills = params.fills;
          }
          
          // If partial update, merge with existing
          if (!params.vertices) {
            // Convert existing to sparse, merge, convert back
            const existingSparse = await figmaToSparse(vectorNode.vectorNetwork);
            
            // Smart merge: preserve existing fills if incoming data has regions but no fills
            if (sparseData.regions && !sparseData.fills && existingSparse.fills) {
              // Preserve existing fills array when regions are updated without fills
              const mergedData = { ...existingSparse, ...sparseData };
              mergedData.fills = existingSparse.fills;
              vectorNode.vectorNetwork = sparseToFigma(mergedData);
            } else {
              Object.assign(existingSparse, sparseData);
              vectorNode.vectorNetwork = sparseToFigma(existingSparse);
            }
          } else {
            // Full replacement
            vectorNode.vectorNetwork = sparseToFigma(sparseData);
          }
        }
      } catch (error) {
        // Provide user-friendly sparse format error messages
        const errorMsg = error.toString();
        if (errorMsg.includes('JSON.parse') || errorMsg.includes('Unexpected token')) {
          throw new Error(`Invalid sparse format: vertices must be a valid JSON array string like "[0,0,100,0,50,100]", loops must be JSON arrays like "[0,1,2,3]"`);
        } else if (errorMsg.includes('segments') && errorMsg.includes('Expected number')) {
          throw new Error(`Invalid sparse format: region loops contain invalid vertex indices. Ensure all vertex indices in loops are valid numbers referencing the vertices array.`);
        } else if (errorMsg.includes('vectorNetwork')) {
          throw new Error(`Invalid sparse format: ${errorMsg.replace(/vectorNetwork|segments|Expected number, received string/g, '').trim()}`);
        } else {
          throw new Error(`Invalid sparse vector format: Please check that vertices is a JSON array string "[x,y,x,y...]" and region loops are JSON arrays "[0,1,2,3]"`);
        }
      }
      
      // Update corner radius if specified
      const cornerRadius = Array.isArray(params.cornerRadius) ? params.cornerRadius[i] : params.cornerRadius;
      if (cornerRadius !== undefined) {
        vectorNode.cornerRadius = cornerRadius;
      }
      
      // Handle node-level transforms (routing to node API)
      const transformMode = Array.isArray(params.transformMode) ? params.transformMode[i] : (params.transformMode || 'absolute');
      
      // Position updates
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      if (x !== undefined || y !== undefined) {
        const newX = transformMode === 'relative' ? 
          (vectorNode.x + (x || 0)) : (x !== undefined ? x : vectorNode.x);
        const newY = transformMode === 'relative' ? 
          (vectorNode.y + (y || 0)) : (y !== undefined ? y : vectorNode.y);
        moveNodeToPosition(vectorNode, newX, newY);
      }
      
      // Size updates
      const width = Array.isArray(params.width) ? params.width[i] : params.width;
      const height = Array.isArray(params.height) ? params.height[i] : params.height;
      if (width !== undefined || height !== undefined) {
        const newWidth = transformMode === 'relative' ? 
          (vectorNode.width + (width || 0)) : (width !== undefined ? width : vectorNode.width);
        const newHeight = transformMode === 'relative' ? 
          (vectorNode.height + (height || 0)) : (height !== undefined ? height : vectorNode.height);
        resizeNode(vectorNode, newWidth, newHeight);
      }
      
      // Rotation updates (input in degrees, Figma uses radians internally)
      const rotation = Array.isArray(params.rotation) ? params.rotation[i] : params.rotation;
      if (rotation !== undefined) {
        const currentRotationDegrees = vectorNode.rotation * 180 / Math.PI;
        const newRotationDegrees = transformMode === 'relative' ? 
          (currentRotationDegrees + rotation) : rotation;
        vectorNode.rotation = newRotationDegrees * Math.PI / 180; // Convert degrees to radians
      }
      
      results.push(formatNodeResponse(vectorNode, 'Vector network and transforms updated'));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

// ===== Line Format Operations =====

async function createLine(params: any): Promise<any> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.startX) ? params.startX.length :
               Array.isArray(params.x) ? params.x.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const line = figma.createLine();
      line.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Line');
      
      let startX, startY, length, rotation;
      
      // Determine which parameter style is being used
      const hasStartEnd = params.startX !== undefined || params.endX !== undefined || 
                         params.startY !== undefined || params.endY !== undefined;
      
      if (hasStartEnd) {
        // Start/End point style
        startX = Array.isArray(params.startX) ? params.startX[i] : (params.startX ?? (Array.isArray(params.x) ? params.x[i] : (params.x || 0)));
        startY = Array.isArray(params.startY) ? params.startY[i] : (params.startY ?? (Array.isArray(params.y) ? params.y[i] : (params.y || 0)));
        const endX = Array.isArray(params.endX) ? params.endX[i] : (params.endX ?? startX + 100);
        const endY = Array.isArray(params.endY) ? params.endY[i] : (params.endY ?? startY);
        
        // Calculate length and rotation from start/end points
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        rotation = Math.atan2(deltaY, deltaX); // Rotation in radians
      } else {
        // Length/Rotation style
        length = Array.isArray(params.length) ? params.length[i] : (params.length || 100);
        rotation = Array.isArray(params.rotation) ? (params.rotation[i] * Math.PI / 180) : ((params.rotation || 0) * Math.PI / 180);
        startX = Array.isArray(params.x) ? params.x[i] : params.x;
        startY = Array.isArray(params.y) ? params.y[i] : params.y;
      }
      
      // Set line properties
      line.resize(length, 0);
      line.rotation = rotation;
      
      // Add to parent (handle bulk parentId)
      const parentId = Array.isArray(params.parentId) ? params.parentId[i] : params.parentId;
      const parentContainer = addNodeToParent(line, parentId);
      
      // Position the line
      if (startX !== undefined || startY !== undefined) {
        line.x = startX || 0;
        line.y = startY || 0;
      } else {
        // Use smart positioning
        const position = findSmartPosition({ width: length, height: 1 }, parentContainer);
        line.x = position.x;
        line.y = position.y;
      }
      
      // Apply styling
      const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[i] : params.strokeColor;
      if (strokeColor) {
        line.strokes = [{ type: 'SOLID', color: hexToRgb(strokeColor) }];
      }
      
      const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
      if (strokeWidth !== undefined) {
        line.strokeWeight = strokeWidth;
      }
      
      const strokeDashPattern = Array.isArray(params.strokeDashPattern) ? params.strokeDashPattern[i] : params.strokeDashPattern;
      if (strokeDashPattern) {
        line.dashPattern = strokeDashPattern;
      }
      
      results.push(formatNodeResponse(line, 'Line created successfully'));
    } catch (error) {
      handleBulkError(error, `line_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function getLine(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'LINE') {
        throw new Error(`Node ${nodeId} is not a line node`);
      }
      
      const line = node as LineNode;
      
      // Calculate end coordinates
      const endX = line.x + Math.cos(line.rotation) * line.width;
      const endY = line.y + Math.sin(line.rotation) * line.width;
      
      results.push({
        nodeId: line.id,
        name: line.name,
        startX: line.x,
        startY: line.y,
        endX: endX,
        endY: endY,
        length: line.width,
        rotation: line.rotation * 180 / Math.PI, // Convert to degrees
        strokeWeight: line.strokeWeight,
        strokeColor: line.strokes.length > 0 && line.strokes[0].type === 'SOLID' ? 
          rgbToHex((line.strokes[0] as SolidPaint).color) : null,
        dashPattern: line.dashPattern,
        message: 'Line properties retrieved successfully'
      });
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

async function updateLine(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'LINE') {
        throw new Error(`Node ${nodeId} is not a line node`);
      }
      
      const line = node as LineNode;
      
      // Update coordinates/geometry
      const hasStartEnd = params.startX !== undefined || params.endX !== undefined || 
                         params.startY !== undefined || params.endY !== undefined;
      
      if (hasStartEnd) {
        // Start/End point style
        const startX = Array.isArray(params.startX) ? params.startX[i] : (params.startX ?? line.x);
        const startY = Array.isArray(params.startY) ? params.startY[i] : (params.startY ?? line.y);
        const currentEndX = line.x + Math.cos(line.rotation) * line.width;
        const currentEndY = line.y + Math.sin(line.rotation) * line.width;
        const endX = Array.isArray(params.endX) ? params.endX[i] : (params.endX ?? currentEndX);
        const endY = Array.isArray(params.endY) ? params.endY[i] : (params.endY ?? currentEndY);
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const rotation = Math.atan2(deltaY, deltaX);
        
        line.resize(length, 0);
        line.rotation = rotation;
        line.x = startX;
        line.y = startY;
      } else if (params.length !== undefined || params.rotation !== undefined) {
        // Length/Rotation style
        const length = Array.isArray(params.length) ? params.length[i] : params.length;
        if (length !== undefined) {
          line.resize(length, 0);
        }
        
        const rotation = Array.isArray(params.rotation) ? params.rotation[i] : params.rotation;
        if (rotation !== undefined) {
          line.rotation = rotation * Math.PI / 180;
        }
      }
      
      // Update styling
      const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[i] : params.strokeColor;
      if (strokeColor) {
        line.strokes = [{ type: 'SOLID', color: hexToRgb(strokeColor) }];
      }
      
      const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
      if (strokeWidth !== undefined) {
        line.strokeWeight = strokeWidth;
      }
      
      const strokeDashPattern = Array.isArray(params.strokeDashPattern) ? params.strokeDashPattern[i] : params.strokeDashPattern;
      if (strokeDashPattern) {
        line.dashPattern = strokeDashPattern;
      }
      
      results.push(formatNodeResponse(line, 'Line updated successfully'));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

// ===== Utility Operations =====

async function flattenNodes(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeIds']);
  
  if (!params.nodeIds || !Array.isArray(params.nodeIds)) {
    throw new Error('nodeIds must be an array of node IDs');
  }
  
  const results: any[] = [];
  
  try {
    const nodes = params.nodeIds.map((id: string) => {
      const node = findNodeById(id);
      if (!node) {
        throw new Error(`Node with ID ${id} not found`);
      }
      return node;
    });
    
    const replaceOriginal = params.replaceOriginal ?? true;
    const workingNodes = replaceOriginal ? nodes : nodes.map(n => n.clone());
    
    // Use the parent of the first node, but warn if nodes have different parents
    const targetParent = nodes[0].parent;
    const hasMultipleParents = nodes.some(n => n.parent !== targetParent);
    if (hasMultipleParents) {
      // Still proceed but log a warning - flattened result will go to first node's parent
      logger.warn('Flattening nodes with different parents - result will be placed in first node\'s parent');
    }
    
    const flattened = figma.flatten(workingNodes, targetParent);
    if (!flattened) {
      throw new Error(`Failed to flatten nodes: ${params.nodeIds.join(', ')}`);
    }
    flattened.name = params.name || 'Flattened Vector';
    
    const message = replaceOriginal 
      ? `Nodes flattened - original nodes ${params.nodeIds.join(', ')} were replaced/consumed` 
      : `Nodes flattened - original nodes ${params.nodeIds.join(', ')} were preserved, new vector created`;
    results.push(await formatNodeResponseAsync(flattened, message));
  } catch (error) {
    handleBulkError(error, 'flatten', results);
  }
  
  return createBulkSummary(results, params.nodeIds.length);
}

async function convertStroke(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (!('strokes' in node) || !node.strokes || node.strokes.length === 0) {
        throw new Error(`Node ${nodeId} has no strokes to convert`);
      }
      
      const replaceOriginal = Array.isArray(params.replaceOriginal) ? params.replaceOriginal[i] : (params.replaceOriginal ?? true);
      
      // Store original properties before potentially consuming the node
      const originalName = node.name;
      const originalParent = node.parent;
      const originalX = node.x;
      const originalY = node.y;
      const workingNode = replaceOriginal ? node : node.clone();
      
      // Set stroke width if provided
      const strokeWidth = Array.isArray(params.strokeWidth) ? params.strokeWidth[i] : params.strokeWidth;
      if (strokeWidth !== undefined) {
        (workingNode as any).strokeWeight = strokeWidth;
      }
      
      // Convert stroke to outline, preserving parent hierarchy
      const outlined = figma.flatten([workingNode as any], originalParent);
      if (!outlined) {
        throw new Error(`Failed to convert stroke to outline for node ${nodeId}`);
      }
      
      // Restore original position when preserving original (replaceOriginal: false)
      if (!replaceOriginal) {
        outlined.x = originalX;
        outlined.y = originalY;
      }
      const name = Array.isArray(params.name) ? params.name[i] : params.name;
      outlined.name = name || `${originalName} Outlined`;
      
      const message = replaceOriginal 
        ? `Stroke converted to outline - original node ${nodeId} was replaced/consumed` 
        : `Stroke converted to outline - original node ${nodeId} was preserved, new vector created`;
      results.push(formatNodeResponse(outlined, message));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

async function convertShape(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      // Check if it's a shape that can be converted
      if (!['RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR'].includes(node.type)) {
        throw new Error(`Node ${nodeId} is not a convertible shape`);
      }
      
      const replaceOriginal = Array.isArray(params.replaceOriginal) ? params.replaceOriginal[i] : (params.replaceOriginal ?? true);
      
      // Store original properties before potentially consuming the node
      const originalName = node.name;
      const originalParent = node.parent;
      const originalX = node.x;
      const originalY = node.y;
      const workingNode = replaceOriginal ? node : node.clone();
      
      // Flatten to convert to vector, preserving parent hierarchy
      const vector = figma.flatten([workingNode as any], originalParent);
      if (!vector) {
        throw new Error(`Failed to flatten node ${nodeId} to vector`);
      }
      
      // Restore original position when preserving original (replaceOriginal: false)
      if (!replaceOriginal) {
        vector.x = originalX;
        vector.y = originalY;
      }
      const name = Array.isArray(params.name) ? params.name[i] : (params.name || `${originalName} Vector`);
      vector.name = name;
      
      const message = replaceOriginal 
        ? `Shape converted to vector - original node ${nodeId} was replaced/consumed` 
        : `Shape converted to vector - original node ${nodeId} was preserved, new vector created`;
      results.push(formatNodeResponse(vector, message));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

async function convertText(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'TEXT') {
        throw new Error(`Node ${nodeId} is not a text node`);
      }
      
      const replaceOriginal = Array.isArray(params.replaceOriginal) ? params.replaceOriginal[i] : (params.replaceOriginal ?? true);
      
      // Store original properties before potentially consuming the node
      const originalName = node.name;
      const originalParent = node.parent;
      const originalX = node.x;
      const originalY = node.y;
      const originalWidth = node.width;
      const originalHeight = node.height;
      const originalRotation = node.rotation;
      let workingNode = replaceOriginal ? node : node.clone();
      
      // Flatten the text to convert to vector, preserving parent hierarchy
      const vector = figma.flatten([workingNode as any], originalParent);
      if (!vector) {
        throw new Error(`Failed to convert text to vector for node ${nodeId}`);
      }
      
      // Handle text-to-vector coordinate system conversion
      if (!replaceOriginal) {
        // When preserving original, we want the vector to appear in the same visual position
        // Text nodes use baseline positioning, vectors use bounding box positioning
        // The flatten operation gives us the "natural" vector position
        // We need to check if this matches the visual appearance or needs adjustment
        
        // For now, let's trust the natural flatten positioning and NOT override it
        // This should maintain visual alignment between text and vector
        // If positioning issues persist, we may need font metrics calculations
      }
      const name = Array.isArray(params.name) ? params.name[i] : params.name;
      vector.name = name || `${originalName} Vector`;
      
      const message = replaceOriginal 
        ? `Text converted to vector - original node ${nodeId} was replaced/consumed` 
        : `Text converted to vector - original node ${nodeId} was preserved, new vector created`;
      results.push(formatNodeResponse(vector, message));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}



async function extractElement(params: any): Promise<any> {
  BaseOperation.validateParams(params, ["nodeId"]);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    try {
      const sourceNode = findNodeById(nodeId);
      if (!sourceNode) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (!("vectorNetwork" in sourceNode)) {
        throw new Error(`Node ${nodeId} is not a vector node`);
      }
      
      const sourceVector = sourceNode as VectorNode;
      const removeFromSource = Array.isArray(params.removeFromSource) ? params.removeFromSource[i] : (params.removeFromSource ?? true);
      
      const pathIndex = Array.isArray(params.pathIndex) ? params.pathIndex[i] : params.pathIndex;
      const regionIndex = Array.isArray(params.regionIndex) ? params.regionIndex[i] : params.regionIndex;
      
      // Convert source to sparse format for easier manipulation
      const sourceSparse = await figmaToSparse(sourceVector.vectorNetwork);
      
      // Determine what to extract based on provided parameters
      if (pathIndex !== undefined && regionIndex !== undefined) {
        throw new Error('Cannot specify both pathIndex and regionIndex. Choose one or neither (to extract all).');
      }
      
      if (pathIndex === undefined && regionIndex === undefined) {
        // Extract ALL elements (explode)
        const allResults = [];
        let extractedCount = 0;
        
        // Extract all regions
        if (sourceSparse.regions && sourceSparse.regions.length > 0) {
          for (let ri = 0; ri < sourceSparse.regions.length; ri++) {
            const result = extractRegionFromSparse(sourceSparse, ri, false);
            const extractedVector = figma.createVector();
            const extractedName = Array.isArray(params.name) ? 
              (params.name[i] || `Region ${ri}`) : 
              (params.name ? `${params.name} Region ${ri}` : `Region ${ri}`);
            extractedVector.name = extractedName;
            extractedVector.x = sourceVector.x + result.positionOffset.x;
            extractedVector.y = sourceVector.y + result.positionOffset.y;
            extractedVector.vectorNetwork = sparseToFigma(result.extracted);
            
            if (sourceVector.parent) {
              (sourceVector.parent as any).appendChild(extractedVector);
            }
            
            allResults.push({
              extractedVector: formatNodeResponse(extractedVector, `Region ${ri} extracted`),
              elementType: 'region',
              elementIndex: ri
            });
            extractedCount++;
          }
        }
        
        // Extract all paths
        if (sourceSparse.paths && sourceSparse.paths.length > 0) {
          for (let pi = 0; pi < sourceSparse.paths.length; pi++) {
            const result = extractPathFromSparse(sourceSparse, pi, false);
            const extractedVector = figma.createVector();
            const extractedName = Array.isArray(params.name) ? 
              (params.name[i] || `Path ${pi}`) : 
              (params.name ? `${params.name} Path ${pi}` : `Path ${pi}`);
            extractedVector.name = extractedName;
            extractedVector.x = sourceVector.x + result.positionOffset.x;
            extractedVector.y = sourceVector.y + result.positionOffset.y;
            extractedVector.vectorNetwork = sparseToFigma(result.extracted);
            
            if (sourceVector.parent) {
              (sourceVector.parent as any).appendChild(extractedVector);
            }
            
            allResults.push({
              extractedVector: formatNodeResponse(extractedVector, `Path ${pi} extracted`),
              elementType: 'path',
              elementIndex: pi
            });
            extractedCount++;
          }
        }
        
        if (extractedCount === 0) {
          throw new Error('No regions or paths found to extract');
        }
        
        // Remove all elements from source if requested
        if (removeFromSource) {
          // Delete the source node entirely since all elements were extracted
          sourceVector.remove();
        }
        
        results.push({
          extractedVectors: allResults,
          sourceVector: removeFromSource ? 
            { id: nodeId, message: `Source vector deleted after extracting all ${extractedCount} elements (exploded)` } :
            formatNodeResponse(sourceVector, `All ${extractedCount} elements extracted (exploded)`),
          extractedCount,
          removedFromSource: removeFromSource
        });
        continue; // Skip single extraction flow
      }
      
      let extractedData: any;
      let remainingData: any = null;
      let positionOffset: any = null;
      let elementType: string;
      
      if (regionIndex !== undefined) {
        // Extract specific region
        if (!sourceSparse.regions || regionIndex >= sourceSparse.regions.length || regionIndex < 0) {
          throw new Error(`Invalid regionIndex ${regionIndex}. Source has ${sourceSparse.regions?.length || 0} regions`);
        }
        
        const result = extractRegionFromSparse(sourceSparse, regionIndex, removeFromSource);
        extractedData = result.extracted;
        remainingData = result.remaining;
        positionOffset = result.positionOffset;
        elementType = 'region';
        
      } else {
        // Extract specific path
        if (!sourceSparse.paths || pathIndex >= sourceSparse.paths.length || pathIndex < 0) {
          throw new Error(`Invalid pathIndex ${pathIndex}. Source has ${sourceSparse.paths?.length || 0} paths`);
        }
        
        const result = extractPathFromSparse(sourceSparse, pathIndex, removeFromSource);
        extractedData = result.extracted;
        remainingData = result.remaining;
        positionOffset = result.positionOffset;
        elementType = 'path';
      }
      
      // Create new vector with extracted element
      const extractedVector = figma.createVector();
      const extractedName = Array.isArray(params.name) ? params.name[i] : (params.name || `Extracted ${elementType}`);
      extractedVector.name = extractedName;
      
      // Position the extracted vector to maintain visual position
      extractedVector.x = sourceVector.x + positionOffset.x;
      extractedVector.y = sourceVector.y + positionOffset.y;
      
      // Set the vector network data
      extractedVector.vectorNetwork = sparseToFigma(extractedData);
      
      // Add to same parent as source
      if (sourceVector.parent) {
        (sourceVector.parent as any).appendChild(extractedVector);
      }
      
      const message = removeFromSource 
        ? `${elementType} extracted and removed from source vector`
        : `${elementType} extracted while preserving source vector`;
        
      // Update source vector if removing element
      if (removeFromSource && remainingData) {
        sourceVector.vectorNetwork = sparseToFigma(remainingData);
      }
        
      results.push({
        extractedVector: formatNodeResponse(extractedVector, message),
        sourceVector: formatNodeResponse(sourceVector, `Source vector ${removeFromSource ? "modified" : "unchanged"}`),
        elementType,
        elementIndex: elementType === "region" ? params.regionIndex : params.pathIndex,
        removedFromSource: removeFromSource
      });
      
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}
