import { SetSelectionSchema } from '../types.js';

export class SelectionHandlers {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  async setSelection(args: any) {
    const params = SetSelectionSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'SET_SELECTION',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Set selection to ${params.nodeIds.length} node(s): ${params.nodeIds.join(', ')}`
      }]
    };
  }

  async getSelection() {
    const response = await this.sendToPlugin({
      type: 'GET_SELECTION'
    });

    return {
      content: [{
        type: 'text',
        text: `📋 Current selection: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  }

  async getPageNodes() {
    const response = await this.sendToPlugin({
      type: 'GET_PAGE_NODES'
    });

    const data = response.data;
    let resultText = `📄 Page Hierarchy (${data?.totalCount || 0} total nodes, ${data?.topLevelCount || 0} top-level)\n\n`;
    
    if (data?.nodes && Array.isArray(data.nodes)) {
      // Group nodes by depth for better visualization
      const nodesByDepth: { [key: number]: any[] } = {};
      data.nodes.forEach((node: any) => {
        const depth = node.depth || 0;
        if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
        nodesByDepth[depth].push(node);
      });

      // Display nodes grouped by depth
      const maxDepth = Math.max(...Object.keys(nodesByDepth).map(Number));
      for (let depth = 0; depth <= maxDepth; depth++) {
        const nodesAtDepth = nodesByDepth[depth];
        if (nodesAtDepth) {
          resultText += `📊 Level ${depth} (${nodesAtDepth.length} nodes):\n`;
          nodesAtDepth.forEach((node: any) => {
            const indent = '  '.repeat(depth);
            const size = node.width && node.height ? ` [${Math.round(node.width)}×${Math.round(node.height)}]` : '';
            const pos = node.x !== undefined && node.y !== undefined ? ` at (${Math.round(node.x)}, ${Math.round(node.y)})` : '';
            resultText += `${indent}• ${node.name} (${node.type})${size}${pos}\n`;
          });
          resultText += '\n';
        }
      }
    } else {
      resultText += 'No nodes found or invalid response format\n';
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  async exportNode(args: any) {
    const response = await this.sendToPlugin({
      type: 'EXPORT_NODE',
      payload: args
    });

    if (!response.success) {
      throw new Error(response.error || 'Export failed');
    }

    return {
      content: [{
        type: 'text',
        text: `✅ Exported node ${args.nodeId} as ${args.format || 'PNG'} with scale ${args.scale || 1}x`
      }]
    };
  }
}