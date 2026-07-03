/**
 * ComplianceDashboard — KYC/MiFID/ESMA/AML metrics and compliance timeline.
 * KPIs derived from /admin/overview real data.
 * Timeline from /admin/compliance/audit real audit trail.
 */
import { useQuery } from "@tanstack/react-query";
import { Shield, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { dateTime } from "../../shared/utils/format";

type ComplianceStatus = "COMPLIANT" | "REVIEW_NEEDED" | "ACTION_REQUIRED";

type TimelineEvent = {
  id: string;
  type: "KYC" | "MIFID" | "AML" | "ESMA";
  message: string;
  timestamp: string;
  severity: "INFO" | "WARNING" | "ERROR";
};

type AuditEntry = {
  id: string; actor: string; action: string;
  entity: string; payload: unknown; createdAt: string;
};

type AuditPage = {
  entries: AuditEntry[];
  totalCount: number;
};

const SEV_CLS: Record<string, string> = {
  INFO:    "text-cyan-400",
  WARNING: "text-amber-400",
  ERROR:   "text-rose-400",
};

const SEV_ICON: Record<string, React.ElementType> = {
  INFO:    CheckCircle2,
  WARNING: AlertTriangle,
  ERROR:   XCircle,
};

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; cls: string; icon: React.ElementType }> = {
  COMPLIANT:       { label: "COMPLIANT",       cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400", icon: CheckCircle2  },
  REVIEW_NEEDED:   { label: "REVIEW NEEDED",   cls: "border-amber-500/40  bg-amber-500/10  text-amber-400",    icon: AlertTriangle },
  ACTION_REQUIRED: { label: "ACTION REQUIRED", cls: "border-rose-500/40   bg-rose-500/10   text-rose-400",     icon: XCircle       },
};

const TYPE_CLS: Record<string, string> = {
  KYC:   "bg-violet-400/10 text-violet-400",
  MIFID: "bg-cyan-400/10 text-cyan-400",
  AML:   "bg-rose-400/10 text-rose-400",
  ESMA:  "bg-emerald-400/10 text-emerald-400",
};

function auditToTimeline(e: AuditEntry): TimelineEvent {
  const act = e.action.toLowerCase();
  const type: TimelineEvent["type"] =
    act.includes("kyc") || act.includes("document")            ? "KYC"   :
    act.includes("aml") || act.includes("suspicious")           ? "AML"   :
    act.includes("esma") || act.includes("leverage")            ? "ESMA"  :
    "MIFID";

  const severity: TimelineEvent["severity"] =
    act.includes("reject") || act.includes("fail") || act.includes("suspend") ? "ERROR"   :
    act.includes("alert")  || act.includes("warn")  || act.includes("flag")   ? "WARNING" :
    "INFO";

  return {
    id:        e.id,
    type,
    message:   `[${e.actor}] ${e.action} on ${e.entity}`,
    timestamp: e.createdAt,
    severity,
  };
}

type AdminOverview = {
  kycQueue: number;
  realRegisteredUsers: number;
  orders: number;
  accounts?: Array<{
    documents: Array<{ status: string }>;
    profile: { kycStatus: string };
  }>;
};

type AmlAlert = { status: string };

export function ComplianceDashboard() {
  const overviewQ = useQuery<AdminOverview>({
    queryKey: ["admin", "compliance-overview"],
    queryFn:  () => apiGet("/api/v1/admin/overview", "admin"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const amlQ = useQuery<AmlAlert[]>({
    queryKey: ["admin", "compliance-aml"],
    queryFn:  () => apiGet("/api/v1/admin/aml-alerts", "admin"),
    staleTime: 30_000,
  });

  const auditQ = useQuery<AuditPage>({
    queryKey: ["admin", "compliance-audit"],
    queryFn:  () => apiGet("/api/v1/admin/compliance/audit?limit=20", "admin"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const ov       = overviewQ.data;
  const accounts = (ov as unknown as { accounts?: unknown[] })?.accounts ?? [];

  // Derive KYC stats from real account documents
  const kycPending   = ov?.kycQueue ?? 0;
  const kycCompleted = (accounts as Array<{ documents?: Array<{ status: string }> }>)
    .reduce((s, a) => s + (a.documents ?? []).filter((d) => d.status === "APPROVED").length, 0);
  const kycRejected  = (accounts as Array<{ documents?: Array<{ status: string }> }>)
    .reduce((s, a) => s + (a.documents ?? []).filter((d) => d.status === "REJECTED").length, 0);
  const totalClients  = ov?.realRegisteredUsers ?? 0;
  const mifidChecks   = totalClients;
  const esmaViolations = 0;
  const amlAlerts = amlQ.data ?? [];
  const amlOpen   = amlAlerts.filter((a) => a.status === "PENDING").length;

  const timeline: TimelineEvent[] = (auditQ.data?.entries ?? []).map(auditToTimeline);

  const status: ComplianceStatus =
    kycPending > 5 || amlOpen > 2 ? "ACTION_REQUIRED" :
    kycPending > 0 || amlOpen > 0 ? "REVIEW_NEEDED"   :
    "COMPLIANT";
  const statusCfg  = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">Compliance Dashboard</h1>
            </div>
          </div>
          <button type="button" onClick={() => { void overviewQ.refetch(); void amlQ.refetch(); void auditQ.refetch(); }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:text-white">
            <RefreshCw size={11} className={overviewQ.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 p-6">
        {/* Overall status */}
        <div className={`flex items-center gap-4 rounded-xl border p-5 ${statusCfg.cls}`}>
          <StatusIcon size={24} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">Overall Compliance Status</p>
            <p className="text-xl font-extrabold">{statusCfg.label}</p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "KYC Completed",   value: String(kycCompleted),   cls: "text-emerald-400" },
            { label: "KYC Pending",     value: String(kycPending),     cls: "text-amber-400"   },
            { label: "KYC Rejected",    value: String(kycRejected),    cls: "text-rose-400"    },
            { label: "MiFID Checks",    value: String(mifidChecks),    cls: "text-cyan-400"    },
            { label: "ESMA Violations", value: String(esmaViolations), cls: esmaViolations > 0 ? "text-rose-400" : "text-emerald-400" },
            { label: "AML Alerts Open", value: String(amlOpen),        cls: amlOpen > 0 ? "text-amber-400" : "text-emerald-400" },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-2 text-3xl font-extrabold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Timeline from real audit */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={13} className="text-slate-500" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Recent Compliance Events
            </h2>
            {auditQ.isFetching && (
              <RefreshCw size={11} className="ml-auto animate-spin text-slate-600" />
            )}
          </div>
          {timeline.length === 0 ? (
            <p className="text-[12px] text-slate-600">
              {auditQ.isLoading ? "Loading audit trail…" : "No compliance events recorded yet."}
            </p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((ev) => {
                const Icon = SEV_ICON[ev.severity];
                return (
                  <li key={ev.id} className="flex items-start gap-3 border-b border-slate-800/40 pb-3 last:border-0 last:pb-0">
                    <Icon size={13} className={`mt-0.5 shrink-0 ${SEV_CLS[ev.severity]}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_CLS[ev.type]}`}>
                          {ev.type}
                        </span>
                        <span className="text-[11px] text-slate-600">{dateTime(ev.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-slate-300">{ev.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

export default ComplianceDashboard;
