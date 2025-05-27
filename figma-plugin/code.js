// Main plugin code that runs in Figma's main thread
console.log('🎨 Figma MCP Write Plugin starting...');

// Show UI
figma.showUI(__html__, { width: 300, height: 400 });

// Plugin state
let isConnected = false;

// Handle messages from UI thread
figma.ui.onmessage = (msg) => {
  console.log('📨 Received from UI:', msg.type);
  
  switch (msg.type) {
    case 'CONNECTION_STATUS':
      isConnected = msg.connected;
      console.log(`🔌 Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
      break;
      
    case 'RECONNECT':
      console.log('🔄 UI requested reconnection');
      figma.ui.postMessage({ type: 'RECONNECT_REQUEST' });
      break;
      
    case 'CLOSE':
      console.log('👋 Closing plugin');
      figma.closePlugin();
      break;
      
    // Handle MCP tool requests from the server
    case 'CREATE_RECTANGLE':
      handleCreateRectangle(msg.payload, msg.id);
      break;
      
    case 'CREATE_ELLIPSE':
      handleCreateEllipse(msg.payload, msg.id);
      break;
      
    case 'CREATE_TEXT':
      handleCreateText(msg.payload, msg.id);
      break;
      
    case 'CREATE_FRAME':
      handleCreateFrame(msg.payload, msg.id);
      break;
      
    case 'UPDATE_NODE':
      handleUpdateNode(msg.payload, msg.id);
      break;
      
    case 'MOVE_NODE':
      handleMoveNode(msg.payload, msg.id);
      break;
      
    case 'DELETE_NODE':
      handleDeleteNode(msg.payload, msg.id);
      break;
      
    case 'DUPLICATE_NODE':
      handleDuplicateNode(msg.payload, msg.id);
      break;
      
    case 'GET_SELECTION':
      handleGetSelection(msg.id);
      break;
      
    case 'SET_SELECTION':
      handleSetSelection(msg.payload, msg.id);
      break;
      
    case 'GET_PAGE_NODES':
      handleGetPageNodes(msg.id);
      break;
      
    case 'EXPORT_NODE':
      handleExportNode(msg.payload, msg.id);
      break;
      
    default:
      console.log('❓ Unknown message type:', msg.type);
  }
};

// Send response back to server via UI
function sendResponse(id, success, data = null, error = null) {
  figma.ui.postMessage({
    type: 'SEND_TO_SERVER',
    payload: { id, success, data, error }
  });
}

// Figma API handlers
function handleCreateRectangle(params, id) {
  try {
    const rect = figma.createRectangle();
    rect.x = params.x || 0;
    rect.y = params.y || 0;
    rect.resize(params.width || 100, params.height || 100);
    rect.name = params.name || 'Rectangle';
    
    if (params.fillColor) {
      rect.fills = [{ type: 'SOLID', color: hexToRgb(params.fillColor) }];
    }
    
    figma.currentPage.appendChild(rect);
    sendResponse(id, true, { nodeId: rect.id, name: rect.name });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleCreateEllipse(params, id) {
  try {
    const ellipse = figma.createEllipse();
    ellipse.x = params.x || 0;
    ellipse.y = params.y || 0;
    ellipse.resize(params.width || 100, params.height || 100);
    ellipse.name = params.name || 'Ellipse';
    
    if (params.fillColor) {
      ellipse.fills = [{ type: 'SOLID', color: hexToRgb(params.fillColor) }];
    }
    
    figma.currentPage.appendChild(ellipse);
    sendResponse(id, true, { nodeId: ellipse.id, name: ellipse.name });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleCreateText(params, id) {
  try {
    const text = figma.createText();
    text.x = params.x || 0;
    text.y = params.y || 0;
    text.characters = params.content || 'Text';
    text.fontSize = params.fontSize || 16;
    text.name = params.name || 'Text';
    
    if (params.textColor) {
      text.fills = [{ type: 'SOLID', color: hexToRgb(params.textColor) }];
    }
    
    figma.currentPage.appendChild(text);
    sendResponse(id, true, { nodeId: text.id, name: text.name });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleCreateFrame(params, id) {
  try {
    const frame = figma.createFrame();
    frame.x = params.x || 0;
    frame.y = params.y || 0;
    frame.resize(params.width || 200, params.height || 200);
    frame.name = params.name || 'Frame';
    
    if (params.backgroundColor) {
      frame.fills = [{ type: 'SOLID', color: hexToRgb(params.backgroundColor) }];
    }
    
    figma.currentPage.appendChild(frame);
    sendResponse(id, true, { nodeId: frame.id, name: frame.name });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleUpdateNode(params, id) {
  try {
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      sendResponse(id, false, null, 'Node not found');
      return;
    }
    
    // Update properties
    Object.keys(params.properties).forEach(key => {
      if (key in node) {
        node[key] = params.properties[key];
      }
    });
    
    sendResponse(id, true, { nodeId: node.id, updated: Object.keys(params.properties) });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleMoveNode(params, id) {
  try {
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      sendResponse(id, false, null, 'Node not found');
      return;
    }
    
    node.x = params.x;
    node.y = params.y;
    
    sendResponse(id, true, { nodeId: node.id, x: node.x, y: node.y });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleDeleteNode(params, id) {
  try {
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      sendResponse(id, false, null, 'Node not found');
      return;
    }
    
    node.remove();
    sendResponse(id, true, { nodeId: params.nodeId, deleted: true });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleDuplicateNode(params, id) {
  try {
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      sendResponse(id, false, null, 'Node not found');
      return;
    }
    
    const clone = node.clone();
    clone.x = node.x + (params.offsetX || 10);
    clone.y = node.y + (params.offsetY || 10);
    
    if (node.parent) {
      node.parent.appendChild(clone);
    } else {
      figma.currentPage.appendChild(clone);
    }
    
    sendResponse(id, true, { 
      originalId: params.nodeId, 
      cloneId: clone.id,
      name: clone.name 
    });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleGetSelection(id) {
  try {
    const selection = figma.currentPage.selection;
    const selectionData = selection.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    }));
    
    sendResponse(id, true, { selection: selectionData });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleSetSelection(params, id) {
  try {
    const nodes = params.nodeIds.map(nodeId => figma.getNodeById(nodeId)).filter(Boolean);
    figma.currentPage.selection = nodes;
    
    sendResponse(id, true, { selectedIds: nodes.map(n => n.id) });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleGetPageNodes(id) {
  try {
    const getAllNodes = (node) => {
      const result = [{
        id: node.id,
        name: node.name,
        type: node.type,
        x: node.x || 0,
        y: node.y || 0,
        width: node.width || 0,
        height: node.height || 0
      }];
      
      if ('children' in node) {
        node.children.forEach(child => {
          result.push(...getAllNodes(child));
        });
      }
      
      return result;
    };
    
    const allNodes = getAllNodes(figma.currentPage);
    sendResponse(id, true, { nodes: allNodes });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

function handleExportNode(params, id) {
  try {
    const node = figma.getNodeById(params.nodeId);
    if (!node) {
      sendResponse(id, false, null, 'Node not found');
      return;
    }
    
    // Note: Actual export would require async operations
    // For now, just return success
    sendResponse(id, true, { 
      nodeId: params.nodeId,
      format: params.format,
      message: 'Export functionality would be implemented here'
    });
  } catch (error) {
    sendResponse(id, false, null, error.message);
  }
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 };
}

console.log('✅ Plugin initialized, UI thread will handle WebSocket connection');