import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';

/**
 * Handle VECTOR_OPERATION - perform operations on vector paths
 */
export async function VECTOR_OPERATION(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('vectorOperation', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['flatten', 'outline_stroke', 'create_vector', 'get_vector_paths']
    );
    
    switch (operation) {
      case 'flatten':
        return await flattenVector(params);
        
      case 'outline_stroke':
        return await outlineStroke(params);
        
      case 'create_vector':
        return await createVector(params);
        
      case 'get_vector_paths':
        return await getVectorPaths(params);
        
      default:
        throw new Error(`Unknown vector operation: ${operation}`);
    }
  });
}

async function flattenVector(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node with ID ${params.nodeId} not found`);
  }
  
  // Check if node can be flattened
  if (!('vectorPaths' in node) && !('fills' in node)) {
    throw new Error(`Node ${params.nodeId} cannot be flattened`);
  }
  
  const preserveOriginal = params.preserveOriginal === true;
  const workingNode = preserveOriginal ? node.clone() : node;
  
  // Flatten the vector
  const flattened = figma.flatten([workingNode as VectorNode], figma.currentPage);
  flattened.name = params.name || `${node.name} Flattened`;
  
  selectAndFocus(flattened);
  
  return formatNodeResponse(flattened, 'Vector flattened successfully');
}

async function outlineStroke(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node with ID ${params.nodeId} not found`);
  }
  
  // Check if node has strokes
  if (!('strokes' in node) || !node.strokes || node.strokes.length === 0) {
    throw new Error(`Node ${params.nodeId} has no strokes to outline`);
  }
  
  const preserveOriginal = params.preserveOriginal === true;
  const workingNode = preserveOriginal ? node.clone() : node;
  
  // Set stroke width if provided
  if (params.strokeWidth !== undefined) {
    (workingNode as any).strokeWeight = params.strokeWidth;
  }
  
  // Flatten to convert stroke to fill
  const outlined = figma.flatten([workingNode as VectorNode], figma.currentPage);
  outlined.name = params.name || `${node.name} Outlined`;
  
  selectAndFocus(outlined);
  
  return formatNodeResponse(outlined, 'Stroke outlined successfully');
}

async function createVector(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['vectorPaths']);
  
  if (!params.vectorPaths || !Array.isArray(params.vectorPaths)) {
    throw new Error('vectorPaths must be an array of path objects');
  }
  
  // Create a new vector node
  const vectorNode = figma.createVector();
  vectorNode.name = params.name || 'Custom Vector';
  
  // Set position if provided
  if (params.x !== undefined) vectorNode.x = params.x;
  if (params.y !== undefined) vectorNode.y = params.y;
  
  // Set vector paths
  try {
    vectorNode.vectorPaths = params.vectorPaths.map((path: any) => ({
      windingRule: path.windingRule || 'NONZERO',
      data: path.data || ''
    }));
  } catch (error) {
    throw new Error(`Invalid vector path data: ${error.message}`);
  }
  
  // Add to current page
  figma.currentPage.appendChild(vectorNode);
  
  selectAndFocus(vectorNode);
  
  return formatNodeResponse(vectorNode, 'Vector created successfully');
}

async function getVectorPaths(params: any): Promise<any> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const node = findNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node with ID ${params.nodeId} not found`);
  }
  
  // Check if node is a vector node
  if (!('vectorPaths' in node)) {
    throw new Error(`Node ${params.nodeId} is not a vector node`);
  }
  
  const vectorNode = node as VectorNode;
  
  return {
    nodeId: vectorNode.id,
    name: vectorNode.name,
    vectorPaths: vectorNode.vectorPaths.map(path => ({
      windingRule: path.windingRule,
      data: path.data
    })),
    pathCount: vectorNode.vectorPaths.length,
    message: 'Vector paths retrieved successfully'
  };
}