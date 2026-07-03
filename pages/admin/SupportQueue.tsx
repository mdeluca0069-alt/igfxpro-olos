/**
 * SupportQueue — agent ticket queue from GET /api/v1/admin/support/tickets
 * Reply:        POST /api/v1/admin/support/tickets/:id/reply   (note to client, no resolve)
 * Status/close: POST /api/v1/admin/support/tickets/:id/status (optional resolution note)
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Headphones, Send, CheckCircle2 } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";

type TicketStatus   = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type Ticket = {
  id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
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

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  LOW:    "text-slate-400",
  NORMAL: "text-cyan-300",
  HIGH:   "text-amber-300",
  URGENT: "text-rose-400",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function SupportQueue() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [reply, setReply]       = useState("");

  const { data, isLoading } = useQuery<{ tickets: Ticket[]; total: number }>({
    queryKey: ["admin-support-tickets", statusFilter],
    queryFn:  () => apiGet(`/api/v1/admin/support/tickets?limit=100${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}`, "admin"),
    staleTime: 8_000,
    refetchInterval: 15_000,
  });
  const tickets = data?.tickets ?? [];

  const replyMutation = useMutation({
    mutationFn: (vars: { id: string; message: string }) =>
      apiPost(`/api/v1/admin/support/tickets/${vars.id}/reply`, { message: vars.message }, "admin"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-support-tickets"] }); setReply(""); setSelected(null); },
  });

  const resolveMutation = useMutation({
    mutationFn: (vars: { id: string; status: TicketStatus; resolution?: string }) =>
      apiPost(`/api/v1/admin/support/tickets/${vars.id}/status`, { status: vars.status, resolution: vars.resolution }, "admin"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-support-tickets"] }); setReply(""); setSelected(null); },
  });

  const counts = tickets.reduce<Record<string, number>>((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {});

  return (
    <main className="grid gap-4 p-5 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Headphones size={16} className="text-cyan-400" /> Support Queue
          </h1>
          <div className="flex gap-1.5">
            {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  statusFilter === s ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" : "border-slate-700 text-slate-500 hover:text-slate-300"
                }`}
              >
                {s.replace("_", " ")}{s !== "ALL" && counts[s] ? ` (${counts[s]})` : ""}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Loading queue…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets in this filter.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full rounded-lg border p-3 text-left transition hover:bg-slate-900 ${selected?.id === t.id ? "border-cyan-500/40 bg-slate-900" : "border-slate-800"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-200">{t.subject}</span>
                  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[t.status]}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{t.userEmail ?? t.userId?.slice(0, 8)}</span>
                  <span className={PRIORITY_STYLE[t.priority]}>{t.priority}</span>
                  <span>{fmtDate(t.createdAt)}</span>
                  {t.slaBreached && <span className="text-rose-400">SLA breached</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        {!selected ? (
          <p className="text-sm text-slate-500">Select a ticket to reply or resolve it.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{selected.userEmail ?? selected.userId}</p>
              <h2 className="text-sm font-semibold text-slate-200">{selected.subject}</h2>
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-sm text-slate-400">{selected.message}</p>
            {selected.agentNote && (
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase text-cyan-300">Last reply sent</p>
                <p className="whitespace-pre-wrap text-sm text-slate-300">{selected.agentNote}</p>
              </div>
            )}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply to the client…"
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => reply.trim() && replyMutation.mutate({ id: selected.id, message: reply.trim() })}
                disabled={!reply.trim() || replyMutation.isPending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
              >
                <Send size={13} /> Send reply
              </button>
              <button
                onClick={() => resolveMutation.mutate({ id: selected.id, status: "RESOLVED", resolution: reply.trim() || undefined })}
                disabled={resolveMutation.isPending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <CheckCircle2 size={13} /> Resolve
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
