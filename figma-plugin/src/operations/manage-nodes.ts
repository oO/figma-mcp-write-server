import { NodeParams } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { hexToRgb, createSolidPaint, parseHexColor } from '../utils/color-utils.js';
import { findNodeById, formatNodeResponse, selectAndFocus, moveNodeToPosition, resizeNode } from '../utils/node-utils.js';

export async function handleManageNodes(payload: any): Promise<any> {
  const operation = BaseOperation.validateStringParam(
    payload.operation,
    'operation',
    ['create', 'get', 'update', 'delete', 'duplicate']
  );

  switch (operation) {
    case 'create':
      return BaseOperation.executeOperation('createNode', payload, async () => {
        BaseOperation.validateParams(payload, ['nodeType']);
        
        const nodeType = BaseOperation.validateStringParam(
          payload.nodeType, 
          'nodeType', 
          ['rectangle', 'ellipse', 'frame', 'star', 'polygon', 'line']
        );

        switch (nodeType) {
          case 'rectangle':
            return await createRectangle(payload);
          case 'ellipse':
            return await createEllipse(payload);
          case 'frame':
            return await createFrame(payload);
          case 'star':
            return await createStar(payload);
          case 'polygon':
            return await createPolygon(payload);
          case 'line':
            return await createLine(payload);
          default:
            throw new Error(`Unknown node type: ${nodeType}`);
        }
      });
    case 'get':
      return BaseOperation.executeOperation('getNode', payload, async () => {
        BaseOperation.validateParams(payload, ['nodeId']);
        
        const node = findNodeById(payload.nodeId);
        if (!node) {
          throw new Error(`Node with ID ${payload.nodeId} not found`);
        }

        return formatNodeResponse(node);
      });
    case 'update':
      return BaseOperation.executeOperation('updateNode', payload, async () => {
        BaseOperation.validateParams(payload, ['nodeId']);
        
        const node = findNodeById(payload.nodeId);
        if (!node) {
          throw new Error(`Node with ID ${payload.nodeId} not found`);
        }

        // Update properties
        if (payload.name !== undefined) {
          node.name = payload.name;
        }

        if (payload.x !== undefined || payload.y !== undefined) {
          // Get current position if only one coordinate is being updated
          const currentX = 'x' in node ? (node as any).x : 0;
          const currentY = 'y' in node ? (node as any).y : 0;
          
          moveNodeToPosition(
            node,
            payload.x !== undefined ? payload.x : currentX,
            payload.y !== undefined ? payload.y : currentY
          );
        }

        if (payload.width !== undefined || payload.height !== undefined) {
          // Get current dimensions if only one dimension is being updated
          const currentWidth = 'width' in node ? (node as any).width : 100;
          const currentHeight = 'height' in node ? (node as any).height : 100;
          
          resizeNode(
            node, 
            payload.width !== undefined ? payload.width : currentWidth,
            payload.height !== undefined ? payload.height : currentHeight
          );
        }

        // Update shape-specific properties
        if (node.type === 'STAR') {
          if (payload.pointCount !== undefined) {
            (node as StarNode).pointCount = Math.max(3, payload.pointCount);
          }
          if (payload.innerRadius !== undefined) {
            (node as StarNode).innerRadius = Math.max(0, Math.min(1, payload.innerRadius));
          }
        }
        
        if (node.type === 'POLYGON' && payload.pointCount !== undefined) {
          (node as PolygonNode).pointCount = Math.max(3, payload.pointCount);
        }

        // Apply visual properties
        await applyVisualProperties(node, payload);

        return formatNodeResponse(node);
      });
    case 'delete':
      return BaseOperation.executeOperation('deleteNode', payload, async () => {
        BaseOperation.validateParams(payload, ['nodeId']);
        
        const node = findNodeById(payload.nodeId);
        if (!node) {
          throw new Error(`Node with ID ${payload.nodeId} not found`);
        }

        const nodeInfo = formatNodeResponse(node);
        node.remove();
        
        return nodeInfo;
      });
    case 'duplicate':
      return BaseOperation.executeOperation('duplicateNode', payload, async () => {
        BaseOperation.validateParams(payload, ['nodeId']);
        
        const node = findNodeById(payload.nodeId);
        if (!node) {
          throw new Error(`Node with ID ${payload.nodeId} not found`);
        }

        const count = payload.count || 1;
        const offsetX = payload.offsetX || 10;
        const offsetY = payload.offsetY || 10;

        // Handle bulk duplication with progressive offsets
        if (count > 1) {
          const duplicates: any[] = [];
          let previousNode = node;
          
          for (let i = 0; i < count; i++) {
            const duplicate = node.clone();
            
            // Position with progressive offset - each duplicate is offset from the previous one
            if ('x' in duplicate && 'y' in duplicate && 'x' in previousNode && 'y' in previousNode) {
              duplicate.x = previousNode.x + offsetX;
              duplicate.y = previousNode.y + offsetY;
            }

            // Insert after the previous node (original or last duplicate)
            if (previousNode.parent) {
              const index = previousNode.parent.children.indexOf(previousNode);
              previousNode.parent.insertChild(index + 1, duplicate);
            }

            duplicates.push(formatNodeResponse(duplicate));
            previousNode = duplicate; // Next duplicate will be offset from this one
          }

          selectAndFocus(duplicates.map(d => findNodeById(d.id)).filter(Boolean));
          return duplicates;
        } else {
          // Single duplication (original behavior)
          const duplicate = node.clone();
          
          // Position the duplicate with offset
          if ('x' in duplicate && 'y' in duplicate) {
            duplicate.x = node.x + offsetX;
            duplicate.y = node.y + offsetY;
          }

          // Insert after the original node
          if (node.parent) {
            const index = node.parent.children.indexOf(node);
            node.parent.insertChild(index + 1, duplicate);
          }

          selectAndFocus([duplicate]);
          
          return formatNodeResponse(duplicate);
        }
      });
    default:
      throw new Error(`Unknown node operation: ${operation}`);
  }
}

async function createRectangle(payload: any): Promise<any> {
  const rect = figma.createRectangle();
  
  rect.name = payload.name || 'Rectangle';
  
  if (payload.x !== undefined || payload.y !== undefined) {
    moveNodeToPosition(rect, payload.x || 0, payload.y || 0);
  }
  
  if (payload.width !== undefined || payload.height !== undefined) {
    resizeNode(rect, payload.width || 100, payload.height || 100);
  }
  
  await applyVisualProperties(rect, payload);
  
  // Add to current page/frame
  figma.currentPage.appendChild(rect);
  selectAndFocus([rect]);
  
  return formatNodeResponse(rect);
}

async function createEllipse(payload: any): Promise<any> {
  const ellipse = figma.createEllipse();
  
  ellipse.name = payload.name || 'Ellipse';
  
  if (payload.x !== undefined || payload.y !== undefined) {
    moveNodeToPosition(ellipse, payload.x || 0, payload.y || 0);
  }
  
  if (payload.width !== undefined || payload.height !== undefined) {
    resizeNode(ellipse, payload.width || 100, payload.height || 100);
  }
  
  await applyVisualProperties(ellipse, payload);
  
  figma.currentPage.appendChild(ellipse);
  selectAndFocus([ellipse]);
  
  return formatNodeResponse(ellipse);
}

async function createFrame(payload: any): Promise<any> {
  const frame = figma.createFrame();
  
  frame.name = payload.name || 'Frame';
  
  if (payload.x !== undefined || payload.y !== undefined) {
    moveNodeToPosition(frame, payload.x || 0, payload.y || 0);
  }
  
  if (payload.width !== undefined || payload.height !== undefined) {
    resizeNode(frame, payload.width || 200, payload.height || 200);
  }
  
  await applyVisualProperties(frame, payload);
  
  figma.currentPage.appendChild(frame);
  selectAndFocus([frame]);
  
  return formatNodeResponse(frame);
}

async function createStar(payload: any): Promise<any> {
  const star = figma.createStar();
  
  star.name = payload.name || 'Star';
  
  if (payload.pointCount !== undefined) {
    star.pointCount = Math.max(3, payload.pointCount);
  }
  
  if (payload.innerRadius !== undefined) {
    star.innerRadius = Math.max(0, Math.min(1, payload.innerRadius));
  }
  
  if (payload.x !== undefined || payload.y !== undefined) {
    moveNodeToPosition(star, payload.x || 0, payload.y || 0);
  }
  
  if (payload.width !== undefined || payload.height !== undefined) {
    resizeNode(star, payload.width || 100, payload.height || 100);
  }
  
  await applyVisualProperties(star, payload);
  
  figma.currentPage.appendChild(star);
  selectAndFocus([star]);
  
  return formatNodeResponse(star);
}

async function createPolygon(payload: any): Promise<any> {
  const polygon = figma.createPolygon();
  
  polygon.name = payload.name || 'Polygon';
  
  if (payload.pointCount !== undefined) {
    polygon.pointCount = Math.max(3, payload.pointCount);
  }
  
  if (payload.x !== undefined || payload.y !== undefined) {
    moveNodeToPosition(polygon, payload.x || 0, payload.y || 0);
  }
  
  if (payload.width !== undefined || payload.height !== undefined) {
    resizeNode(polygon, payload.width || 100, payload.height || 100);
  }
  
  await applyVisualProperties(polygon, payload);
  
  figma.currentPage.appendChild(polygon);
  selectAndFocus([polygon]);
  
  return formatNodeResponse(polygon);
}

async function createLine(payload: any): Promise<any> {
  // Determine if we need separate start/end caps (requires ConnectorNode)
  const needsSeparateCaps = (payload.startCap && payload.endCap && payload.startCap !== payload.endCap) ||
                           (payload.startCap && !payload.endCap && payload.startCap !== 'NONE') ||
                           (!payload.startCap && payload.endCap && payload.endCap !== 'NONE');
  
  if (needsSeparateCaps) {
    return await createConnectorLine(payload);
  } else {
    return await createSimpleLine(payload);
  }
}

async function createSimpleLine(payload: any): Promise<any> {
  const line = figma.createLine();
  
  line.name = payload.name || 'Line';
  
  let startX, startY, length, rotation;
  
  // Determine which parameter style is being used
  if (payload.startX !== undefined || payload.endX !== undefined || 
      payload.startY !== undefined || payload.endY !== undefined) {
    // Start/End point style
    startX = payload.startX !== undefined ? payload.startX : (payload.x || 0);
    startY = payload.startY !== undefined ? payload.startY : (payload.y || 0);
    const endX = payload.endX !== undefined ? payload.endX : startX + 100; // Default 100px to the right
    const endY = payload.endY !== undefined ? payload.endY : startY;
    
    // Calculate length and rotation from start/end points
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    rotation = Math.atan2(deltaY, deltaX); // Rotation in radians
  } else {
    // Length/Rotation style (or fallback defaults)
    startX = payload.x || 0;
    startY = payload.y || 0;
    length = payload.length || 100; // Default 100px length
    rotation = payload.rotation !== undefined ? (payload.rotation * Math.PI / 180) : 0; // Convert degrees to radians
  }
  
  // Set position to start point
  moveNodeToPosition(line, startX, startY);
  
  // Set line length (width = length, height = 0 for lines)
  resizeNode(line, length, 0);
  
  // Apply rotation
  line.rotation = rotation;
  
  // Apply single stroke cap (prefer endCap, then startCap, then strokeCap)
  const strokeCap = payload.endCap || payload.startCap || payload.strokeCap || 'NONE';
  if (strokeCap !== 'NONE') {
    line.strokeCap = strokeCap;
  }
  
  await applyVisualProperties(line, payload);
  
  figma.currentPage.appendChild(line);
  selectAndFocus([line]);
  
  return formatNodeResponse(line);
}

async function createConnectorLine(payload: any): Promise<any> {
  // Create a connector for lines with separate start/end caps
  const connector = figma.createConnector();
  
  connector.name = payload.name || 'Line';
  
  let startX, startY, endX, endY;
  
  // Determine which parameter style is being used
  if (payload.startX !== undefined || payload.endX !== undefined || 
      payload.startY !== undefined || payload.endY !== undefined) {
    // Start/End point style
    startX = payload.startX !== undefined ? payload.startX : (payload.x || 0);
    startY = payload.startY !== undefined ? payload.startY : (payload.y || 0);
    endX = payload.endX !== undefined ? payload.endX : startX + 100;
    endY = payload.endY !== undefined ? payload.endY : startY;
  } else {
    // Length/Rotation style (or fallback defaults)
    startX = payload.x || 0;
    startY = payload.y || 0;
    const length = payload.length || 100;
    const rotation = payload.rotation !== undefined ? (payload.rotation * Math.PI / 180) : 0;
    
    // Calculate end point from start + length + rotation
    endX = startX + length * Math.cos(rotation);
    endY = startY + length * Math.sin(rotation);
  }
  
  // Set connector endpoints
  connector.connectorStart = {
    endpointNodeId: figma.currentPage.id,
    position: { x: startX, y: startY }
  };
  
  connector.connectorEnd = {
    endpointNodeId: figma.currentPage.id,
    position: { x: endX, y: endY }
  };
  
  // Apply separate caps
  if (payload.startCap && payload.startCap !== 'NONE') {
    connector.connectorStartStrokeCap = payload.startCap;
  }
  
  if (payload.endCap && payload.endCap !== 'NONE') {
    connector.connectorEndStrokeCap = payload.endCap;
  }
  
  await applyVisualProperties(connector, payload);
  
  figma.currentPage.appendChild(connector);
  selectAndFocus([connector]);
  
  return formatNodeResponse(connector);
}

async function applyVisualProperties(node: any, params: any) {
  // Apply fill color
  if (params.fillColor) {
    const rgbColor = parseHexColor(params.fillColor);
    const solidPaint = createSolidPaint(params.fillColor);
    
    if ('fills' in node) {
      node.fills = [solidPaint];
    }
  }
  
  // Apply stroke properties
  if (params.strokeColor) {
    const strokePaint = createSolidPaint(params.strokeColor);
    
    if ('strokes' in node) {
      node.strokes = [strokePaint];
    }
  }
  
  if (params.strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = Math.max(0, params.strokeWeight);
  }
  
  // Apply opacity
  if (params.opacity !== undefined) {
    node.opacity = params.opacity;
  }
  
  // Apply visibility
  if (params.visible !== undefined) {
    node.visible = params.visible;
  }
  
  // Apply rotation
  if (params.rotation !== undefined) {
    node.rotation = (params.rotation * Math.PI) / 180; // Convert to radians
  }
  
  // Apply lock state
  if (params.locked !== undefined) {
    node.locked = params.locked;
  }
}
