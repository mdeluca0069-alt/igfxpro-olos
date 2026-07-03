/**
 * IGFXPRO — Reports & Statements
 * Institutional-grade account reporting with browser-native print-to-PDF.
 * All data is DB-backed via real backend endpoints.
 */
import { memo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download, FileText, Printer, RefreshCw,
  TrendingUp, AlertCircle, ChevronDown,
  BarChart2, Receipt, ClipboardList, Shield,
} from "lucide-react";
import { useWalletStore }  from "../../store/wallet.store";
import { useTradingStore } from "../../store/trading.store";
import { apiGet }          from "../../shared/lib/apiHelpers";
import { money, money2, number, dateShort, dateTime, toN } from "../../shared/utils/format";
import { usePageTitle }    from "../../hooks/usePageTitle";
import { useShallow }      from "zustand/react/shallow";

// ─── Types ────────────────────────────────────────────────────────────────────

type LedgerEntry = {
  id:        string;
  type:      string;
  amount:    number;
  balance:   number;
  ts:        string;
  reference: string;
  note:      string;
};

type StatementResponse = {
  from:        string;
  to:          string;
  openBalance: number;
  closeBalance:number;
  entries:     LedgerEntry[];
};

type TradeRow = {
  id:           string;
  symbol:       string;
  side:         string;
  quantity:     number;
  entryPrice:   number;
  closePrice:   number;
  pnl:          number;
  commission:   number;
  swap:         number;
  openedAt:     string;
  closedAt:     string;
  duration:     string;
};

type TradesResponse = {
  trades:     TradeRow[];
  total:      number;
  page:       number;
  pageSize:   number;
};

type PnlSummary = {
  totalPnl:       number;
  totalFees:      number;
  totalSwaps:     number;
  grossPnl:       number;
  winCount:       number;
  lossCount:      number;
  winRate:        number;
  profitFactor:   number;
  avgWin:         number;
  avgLoss:        number;
  expectancy:     number;
  largestWin:     number;
  largestLoss:    number;
  period:         string;
};

// ─── Period selector ─────────────────────────────────────────────────────────

type Period = "1M" | "3M" | "6M" | "YTD" | "1Y";

const PERIODS: { id: Period; label: string }[] = [
  { id: "1M",  label: "1 Month"  },
  { id: "3M",  label: "3 Months" },
  { id: "6M",  label: "6 Months" },
  { id: "YTD", label: "Year to Date" },
  { id: "1Y",  label: "1 Year"   },
];

function periodDays(p: Period): number {
  switch (p) {
    case "1M":  return 30;
    case "3M":  return 90;
    case "6M":  return 180;
    case "1Y":  return 365;
    case "YTD": {
      const now   = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - start.getTime()) / 86_400_000);
    }
  }
}

// ─── Print styles injected in <head> ─────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body { background: #fff !important; color: #111 !important; }
  .no-print { display: none !important; }
  .print-break { page-break-before: always; }
  .report-card { border: 1px solid #e2e8f0 !important; background: #fff !important; }
  .report-table th { background: #f8fafc !important; color: #334155 !important; }
  .report-table td { color: #1e293b !important; border-color: #e2e8f0 !important; }
  .text-emerald-400 { color: #059669 !important; }
  .text-rose-400    { color: #dc2626 !important; }
  .text-slate-400, .text-slate-500, .text-slate-600 { color: #475569 !important; }
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensurePrintStyle() {
  if (document.getElementById("report-print-style")) return;
  const el = document.createElement("style");
  el.id = "report-print-style";
  el.textContent = PRINT_STYLE;
  document.head.appendChild(el);
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="report-card rounded-2xl border border-slate-800/60 bg-[#07111e] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-800/50 px-5 py-3.5">
        <Icon size={14} className="text-cyan-400" />
        <h2 className="text-[13px] font-bold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KpiCard({ label, value, sub, cls = "text-white" }: {
  label: string; value: string; sub?: string; cls?: string;
}) {
  return (
    <div className="report-card rounded-xl border border-slate-800/60 bg-[#07111e] px-4 py-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</p>
      <p className={`mt-1.5 text-lg font-extrabold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

function MetricRow({ label, value, cls = "text-slate-300" }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/40 py-2 last:border-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className={`font-mono text-[12px] font-bold ${cls}`}>{value}</span>
    </div>
  );
}

// ─── Report header (printed at top of each page) ──────────────────────────────

const ReportHeader = memo(function ReportHeader({
  accountId, period, generatedAt,
}: { accountId: string; period: Period; generatedAt: string }) {
  return (
    <div className="report-card mb-6 rounded-2xl border border-slate-800/60 bg-[#07111e] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">IGFXPRO</p>
          <h1 className="mt-1 text-xl font-extrabold text-white">Account Statement</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {PERIODS.find((p) => p.id === period)?.label} · Account <span className="font-mono text-slate-400">{accountId}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-600">Generated</p>
          <p className="font-mono text-[11px] text-slate-400">{generatedAt}</p>
          <p className="mt-1 text-[9px] text-slate-700">CONFIDENTIAL — Client Copy</p>
        </div>
      </div>
    </div>
  );
});

// ─── PnL Summary section ──────────────────────────────────────────────────────

const PnlSummarySection = memo(function PnlSummarySection({ data }: { data: PnlSummary }) {
  return (
    <Section icon={BarChart2} title="P&amp;L Summary">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <KpiCard
          label="Net P&L"
          value={`${data.totalPnl >= 0 ? "+" : ""}${money(data.totalPnl)}`}
          cls={data.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
          sub="After fees &amp; swaps"
        />
        <KpiCard label="Win Rate"   value={`${number(data.winRate, 1)}%`}
          cls={data.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}
          sub={`${data.winCount}W / ${data.lossCount}L`} />
        <KpiCard label="Profit Factor" value={number(data.profitFactor, 2)}
          cls={data.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400"} />
        <KpiCard label="Expectancy" value={`${data.expectancy >= 0 ? "+" : ""}${money2(data.expectancy)}`}
          cls={data.expectancy >= 0 ? "text-emerald-400" : "text-rose-400"} sub="Per trade" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <MetricRow label="Gross P&L"      value={money(data.grossPnl)} />
          <MetricRow label="Total Fees"     value={`-${money2(data.totalFees)}`} cls="text-rose-400" />
          <MetricRow label="Total Swaps"    value={`-${money2(data.totalSwaps)}`} cls="text-rose-400" />
          <MetricRow label="Average Win"    value={`+${money2(data.avgWin)}`} cls="text-emerald-400" />
          <MetricRow label="Average Loss"   value={money2(data.avgLoss)} cls="text-rose-400" />
        </div>
        <div>
          <MetricRow label="Largest Win"    value={`+${money2(data.largestWin)}`} cls="text-emerald-400" />
          <MetricRow label="Largest Loss"   value={money2(data.largestLoss)} cls="text-rose-400" />
          <MetricRow label="Total Trades"   value={`${data.winCount + data.lossCount}`} />
          <MetricRow label="Period"         value={data.period} />
        </div>
      </div>
    </Section>
  );
});

// ─── Trade history section ────────────────────────────────────────────────────

const TradeHistorySection = memo(function TradeHistorySection({ data }: { data: TradesResponse }) {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded ? data.trades : data.trades.slice(0, 10);

  return (
    <Section icon={ClipboardList} title={`Trade History — ${data.total.toLocaleString()} Trades`}>
      <div className="overflow-x-auto">
        <table className="report-table w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/50">
              {["Symbol", "Side", "Qty", "Entry", "Close", "P&L", "Fees", "Duration", "Closed At"].map((h) => (
                <th key={h} className="px-3 pb-3 pt-2 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/30 transition hover:bg-slate-900/20">
                <td className="px-3 py-2.5 font-bold text-white">{t.symbol}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    t.side === "BUY" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                  }`}>{t.side}</span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{number(t.quantity, 2)}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{toN(t.entryPrice).toFixed(5)}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{toN(t.closePrice).toFixed(5)}</td>
                <td className={`px-3 py-2.5 font-mono text-[12px] font-bold ${t.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.pnl >= 0 ? "+" : ""}{money2(t.pnl)}
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600">
                  -{money2(t.commission + Math.abs(t.swap))}
                </td>
                <td className="px-3 py-2.5 text-[10px] text-slate-600">{t.duration}</td>
                <td className="px-3 py-2.5 text-[10px] text-slate-600">{dateTime(t.closedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.trades.length > 10 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="no-print mt-3 flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
        >
          <ChevronDown size={11} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show fewer" : `Show all ${data.total.toLocaleString()} trades`}
        </button>
      )}
    </Section>
  );
});

// ─── Account statement section ────────────────────────────────────────────────

const AccountStatementSection = memo(function AccountStatementSection({ data }: { data: StatementResponse }) {
  return (
    <Section icon={Receipt} title="Account Statement">
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Opening Balance" value={money(data.openBalance)}  cls="text-slate-300" />
        <KpiCard label="Closing Balance" value={money(data.closeBalance)} cls="text-white" />
        <KpiCard
          label="Net Change"
          value={`${data.closeBalance - data.openBalance >= 0 ? "+" : ""}${money(data.closeBalance - data.openBalance)}`}
          cls={data.closeBalance >= data.openBalance ? "text-emerald-400" : "text-rose-400"}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="report-table w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/50">
              {["Date", "Type", "Reference", "Amount", "Balance", "Note"].map((h) => (
                <th key={h} className="px-3 pb-3 pt-2 text-left text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id} className="border-b border-slate-800/30 transition hover:bg-slate-900/20">
                <td className="px-3 py-2 text-[10px] text-slate-500">{dateShort(e.ts)}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">{e.type}</span>
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-slate-600">{e.reference}</td>
                <td className={`px-3 py-2 font-mono text-[11px] font-bold ${e.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {e.amount >= 0 ? "+" : ""}{money2(e.amount)}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-300">{money2(e.balance)}</td>
                <td className="px-3 py-2 text-[10px] text-slate-600 max-w-[200px] truncate">{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
});

// ─── Regulatory notice ────────────────────────────────────────────────────────

const RegulatoryNotice = memo(function RegulatoryNotice() {
  return (
    <Section icon={Shield} title="Regulatory Notice">
      <div className="space-y-2.5 text-[11px] leading-relaxed text-slate-500">
        <p>
          This statement is issued by IGFXPRO Ltd., a company registered under applicable financial regulations.
          Trading foreign exchange and CFDs carries a high level of risk and may not be suitable for all investors.
          Past performance is not indicative of future results.
        </p>
        <p>
          This document is prepared for informational purposes only and constitutes part of the MiFID II best
          execution reporting requirements. All figures are in USD unless otherwise stated. Values are reported
          as at the time of settlement.
        </p>
        <p className="text-[10px] text-slate-700">
          IGFXPRO Ltd · Regulated Entity · Reference: IGF-{new Date().getFullYear()}-STMT
          · Generated: {new Date().toISOString()}
        </p>
      </div>
    </Section>
  );
});

// ─── Empty / loading states ───────────────────────────────────────────────────

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="report-card animate-pulse rounded-2xl border border-slate-800/60 bg-[#07111e] p-10 text-center">
      <RefreshCw size={18} className="mx-auto mb-3 animate-spin text-slate-700" />
      <p className="text-[12px] text-slate-700">Loading {label}…</p>
    </div>
  );
}

function ErrorCard({ label }: { label: string }) {
  return (
    <div className="report-card rounded-2xl border border-rose-900/40 bg-rose-950/20 p-8 text-center">
      <AlertCircle size={18} className="mx-auto mb-2 text-rose-500" />
      <p className="text-[12px] text-rose-400">{label} unavailable</p>
      <p className="mt-1 text-[10px] text-slate-600">Start the backend to load report data</p>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  usePageTitle("Reports & Statements");

  const [period, setPeriod] = useState<Period>("3M");
  const days    = periodDays(period);
  const balance = useWalletStore((s) => s.balance);
  const positions = useTradingStore(useShallow((s) => s.positions));

  const accountId = balance ? `IGF-${String(balance.equity).slice(0, 4).padStart(4, "0")}` : "IGF-0001";

  const { data: pnlData, isLoading: pnlLoading, isError: pnlError } = useQuery<PnlSummary>({
    queryKey: ["pnl-summary", period],
    queryFn:  () => apiGet(`/api/v1/reports/pnl-summary?days=${days}`),
    staleTime: 60_000,
  });

  const { data: tradesData, isLoading: tradesLoading, isError: tradesError } = useQuery<TradesResponse>({
    queryKey: ["trades-report", period],
    queryFn:  () => apiGet(`/api/v1/reports/trades?days=${days}&limit=200`),
    staleTime: 60_000,
  });

  const { data: stmtData, isLoading: stmtLoading, isError: stmtError } = useQuery<StatementResponse>({
    queryKey: ["statement", period],
    queryFn:  () => apiGet(`/api/v1/reports/statement?days=${days}`),
    staleTime: 60_000,
  });

  const reportRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    ensurePrintStyle();
    window.print();
  }

  const generatedAt = new Date().toLocaleString("en-US", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const totalUnrealizedPnl = (positions ?? []).reduce((s, p) => s + (p.pnl ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1100px] space-y-5 p-5" ref={reportRef}>

        {/* ── Toolbar ── */}
        <div className="no-print flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07]">
              <FileText size={14} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">IGFXPRO</p>
              <h1 className="text-[15px] font-extrabold text-white">Reports &amp; Statements</h1>
            </div>
          </div>

          {/* Period selector */}
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-800/60 bg-slate-900/40 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={[
                  "rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                  period === p.id
                    ? "bg-cyan-400/20 text-cyan-300"
                    : "text-slate-500 hover:text-slate-300",
                ].join(" ")}
              >
                {p.id}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-[12px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              <Printer size={13} />
              Print / Save PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.07] px-4 py-2 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-400/[0.14]"
            >
              <Download size={13} />
              Download
            </button>
          </div>
        </div>

        {/* ── Report header ── */}
        <ReportHeader accountId={accountId} period={period} generatedAt={generatedAt} />

        {/* ── Account snapshot (live) ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Equity"        value={money(balance?.equity      ?? 0)} cls="text-white" />
          <KpiCard label="Available"     value={money(balance?.available   ?? 0)} cls="text-slate-300" />
          <KpiCard label="Open P&L"
            value={`${totalUnrealizedPnl >= 0 ? "+" : ""}${money(totalUnrealizedPnl)}`}
            cls={totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <KpiCard label="Free Margin"   value={money(balance?.freeMargin  ?? 0)} cls="text-slate-300" />
        </div>

        {/* ── P&L Summary ── */}
        {pnlLoading && <LoadingCard label="P&L summary" />}
        {pnlError   && <ErrorCard  label="P&L summary" />}
        {pnlData    && <PnlSummarySection data={pnlData} />}

        {/* ── Trade History ── */}
        {tradesLoading && <LoadingCard label="trade history" />}
        {tradesError   && <ErrorCard  label="Trade history" />}
        {tradesData    && (tradesData.trades?.length ?? 0) > 0 && <TradeHistorySection data={tradesData} />}
        {tradesData    && (tradesData.trades?.length ?? 0) === 0 && (
          <Section icon={ClipboardList} title="Trade History">
            <div className="flex flex-col items-center py-10 text-center text-slate-700">
              <BarChart2 size={24} className="mb-2" />
              <p className="text-[12px]">No closed trades in this period</p>
            </div>
          </Section>
        )}

        {/* ── Account Statement ── */}
        {stmtLoading && <LoadingCard label="account statement" />}
        {stmtError   && <ErrorCard  label="Account statement" />}
        {stmtData    && (stmtData.entries?.length ?? 0) > 0 && <AccountStatementSection data={stmtData} />}

        {/* ── Regulatory Notice ── */}
        <RegulatoryNotice />

        {/* ── Monthly heat strip ── */}
        {tradesData && (tradesData.trades?.length ?? 0) > 0 && (
          <Section icon={TrendingUp} title="Monthly Performance">
            <MonthlyHeatStrip trades={tradesData.trades} />
          </Section>
        )}

      </main>
    </div>
  );
}

// ─── Monthly heat strip (derived from trade data) ──────────────────────────────

const MonthlyHeatStrip = memo(function MonthlyHeatStrip({ trades }: { trades: TradeRow[] }) {
  const monthly = new Map<string, number>();
  for (const t of trades) {
    const key = t.closedAt ? t.closedAt.slice(0, 7) : "?";
    monthly.set(key, (monthly.get(key) ?? 0) + t.pnl);
  }
  const entries = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([month, pnl]) => {
        const intensity = Math.round((Math.abs(pnl) / max) * 100);
        const pos = pnl >= 0;
        return (
          <div key={month} title={`${month}: ${pnl >= 0 ? "+" : ""}${money2(pnl)}`}
            className="flex flex-col items-center gap-1">
            <div
              className={`w-12 rounded-md transition-all ${pos ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ height: 32, opacity: 0.15 + (intensity / 100) * 0.85 }}
            />
            <div className="text-center">
              <p className="text-[8px] text-slate-600">{month.slice(5)}</p>
              <p className={`text-[8px] font-bold ${pos ? "text-emerald-400" : "text-rose-400"}`}>
                {pnl >= 0 ? "+" : ""}{(pnl / 1000).toFixed(1)}k
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export { ReportsPage };
