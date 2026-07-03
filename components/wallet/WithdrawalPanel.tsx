import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { apiPost } from "../../shared/lib/apiHelpers";
import { money2 } from "../../shared/utils/format";
import { useWalletStore } from "../../store/wallet.store";

// ─── Types ────────────────────────────────────────────────────────────────────

type WithdrawBody = {
  amount: number;
  destination: string;
  method: string;
};

type WithdrawResp = {
  ok?: boolean;
  status: string;
  message?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function WithdrawalPanel() {
  const balance  = useWalletStore((s) => s.balance);
  const available = balance?.available  ?? 0;
  const freeMargin = balance?.freeMargin ?? 0;

  const [method, setMethod]           = useState<"bank_transfer" | "crypto">("bank_transfer");
  const [amount, setAmount]           = useState("");
  const [destination, setDestination] = useState("");
  const [submitted, setSubmitted]     = useState(false);

  const parsedAmount = parseFloat(amount);
  const tooLow       = parsedAmount > 0 && parsedAmount < 20;
  const tooHigh      = parsedAmount > available;
  const destValid    = destination.trim().length >= 5;
  const amountValid  = !isNaN(parsedAmount) && parsedAmount >= 20 && !tooHigh;
  const canSubmit    = amountValid && destValid;

  const mutation = useMutation({
    mutationFn: (body: WithdrawBody) =>
      apiPost<WithdrawResp>("/api/v1/client/withdraw", body),
    onSuccess: () => setSubmitted(true),
  });

  const handleSubmit = () => {
    if (!canSubmit) return;
    mutation.mutate({
      amount:      parsedAmount,
      destination: destination.trim(),
      method,
    });
  };

  const handleReset = () => {
    setSubmitted(false);
    setAmount("");
    setDestination("");
    mutation.reset();
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-amber-500/20 bg-amber-500/6 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
          <Clock size={30} className="text-amber-400" />
        </div>
        <div>
          <p className="text-lg font-bold text-white">Withdrawal Requested</p>
          <p className="mt-1.5 text-sm text-slate-400">
            Your withdrawal of <span className="font-semibold text-white">{money2(parsedAmount)}</span>{" "}
            is pending compliance review. You'll be notified when approved.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
        >
          Make another withdrawal
        </button>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Balance info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Available</p>
          <p className="mt-1 font-mono text-sm font-bold text-white">{money2(available)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Free Margin</p>
          <p className="mt-1 font-mono text-sm font-bold text-white">{money2(freeMargin)}</p>
        </div>
      </div>

      {/* Method selector */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Withdrawal method
        </p>
        <div className="flex gap-2">
          {(["bank_transfer", "crypto"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                method === m
                  ? "border-cyan-500/40 bg-cyan-500/8 text-cyan-300"
                  : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-300"
              }`}
            >
              {m === "bank_transfer" ? "Bank Transfer" : "Crypto"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
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
            placeholder="Min. $20.00"
            min={20}
            max={available}
            step="1"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-8 pr-4 text-right font-mono text-xl font-bold text-white placeholder:text-slate-700 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {tooLow && (
              <p className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle size={11} /> Minimum withdrawal is $20.00
              </p>
            )}
            {tooHigh && (
              <p className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle size={11} /> Exceeds available balance ({money2(available)})
              </p>
            )}
          </div>
          <button
            onClick={() => setAmount(String(Math.floor(available)))}
            className="text-xs font-semibold text-cyan-400 transition hover:text-cyan-300"
          >
            Max ({money2(available)})
          </button>
        </div>
      </div>

      {/* Destination */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {method === "bank_transfer" ? "IBAN / Account number" : "Wallet address"}
        </p>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={
            method === "bank_transfer"
              ? "e.g. GB82 WEST 1234 5698 7654 32"
              : "e.g. 0x1a2b3c…"
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        />
        {destination.trim().length > 0 && !destValid && (
          <p className="flex items-center gap-1.5 text-xs text-rose-400">
            <AlertCircle size={11} /> Please enter a valid destination
          </p>
        )}
      </div>

      {/* Compliance notice */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-500/6 px-4 py-3.5">
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[12px] leading-5 text-amber-200/70">
          Withdrawals are reviewed by our compliance team within 1–2 business days.
          The destination must match your verified account details.
        </p>
      </div>

      {/* Mutation error */}
      {mutation.isError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/6 px-4 py-3 text-sm text-rose-300">
          <AlertCircle size={14} />
          {(mutation.error as Error)?.message ?? "Failed to submit withdrawal"}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || mutation.isPending}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800 py-3.5 font-bold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {mutation.isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Submitting…
          </>
        ) : (
          <>
            <ArrowUpCircle size={16} />
            {canSubmit ? `Withdraw ${money2(parsedAmount)}` : "Withdraw"}
          </>
        )}
      </button>
    </div>
  );
}

export default WithdrawalPanel;
