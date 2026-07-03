const GOOD  = new Set(["operational", "FILLED", "BUY", "approved", "APPROVED", "COMPLETED", "STANDARD", "GOLD", "PLATINUM", "VIP", "ENTERPRISE"]);
const WARN  = new Set(["degraded", "NEUTRAL", "pending", "PENDING_REVIEW", "PENDING_ADMIN", "MISSING", "RISK_REVIEW"]);

interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps) {
  const good = GOOD.has(status);
  const warn = WARN.has(status);

  return (
    <span
      className={[
        "inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
        good ? "bg-emerald-400/10 text-emerald-300" :
        warn ? "bg-amber-400/10 text-amber-300"     :
               "bg-rose-400/10 text-rose-300",
      ].join(" ")}
      aria-label={status}
    >
      {status}
    </span>
  );
}

export default StatusPill;
