import { BaseHandler } from './base-handler.js';
import { OperationResult, OperationHandler } from '../types.js';
import { findNodeById, formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';
import { createSuccessResponse } from '../utils/response-utils.js';

interface ImageParams {
  operation: string;
  imageUrl?: string;
  imageBytes?: string;
  nodeId?: string;
  createNode?: boolean;
  nodeWidth?: number;
  nodeHeight?: number;
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageTransform?: number[][];
  rotation?: 0 | 90 | 180 | 270;
  filterExposure?: number;
  filterContrast?: number;
  filterSaturation?: number;
  filterTemperature?: number;
  filterTint?: number;
  filterHighlights?: number;
  filterShadows?: number;
  replaceImageUrl?: string;
  replaceImageBytes?: string;
  fitStrategy?: 'preserve_container' | 'preserve_aspect' | 'smart_crop' | 'letterbox';
  alignmentX?: 'left' | 'center' | 'right';
  alignmentY?: 'top' | 'center' | 'bottom';
  maxResize?: number;
  minResize?: number;
  respectAutoLayout?: boolean;
  opacity?: number;
  blendMode?: string;
  visible?: boolean;
  x?: number;
  y?: number;
  sourceNodeId?: string;
  targetNodeId?: string;
  preserveFilters?: boolean;
  imageHash?: string;
}

export class ImageHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'ImageHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      MANAGE_IMAGES: (params) => this.manageImages(params)
    };
  }

  private async manageImages(params: ImageParams): Promise<OperationResult> {
    return this.executeOperation('manageImages', params, async () => {
      this.validateParams(params, ['operation']);
      
      const operation = this.validateStringParam(
        params.operation,
        'operation',
        [
          'create_from_url',
          'create_from_bytes',
          'apply_to_node',
          'replace_image',
          'smart_replace',
          'update_filters',
          'change_scale_mode',
          'rotate',
          'get_image_info',
          'extract_image',
          'clone_image'
        ]
      );

      switch (operation) {
        case 'create_from_url':
          return await this.createFromUrl(params);
        case 'create_from_bytes':
          return await this.createFromBytes(params);
        case 'apply_to_node':
          return await this.applyToNode(params);
        case 'replace_image':
          return await this.replaceImage(params);
        case 'smart_replace':
          return await this.smartReplace(params);
        case 'update_filters':
          return await this.updateFilters(params);
        case 'change_scale_mode':
          return await this.changeScaleMode(params);
        case 'rotate':
          return await this.rotateImage(params);
        case 'get_image_info':
          return await this.getImageInfo(params);
        case 'extract_image':
          return await this.extractImage(params);
        case 'clone_image':
          return await this.cloneImage(params);
        default:
          throw new Error(`Unknown image operation: ${operation}`);
      }
    });
  }

  private async createFromUrl(params: ImageParams): Promise<OperationResult> {
    if (!params.imageUrl) {
      throw new Error('imageUrl is required for create_from_url operation');
    }

    try {
      // Create image from URL
      const image = await figma.createImageAsync(params.imageUrl);
      const imageDimensions = await image.getSizeAsync();

      // Create or find target node
      let targetNode: RectangleNode;
      if (params.nodeId) {
        const node = findNodeById(params.nodeId);
        if (!node || !('fills' in node)) {
          throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
        }
        targetNode = node as RectangleNode;
      } else if (params.createNode) {
        targetNode = figma.createRectangle();
        targetNode.x = params.x || 0;
        targetNode.y = params.y || 0;
        targetNode.resize(
          params.nodeWidth || imageDimensions.width,
          params.nodeHeight || imageDimensions.height
        );
        figma.currentPage.appendChild(targetNode);
      } else {
        throw new Error('Either nodeId or createNode must be specified');
      }

      // Apply image as fill
      await this.applyImageToNode(targetNode, image, params);

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        imageHash: image.hash,
        imageDimensions,
        appliedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to create image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createFromBytes(params: ImageParams): Promise<OperationResult> {
    if (!params.imageBytes) {
      throw new Error('imageBytes is required for create_from_bytes operation');
    }

    try {
      // Convert base64 to Uint8Array
      const base64Data = params.imageBytes.replace(/^data:image\/[a-z]+;base64,/, '');
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create image from bytes
      const image = figma.createImage(bytes);
      const imageDimensions = await image.getSizeAsync();

      // Create or find target node
      let targetNode: RectangleNode;
      if (params.nodeId) {
        const node = findNodeById(params.nodeId);
        if (!node || !('fills' in node)) {
          throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
        }
        targetNode = node as RectangleNode;
      } else if (params.createNode) {
        targetNode = figma.createRectangle();
        targetNode.x = params.x || 0;
        targetNode.y = params.y || 0;
        targetNode.resize(
          params.nodeWidth || imageDimensions.width,
          params.nodeHeight || imageDimensions.height
        );
        figma.currentPage.appendChild(targetNode);
      } else {
        throw new Error('Either nodeId or createNode must be specified');
      }

      // Apply image as fill
      await this.applyImageToNode(targetNode, image, params);

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        imageHash: image.hash,
        imageDimensions,
        appliedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to create image from bytes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async applyToNode(params: ImageParams): Promise<OperationResult> {
    if (!params.imageHash || !params.nodeId) {
      throw new Error('imageHash and nodeId are required for apply_to_node operation');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      const image = figma.getImageByHash(params.imageHash);
      if (!image) {
        throw new Error(`Image with hash ${params.imageHash} not found`);
      }

      await this.applyImageToNode(node as RectangleNode, image, params);

      return createSuccessResponse({
        nodeId: node.id,
        nodeName: node.name,
        imageHash: image.hash,
        appliedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to apply image to node: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async replaceImage(params: ImageParams): Promise<OperationResult> {
    if (!params.nodeId) {
      throw new Error('nodeId is required for replace_image operation');
    }

    if (!params.replaceImageUrl && !params.replaceImageBytes) {
      throw new Error('Either replaceImageUrl or replaceImageBytes is required');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      // Create new image
      let newImage: Image;
      if (params.replaceImageUrl) {
        newImage = await figma.createImageAsync(params.replaceImageUrl);
      } else {
        const base64Data = params.replaceImageBytes!.replace(/^data:image\/[a-z]+;base64,/, '');
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        newImage = figma.createImage(bytes);
      }

      // Preserve existing container size and apply new image
      await this.applyImageToNode(node as RectangleNode, newImage, {
        ...params,
        scaleMode: params.scaleMode || 'FILL'
      });

      return createSuccessResponse({
        nodeId: node.id,
        nodeName: node.name,
        imageHash: newImage.hash,
        replacedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to replace image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async smartReplace(params: ImageParams): Promise<OperationResult> {
    // This is a simplified implementation - full smart fitting would require more complex logic
    return await this.replaceImage({
      ...params,
      scaleMode: this.getSmartScaleMode(params.fitStrategy || 'preserve_container')
    });
  }

  private async updateFilters(params: ImageParams): Promise<OperationResult> {
    if (!params.nodeId) {
      throw new Error('nodeId is required for update_filters operation');
    }
    
    const hasFilters = params.filterExposure !== undefined || 
                      params.filterContrast !== undefined || 
                      params.filterSaturation !== undefined || 
                      params.filterTemperature !== undefined || 
                      params.filterTint !== undefined || 
                      params.filterHighlights !== undefined || 
                      params.filterShadows !== undefined;
    
    if (!hasFilters) {
      throw new Error('At least one filter property is required for update_filters operation');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      const targetNode = node as RectangleNode;
      const fills = [...targetNode.fills];
      
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        if (fill.type === 'IMAGE' && fill.imageTransform) {
          fills[i] = {
            ...fill,
            filters: {
              exposure: params.filterExposure !== undefined ? params.filterExposure : (fill.filters?.exposure || 0),
              contrast: params.filterContrast !== undefined ? params.filterContrast : (fill.filters?.contrast || 0),
              saturation: params.filterSaturation !== undefined ? params.filterSaturation : (fill.filters?.saturation || 0),
              temperature: params.filterTemperature !== undefined ? params.filterTemperature : (fill.filters?.temperature || 0),
              tint: params.filterTint !== undefined ? params.filterTint : (fill.filters?.tint || 0),
              highlights: params.filterHighlights !== undefined ? params.filterHighlights : (fill.filters?.highlights || 0),
              shadows: params.filterShadows !== undefined ? params.filterShadows : (fill.filters?.shadows || 0),
            }
          };
        }
      }

      targetNode.fills = fills;

      const appliedFilters: any = {};
      if (params.filterExposure !== undefined) appliedFilters.exposure = params.filterExposure;
      if (params.filterContrast !== undefined) appliedFilters.contrast = params.filterContrast;
      if (params.filterSaturation !== undefined) appliedFilters.saturation = params.filterSaturation;
      if (params.filterTemperature !== undefined) appliedFilters.temperature = params.filterTemperature;
      if (params.filterTint !== undefined) appliedFilters.tint = params.filterTint;
      if (params.filterHighlights !== undefined) appliedFilters.highlights = params.filterHighlights;
      if (params.filterShadows !== undefined) appliedFilters.shadows = params.filterShadows;

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        filtersApplied: appliedFilters,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to update filters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async changeScaleMode(params: ImageParams): Promise<OperationResult> {
    if (!params.nodeId || !params.scaleMode) {
      throw new Error('nodeId and scaleMode are required for change_scale_mode operation');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      const targetNode = node as RectangleNode;
      const fills = [...targetNode.fills];
      
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        if (fill.type === 'IMAGE') {
          fills[i] = {
            ...fill,
            scaleMode: params.scaleMode,
            imageTransform: params.imageTransform || fill.imageTransform
          };
        }
      }

      targetNode.fills = fills;

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        scaleMode: params.scaleMode,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to change scale mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async rotateImage(params: ImageParams): Promise<OperationResult> {
    if (!params.nodeId || params.rotation === undefined) {
      throw new Error('nodeId and rotation are required for rotate operation');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      const targetNode = node as RectangleNode;
      const fills = [...targetNode.fills];
      
      // Calculate rotation transform matrix
      const angle = (params.rotation * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      for (let i = 0; i < fills.length; i++) {
        const fill = fills[i];
        if (fill.type === 'IMAGE') {
          fills[i] = {
            ...fill,
            imageTransform: [
              [cos, -sin, 0.5 - 0.5 * cos + 0.5 * sin],
              [sin, cos, 0.5 - 0.5 * sin - 0.5 * cos]
            ]
          };
        }
      }

      targetNode.fills = fills;

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        rotation: params.rotation,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to rotate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async getImageInfo(params: ImageParams): Promise<OperationResult> {
    if (!params.nodeId) {
      throw new Error('nodeId is required for get_image_info operation');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      const targetNode = node as RectangleNode;
      const imageFill = targetNode.fills.find(fill => fill.type === 'IMAGE') as ImagePaint;
      
      if (!imageFill) {
        throw new Error(`No image fill found on node ${params.nodeId}`);
      }

      const image = figma.getImageByHash(imageFill.imageHash);
      const imageDimensions = image ? await image.getSizeAsync() : { width: 0, height: 0 };

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        imageInfo: {
          hash: imageFill.imageHash,
          scaleMode: imageFill.scaleMode,
          rotation: this.getRotationFromTransform(imageFill.imageTransform),
          filters: imageFill.filters || {},
          dimensions: imageDimensions,
          opacity: imageFill.opacity,
          visible: imageFill.visible,
          blendMode: imageFill.blendMode
        }
      });

    } catch (error) {
      throw new Error(`Failed to get image info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractImage(params: ImageParams): Promise<OperationResult> {
    if (!params.nodeId) {
      throw new Error('nodeId is required for extract_image operation');
    }

    try {
      const node = findNodeById(params.nodeId);
      if (!node || !('fills' in node)) {
        throw new Error(`Node ${params.nodeId} not found or doesn't support fills`);
      }

      const targetNode = node as RectangleNode;
      const imageFill = targetNode.fills.find(fill => fill.type === 'IMAGE') as ImagePaint;
      
      if (!imageFill) {
        throw new Error(`No image fill found on node ${params.nodeId}`);
      }

      const image = figma.getImageByHash(imageFill.imageHash);
      if (!image) {
        throw new Error(`Image not found for hash ${imageFill.imageHash}`);
      }

      const imageBytes = await image.getBytesAsync();
      const base64Data = btoa(String.fromCharCode(...imageBytes));

      return createSuccessResponse({
        nodeId: targetNode.id,
        nodeName: targetNode.name,
        imageData: `data:image/png;base64,${base64Data}`,
        extractedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to extract image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async cloneImage(params: ImageParams): Promise<OperationResult> {
    if (!params.sourceNodeId) {
      throw new Error('sourceNodeId is required for clone_image operation');
    }

    if (!params.targetNodeId && !params.createNode) {
      throw new Error('Either targetNodeId or createNode must be specified');
    }

    try {
      const sourceNode = findNodeById(params.sourceNodeId);
      if (!sourceNode || !('fills' in sourceNode)) {
        throw new Error(`Source node ${params.sourceNodeId} not found or doesn't support fills`);
      }

      const sourceImageFill = (sourceNode as RectangleNode).fills.find(fill => fill.type === 'IMAGE') as ImagePaint;
      if (!sourceImageFill) {
        throw new Error(`No image fill found on source node ${params.sourceNodeId}`);
      }

      // Get or create target node
      let targetNode: RectangleNode;
      if (params.targetNodeId) {
        const node = findNodeById(params.targetNodeId);
        if (!node || !('fills' in node)) {
          throw new Error(`Target node ${params.targetNodeId} not found or doesn't support fills`);
        }
        targetNode = node as RectangleNode;
      } else {
        targetNode = figma.createRectangle();
        targetNode.resize(sourceNode.width, sourceNode.height);
        targetNode.x = params.x || 0;
        targetNode.y = params.y || 0;
        figma.currentPage.appendChild(targetNode);
      }

      // Clone the image fill
      const clonedFill: ImagePaint = {
        type: 'IMAGE',
        imageHash: sourceImageFill.imageHash,
        scaleMode: sourceImageFill.scaleMode,
        imageTransform: sourceImageFill.imageTransform,
        opacity: sourceImageFill.opacity,
        visible: sourceImageFill.visible,
        blendMode: sourceImageFill.blendMode
      };

      // Preserve filters if requested
      if (params.preserveFilters && sourceImageFill.filters) {
        clonedFill.filters = { ...sourceImageFill.filters };
      }

      targetNode.fills = [clonedFill];

      return createSuccessResponse({
        sourceNodeId: params.sourceNodeId,
        targetNodeId: targetNode.id,
        targetNodeName: targetNode.name,
        imageHash: sourceImageFill.imageHash,
        clonedAt: new Date().toISOString()
      });

    } catch (error) {
      throw new Error(`Failed to clone image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async applyImageToNode(node: RectangleNode, image: Image, params: ImageParams): Promise<void> {
    const imagePaint: ImagePaint = {
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: params.scaleMode || 'FILL',
      opacity: params.opacity || 1,
      visible: params.visible !== false,
      blendMode: (params.blendMode as BlendMode) || 'NORMAL'
    };

    // Apply transform matrix if provided (for CROP mode)
    if (params.imageTransform && params.scaleMode === 'CROP') {
      imagePaint.imageTransform = params.imageTransform;
    }

    // Apply filters if provided
    const hasFilters = params.filterExposure !== undefined || 
                      params.filterContrast !== undefined || 
                      params.filterSaturation !== undefined || 
                      params.filterTemperature !== undefined || 
                      params.filterTint !== undefined || 
                      params.filterHighlights !== undefined || 
                      params.filterShadows !== undefined;
    
    if (hasFilters) {
      imagePaint.filters = {
        exposure: params.filterExposure || 0,
        contrast: params.filterContrast || 0,
        saturation: params.filterSaturation || 0,
        temperature: params.filterTemperature || 0,
        tint: params.filterTint || 0,
        highlights: params.filterHighlights || 0,
        shadows: params.filterShadows || 0,
      };
    }

    // Apply rotation if specified
    if (params.rotation && params.rotation !== 0) {
      const angle = (params.rotation * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      imagePaint.imageTransform = [
        [cos, -sin, 0.5 - 0.5 * cos + 0.5 * sin],
        [sin, cos, 0.5 - 0.5 * sin - 0.5 * cos]
      ];
    }

    node.fills = [imagePaint];
  }

  private getSmartScaleMode(fitStrategy: string): 'FILL' | 'FIT' | 'CROP' | 'TILE' {
    switch (fitStrategy) {
      case 'preserve_container':
      case 'smart_crop':
        return 'FILL';
      case 'preserve_aspect':
        return 'FIT';
      case 'letterbox':
        return 'FIT';
      default:
        return 'FILL';
    }
  }

  private getRotationFromTransform(transform?: number[][]): number {
    if (!transform || transform.length !== 2 || transform[0].length !== 3) {
      return 0;
    }

    // Extract angle from transform matrix
    const cos = transform[0][0];
    const sin = transform[1][0];
    const angle = Math.atan2(sin, cos) * (180 / Math.PI);
    
    // Round to nearest 90 degrees
    return Math.round(angle / 90) * 90;
  }
}