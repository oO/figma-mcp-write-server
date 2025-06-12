import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler, ToolResult } from '../types/index.js';
import * as yaml from 'js-yaml';
import { 
  ManageAnnotationsSchema, 
  ManageMeasurementsSchema,
  ManageDevResourcesSchema
} from '../types/schemas.js';
import { validateAndParse } from '../types/validation-utils.js';

export class DevModeHandlers implements ToolHandler {
  constructor(private sendToPlugin: (request: any) => Promise<any>) {}

  getTools(): Tool[] {
    return [
      {
        name: 'manage_annotations',
        description: 'Create and manage design annotations for dev handoff',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add_annotation', 'edit_annotation', 'remove_annotation', 'list_annotations'],
              description: 'Annotation operation to perform'
            },
            nodeId: {
              type: 'string',
              description: 'Node ID to annotate (required for add/edit operations)'
            },
            annotationId: {
              type: 'string',
              description: 'Annotation ID for edit/remove operations'
            },
            label: {
              type: 'string',
              description: 'Annotation label text'
            },
            labelMarkdown: {
              type: 'string',
              description: 'Annotation label with markdown formatting'
            },
            properties: {
              type: 'object',
              description: 'Custom properties for the annotation'
            },
            categoryId: {
              type: 'string',
              description: 'Category ID for grouping annotations'
            }
          },
          required: ['operation']
        }
      },
      {
        name: 'manage_measurements',
        description: 'Add and manage spacing/sizing measurements for design specs',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements'],
              description: 'Measurement operation to perform'
            },
            measurementId: {
              type: 'string',
              description: 'Measurement ID for edit/remove operations'
            },
            fromNodeId: {
              type: 'string',
              description: 'Source node for measurement'
            },
            toNodeId: {
              type: 'string',
              description: 'Target node for measurement'
            },
            direction: {
              type: 'string',
              enum: ['horizontal', 'vertical', 'distance'],
              description: 'Measurement direction'
            },
            label: {
              type: 'string',
              description: 'Custom label for the measurement'
            },
            customValue: {
              type: 'string',
              description: 'Custom value to display instead of calculated value'
            },
            pageId: {
              type: 'string',
              description: 'Page ID for listing measurements'
            }
          },
          required: ['operation']
        }
      },
      {
        name: 'manage_dev_resources',
        description: 'Generate CSS code and manage development resources and status',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['generate_css', 'set_dev_status', 'add_dev_link', 'remove_dev_link', 'get_dev_resources'],
              description: 'Dev resource operation to perform'
            },
            nodeId: {
              type: 'string',
              description: 'Node ID for CSS generation and status tracking'
            },
            status: {
              type: 'string',
              enum: ['ready_for_dev', 'in_progress', 'dev_complete'],
              description: 'Development status for the node'
            },
            linkUrl: {
              type: 'string',
              description: 'URL for development resource link'
            },
            linkTitle: {
              type: 'string',
              description: 'Title for development resource link'
            },
            linkId: {
              type: 'string',
              description: 'Link ID for remove operations'
            },
            cssOptions: {
              type: 'object',
              properties: {
                includeChildren: {
                  type: 'boolean',
                  default: false,
                  description: 'Include CSS for child nodes'
                },
                includeComments: {
                  type: 'boolean',
                  default: true,
                  description: 'Include descriptive comments in CSS'
                },
                useFlexbox: {
                  type: 'boolean',
                  default: true,
                  description: 'Use flexbox layout in generated CSS'
                }
              },
              description: 'Options for CSS generation'
            }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    switch (name) {
      case 'manage_annotations':
        return this.manageAnnotations(args);
      case 'manage_measurements':
        return this.manageMeasurements(args);
      case 'manage_dev_resources':
        return this.manageDevResources(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async manageAnnotations(params: any): Promise<ToolResult> {
    const validation = validateAndParse(ManageAnnotationsSchema, params, 'manageAnnotations');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const validated = validation.data;

    const response = await this.sendToPlugin({
      type: 'ANNOTATION_OPERATION',
      payload: validated
    });

    if (!response.success) {
      throw new Error(response.error || 'Annotation operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump({
          operation: 'annotation_operation',
          annotationType: validated.operation,
          result: response.data,
          message: `${validated.operation} completed successfully`
        }, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  private async manageMeasurements(params: any): Promise<ToolResult> {
    const validation = validateAndParse(ManageMeasurementsSchema, params, 'manageMeasurements');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const validated = validation.data;

    const response = await this.sendToPlugin({
      type: 'MEASUREMENT_OPERATION',
      payload: validated
    });

    if (!response.success) {
      throw new Error(response.error || 'Measurement operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump({
          operation: 'measurement_operation',
          measurementType: validated.operation,
          result: response.data,
          message: `${validated.operation} completed successfully`
        }, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  private async manageDevResources(params: any): Promise<ToolResult> {
    const validation = validateAndParse(ManageDevResourcesSchema, params, 'manageDevResources');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const validated = validation.data;

    const response = await this.sendToPlugin({
      type: 'DEV_RESOURCE_OPERATION',
      payload: validated
    });

    if (!response.success) {
      throw new Error(response.error || 'Dev resource operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump({
          operation: 'dev_resource_operation',
          resourceType: validated.operation,
          result: response.data,
          message: `${validated.operation} completed successfully`
        }, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }
}