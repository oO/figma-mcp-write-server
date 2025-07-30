import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById } from '../utils/node-utils.js';
import { modifyBackgrounds, modifyPrototypeBackgrounds } from '../utils/figma-property-utils.js';

/**
 * Handle MANAGE_PAGES operation
 */
export async function MANAGE_PAGES(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('managePages', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['list', 'get', 'create', 'update', 'delete', 'duplicate', 'switch', 'reorder', 'create_divider', 'get_current']
    );

    switch (operation) {
      case 'list':
        return await listPages(params);
      case 'get':
        return await getPage(params);
      case 'get_current':
        return await getCurrentPage(params);
      case 'create':
        return await createPage(params);
      case 'update':
        return await updatePage(params);
      case 'delete':
        return await deletePage(params);
      case 'duplicate':
        return await duplicatePage(params);
      case 'switch':
        return await switchPage(params);
      case 'reorder':
        return await reorderPage(params);
      case 'create_divider':
        return await createPageDivider(params);
      default:
        throw new Error(`Unknown pages operation: ${operation}`);
    }
  });
}

async function listPages(params: any): Promise<any> {
  const detail = params.detail?.toLowerCase() || 'minimal';
  const document = figma.root;
  const currentPage = figma.currentPage;
  const pages = Array.from(document.children);

  // Document information
  const documentInfo = {
    name: document.name,
    id: document.id,
    documentColorProfile: document.documentColorProfile,
    totalPages: pages.length,
    currentPageId: currentPage.id
  };

  // Format pages based on detail level
  const formatPage = (page: PageNode, index: number) => {
    const baseInfo = {
      id: page.id,
      name: page.name,
      type: page.type,
      isPageDivider: page.isPageDivider,
      index,
      current: page.id === currentPage.id
    };

    if (detail === 'minimal') {
      return baseInfo;
    }

    const standardInfo = {
      ...baseInfo,
      childrenCount: page.children.length
    };

    if (detail === 'standard') {
      return standardInfo;
    }

    // Full detail
    return {
      ...standardInfo,
      backgrounds: page.backgrounds,
      prototypeBackgrounds: page.prototypeBackgrounds,
      guides: page.guides,
      selection: page.selection.map(node => node.id),
      flowStartingPoints: page.flowStartingPoints
    };
  };

  const formattedPages = pages.map((page, index) => formatPage(page as PageNode, index));

  return {
    operation: 'list',
    document: documentInfo,
    pages: formattedPages,
    message: `Listed ${pages.length} pages with ${detail} detail level`
  };
}

async function getPage(params: any): Promise<any> {
  const pageId = params.pageId;
  if (!pageId) {
    throw new Error('Parameter "pageId" is required for get operation');
  }

  // Find page in document's children (pages are at document level, not in current page)
  const page = Array.from(figma.root.children).find(child => child.id === pageId) as PageNode;
  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  if (page.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page`);
  }

  // Load page if needed for dynamic page access
  if ('loadAsync' in page) {
    await page.loadAsync();
  }

  return {
    operation: 'get',
    pageId: page.id,
    name: page.name,
    type: page.type,
    isPageDivider: page.isPageDivider,
    childrenCount: page.children.length,
    backgrounds: page.backgrounds,
    prototypeBackgrounds: page.prototypeBackgrounds,
    guides: page.guides,
    selection: page.selection.map(node => node.id),
    flowStartingPoints: page.flowStartingPoints,
    current: page.id === figma.currentPage.id,
    message: `Retrieved page "${page.name}"`
  };
}

async function getCurrentPage(params: any): Promise<any> {
  const currentPage = figma.currentPage;

  return {
    operation: 'get_current',
    pageId: currentPage.id,
    name: currentPage.name,
    type: currentPage.type,
    isPageDivider: currentPage.isPageDivider,
    childrenCount: currentPage.children.length,
    backgrounds: currentPage.backgrounds,
    prototypeBackgrounds: currentPage.prototypeBackgrounds,
    guides: currentPage.guides,
    selection: currentPage.selection.map(node => node.id),
    flowStartingPoints: currentPage.flowStartingPoints,
    current: true,
    message: `Current page is "${currentPage.name}"`
  };
}

async function createPage(params: any): Promise<any> {
  const name = params.name || 'New Page';
  
  try {
    // Create new page
    const newPage = figma.createPage();
    newPage.name = name;

    // Set insert position if specified
    if (params.insertIndex !== undefined) {
      const document = figma.root;
      const targetIndex = Math.max(0, Math.min(params.insertIndex, document.children.length));
      document.insertChild(targetIndex, newPage);
    }

    // Apply background properties
    await applyPageProperties(newPage, params);

    const insertIndex = Array.from(figma.root.children).indexOf(newPage);

    return {
      operation: 'create',
      pageId: newPage.id,
      name: newPage.name,
      type: newPage.type,
      isPageDivider: newPage.isPageDivider,
      index: insertIndex,
      childrenCount: 0,
      message: `Created page "${newPage.name}" at position ${insertIndex}`
    };
  } catch (error) {
    // Handle Figma plan limitations
    if (error.toString().includes('Limited to 3 pages only')) {
      throw new Error('Cannot create page: Your Figma plan is limited to 3 pages. Upgrade to a paid plan to create more pages.');
    }
    throw error;
  }
}

async function updatePage(params: any): Promise<any> {
  const pageId = params.pageId;
  if (!pageId) {
    throw new Error('Parameter "pageId" is required for update operation');
  }

  // Find page in document's children (pages are at document level, not in current page)
  const page = Array.from(figma.root.children).find(child => child.id === pageId) as PageNode;
  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  if (page.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page`);
  }

  // Load page if needed
  if ('loadAsync' in page) {
    await page.loadAsync();
  }

  // Update name if provided
  if (params.name) {
    page.name = params.name;
  }

  // Apply other properties
  await applyPageProperties(page, params);

  return {
    operation: 'update',
    pageId: page.id,
    name: page.name,
    type: page.type,
    isPageDivider: page.isPageDivider,
    childrenCount: page.children.length,
    message: `Updated page "${page.name}"`
  };
}

async function deletePage(params: any): Promise<any> {
  const pageId = params.pageId;
  if (!pageId) {
    throw new Error('Parameter "pageId" is required for delete operation');
  }

  if (!params.switchToPageId) {
    throw new Error('Parameter "switchToPageId" is required for delete operation');
  }

  // Find page in document's children (pages are at document level, not in current page)
  const page = Array.from(figma.root.children).find(child => child.id === pageId) as PageNode;
  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  if (page.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page`);
  }

  // Find switch target page in document's children
  const switchToPage = Array.from(figma.root.children).find(child => child.id === params.switchToPageId) as PageNode;
  if (!switchToPage) {
    throw new Error(`Switch target page ${params.switchToPageId} not found`);
  }

  if (switchToPage.type !== 'PAGE') {
    throw new Error(`Switch target ${params.switchToPageId} is not a page`);
  }

  // Cannot delete current page, must switch first
  if (page.id === figma.currentPage.id) {
    await figma.setCurrentPageAsync(switchToPage);
  }

  const pageName = page.name;
  
  // Remove the page
  page.remove();

  return {
    operation: 'delete',
    pageId: pageId,
    name: pageName,
    switchedToPageId: params.switchToPageId,
    switchedToPageName: switchToPage.name,
    message: `Deleted page "${pageName}" and switched to "${switchToPage.name}"`
  };
}

async function duplicatePage(params: any): Promise<any> {
  const pageId = params.pageId;
  if (!pageId) {
    throw new Error('Parameter "pageId" is required for duplicate operation');
  }

  // Find page in document's children (pages are at document level, not in current page)
  const originalPage = Array.from(figma.root.children).find(child => child.id === pageId) as PageNode;
  if (!originalPage) {
    throw new Error(`Page ${pageId} not found`);
  }

  if (originalPage.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page`);
  }

  // Load page if needed
  if ('loadAsync' in originalPage) {
    await originalPage.loadAsync();
  }

  try {
    // Clone the page
    const duplicatedPage = originalPage.clone();
  
    // Set custom name if provided
    if (params.name) {
      duplicatedPage.name = params.name;
    } else {
      duplicatedPage.name = `Copy of ${originalPage.name}`;
    }

    const insertIndex = Array.from(figma.root.children).indexOf(duplicatedPage);

    return {
      operation: 'duplicate',
      pageId: duplicatedPage.id,
      name: duplicatedPage.name,
      originalPageId: pageId,
      originalName: originalPage.name,
      type: duplicatedPage.type,
      isPageDivider: duplicatedPage.isPageDivider,
      index: insertIndex,
      childrenCount: duplicatedPage.children.length,
      message: `Duplicated page "${originalPage.name}" as "${duplicatedPage.name}"`
    };
  } catch (error) {
    // Handle Figma plan limitations
    if (error.toString().includes('Limited to 3 pages only')) {
      throw new Error('Cannot duplicate page: Your Figma plan is limited to 3 pages. Upgrade to a paid plan to create more pages.');
    }
    throw error;
  }
}

async function switchPage(params: any): Promise<any> {
  const pageId = params.pageId;
  if (!pageId) {
    throw new Error('Parameter "pageId" is required for switch operation');
  }

  // Find page in document's children (pages are at document level, not in current page)
  const page = Array.from(figma.root.children).find(child => child.id === pageId) as PageNode;
  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  if (page.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page`);
  }

  const previousPage = figma.currentPage;
  
  // Switch to the page
  await figma.setCurrentPageAsync(page);

  return {
    operation: 'switch',
    pageId: page.id,
    name: page.name,
    previousPageId: previousPage.id,
    previousPageName: previousPage.name,
    current: true,
    message: `Switched from "${previousPage.name}" to "${page.name}"`
  };
}

async function reorderPage(params: any): Promise<any> {
  const pageId = params.pageId;
  if (!pageId) {
    throw new Error('Parameter "pageId" is required for reorder operation');
  }

  if (params.newIndex === undefined) {
    throw new Error('Parameter "newIndex" is required for reorder operation');
  }

  // Find page in document's children (pages are at document level, not in current page)
  const page = Array.from(figma.root.children).find(child => child.id === pageId) as PageNode;
  if (!page) {
    throw new Error(`Page ${pageId} not found`);
  }

  if (page.type !== 'PAGE') {
    throw new Error(`Node ${pageId} is not a page`);
  }

  const document = figma.root;
  const pages = Array.from(document.children);
  const currentIndex = pages.indexOf(page);
  const newIndex = Math.max(0, Math.min(params.newIndex, pages.length - 1));

  if (currentIndex === newIndex) {
    return {
      operation: 'reorder',
      pageId: pageId,
      name: page.name,
      currentIndex,
      newIndex,
      message: `Page "${page.name}" is already at index ${newIndex}`
    };
  }

  // Reorder by inserting at new position
  document.insertChild(newIndex, page);

  return {
    operation: 'reorder',
    pageId: pageId,
    name: page.name,
    currentIndex,
    newIndex,
    message: `Reordered page "${page.name}" from index ${currentIndex} to ${newIndex}`
  };
}

async function createPageDivider(params: any): Promise<any> {
  const name = params.name || '---';
  
  try {
    // Create new page divider
    const divider = figma.createPageDivider(name);

    // Set insert position if specified
    if (params.insertIndex !== undefined) {
      const document = figma.root;
      const targetIndex = Math.max(0, Math.min(params.insertIndex, document.children.length));
      document.insertChild(targetIndex, divider);
    }

    const insertIndex = Array.from(figma.root.children).indexOf(divider);

    return {
      operation: 'create_divider',
      pageId: divider.id,
      name: divider.name,
      type: divider.type,
      isPageDivider: divider.isPageDivider,
      index: insertIndex,
      message: `Created page divider "${divider.name}" at position ${insertIndex}`
    };
  } catch (error) {
    // Handle Figma plan limitations
    if (error.toString().includes('Limited to 3 pages only')) {
      throw new Error('Cannot create page divider: Your Figma plan is limited to 3 pages. Upgrade to a paid plan to create more pages.');
    }
    throw error;
  }
}

async function applyPageProperties(page: PageNode, params: any): Promise<void> {
  // Apply flattened background properties using FigmaPropertyManager
  if (params.backgroundColor || params.backgroundOpacity !== undefined) {
    modifyBackgrounds(page, manager => {
      // Ensure we have at least one background
      if (manager.length === 0 || manager.get(0)?.type !== 'SOLID') {
        // Create new solid background
        const newBackground: SolidPaint = {
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1 }, // Default white
          opacity: 1
        };
        
        if (manager.length === 0) {
          manager.push(newBackground);
        } else {
          manager.update(0, newBackground);
        }
      }

      // Get current background and create modified version
      const currentBg = manager.get(0) as SolidPaint;
      const updatedBg: SolidPaint = {
        type: 'SOLID',
        color: currentBg.color,
        opacity: currentBg.opacity
      };

      // Apply color change if provided
      if (params.backgroundColor) {
        const hex = params.backgroundColor.replace('#', '');
        updatedBg.color = {
          r: parseInt(hex.substr(0, 2), 16) / 255,
          g: parseInt(hex.substr(2, 2), 16) / 255,
          b: parseInt(hex.substr(4, 2), 16) / 255
        };
      }
      
      // Apply opacity change if provided
      if (params.backgroundOpacity !== undefined) {
        updatedBg.opacity = params.backgroundOpacity;
      }
      
      // Update the first background with the modified version
      manager.update(0, updatedBg);
    });
  }

  // Apply flattened prototype background properties using FigmaPropertyManager
  if (params.prototypeBackgroundColor || params.prototypeBackgroundOpacity !== undefined) {
    modifyPrototypeBackgrounds(page, manager => {
      // Ensure we have at least one prototype background
      if (manager.length === 0 || manager.get(0)?.type !== 'SOLID') {
        // Create new solid prototype background
        const newBackground: SolidPaint = {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 }, // Default black for prototype
          opacity: 1
        };
        
        if (manager.length === 0) {
          manager.push(newBackground);
        } else {
          manager.update(0, newBackground);
        }
      }

      // Get current background and create modified version
      const currentBg = manager.get(0) as SolidPaint;
      const updatedBg: SolidPaint = {
        type: 'SOLID',
        color: currentBg.color,
        opacity: currentBg.opacity
      };

      // Apply color change if provided
      if (params.prototypeBackgroundColor) {
        const hex = params.prototypeBackgroundColor.replace('#', '');
        updatedBg.color = {
          r: parseInt(hex.substr(0, 2), 16) / 255,
          g: parseInt(hex.substr(2, 2), 16) / 255,
          b: parseInt(hex.substr(4, 2), 16) / 255
        };
      }
      
      // Apply opacity change if provided
      if (params.prototypeBackgroundOpacity !== undefined) {
        updatedBg.opacity = params.prototypeBackgroundOpacity;
      }
      
      // Update the first prototype background with the modified version
      manager.update(0, updatedBg);
    });
  }

  // Apply flattened guide properties
  if (params.guideAxis && params.guideOffset !== undefined) {
    const guides = [...page.guides];
    const axis = params.guideAxis.toUpperCase();
    
    guides.push({
      axis: axis as 'X' | 'Y',
      offset: params.guideOffset
    });
    
    page.guides = guides;
  }

  // Apply complex properties if provided
  if (params.backgrounds) {
    page.backgrounds = params.backgrounds;
  }
  
  if (params.prototypeBackgrounds) {
    page.prototypeBackgrounds = params.prototypeBackgrounds;
  }
  
  if (params.guides) {
    page.guides = params.guides;
  }
  
  if (params.flowStartingPoints) {
    page.flowStartingPoints = params.flowStartingPoints;
  }
}