/**
 * AMLAlerts — Real AML alert queue from GET /api/v1/admin/aml-alerts
 * Review persisted via POST /api/v1/admin/aml-alerts/:id/review
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Filter, RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money, dateShort } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";

type AlertType   = "HIGH_VALUE" | "FREQUENT" | "SUSPICIOUS";
type AlertStatus = "PENDING" | "REVIEWED" | "CLEARED";

type AMLAlert = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  type: AlertType;
  amount: number;
  timestamp: string;
  status: AlertStatus;
  reviewedBy?: string;
  note?: string;
};

const TYPE_CLS: Record<AlertType, string> = {
  HIGH_VALUE: "bg-rose-400/10 text-rose-400",
  FREQUENT:   "bg-amber-400/10 text-amber-400",
  SUSPICIOUS: "bg-violet-400/10 text-violet-400",
};

const STATUS_CLS: Record<AlertStatus, string> = {
  PENDING:  "bg-amber-400/10 text-amber-400",
  REVIEWED: "bg-cyan-400/10 text-cyan-400",
  CLEARED:  "bg-emerald-400/10 text-emerald-400",
};

export function AMLAlerts() {
  const qc    = useQueryClient();
  const toast = useToast();
  const [filter, setFilter]   = useState<AlertStatus | "ALL">("ALL");
  const [noteInput, setNote]  = useState<Record<string, string>>({});

  const { data: alerts = [], isFetching, refetch } = useQuery<AMLAlert[]>({
    queryKey: ["admin", "aml-alerts"],
    queryFn: () => apiGet("/api/v1/admin/aml-alerts", "admin"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "REVIEWED" | "CLEARED"; note?: string }) =>
      apiPost(`/api/v1/admin/aml-alerts/${id}/review`, { status, note }, "admin"),
    onSuccess: (_, vars) => {
      toast.success(`Alert ${vars.status.toLowerCase()}`, `AML alert ${vars.id} marked as ${vars.status}`);
      void qc.invalidateQueries({ queryKey: ["admin", "aml-alerts"] });
    },
    onError: (e) => toast.error("Review failed", e instanceof Error ? e.message : "Error"),
  });

  const filtered = filter === "ALL" ? alerts : alerts.filter((a) => a.status === filter);
  const pending  = alerts.filter((a) => a.status === "PENDING").length;
  const reviewed = alerts.filter((a) => a.status === "REVIEWED").length;
  const cleared  = alerts.filter((a) => a.status === "CLEARED").length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-rose-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">AML Alerts</h1>
            </div>
          </div>
          <button type="button" onClick={() => void refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:text-white">
            <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">
        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Pending",  count: pending,  cls: "text-amber-400"   },
            { label: "Reviewed", count: reviewed, cls: "text-cyan-400"    },
            { label: "Cleared",  count: cleared,  cls: "text-emerald-400" },
          ].map(({ label, count, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${cls}`}>{count}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-500" />
          {(["ALL", "PENDING", "REVIEWED", "CLEARED"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                filter === s ? "bg-cyan-400/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
              }`}>{s}</button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["ID", "User", "Type", "Amount", "Date", "Status", "Note", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-600">
                    {isFetching ? "Loading AML alerts…" : "No alerts match the selected filter"}
                  </td>
                </tr>
              ) : filtered.map((a) => {
                const isPending  = reviewMut.isPending && reviewMut.variables?.id === a.id;
                return (
                  <tr key={a.id} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{a.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{a.userName}</div>
                      <div className="text-[10px] text-slate-500">{a.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_CLS[a.type]}`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-white">{money(a.amount)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{dateShort(a.timestamp)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.status === "PENDING" && (
                        <input type="text" placeholder="Optional note…"
                          value={noteInput[a.id] ?? ""}
                          onChange={(e) => setNote((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white focus:border-cyan-500 focus:outline-none"
                        />
                      )}
                      {a.note && <span className="text-[10px] italic text-slate-600">{a.note}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a.status === "PENDING" && (
                        <div className="flex gap-1.5">
                          <button type="button" disabled={isPending}
                            onClick={() => reviewMut.mutate({ id: a.id, status: "REVIEWED", note: noteInput[a.id] })}
                            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 transition hover:bg-cyan-500/20 disabled:opacity-50">
                            {isPending ? "…" : "Review"}
                          </button>
                          <button type="button" disabled={isPending}
                            onClick={() => reviewMut.mutate({ id: a.id, status: "CLEARED", note: noteInput[a.id] })}
                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">
                            Clear
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AMLAlerts;
