import { cleanEmptyPropertiesAsync } from './node-utils.js';

/**
 * Creates a standardized response for fill operations
 * @param nodeId - The node ID
 * @param fillIndex - Optional fill index
 * @param updatedFill - Optional updated fill object
 * @param totalFills - Optional total fill count
 * @param additionalData - Optional additional response data
 * @returns Formatted response object
 */
export async function createFillOperationResponse(
  nodeId: string,
  fillIndex?: number,
  updatedFill?: Paint,
  totalFills?: number,
  additionalData?: Record<string, any>
): Promise<any> {
  const baseResponse = {
    nodeId,
    ...(fillIndex !== undefined && { fillIndex }),
    ...(updatedFill && { updatedFill }),
    ...(totalFills !== undefined && { totalFills }),
    ...additionalData
  };
  
  return await cleanEmptyPropertiesAsync(baseResponse) || baseResponse;
}

/**
 * Creates a standardized response for list operations
 * @param nodeId - The node ID
 * @param fills - Array of fills
 * @param filteredCount - Optional count of filtered results
 * @param filterType - Optional filter type applied
 * @returns Formatted list response
 */
export async function createFillListResponse(
  nodeId: string,
  fills: Paint[],
  filteredCount?: number,
  filterType?: string
): Promise<any> {
  const response = {
    nodeId,
    fills,
    totalFills: fills.length,
    ...(filteredCount !== undefined && { filteredCount }),
    ...(filterType && { filterType })
  };
  
  return await cleanEmptyPropertiesAsync(response) || response;
}

/**
 * Creates a standardized response for add operations
 * @param nodeId - The node ID
 * @param fillAdded - The added fill object
 * @param insertIndex - The index where fill was inserted
 * @param totalFills - Total fill count after addition
 * @returns Formatted add response
 */
export async function createFillAddResponse(
  nodeId: string,
  fillAdded: Paint,
  insertIndex: number,
  totalFills: number
): Promise<any> {
  const response = {
    nodeId,
    fillAdded,
    insertIndex,
    totalFills
  };
  
  return await cleanEmptyPropertiesAsync(response) || response;
}

/**
 * Creates a standardized response for update operations
 * @param nodeId - The node ID
 * @param fillIndex - The updated fill index
 * @param updatedFill - The updated fill object
 * @param totalFills - Total fill count
 * @returns Formatted update response
 */
export async function createFillUpdateResponse(
  nodeId: string,
  fillIndex: number,
  updatedFill: Paint,
  totalFills: number
): Promise<any> {
  return createFillOperationResponse(nodeId, fillIndex, updatedFill, totalFills);
}

/**
 * Creates a standardized response for delete operations
 * @param nodeId - The node ID
 * @param fillIndex - The deleted fill index
 * @param totalFills - Total fill count after deletion
 * @returns Formatted delete response
 */
export async function createFillDeleteResponse(
  nodeId: string,
  fillIndex: number,
  totalFills: number
): Promise<any> {
  const response = {
    nodeId,
    fillIndex,
    deletedFill: true,
    totalFills
  };
  
  return await cleanEmptyPropertiesAsync(response) || response;
}