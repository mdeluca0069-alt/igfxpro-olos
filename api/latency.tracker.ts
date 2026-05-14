export class LatencyTracker {
  private start = 0;

  startMeasure() {
    this.start = performance.now();
  }

  endMeasure(label: string) {
    const latency = performance.now() - this.start;
    console.log(`[LATENCY] ${label}: ${latency}ms`);
    return latency;
  }
}