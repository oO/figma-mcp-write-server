import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, validateNodeType } from '../utils/node-utils.js';

/**
 * Handle MANAGE_AUTO_LAYOUT operation with 7 operations: get, set_horizontal, set_vertical, set_grid, set_freeform, set_child, reorder_children
 */
export async function MANAGE_AUTO_LAYOUT(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageAutoLayout', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['get', 'set_horizontal', 'set_vertical', 'set_grid', 'set_freeform', 'set_child', 'reorder_children']
    );

    // Validate nodeId for container operations, containerId for child operations
    if (['get', 'set_horizontal', 'set_vertical', 'set_grid', 'set_freeform'].includes(operation)) {
      const nodeId = params.nodeId;
      if (!nodeId) {
        throw new Error('Parameter "nodeId" is required for container operations');
      }
    } else if (['set_child', 'reorder_children'].includes(operation)) {
      const containerId = params.containerId;
      if (!containerId) {
        throw new Error('Parameter "containerId" is required for child operations');
      }
    }

    // Handle bulk operations for container operations
    if (['get', 'set_horizontal', 'set_vertical', 'set_grid', 'set_freeform'].includes(operation)) {
      const nodeId = params.nodeId;
      const nodes = Array.isArray(nodeId) ? nodeId : [nodeId];
      const results = [];
      
      for (const id of nodes) {
        const node = findNodeById(id);
        if (!node) {
          throw new Error(`Node ${id} not found`);
        }
        validateNodeType(node, ['FRAME', 'COMPONENT', 'INSTANCE']);
        
        switch (operation) {
          case 'get':
            results.push(await getLayoutProperties(node as FrameNode));
            break;
          case 'set_horizontal':
            results.push(await setHorizontalLayout(node as FrameNode, params));
            break;
          case 'set_vertical':
            results.push(await setVerticalLayout(node as FrameNode, params));
            break;
          case 'set_grid':
            results.push(await setGridLayout(node as FrameNode, params));
            break;
          case 'set_freeform':
            results.push(await setFreeformLayout(node as FrameNode));
            break;
        }
      }
      
      return Array.isArray(params.nodeId) ? results : results[0];
    }
    
    // Handle child operations
    switch (operation) {
      case 'set_child':
        // If no containerId provided, handle children across different parents
        if (!params.containerId && params.nodeId) {
          return await handleBulkChildPropertiesAcrossParents(params);
        }
        // Single container, potentially multiple children
        const containerId = params.containerId;
        const container = findNodeById(containerId);
        if (!container) {
          throw new Error(`Container ${containerId} not found`);
        }
        validateNodeType(container, ['FRAME', 'COMPONENT', 'INSTANCE']);
        return await handleBulkChildProperties(container as FrameNode, params);
      case 'reorder_children':
        const containerIdReorder = params.containerId;
        const containerReorder = findNodeById(containerIdReorder);
        if (!containerReorder) {
          throw new Error(`Container ${containerIdReorder} not found`);
        }
        validateNodeType(containerReorder, ['FRAME', 'COMPONENT', 'INSTANCE']);
        return await reorderChildren(containerReorder as FrameNode, params);
      default:
        throw new Error(`Unknown auto layout operation: ${operation}`);
    }
  });
}

async function getLayoutProperties(frame: FrameNode): Promise<any> {
  const isAutoLayout = frame.layoutMode !== 'NONE';
  
  const result = {
    operation: 'get',
    nodeId: frame.id,
    name: frame.name,
    layoutMode: frame.layoutMode.toLowerCase(),
    properties: {} as any,
    children: frame.children.map((child, index) => ({
      index,
      id: child.id,
      name: child.name,
      type: child.type
    }))
  };
  
  if (isAutoLayout) {
    result.properties = {
      spacing: frame.itemSpacing,
      paddingTop: frame.paddingTop,
      paddingRight: frame.paddingRight,
      paddingBottom: frame.paddingBottom,
      paddingLeft: frame.paddingLeft,
      primaryAxisAlignItems: frame.primaryAxisAlignItems,
      counterAxisAlignItems: frame.counterAxisAlignItems,
      primaryAxisSizingMode: frame.primaryAxisSizingMode,
      counterAxisSizingMode: frame.counterAxisSizingMode,
      strokesIncludedInLayout: frame.strokesIncludedInLayout,
      itemReverseZIndex: frame.itemReverseZIndex
    };
    
    if (frame.layoutMode === 'HORIZONTAL' || frame.layoutMode === 'VERTICAL') {
      result.properties.layoutWrap = frame.layoutWrap;
      if (frame.layoutWrap === 'WRAP') {
        result.properties.counterAxisSpacing = frame.counterAxisSpacing;
      }
    }
    
    if (frame.layoutMode === 'GRID') {
      result.properties.gridRowCount = (frame as any).gridRowCount;
      result.properties.gridColumnCount = (frame as any).gridColumnCount;
      result.properties.gridRowGap = (frame as any).gridRowGap;
      result.properties.gridColumnGap = (frame as any).gridColumnGap;
    }
  }
  
  return result;
}

async function setHorizontalLayout(frame: FrameNode, params: any): Promise<any> {
  frame.layoutMode = 'HORIZONTAL';
  
  // Core properties
  if (params.horizontalSpacing !== undefined) {
    frame.itemSpacing = params.horizontalSpacing === 'AUTO' ? 'AUTO' as any : params.horizontalSpacing;
  }
  
  setPaddingProperties(frame, params);
  
  // Alignment properties
  if (params.horizontalAlignment !== undefined) {
    frame.primaryAxisAlignItems = params.horizontalAlignment.toUpperCase() as any;
  }
  if (params.verticalAlignment !== undefined) {
    frame.counterAxisAlignItems = params.verticalAlignment.toUpperCase() as any;
  }
  
  // Sizing mode properties
  if (params.fixedWidth !== undefined) {
    frame.primaryAxisSizingMode = params.fixedWidth ? 'FIXED' : 'AUTO';
  }
  if (params.fixedHeight !== undefined) {
    frame.counterAxisSizingMode = params.fixedHeight ? 'FIXED' : 'AUTO';
  }
  
  // Wrapping properties
  if (params.wrapLayout !== undefined) {
    frame.layoutWrap = params.wrapLayout ? 'WRAP' : 'NO_WRAP';
  }
  if (params.verticalSpacing !== undefined && frame.layoutWrap === 'WRAP') {
    frame.counterAxisSpacing = params.verticalSpacing === 'AUTO' ? 'AUTO' as any : params.verticalSpacing;
  }
  
  setAdvancedProperties(frame, params);
  
  return {
    operation: 'set_horizontal',
    nodeId: frame.id,
    name: frame.name,
    layoutMode: 'horizontal',
    properties: getLayoutSummary(frame),
    message: `Set horizontal layout on frame: ${frame.name}`
  };
}

async function setVerticalLayout(frame: FrameNode, params: any): Promise<any> {
  frame.layoutMode = 'VERTICAL';
  
  // Core properties
  if (params.verticalSpacing !== undefined) {
    frame.itemSpacing = params.verticalSpacing === 'AUTO' ? 'AUTO' as any : params.verticalSpacing;
  }
  
  setPaddingProperties(frame, params);
  
  // Alignment properties
  if (params.verticalAlignment !== undefined) {
    frame.primaryAxisAlignItems = params.verticalAlignment.toUpperCase() as any;
  }
  if (params.horizontalAlignment !== undefined) {
    frame.counterAxisAlignItems = params.horizontalAlignment.toUpperCase() as any;
  }
  
  // Sizing mode properties
  if (params.fixedHeight !== undefined) {
    frame.primaryAxisSizingMode = params.fixedHeight ? 'FIXED' : 'AUTO';
  }
  if (params.fixedWidth !== undefined) {
    frame.counterAxisSizingMode = params.fixedWidth ? 'FIXED' : 'AUTO';
  }
  
  // Wrapping properties
  if (params.wrapLayout !== undefined) {
    frame.layoutWrap = params.wrapLayout ? 'WRAP' : 'NO_WRAP';
  }
  if (params.horizontalSpacing !== undefined && frame.layoutWrap === 'WRAP') {
    frame.counterAxisSpacing = params.horizontalSpacing === 'AUTO' ? 'AUTO' as any : params.horizontalSpacing;
  }
  
  setAdvancedProperties(frame, params);
  
  return {
    operation: 'set_vertical',
    nodeId: frame.id,
    name: frame.name,
    layoutMode: 'vertical',
    properties: getLayoutSummary(frame),
    message: `Set vertical layout on frame: ${frame.name}`
  };
}

async function setGridLayout(frame: FrameNode, params: any): Promise<any> {
  frame.layoutMode = 'GRID';
  
  // Grid container properties
  if (params.rows !== undefined) {
    (frame as any).gridRowCount = params.rows;
  }
  if (params.columns !== undefined) {
    (frame as any).gridColumnCount = params.columns;
  }
  if (params.rowSpacing !== undefined) {
    (frame as any).gridRowGap = params.rowSpacing === 'AUTO' ? 'AUTO' as any : params.rowSpacing;
  }
  if (params.columnSpacing !== undefined) {
    (frame as any).gridColumnGap = params.columnSpacing === 'AUTO' ? 'AUTO' as any : params.columnSpacing;
  }
  
  setPaddingProperties(frame, params);
  
  // Grid sizing properties
  if (params.fixedWidth !== undefined) {
    frame.primaryAxisSizingMode = params.fixedWidth ? 'FIXED' : 'AUTO';
  }
  if (params.fixedHeight !== undefined) {
    frame.counterAxisSizingMode = params.fixedHeight ? 'FIXED' : 'AUTO';
  }
  
  setAdvancedProperties(frame, params);
  
  return {
    operation: 'set_grid',
    nodeId: frame.id,
    name: frame.name,
    layoutMode: 'grid',
    properties: getLayoutSummary(frame),
    message: `Set grid layout on frame: ${frame.name}`
  };
}

async function setFreeformLayout(frame: FrameNode): Promise<any> {
  frame.layoutMode = 'NONE';
  
  return {
    operation: 'set_freeform',
    nodeId: frame.id,
    name: frame.name,
    layoutMode: 'none',
    message: `Set freeform layout on frame: ${frame.name}`
  };
}

async function handleBulkChildPropertiesAcrossParents(params: any): Promise<any> {
  // Handle bulk child operations across different parents
  const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : [params.nodeId];
  const results = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    const childId = nodeIds[i];
    const child = findNodeById(childId);
    if (!child) {
      throw new Error(`Child node ${childId} not found`);
    }
    
    // Find the parent container
    const parent = child.parent;
    if (!parent || !['FRAME', 'COMPONENT', 'INSTANCE'].includes(parent.type)) {
      throw new Error(`Child node ${childId} (${child.name}) does not have a valid auto-layout parent`);
    }
    
    const container = parent as FrameNode;
    if (container.layoutMode === 'NONE') {
      throw new Error(`Parent ${container.id} (${container.name}) does not have auto layout enabled`);
    }
    
    // Find child index within parent
    const childIndex = container.children.findIndex(c => c.id === childId);
    if (childIndex === -1) {
      throw new Error(`Child node ${childId} not found in parent ${container.id}`);
    }
    
    // Create individual params for this child
    const individualParams = {
      ...params,
      containerId: container.id,
      nodeId: childId,
      childIndex,
      // Extract individual values for bulk parameters
      horizontalSizing: Array.isArray(params.horizontalSizing) ? params.horizontalSizing[i] : params.horizontalSizing,
      verticalSizing: Array.isArray(params.verticalSizing) ? params.verticalSizing[i] : params.verticalSizing,
      layoutGrow: Array.isArray(params.layoutGrow) ? params.layoutGrow[i] : params.layoutGrow,
      layoutAlign: Array.isArray(params.layoutAlign) ? params.layoutAlign[i] : params.layoutAlign,
      rowSpan: Array.isArray(params.rowSpan) ? params.rowSpan[i] : params.rowSpan,
      columnSpan: Array.isArray(params.columnSpan) ? params.columnSpan[i] : params.columnSpan,
      rowAnchor: Array.isArray(params.rowAnchor) ? params.rowAnchor[i] : params.rowAnchor,
      columnAnchor: Array.isArray(params.columnAnchor) ? params.columnAnchor[i] : params.columnAnchor,
      horizontalAlign: Array.isArray(params.horizontalAlign) ? params.horizontalAlign[i] : params.horizontalAlign,
      verticalAlign: Array.isArray(params.verticalAlign) ? params.verticalAlign[i] : params.verticalAlign
    };
    
    results.push(await setChildProperties(container, individualParams));
  }
  
  return nodeIds.length === 1 ? results[0] : results;
}

async function handleBulkChildProperties(container: FrameNode, params: any): Promise<any> {
  // Handle both single and bulk child operations
  const nodeIds = Array.isArray(params.nodeId) ? params.nodeId : (params.nodeId ? [params.nodeId] : []);
  const childIndices = Array.isArray(params.childIndex) ? params.childIndex : (params.childIndex !== undefined ? [params.childIndex] : []);
  
  // If nodeIds are provided, process each one
  if (nodeIds.length > 0) {
    const results = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const individualParams = {
        ...params,
        nodeId: nodeIds[i],
        childIndex: undefined, // Let auto-lookup handle this
        // Extract individual values for bulk parameters
        horizontalSizing: Array.isArray(params.horizontalSizing) ? params.horizontalSizing[i] : params.horizontalSizing,
        verticalSizing: Array.isArray(params.verticalSizing) ? params.verticalSizing[i] : params.verticalSizing,
        layoutGrow: Array.isArray(params.layoutGrow) ? params.layoutGrow[i] : params.layoutGrow,
        layoutAlign: Array.isArray(params.layoutAlign) ? params.layoutAlign[i] : params.layoutAlign,
        rowSpan: Array.isArray(params.rowSpan) ? params.rowSpan[i] : params.rowSpan,
        columnSpan: Array.isArray(params.columnSpan) ? params.columnSpan[i] : params.columnSpan,
        rowAnchor: Array.isArray(params.rowAnchor) ? params.rowAnchor[i] : params.rowAnchor,
        columnAnchor: Array.isArray(params.columnAnchor) ? params.columnAnchor[i] : params.columnAnchor,
        horizontalAlign: Array.isArray(params.horizontalAlign) ? params.horizontalAlign[i] : params.horizontalAlign,
        verticalAlign: Array.isArray(params.verticalAlign) ? params.verticalAlign[i] : params.verticalAlign
      };
      results.push(await setChildProperties(container, individualParams));
    }
    return nodeIds.length === 1 ? results[0] : results;
  }
  
  // If childIndices are provided, process each one
  if (childIndices.length > 0) {
    const results = [];
    for (let i = 0; i < childIndices.length; i++) {
      const individualParams = {
        ...params,
        childIndex: childIndices[i],
        nodeId: undefined,
        // Extract individual values for bulk parameters
        horizontalSizing: Array.isArray(params.horizontalSizing) ? params.horizontalSizing[i] : params.horizontalSizing,
        verticalSizing: Array.isArray(params.verticalSizing) ? params.verticalSizing[i] : params.verticalSizing,
        layoutGrow: Array.isArray(params.layoutGrow) ? params.layoutGrow[i] : params.layoutGrow,
        layoutAlign: Array.isArray(params.layoutAlign) ? params.layoutAlign[i] : params.layoutAlign,
        rowSpan: Array.isArray(params.rowSpan) ? params.rowSpan[i] : params.rowSpan,
        columnSpan: Array.isArray(params.columnSpan) ? params.columnSpan[i] : params.columnSpan,
        rowAnchor: Array.isArray(params.rowAnchor) ? params.rowAnchor[i] : params.rowAnchor,
        columnAnchor: Array.isArray(params.columnAnchor) ? params.columnAnchor[i] : params.columnAnchor,
        horizontalAlign: Array.isArray(params.horizontalAlign) ? params.horizontalAlign[i] : params.horizontalAlign,
        verticalAlign: Array.isArray(params.verticalAlign) ? params.verticalAlign[i] : params.verticalAlign
      };
      results.push(await setChildProperties(container, individualParams));
    }
    return childIndices.length === 1 ? results[0] : results;
  }
  
  // Fallback to single operation
  return await setChildProperties(container, params);
}

async function setChildProperties(container: FrameNode, params: any): Promise<any> {
  let childIndex = params.childIndex;
  
  // Auto-determine childIndex if nodeId provided
  if (params.nodeId && childIndex === undefined) {
    childIndex = container.children.findIndex(child => child.id === params.nodeId);
    if (childIndex === -1) {
      throw new Error(`Child node ${params.nodeId} not found in container ${container.id} (${container.name})`);
    }
  }
  
  if (childIndex === undefined) {
    throw new Error('Either "childIndex" or "nodeId" is required for set_child operation');
  }
  
  // Validate childIndex bounds
  if (childIndex < 0 || childIndex >= container.children.length) {
    throw new Error(`Child index ${childIndex} is out of bounds (0-${container.children.length - 1})`);
  }
  
  const child = container.children[childIndex];
  
  // Child layout properties
  if (params.layoutGrow !== undefined) {
    (child as any).layoutGrow = params.layoutGrow;
  }
  if (params.layoutAlign !== undefined) {
    (child as any).layoutAlign = params.layoutAlign.toUpperCase();
  }
  if (params.horizontalSizing !== undefined) {
    (child as any).layoutSizingHorizontal = params.horizontalSizing.toUpperCase();
  }
  if (params.verticalSizing !== undefined) {
    (child as any).layoutSizingVertical = params.verticalSizing.toUpperCase();
  }
  
  // Grid child properties (when parent is grid layout)
  if (container.layoutMode === 'GRID') {
    if (params.rowSpan !== undefined) {
      (child as any).gridRowSpan = params.rowSpan;
    }
    if (params.columnSpan !== undefined) {
      (child as any).gridColumnSpan = params.columnSpan;
    }
    if (params.rowAnchor !== undefined) {
      (child as any).gridRowAnchorIndex = params.rowAnchor;
    }
    if (params.columnAnchor !== undefined) {
      (child as any).gridColumnAnchorIndex = params.columnAnchor;
    }
    if (params.horizontalAlign !== undefined) {
      (child as any).gridChildHorizontalAlign = params.horizontalAlign.toUpperCase();
    }
    if (params.verticalAlign !== undefined) {
      (child as any).gridChildVerticalAlign = params.verticalAlign.toUpperCase();
    }
  }
  
  return {
    operation: 'set_child',
    containerId: container.id,
    containerName: container.name,
    childIndex,
    childId: child.id,
    childName: child.name,
    targetedBy: params.nodeId ? 'nodeId' : 'childIndex',
    message: `Updated child properties for ${child.name} (${child.id}) at index ${childIndex} in container ${container.name}`
  };
}

async function reorderChildren(container: FrameNode, params: any): Promise<any> {
  if (params.fromIndex === undefined || params.toIndex === undefined) {
    throw new Error('Parameters "fromIndex" and "toIndex" are required for reorder_children operation');
  }
  
  const fromIndex = params.fromIndex;
  const toIndex = params.toIndex;
  
  if (fromIndex < 0 || fromIndex >= container.children.length) {
    throw new Error(`fromIndex ${fromIndex} is out of bounds (0-${container.children.length - 1})`);
  }
  if (toIndex < 0 || toIndex >= container.children.length) {
    throw new Error(`toIndex ${toIndex} is out of bounds (0-${container.children.length - 1})`);
  }
  
  const child = container.children[fromIndex];
  
  // Remove child from current position
  container.insertChild(toIndex, child);
  
  return {
    operation: 'reorder_children',
    containerId: container.id,
    containerName: container.name,
    fromIndex,
    toIndex,
    childId: child.id,
    childName: child.name,
    message: `Moved ${child.name} from index ${fromIndex} to ${toIndex} in container ${container.name}`
  };
}

// Helper functions
function setPaddingProperties(frame: FrameNode, params: any): void {
  if (params.paddingTop !== undefined) {
    frame.paddingTop = params.paddingTop;
  }
  if (params.paddingRight !== undefined) {
    frame.paddingRight = params.paddingRight;
  }
  if (params.paddingBottom !== undefined) {
    frame.paddingBottom = params.paddingBottom;
  }
  if (params.paddingLeft !== undefined) {
    frame.paddingLeft = params.paddingLeft;
  }
}

function setAdvancedProperties(frame: FrameNode, params: any): void {
  if (params.strokesIncludedInLayout !== undefined) {
    frame.strokesIncludedInLayout = params.strokesIncludedInLayout;
  }
  if (params.lastOnTop !== undefined) {
    frame.itemReverseZIndex = params.lastOnTop;
  }
}

function getLayoutSummary(frame: FrameNode): any {
  const summary: any = {
    spacing: frame.itemSpacing,
    paddingTop: frame.paddingTop,
    paddingRight: frame.paddingRight,
    paddingBottom: frame.paddingBottom,
    paddingLeft: frame.paddingLeft,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    strokesIncludedInLayout: frame.strokesIncludedInLayout,
    itemReverseZIndex: frame.itemReverseZIndex
  };
  
  if (frame.layoutMode === 'HORIZONTAL' || frame.layoutMode === 'VERTICAL') {
    summary.layoutWrap = frame.layoutWrap;
    if (frame.layoutWrap === 'WRAP') {
      summary.counterAxisSpacing = frame.counterAxisSpacing;
    }
  }
  
  if (frame.layoutMode === 'GRID') {
    summary.gridRowCount = (frame as any).gridRowCount;
    summary.gridColumnCount = (frame as any).gridColumnCount;
    summary.gridRowGap = (frame as any).gridRowGap;
    summary.gridColumnGap = (frame as any).gridColumnGap;
  }
  
  return summary;
}