import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleDollarSign, Wallet, Zap, CheckCircle2, XCircle, Bot } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { Metric } from "../../components/ui/Metric";
import { StatusPill } from "../../components/ui/StatusPill";
import { PanelSkeleton } from "../../components/ui/Skeleton";
import { AdminConfirmDialog } from "../../components/admin/AdminConfirmDialog";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money, dateShort } from "../../shared/utils/format";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/ui/Toast";

type AdminClientAccount = {
  userId: string;
  profile: { fullName: string; email: string; tier: string; kycStatus: string; mifidStatus: string };
  capital: { allocated: number; equity: number; marginUsed: number; freeMargin: number; unrealizedPnl: number };
  documents: Array<{ id: string; label: string; status: string; fileName?: string; rejectionReason?: string }>;
  ledger: Array<{ id: string; type: string; amount: number; status: string; reference: string; note: string; createdAt: string }>;
};

type AutopilotClientRow = {
  userId:        string;
  enabled:       boolean;
  mode:          string;
  pausedByAdmin: boolean;
  pausedReason:  string | null;
  lastDecision:  { symbol: string; action: string; reason: string; timestamp: string } | null;
  updatedAt:     string;
};

type ConfirmState = {
  open: boolean; title: string; message: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
};

const CONFIRM_CLOSED: ConfirmState = { open: false, title: "", message: "", onConfirm: () => {} };

// Virtual row height for the ledger table
const ROW_H = 52;

export default function ClientDetailPage() {
  const { email } = useParams<{ email: string }>();
  const clientEmail = email ?? "";
  usePageTitle(`Client: ${clientEmail}`);

  const qc    = useQueryClient();
  const toast = useToast();
  const parentRef = useRef<HTMLDivElement>(null);

  const { data: account, isLoading, isError, error } = useQuery<AdminClientAccount>({
    queryKey:  ["admin-client-detail", clientEmail],
    queryFn:   () => apiGet(`/api/v1/admin/client/${encodeURIComponent(clientEmail)}`),
    enabled:   clientEmail.length > 0,
    staleTime: 15_000,
  });

  const kycMut = useMutation({
    mutationFn: ({ userId, kycStatus }: { userId: string; kycStatus: "approved" | "rejected" | "pending" }) =>
      apiPost("/api/v1/admin/client/kyc", { userId, kycStatus }, "admin"),
    onSuccess: (_, vars) => {
      toast.success(`KYC ${vars.kycStatus}`, `KYC status updated to ${vars.kycStatus}`);
      void qc.invalidateQueries({ queryKey: ["admin-client-detail", clientEmail] });
      void qc.invalidateQueries({ queryKey: ["admin", "kyc-accounts"] });
    },
    onError: (e) => toast.error("KYC update failed", e instanceof Error ? e.message : "Error"),
  });

  // ── Autopilot oversight (Task 14 Phase 5) — shares the same query key as
  // AutopilotOversight.tsx's table so both views stay in sync off one cache entry.
  const { data: autopilotData } = useQuery<{ ok: boolean; clients: AutopilotClientRow[] }>({
    queryKey: ["admin", "autopilot-clients"],
    queryFn:  () => apiGet("/api/v1/admin/autopilot/clients", "admin"),
    staleTime: 15_000,
  });
  const autopilot = autopilotData?.clients.find((c) => c.userId === account?.userId) ?? null;

  const [pauseReason, setPauseReason] = useState("");
  const [confirm, setConfirm]         = useState<ConfirmState>(CONFIRM_CLOSED);

  const pauseMut = useMutation({
    mutationFn: ({ userId, paused, reason }: { userId: string; paused: boolean; reason?: string }) =>
      apiPost("/api/v1/admin/autopilot/pause", { userId, paused, reason }, "admin"),
    onSuccess: (_, vars) => {
      setConfirm(CONFIRM_CLOSED);
      toast.success(vars.paused ? "Autopilot paused" : "Autopilot resumed");
      void qc.invalidateQueries({ queryKey: ["admin", "autopilot-clients"] });
    },
    onError: (e) => { setConfirm(CONFIRM_CLOSED); toast.error("Action failed", e instanceof Error ? e.message : "Error"); },
  });

  function handleAutopilotPause(userId: string) {
    const reason = pauseReason.trim();
    setConfirm({
      open: true, variant: "warning",
      title: "Pause this client's autopilot?",
      message: "Autopilot will reject every new trade for this client until resumed.",
      onConfirm: () => pauseMut.mutate({ userId, paused: true, reason: reason || undefined }),
    });
  }

  function handleAutopilotResume(userId: string) {
    setConfirm({
      open: true, variant: "warning",
      title: "Resume this client's autopilot?",
      message: "Autopilot will start evaluating new trades for this client again, subject to all of their normal config and risk gates.",
      onConfirm: () => pauseMut.mutate({ userId, paused: false }),
    });
  }

  // Virtualized ledger — P6.1: no more slice(0, 20)
  const ledger = account?.ledger ?? [];
  const virtualizer = useVirtualizer({
    count:          ledger.length,
    getScrollElement: () => parentRef.current,
    estimateSize:   () => ROW_H,
    overscan:       5,
  });

  if (isLoading) {
    return (
      <main className="grid gap-4 p-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <PanelSkeleton key={i} rows={4} />)}
      </main>
    );
  }

  if (isError || !account) {
    return (
      <main className="p-5">
        <Panel title="Client not found" eyebrow="error">
          <p className="text-sm text-slate-400">{isError ? String(error) : "No account found for this email."}</p>
          <Link to="/admin" className="mt-4 block text-sm text-cyan-300 hover:underline">← Back to admin</Link>
        </Panel>
      </main>
    );
  }

  return (
    <main className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-sm text-slate-400 hover:text-slate-200">← BCC</Link>
        <span className="text-slate-600">/</span>
        <span className="text-sm text-white">{account.profile.fullName}</span>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Profile" eyebrow="client information">
          <div className="space-y-3 text-sm">
            {[
              ["Full name",     account.profile.fullName],
              ["Email",         account.profile.email],
              ["Tier",          account.profile.tier],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-slate-400">{label}</span>
                <span className="font-semibold text-white">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400">KYC</span>
              <div className="flex items-center gap-2">
                <StatusPill status={account.profile.kycStatus} />
                {account.profile.kycStatus !== "APPROVED" && account.profile.kycStatus !== "approved" && (
                  <button
                    type="button"
                    disabled={kycMut.isPending}
                    onClick={() => kycMut.mutate({ userId: account.userId, kycStatus: "approved" })}
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <CheckCircle2 size={10} /> {kycMut.isPending ? "…" : "Approve"}
                  </button>
                )}
                {account.profile.kycStatus !== "REJECTED" && account.profile.kycStatus !== "rejected" && (
                  <button
                    type="button"
                    disabled={kycMut.isPending}
                    onClick={() => kycMut.mutate({ userId: account.userId, kycStatus: "rejected" })}
                    className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-2 py-1 text-[10px] font-bold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
                  >
                    <XCircle size={10} /> Reject
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">MiFID</span>
              <StatusPill status={account.profile.mifidStatus} />
            </div>
          </div>
        </Panel>

        <Panel title="Capital summary" eyebrow="balance">
          <div className="grid gap-3">
            <Metric icon={Wallet}          label="Allocated"   value={money(account.capital.allocated)}   delta="ledger approved" />
            <Metric icon={CircleDollarSign} label="Equity"     value={money(account.capital.equity)}      delta="allocated + PnL" />
            <Metric icon={Zap}             label="Free margin" value={money(account.capital.freeMargin)}  delta="available" />
          </div>
        </Panel>

        <Panel title="Documents" eyebrow="KYC queue">
          <div className="space-y-2">
            {account.documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-white">{doc.label}</div>
                  <StatusPill status={doc.status} />
                </div>
                <div className="mt-1 text-xs text-slate-500">{doc.fileName ?? "No file uploaded"}</div>
                {doc.rejectionReason && (
                  <div className="mt-1 text-xs text-rose-400">{doc.rejectionReason}</div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Autopilot oversight — Task 14 Phase 5 */}
      <Panel title="Autopilot" eyebrow="per-client oversight">
        {!autopilot ? (
          <p className="text-sm text-slate-400">Autopilot is not enabled for this client.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-cyan-400" />
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  autopilot.pausedByAdmin ? "bg-amber-400/10 text-amber-400" : "bg-emerald-400/10 text-emerald-400"
                }`}>
                  {autopilot.pausedByAdmin ? "PAUSED BY ADMIN" : "ACTIVE"}
                </span>
                <span className="text-xs text-slate-500">Mode: {autopilot.mode}</span>
              </div>
              {autopilot.pausedByAdmin ? (
                <button type="button" disabled={pauseMut.isPending} onClick={() => handleAutopilotResume(autopilot.userId)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">
                  {pauseMut.isPending ? "…" : "Resume"}
                </button>
              ) : (
                <button type="button" disabled={pauseMut.isPending} onClick={() => handleAutopilotPause(autopilot.userId)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50">
                  {pauseMut.isPending ? "…" : "Pause"}
                </button>
              )}
            </div>

            {autopilot.pausedByAdmin ? (
              <p className="text-xs italic text-slate-500">Reason: {autopilot.pausedReason ?? "No reason given"}</p>
            ) : (
              <input type="text" placeholder="Reason for pausing (optional)…"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            )}

            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Last decision</span>
              <span className="text-slate-300">
                {autopilot.lastDecision ? `${autopilot.lastDecision.symbol} — ${autopilot.lastDecision.action}` : "—"}
              </span>
            </div>
          </div>
        )}
      </Panel>

      {/* Virtualized ledger — P6.1 */}
      <Panel title={`Ledger history`} eyebrow={`${ledger.length} entries — virtualized`}>
        {ledger.length === 0 ? (
          <p className="text-sm text-slate-400">No ledger entries.</p>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-5 border-b border-slate-800 pb-2 text-xs uppercase tracking-widest text-slate-500">
              <span>Date</span><span>Type</span><span>Amount</span><span>Status</span><span className="hidden md:block">Note</span>
            </div>
            {/* Virtual scroll container */}
            <div ref={parentRef} className="overflow-auto" style={{ maxHeight: "400px" }}>
              <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
                {virtualizer.getVirtualItems().map((vItem: VirtualItem) => {
                  const entry = ledger[vItem.index];
                  return (
                    <div
                      key={vItem.key}
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vItem.start}px)`, height: ROW_H }}
                      className="grid grid-cols-5 items-center border-t border-slate-800 py-3 text-sm"
                    >
                      <span className="text-slate-400">{dateShort(entry.createdAt)}</span>
                      <StatusPill status={entry.type} />
                      <span className={entry.amount >= 0 ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                        {entry.amount >= 0 ? "+" : ""}{money(entry.amount)}
                      </span>
                      <StatusPill status={entry.status} />
                      <span className="hidden truncate text-xs text-slate-500 md:block" title={entry.note}>
                        {entry.note.substring(0, 45)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Panel>

      <AdminConfirmDialog
        {...confirm}
        submitting={pauseMut.isPending}
        onCancel={() => setConfirm(CONFIRM_CLOSED)}
      />
    </main>
  );
}
