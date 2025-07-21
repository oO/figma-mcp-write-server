import { Resource, ResourceContents } from '@modelcontextprotocol/sdk/types';

/**
 * Central registry for all MCP resources
 * Follows the same pattern as HandlerRegistry for tools
 * 
 * Note: Resource implementation is currently disabled due to MCP limitations:
 * - Resources must be manually loaded by users in Claude Desktop
 * - Full resource content is loaded as context, causing memory issues
 * - Architecture is kept for future use when these limitations are addressed
 */
export class ResourceRegistry {
  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    // Future resource providers will be initialized here
  }

  /**
   * Get all available resources
   */
  getResources(): Resource[] {
    // Currently returning empty array - resources disabled
    return [];
    
    // Future: Add resource providers here when limitations are resolved
    // allResources.push(...this.componentResourceProvider.getResources());
    // allResources.push(...this.styleResourceProvider.getResources());
  }

  /**
   * Get content for a specific resource URI
   */
  async getResourceContent(uri: string): Promise<ResourceContents> {
    // Future: Route to appropriate resource provider based on URI scheme
    // if (uri.startsWith('components://')) {
    //   return await this.componentResourceProvider.getResourceContent(uri);
    // }
    
    throw new Error(`No resources currently available. Resource URI: ${uri}`);
  }

  /**
   * Check if a resource URI is supported
   */
  isResourceSupported(uri: string): boolean {
    // Currently no resources are supported
    return false;
    
    // Future: return uri.startsWith('components://') || uri.startsWith('styles://');
  }
}