import { ManageImagesSchema, ToolHandler, ToolResult, Tool, ManageImages, ScaleMode, FitStrategy, ImageFilters } from '../types/index.js';
import * as yaml from 'js-yaml';

export class ImageHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'manage_images',
        description: 'Comprehensive image management for Figma - create, replace, filter, and transform images applied as ImagePaint fills to shapes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: [
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
              ],
              description: 'Type of image operation to perform'
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              description: 'URL of image to load (for create_from_url, replace operations)'
            },
            imageBytes: {
              type: 'string',
              description: 'Base64 encoded image data (for create_from_bytes, replace operations)'
            },
            nodeId: {
              type: 'string',
              description: 'Target node ID for operations'
            },
            createNode: {
              type: 'boolean',
              default: false,
              description: 'Create a new rectangle if no nodeId provided'
            },
            nodeWidth: {
              type: 'number',
              minimum: 1,
              description: 'Width for new rectangle (auto-detected from image if not provided)'
            },
            nodeHeight: {
              type: 'number',
              minimum: 1,
              description: 'Height for new rectangle (auto-detected from image if not provided)'
            },
            scaleMode: {
              type: 'string',
              enum: ['FILL', 'FIT', 'CROP', 'TILE'],
              description: 'How image fits within the node bounds'
            },
            imageTransform: {
              type: 'array',
              items: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              minItems: 2,
              maxItems: 2,
              description: '2x3 transform matrix for CROP mode positioning'
            },
            rotation: {
              type: 'number',
              enum: [0, 90, 180, 270],
              default: 0,
              description: 'Image rotation in degrees (90° increments)'
            },
            filters: {
              type: 'object',
              properties: {
                exposure: { type: 'number', minimum: -1, maximum: 1 },
                contrast: { type: 'number', minimum: -1, maximum: 1 },
                saturation: { type: 'number', minimum: -1, maximum: 1 },
                temperature: { type: 'number', minimum: -1, maximum: 1 },
                tint: { type: 'number', minimum: -1, maximum: 1 },
                highlights: { type: 'number', minimum: -1, maximum: 1 },
                shadows: { type: 'number', minimum: -1, maximum: 1 }
              },
              description: 'Image color adjustment filters (values from -1.0 to +1.0)'
            },
            replaceImageUrl: {
              type: 'string',
              format: 'uri',
              description: 'New image URL for replacement operations'
            },
            replaceImageBytes: {
              type: 'string',
              description: 'New image data for replacement operations'
            },
            fitStrategy: {
              type: 'string',
              enum: ['preserve_container', 'preserve_aspect', 'smart_crop', 'letterbox'],
              default: 'preserve_container',
              description: 'Strategy for smart image replacement'
            },
            alignmentX: {
              type: 'string',
              enum: ['left', 'center', 'right'],
              default: 'center',
              description: 'Horizontal alignment for smart positioning'
            },
            alignmentY: {
              type: 'string',
              enum: ['top', 'center', 'bottom'],
              default: 'center',
              description: 'Vertical alignment for smart positioning'
            },
            maxResize: {
              type: 'number',
              minimum: 0.1,
              maximum: 5,
              default: 1.5,
              description: 'Maximum resize ratio for smart fitting (e.g., 1.2 = 120%)'
            },
            minResize: {
              type: 'number',
              minimum: 0.1,
              maximum: 5,
              default: 0.5,
              description: 'Minimum resize ratio for smart fitting (e.g., 0.8 = 80%)'
            },
            respectAutoLayout: {
              type: 'boolean',
              default: true,
              description: 'Respect auto layout constraints during smart replacement'
            },
            opacity: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              default: 1,
              description: 'Image paint opacity'
            },
            blendMode: {
              type: 'string',
              description: 'Paint blend mode'
            },
            visible: {
              type: 'boolean',
              default: true,
              description: 'Paint visibility'
            },
            x: {
              type: 'number',
              default: 0,
              description: 'X position for new nodes'
            },
            y: {
              type: 'number',
              default: 0,
              description: 'Y position for new nodes'
            },
            sourceNodeId: {
              type: 'string',
              description: 'Source node ID for clone operation'
            },
            targetNodeId: {
              type: 'string',
              description: 'Target node ID for clone operation'
            },
            preserveFilters: {
              type: 'boolean',
              default: true,
              description: 'Preserve image filters when cloning'
            },
            imageHash: {
              type: 'string',
              description: 'Hash of existing image for apply_to_node operation'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create_from_url", "imageUrl": "https://picsum.photos/400/300", "createNode": true, "scaleMode": "FILL"}',
          '{"operation": "replace_image", "nodeId": "123:456", "replaceImageUrl": "https://example.com/new-image.jpg"}',
          '{"operation": "smart_replace", "nodeId": "123:456", "replaceImageUrl": "https://example.com/hero.jpg", "fitStrategy": "smart_crop", "alignmentX": "center"}',
          '{"operation": "update_filters", "nodeId": "123:456", "filters": {"exposure": 0.2, "contrast": 0.1, "saturation": -0.3}}',
          '{"operation": "clone_image", "sourceNodeId": "123:456", "targetNodeId": "789:012", "preserveFilters": true}'
        ]
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    if (name !== 'manage_images') {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const validatedArgs = ManageImagesSchema.parse(args);
      const result = await this.handleImageOperation(validatedArgs);

      return {
        content: [
          {
            type: 'text',
            text: yaml.dump(result, { indent: 2, lineWidth: 100 }),
          },
        ],
        isError: false,
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: yaml.dump({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: args.operation || 'unknown'
            }, { indent: 2 }),
          },
        ],
        isError: true,
      };
    }
  }

  private async handleImageOperation(params: ManageImages): Promise<any> {
    const request = {
      type: 'MANAGE_IMAGES',
      payload: params,
    };

    const response = await this.sendToPlugin(request);

    if (!response.success) {
      throw new Error(response.error || 'Image operation failed');
    }

    return response.data;
  }

  // Helper methods for smart fitting calculations
  private calculateOptimalFit(
    containerDimensions: { width: number; height: number },
    imageDimensions: { width: number; height: number },
    strategy: FitStrategy
  ): {
    scaleMode: ScaleMode;
    newWidth?: number;
    newHeight?: number;
    resize?: boolean;
  } {
    const containerAspect = containerDimensions.width / containerDimensions.height;
    const imageAspect = imageDimensions.width / imageDimensions.height;
    const aspectDiff = Math.abs(imageAspect - containerAspect);

    switch (strategy) {
      case 'preserve_container':
        // Choose the best scale mode based on aspect ratios
        if (aspectDiff < 0.1) {
          return { scaleMode: 'FILL', resize: false };
        }
        return { scaleMode: imageAspect > containerAspect ? 'CROP' : 'FIT', resize: false };

      case 'preserve_aspect':
        // Resize container to match image aspect ratio
        const widthBasedHeight = containerDimensions.width / imageAspect;
        const heightBasedWidth = containerDimensions.height * imageAspect;
        
        const widthChange = Math.abs(heightBasedWidth - containerDimensions.width);
        const heightChange = Math.abs(widthBasedHeight - containerDimensions.height);

        if (widthChange < heightChange) {
          return {
            scaleMode: 'FILL',
            newWidth: heightBasedWidth,
            newHeight: containerDimensions.height,
            resize: true
          };
        } else {
          return {
            scaleMode: 'FILL',
            newWidth: containerDimensions.width,
            newHeight: widthBasedHeight,
            resize: true
          };
        }

      case 'smart_crop':
        return { scaleMode: 'CROP', resize: false };

      case 'letterbox':
        return { scaleMode: 'FIT', resize: false };

      default:
        return { scaleMode: 'FILL', resize: false };
    }
  }

  private calculateSmartCropTransform(
    containerDimensions: { width: number; height: number },
    imageDimensions: { width: number; height: number },
    alignmentX: 'left' | 'center' | 'right',
    alignmentY: 'top' | 'center' | 'bottom'
  ): number[][] {
    // Calculate scale factor to fill container
    const scaleX = containerDimensions.width / imageDimensions.width;
    const scaleY = containerDimensions.height / imageDimensions.height;
    const scale = Math.max(scaleX, scaleY);

    // Calculate scaled image dimensions
    const scaledWidth = imageDimensions.width * scale;
    const scaledHeight = imageDimensions.height * scale;

    // Calculate offset based on alignment
    let offsetX = 0;
    let offsetY = 0;

    switch (alignmentX) {
      case 'left':
        offsetX = 0;
        break;
      case 'center':
        offsetX = (containerDimensions.width - scaledWidth) / 2;
        break;
      case 'right':
        offsetX = containerDimensions.width - scaledWidth;
        break;
    }

    switch (alignmentY) {
      case 'top':
        offsetY = 0;
        break;
      case 'center':
        offsetY = (containerDimensions.height - scaledHeight) / 2;
        break;
      case 'bottom':
        offsetY = containerDimensions.height - scaledHeight;
        break;
    }

    // Return 2x3 transform matrix [scaleX, skewX, translateX], [skewY, scaleY, translateY]
    return [
      [scale, 0, offsetX / containerDimensions.width],
      [0, scale, offsetY / containerDimensions.height]
    ];
  }

  private validateImageFilters(filters: ImageFilters): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (typeof value === 'number' && (value < -1 || value > 1)) {
        throw new Error(`Filter ${key} value ${value} is out of range [-1, 1]`);
      }
    }
    return true;
  }

  private validateImageFormat(imageUrl: string): boolean {
    const supportedFormats = ['.png', '.jpg', '.jpeg', '.gif'];
    const extension = imageUrl.toLowerCase().split('.').pop();
    
    if (!extension || !supportedFormats.some(format => format.includes(extension))) {
      throw new Error(`Unsupported image format. Supported formats: ${supportedFormats.join(', ')}`);
    }
    
    return true;
  }
}