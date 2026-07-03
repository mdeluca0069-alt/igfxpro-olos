/**
 * TierManagement — Real tier stats from /admin/client-accounts
 * Tier updates via POST /api/v1/admin/client/tier
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, CheckCircle2, RefreshCw } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";

type TierKey = "STANDARD" | "GOLD" | "VIP" | "PLATINUM" | "ENTERPRISE";

type ClientAccount = {
  userId: string;
  profile: { fullName: string; email: string; tier: TierKey };
  capital: { allocated: number; equity: number };
};

type AdminOverview = {
  realRegisteredUsers: number;
  accounts: ClientAccount[];
};

const TIER_CONFIG: Record<TierKey, {
  label: string; color: string; maxLeverage: number;
  monthlyPrice: number; features: string[];
}> = {
  STANDARD:   { label: "Standard",   color: "text-slate-300",   maxLeverage: 30,  monthlyPrice: 0,   features: ["Live quotes", "Manual trading", "Basic charts", "Email support"] },
  GOLD:       { label: "Gold",       color: "text-amber-400",   maxLeverage: 100, monthlyPrice: 49,  features: ["All Standard", "OLOS signals", "Order book", "SL/TP", "Priority support"] },
  VIP:        { label: "VIP",        color: "text-violet-400",  maxLeverage: 200, monthlyPrice: 149, features: ["All Gold", "Autopilot lite", "Copy trading", "SMS alerts", "Dedicated AM"] },
  PLATINUM:   { label: "Platinum",   color: "text-cyan-400",    maxLeverage: 400, monthlyPrice: 399, features: ["All VIP", "Full Autopilot", "Dark pool pricing", "API access", "Reduced spreads"] },
  ENTERPRISE: { label: "Enterprise", color: "text-emerald-400", maxLeverage: 500, monthlyPrice: 999, features: ["All Platinum", "White-label", "Custom integration", "24/7 trading desk"] },
};

const TIERS: TierKey[] = ["STANDARD", "GOLD", "VIP", "PLATINUM", "ENTERPRISE"];

export function TierManagement() {
  const qc    = useQueryClient();
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ userId: string; email: string; fromTier: TierKey; toTier: TierKey } | null>(null);
  const [selectedTier, setSelected] = useState<TierKey | null>(null);

  const overviewQ = useQuery<AdminOverview>({
    queryKey: ["admin", "tier-overview"],
    queryFn: () => apiGet("/api/v1/admin/workspace", "admin"),
    staleTime: 30_000,
  });

  const accounts: ClientAccount[] = (overviewQ.data as any)?.accounts ?? [];

  // Count users per tier
  const tierCounts: Record<TierKey, number> = { STANDARD: 0, GOLD: 0, VIP: 0, PLATINUM: 0, ENTERPRISE: 0 };
  for (const a of accounts) {
    const t = a.profile.tier as TierKey;
    if (t in tierCounts) tierCounts[t]++;
  }

  const tierMut = useMutation({
    mutationFn: ({ userId, tier }: { userId: string; tier: TierKey }) =>
      apiPost("/api/v1/admin/client/tier", { userId, tier }, "admin"),
    onSuccess: (_, vars) => {
      toast.success("Tier updated", `User ${vars.userId.slice(0, 8)} upgraded to ${vars.tier}`);
      void qc.invalidateQueries({ queryKey: ["admin", "tier-overview"] });
      setConfirm(null);
    },
    onError: (e) => toast.error("Update failed", e instanceof Error ? e.message : "Error"),
  });

  const filteredAccounts = selectedTier
    ? accounts.filter((a) => a.profile.tier === selectedTier)
    : accounts;

  const totalUsers = accounts.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Tier Management</h1>
            </div>
          </div>
          <button type="button" onClick={() => void overviewQ.refetch()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-400 transition hover:text-white">
            <RefreshCw size={11} className={overviewQ.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">
        {/* Summary */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
          <Users size={16} className="text-slate-500" />
          <p className="text-[12px] text-slate-500">
            <span className="font-bold text-white">{totalUsers}</span> registered clients across{" "}
            <span className="font-bold text-white">{TIERS.length}</span> tiers
          </p>
        </div>

        {/* Confirm banner */}
        {confirm && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <p className="text-sm text-amber-300">
              Move <strong>{confirm.email}</strong> from {confirm.fromTier} → <strong>{confirm.toTier}</strong>?
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={tierMut.isPending}
                onClick={() => tierMut.mutate({ userId: confirm.userId, tier: confirm.toTier })}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-[12px] font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50">
                {tierMut.isPending ? "Updating…" : "Confirm"}
              </button>
              <button type="button" onClick={() => setConfirm(null)}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[12px] font-bold text-slate-400 hover:bg-slate-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tier cards */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {TIERS.map((tier) => {
            const cfg   = TIER_CONFIG[tier];
            const count = tierCounts[tier];
            return (
              <button key={tier} type="button"
                onClick={() => setSelected(selectedTier === tier ? null : tier)}
                className={`rounded-xl border p-5 text-left transition ${
                  selectedTier === tier
                    ? "border-cyan-400/40 bg-cyan-400/[0.05]"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}>
                <div className="mb-3">
                  <p className={`text-base font-extrabold ${cfg.color}`}>{cfg.label}</p>
                  <p className="text-[11px] text-slate-500">{count} clients</p>
                </div>
                <div className="mb-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Leverage</span>
                    <span className="font-bold text-white">1:{cfg.maxLeverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Price</span>
                    <span className="font-bold text-white">{cfg.monthlyPrice === 0 ? "Free" : `${money(cfg.monthlyPrice)}/mo`}</span>
                  </div>
                </div>
                <ul className="space-y-1">
                  {cfg.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <CheckCircle2 size={9} className={cfg.color} /> {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Client list for selected tier */}
        {filteredAccounts.length > 0 && (
          <div className="rounded-xl border border-slate-800">
            <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {selectedTier ? `${selectedTier} clients` : "All clients"} ({filteredAccounts.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    {["Name", "Email", "Tier", "Equity", "Change tier"].map((h) => (
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.slice(0, 20).map((a) => {
                    const currentTier = a.profile.tier as TierKey;
                    const cfg = TIER_CONFIG[currentTier];
                    return (
                      <tr key={a.userId} className="border-t border-slate-800/40 hover:bg-slate-900/20">
                        <td className="px-4 py-3 font-semibold text-white">{a.profile.fullName}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">{a.profile.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold ${cfg.color}`}>{currentTier}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-300">{money(a.capital.equity)}</td>
                        <td className="px-4 py-3">
                          <select
                            defaultValue={currentTier}
                            onChange={(e) => {
                              const toTier = e.target.value as TierKey;
                              if (toTier !== currentTier) {
                                setConfirm({ userId: a.userId, email: a.profile.email, fromTier: currentTier, toTier });
                              }
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-white focus:border-cyan-500 focus:outline-none"
                          >
                            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TierManagement;
