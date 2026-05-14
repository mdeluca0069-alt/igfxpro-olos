export class ReconnectManager {
  private attempts = 0;

  async reconnect(fn: () => void) {
    const delay = Math.min(1000 * 2 ** this.attempts, 30000);

    setTimeout(() => {
      this.attempts++;
      fn();
    }, delay);
  }

  reset() {
    this.attempts = 0;
  }
}