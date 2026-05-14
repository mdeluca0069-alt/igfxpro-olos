class WebSocketPool {
  private connections: Map<string, WebSocket> = new Map();

  add(key: string, ws: WebSocket) {
    this.connections.set(key, ws);
  }

  get(key: string) {
    return this.connections.get(key);
  }

  closeAll() {
    this.connections.forEach((ws) => ws.close());
    this.connections.clear();
  }
}

export const wsPool = new WebSocketPool();