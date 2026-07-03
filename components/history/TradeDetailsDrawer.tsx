import { memo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X, Calendar, Clock, TrendingUp, TrendingDown,
  DollarSign, BarChart2, Hash, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

export type TradeRecord = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  commission: number;
  swap: number;
  netPnl: number;
  openedAt: string;
  closedAt: string;
  durationMs: number;
  status: string;
};

interface Props {
  trade: TradeRecord;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `${h}h ${m}m`;
  if (m > 0)   return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const Row = memo(function Row({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/40 py-2.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`font-mono text-[12px] font-bold ${cls ?? "text-white"}`}>{value}</span>
    </div>
  );
});

export const TradeDetailsDrawer = memo(function TradeDetailsDrawer({ trade, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const isBuy      = trade.side === "BUY";
  const pnlPos     = trade.netPnl >= 0;
  const dp         = trade.symbol.includes("JPY") ? 3 : trade.symbol.includes("BTC") || trade.symbol.includes("ETH") ? 2 : trade.symbol.match(/US\d{3}|DE\d{2}/) ? 2 : 5;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-slate-800/60 bg-[#050a0f] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isBuy ? "bg-emerald-400/10" : "bg-rose-400/10"}`}>
              {isBuy ? <ArrowUpRight size={16} className="text-emerald-400" /> : <ArrowDownRight size={16} className="text-rose-400" />}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500">Trade Details</p>
              <p className="font-black text-white">{trade.symbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-600 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* P&L Hero */}
        <div className={`mx-5 mt-4 rounded-xl border px-5 py-4 ${pnlPos ? "border-emerald-400/20 bg-emerald-400/[0.06]" : "border-rose-400/20 bg-rose-400/[0.06]"}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Net P&amp;L</p>
          <p className={`mt-1 font-mono text-3xl font-black tabular-nums ${pnlPos ? "text-emerald-400" : "text-rose-400"}`}>
            {pnlPos ? "+" : ""}${trade.netPnl.toFixed(2)}
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-[9px] text-slate-600">Gross P&amp;L</p>
              <p className={`font-mono text-[12px] font-bold ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-600">Commission</p>
              <p className="font-mono text-[12px] font-bold text-rose-400">-${Math.abs(trade.commission).toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-600">Swap</p>
              <p className={`font-mono text-[12px] font-bold ${trade.swap >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {trade.swap >= 0 ? "+" : ""}${trade.swap.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Trade Information</p>

          <Row label="Trade ID"  value={`#${trade.id.slice(-8).toUpperCase()}`} cls="text-slate-400 text-[10px]" />
          <Row label="Direction" value={trade.side} cls={isBuy ? "text-emerald-400" : "text-rose-400"} />
          <Row label="Volume"    value={`${trade.quantity.toFixed(2)} lots`} />
          <Row label="Entry"     value={trade.entryPrice.toFixed(dp)} cls="text-cyan-300" />
          <Row label="Exit"      value={trade.exitPrice.toFixed(dp)} cls="text-slate-300" />
          <Row label="Status"    value={trade.status} cls="text-slate-400" />

          <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">Timing</p>

          <div className="rounded-xl border border-slate-800/40 bg-white/[0.02] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Calendar size={11} className="shrink-0 text-slate-600" />
              <div>
                <p className="text-[9px] text-slate-600">Opened</p>
                <p className="font-mono text-[11px] text-slate-300">{formatDateTime(trade.openedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={11} className="shrink-0 text-slate-600" />
              <div>
                <p className="text-[9px] text-slate-600">Closed</p>
                <p className="font-mono text-[11px] text-slate-300">{formatDateTime(trade.closedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={11} className="shrink-0 text-slate-600" />
              <div>
                <p className="text-[9px] text-slate-600">Duration</p>
                <p className="font-mono text-[11px] text-white">{formatDuration(trade.durationMs)}</p>
              </div>
            </div>
          </div>

          <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-600">P&amp;L Breakdown</p>

          <div className="space-y-1.5">
            {[
              { label: "Gross P&L",   value: trade.pnl,        icon: trade.pnl >= 0 ? TrendingUp : TrendingDown },
              { label: "Commission",  value: -Math.abs(trade.commission), icon: DollarSign },
              { label: "Overnight swap", value: trade.swap,    icon: Hash },
              { label: "Net P&L",     value: trade.netPnl,     icon: BarChart2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon size={11} className="text-slate-600" />
                  <span className="text-[11px] text-slate-400">{label}</span>
                </div>
                <span className={`font-mono text-[12px] font-bold ${value >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {value >= 0 ? "+" : ""}${value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
});
