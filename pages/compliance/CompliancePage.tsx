/**
 * IGFXPRO — Compliance Center
 * Client-facing regulatory status: KYC/AML/sanctions/PEP screening,
 * onboarding/appropriateness state, jurisdiction disclosures and
 * any active risk warnings requiring acknowledgement.
 */
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, BadgeCheck, CheckCircle2, ChevronRight, Clock,
  FileCheck2, Gavel, RefreshCw, ScrollText, ShieldCheck, XCircle,
} from "lucide-react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { ComplianceAPI } from "../../api/endpoints/compliance";
import { dateTime } from "../../shared/utils/format";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useToast } from "../../components/ui/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplianceStatus = {
  kycStatus: string; amlStatus: string; documentStatus: string;
  sanctionsScreening: string; pepScreening: string; auditTrailStatus: string;
  clientClassification: string; lastReviewAt: string | null;
};

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ label, status }: { label: string; status: string }) {
  const ok   = ["verified", "clear", "complete", "active"];
  const warn = ["pending", "review"];
  const cls = ok.includes(status)
    ? { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", Icon: CheckCircle2 }
    : warn.includes(status)
    ? { text: "text-amber-300",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   Icon: Clock }
    : { text: "text-rose-300",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    Icon: XCircle };

  return (
    <div className={`rounded-2xl border p-4 ${cls.border} ${cls.bg}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <cls.Icon size={13} className={cls.text} />
      </div>
      <p className={`mt-2 text-sm font-extrabold capitalize ${cls.text}`}>{status}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  usePageTitle("Compliance — IGFXPRO");

  const qc    = useQueryClient();
  const toast = useToast();

  const statusQ = useQuery({
    queryKey: ["compliance-page-status"],
    queryFn:  () => apiGet<ComplianceStatus>("/api/v1/compliance/status"),
    staleTime: 60_000,
  });

  const disclosuresQ = useQuery({
    queryKey: ["compliance-disclosures"],
    queryFn:  () => ComplianceAPI.getDisclosures(),
    staleTime: 300_000,
  });

  const onboardingQ = useQuery({
    queryKey: ["compliance-onboarding"],
    queryFn:  () => ComplianceAPI.getOnboardingStatus(),
    staleTime: 30_000,
  });

  const warningQ = useQuery({
    queryKey: ["compliance-current-warning"],
    queryFn:  () => ComplianceAPI.getCurrentWarning(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const ackMut = useMutation({
    mutationFn: (id: string) => ComplianceAPI.acknowledgeWarning(id),
    onSuccess: () => {
      toast.success("Warning acknowledged");
      void qc.invalidateQueries({ queryKey: ["compliance-current-warning"] });
    },
    onError: (e) => toast.error("Acknowledge failed", (e as Error).message),
  });

  const status      = statusQ.data;
  const onboarding  = onboardingQ.data;
  const disclosures = disclosuresQ.data;
  const warning     = warningQ.data;

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO · Compliance Engine</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-white">Compliance Center</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              Classification: <span className="font-semibold text-slate-300 capitalize">{status?.clientClassification ?? "retail"}</span>
              {status?.lastReviewAt && <> · Last review {dateTime(status.lastReviewAt)}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void qc.invalidateQueries({ queryKey: ["compliance-page-status"] })}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:border-slate-600 hover:text-white">
              <RefreshCw size={11} /> Refresh
            </button>
            <Link to="/documents"
              className="flex items-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-3 py-2 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-400/14">
              Documents <ChevronRight size={11} />
            </Link>
          </div>
        </div>

        {/* Active warning banner */}
        {warning && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 text-amber-400" />
            <p className="flex-1 text-sm text-amber-200">{warning.message}</p>
            {!warning.acknowledgedAt && (
              <button onClick={() => ackMut.mutate(warning.id)} disabled={ackMut.isPending}
                className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50">
                {ackMut.isPending ? "…" : "Acknowledge"}
              </button>
            )}
          </div>
        )}

        {/* Status pill grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatusPill label="KYC Status"          status={status?.kycStatus          ?? "pending"} />
          <StatusPill label="AML Status"          status={status?.amlStatus          ?? "pending"} />
          <StatusPill label="Document Status"     status={status?.documentStatus     ?? "pending"} />
          <StatusPill label="Sanctions Screening" status={status?.sanctionsScreening ?? "pending"} />
          <StatusPill label="PEP Screening"        status={status?.pepScreening       ?? "pending"} />
          <StatusPill label="Audit Trail"         status={status?.auditTrailStatus   ?? "active"}  />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">

          {/* Onboarding status */}
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileCheck2 size={14} className="text-cyan-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Onboarding & appropriateness</p>
            </div>

            {!onboarding ? (
              <p className="text-[12px] text-slate-600">Loading…</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2.5">
                  <span className="text-[11px] text-slate-400">KYC review</span>
                  <span className="text-[11px] font-bold capitalize text-slate-200">{onboarding.kyc.replace("_", " ")}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2.5">
                  <span className="text-[11px] text-slate-400">Appropriateness test</span>
                  <span className="text-[11px] font-bold capitalize text-slate-200">{onboarding.appropriateness}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-slate-900/30 px-3 py-2.5">
                  <span className="text-[11px] text-slate-400">Documents on file</span>
                  <span className="text-[11px] font-bold text-slate-200">{onboarding.documents.length}</span>
                </div>

                <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                  onboarding.liveTradingAllowed ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"
                }`}>
                  {onboarding.liveTradingAllowed
                    ? <CheckCircle2 size={13} className="shrink-0" />
                    : <XCircle size={13} className="shrink-0" />}
                  <span className="text-[11px] font-semibold">
                    {onboarding.liveTradingAllowed ? "Live trading enabled" : "Live trading blocked pending review"}
                  </span>
                </div>

                {!onboarding.liveTradingAllowed && (
                  <Link to="/documents"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-400/8 py-2.5 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-400/14">
                    Complete verification <ChevronRight size={11} />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Jurisdiction disclosures */}
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Gavel size={14} className="text-cyan-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Jurisdiction & disclosures</p>
            </div>

            {!disclosures ? (
              <p className="text-[12px] text-slate-600">Loading…</p>
            ) : (
              <>
                <p className="text-[13px] font-bold text-white">{disclosures.jurisdiction}</p>
                <div className="mt-3 space-y-1.5">
                  {disclosures.retailProtections.map((p) => (
                    <div key={p} className="flex items-start gap-2 text-[11px] text-slate-400">
                      <ShieldCheck size={11} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 border-t border-slate-800 pt-3 text-[10px] leading-5 text-slate-600">
                  {disclosures.legalNote}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Compliance program */}
        <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <BadgeCheck size={13} className="text-cyan-400" />
            <p className="text-[11px] font-bold text-cyan-300">IGFXPRO Compliance Program</p>
          </div>
          <p className="text-[11px] leading-5 text-slate-400">
            Identity, sanctions and PEP screening run continuously against your account.
            Any change in status, or a new document request, will appear here and on your dashboard.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/reports" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
              <ScrollText size={11} /> Account reports <ChevronRight size={10} />
            </Link>
            <Link to="/support" className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300">
              Contact compliance team <ChevronRight size={10} />
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
