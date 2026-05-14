import { unifiedStream } from "./unifiedStream";

type AISignal = {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  regime: string;
};

class AIStream {
  private handlers: ((data: AISignal) => void)[] = [];

  constructor() {
    unifiedStream.on("ai", (data: unknown) => {
      const signal = data as AISignal;
      this.handlers.forEach((h) => h(signal));
    });
  }

  subscribe(cb: (data: AISignal) => void) {
    this.handlers.push(cb);
  }
}

export const aiStream = new AIStream();