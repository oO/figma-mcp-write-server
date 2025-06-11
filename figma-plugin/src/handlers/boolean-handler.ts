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
      return node.type === 'RECTANGLE' || 
             node.type === 'ELLIPSE' || 
             node.type === 'VECTOR' || 
             node.type === 'STAR' ||
             node.type === 'POLYGON' ||
             node.type === 'BOOLEAN_OPERATION';
    });

    if (validNodes.length < 2) {
      return {
        success: false,
        error: 'Boolean operations require at least 2 valid shape nodes (rectangles, ellipses, vectors, stars, polygons, or boolean operations)'
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
        
        const nodes = [nodeToFlatten];
        const flattened = figma.flatten(nodes);
        
        return {
          success: true,
          data: { 
            nodeId: flattened.id, 
            operation: 'flatten',
            name: flattened.name
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
        
        // Check if node supports outline stroke
        if (!('outlineStroke' in node)) {
          return { 
            success: false, 
            error: 'Node does not support outline stroke. Only vector-based nodes (rectangles, ellipses, vectors, etc.) support this operation.' 
          };
        }
        
        // Perform outline stroke
        const outlinedNode = (node as any).outlineStroke();
        
        return {
          success: true,
          data: { 
            nodeId: outlinedNode.id, 
            operation: 'outline_stroke',
            name: outlinedNode.name
          }
        };

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