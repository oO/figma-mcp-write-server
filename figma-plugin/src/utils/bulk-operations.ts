/**
 * Handles errors in bulk operations with consistent failFast behavior
 * @param error - The error that occurred
 * @param nodeId - The node ID where the error occurred
 * @param params - Parameters containing failFast setting
 * @param results - Results array to append error to (if not failing fast)
 */
export function handleBulkError<T extends { nodeId: string }>(
  error: any, 
  nodeId: string, 
  params: { failFast?: boolean }, 
  results: T[]
): void {
  if (params.failFast !== false) {
    throw error;
  }
  results.push({
    nodeId,
    error: error.toString()
  } as T);
}

/**
 * Creates bulk operation result summary
 * @param results - Array of individual operation results
 * @param totalNodes - Total number of nodes processed
 * @returns Summary object with counts and results
 */
export function createBulkSummary<T extends { nodeId: string; error?: string }>(
  results: T[], 
  totalNodes: number
): {
  results: T[];
  totalNodes: number;
  processedNodes: number;
  successfulNodes: number;
  failedNodes: number;
} {
  const successfulNodes = results.filter(r => !r.error).length;
  const failedNodes = results.filter(r => r.error).length;
  
  return {
    results,
    totalNodes,
    processedNodes: results.length,
    successfulNodes,
    failedNodes
  };
}

/**
 * Processes bulk parameters by distributing single values across multiple operations
 * @param params - Parameters object that may contain arrays or single values
 * @param nodeIds - Array of node IDs to process
 * @param bulkParamKeys - Keys that should be treated as bulk parameters
 * @returns Array of parameter objects, one per node
 */
export function distributeBulkParams(
  params: any,
  nodeIds: string[],
  bulkParamKeys: string[]
): any[] {
  const nodeCount = nodeIds.length;
  const distributedParams: any[] = [];
  
  for (let i = 0; i < nodeCount; i++) {
    const nodeParams = { ...params, nodeId: nodeIds[i] };
    
    // Distribute bulk parameters
    for (const key of bulkParamKeys) {
      if (params[key] !== undefined) {
        if (Array.isArray(params[key])) {
          // Use corresponding array element or last element if array is shorter
          const arrayIndex = Math.min(i, params[key].length - 1);
          nodeParams[key] = params[key][arrayIndex];
        }
        // Single values are automatically used for all nodes
      }
    }
    
    distributedParams.push(nodeParams);
  }
  
  return distributedParams;
}