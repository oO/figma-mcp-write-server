export async function performBooleanOperation(payload: any): Promise<any> {
  try {
    const { operation, nodeIds, name, preserveOriginal } = payload;
    
    // Get nodes by ID
    const nodes = nodeIds.map((id: string) => figma.getNodeById(id))
      .filter((node: any) => node !== null);
    
    if (nodes.length < 2) {
      return {
        success: false,
        error: 'Boolean operations require at least 2 valid nodes'
      };
    }

    // Verify nodes are valid for boolean operations
    const validNodes = nodes.filter((node: any) => {
      // Check if node has geometric shapes (can be used in boolean operations)
      const validTypes = [
        'RECTANGLE', 'ELLIPSE', 'VECTOR', 'STAR', 'POLYGON', 
        'BOOLEAN_OPERATION', 'LINE', 'TEXT', 'FRAME', 'GROUP',
        'COMPONENT', 'INSTANCE', 'SECTION'
      ];
      
      // Additional check: ensure node can be used in boolean operations
      // Frames and groups work if they contain shapes
      if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        return true; // Let Figma API handle the validation
      }
      
      return validTypes.includes(node.type);
    });

    if (validNodes.length < 2) {
      return {
        success: false,
        error: 'Boolean operations require at least 2 valid nodes. Most node types are supported including shapes, frames, groups, components, and text.'
      };
    }

    let result;
    const parent = figma.currentPage;

    // Perform boolean operation based on type
    switch (operation) {
      case 'union':
        result = figma.union(validNodes, parent);
        break;
      case 'subtract':
        result = figma.subtract(validNodes, parent);
        break;
      case 'intersect':
        result = figma.intersect(validNodes, parent);
        break;
      case 'exclude':
        result = figma.exclude(validNodes, parent);
        break;
      default:
        return {
          success: false,
          error: `Unknown boolean operation: ${operation}`
        };
    }

    // Set name if provided
    if (name) {
      result.name = name;
    } else {
      result.name = `${operation.charAt(0).toUpperCase() + operation.slice(1)} Operation`;
    }

    // Remove original nodes if not preserving
    if (!preserveOriginal) {
      validNodes.forEach((node: any) => node.remove());
    }

    return {
      success: true,
      data: {
        nodeId: result.id,
        processedNodes: nodeIds,
        operation: operation,
        resultName: result.name
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Boolean operation failed: ${error.message}`
    };
  }
}

export async function performVectorOperation(payload: any): Promise<any> {
  try {
    const { operation, nodeId, vectorPaths, name, strokeWidth, x, y } = payload;

    switch (operation) {
      case 'create_vector':
        const vector = figma.createVector();
        
        // Set vector paths if provided
        if (vectorPaths && Array.isArray(vectorPaths)) {
          vector.vectorPaths = vectorPaths;
        }
        
        // Set name
        if (name) {
          vector.name = name;
        } else {
          vector.name = 'Vector';
        }
        
        // Set position
        if (x !== undefined) vector.x = x;
        if (y !== undefined) vector.y = y;
        
        figma.currentPage.appendChild(vector);
        
        return {
          success: true,
          data: { 
            nodeId: vector.id, 
            operation: 'create_vector',
            name: vector.name,
            x: vector.x,
            y: vector.y
          }
        };

      case 'flatten':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for flatten operation' };
        }
        
        const nodeToFlatten = figma.getNodeById(nodeId);
        if (!nodeToFlatten) {
          return { success: false, error: `Node ${nodeId} not found` };
        }
        
        // Check if node can be flattened
        const validTypes = ['RECTANGLE', 'ELLIPSE', 'VECTOR', 'STAR', 'POLYGON', 'BOOLEAN_OPERATION', 'FRAME', 'GROUP'];
        if (!validTypes.includes(nodeToFlatten.type)) {
          return { 
            success: false, 
            error: `Node type ${nodeToFlatten.type} cannot be flattened. Only shapes and groups can be flattened.` 
          };
        }
        
        const nodes = [nodeToFlatten];
        const parent = (nodeToFlatten.parent && 'appendChild' in nodeToFlatten.parent) 
          ? nodeToFlatten.parent as BaseNode & ChildrenMixin
          : figma.currentPage;
        const flattened = figma.flatten(nodes, parent);
        
        return {
          success: true,
          data: { 
            nodeId: flattened.id, 
            operation: 'flatten',
            name: flattened.name,
            originalNodeId: nodeId
          }
        };

      case 'outline_stroke':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for outline_stroke operation' };
        }
        
        const node = figma.getNodeById(nodeId);
        if (!node) {
          return { success: false, error: `Node ${nodeId} not found` };
        }
        
        // Check if node is a valid type for outline stroke
        const outlineValidTypes = ['RECTANGLE', 'ELLIPSE', 'VECTOR', 'STAR', 'POLYGON'];
        if (!outlineValidTypes.includes(node.type)) {
          return { 
            success: false, 
            error: `Node type ${node.type} does not support outline stroke. Only shapes with strokes (rectangles, ellipses, vectors, stars, polygons) support this operation.` 
          };
        }
        
        // Use the correct API: outlineStroke() is a node method, not figma global
        try {
          // Check if node has outlineStroke method
          if (!('outlineStroke' in node) || typeof (node as any).outlineStroke !== 'function') {
            return { 
              success: false, 
              error: `Node type ${node.type} does not support outline stroke method. Only LineNode and other stroke-capable nodes support this operation.` 
            };
          }
          
          // Call the node's outlineStroke method
          const outlinedNode = (node as any).outlineStroke();
          
          // API returns null if node has no strokes
          if (!outlinedNode) {
            return { 
              success: false, 
              error: 'Outline stroke operation returned null - node has no visible strokes to outline. Add a stroke to the node first.' 
            };
          }
          
          // Add the new node to the current page
          figma.currentPage.appendChild(outlinedNode);
          
          return {
            success: true,
            data: { 
              nodeId: outlinedNode.id, 
              operation: 'outline_stroke',
              name: outlinedNode.name,
              originalNodeId: nodeId,
              message: `Successfully outlined stroke for ${node.type.toLowerCase()}`
            }
          };
        } catch (error) {
          return { 
            success: false, 
            error: `Outline stroke failed: ${error.message}. Ensure the node has a visible stroke.` 
          };
        }

      case 'get_vector_paths':
        if (!nodeId) {
          return { success: false, error: 'nodeId required for get_vector_paths operation' };
        }
        
        const vectorNode = figma.getNodeById(nodeId);
        if (!vectorNode) {
          return { success: false, error: `Node ${nodeId} not found` };
        }
        
        if (vectorNode.type !== 'VECTOR') {
          return { 
            success: false, 
            error: `Node is not a vector node. Current type: ${vectorNode.type}` 
          };
        }
        
        return {
          success: true,
          data: { 
            nodeId: vectorNode.id,
            vectorPaths: (vectorNode as VectorNode).vectorPaths,
            operation: 'get_vector_paths',
            name: vectorNode.name
          }
        };

      default:
        return {
          success: false,
          error: `Unknown vector operation: ${operation}`
        };
    }

  } catch (error) {
    return {
      success: false,
      error: `Vector operation failed: ${error.message}`
    };
  }
}