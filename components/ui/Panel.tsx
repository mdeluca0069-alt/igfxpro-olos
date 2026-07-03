import type { ReactNode } from "react";
import clsx from "clsx";

interface PanelProps {
  title:     string;
  eyebrow?:  string;
  children:  ReactNode;
  action?:   ReactNode;
  className?: string;
  noPad?:    boolean;
}

export function Panel({ title, eyebrow, children, action, className, noPad }: PanelProps) {
  return (
    <section
      className={clsx(
        "rounded-lg border border-slate-800 bg-slate-950/78 shadow-[0_18px_70px_rgba(0,0,0,0.25)]",
        !noPad && "p-4",
        className
      )}
    >
      <div className={clsx("flex items-start justify-between gap-4", !noPad && "mb-4")}>
        <div className={noPad ? "p-4 pb-0" : undefined}>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">
              {eyebrow}
            </p>
          )}
          <h2 className="text-base font-semibold text-white">{title}</h2>
        </div>
        {action && <div className={noPad ? "p-4 pb-0" : undefined}>{action}</div>}
      </div>
      {children}
    </section>
  );
}

export default Panel;
