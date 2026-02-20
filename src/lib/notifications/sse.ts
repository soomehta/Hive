type SSEClient = {
  controller: ReadableStreamDefaultController;
  userId: string;
  orgId: string;
};

class SSEManager {
  private clients = new Map<string, SSEClient>();

  addClient(
    clientId: string,
    controller: ReadableStreamDefaultController,
    userId: string,
    orgId: string
  ) {
    this.clients.set(clientId, { controller, userId, orgId });
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  sendToUser(userId: string, orgId: string, event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    for (const [, client] of this.clients) {
      if (client.userId === userId && client.orgId === orgId) {
        try {
          client.controller.enqueue(encoder.encode(message));
        } catch {
          // Client disconnected
        }
      }
    }
  }

  sendToOrg(orgId: string, event: string, data: unknown) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();

    for (const [, client] of this.clients) {
      if (client.orgId === orgId) {
        try {
          client.controller.enqueue(encoder.encode(message));
        } catch {
          // Client disconnected
        }
      }
    }
  }
}

export const sseManager = new SSEManager();
