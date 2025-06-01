// Figma MCP Write Plugin - Complete Implementation with Debug Logging
console.log('🎨 Figma MCP Write Plugin starting...');

// Show UI for connection monitoring
figma.showUI(__html__, { width: 320, height: 450 });

// Handle messages from UI thread (which runs the WebSocket server)
figma.ui.onmessage = async (msg) => {
  console.log('📨 Received from UI:', msg.type);
  
  switch (msg.type) {
    case 'PLUGIN_OPERATION':
      console.log('🔧 About to handle operation:', msg.operation);
      await handlePluginOperation(msg.operation, msg.payload, msg.id);
      break;
      
    case 'CLOSE':
      console.log('👋 Closing plugin');
      figma.closePlugin();
      break;
      
    default:
      console.log('❓ Unknown message type:', msg.type);
  }
};

// Handle operations from MCP server via UI thread
async function handlePluginOperation(operation, payload, id) {
  console.log(`🔧 Executing ${operation}:`, payload);
  
  try {
    let result;
    
    switch (operation) {
      case 'CREATE_NODE':
        console.log('🎨 Starting CREATE_NODE operation');
        result = await createNode(payload);
        break;
        
      case 'CREATE_TEXT':
        console.log('📝 Starting CREATE_TEXT operation');
        result = await createText(payload);
        break;
        
      case 'UPDATE_NODE':
        console.log('📝 Starting UPDATE_NODE operation');
        result = await updateNode(payload);
        break;
        
      case 'MOVE_NODE':
        console.log('📍 Starting MOVE_NODE operation');
        result = await moveNode(payload);
        break;
        
      case 'DELETE_NODE':
        console.log('🗑️ Starting DELETE_NODE operation');
        result = await deleteNode(payload);
        break;
        
      case 'DUPLICATE_NODE':
        console.log('📋 Starting DUPLICATE_NODE operation');
        result = await duplicateNode(payload);
        break;
        
      case 'SET_SELECTION':
        console.log('🎯 Starting SET_SELECTION operation');
        result = await setSelection(payload);
        break;
        
      case 'GET_SELECTION':
        console.log('🎯 Starting GET_SELECTION operation');
        result = await getSelection();
        break;
        
      case 'GET_PAGE_NODES':
        console.log('📄 Starting GET_PAGE_NODES operation');
        result = await getPageNodes();
        break;
        
      case 'EXPORT_NODE':
        console.log('💾 Starting EXPORT_NODE operation');
        result = await exportNode(payload);
        break;
        
      case 'MANAGE_STYLES':
        console.log('🎨 Starting MANAGE_STYLES operation');
        result = await manageStyles(payload);
        break;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    console.log(`✅ ${operation} completed successfully, result:`, result);
    
    // Send success response back via UI
    figma.ui.postMessage({
      type: 'OPERATION_RESPONSE',
      id: id,
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error(`❌ Error in ${operation}:`, error);
    console.error('Error stack:', error.stack);
    
    // Send error response back via UI
    figma.ui.postMessage({
      type: 'OPERATION_RESPONSE',
      id: id,
      success: false,
      error: error.message
    });
  }
}

// Helper function to find node by ID with better error handling
function findNodeById(nodeId) {
  console.log('🔍 Looking for node ID:', nodeId);
  try {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    console.log('✅ Found node:', node.name, node.type);
    return node;
  } catch (error) {
    console.log('❌ Error finding node:', error);
    throw error;
  }
}

// Helper function to standardize node response format
function formatNodeResponse(node) {
  return {
    nodeId: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  };
}

// Figma API operation implementations
async function createRectangle(params) {
  const rect = figma.createRectangle();
  rect.x = params.x || 0;
  rect.y = params.y || 0;
  rect.resize(params.width || 100, params.height || 100);
  rect.name = params.name || 'Rectangle';
  
  // Set fill color (also handles text color and frame background)
  if (params.fillColor) {
    const color = hexToRgb(params.fillColor);
    rect.fills = [{ type: 'SOLID', color }];
  }
  
  if (params.strokeColor) {
    const strokeColor = hexToRgb(params.strokeColor);
    rect.strokes = [{ type: 'SOLID', color: strokeColor }];
  }
  
  if (params.strokeWidth) {
    rect.strokeWeight = params.strokeWidth;
  }
  
  figma.currentPage.appendChild(rect);
  figma.currentPage.selection = [rect];
  figma.viewport.scrollAndZoomIntoView([rect]);
  
  return formatNodeResponse(rect);
}

async function createEllipse(params) {
  const ellipse = figma.createEllipse();
  ellipse.x = params.x || 0;
  ellipse.y = params.y || 0;
  ellipse.resize(params.width || 100, params.height || 100);
  ellipse.name = params.name || 'Ellipse';
  
  // Set fill color (also handles text color and frame background)
  if (params.fillColor) {
    const color = hexToRgb(params.fillColor);
    ellipse.fills = [{ type: 'SOLID', color }];
  }
  
  if (params.strokeColor) {
    const strokeColor = hexToRgb(params.strokeColor);
    ellipse.strokes = [{ type: 'SOLID', color: strokeColor }];
  }
  
  if (params.strokeWidth) {
    ellipse.strokeWeight = params.strokeWidth;
  }
  
  figma.currentPage.appendChild(ellipse);
  figma.currentPage.selection = [ellipse];
  figma.viewport.scrollAndZoomIntoView([ellipse]);
  
  return formatNodeResponse(ellipse);
}

async function createText(params) {
  console.log('🔤 Creating text with params:', params);
  
  const text = figma.createText();
  
  // Load default font first
  const defaultFont = {
    family: (params.fontName && params.fontName.family) || params.fontFamily || 'Inter',
    style: (params.fontName && params.fontName.style) || params.fontStyle || 'Regular'
  };
  await figma.loadFontAsync(defaultFont);
  
  // Set basic properties
  text.x = params.x || 0;
  text.y = params.y || 0;
  text.characters = params.content || params.characters || 'Text';
  text.name = params.name || 'Text';
  
  // Set font properties
  text.fontName = defaultFont;
  text.fontSize = params.fontSize || 16;
  
  // Set text alignment
  if (params.textAlignHorizontal) {
    text.textAlignHorizontal = params.textAlignHorizontal;
  }
  if (params.textAlignVertical) {
    text.textAlignVertical = params.textAlignVertical;
  }
  
  // Set text case
  if (params.textCase) {
    text.textCase = params.textCase;
  }
  
  // Set text decoration
  if (params.textDecoration) {
    text.textDecoration = params.textDecoration;
  }
  
  // Set letter spacing
  if (params.letterSpacing !== undefined) {
    text.letterSpacing = { value: params.letterSpacing, unit: 'PIXELS' };
  }
  
  // Set line height
  if (params.lineHeight) {
    text.lineHeight = params.lineHeight;
  }
  
  // Set paragraph properties
  if (params.paragraphIndent !== undefined) {
    text.paragraphIndent = params.paragraphIndent;
  }
  if (params.paragraphSpacing !== undefined) {
    text.paragraphSpacing = params.paragraphSpacing;
  }
  
  // Set text color from fills or fillColor
  if (params.fills && params.fills.length > 0) {
    text.fills = params.fills;
  } else if (params.fillColor) {
    const color = hexToRgb(params.fillColor);
    text.fills = [{ type: 'SOLID', color }];
  }
  
  // Set fixed width if specified
  if (params.width) {
    text.textAutoResize = 'HEIGHT';
    text.resize(params.width, text.height);
  }
  
  // Apply style ranges if provided
  if (params.styleRanges && params.styleRanges.length > 0) {
    for (const range of params.styleRanges) {
      const start = range.start;
      const end = range.end;
      
      // Load font for this range if specified
      if (range.fontName) {
        await figma.loadFontAsync(range.fontName);
        text.setRangeFontName(start, end, range.fontName);
      }
      
      // Apply range-specific properties
      if (range.fontSize) {
        text.setRangeFontSize(start, end, range.fontSize);
      }
      if (range.textCase) {
        text.setRangeTextCase(start, end, range.textCase);
      }
      if (range.textDecoration) {
        text.setRangeTextDecoration(start, end, range.textDecoration);
      }
      if (range.letterSpacing !== undefined) {
        text.setRangeLetterSpacing(start, end, { value: range.letterSpacing, unit: 'PIXELS' });
      }
      if (range.lineHeight) {
        text.setRangeLineHeight(start, end, range.lineHeight);
      }
      if (range.fills) {
        text.setRangeFills(start, end, range.fills);
      }
    }
  }
  
  // Create text style if requested
  if (params.createStyle && params.styleName) {
    try {
      const textStyle = figma.createTextStyle();
      textStyle.name = params.styleName;
      textStyle.fontName = text.fontName;
      textStyle.fontSize = text.fontSize;
      textStyle.textAlignHorizontal = text.textAlignHorizontal;
      textStyle.textAlignVertical = text.textAlignVertical;
      textStyle.textCase = text.textCase;
      textStyle.textDecoration = text.textDecoration;
      textStyle.letterSpacing = text.letterSpacing;
      textStyle.lineHeight = text.lineHeight;
      textStyle.paragraphIndent = text.paragraphIndent;
      textStyle.paragraphSpacing = text.paragraphSpacing;
      textStyle.fills = text.fills;
      
      console.log(`✅ Created text style: ${params.styleName}`);
    } catch (styleError) {
      console.warn('⚠️ Could not create text style:', styleError.message);
    }
  }
  
  figma.currentPage.appendChild(text);
  figma.currentPage.selection = [text];
  figma.viewport.scrollAndZoomIntoView([text]);
  
  const response = formatNodeResponse(text);
  response.content = text.characters;
  response.fontSize = text.fontSize;
  response.fontFamily = text.fontName.family;
  response.fontStyle = text.fontName.style;
  
  console.log('✅ Text created successfully');
  return response;
}

async function createFrame(params) {
  const frame = figma.createFrame();
  frame.x = params.x || 0;
  frame.y = params.y || 0;
  frame.resize(params.width || 200, params.height || 200);
  frame.name = params.name || 'Frame';
  
  // Set frame background using fillColor
  if (params.fillColor) {
    const color = hexToRgb(params.fillColor);
    frame.fills = [{ type: 'SOLID', color }];
  }
  
  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
  
  return formatNodeResponse(frame);
}

async function updateNode(params) {
  console.log('📝 updateNode called with:', params);
  const node = findNodeById(params.nodeId);
  const properties = params.properties;
  
  console.log('📝 Updating properties:', properties);
  
  // Update basic properties
  if (properties.name !== undefined) {
    console.log('📝 Setting name to:', properties.name);
    node.name = properties.name;
  }
  if (properties.x !== undefined) {
    console.log('📝 Setting x to:', properties.x);
    node.x = properties.x;
  }
  if (properties.y !== undefined) {
    console.log('📝 Setting y to:', properties.y);
    node.y = properties.y;
  }
  if (properties.visible !== undefined) node.visible = properties.visible;
  if (properties.locked !== undefined) node.locked = properties.locked;
  if (properties.opacity !== undefined) node.opacity = properties.opacity;
  
  // Update size for resizable nodes
  if ('resize' in node && (properties.width !== undefined || properties.height !== undefined)) {
    const width = properties.width !== undefined ? properties.width : node.width;
    const height = properties.height !== undefined ? properties.height : node.height;
    console.log('📝 Resizing to:', width, 'x', height);
    node.resize(width, height);
  }
  
  // Update fill color
  if (properties.fillColor && 'fills' in node) {
    const color = hexToRgb(properties.fillColor);
    console.log('📝 Setting fill color to:', color);
    node.fills = [{ type: 'SOLID', color }];
  }
  
  // Update text-specific properties
  if (node.type === 'TEXT') {
    if (properties.content !== undefined) {
      await figma.loadFontAsync(node.fontName);
      node.characters = properties.content;
    }
    if (properties.fontSize !== undefined) node.fontSize = properties.fontSize;
  }
  
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  
  console.log('✅ updateNode completed');
  return {
    nodeId: node.id,
    updatedProperties: Object.keys(properties)
  };
}

async function moveNode(params) {
  console.log('📍 moveNode called with:', params);
  const node = findNodeById(params.nodeId);
  
  console.log('📍 Moving node from', node.x, node.y, 'to', params.x, params.y);
  node.x = params.x;
  node.y = params.y;
  
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
  
  console.log('✅ moveNode completed');
  return {
    nodeId: node.id,
    newPosition: { x: node.x, y: node.y }
  };
}

async function deleteNode(params) {
  console.log('🗑️ deleteNode called with:', params);
  const node = findNodeById(params.nodeId);
  const nodeInfo = {
    nodeId: node.id,
    name: node.name,
    type: node.type
  };
  
  console.log('🗑️ Deleting node:', nodeInfo);
  node.remove();
  
  console.log('✅ deleteNode completed');
  return {
    deletedNode: nodeInfo
  };
}

async function duplicateNode(params) {
  console.log('📋 duplicateNode called with:', params);
  const node = findNodeById(params.nodeId);
  console.log('📋 Cloning node:', node.name);
  
  const duplicate = node.clone();
  
  duplicate.x = node.x + (params.offsetX || 10);
  duplicate.y = node.y + (params.offsetY || 10);
  duplicate.name = node.name + ' Copy';
  
  console.log('📋 Appending duplicate to page');
  figma.currentPage.appendChild(duplicate);
  figma.currentPage.selection = [duplicate];
  figma.viewport.scrollAndZoomIntoView([duplicate]);
  
  console.log('✅ duplicateNode completed');
  return {
    originalNodeId: node.id,
    duplicateNodeId: duplicate.id,
    duplicate: {
      nodeId: duplicate.id,
      name: duplicate.name,
      x: duplicate.x,
      y: duplicate.y
    }
  };
}

async function setSelection(params) {
  console.log('🎯 setSelection called with:', params);
  const nodes = params.nodeIds.map(nodeId => {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    return node;
  });
  
  console.log('🎯 Setting selection to', nodes.length, 'nodes');
  figma.currentPage.selection = nodes;
  
  if (nodes.length > 0) {
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
  
  console.log('✅ setSelection completed');
  return {
    selectedCount: nodes.length,
    selectedNodes: nodes.map(node => ({
      nodeId: node.id,
      name: node.name,
      type: node.type
    }))
  };
}

async function getSelection() {
  const selection = figma.currentPage.selection;
  const selectionData = selection.map(node => ({
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x || 0,
    y: node.y || 0,
    width: node.width || 0,
    height: node.height || 0
  }));
  
  return { selection: selectionData };
}

async function getPageNodes() {
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
  return { nodes: allNodes };
}

async function exportNode(params) {
  console.log('💾 exportNode called with:', params);
  const node = findNodeById(params.nodeId);
  
  // Note: Figma Plugin API has limitations on export functionality
  // This is a simplified version that would need additional implementation
  // for actual file export
  
  try {
    const exportSettings = {
      format: params.format || 'PNG',
      constraint: {
        type: 'SCALE',
        value: params.scale || 1
      }
    };
    
    // In a real implementation, you'd use:
    // const bytes = await node.exportAsync(exportSettings);
    // But this requires additional setup for file handling
    
    console.log('✅ exportNode completed (simulated)');
    return {
      nodeId: node.id,
      format: params.format || 'PNG',
      scale: params.scale || 1,
      message: 'Export prepared (actual file export requires additional setup)'
    };
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.5, g: 0.5, b: 0.5 }; // Default gray
}



// Unified node creation function
async function createNode(params) {
  console.log('🔧 Creating node with unified handler:', params);
  
  switch (params.nodeType) {
    case 'rectangle':
      return await createRectangle(params);
    case 'ellipse':
      return await createEllipse(params);
    case 'text':
      return await createText(params);
    case 'frame':
      return await createFrame(params);
    default:
      throw new Error(`Unknown node type: ${params.nodeType}`);
  }
}

// Comprehensive style management function
async function manageStyles(params) {
  console.log('🎨 Managing styles:', params);
  
  try {
    switch (params.operation) {
      case 'create':
        return await createStyle(params);
      case 'list':
        return await listStyles(params.styleType);
      case 'apply':
        return await applyStyle(params);
      case 'delete':
        return await deleteStyle(params);
      case 'get':
        return await getStyle(params);
      default:
        throw new Error(`Unknown style operation: ${params.operation}`);
    }
  } catch (error) {
    console.error('❌ Error in manageStyles:', error);
    throw error;
  }
}

// Create style function
async function createStyle(params) {
  let style;
  
  switch (params.styleType) {
    case 'paint':
      style = figma.createPaintStyle();
      style.name = params.styleName;
      style.paints = [await createPaint(params)];
      console.log(`✅ Created paint style: ${params.styleName}`);
      break;
      
    case 'text':
      style = figma.createTextStyle();
      style.name = params.styleName;
      await applyTextStyleProperties(style, params);
      console.log(`✅ Created text style: ${params.styleName}`);
      break;
      
    case 'effect':
      style = figma.createEffectStyle();
      style.name = params.styleName;
      style.effects = params.effects ? params.effects.map(createEffect) : [];
      console.log(`✅ Created effect style: ${params.styleName}`);
      break;
      
    case 'grid':
      style = figma.createGridStyle();
      style.name = params.styleName;
      style.layoutGrids = params.layoutGrids ? params.layoutGrids.map(createLayoutGrid) : [];
      console.log(`✅ Created grid style: ${params.styleName}`);
      break;
      
    default:
      throw new Error(`Unknown style type: ${params.styleType}`);
  }
  
  return formatStyleResponse(style);
}

// Create paint function
async function createPaint(params) {
  switch (params.paintType) {
    case 'solid':
      return {
        type: 'SOLID',
        color: hexToRgb(params.color),
        opacity: params.opacity !== undefined ? params.opacity : 1
      };
      
    case 'gradient_linear':
      return {
        type: 'GRADIENT_LINEAR',
        gradientTransform: params.gradientTransform || [[1, 0, 0], [0, 1, 0]],
        gradientStops: params.gradientStops ? params.gradientStops.map(stop => {
          const color = hexToRgb(stop.color);
          return {
            position: stop.position,
            color: { r: color.r, g: color.g, b: color.b, a: stop.opacity !== undefined ? stop.opacity : 1 }
          };
        }) : []
      };
      
    case 'gradient_radial':
      return {
        type: 'GRADIENT_RADIAL',
        gradientTransform: params.gradientTransform || [[1, 0, 0], [0, 1, 0]],
        gradientStops: params.gradientStops ? params.gradientStops.map(stop => {
          const color = hexToRgb(stop.color);
          return {
            position: stop.position,
            color: { r: color.r, g: color.g, b: color.b, a: stop.opacity !== undefined ? stop.opacity : 1 }
          };
        }) : []
      };
      
    case 'gradient_angular':
      return {
        type: 'GRADIENT_ANGULAR',
        gradientTransform: params.gradientTransform || [[1, 0, 0], [0, 1, 0]],
        gradientStops: params.gradientStops ? params.gradientStops.map(stop => {
          const color = hexToRgb(stop.color);
          return {
            position: stop.position,
            color: { r: color.r, g: color.g, b: color.b, a: stop.opacity !== undefined ? stop.opacity : 1 }
          };
        }) : []
      };
      
    case 'gradient_diamond':
      return {
        type: 'GRADIENT_DIAMOND',
        gradientTransform: params.gradientTransform || [[1, 0, 0], [0, 1, 0]],
        gradientStops: params.gradientStops ? params.gradientStops.map(stop => {
          const color = hexToRgb(stop.color);
          return {
            position: stop.position,
            color: { r: color.r, g: color.g, b: color.b, a: stop.opacity !== undefined ? stop.opacity : 1 }
          };
        }) : []
      };
      
    case 'image':
      return {
        type: 'IMAGE',
        imageHash: params.imageHash,
        scaleMode: params.scaleMode ? params.scaleMode.toUpperCase() : 'FILL'
      };
      
    default:
      throw new Error(`Unknown paint type: ${params.paintType}`);
  }
}

// Apply text style properties
async function applyTextStyleProperties(style, params) {
  if (params.fontFamily && params.fontStyle) {
    const fontName = { family: params.fontFamily, style: params.fontStyle };
    await figma.loadFontAsync(fontName);
    style.fontName = fontName;
  }
  
  if (params.fontSize !== undefined) style.fontSize = params.fontSize;
  if (params.fontWeight !== undefined) style.fontWeight = params.fontWeight;
  if (params.textAlignHorizontal) style.textAlignHorizontal = params.textAlignHorizontal.toUpperCase();
  if (params.textAlignVertical) style.textAlignVertical = params.textAlignVertical.toUpperCase();
  if (params.textAutoResize) style.textAutoResize = params.textAutoResize.toUpperCase();
  if (params.textCase) style.textCase = params.textCase.toUpperCase();
  if (params.textDecoration) style.textDecoration = params.textDecoration.toUpperCase();
  if (params.letterSpacing !== undefined) style.letterSpacing = { value: params.letterSpacing, unit: 'PIXELS' };
  if (params.lineHeight !== undefined) {
    const unit = params.lineHeightUnit === 'percent' ? 'PERCENT' : 'PIXELS';
    style.lineHeight = { value: params.lineHeight, unit: unit };
  }
  if (params.paragraphIndent !== undefined) style.paragraphIndent = params.paragraphIndent;
  if (params.paragraphSpacing !== undefined) style.paragraphSpacing = params.paragraphSpacing;
  if (params.listSpacing !== undefined) style.listSpacing = params.listSpacing;
  if (params.hangingPunctuation !== undefined) style.hangingPunctuation = params.hangingPunctuation;
  if (params.hangingList !== undefined) style.hangingList = params.hangingList;
  if (params.textTruncation) style.textTruncation = params.textTruncation.toUpperCase();
  if (params.maxLines !== undefined) style.maxLines = params.maxLines;
  if (params.fillColor) {
    style.fills = [{
      type: 'SOLID',
      color: hexToRgb(params.fillColor)
    }];
  }
}

// Create effect function
function createEffect(effectData) {
  const effect = {
    type: effectData.type.toUpperCase(),
    visible: effectData.visible !== undefined ? effectData.visible : true
  };
  
  // Add alpha field to color for shadows and other effects
  if (effectData.color) {
    const color = hexToRgb(effectData.color);
    effect.color = { r: color.r, g: color.g, b: color.b, a: effectData.opacity !== undefined ? effectData.opacity : 1 };
  }
  
  if (effectData.blendMode) effect.blendMode = effectData.blendMode.toUpperCase();
  if (effectData.offset) effect.offset = effectData.offset;
  if (effectData.radius !== undefined) effect.radius = effectData.radius;
  if (effectData.spread !== undefined) effect.spread = effectData.spread;
  if (effectData.showShadowBehindNode !== undefined) effect.showShadowBehindNode = effectData.showShadowBehindNode;
  
  // Add required defaults for shadow effects
  const shadowTypes = ['DROP_SHADOW', 'INNER_SHADOW'];
  if (shadowTypes.includes(effect.type)) {
    if (!effect.offset) effect.offset = { x: 0, y: 4 };
    if (effect.radius === undefined) effect.radius = 4;
    if (!effect.color) {
      effect.color = { r: 0, g: 0, b: 0, a: 0.25 }; // Default shadow color
    }
    if (!effect.blendMode) effect.blendMode = 'NORMAL';
  }
  
  return effect;
}

// Create layout grid function
function createLayoutGrid(gridData) {
  const grid = {
    pattern: gridData.pattern.toUpperCase(),
    visible: gridData.visible !== undefined ? gridData.visible : true
  };
  
  if (gridData.sectionSize !== undefined) grid.sectionSize = gridData.sectionSize;
  if (gridData.color) grid.color = hexToRgb(gridData.color);
  if (gridData.alignment) grid.alignment = gridData.alignment.toUpperCase();
  if (gridData.gutterSize !== undefined) grid.gutterSize = gridData.gutterSize;
  if (gridData.offset !== undefined) grid.offset = gridData.offset;
  if (gridData.count !== undefined) grid.count = gridData.count;
  
  return grid;
}

// List styles function
async function listStyles(styleType) {
  let styles;
  
  switch (styleType) {
    case 'paint':
      styles = figma.getLocalPaintStyles();
      break;
    case 'text':
      styles = figma.getLocalTextStyles();
      break;
    case 'effect':
      styles = figma.getLocalEffectStyles();
      break;
    case 'grid':
      styles = figma.getLocalGridStyles();
      break;
    default:
      throw new Error(`Unknown style type: ${styleType}`);
  }
  
  return styles.map(style => ({
    id: style.id,
    name: style.name,
    type: styleType,
    description: style.description || ''
  }));
}

// Apply style function
async function applyStyle(params) {
  const node = figma.getNodeById(params.nodeId);
  if (!node) {
    throw new Error(`Node with ID ${params.nodeId} not found`);
  }
  
  let style;
  if (params.styleId) {
    // Find style by ID
    const allStyles = [
      ...figma.getLocalPaintStyles(),
      ...figma.getLocalTextStyles(),
      ...figma.getLocalEffectStyles(),
      ...figma.getLocalGridStyles()
    ];
    style = allStyles.find(s => s.id === params.styleId);
  } else if (params.styleName) {
    // Find style by name (less reliable but supported)
    const allStyles = [
      ...figma.getLocalPaintStyles(),
      ...figma.getLocalTextStyles(),
      ...figma.getLocalEffectStyles(),
      ...figma.getLocalGridStyles()
    ];
    style = allStyles.find(s => s.name === params.styleName);
  }
  
  if (!style) {
    throw new Error(`Style not found`);
  }
  
  // Apply style based on type
  if (style.type === 'PAINT') {
    if ('fills' in node) {
      node.fillStyleId = style.id;
    } else {
      throw new Error(`Cannot apply paint style to node type ${node.type}`);
    }
  } else if (style.type === 'TEXT') {
    if (node.type === 'TEXT') {
      node.textStyleId = style.id;
    } else {
      throw new Error(`Cannot apply text style to non-text node`);
    }
  } else if (style.type === 'EFFECT') {
    if ('effects' in node) {
      node.effectStyleId = style.id;
    } else {
      throw new Error(`Cannot apply effect style to node type ${node.type}`);
    }
  } else if (style.type === 'GRID') {
    if ('layoutGrids' in node) {
      node.gridStyleId = style.id;
    } else {
      throw new Error(`Cannot apply grid style to node type ${node.type}`);
    }
  }
  
  console.log(`✅ Applied ${style.type.toLowerCase()} style "${style.name}" to node ${params.nodeId}`);
  return { success: true, styleName: style.name, nodeId: params.nodeId };
}

// Delete style function
async function deleteStyle(params) {
  let style;
  const allStyles = [
    ...figma.getLocalPaintStyles(),
    ...figma.getLocalTextStyles(),
    ...figma.getLocalEffectStyles(),
    ...figma.getLocalGridStyles()
  ];
  
  if (params.styleId) {
    style = allStyles.find(s => s.id === params.styleId);
  } else if (params.styleName) {
    style = allStyles.find(s => s.name === params.styleName);
  }
  
  if (!style) {
    throw new Error(`Style not found`);
  }
  
  style.remove();
  console.log(`✅ Deleted style "${style.name}"`);
  return { success: true, styleName: style.name };
}

// Get style function
async function getStyle(params) {
  let style;
  const allStyles = [
    ...figma.getLocalPaintStyles(),
    ...figma.getLocalTextStyles(),
    ...figma.getLocalEffectStyles(),
    ...figma.getLocalGridStyles()
  ];
  
  if (params.styleId) {
    style = allStyles.find(s => s.id === params.styleId);
  } else if (params.styleName) {
    style = allStyles.find(s => s.name === params.styleName);
  }
  
  if (!style) {
    throw new Error(`Style not found`);
  }
  
  return formatStyleResponse(style);
}

// Format style response
function formatStyleResponse(style) {
  const response = {
    id: style.id,
    name: style.name,
    type: style.type,
    description: style.description || ''
  };
  
  // Add type-specific properties
  if (style.type === 'PAINT') {
    response.paints = style.paints;
  } else if (style.type === 'TEXT') {
    response.fontName = style.fontName;
    response.fontSize = style.fontSize;
    response.textAlignHorizontal = style.textAlignHorizontal;
    response.textAlignVertical = style.textAlignVertical;
    response.letterSpacing = style.letterSpacing;
    response.lineHeight = style.lineHeight;
    response.fills = style.fills;
  } else if (style.type === 'EFFECT') {
    response.effects = style.effects;
  } else if (style.type === 'GRID') {
    response.layoutGrids = style.layoutGrids;
  }
  
  return response;
}

// Plugin ready
console.log('🚀 Plugin ready for MCP operations');
