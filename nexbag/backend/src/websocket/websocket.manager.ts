import WebSocket from 'ws';

// ─── WebSocket connection manager ─────────────────────────────────────────────
// Maps userId → active WebSocket connection (one connection per user)

class WebSocketManager {
  private connections = new Map<string, WebSocket>();

  add(userId: string, ws: WebSocket): void {
    // Close existing connection if user reconnects from a different client
    const existing = this.connections.get(userId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      existing.close(1000, 'New connection established');
    }
    this.connections.set(userId, ws);
  }

  remove(userId: string): void {
    this.connections.delete(userId);
  }

  get(userId: string): WebSocket | undefined {
    return this.connections.get(userId);
  }

  has(userId: string): boolean {
    return this.connections.has(userId);
  }

  count(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const websocketManager = new WebSocketManager();
