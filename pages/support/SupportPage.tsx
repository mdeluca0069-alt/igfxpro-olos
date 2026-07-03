import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Panel } from "../../components/ui/Panel";
import { usePageTitle } from "../../hooks/usePageTitle";
import { apiGet, apiPost, isApiError } from "../../shared/lib/apiHelpers";

type TicketStatus   = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type TicketCategory = "GENERAL" | "TRADING" | "ACCOUNT" | "COMPLIANCE" | "TECHNICAL";

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  resolution?: string | null;
  agentNote?: string | null;
  slaDeadline?: string | null;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
};

const STATUS_STYLE: Record<TicketStatus, string> = {
  OPEN:        "text-amber-300 bg-amber-500/10 border-amber-500/30",
  IN_PROGRESS: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
  RESOLVED:    "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  CLOSED:      "text-slate-400 bg-slate-700/30 border-slate-600/30",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function SupportPage() {
  usePageTitle("Support");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ tickets: Ticket[]; total: number }>({
    queryKey: ["support-tickets"],
    queryFn:  () => apiGet("/api/v1/support/tickets?limit=50"),
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
  const tickets = data?.tickets ?? [];

  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);

  async function submitTicket() {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiPost("/api/v1/support/tickets", { subject, message, priority, category });
      setSubject("");
      setMessage("");
      setPriority("NORMAL");
      setCategory("GENERAL");
      await qc.invalidateQueries({ queryKey: ["support-tickets"] });
    } catch (err) {
      setError(isApiError(err) ? err.message : "Failed to submit ticket — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid gap-4 p-5 lg:grid-cols-2">
      <Panel title="Submit a support ticket" eyebrow="client care">
        <div className="space-y-3 text-sm">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            maxLength={200}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail…"
            rows={5}
            maxLength={5000}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <div className="flex gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {(["LOW", "NORMAL", "HIGH", "URGENT"] as const).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {(["GENERAL", "TRADING", "ACCOUNT", "COMPLIANCE", "TECHNICAL"] as const).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            onClick={submitTicket}
            disabled={submitting}
            className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit ticket"}
          </button>
          <p className="text-xs text-slate-500">
            A confirmation will be sent to your registered email, and you'll be notified the moment our team replies.
          </p>
        </div>
      </Panel>

      <Panel title="My tickets" eyebrow={`${tickets.length} total`}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-500">You haven't opened any support tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setOpenTicket(t)}
                className="w-full rounded-lg border border-slate-700 p-3 text-left transition hover:bg-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-200">{t.subject}</span>
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>#{t.id.slice(0, 8).toUpperCase()}</span>
                  <span>{t.priority}</span>
                  <span>{fmtDate(t.createdAt)}</span>
                  {t.slaBreached && <span className="text-rose-400">SLA breached</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {openTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5" onClick={() => setOpenTicket(null)}>
          <div className="max-w-lg w-full rounded-xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">{openTicket.subject}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[openTicket.status]}`}>
                {openTicket.status.replace("_", " ")}
              </span>
            </div>
            <p className="mb-3 whitespace-pre-wrap text-sm text-slate-400">{openTicket.message}</p>
            {(openTicket.agentNote || openTicket.resolution) && (
              <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">Support team reply</p>
                <p className="whitespace-pre-wrap text-sm text-slate-300">{openTicket.resolution ?? openTicket.agentNote}</p>
              </div>
            )}
            <button onClick={() => setOpenTicket(null)} className="mt-4 w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Close
            </button>
          </div>
        </div>
      )}

      <Panel title="Operational contacts" eyebrow="SLA">
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-lg bg-slate-900 p-3">General support: <span className="text-cyan-300">support@igfxpro.com</span> — response within 24h</div>
          <div className="rounded-lg bg-slate-900 p-3">Compliance desk: select category "COMPLIANCE" above for priority routing</div>
          <div className="rounded-lg bg-slate-900 p-3">Urgent trading issues: select priority "URGENT" — response within 2h</div>
        </div>
      </Panel>
    </main>
  );
}
