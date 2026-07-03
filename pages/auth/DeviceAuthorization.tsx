import type { HTMLAttributes, ReactNode } from "react";

export interface DeviceAuthorizationProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  value?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}

export function DeviceAuthorization({
  title = "DeviceAuthorization",
  value,
  tone = "default",
  className = "",
  children,
  ...props
}: DeviceAuthorizationProps) {
  const toneClass = {
    default: "border-slate-800 bg-slate-950/80 text-slate-200",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-100",
    danger: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  }[tone];

  return (
    <section
      className={[
        "rounded-lg border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]",
        toneClass,
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">IGFXPRO</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
        </div>
        {value ? <div className="text-right text-sm font-semibold text-cyan-200">{value}</div> : null}
      </div>
      {children ? <div className="mt-3 text-sm leading-6 text-slate-400">{children}</div> : null}
    </section>
  );
}

export default DeviceAuthorization;
