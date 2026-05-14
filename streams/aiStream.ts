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
    unifiedStream.on("ai", (data: AISignal) => {
      this.handlers.forEach((h) => h(data));
    });
  }

  subscribe(cb: (data: AISignal) => void) {
    this.handlers.push(cb);
  }
}

export const aiStream = new AIStream();