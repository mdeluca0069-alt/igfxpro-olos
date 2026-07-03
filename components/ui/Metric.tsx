import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface MetricProps {
  icon:   LucideIcon;
  label:  string;
  value:  string;
  delta?: string;
  tone?:  "default" | "green" | "red" | "amber";
}

export function Metric({ icon: Icon, label, value, delta, tone = "default" }: MetricProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#08111f] p-4">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
        <Icon size={17} className="text-cyan-300" aria-hidden />
      </div>
      <div className={clsx(
        "mt-3 text-2xl font-semibold",
        tone === "green" ? "text-emerald-300" :
        tone === "red"   ? "text-rose-300"    :
        tone === "amber" ? "text-amber-300"   :
        "text-white"
      )}>
        {value}
      </div>
      {delta && <div className="mt-1 text-xs text-emerald-300">{delta}</div>}
    </div>
  );
}

export default Metric;
