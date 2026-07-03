import { memo, useState, useRef, useEffect } from "react";
import { Download, ChevronDown, FileText, Table2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadStatementPDF } from "../../shared/lib/pdfReport";

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
  trades: TradeRecord[];
  disabled?: boolean;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDurationMs(ms: number): string {
  if (!ms || ms <= 0) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h > 0)   return `${h}h ${m}m`;
  return `${m}m`;
}

function exportCSV(trades: TradeRecord[]) {
  const headers = [
    "ID", "Symbol", "Side", "Volume (lots)",
    "Entry", "Exit", "Gross P&L", "Commission", "Swap", "Net P&L",
    "Opened", "Closed", "Duration", "Status",
  ];
  const rows = trades.map((t) => [
    t.id.slice(-8).toUpperCase(),
    t.symbol,
    t.side,
    t.quantity.toFixed(2),
    t.entryPrice.toString(),
    t.exitPrice.toString(),
    t.pnl.toFixed(2),
    (-Math.abs(t.commission)).toFixed(2),
    t.swap.toFixed(2),
    t.netPnl.toFixed(2),
    formatDateTime(t.openedAt),
    formatDateTime(t.closedAt),
    formatDurationMs(t.durationMs),
    t.status,
  ]);
  const csv  = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download  = `trade_history_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPDF(trades: TradeRecord[]) {
  downloadStatementPDF(trades);
}

export const ExportButton = memo(function ExportButton({ trades, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || trades.length === 0}
        className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3.5 py-2 text-[11px] font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Download size={12} />
        Export
        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-slate-700 bg-[#0d1629] shadow-2xl"
          >
            <button
              onClick={() => { exportCSV(trades); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[12px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <Table2 size={13} className="shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold">Export CSV</p>
                <p className="text-[10px] text-slate-600">{trades.length} trades</p>
              </div>
            </button>
            <div className="mx-3 h-px bg-slate-800" />
            <button
              onClick={() => { exportPDF(trades); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[12px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <FileText size={13} className="shrink-0 text-cyan-400" />
              <div>
                <p className="font-semibold">Export PDF</p>
                <p className="text-[10px] text-slate-600">Download statement</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
