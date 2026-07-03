import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownCircle,
  Check,
  CreditCard,
  ExternalLink,
  Globe,
  Landmark,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { money2 } from "../../shared/utils/format";
import { useWalletStore } from "../../store/wallet.store";

// ─── Types ────────────────────────────────────────────────────────────────────

type PSPListResp = { psps: string[] };

type InitiateResp = {
  depositId: string;
  redirectUrl: string;
  status: string;
};

type DepositStatusResp = {
  depositId: string;
  status: "REQUESTED" | "PENDING" | "CONFIRMED" | "CREDITED" | "FAILED" | "EXPIRED";
  psp: string;
  amount: number;
  currency: string;
  failReason?: string;
  requestedAt: string;
  creditedAt?: string;
};

// ─── PSP metadata ─────────────────────────────────────────────────────────────

const PSP_META: Record<string, { label: string; desc: string; icon: React.ReactNode; minAmount: number }> = {
  STRIPE: {
    label: "Credit / Debit Card",
    desc: "Visa · Mastercard · Amex",
    icon: <CreditCard size={20} />,
    minAmount: 10,
  },
  NUVEI: {
    label: "Online Banking",
    desc: "Bank transfer · Local methods",
    icon: <Landmark size={20} />,
    minAmount: 50,
  },
  PRAXIS: {
    label: "Alternative Payments",
    desc: "Crypto · e-Wallets · Local",
    icon: <Globe size={20} />,
    minAmount: 20,
  },
};

const QUICK_AMOUNTS = [100, 250, 500, 1000, 5000];

const TERMINAL_STATUSES = ["CREDITED", "FAILED", "EXPIRED"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function DepositPanel() {
  const balance      = useWalletStore((s) => s.balance);
  const fetchBalance = useWalletStore((s) => s.fetchBalance);

  const [selectedPsp, setSelectedPsp] = useState<string | null>(null);
  const [amount, setAmount]           = useState("");
  const [depositId, setDepositId]     = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const minAmount    = selectedPsp ? (PSP_META[selectedPsp]?.minAmount ?? 10) : 10;
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= minAmount;
  const canSubmit    = !!selectedPsp && amountValid;

  // ── PSP list ──────────────────────────────────────────────────────────────
  const pspsQ = useQuery<PSPListResp>({
    queryKey: ["payments-psps"],
    queryFn:  () => apiGet("/api/v1/payments/psps"),
    staleTime: 5 * 60_000,
  });

  // ── Deposit status polling ─────────────────────────────────────────────────
  const statusQ = useQuery<DepositStatusResp>({
    queryKey: ["deposit-status", depositId],
    queryFn:  () => apiGet(`/api/v1/payments/deposit/${depositId}`),
    enabled:  !!depositId,
    refetchInterval: (query) => {
      const data = query.state.data as DepositStatusResp | undefined;
      if (!data) return 3_000;
      return (TERMINAL_STATUSES as readonly string[]).includes(data.status) ? false : 3_000;
    },
  });

  // Refresh wallet balance when deposit is credited
  useEffect(() => {
    if (statusQ.data?.status === "CREDITED") {
      void fetchBalance();
    }
  }, [statusQ.data?.status, fetchBalance]);

  // ── Initiate mutation ──────────────────────────────────────────────────────
  const initMutation = useMutation({
    mutationFn: (body: { psp: string; amount: number; currency: string; returnUrl: string }) =>
      apiPost<InitiateResp>("/api/v1/payments/deposit/initiate", body),
    onSuccess: (resp) => {
      setDepositId(resp.depositId);
      setRedirectUrl(resp.redirectUrl);
    },
  });

  const handleSubmit = () => {
    if (!selectedPsp || !canSubmit) return;
    initMutation.mutate({
      psp:       selectedPsp,
      amount:    parsedAmount,
      currency:  "USD",
      returnUrl: window.location.href,
    });
  };

  const handleReset = () => {
    setDepositId(null);
    setRedirectUrl(null);
    setAmount("");
    setSelectedPsp(null);
    initMutation.reset();
  };

  const depositStatus = statusQ.data?.status;

  // ── Terminal states ────────────────────────────────────────────────────────

  if (depositStatus === "CREDITED") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/6 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
          <Check size={30} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">Deposit Successful</p>
          <p className="mt-1.5 text-sm text-slate-400">
            {money2(statusQ.data?.amount ?? parsedAmount)} has been credited to your account.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
        >
          Make another deposit
        </button>
      </div>
    );
  }

  if (depositStatus === "FAILED" || depositStatus === "EXPIRED") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-rose-500/20 bg-rose-500/6 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
          <AlertCircle size={30} className="text-rose-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">
            {depositStatus === "FAILED" ? "Payment Failed" : "Session Expired"}
          </p>
          <p className="mt-1.5 text-sm text-slate-400">
            {statusQ.data?.failReason ?? "Please try again or contact support."}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Redirect / polling state ───────────────────────────────────────────────

  if (depositId && redirectUrl) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/6 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Loader2 size={18} className="animate-spin text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Awaiting payment confirmation</p>
              <p className="mt-1 text-sm text-slate-400">
                Complete your payment on the provider page. This screen updates automatically.
              </p>
              {depositStatus && (
                <p className="mt-2 font-mono text-[11px] text-slate-600">
                  Deposit ID: {depositId} · Status: {depositStatus}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <a
            href={redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/12 px-5 py-3 font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            <ExternalLink size={15} />
            Open payment page
          </a>
          <button
            onClick={() => void statusQ.refetch()}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>

        <button
          onClick={handleReset}
          className="w-full text-xs text-slate-600 transition hover:text-slate-400"
        >
          Cancel and start over
        </button>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Current balance */}
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
        <span className="text-sm text-slate-500">Available balance</span>
        <span className="font-mono text-sm font-bold text-white">
          {money2(balance?.available ?? 0)}
        </span>
      </div>

      {/* PSP selector */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Payment method
        </p>

        {pspsQ.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[58px] animate-pulse rounded-xl bg-slate-800/50" />
            ))}
          </div>
        ) : pspsQ.isError ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/6 px-4 py-3 text-sm text-rose-300">
            <AlertCircle size={13} />
            Failed to load payment methods. Refresh to retry.
          </div>
        ) : (
          <div className="space-y-2">
            {(pspsQ.data?.psps ?? []).map((psp) => {
              const meta   = PSP_META[psp] ?? { label: psp, desc: "", icon: <Wallet size={20} />, minAmount: 10 };
              const active = selectedPsp === psp;
              return (
                <button
                  key={psp}
                  onClick={() => setSelectedPsp(psp)}
                  className={`w-full flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition ${
                    active
                      ? "border-cyan-500/40 bg-cyan-500/8"
                      : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/60"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                      active ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold transition ${active ? "text-white" : "text-slate-300"}`}>
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-slate-500">{meta.desc}</p>
                  </div>
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    active
                      ? "border-cyan-500/60 bg-cyan-500/20"
                      : "border-slate-700 bg-transparent"
                  }`}>
                    {active && <Check size={11} className="text-cyan-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Amount */}
      {selectedPsp && (
        <div className="space-y-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Amount (USD)
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 select-none text-sm font-bold text-slate-500">
              $
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min. ${money2(minAmount)}`}
              min={minAmount}
              step="1"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-8 pr-4 text-right font-mono text-xl font-bold text-white placeholder:text-slate-700 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          {parsedAmount > 0 && parsedAmount < minAmount && (
            <p className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle size={11} /> Minimum deposit is {money2(minAmount)}
            </p>
          )}

          {/* Quick-select amounts */}
          <div className="flex gap-1.5">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={`flex-1 rounded-lg border py-1.5 text-[11px] font-bold transition ${
                  parsedAmount === q
                    ? "border-cyan-500/40 bg-cyan-500/12 text-cyan-300"
                    : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                ${q >= 1000 ? `${q / 1000}k` : q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mutation error */}
      {initMutation.isError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/6 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} />
          {(initMutation.error as Error)?.message ?? "Failed to initiate deposit"}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || initMutation.isPending}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/12 py-3.5 font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {initMutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Processing…
          </>
        ) : (
          <>
            <ArrowDownCircle size={16} />
            {canSubmit ? `Deposit ${money2(parsedAmount)}` : "Deposit"}
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-600">
        Funds are credited after PSP confirmation · All deposits subject to compliance review
      </p>
    </div>
  );
}

export default DepositPanel;
