import { ManageStylesSchema } from '../types.js';

export class StyleHandlers {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  async manageStyles(args: any): Promise<any> {
    try {
      const validatedArgs = ManageStylesSchema.parse(args);
      
      const result = await this.sendToPlugin({
        type: 'MANAGE_STYLES',
        payload: validatedArgs
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Style operation ${validatedArgs.operation} completed successfully: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error('❌ Error in manageStyles:', error);
      throw error;
    }
  }
}