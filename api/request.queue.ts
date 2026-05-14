class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  enqueue(task: () => Promise<any>) {
    this.queue.push(task);
    this.process();
  }

  private async process() {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length) {
      const task = this.queue.shift();
      if (task) await task();
    }

    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();