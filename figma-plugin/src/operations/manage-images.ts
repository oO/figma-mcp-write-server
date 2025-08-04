import { logger } from '../logger.js';
import { 
  getImageMimeType, 
  generateImageFilename, 
  formatMcpImageContent,
  getPngColorType,
  formatFileSize
} from '../utils/export-utils.js';
import { createImageFromUrl, createImageFromBytes } from '../utils/color-utils.js';

interface ImageInfo {
  imageHash: string;
  width?: number;
  height?: number;
  size?: string;  // Human-readable size
  colorType?: string;
  usedBy?: {
    nodeIds?: string[];
    styleIds?: string[];
  };
}

/**
 * Traverse nodes to find all image usage
 */
async function findImageUsage(
  root: PageNode | SceneNode,
  imageMap: Map<string, ImageInfo>,
  includeUsedBy: boolean,
  filterByHash?: string[],
  filterByNode?: string[]
): Promise<void> {
  const nodesToProcess: Array<PageNode | SceneNode> = [root];
  
  while (nodesToProcess.length > 0) {
    const node = nodesToProcess.pop()!;
    
    // Skip if filtering by node and this isn't in the filter
    if (filterByNode && filterByNode.length > 0 && !filterByNode.includes(node.id)) {
      // Still need to process children though
      if ('children' in node) {
        nodesToProcess.push(...node.children);
      }
      continue;
    }
    
    // Check fills for images
    if ('fills' in node && Array.isArray(node.fills)) {
      for (let index = 0; index < node.fills.length; index++) {
        const fill = node.fills[index];
        if (fill.type === 'IMAGE' && fill.imageHash) {
          // Skip if filtering by hash and this isn't in the filter
          if (filterByHash && filterByHash.length > 0 && !filterByHash.includes(fill.imageHash)) {
            continue;
          }
          
          if (!imageMap.has(fill.imageHash)) {
            imageMap.set(fill.imageHash, {
              imageHash: fill.imageHash,
              usedBy: includeUsedBy ? { nodeIds: [], styleIds: [] } : undefined
            });
          }
          
          if (includeUsedBy) {
            const imageInfo = imageMap.get(fill.imageHash)!;
            if (!imageInfo.usedBy) {
              imageInfo.usedBy = { nodeIds: [], styleIds: [] };
            }
            if (!imageInfo.usedBy.nodeIds) {
              imageInfo.usedBy.nodeIds = [];
            }
            if (!imageInfo.usedBy.nodeIds.includes(node.id)) {
              imageInfo.usedBy.nodeIds.push(node.id);
            }
          }
        }
      }
    }
    
    // Check strokes for images
    if ('strokes' in node && Array.isArray(node.strokes)) {
      for (let index = 0; index < node.strokes.length; index++) {
        const stroke = node.strokes[index];
        if (stroke.type === 'IMAGE' && stroke.imageHash) {
          // Skip if filtering by hash and this isn't in the filter
          if (filterByHash && filterByHash.length > 0 && !filterByHash.includes(stroke.imageHash)) {
            continue;
          }
          
          if (!imageMap.has(stroke.imageHash)) {
            imageMap.set(stroke.imageHash, {
              imageHash: stroke.imageHash,
              usedBy: includeUsedBy ? { nodeIds: [], styleIds: [] } : undefined
            });
          }
          
          if (includeUsedBy) {
            const imageInfo = imageMap.get(stroke.imageHash)!;
            if (!imageInfo.usedBy) {
              imageInfo.usedBy = { nodeIds: [], styleIds: [] };
            }
            if (!imageInfo.usedBy.nodeIds) {
              imageInfo.usedBy.nodeIds = [];
            }
            if (!imageInfo.usedBy.nodeIds.includes(node.id)) {
              imageInfo.usedBy.nodeIds.push(node.id);
            }
          }
        }
      }
    }
    
    // Process children
    if ('children' in node) {
      nodesToProcess.push(...node.children);
    }
  }
}

/**
 * Find images used in styles
 */
async function findStyleImageUsage(
  imageMap: Map<string, ImageInfo>,
  includeUsedBy: boolean,
  filterByHash?: string[]
): Promise<void> {
  if (!includeUsedBy) return;
  
  // Check paint styles
  const paintStyles = await figma.getLocalPaintStylesAsync();
  for (const style of paintStyles) {
    if (style.paints) {
      for (const paint of style.paints) {
        if (paint.type === 'IMAGE' && paint.imageHash) {
          // Skip if filtering by hash and this isn't in the filter
          if (filterByHash && filterByHash.length > 0 && !filterByHash.includes(paint.imageHash)) {
            continue;
          }
          
          if (!imageMap.has(paint.imageHash)) {
            imageMap.set(paint.imageHash, {
              imageHash: paint.imageHash,
              usedBy: { nodeIds: [], styleIds: [] }
            });
          }
          
          const imageInfo = imageMap.get(paint.imageHash)!;
          if (!imageInfo.usedBy) {
            imageInfo.usedBy = { nodeIds: [], styleIds: [] };
          }
          if (!imageInfo.usedBy.styleIds) {
            imageInfo.usedBy.styleIds = [];
          }
          if (!imageInfo.usedBy.styleIds.includes(style.id)) {
            imageInfo.usedBy.styleIds.push(style.id);
          }
        }
      }
    }
  }
}

/**
 * Get metadata for images
 */
async function getImageMetadata(imageMap: Map<string, ImageInfo>, includeColorType: boolean = false): Promise<void> {
  for (const [imageHash, info] of imageMap) {
    try {
      const image = figma.getImageByHash(imageHash);
      if (image) {
        // Get dimensions
        const size = await image.getSizeAsync();
        info.width = size.width;
        info.height = size.height;
        
        // Get PNG color type and actual size for detailed requests (get operation)
        if (includeColorType) {
          try {
            const imageBytes = await image.getBytesAsync();
            info.colorType = getPngColorType(imageBytes);
            info.size = formatFileSize(imageBytes.length); // Human-readable size
          } catch (bytesError) {
            logger.debug(`Failed to analyze image for ${imageHash}:`, bytesError);
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to get metadata for image ${imageHash}:`, error);
    }
  }
}

/**
 * Clean up image info by removing empty arrays
 */
function cleanupImageInfo(info: ImageInfo): any {
  const result: any = {
    imageHash: info.imageHash
  };
  
  // Add usedBy only if it has content
  if (info.usedBy) {
    const usedBy: any = {};
    if (info.usedBy.nodeIds && info.usedBy.nodeIds.length > 0) {
      usedBy.nodeIds = info.usedBy.nodeIds;
    }
    if (info.usedBy.styleIds && info.usedBy.styleIds.length > 0) {
      usedBy.styleIds = info.usedBy.styleIds;
    }
    if (Object.keys(usedBy).length > 0) {
      result.usedBy = usedBy;
    }
  }
  
  // Add metadata if available
  if (info.width !== undefined) result.width = info.width;
  if (info.height !== undefined) result.height = info.height;
  if (info.size !== undefined) result.size = info.size;
  if (info.colorType !== undefined) result.colorType = info.colorType;
  
  return result;
}

/**
 * Create a single image node from URL, bytes, or existing hash
 */
async function createSingleImage(params: {
  url?: string;
  imageBytes?: string;
  imageHash?: string;
  x?: number;
  y?: number;
  name?: string;
}): Promise<any> {
  const { url, imageBytes, imageHash, x, y, name } = params;
  
  try {
    // Validate imageHash if provided
    if (imageHash) {
      logger.debug('🔍 Validating imageHash:', imageHash);
      const testImage = figma.getImageByHash(imageHash);
      if (!testImage) {
        throw new Error(`Image hash not found in current Figma file: ${imageHash}`);
      }
      logger.debug('✅ imageHash validation passed');
    }
    // Step 1: Create small rectangle first
    const { MANAGE_NODES } = await import('./manage-nodes.js');
    const nodeParams: any = {
      operation: 'create_rectangle',
      width: 10,
      height: 10,
      name: name || 'Image'
    };
    
    // Only include x,y if explicitly provided to enable smart positioning
    if (x !== undefined) nodeParams.x = x;
    if (y !== undefined) nodeParams.y = y;
    
    const nodeResult = await MANAGE_NODES(nodeParams);
    
    if (!nodeResult.results || nodeResult.results.length === 0 || nodeResult.results[0].error) {
      throw new Error('Failed to create rectangle node');
    }
    
    const createdNode = nodeResult.results[0];
    
    // Step 2: Delegate image processing to figma_fills
    const { MANAGE_FILLS } = await import('./manage-fills.js');
    let fillParams: any = {
      operation: 'add_image',
      nodeId: createdNode.id,
      imageScaleMode: 'FILL'
    };
    
    if (url) {
      fillParams.imageUrl = url;
    } else if (imageBytes) {
      fillParams.imageBytes = imageBytes;
    } else {
      fillParams.imageHash = imageHash;
    }
    
    const fillResult = await MANAGE_FILLS(fillParams);
    
    if (!fillResult.results || fillResult.results.length === 0 || fillResult.results[0].error) {
      throw new Error('Failed to add image fill');
    }
    
    // Step 3: Update node dimensions to match image
    // Get dimensions from fill result if available, otherwise from image
    let dimensions: { width: number; height: number };
    
    if (fillResult.imageDimensions) {
      dimensions = fillResult.imageDimensions;
    } else {
      // Extract from node's image fill
      const node = figma.getNodeById(createdNode.id) as RectangleNode;
      const imageFill = node.fills[0] as ImagePaint;
      const image = figma.getImageByHash(imageFill.imageHash!);
      dimensions = await image!.getSizeAsync();
    }
    
    // Update node size
    const updateResult = await MANAGE_NODES({
      operation: 'update',
      nodeId: createdNode.id,
      width: dimensions.width,
      height: dimensions.height,
      name: name || `Image ${fillResult.imageHash?.substring(0, 8) || 'Node'}`
    });
    
    if (!updateResult.results || updateResult.results[0]?.error) {
      logger.debug('Failed to update node dimensions, but image was created successfully');
    }
    
    // Get the final node for return data
    const rect = figma.getNodeById(createdNode.id);
    
    return {
      success: true,
      nodeId: createdNode.id,
      nodeName: rect?.name || name || 'Image',
      imageHash: fillResult.imageHash,
      width: dimensions.width,
      height: dimensions.height,
      position: { x: createdNode.x, y: createdNode.y },
      positionReason: createdNode.positionReason,
      message: `Created image node`
    };
  } catch (error) {
    throw new Error(`Failed to create image: ${error.toString()}`);
  }
}

export async function MANAGE_IMAGES(payload: any): Promise<any> {
  const {
    operation,
    pageId,
    imageHash,
    includeMetadata = true,
    includeUsage = true,
    filterByHash,
    filterByNode,
    format = 'DATA',
    outputDirectory,
    suffix
  } = payload;

  logger.log('🖼️ MANAGE_IMAGES operation:', operation);

  switch (operation) {
    case 'list': {
      // Get the target page
      let targetPage: PageNode;
      if (pageId) {
        const page = figma.root.children.find(p => p.id === pageId);
        if (!page) {
          throw new Error(`Page not found: ${pageId}`);
        }
        targetPage = page;
      } else {
        targetPage = figma.currentPage;
      }

      const imageMap = new Map<string, ImageInfo>();

      // Find all images WITH usage info for list operation
      await findImageUsage(targetPage, imageMap, includeUsage, filterByHash, filterByNode);
      
      // Also check styles for images
      if (!filterByNode || filterByNode.length === 0) {
        await findStyleImageUsage(imageMap, includeUsage, filterByHash);
      }

      // Get metadata if requested (no color type for list operation)
      if (includeMetadata) {
        await getImageMetadata(imageMap, false);
      }

      // Convert to array and clean up
      const images = Array.from(imageMap.values()).map(cleanupImageInfo);

      return {
        pageId: targetPage.id,
        pageName: targetPage.name,
        imageCount: images.length,
        images
      };
    }

    case 'get': {
      if (!imageHash) {
        throw new Error('imageHash is required for get operation');
      }

      // Get the target page
      let targetPage: PageNode;
      if (pageId) {
        const page = figma.root.children.find(p => p.id === pageId);
        if (!page) {
          throw new Error(`Page not found: ${pageId}`);
        }
        targetPage = page;
      } else {
        targetPage = figma.currentPage;
      }

      const imageMap = new Map<string, ImageInfo>();

      // Find usage for specific image hash
      await findImageUsage(targetPage, imageMap, includeUsage, [imageHash]);
      
      // Also check styles
      await findStyleImageUsage(imageMap, includeUsage, [imageHash]);

      // Get metadata if requested (include color type for get operation)
      if (includeMetadata) {
        await getImageMetadata(imageMap, true);
      }

      const imageInfo = imageMap.get(imageHash);
      if (!imageInfo) {
        throw new Error(`Image not found: ${imageHash}`);
      }

      return cleanupImageInfo(imageInfo);
    }

    case 'export': {
      if (!imageHash) {
        throw new Error('imageHash is required for export operation');
      }

      // Validate format
      if (!['DATA', 'PNG'].includes(format)) {
        throw new Error(`Unsupported format: ${format}. Images can only be exported as DATA or PNG. Use figma_exports tool for JPG/SVG/PDF conversion.`);
      }

      // Handle bulk export
      const hashesToExport = Array.isArray(imageHash) ? imageHash : [imageHash];
      
      // For single DATA format exports, return MCP image content directly
      if (hashesToExport.length === 1 && format === 'DATA') {
        const singleImageHash = hashesToExport[0];
        const image = figma.getImageByHash(singleImageHash);
        if (!image) {
          throw new Error(`Image not found: ${singleImageHash}`);
        }
        
        try {
          const imageBytes = await image.getBytesAsync();
          const base64Data = figma.base64Encode(imageBytes);
          return formatMcpImageContent(base64Data, 'PNG'); // Default to PNG MIME type for DATA
        } catch (error) {
          throw new Error(`Export failed: ${error.toString()}`);
        }
      }
      
      // Process bulk exports or file formats
      const results = [];
      for (const currentImageHash of hashesToExport) {
        const image = figma.getImageByHash(currentImageHash);
        if (!image) {
          results.push({
            imageHash: currentImageHash,
            success: false,
            error: `Image not found: ${currentImageHash}`
          });
          continue;
        }

        try {
          // Get the raw image bytes
          const imageBytes = await image.getBytesAsync();
          const base64Data = figma.base64Encode(imageBytes);
          const filename = generateImageFilename(currentImageHash, format, suffix);
          
          results.push({
            imageHash: currentImageHash,
            format: format,
            data: base64Data,
            dataFormat: 'base64',
            filename: filename,
            size: formatFileSize(imageBytes.length),
            sizeBytes: imageBytes.length,  // Keep raw bytes for server processing
            success: true,
            message: `Image data prepared for export`
          });
        } catch (error) {
          results.push({
            imageHash: currentImageHash,
            success: false,
            error: `Export failed: ${error.toString()}`
          });
        }
      }
      
      // Return array for bulk operations, single result for single operations
      return Array.isArray(imageHash) ? results : results[0];
    }

    case 'create': {
      const { url, imageBytes, imageHash, x, y, name } = payload;
      
      if (!url && !imageBytes && !imageHash) {
        throw new Error('Either url, imageBytes, or imageHash is required for create operation');
      }
      
      // Handle bulk create operation
      const isArraySource = Array.isArray(url) || Array.isArray(imageBytes) || Array.isArray(imageHash);
      const hasArrayParam = Array.isArray(x) || Array.isArray(y) || Array.isArray(name);
      const isBulkOperation = isArraySource || hasArrayParam;
      
      if (isBulkOperation) {
        // Determine the bulk size
        let bulkSize = 1;
        if (Array.isArray(url)) bulkSize = Math.max(bulkSize, url.length);
        if (Array.isArray(imageBytes)) bulkSize = Math.max(bulkSize, imageBytes.length);
        if (Array.isArray(imageHash)) bulkSize = Math.max(bulkSize, imageHash.length);
        if (Array.isArray(x)) bulkSize = Math.max(bulkSize, x.length);
        if (Array.isArray(y)) bulkSize = Math.max(bulkSize, y.length);
        if (Array.isArray(name)) bulkSize = Math.max(bulkSize, name.length);
        
        const results = [];
        
        for (let i = 0; i < bulkSize; i++) {
          try {
            // Extract parameters for this iteration
            const currentUrl = Array.isArray(url) ? url[i] : url;
            const currentImageBytes = Array.isArray(imageBytes) ? imageBytes[i] : imageBytes;
            const currentImageHash = Array.isArray(imageHash) ? imageHash[i] : imageHash;
            const currentX = Array.isArray(x) ? x[i] : x;
            const currentY = Array.isArray(y) ? y[i] : y;
            const currentName = Array.isArray(name) ? name[i] : name;
            
            // Skip if no image source for this iteration
            if (!currentUrl && !currentImageBytes && !currentImageHash) {
              results.push({
                success: false,
                index: i,
                error: 'No image source provided for this item'
              });
              continue;
            }
            
            const singleResult = await createSingleImage({
              url: currentUrl,
              imageBytes: currentImageBytes,
              imageHash: currentImageHash,
              x: currentX,
              y: currentY,
              name: currentName || `Image ${i + 1}`
            });
            
            results.push({
              ...singleResult,
              index: i
            });
            
          } catch (error) {
            results.push({
              success: false,
              index: i,
              error: `Failed to create image ${i + 1}: ${error.toString()}`
            });
          }
        }
        
        // Select all successfully created nodes
        const successfulNodes = results
          .filter(r => r.success && r.nodeId)
          .map(r => figma.getNodeById(r.nodeId))
          .filter(Boolean);
        
        if (successfulNodes.length > 0) {
          figma.currentPage.selection = successfulNodes;
          figma.viewport.scrollAndZoomIntoView(successfulNodes);
        }
        
        return results;
      } else {
        // Single create operation
        return await createSingleImage({ url, imageBytes, imageHash, x, y, name });
      }
    }

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}