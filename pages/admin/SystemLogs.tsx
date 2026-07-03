/**
 * SystemLogs — Real-time audit trail from GET /api/v1/admin/system-logs
 * Polls every 5 seconds, filter by level, auto-scroll.
 */
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Terminal, Filter, RefreshCw } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

type LogEntry = {
  id: string;
  level: LogLevel;
  service: string;
  message: string;
  timestamp: string;
  actor?: string;
  action?: string;
};

const LEVEL_CLS: Record<LogLevel, string> = {
  INFO:  "text-cyan-400",
  WARN:  "text-amber-400",
  ERROR: "text-rose-400",
  DEBUG: "text-slate-500",
};

const LEVEL_BG: Record<LogLevel, string> = {
  INFO:  "bg-cyan-400/10 text-cyan-400",
  WARN:  "bg-amber-400/10 text-amber-400",
  ERROR: "bg-rose-400/10 text-rose-400",
  DEBUG: "bg-slate-800 text-slate-500",
};

function inferLevel(action: string): LogLevel {
  if (action.includes("kill_switch") || action.includes("fail") || action.includes("reject")) return "ERROR";
  if (action.includes("warn") || action.includes("margin") || action.includes("alert")) return "WARN";
  if (action.startsWith("admin.")) return "INFO";
  return "DEBUG";
}

export function SystemLogs() {
  const [filter, setFilter]   = useState<LogLevel | "ALL">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: rawLogs = [], isFetching, refetch } = useQuery<LogEntry[]>({
    queryKey: ["admin", "system-logs"],
    queryFn: async () => {
      const entries = await apiGet<Array<{
        id: string; level: string; service: string;
        message: string; timestamp: string; actor?: string; action?: string;
      }>>("/api/v1/admin/system-logs?limit=200", "admin");
      return entries.map((e) => ({
        ...e,
        level: (["INFO","WARN","ERROR","DEBUG"].includes(e.level) ? e.level : inferLevel(e.action ?? "")) as LogLevel,
      }));
    },
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const logs = rawLogs;
  const filtered = filter === "ALL" ? logs : logs.filter((l) => l.level === filter);

  const counts: Record<LogLevel, number> = { INFO: 0, WARN: 0, ERROR: 0, DEBUG: 0 };
  for (const l of logs) counts[l.level]++;

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered, autoScroll]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">System Logs</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500">{logs.length} entries · live audit trail</span>
            <button type="button" onClick={() => void refetch()}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:text-white">
              <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" onClick={() => setAutoScroll((p) => !p)}
              className={`rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${
                autoScroll ? "border-cyan-500/40 bg-cyan-400/10 text-cyan-300" : "border-slate-700 text-slate-500 hover:text-slate-300"
              }`}>
              Auto-scroll {autoScroll ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-4 p-6">
        {/* Filter + counts */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={13} className="text-slate-500" />
          {(["ALL", "INFO", "WARN", "ERROR", "DEBUG"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setFilter(l)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                filter === l ? "bg-cyan-400/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
              }`}>
              {l}
              {l !== "ALL" && (
                <span className={`rounded-full px-1.5 text-[9px] ${LEVEL_BG[l as LogLevel]}`}>
                  {counts[l as LogLevel]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Log stream */}
        <div className="h-[600px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-[11px]">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-slate-600">
              {isFetching ? "Loading audit trail…" : "No log entries match the current filter."}
            </p>
          ) : filtered.map((entry) => (
            <div key={entry.id} className="flex gap-2 border-b border-slate-800/30 py-1.5 last:border-0">
              <span className="shrink-0 text-slate-600">
                {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false })}
              </span>
              <span className={`shrink-0 w-12 font-bold ${LEVEL_CLS[entry.level]}`}>
                {entry.level}
              </span>
              <span className="shrink-0 w-32 text-slate-500 truncate">{entry.service}</span>
              <span className="text-slate-300 leading-relaxed flex-1 truncate">{entry.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}

export default SystemLogs;
