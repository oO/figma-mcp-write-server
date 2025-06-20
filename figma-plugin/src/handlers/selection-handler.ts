import { BaseHandler } from './base-handler.js';
import { SelectionParams, OperationResult, OperationHandler, NodeInfo, PageNodesResult } from '../types.js';
import { findNodeById, formatNodeResponse, selectAndFocus, getAllNodes, getNodesByIds } from '../utils/node-utils.js';
import { formatSelection, createPageNodesResponse } from '../utils/response-utils.js';

export class SelectionHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'SelectionHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      GET_SELECTION: () => this.getSelection(),
      SET_SELECTION: (params) => this.setSelection(params),
      CLEAR_SELECTION: () => this.clearSelection(),
      GET_PAGE_NODES: (params) => this.getPageNodes(params),
    };
  }

  private async getSelection(): Promise<OperationResult> {
    return this.executeOperation('getSelection', {}, async () => {
      const selection = figma.currentPage.selection;
      const selectionData = formatSelection(selection);
      
      return {
        selection: selectionData,
        count: selection.length,
        message: `${selection.length} node(s) selected`
      };
    });
  }

  private async setSelection(params: SelectionParams): Promise<OperationResult> {
    return this.executeOperation('setSelection', params, async () => {
      this.validateParams(params, ['nodeIds']);
      const nodeIds = this.validateArrayParam(params.nodeIds!, 'nodeIds', 1);
      
      const nodes = getNodesByIds(nodeIds);
      selectAndFocus(nodes);
      
      return {
        selectedNodes: formatSelection(nodes),
        count: nodes.length,
        message: `Selected ${nodes.length} node(s)`
      };
    });
  }

  private async getPageNodes(params: any = {}): Promise<OperationResult> {
    return this.executeOperation('getPageNodes', params, async () => {
      const {
        detail = 'standard',
        includeHidden = false,
        includePages = false,
        nodeTypes = [],
        maxDepth = null
      } = params;

      let allNodes = getAllNodes(figma.currentPage, detail, includeHidden, maxDepth);
      
      // Filter out the page node unless explicitly requested
      if (!includePages) {
        allNodes = allNodes.filter(node => node.type !== 'PAGE');
      }
      
      // Filter by node types if specified
      if (nodeTypes.length > 0) {
        allNodes = allNodes.filter(node => nodeTypes.includes(node.type));
      }
      
      const pageData = createPageNodesResponse(allNodes, detail);
      
      return pageData;
    });
  }


  private async clearSelection(): Promise<OperationResult> {
    return this.executeOperation('clearSelection', {}, async () => {
      figma.currentPage.selection = [];
      
      return {
        message: 'Selection cleared',
        count: 0
      };
    });
  }

  private async selectAll(): Promise<OperationResult> {
    return this.executeOperation('selectAll', {}, async () => {
      const allNodes = figma.currentPage.children.filter(node => node.visible);
      figma.currentPage.selection = allNodes as SceneNode[];
      
      return {
        selectedNodes: formatSelection(allNodes as SceneNode[]),
        count: allNodes.length,
        message: `Selected all ${allNodes.length} visible nodes`
      };
    });
  }

  private async selectByType(nodeType: string): Promise<OperationResult> {
    return this.executeOperation('selectByType', { nodeType }, async () => {
      const typeFilter = nodeType.toUpperCase();
      const matchingNodes = figma.currentPage.findAll(node => node.type === typeFilter);
      
      figma.currentPage.selection = matchingNodes as SceneNode[];
      selectAndFocus(matchingNodes as SceneNode[]);
      
      return {
        selectedNodes: formatSelection(matchingNodes as SceneNode[]),
        count: matchingNodes.length,
        nodeType: typeFilter,
        message: `Selected ${matchingNodes.length} ${typeFilter} nodes`
      };
    });
  }

  private async selectByName(pattern: string): Promise<OperationResult> {
    return this.executeOperation('selectByName', { pattern }, async () => {
      const regex = new RegExp(pattern, 'i');
      const matchingNodes = figma.currentPage.findAll(node => regex.test(node.name));
      
      figma.currentPage.selection = matchingNodes as SceneNode[];
      selectAndFocus(matchingNodes as SceneNode[]);
      
      return {
        selectedNodes: formatSelection(matchingNodes as SceneNode[]),
        count: matchingNodes.length,
        pattern,
        message: `Selected ${matchingNodes.length} nodes matching "${pattern}"`
      };
    });
  }

  private async getNodeAncestors(nodeId: string): Promise<OperationResult> {
    return this.executeOperation('getNodeAncestors', { nodeId }, async () => {
      const node = findNodeById(nodeId);
      const ancestors: NodeInfo[] = [];
      let current = node.parent;
      
      while (current && current.type !== 'PAGE') {
        ancestors.push({
          id: current.id,
          name: current.name,
          type: current.type,
          x: 'x' in current ? (current as any).x : 0,
          y: 'y' in current ? (current as any).y : 0,
          width: 'width' in current ? (current as any).width : 0,
          height: 'height' in current ? (current as any).height : 0
        });
        current = current.parent;
      }
      
      return {
        nodeId,
        ancestors: ancestors.reverse(),
        depth: ancestors.length
      };
    });
  }

  private async getNodeDescendants(nodeId: string): Promise<OperationResult> {
    return this.executeOperation('getNodeDescendants', { nodeId }, async () => {
      const node = findNodeById(nodeId);
      
      if (!('children' in node)) {
        return {
          nodeId,
          descendants: [],
          count: 0,
          message: 'Node has no children'
        };
      }
      
      const descendants = getAllNodes(node).slice(1); // Remove the node itself
      
      return {
        nodeId,
        descendants,
        count: descendants.length,
        message: `Found ${descendants.length} descendant nodes`
      };
    });
  }
}