/**
 * AffiliateCenter — Affiliate dashboard with KPIs, partner table, activate/deactivate
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, CircleDollarSign, TrendingUp, CheckCircle2, XCircle, Plus } from "lucide-react";
import { money, number } from "../../shared/utils/format";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { PanelSkeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

type AffiliateStatus = "ACTIVE" | "INACTIVE" | "PENDING";

type Affiliate = {
  id: string;
  name: string;
  email: string;
  code: string;
  commissionPct: number;
  referrals: number;
  commissions: number;
  status: AffiliateStatus;
  createdAt: string;
};

const STATUS_CLS: Record<AffiliateStatus, string> = {
  ACTIVE:   "bg-emerald-400/10 text-emerald-400",
  INACTIVE: "bg-slate-700 text-slate-400",
  PENDING:  "bg-amber-400/10 text-amber-400",
};

export function AffiliateCenter() {
  const qc    = useQueryClient();
  const toast = useToast();

  const [confirm, setConfirm] = useState<{ id: string; action: "activate" | "deactivate" } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", commissionPct: "20" });

  const { data: affiliates = [], isLoading, isError, error } = useQuery<Affiliate[]>({
    queryKey:  ["admin-affiliates"],
    queryFn:   () => apiGet("/api/v1/admin/affiliates", "admin"),
    staleTime: 15_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "activate" | "deactivate" }) =>
      apiPost(`/api/v1/admin/affiliates/${encodeURIComponent(id)}/${action}`, {}, "admin"),
    onSuccess: (_, vars) => {
      toast.success("Affiliate updated", `Status set to ${vars.action === "activate" ? "ACTIVE" : "INACTIVE"}`);
      void qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
    },
    onError: (e) => toast.error("Update failed", e instanceof Error ? e.message : "Error"),
    onSettled: () => setConfirm(null),
  });

  const createMut = useMutation({
    mutationFn: (input: { name: string; email: string; commissionPct: number }) =>
      apiPost("/api/v1/admin/affiliates", input, "admin"),
    onSuccess: () => {
      toast.success("Affiliate created", "New partner is PENDING until activated");
      void qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
      setShowCreate(false);
      setForm({ name: "", email: "", commissionPct: "20" });
    },
    onError: (e) => toast.error("Creation failed", e instanceof Error ? e.message : "Error"),
  });

  const payoutMut = useMutation({
    mutationFn: (id: string) => apiPost(`/api/v1/admin/affiliates/${encodeURIComponent(id)}/pay-commissions`, {}, "admin"),
    onSuccess: (res) => {
      const count = (res as { count?: number })?.count ?? 0;
      toast.success("Commissions paid", `${count} commission${count === 1 ? "" : "s"} marked as paid`);
      void qc.invalidateQueries({ queryKey: ["admin-affiliates"] });
    },
    onError: (e) => toast.error("Payout failed", e instanceof Error ? e.message : "Error"),
  });

  const active      = affiliates.filter((a) => a.status === "ACTIVE").length;
  const totalRef    = affiliates.reduce((s, a) => s + a.referrals, 0);
  const totalComm   = affiliates.reduce((s, a) => s + a.commissions, 0);

  if (isLoading) {
    return (
      <main className="grid gap-4 p-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <PanelSkeleton key={i} rows={4} />)}
      </main>
    );
  }

  if (isError) {
    return (
      <main className="p-5">
        <p className="text-sm text-rose-400">{error instanceof Error ? error.message : "Failed to load affiliates."}</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Affiliate Center</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[12px] font-bold text-cyan-300 hover:bg-cyan-500/20"
          >
            <Plus size={12} /> New Affiliate
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">
        {showCreate && (
          <form
            className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate({
                name: form.name,
                email: form.email,
                commissionPct: Number(form.commissionPct) || 20,
              });
            }}
          >
            <input
              required
              placeholder="Partner name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <input
              type="number"
              min={0}
              max={100}
              step="0.5"
              placeholder="Commission %"
              value={form.commissionPct}
              onChange={(e) => setForm((f) => ({ ...f, commissionPct: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-lg bg-cyan-500/20 px-3 py-2 text-[12px] font-bold text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
            >
              {createMut.isPending ? "Creating…" : "Create"}
            </button>
          </form>
        )}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active Affiliates",   value: String(active),      icon: Users,             cls: "text-cyan-400"    },
            { label: "Total Referrals",     value: number(totalRef, 0), icon: TrendingUp,        cls: "text-emerald-400" },
            { label: "Commissions Paid",    value: money(totalComm),    icon: CircleDollarSign,  cls: "text-amber-400"   },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <Icon size={14} className={cls} />
              </div>
              <p className={`mt-2 text-2xl font-extrabold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Confirm banner */}
        {confirm && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-sm text-amber-300">
              Confirm <strong>{confirm.action}</strong> for affiliate ID <strong>{confirm.id}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={statusMut.isPending}
                onClick={() => statusMut.mutate(confirm)}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
              >
                {statusMut.isPending ? "Updating…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-400 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {["Affiliate", "Code", "Commission %", "Referrals", "Commissions", "Status", "Joined", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {affiliates.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">No affiliates yet.</td></tr>
              )}
              {affiliates.map((a) => (
                <tr key={a.id} className="border-t border-slate-800/60 transition hover:bg-slate-900/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{a.name}</div>
                    <div className="text-[10px] text-slate-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-cyan-400">{a.code}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{a.commissionPct}%</td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">{number(a.referrals, 0)}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-white">{money(a.commissions)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{a.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {a.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => setConfirm({ id: a.id, action: "deactivate" })}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/20"
                        >
                          <XCircle size={10} /> Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirm({ id: a.id, action: "activate" })}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 size={10} /> Activate
                        </button>
                      )}
                      {a.commissions > 0 && (
                        <button
                          type="button"
                          disabled={payoutMut.isPending}
                          onClick={() => payoutMut.mutate(a.id)}
                          className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          <CircleDollarSign size={10} /> Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AffiliateCenter;
