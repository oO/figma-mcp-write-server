import { ManageAutoLayoutSchema, ManageConstraintsSchema } from '../types.js';

export class LayoutHandlers {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  async manageAutoLayout(args: any) {
    const validatedArgs = ManageAutoLayoutSchema.parse(args);
    const { operation, nodeId, direction, spacing, padding, primaryAlignment, counterAlignment, resizing, strokesIncludedInLayout, layoutWrap } = validatedArgs;

    const response = await this.sendToPlugin({
      type: 'MANAGE_AUTO_LAYOUT',
      payload: {
        operation,
        nodeId,
        direction,
        spacing,
        padding,
        primaryAlignment,
        counterAlignment,
        resizing,
        strokesIncludedInLayout,
        layoutWrap
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage auto layout');
    }

    const data = response.data;
    let resultText = '';

    switch (operation) {
      case 'enable':
        resultText = `✅ Enabled auto layout on frame: ${data.name} (${nodeId})`;
        if (data.direction) {
          resultText += `\n📐 Direction: ${data.direction.charAt(0).toUpperCase() + data.direction.slice(1)}`;
        }
        if (data.spacing !== undefined) {
          resultText += `\n📏 Spacing: ${data.spacing}px`;
        }
        resultText += `\n🎯 Ready for auto layout children`;
        break;

      case 'disable':
        resultText = `✅ Disabled auto layout: ${data.name} (${nodeId})`;
        resultText += `\n🔧 Converted to manual layout`;
        break;

      case 'update':
        resultText = `✅ Updated auto layout: ${data.name} (${nodeId})`;
        if (direction) resultText += `\n📐 Direction: ${direction}`;
        if (spacing !== undefined) resultText += `\n📏 Spacing: ${spacing}px`;
        if (primaryAlignment) resultText += `\n⚡ Primary alignment: ${primaryAlignment}`;
        if (counterAlignment) resultText += `\n⚡ Counter alignment: ${counterAlignment}`;
        break;

      case 'get_properties':
        resultText = `📋 Auto layout properties for: ${data.name} (${nodeId})`;
        if (data.autoLayout) {
          resultText += `\n📐 Direction: ${data.autoLayout.direction || 'N/A'}`;
          resultText += `\n📏 Spacing: ${data.autoLayout.spacing || 0}px`;
          resultText += `\n⚡ Primary: ${data.autoLayout.primaryAlignment || 'N/A'}`;
          resultText += `\n⚡ Counter: ${data.autoLayout.counterAlignment || 'N/A'}`;
        } else {
          resultText += `\n❌ Auto layout not enabled`;
        }
        break;

      default:
        resultText = `✅ Auto layout operation ${operation} completed`;
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  async manageConstraints(args: any) {
    const validatedArgs = ManageConstraintsSchema.parse(args);
    const { operation, nodeId, horizontal, vertical } = validatedArgs;

    const response = await this.sendToPlugin({
      type: 'MANAGE_CONSTRAINTS',
      payload: {
        operation,
        nodeId,
        horizontal,
        vertical
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage constraints');
    }

    const data = response.data;
    let resultText = '';

    switch (operation) {
      case 'set':
        resultText = `✅ Set constraints: ${data.name} (${nodeId})`;
        if (data.constraints) {
          const horizontalMap: Record<string, string> = {
            'left': 'Left',
            'right': 'Right',
            'left_right': 'Left & Right',
            'center': 'Center',
            'scale': 'Scale'
          };
          const verticalMap: Record<string, string> = {
            'top': 'Top',
            'bottom': 'Bottom',
            'top_bottom': 'Top & Bottom',
            'center': 'Center',
            'scale': 'Scale'
          };
          
          if (data.constraints.horizontal) {
            resultText += `\n↔️ Horizontal: ${horizontalMap[data.constraints.horizontal] || data.constraints.horizontal}`;
          }
          if (data.constraints.vertical) {
            resultText += `\n↕️ Vertical: ${verticalMap[data.constraints.vertical] || data.constraints.vertical}`;
          }
        }
        break;

      case 'get':
        resultText = `📋 Constraints for: ${data.name} (${nodeId})`;
        if (data.constraints) {
          resultText += `\n↔️ Horizontal: ${data.constraints.horizontal || 'Not set'}`;
          resultText += `\n↕️ Vertical: ${data.constraints.vertical || 'Not set'}`;
        } else {
          resultText += `\n❌ No constraints data available`;
        }
        break;

      case 'reset':
        resultText = `✅ Reset constraints: ${data.name} (${nodeId})`;
        resultText += `\n🔄 Constraints cleared to default`;
        break;

      case 'get_info':
        resultText = `📋 Constraint info for: ${data.name} (${nodeId})`;
        resultText += `\n📏 Parent size: ${data.parentWidth || 'N/A'} × ${data.parentHeight || 'N/A'}`;
        resultText += `\n📍 Position: (${data.x || 0}, ${data.y || 0})`;
        resultText += `\n📐 Size: ${data.width || 'N/A'} × ${data.height || 'N/A'}`;
        break;

      default:
        resultText = `✅ Constraint operation ${operation} completed`;
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  async manageHierarchy(args: any) {
    const { operation, nodeId, nodeIds, targetNodeId, newParentId, newIndex, name, groupType } = args;

    const response = await this.sendToPlugin({
      type: 'MANAGE_HIERARCHY',
      payload: {
        operation,
        nodeId,
        nodeIds,
        targetNodeId,
        newParentId,
        newIndex,
        name,
        groupType
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage hierarchy');
    }

    const data = response.data;
    let resultText = '';

    switch (operation) {
      case 'group':
        resultText = `✅ Created group: ${data.groupName || 'Group'} (${data.groupId})`;
        resultText += `\n📦 Contains ${nodeIds?.length || 0} nodes`;
        break;

      case 'ungroup':
        resultText = `✅ Ungrouped: ${data.name || 'Group'}`;
        resultText += `\n📤 Released ${data.childCount || 0} child nodes`;
        break;

      case 'move':
        resultText = `✅ Moved node to new parent`;
        if (data.nodeName) resultText += `\n📦 Node: ${data.nodeName}`;
        if (data.parentName) resultText += `\n🏠 New parent: ${data.parentName}`;
        break;

      case 'reorder':
        resultText = `✅ Reordered node`;
        if (data.nodeName) resultText += `\n📦 Node: ${data.nodeName}`;
        resultText += `\n🔢 New index: ${newIndex}`;
        break;

      default:
        resultText = `✅ Hierarchy operation ${operation} completed`;
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }
}