/**
 * Paper Trading — IGFX OLOS Risk-Free Simulation Mode
 * Real prices, zero risk. Full OLOS AI guidance, same execution engine.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Plus, BarChart3, Activity, Target,
  RotateCcw, Wallet,
} from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money2 } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";

function LiveDot({ color = "plasma", size = 6 }: { color?: "plasma" | "signal" | "alert"; size?: number }) {
  const clr = { plasma: "#00d4ff", signal: "#00ff9f", alert: "#ff4a4a" }[color];
  return (
    <span className="relative flex" style={{ width: size, height: size }}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: clr }} />
      <span className="relative inline-flex rounded-full h-full w-full" style={{ background: clr }} />
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PaperWallet = {
  id: string; name: string; balance: number; equity: number;
  margin: number; freeMargin: number; marginLevel: number;
  totalPnl: number; currency: string; createdAt: string; resetAt: string | null;
};

type PaperPosition = {
  id: string; symbol: string; direction: "BUY" | "SELL";
  quantity: number; entryPrice: number; currentPrice: number;
  pnl: number; pnlPct: number; margin: number;
  sl: number | null; tp: number | null; openedAt: string;
};

type OrderForm = {
  symbol: string; direction: "BUY" | "SELL";
  quantity: string; sl: string; tp: string;
  orderType: "MARKET" | "LIMIT"; limitPrice: string;
  currentPrice: string;
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePaperWallets() {
  return useQuery<PaperWallet[]>({
    queryKey: ["paper", "wallets"],
    queryFn: () => apiGet("/api/v1/paper/wallets").then((r: any) => r.wallets ?? []),
    refetchInterval: 5000,
  });
}

function usePaperPositions(walletId: string | null) {
  return useQuery<PaperPosition[]>({
    queryKey: ["paper", "positions", walletId],
    queryFn: () => apiGet(`/api/v1/paper/wallets/${walletId}/positions`).then((r: any) => r.positions ?? []),
    enabled: !!walletId,
    refetchInterval: 3000,
  });
}

// ─── Components ───────────────────────────────────────────────────────────────

function PositionRow({ pos, onClose }: {
  pos: PaperPosition;
  onClose: (posId: string, price: number) => void;
}) {
  const pnlPos  = pos.pnl >= 0;
  const pnlClr  = pnlPos ? "#00ff9f" : "#ff4a4a";
  const dirClr  = pos.direction === "BUY" ? "#00ff9f" : "#ff4a4a";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <div className="w-16 shrink-0">
        <div className="text-xs font-display font-bold text-white/90">{pos.symbol}</div>
        <div className="text-[10px] font-data" style={{ color: dirClr }}>{pos.direction}</div>
      </div>
      <div className="flex-1 grid grid-cols-4 gap-2 text-xs font-data">
        <div>
          <div className="text-white/30 mb-0.5">QTY</div>
          <div className="text-white/80">{pos.quantity.toFixed(4)}</div>
        </div>
        <div>
          <div className="text-white/30 mb-0.5">ENTRY</div>
          <div className="text-white/80">{pos.entryPrice.toFixed(5)}</div>
        </div>
        <div>
          <div className="text-white/30 mb-0.5">CURRENT</div>
          <div className="text-white/80">{pos.currentPrice.toFixed(5)}</div>
        </div>
        <div>
          <div className="text-white/30 mb-0.5">P&L</div>
          <div className="font-bold" style={{ color: pnlClr }}>
            {pnlPos ? "+" : ""}{money2(pos.pnl)}
          </div>
        </div>
      </div>
      <button
        onClick={() => onClose(pos.id, pos.currentPrice)}
        className="shrink-0 px-3 py-1.5 text-xs font-display border border-white/10 rounded-lg hover:border-red-400/40 hover:text-red-400 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaperTradingPage() {
  const qc       = useQueryClient();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    symbol: "EURUSD", direction: "BUY", quantity: "0.1",
    sl: "", tp: "", orderType: "MARKET", limitPrice: "", currentPrice: "1.0850",
  });
  const [showNewWallet, setShowNewWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState("Paper Account");

  const { data: wallets = [], isLoading: walletsLoading } = usePaperWallets();
  const activeWallet  = wallets.find(w => w.id === activeWalletId) ?? wallets[0] ?? null;
  const effectiveId   = activeWallet?.id ?? null;

  const { data: positions = [] } = usePaperPositions(effectiveId);

  const createWalletMut = useMutation({
    mutationFn: (name: string) => apiPost("/api/v1/paper/wallets", { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paper"] }); setShowNewWallet(false); toastSuccess("Paper wallet created"); },
  });

  const resetWalletMut = useMutation({
    mutationFn: (id: string) => apiPost(`/api/v1/paper/wallets/${id}/reset`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paper"] }); toastSuccess("Wallet reset to $100,000"); },
  });

  const placeOrderMut = useMutation({
    mutationFn: (form: OrderForm) => apiPost(`/api/v1/paper/wallets/${effectiveId}/orders`, {
      symbol: form.symbol, direction: form.direction,
      orderType: form.orderType, quantity: parseFloat(form.quantity),
      sl: form.sl ? parseFloat(form.sl) : undefined,
      tp: form.tp ? parseFloat(form.tp) : undefined,
      limitPrice: form.limitPrice ? parseFloat(form.limitPrice) : undefined,
      currentPrice: parseFloat(form.currentPrice) || 1.0850,
    }),
    onSuccess: (data: any) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["paper"] });
        toastSuccess(`Paper ${orderForm.direction} filled`);
      } else {
        toastError(data.error ?? "Order rejected");
      }
    },
  });

  const closePosMut = useMutation({
    mutationFn: ({ posId, price }: { posId: string; price: number }) =>
      apiPost(`/api/v1/paper/wallets/${effectiveId}/positions/${posId}/close`, { currentPrice: price }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["paper"] }); toastSuccess("Position closed"); },
  });

  const pnlPositive = (activeWallet?.totalPnl ?? 0) >= 0;
  const equityVsBalance = activeWallet ? activeWallet.equity - activeWallet.balance : 0;

  if (walletsLoading) {
    return (
      <div className="min-h-screen bg-[#000] flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-sm text-[#00d4ff] font-data">LOADING PAPER ENGINE...</motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <FlaskConical size={20} style={{ color: "#00d4ff" }} />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white">Paper Trading</h1>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <LiveDot color="signal" size={6} />
              <span>Real prices · Zero risk · Full OLOS AI</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowNewWallet(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-display font-semibold rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] hover:bg-[#00d4ff]/20 transition-all"
        >
          <Plus size={14} /> New Wallet
        </button>
      </div>

      {/* Wallet selector */}
      {wallets.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveWalletId(w.id)}
              className={`px-4 py-2 rounded-lg text-sm font-display transition-all border ${
                (activeWallet?.id ?? wallets[0]?.id) === w.id
                  ? "border-[#00d4ff]/40 bg-[#00d4ff]/10 text-[#00d4ff]"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
              }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

      {/* Create first wallet CTA */}
      {wallets.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel-glow rounded-2xl p-12 text-center"
        >
          <FlaskConical size={40} className="mx-auto mb-4 text-[#00d4ff]/40" />
          <h2 className="text-xl font-display font-bold text-white mb-2">No paper wallet yet</h2>
          <p className="text-white/40 mb-6">Create a virtual account with $100,000 and start practicing with real market prices.</p>
          <button
            onClick={() => createWalletMut.mutate("Main Paper Account")}
            className="btn-scan px-8 py-3 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] font-display font-semibold"
          >
            Create Paper Wallet
          </button>
        </motion.div>
      )}

      {activeWallet && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left column: Metrics + Order Form */}
          <div className="xl:col-span-1 space-y-4">

            {/* Wallet metrics */}
            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet size={14} style={{ color: "#00d4ff" }} />
                  <span className="text-xs font-data text-white/40 uppercase tracking-widest">{activeWallet.name}</span>
                </div>
                <button
                  onClick={() => resetWalletMut.mutate(activeWallet.id)}
                  title="Reset wallet to $100,000"
                  className="p-1.5 rounded-lg border border-white/10 hover:border-[#ff9f00]/40 hover:text-[#ff9f00] text-white/30 transition-colors"
                >
                  <RotateCcw size={12} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[10px] text-white/30 font-data mb-1 uppercase">Balance</div>
                  <div className="text-lg font-display font-bold text-white">{money2(activeWallet.balance)}</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[10px] text-white/30 font-data mb-1 uppercase">Equity</div>
                  <div className="text-lg font-display font-bold" style={{ color: equityVsBalance >= 0 ? "#00ff9f" : "#ff4a4a" }}>
                    {money2(activeWallet.equity)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[10px] text-white/30 font-data mb-1 uppercase">Free Margin</div>
                  <div className="text-sm font-display font-semibold text-white/80">{money2(activeWallet.freeMargin)}</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <div className="text-[10px] text-white/30 font-data mb-1 uppercase">Total P&L</div>
                  <div className={`text-sm font-display font-semibold ${pnlPositive ? "text-[#00ff9f]" : "text-[#ff4a4a]"}`}>
                    {pnlPositive ? "+" : ""}{money2(activeWallet.totalPnl)}
                  </div>
                </div>
              </div>

              {/* Margin level bar */}
              {activeWallet.margin > 0 && (
                <div>
                  <div className="flex justify-between text-[10px] font-data text-white/30 mb-1">
                    <span>MARGIN LEVEL</span>
                    <span>{activeWallet.marginLevel.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, activeWallet.marginLevel / 10)}%`,
                        background: activeWallet.marginLevel > 200 ? "#00ff9f" : activeWallet.marginLevel > 100 ? "#ff9f00" : "#ff4a4a",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Order form */}
            <div className="glass-panel rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Target size={14} style={{ color: "#00d4ff" }} />
                <span className="text-xs font-data text-white/40 uppercase tracking-widest">Place Paper Order</span>
              </div>

              {/* Symbol + direction */}
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-data text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/40"
                  placeholder="Symbol (e.g. EURUSD)"
                  value={orderForm.symbol}
                  onChange={e => setOrderForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                />
                <div className="flex rounded-lg overflow-hidden border border-white/10">
                  {(["BUY", "SELL"] as const).map(d => (
                    <button
                      key={d}
                      onClick={() => setOrderForm(f => ({ ...f, direction: d }))}
                      className={`px-3 py-2 text-xs font-display font-bold transition-colors ${
                        orderForm.direction === d
                          ? d === "BUY" ? "bg-[#00ff9f]/20 text-[#00ff9f]" : "bg-[#ff4a4a]/20 text-[#ff4a4a]"
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity + current price */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 font-data block mb-1">QTY (lots)</label>
                  <input
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-data text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/40"
                    placeholder="0.1"
                    value={orderForm.quantity}
                    onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 font-data block mb-1">CURRENT PRICE</label>
                  <input
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-data text-white placeholder-white/20 focus:outline-none focus:border-[#00d4ff]/40"
                    placeholder="1.0850"
                    value={orderForm.currentPrice}
                    onChange={e => setOrderForm(f => ({ ...f, currentPrice: e.target.value }))}
                  />
                </div>
              </div>

              {/* SL / TP */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 font-data block mb-1">STOP LOSS</label>
                  <input
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-data text-white placeholder-white/20 focus:outline-none focus:border-[#ff4a4a]/40"
                    placeholder="Optional"
                    value={orderForm.sl}
                    onChange={e => setOrderForm(f => ({ ...f, sl: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 font-data block mb-1">TAKE PROFIT</label>
                  <input
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm font-data text-white placeholder-white/20 focus:outline-none focus:border-[#00ff9f]/40"
                    placeholder="Optional"
                    value={orderForm.tp}
                    onChange={e => setOrderForm(f => ({ ...f, tp: e.target.value }))}
                  />
                </div>
              </div>

              <button
                onClick={() => placeOrderMut.mutate(orderForm)}
                disabled={placeOrderMut.isPending}
                className={`btn-scan w-full py-3 rounded-xl text-sm font-display font-bold transition-all border ${
                  orderForm.direction === "BUY"
                    ? "bg-[#00ff9f]/10 border-[#00ff9f]/30 text-[#00ff9f] hover:bg-[#00ff9f]/20"
                    : "bg-[#ff4a4a]/10 border-[#ff4a4a]/30 text-[#ff4a4a] hover:bg-[#ff4a4a]/20"
                } disabled:opacity-50`}
              >
                {placeOrderMut.isPending ? "Placing..." : `${orderForm.direction} ${orderForm.symbol} (Paper)`}
              </button>
            </div>
          </div>

          {/* Right column: Positions */}
          <div className="xl:col-span-2 space-y-4">

            <div className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} style={{ color: "#00d4ff" }} />
                  <span className="text-xs font-data text-white/40 uppercase tracking-widest">Open Positions</span>
                  {positions.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#00d4ff]/10 text-[#00d4ff] text-[10px] font-data">{positions.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <LiveDot color="signal" size={6} />
                  <span className="text-[10px] text-white/30 font-data">Live P&L</span>
                </div>
              </div>

              {positions.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 size={32} className="mx-auto mb-3 text-white/10" />
                  <p className="text-white/30 text-sm">No open paper positions</p>
                  <p className="text-white/20 text-xs mt-1">Use the order form to start simulating trades</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {positions.map(pos => (
                      <PositionRow
                        key={pos.id}
                        pos={pos}
                        onClose={(posId, price) => closePosMut.mutate({ posId, price })}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Info banner */}
            <div className="glass-panel rounded-2xl p-4 flex items-start gap-3">
              <FlaskConical size={16} style={{ color: "#00d4ff" }} className="mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-display font-semibold text-white/80 mb-1">Paper trading uses real market prices</div>
                <div className="text-xs text-white/40 leading-relaxed">
                  All prices come from the same TwelveData live feed as your real account.
                  OLOS AI signals, spreads, and swap rates are identical. Only your real capital is protected.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New wallet modal */}
      <AnimatePresence>
        {showNewWallet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewWallet(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="glass-panel-glow rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-display font-bold text-white mb-4">New Paper Wallet</h3>
              <input
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm font-display text-white placeholder-white/30 focus:outline-none focus:border-[#00d4ff]/40 mb-4"
                placeholder="Account name"
                value={newWalletName}
                onChange={e => setNewWalletName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-white/40 mb-4">Starts with $100,000 virtual USD. Can be reset anytime.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowNewWallet(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm font-display hover:border-white/20 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => createWalletMut.mutate(newWalletName)}
                  className="flex-1 py-2.5 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-sm font-display font-semibold hover:bg-[#00d4ff]/20 transition-colors"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
