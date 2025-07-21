// Global constant injected at build time
declare const PLUGIN_VERSION: string;

import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';

/**
 * Handle PLUGIN_STATUS operation - get Figma API environment information
 */
export async function handlePluginStatus(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('pluginStatus', params, async () => {
    const { operation } = params;
    
    switch (operation) {
      case 'figma_info':
        const result: any = {
          pluginId: figma.pluginId,
          apiVersion: figma.apiVersion,
          editorType: figma.editorType,
          mode: figma.mode,
          pluginVersion: PLUGIN_VERSION
        };

        // File/Document Properties
        try {
          // fileKey requires enablePrivatePluginApi
          const fileKey = figma.fileKey;
          if (fileKey !== undefined && fileKey !== null) {
            result.fileKey = fileKey;
          }
        } catch (error) {
          // Silent fail
        }

        try {
          // figma.root is DocumentNode and has .name property
          if (figma.root && figma.root.name) {
            result.fileName = figma.root.name;
          }
        } catch (error) {
          // Silent fail
        }

        try {
          const currentPage = figma.currentPage;
          if (currentPage) {
            result.currentPage = {
              name: currentPage.name,
              id: currentPage.id
            };
          }
        } catch (error) {
          // Silent fail
        }

        // User Properties (permission-dependent)
        try {
          const currentUser = figma.currentUser;
          if (currentUser !== undefined && currentUser !== null) {
            result.currentUser = currentUser;
          }
        } catch (error) {
          // Silent fail
        }

        // Payment Status (indicates if user has paid for this plugin)
        try {
          const paymentStatus = figma.payments.status;
          if (paymentStatus) {
            result.paymentStatus = {
              type: paymentStatus.type,
              isPaid: paymentStatus.type === 'PAID',
              note: paymentStatus.type === 'NOT_SUPPORTED' ? 'Payment status could not be determined' : undefined
            };
          }
        } catch (error) {
          // Silent fail - payment API might not be available
        }

        // User Usage Information
        try {
          const firstRunSecondsAgo = figma.payments.getUserFirstRanSecondsAgo();
          if (firstRunSecondsAgo !== undefined) {
            result.userUsage = {
              firstRunSecondsAgo,
              isFirstRun: firstRunSecondsAgo === 0,
              firstRunDate: firstRunSecondsAgo > 0 ? new Date(Date.now() - firstRunSecondsAgo * 1000).toISOString() : null
            };
          }
        } catch (error) {
          // Silent fail - payment API might not be available
        }

        try {
          // activeUsers is only available in FigJam, not regular Figma
          if (figma.editorType === 'figjam' && figma.activeUsers) {
            result.activeUsers = figma.activeUsers;
          }
        } catch (error) {
          // Silent fail
        }

        return result;
      
      default:
        return {
          pluginId: figma.pluginId,
          apiVersion: figma.apiVersion,
          editorType: figma.editorType,
          mode: figma.mode,
          pluginVersion: PLUGIN_VERSION
        };
    }
  });
}