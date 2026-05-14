export class SSEClient {
  private eventSource?: EventSource;

  connect(url: string) {
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("[SSE]", data);
    };

    this.eventSource.onerror = (err) => {
      console.error("[SSE ERROR]", err);
    };
  }

  close() {
    this.eventSource?.close();
  }
}