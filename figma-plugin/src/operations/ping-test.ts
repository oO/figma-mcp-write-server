// Global constant injected at build time
declare const PLUGIN_VERSION: string;

import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';

/**
 * Handle PING_TEST operation - simple connectivity test
 */
export async function handlePingTest(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('pingTest', params, async () => {
    const startTime = params.timestamp || Date.now();
    const responseTime = Date.now() - startTime;
    
    return {
      pong: true,
      roundTripTime: responseTime,
      pluginVersion: PLUGIN_VERSION,
      timestamp: Date.now()
    };
  });
}