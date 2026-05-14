import { unifiedStream } from "./unifiedStream";

type Tick = {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
};

class MarketStream {
  private subscribers: Map<string, ((tick: Tick) => void)[]> = new Map();

  constructor() {
    unifiedStream.on("market", (data: unknown) => {
      const tick = data as Tick;
      this.dispatch(tick);
    });
  }

  subscribe(symbol: string, cb: (tick: Tick) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    this.subscribers.get(symbol)!.push(cb);
  }

  private dispatch(tick: Tick) {
    const list = this.subscribers.get(tick.symbol);
    if (!list) return;
    list.forEach((cb) => cb(tick));
  }
}

export const marketStream = new MarketStream();