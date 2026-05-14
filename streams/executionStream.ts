import { unifiedStream } from "./unifiedStream";

type ExecutionEvent = {
  orderId: string;
  status: "NEW" | "FILLED" | "PARTIAL" | "REJECTED";
  price?: number;
  volume?: number;
};

class ExecutionStream {
  private handlers: ((e: ExecutionEvent) => void)[] = [];

  constructor() {
    unifiedStream.on("execution", (data: unknown) => {
      const e = data as ExecutionEvent;
      this.handlers.forEach((h) => h(e));
    });
  }

  subscribe(cb: (e: ExecutionEvent) => void) {
    this.handlers.push(cb);
  }
}

export const executionStream = new ExecutionStream();