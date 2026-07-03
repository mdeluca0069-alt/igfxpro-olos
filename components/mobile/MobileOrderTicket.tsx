import { memo, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ShieldAlert, Target } from "lucide-react";
import { useMarketStore } from "../../store/market.store";
import { useTradingStore, type OrderSide } from "../../store/trading.store";
import { priceDigits } from "../../shared/utils/format";

const SYMBOLS = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD",
  "XAUUSD", "XAGUSD", "US500",  "US30",
  "BTCUSD", "ETHUSD", "AAPL",   "TSLA",
];

const LEVERAGE_STEPS = [1, 5, 10, 20, 50, 100, 200, 500];

// Pip-distance quick-set buttons (in pips)
const SL_PIP_STEPS  = [10, 25, 50, 100];
// R:R ratio presets: for each ratio, TP = entry ± (SL-distance × ratio)
const RR_PRESETS    = [1, 1.5, 2, 3];

// ─── Risk helpers ──────────────────────────────────────────────────────────────

/** Convert pips to price distance for a given symbol */
function pipsToPrice(symbol: string, pips: number): number {
  if (symbol.includes("JPY"))  return pips * 0.01;
  if (symbol === "XAUUSD")     return pips * 0.1;
  if (symbol === "XAGUSD")     return pips * 0.01;
  if (symbol.startsWith("US") || symbol.startsWith("UK") || symbol.startsWith("DE")) return pips * 0.5;
  if (symbol === "BTCUSD")     return pips * 10;
  if (symbol === "ETHUSD")     return pips * 1;
  if (symbol === "AAPL" || symbol === "TSLA" || symbol === "MSFT" || symbol === "NVDA") return pips * 0.5;
  return pips * 0.0001; // 4-digit forex pips
}

/** Point size per symbol (the smallest price move = 1 pip equivalent) */
function pointSize(symbol: string): number {
  if (symbol.includes("JPY"))  return 0.01;
  if (symbol === "XAUUSD")     return 0.01;
  if (symbol === "XAGUSD")     return 0.001;
  if (symbol.startsWith("US") || symbol.startsWith("UK") || symbol.startsWith("DE")) return 0.1;
  if (symbol === "BTCUSD")     return 1;
  if (symbol === "ETHUSD")     return 0.1;
  return 0.00001; // 5-digit forex
}

/** USD value per 1-lot per 1 point move */
function pointValuePerLot(symbol: string): number {
  if (symbol.includes("JPY"))  return 10;  // approx $10/pip/lot (pip=0.01)
  if (symbol === "XAUUSD")     return 10;  // $1 per 0.1 = $10 per lot per 1.0
  if (symbol === "XAGUSD")     return 50;
  if (symbol === "BTCUSD")     return 1;   // $1 per $1 move per 0.01 lot
  if (symbol === "ETHUSD")     return 1;
  if (symbol.startsWith("US")) return 10;
  return 10; // default forex: $10/pip/lot
}

function calcRisk(price1: number, price2: number, qty: number, symbol: string): number {
  if (!price1 || !price2 || !qty) return 0;
  const move   = Math.abs(price1 - price2);
  const points = move / pointSize(symbol);
  return points * pointValuePerLot(symbol) * qty;
}

function calcMargin(price: number, qty: number, leverage: number): number {
  if (!price || !qty || !leverage) return 0;
  return (price * qty * 100_000) / leverage;
}

// ─── Risk panel ───────────────────────────────────────────────────────────────

function RiskPanel({
  side, entryPrice, sl, tp, qty, leverage, symbol,
}: {
  side: OrderSide; entryPrice: number; sl: string; tp: string;
  qty: string; leverage: number; symbol: string; digits?: number;
}) {
  const qtyNum   = parseFloat(qty)   || 0;
  const slNum    = parseFloat(sl)    || 0;
  const tpNum    = parseFloat(tp)    || 0;
  const hasSlTp  = slNum > 0 || tpNum > 0;

  if (!hasSlTp && !qtyNum) return null;

  const riskAmt   = slNum && entryPrice ? calcRisk(entryPrice, slNum, qtyNum, symbol) : null;
  const rewardAmt = tpNum && entryPrice ? calcRisk(entryPrice, tpNum, qtyNum, symbol) : null;
  const rr        = riskAmt && rewardAmt && riskAmt > 0 ? rewardAmt / riskAmt : null;
  const margin    = entryPrice && qtyNum ? calcMargin(entryPrice, qtyNum, leverage) : null;

  const slValid = !slNum || (side === "BUY" ? slNum < entryPrice : slNum > entryPrice);
  const tpValid = !tpNum || (side === "BUY" ? tpNum > entryPrice : tpNum < entryPrice);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-3.5 py-3 space-y-2">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Risk Summary</p>

      {/* Validation errors */}
      {!slValid && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
          <ShieldAlert size={11} />
          SL must be {side === "BUY" ? "below" : "above"} entry price
        </div>
      )}
      {!tpValid && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400">
          <ShieldAlert size={11} />
          TP must be {side === "BUY" ? "above" : "below"} entry price
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {riskAmt !== null && (
          <div>
            <p className="text-[9px] text-slate-600">Risk Amount</p>
            <p className="font-mono text-[13px] font-bold text-rose-400">
              −${riskAmt.toFixed(2)}
            </p>
          </div>
        )}
        {rewardAmt !== null && (
          <div>
            <p className="text-[9px] text-slate-600">Reward Amount</p>
            <p className="font-mono text-[13px] font-bold text-emerald-400">
              +${rewardAmt.toFixed(2)}
            </p>
          </div>
        )}
        {rr !== null && (
          <div>
            <p className="text-[9px] text-slate-600">R:R Ratio</p>
            <p className={`font-mono text-[13px] font-bold ${rr >= 1.5 ? "text-emerald-400" : rr >= 1 ? "text-amber-400" : "text-rose-400"}`}>
              1:{rr.toFixed(2)}
            </p>
          </div>
        )}
        {margin !== null && (
          <div>
            <p className="text-[9px] text-slate-600">Est. Margin</p>
            <p className="font-mono text-[13px] font-bold text-slate-300">
              ${margin.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open:     boolean;
  onClose:  () => void;
  symbol?:  string;
}

export const MobileOrderTicket = memo(function MobileOrderTicket({
  open,
  onClose,
  symbol: initialSymbol = "EURUSD",
}: Props) {
  const [symbol,   setSymbol]   = useState(initialSymbol);
  const [side,     setSide]     = useState<OrderSide>("BUY");
  const [qty,      setQty]      = useState("0.01");
  const [leverage, setLeverage] = useState(100);
  const [sl,       setSl]       = useState("");
  const [tp,       setTp]       = useState("");
  const [rrMode,   setRrMode]   = useState(false);
  const [status,   setStatus]   = useState<"idle" | "submitting" | "ok" | "error">("idle");
  const [errMsg,   setErrMsg]   = useState("");

  const quote     = useMarketStore((s) => s.getQuote(symbol));
  const placeOrder = useTradingStore((s) => s.placeOrder);
  const submitting = useTradingStore((s) => s.submitting);

  const digits  = priceDigits(symbol);
  const bidStr  = quote ? quote.bid.toFixed(digits) : "—";
  const askStr  = quote ? quote.ask.toFixed(digits) : "—";
  const midStr  = quote ? ((quote.bid + quote.ask) / 2).toFixed(digits) : "—";

  // SL/TP validation
  const entryPrice = quote ? (side === "BUY" ? quote.ask : quote.bid) : 0;
  const slNum      = parseFloat(sl) || 0;
  const tpNum      = parseFloat(tp) || 0;
  const slValid    = !slNum || (side === "BUY" ? slNum < entryPrice : slNum > entryPrice);
  const tpValid    = !tpNum || (side === "BUY" ? tpNum > entryPrice : tpNum < entryPrice);

  // ── SL quick-set: set SL at N pips away from entry ────────────────────────
  const setSlByPips = useCallback((pips: number) => {
    if (!entryPrice) return;
    const dist = pipsToPrice(symbol, pips);
    const slPrice = side === "BUY" ? entryPrice - dist : entryPrice + dist;
    setSl(slPrice.toFixed(digits));
    // Auto-update TP if R:R mode and TP already set or R:R preselected
    if (rrMode && tp) {
      const slDist = Math.abs(slPrice - entryPrice);
      const tpDist = slDist * 2; // default 1:2 R:R
      const tpPrice = side === "BUY" ? entryPrice + tpDist : entryPrice - tpDist;
      setTp(tpPrice.toFixed(digits));
    }
  }, [entryPrice, symbol, side, digits, rrMode, tp]);

  // ── R:R preset: set TP at ratio × SL distance from entry ──────────────────
  const applyRrPreset = useCallback((ratio: number) => {
    const slNum = parseFloat(sl);
    if (!entryPrice || !slNum) return;
    const slDist = Math.abs(slNum - entryPrice);
    const tpDist = slDist * ratio;
    const tpPrice = side === "BUY" ? entryPrice + tpDist : entryPrice - tpDist;
    setTp(tpPrice.toFixed(digits));
  }, [sl, entryPrice, side, digits]);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrMsg("");
    setQty("0.01");
    setSl("");
    setTp("");
  }, []);

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const quantity = parseFloat(qty);
    if (!isFinite(quantity) || quantity <= 0) {
      setErrMsg("Enter a valid quantity.");
      setStatus("error");
      return;
    }
    if (!slValid) {
      setErrMsg(`Stop Loss must be ${side === "BUY" ? "below" : "above"} the entry price.`);
      setStatus("error");
      return;
    }
    if (!tpValid) {
      setErrMsg(`Take Profit must be ${side === "BUY" ? "above" : "below"} the entry price.`);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrMsg("");

    const orderPayload: Parameters<typeof placeOrder>[0] = {
      symbol, side, type: "MARKET", quantity, leverage,
      ...(slNum > 0 && { stopLoss:   slNum }),
      ...(tpNum > 0 && { takeProfit: tpNum }),
    };

    const result = await placeOrder(orderPayload);
    if (result) {
      setStatus("ok");
      setTimeout(() => { reset(); onClose(); }, 1400);
    } else {
      setStatus("error");
      setErrMsg("Order rejected. Check margin or try again.");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-slate-700/60 bg-[#080f1a] pb-safe md:hidden"
          >
            {/* Drag handle */}
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <h2 className="text-[15px] font-black uppercase tracking-[0.12em] text-white">New Order</h2>
              <button onClick={handleClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[80dvh] overflow-y-auto">
              <div className="space-y-4 px-5 pb-6">
                {/* Symbol picker */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Symbol</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SYMBOLS.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => { setSymbol(sym); setSl(""); setTp(""); }}
                        className={[
                          "rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider transition-all",
                          sym === symbol
                            ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-300"
                            : "border border-slate-700/60 text-slate-500 hover:text-slate-300",
                        ].join(" ")}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live price strip */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400/70">BID</p>
                    <p className="font-mono text-[16px] font-black tabular-nums text-emerald-400">{bidStr}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">MID</p>
                    <p className="font-mono text-[14px] font-bold tabular-nums text-slate-300">{midStr}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-rose-400/70">ASK</p>
                    <p className="font-mono text-[16px] font-black tabular-nums text-rose-400">{askStr}</p>
                  </div>
                </div>

                {/* BUY / SELL toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSide("BUY")}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-black uppercase tracking-wider transition-all",
                      side === "BUY"
                        ? "bg-emerald-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                        : "border border-emerald-800/40 bg-emerald-950/20 text-emerald-600",
                    ].join(" ")}
                  >
                    <TrendingUp size={16} /> Buy
                  </button>
                  <button
                    onClick={() => setSide("SELL")}
                    className={[
                      "flex items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-black uppercase tracking-wider transition-all",
                      side === "SELL"
                        ? "bg-rose-500 text-black shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                        : "border border-rose-800/40 bg-rose-950/20 text-rose-600",
                    ].join(" ")}
                  >
                    <TrendingDown size={16} /> Sell
                  </button>
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Quantity (lots)</label>
                  <input
                    type="number" inputMode="decimal" min="0.01" step="0.01"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-[16px] text-white outline-none focus:border-cyan-500/60"
                  />
                </div>

                {/* Leverage */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Leverage</label>
                    <span className="font-mono text-[13px] font-black text-cyan-300">1:{leverage}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {LEVERAGE_STEPS.map((lev) => (
                      <button
                        key={lev}
                        onClick={() => setLeverage(lev)}
                        className={[
                          "rounded-md px-2.5 py-1 text-[11px] font-bold transition-all",
                          lev === leverage
                            ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-300"
                            : "border border-slate-700/60 text-slate-500 hover:text-slate-300",
                        ].join(" ")}
                      >
                        {lev}×
                      </button>
                    ))}
                  </div>
                </div>

                {/* SL / TP section */}
                <div className="space-y-3">
                  {/* Header with R:R mode toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Stop Loss &amp; Take Profit
                    </label>
                    <button
                      onClick={() => setRrMode((v) => !v)}
                      className={[
                        "flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-bold transition",
                        rrMode
                          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                          : "border-slate-700/60 text-slate-600 hover:text-slate-400",
                      ].join(" ")}
                    >
                      <Target size={9} />
                      R:R Mode
                    </button>
                  </div>

                  {/* SL pip-distance quick buttons */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-rose-400/70">Stop Loss</span>
                      <div className="flex gap-1">
                        {SL_PIP_STEPS.map((pips) => (
                          <button
                            key={pips}
                            onClick={() => setSlByPips(pips)}
                            disabled={!entryPrice}
                            className="rounded-md border border-rose-800/40 bg-rose-950/20 px-2 py-0.5 text-[9px] font-bold text-rose-400/80 hover:border-rose-600/40 hover:text-rose-300 transition disabled:opacity-30"
                          >
                            -{pips}p
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number" inputMode="decimal" step={pointSize(symbol)}
                      placeholder={`e.g. ${entryPrice ? (entryPrice - (side === "BUY" ? pipsToPrice(symbol, 25) : -pipsToPrice(symbol, 25))).toFixed(digits) : "0.0000"}`}
                      value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      className={[
                        "w-full rounded-xl border bg-slate-900 px-3 py-2.5 font-mono text-[13px] text-white outline-none",
                        !slValid ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-rose-400/60",
                      ].join(" ")}
                    />
                  </div>

                  {/* TP with R:R presets (shown when SL is set or always in R:R mode) */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400/70">Take Profit</span>
                      <div className="flex gap-1">
                        {RR_PRESETS.map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => applyRrPreset(ratio)}
                            disabled={!entryPrice || !parseFloat(sl)}
                            className={[
                              "rounded-md border px-2 py-0.5 text-[9px] font-bold transition disabled:opacity-30",
                              rrMode
                                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
                                : "border-emerald-800/40 bg-emerald-950/20 text-emerald-400/80 hover:border-emerald-600/40 hover:text-emerald-300",
                            ].join(" ")}
                          >
                            1:{ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="number" inputMode="decimal" step={pointSize(symbol)}
                      placeholder={`e.g. ${entryPrice ? (entryPrice + (side === "BUY" ? pipsToPrice(symbol, 50) : -pipsToPrice(symbol, 50))).toFixed(digits) : "0.0000"}`}
                      value={tp}
                      onChange={(e) => setTp(e.target.value)}
                      className={[
                        "w-full rounded-xl border bg-slate-900 px-3 py-2.5 font-mono text-[13px] text-white outline-none",
                        !tpValid ? "border-rose-500/60 focus:border-rose-500" : "border-slate-700 focus:border-emerald-400/60",
                      ].join(" ")}
                    />
                  </div>
                </div>

                {/* Live risk panel */}
                <RiskPanel
                  side={side}
                  entryPrice={entryPrice}
                  sl={sl} tp={tp} qty={qty}
                  leverage={leverage}
                  symbol={symbol}
                  digits={digits}
                />

                {/* Error */}
                {status === "error" && errMsg && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2.5 text-[12px] text-rose-400">
                    <AlertCircle size={14} /> {errMsg}
                  </div>
                )}

                {/* Success */}
                {status === "ok" && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2.5 text-[12px] text-emerald-400">
                    <CheckCircle2 size={14} /> Order placed successfully.
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || status === "submitting" || status === "ok"}
                  className={[
                    "w-full rounded-xl py-4 text-[14px] font-black uppercase tracking-wider transition-all disabled:opacity-50",
                    side === "BUY"
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-rose-500 text-black hover:bg-rose-400",
                  ].join(" ")}
                >
                  {submitting || status === "submitting"
                    ? "Placing…"
                    : `${side} ${symbol} @ Market`}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default MobileOrderTicket;
