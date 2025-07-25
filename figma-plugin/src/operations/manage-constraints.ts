import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, selectAndFocus } from '../utils/node-utils.js';
import { unwrapArrayParam } from '../utils/parameter-utils.js';

export async function MANAGE_CONSTRAINTS(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageConstraints', params, async () => {
    BaseOperation.validateParams(params, ['operation', 'nodeId']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['get', 'set', 'reset']
    );

    const nodeId = unwrapArrayParam(params.nodeId);
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    switch (operation) {
      case 'get':
        return await getConstraints(node);
      case 'set':
        return await setConstraints(node, params);
      case 'reset':
        return await resetConstraints(node);
      default:
        throw new Error(`Unknown constraints operation: ${operation}`);
    }
  });
}

async function setConstraints(node: SceneNode, params: any): Promise<any> {
  if (!('constraints' in node)) {
    throw new Error(`Node type ${node.type} does not support constraints`);
  }
  
  const constraints: any = Object.assign({}, (node as any).constraints);
  
  const horizontal = unwrapArrayParam(params.horizontalConstraint);
  const vertical = unwrapArrayParam(params.verticalConstraint);
  
  if (horizontal) {
    const validHorizontal = ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'];
    if (!validHorizontal.includes(horizontal)) {
      throw new Error(`Invalid horizontal constraint: ${horizontal}. Valid values: ${validHorizontal.join(', ')}`);
    }
    constraints.horizontal = horizontal;
  }
  
  if (vertical) {
    const validVertical = ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'];
    if (!validVertical.includes(vertical)) {
      throw new Error(`Invalid vertical constraint: ${vertical}. Valid values: ${validVertical.join(', ')}`);
    }
    constraints.vertical = vertical;
  }
  
  (node as any).constraints = constraints;
  selectAndFocus([node]);
  
  return {
    operation: 'set',
    nodeId: node.id,
    name: node.name,
    horizontalConstraint: constraints.horizontal,
    verticalConstraint: constraints.vertical,
    message: `Set constraints for node: ${node.name}`
  };
}

async function getConstraints(node: SceneNode): Promise<any> {
  const parent = node.parent;
  
  return {
    operation: 'get',
    nodeId: node.id,
    name: node.name,
    nodeType: node.type,
    supportsConstraints: 'constraints' in node,
    x: 'x' in node ? (node as any).x : 0,
    y: 'y' in node ? (node as any).y : 0,
    width: 'width' in node ? (node as any).width : 0,
    height: 'height' in node ? (node as any).height : 0,
    parentName: parent?.name || 'Unknown',
    parentType: parent?.type || 'Unknown',
    parentWidth: parent && 'width' in parent ? (parent as any).width : null,
    parentHeight: parent && 'height' in parent ? (parent as any).height : null,
    horizontalConstraint: 'constraints' in node ? (node as any).constraints.horizontal : null,
    verticalConstraint: 'constraints' in node ? (node as any).constraints.vertical : null
  };
}

async function resetConstraints(node: SceneNode): Promise<any> {
  if (!('constraints' in node)) {
    throw new Error(`Node type ${node.type} does not support constraints`);
  }
  
  (node as any).constraints = {
    horizontal: 'MIN',
    vertical: 'MIN'
  };
  
  selectAndFocus([node]);
  
  return {
    operation: 'reset',
    nodeId: node.id,
    name: node.name,
    horizontalConstraint: 'MIN',
    verticalConstraint: 'MIN',
    message: `Reset constraints for node: ${node.name}`
  };
}


