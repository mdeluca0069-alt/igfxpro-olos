/**
 * AutopilotOversight — Task 14 Phase 5. Platform-wide table of every client
 * with autopilot enabled, backed by GET /api/v1/admin/autopilot/clients
 * (Task 14 Phase 3). Lets an admin pause/resume one client's autopilot
 * without touching the platform-wide toggle on the main Admin page.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, RefreshCw } from "lucide-react";
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { dateShort } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";
import { usePageTitle } from "../../hooks/usePageTitle";

type AutopilotClientRow = {
  userId:        string;
  enabled:       boolean;
  mode:          string;
  pausedByAdmin: boolean;
  pausedReason:  string | null;
  lastDecision:  { symbol: string; action: string; reason: string; timestamp: string } | null;
  updatedAt:     string;
  consentAcceptedAt:    string | null;
  dailyLossLockedUntil: string | null;
};

type ConfirmState = {
  open: boolean; title: string; message: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
};

const CLOSED: ConfirmState = { open: false, title: "", message: "", onConfirm: () => {} };

export function AutopilotOversight() {
  usePageTitle("Autopilot Oversight");
  const qc    = useQueryClient();
  const toast = useToast();

  const [reasonInput, setReasonInput] = useState<Record<string, string>>({});
  const [confirm, setConfirm]         = useState<ConfirmState>(CLOSED);

  const { data, isFetching, refetch } = useQuery<{ ok: boolean; clients: AutopilotClientRow[] }>({
    queryKey: ["admin", "autopilot-clients"],
    queryFn:  () => apiGet("/api/v1/admin/autopilot/clients", "admin"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const clients = data?.clients ?? [];
  const active  = clients.filter((c) => c.enabled && !c.pausedByAdmin).length;
  const paused  = clients.filter((c) => c.pausedByAdmin).length;

  const pauseMut = useMutation({
    mutationFn: ({ userId, pause, reason }: { userId: string; pause: boolean; reason?: string }) =>
      apiPost("/api/v1/admin/autopilot/pause", { userId, paused: pause, reason }, "admin"),
    onSuccess: (_, vars) => {
      setConfirm(CLOSED);
      toast.success(vars.pause ? "Autopilot paused" : "Autopilot resumed", `Client ${vars.userId}`);
      void qc.invalidateQueries({ queryKey: ["admin", "autopilot-clients"] });
    },
    onError: (e) => { setConfirm(CLOSED); toast.error("Action failed", e instanceof Error ? e.message : "Error"); },
  });

  function handlePause(userId: string) {
    const reason = reasonInput[userId]?.trim();
    setConfirm({
      open: true, variant: "warning",
      title: "Pause this client's autopilot?",
      message: reason
        ? `Autopilot will reject every new trade for ${userId} until resumed. Reason: "${reason}"`
        : `Autopilot will reject every new trade for ${userId} until resumed. Consider adding a reason above for the audit log.`,
      onConfirm: () => pauseMut.mutate({ userId, pause: true, reason: reason || undefined }),
    });
  }

  function handleResume(userId: string) {
    setConfirm({
      open: true, variant: "warning",
      title: "Resume this client's autopilot?",
      message: `Autopilot will start evaluating new trades for ${userId} again, subject to all of their normal config and risk gates.`,
      onConfirm: () => pauseMut.mutate({ userId, pause: false }),
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Autopilot Oversight</h1>
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
            { label: "Autopilot-enabled clients", count: clients.length, cls: "text-white" },
            { label: "Actively trading",          count: active,        cls: "text-emerald-400" },
            { label: "Paused by admin",            count: paused,        cls: paused > 0 ? "text-amber-400" : "text-slate-500" },
          ].map(({ label, count, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${cls}`}>{count}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Client", "Mode", "Status", "Consent", "Daily loss", "Last decision", "Updated", "Pause reason", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-600">
                    {isFetching ? "Loading autopilot clients…" : "No clients have autopilot enabled."}
                  </td>
                </tr>
              ) : clients.map((c) => {
                const isPending = pauseMut.isPending && pauseMut.variables?.userId === c.userId;
                return (
                  <tr key={c.userId} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{c.userId}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">{c.mode}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.pausedByAdmin ? "bg-amber-400/10 text-amber-400" : "bg-emerald-400/10 text-emerald-400"
                      }`}>
                        {c.pausedByAdmin ? "PAUSED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.consentAcceptedAt ? (
                        <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">Accepted</span>
                      ) : (
                        <span className="rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.dailyLossLockedUntil && new Date(c.dailyLossLockedUntil) > new Date() ? (
                        <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">Locked</span>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {c.lastDecision ? `${c.lastDecision.symbol} — ${c.lastDecision.action}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{dateShort(c.updatedAt)}</td>
                    <td className="px-4 py-3">
                      {c.pausedByAdmin ? (
                        <span className="text-[10px] italic text-slate-600">{c.pausedReason ?? "No reason given"}</span>
                      ) : (
                        <input type="text" placeholder="Reason (optional)…"
                          value={reasonInput[c.userId] ?? ""}
                          onChange={(e) => setReasonInput((prev) => ({ ...prev, [c.userId]: e.target.value }))}
                          className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white focus:border-cyan-500 focus:outline-none"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.pausedByAdmin ? (
                        <button type="button" disabled={isPending} onClick={() => handleResume(c.userId)}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">
                          {isPending ? "…" : "Resume"}
                        </button>
                      ) : (
                        <button type="button" disabled={isPending} onClick={() => handlePause(c.userId)}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50">
                          {isPending ? "…" : "Pause"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <AdminConfirmDialog
        {...confirm}
        submitting={pauseMut.isPending}
        onCancel={() => setConfirm(CLOSED)}
      />
    </div>
  );
}

export default AutopilotOversight;
