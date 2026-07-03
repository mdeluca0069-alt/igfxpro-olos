/**
 * SpreadController — Broker Spread Administration
 *
 * Shows every tradeable instrument with:
 *   - Spread source: REAL (TwelveData bid/ask), CONFIGURED (broker), LAST_REAL, or ZERO (blocked)
 *   - Live bid/ask/spread from /trading/quotes
 *   - Configured broker spread in price units (editable)
 *   - Enabled/disabled toggle
 *
 * API:
 *   GET  /api/v1/admin/broker/spread   — full instrument list + live data
 *   POST /api/v1/admin/broker/spread   — update spread / enabled
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, RefreshCw, Save, AlertTriangle, CheckCircle2, Radio, Settings } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { number } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";

type SpreadSource = "real" | "broker_config" | "last_real" | "zero";

type InstrumentRow = {
  symbol:          string;
  configuredSpread: number;
  enabled:         boolean;
  updatedAt:       string;
  updatedBy:       string;
  liveSpread:      number;
  liveBid:         number;
  liveAsk:         number;
  liveMid:         number;
  lastRealSpread:  number;
  spreadSource:    SpreadSource;
};

type SpreadConfigResponse = { instruments: InstrumentRow[] };

const SOURCE_META: Record<SpreadSource, { label: string; cls: string; dot: string; desc: string }> = {
  real:         { label: "REAL",       cls: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", dot: "bg-emerald-400", desc: "Real bid/ask from TwelveData" },
  last_real:    { label: "LAST REAL",  cls: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",     dot: "bg-cyan-300",    desc: "Last observed real spread (feed paused)" },
  broker_config:{ label: "CONFIGURED", cls: "bg-amber-400/10 text-amber-400 border-amber-400/20", dot: "bg-amber-400",   desc: "Broker-configured spread (no real bid/ask)" },
  zero:         { label: "ZERO",       cls: "bg-rose-500/15 text-rose-400 border-rose-500/20",    dot: "bg-rose-400",    desc: "No spread — orders blocked" },
};

function SourceBadge({ source }: { source: SpreadSource }) {
  const m = SOURCE_META[source];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function SpreadController() {
  const qc    = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Record<string, string>>({});

  const configQ = useQuery<SpreadConfigResponse>({
    queryKey: ["admin", "broker", "spread"],
    queryFn:  () => apiGet("/api/v1/admin/broker/spread", "admin"),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const instruments = configQ.data?.instruments ?? [];
  const zeroCount   = instruments.filter((i) => i.spreadSource === "zero").length;
  const realCount   = instruments.filter((i) => i.spreadSource === "real").length;
  const configCount = instruments.filter((i) => i.spreadSource === "broker_config").length;

  const mut = useMutation({
    mutationFn: ({ symbol, spread, enabled }: { symbol: string; spread?: number; enabled?: boolean }) =>
      apiPost("/api/v1/admin/broker/spread", { symbol, spread, enabled }, "admin"),
    onSuccess: (_, vars) => {
      const label = vars.spread !== undefined
        ? `${vars.symbol} spread → ${vars.spread}`
        : `${vars.symbol} ${vars.enabled ? "enabled" : "halted"}`;
      toast.success("Spread updated", label);
      void qc.invalidateQueries({ queryKey: ["admin", "broker", "spread"] });
    },
    onError: (e) => toast.error("Update failed", e instanceof Error ? e.message : "Error"),
  });

  function saveSpread(sym: string) {
    const raw = editing[sym];
    if (raw === undefined) return;
    const val = parseFloat(raw);
    if (!isFinite(val) || val < 0) {
      toast.error("Invalid spread", "Spread must be a positive number");
      return;
    }
    mut.mutate({ symbol: sym, spread: val });
    setEditing((prev) => { const n = { ...prev }; delete n[sym]; return n; });
  }

  function toggleEnabled(row: InstrumentRow) {
    mut.mutate({ symbol: row.symbol, enabled: !row.enabled });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Broker Spread Configuration</h1>
            </div>
          </div>
          <button type="button" onClick={() => void configQ.refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:text-white">
            <RefreshCw size={11} className={configQ.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">

        {/* Status summary */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Instruments", value: instruments.length, cls: "text-white" },
            { label: "Real Feed",         value: realCount,    cls: "text-emerald-400" },
            { label: "Broker Configured", value: configCount,  cls: "text-amber-400" },
            { label: "Zero (Blocked)",    value: zeroCount,    cls: zeroCount > 0 ? "text-rose-400" : "text-slate-600" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Zero-spread warning */}
        {zeroCount > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-bold text-rose-300">
                {zeroCount} instrument{zeroCount > 1 ? "s" : ""} have zero spread — all orders on these symbols are rejected.
              </p>
              <p className="mt-0.5 text-[12px] text-slate-400">
                Set a broker-configured spread to unblock trading. Symbols with ZERO source will refuse all new orders.
              </p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {(Object.entries(SOURCE_META) as [SpreadSource, typeof SOURCE_META[SpreadSource]][]).map(([key, m]) => (
            <div key={key} className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className={`h-2 w-2 rounded-full ${m.dot}`} />
              <span className="font-bold text-slate-300">{m.label}</span>
              <span className="text-slate-600">— {m.desc}</span>
            </div>
          ))}
        </div>

        {/* Instrument table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Live Bid</th>
                <th className="px-4 py-3">Live Ask</th>
                <th className="px-4 py-3">Live Spread</th>
                <th className="px-4 py-3">Configured Spread</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((row) => {
                const editVal    = editing[row.symbol];
                const isPending  = mut.isPending && (mut.variables as { symbol: string })?.symbol === row.symbol;
                const prec       = row.liveMid > 100 ? 2 : row.liveMid > 1 ? 5 : 5;
                const isZero     = row.spreadSource === "zero";

                return (
                  <tr key={row.symbol}
                    className={`border-t border-slate-800/60 transition hover:bg-slate-900/30 ${!row.enabled ? "opacity-50" : ""}`}>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.spreadSource === "real" && (
                          <Radio size={9} className="shrink-0 animate-pulse text-emerald-400" />
                        )}
                        <span className="font-bold text-white">{row.symbol}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <SourceBadge source={row.spreadSource} />
                    </td>

                    <td className="px-4 py-3 font-mono text-[12px] text-rose-300">
                      {row.liveBid > 0 ? number(row.liveBid, prec) : "—"}
                    </td>

                    <td className="px-4 py-3 font-mono text-[12px] text-emerald-300">
                      {row.liveAsk > 0 ? number(row.liveAsk, prec) : "—"}
                    </td>

                    <td className={`px-4 py-3 font-mono text-[12px] font-semibold ${isZero ? "text-rose-400" : "text-slate-300"}`}>
                      {isZero ? "0 ⚠" : number(row.liveSpread, prec)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={editVal !== undefined ? editVal : row.configuredSpread}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [row.symbol]: e.target.value }))}
                          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[12px] text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <button type="button"
                          disabled={editVal === undefined || isPending}
                          onClick={() => saveSpread(row.symbol)}
                          className="flex items-center gap-1 rounded-lg bg-cyan-400/10 px-2.5 py-1.5 text-[10px] font-bold text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40">
                          <Save size={9} /> {isPending ? "…" : "Save"}
                        </button>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <button type="button"
                        disabled={isPending}
                        onClick={() => toggleEnabled(row)}
                        className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                          row.enabled
                            ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                            : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        }`}>
                        {row.enabled ? "Halt" : "Resume"}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      {row.enabled && !isZero && (
                        <CheckCircle2 size={14} className="text-emerald-400/60" />
                      )}
                      {isZero && row.enabled && (
                        <AlertTriangle size={14} className="text-rose-400" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Config note */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-4">
          <Settings size={13} className="mt-0.5 shrink-0 text-slate-500" />
          <p className="text-[11px] text-slate-500">
            <strong className="text-slate-400">Configured Spread</strong> is applied only when TwelveData does not provide real bid/ask for an instrument
            (indices, commodities, free plan). Forex and crypto spread config is a fallback only — real TwelveData bid/ask always takes priority.
            Spreads are in price units (index points for US500/DE40, USD/barrel for WTI, pips in decimal for Forex).
            Changes take effect within one tick cycle (~1 second).
          </p>
        </div>
      </main>
    </div>
  );
}

export default SpreadController;
