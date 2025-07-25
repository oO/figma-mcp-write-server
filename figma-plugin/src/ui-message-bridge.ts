// UI Message Bridge - Handles communication between plugin and UI threads
export class UIMessageBridge {
  private connected = false;

  isConnected(): boolean {
    return this.connected;
  }

  async send(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('UI not connected'));
        return;
      }

      try {
        figma.ui.postMessage(message);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  setConnected(connected: boolean) {
    this.connected = connected;
  }
}