import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id:        string;
  variant:   ToastVariant;
  title:     string;
  message?:  string;
  duration?: number;   // ms; 0 = persistent
  action?:   { label: string; onClick: () => void };
  createdAt: number;
}

export type ToastInput = Omit<Toast, "id" | "createdAt">;

type Action =
  | { type: "ADD";    toast: Toast }
  | { type: "REMOVE"; id: string   }
  | { type: "CLEAR"                };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case "ADD":    return [action.toast, ...state].slice(0, 6);
    case "REMOVE": return state.filter((t) => t.id !== action.id);
    case "CLEAR":  return [];
    default:       return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ToastContextValue = {
  toasts:  Toast[];
  add:     (input: ToastInput) => string;
  remove:  (id: string) => void;
  success: (title: string, message?: string) => string;
  error:   (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info:    (title: string, message?: string) => string;
  clear:   () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;
const nextId = () => `toast-${++idCounter}`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);

  const remove = useCallback((id: string) => dispatch({ type: "REMOVE", id }), []);
  const clear  = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const add = useCallback((input: ToastInput): string => {
    const id = nextId();
    dispatch({ type: "ADD", toast: { ...input, id, createdAt: Date.now() } });
    return id;
  }, []);

  const success = useCallback((title: string, message?: string) =>
    add({ variant: "success", title, message, duration: 4000 }), [add]);
  const error   = useCallback((title: string, message?: string) =>
    add({ variant: "error",   title, message, duration: 6000 }), [add]);
  const warning = useCallback((title: string, message?: string) =>
    add({ variant: "warning", title, message, duration: 8000 }), [add]);
  const info    = useCallback((title: string, message?: string) =>
    add({ variant: "info",    title, message, duration: 4000 }), [add]);

  return (
    <ToastContext.Provider value={{ toasts, add, remove, success, error, warning, info, clear }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
};

const BORDER: Record<ToastVariant, string> = {
  success: "border-emerald-500/30 bg-emerald-500/10",
  error:   "border-rose-500/30    bg-rose-500/10",
  warning: "border-amber-500/30   bg-amber-500/10",
  info:    "border-cyan-500/30    bg-cyan-500/10",
};

const ICON_CLR: Record<ToastVariant, string> = {
  success: "text-emerald-400",
  error:   "text-rose-400",
  warning: "text-amber-400",
  info:    "text-cyan-400",
};

const TEXT_CLR: Record<ToastVariant, string> = {
  success: "text-emerald-100",
  error:   "text-rose-100",
  warning: "text-amber-100",
  info:    "text-cyan-100",
};

// ─── Toast item ───────────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { id, variant, title, message, duration, action } = toast;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!duration) return;
    timerRef.current = setTimeout(() => onRemove(id), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [id, duration, onRemove]);

  const Icon = ICONS[variant];

  return (
    <div
      role="alert"
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={clsx(
        "flex items-start gap-3 rounded-xl border p-4 shadow-2xl",
        BORDER[variant], TEXT_CLR[variant]
      )}
    >
      <Icon size={18} className={clsx("mt-0.5 shrink-0", ICON_CLR[variant])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {message && <p className="mt-0.5 text-xs opacity-80">{message}</p>}
        {action && (
          <button onClick={action.onClick} className="mt-1.5 text-xs font-semibold underline hover:opacity-80">
            {action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(id)}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (!toasts.length) return null;
  return (
    <div
      aria-label="Notifications"
      className="fixed right-4 top-20 z-[9999] flex w-80 flex-col gap-2 sm:right-6"
    >
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onRemove={onRemove} />)}
    </div>
  );
}
