// Main plugin code that runs in Figma's main thread
console.log('🎨 Figma MCP Write Plugin starting...');

// Configuration
const SERVER_URL = 'ws://localhost:3002'; // WebSocket port (main port + 1)
const RECONNECT_INTERVAL = 5000;
const HEARTBEAT_INTERVAL = 15000;

let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let isConnected = false;

// Initialize WebSocket connection
function connectToServer() {
  try {
    ws = new WebSocket(SERVER_URL);
    
    ws.onopen = () => {
      console.log('✅ Connected to MCP server');
      isConnected = true;
      clearTimeout(reconnectTimer);
      
      // Send plugin ready message
      sendMessage({
        id: generateUUID(),
        type: 'PLUGIN_READY',
        payload: {
          pluginId: 'figma-mcp-write-plugin',
          version: '1.0.0',
          capabilities: [
            'CREATE_RECTANGLE',
            'CREATE_ELLIPSE',
            'CREATE_TEXT',
            'CREATE_FRAME',
            'UPDATE_NODE',
            'MOVE_NODE',
            'DELETE_NODE',
            'DUPLICATE_NODE',
            'GET_SELECTION',
            'SET_SELECTION',
            'GET_PAGE_NODES',
            'EXPORT_NODE'
          ]
        }
      });
      
      // Start heartbeat
      startHeartbeat();
      
      // Update UI
      figma.ui.postMessage({ type: 'CONNECTION_STATUS', connected: true });
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    };
    
    ws.onclose = () => {
      console.log('❌ Disconnected from MCP server');
      isConnected = false;
      stopHeartbeat();
      scheduleReconnect();
      
      // Update UI
      figma.ui.postMessage({ type: 'CONNECTION_STATUS', connected: false });
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      isConnected = false;
    };
    
  } catch (error) {
    console.error('❌ Failed to connect to server:', error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    console.log('🔄 Attempting to reconnect...');
    connectToServer();
  }, RECONNECT_INTERVAL);
}

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (isConnected) {
      sendMessage({
        id: generateUUID(),
        type: 'HEARTBEAT',
        payload: { timestamp: Date.now() }
      });
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendResponse(id, success, data, error) {
  sendMessage({
    id,
    success,
    data,
    error
  });
}

// Message handler
async function handleMessage(message) {
  const { id, type, payload } = message;
  
  try {
    switch (type) {
      case 'HEARTBEAT':
        // Respond to heartbeat
        sendResponse(id, true, { timestamp: Date.now() });
        break;
        
      case 'CREATE_RECTANGLE':
        await createRectangle(id, payload);
        break;
        
      case 'CREATE_ELLIPSE':
        await createEllipse(id, payload);
        break;
        
      case 'CREATE_TEXT':
        await createText(id, payload);
        break;
        
      case 'CREATE_FRAME':
        await createFrame(id, payload);
        break;
        
      case 'UPDATE_NODE':
        await updateNode(id, payload);
        break;
        
      case 'MOVE_NODE':
        await moveNode(id, payload);
        break;
        
      case 'DELETE_NODE':
        await deleteNode(id, payload);
        break;
        
      case 'DUPLICATE_NODE':
        await duplicateNode(id, payload);
        break;
        
      case 'GET_SELECTION':
        await getSelection(id);
        break;
        
      case 'SET_SELECTION':
        await setSelection(id, payload);
        break;
        
      case 'GET_PAGE_NODES':
        await getPageNodes(id);
        break;
        
      case 'EXPORT_NODE':
        await exportNode(id, payload);
        break;
        
      default:
        sendResponse(id, false, null, `Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Error handling ${type}:`, error);
    sendResponse(id, false, null, error.message);
  }
}

// Plugin operation implementations

async function createRectangle(id, params) {
  const rect = figma.createRectangle();
  rect.name = params.name || 'Rectangle';
  rect.x = params.x || 0;
  rect.y = params.y || 0;
  rect.resize(params.width || 100, params.height || 100);
  
  if (params.fillColor) {
    rect.fills = [{ type: 'SOLID', color: hexToRgb(params.fillColor) }];
  }
  
  if (params.strokeColor) {
    rect.strokes = [{ type: 'SOLID', color: hexToRgb(params.strokeColor) }];
    rect.strokeWeight = params.strokeWidth || 1;
  }
  
  figma.currentPage.appendChild(rect);
  sendResponse(id, true, { nodeId: rect.id, name: rect.name });
}

async function createEllipse(id, params) {
  const ellipse = figma.createEllipse();
  ellipse.name = params.name || 'Ellipse';
  ellipse.x = params.x || 0;
  ellipse.y = params.y || 0;
  ellipse.resize(params.width || 100, params.height || 100);
  
  if (params.fillColor) {
    ellipse.fills = [{ type: 'SOLID', color: hexToRgb(params.fillColor) }];
  }
  
  if (params.strokeColor) {
    ellipse.strokes = [{ type: 'SOLID', color: hexToRgb(params.strokeColor) }];
    ellipse.strokeWeight = params.strokeWidth || 1;
  }
  
  figma.currentPage.appendChild(ellipse);
  sendResponse(id, true, { nodeId: ellipse.id, name: ellipse.name });
}

async function createText(id, params) {
  const text = figma.createText();
  
  // Load font before setting text
  await figma.loadFontAsync({ family: params.fontFamily || 'Inter', style: 'Regular' });
  
  text.name = params.name || 'Text';
  text.characters = params.content || 'Text';
  text.x = params.x || 0;
  text.y = params.y || 0;
  text.fontSize = params.fontSize || 16;
  text.fontName = { family: params.fontFamily || 'Inter', style: 'Regular' };
  
  if (params.textColor) {
    text.fills = [{ type: 'SOLID', color: hexToRgb(params.textColor) }];
  }
  
  figma.currentPage.appendChild(text);
  sendResponse(id, true, { nodeId: text.id, name: text.name });
}

async function createFrame(id, params) {
  const frame = figma.createFrame();
  frame.name = params.name || 'Frame';
  frame.x = params.x || 0;
  frame.y = params.y || 0;
  frame.resize(params.width || 200, params.height || 200);
  
  if (params.backgroundColor) {
    frame.fills = [{ type: 'SOLID', color: hexToRgb(params.backgroundColor) }];
  }
  
  figma.currentPage.appendChild(frame);
  sendResponse(id, true, { nodeId: frame.id, name: frame.name });
}

async function updateNode(id, params) {
  const node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    sendResponse(id, false, null, `Node not found: ${params.nodeId}`);
    return;
  }
  
  // Update properties
  for (const [key, value] of Object.entries(params.properties)) {
    if (key === 'fills' && Array.isArray(value)) {
      // Handle fills specially
      if ('fills' in node) {
        node.fills = value.map(fill => {
          if (fill.type === 'SOLID' && typeof fill.color === 'string') {
            return { type: 'SOLID', color: hexToRgb(fill.color) };
          }
          return fill;
        });
      }
    } else if (key in node) {
      node[key] = value;
    }
  }
  
  sendResponse(id, true, { nodeId: node.id });
}

async function moveNode(id, params) {
  const node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    sendResponse(id, false, null, `Node not found: ${params.nodeId}`);
    return;
  }
  
  node.x = params.x;
  node.y = params.y;
  
  sendResponse(id, true, { nodeId: node.id, x: node.x, y: node.y });
}

async function deleteNode(id, params) {
  const node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    sendResponse(id, false, null, `Node not found: ${params.nodeId}`);
    return;
  }
  
  node.remove();
  sendResponse(id, true, { nodeId: params.nodeId });
}

async function duplicateNode(id, params) {
  const node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    sendResponse(id, false, null, `Node not found: ${params.nodeId}`);
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
  
  sendResponse(id, true, { originalId: node.id, cloneId: clone.id });
}

async function getSelection(id) {
  const selection = figma.currentPage.selection;
  const selectionData = selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : undefined,
    y: 'y' in node ? node.y : undefined,
    width: 'width' in node ? node.width : undefined,
    height: 'height' in node ? node.height : undefined
  }));
  
  sendResponse(id, true, selectionData);
}

async function setSelection(id, params) {
  const nodes = [];
  for (const nodeId of params.nodeIds) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node) nodes.push(node);
  }
  
  figma.currentPage.selection = nodes;
  sendResponse(id, true, { selectedCount: nodes.length });
}

async function getPageNodes(id) {
  const nodes = figma.currentPage.children.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : undefined,
    y: 'y' in node ? node.y : undefined,
    width: 'width' in node ? node.width : undefined,
    height: 'height' in node ? node.height : undefined
  }));
  
  sendResponse(id, true, nodes);
}

async function exportNode(id, params) {
  const node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    sendResponse(id, false, null, `Node not found: ${params.nodeId}`);
    return;
  }
  
  const settings = {
    format: params.format || 'PNG',
    constraint: { type: 'SCALE', value: params.scale || 1 }
  };
  
  const bytes = await node.exportAsync(settings);
  const base64 = figma.base64Encode(bytes);
  
  sendResponse(id, true, { 
    format: settings.format,
    scale: settings.constraint.value,
    data: base64
  });
}

// Utility functions

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

// Show UI and start connection
figma.showUI(__html__, { 
  width: 320, 
  height: 240,
  title: 'MCP Write Bridge'
});

// Connect to server
connectToServer();

// Handle UI messages
figma.ui.onmessage = (msg) => {
  if (msg.type === 'RECONNECT') {
    connectToServer();
  } else if (msg.type === 'CLOSE') {
    figma.closePlugin();
  }
};

// Handle plugin close
figma.on('close', () => {
  if (ws) {
    ws.close();
  }
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
});
