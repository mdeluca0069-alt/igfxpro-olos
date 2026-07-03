/**
 * KYCReviewPanel — KYC case queue from /admin/kyc/cases (KYC service)
 * with legacy document fallback from /admin/client-accounts.
 * Case-level decisions: POST /admin/kyc/cases/:caseId/approve|reject
 * Document-level decisions: POST /admin/documents/review
 * Direct KYC override: POST /admin/client/kyc
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, CheckCircle2, XCircle, RefreshCw, ExternalLink, UserCheck } from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { dateShort } from "../../shared/utils/format";
import { useToast } from "../../components/ui/Toast";

// ── KYC service case types ─────────────────────────────────────────────────────
type KycCaseStatus =
  | "SUBMITTED" | "OCR_PENDING" | "DOCUMENT_CHECK" | "SELFIE_CHECK"
  | "ADDRESS_CHECK" | "MANUAL_REVIEW" | "APPROVED" | "REJECTED";

type KycDocSummary = {
  id: string; documentKey: string; label: string; status: string;
  fileName?: string; rejectionReason?: string; createdAt: string;
};

type KycCase = {
  id: string; userId: string; status: KycCaseStatus;
  riskScore: number; verificationScore: number;
  documents: KycDocSummary[]; createdAt: string;
  sumsubApplicantId?:  string;
  sumsubReviewStatus?: string;
  sumsubReviewAnswer?: "GREEN" | "RED";
  sumsubInspectionId?: string;
};

// ── Legacy document types (from /admin/client-accounts) ───────────────────────
type DocStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "MISSING";

type LegacyDoc = {
  id: string; type: string; status: DocStatus;
  uploadedAt: string; fileName?: string; rejectionReason?: string;
};

type ClientAccount = {
  userId: string;
  profile: { fullName: string; email: string; tier: string; kycStatus: string };
  documents: LegacyDoc[];
};

type DocRow = LegacyDoc & { userId: string; userName: string; email: string };

// ── Style maps ─────────────────────────────────────────────────────────────────
const DOC_KEY_CLS: Record<string, string> = {
  PASSPORT:         "bg-violet-400/10 text-violet-400",
  NATIONAL_ID:      "bg-violet-400/10 text-violet-400",
  DRIVERS_LICENSE:  "bg-violet-400/10 text-violet-400",
  SELFIE:           "bg-blue-400/10 text-blue-400",
  PROOF_OF_ADDRESS: "bg-amber-400/10 text-amber-400",
  ID:               "bg-cyan-400/10 text-cyan-400",
  UTILITY_BILL:     "bg-amber-400/10 text-amber-400",
  BANK_STATEMENT:   "bg-emerald-400/10 text-emerald-400",
};

const CASE_STATUS_CLS: Record<KycCaseStatus, string> = {
  SUBMITTED:      "bg-slate-700 text-slate-400",
  OCR_PENDING:    "bg-blue-400/10 text-blue-400",
  DOCUMENT_CHECK: "bg-amber-400/10 text-amber-400",
  SELFIE_CHECK:   "bg-amber-400/10 text-amber-400",
  ADDRESS_CHECK:  "bg-amber-400/10 text-amber-400",
  MANUAL_REVIEW:  "bg-orange-400/10 text-orange-400",
  APPROVED:       "bg-emerald-400/10 text-emerald-400",
  REJECTED:       "bg-rose-400/10 text-rose-400",
};

const LEGACY_STATUS_CLS: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-400/10 text-amber-400",
  APPROVED:       "bg-emerald-400/10 text-emerald-400",
  REJECTED:       "bg-rose-400/10 text-rose-400",
  MISSING:        "bg-slate-700 text-slate-400",
};

const KYC_STATUS_CLS: Record<string, string> = {
  APPROVED:       "bg-emerald-400/10 text-emerald-400",
  REJECTED:       "bg-rose-400/10 text-rose-400",
  PENDING_REVIEW: "bg-amber-400/10 text-amber-400",
  not_started:    "bg-slate-700 text-slate-400",
  pending:        "bg-amber-400/10 text-amber-400",
  approved:       "bg-emerald-400/10 text-emerald-400",
  rejected:       "bg-rose-400/10 text-rose-400",
};

const REVIEW_STATUSES = new Set<KycCaseStatus>([
  "DOCUMENT_CHECK", "SELFIE_CHECK", "ADDRESS_CHECK", "MANUAL_REVIEW",
]);

export function KYCReviewPanel() {
  const qc    = useQueryClient();
  const toast = useToast();
  const [view,       setView]   = useState<"cases" | "legacy">("cases");
  const [rejectNote, setNote]   = useState<Record<string, string>>({});

  // ── KYC service cases ─────────────────────────────────────────────────────────
  const casesQ = useQuery<KycCase[]>({
    queryKey: ["admin", "kyc-cases"],
    queryFn:  () => apiGet("/api/v1/admin/kyc/cases?limit=100", "admin"),
    staleTime: 15_000,
  });

  // ── Legacy accounts with documents ────────────────────────────────────────────
  const accountsQ = useQuery<ClientAccount[]>({
    queryKey: ["admin", "kyc-accounts"],
    queryFn:  () => apiGet("/api/v1/admin/client-accounts", "admin"),
    staleTime: 15_000,
  });

  // All accounts needing KYC approval (direct override section)
  const pendingKycClients = (accountsQ.data ?? []).filter(
    (a) => a.profile.kycStatus !== "APPROVED" && a.profile.kycStatus !== "approved",
  );

  // Flatten legacy documents — only those with PENDING_REVIEW status
  const legacyDocs: DocRow[] = [];
  for (const a of accountsQ.data ?? []) {
    for (const doc of a.documents ?? []) {
      if (doc.status === "PENDING_REVIEW") {
        legacyDocs.push({
          ...doc,
          userId:   a.userId,
          userName: a.profile.fullName,
          email:    a.profile.email,
        });
      }
    }
  }

  const pendingCases  = (casesQ.data ?? []).filter((c) => REVIEW_STATUSES.has(c.status));
  const totalPending  = pendingCases.length + pendingKycClients.length + legacyDocs.length;

  // ── Case-level mutations ──────────────────────────────────────────────────────
  const approveCaseMut = useMutation({
    mutationFn: ({ caseId, notes }: { caseId: string; notes?: string }) =>
      apiPost(`/api/v1/admin/kyc/cases/${caseId}/approve`, { notes }, "admin"),
    onSuccess: (_, vars) => {
      toast.success("Case approved", `KYC case ${vars.caseId.slice(0, 8)} approved`);
      void qc.invalidateQueries({ queryKey: ["admin", "kyc-cases"] });
    },
    onError: (e) => toast.error("Approve failed", e instanceof Error ? e.message : "Error"),
  });

  const rejectCaseMut = useMutation({
    mutationFn: ({ caseId, reason }: { caseId: string; reason: string }) =>
      apiPost(`/api/v1/admin/kyc/cases/${caseId}/reject`, { reason }, "admin"),
    onSuccess: (_, vars) => {
      toast.success("Case rejected", `KYC case ${vars.caseId.slice(0, 8)} rejected`);
      void qc.invalidateQueries({ queryKey: ["admin", "kyc-cases"] });
    },
    onError: (e) => toast.error("Reject failed", e instanceof Error ? e.message : "Error"),
  });

  // ── Direct KYC status override ────────────────────────────────────────────────
  const kycOverrideMut = useMutation({
    mutationFn: ({ userId, kycStatus }: { userId: string; kycStatus: "approved" | "rejected" | "pending" }) =>
      apiPost("/api/v1/admin/client/kyc", { userId, kycStatus }, "admin"),
    onSuccess: (_, vars) => {
      toast.success(
        `KYC ${vars.kycStatus}`,
        `KYC status set to ${vars.kycStatus}`,
      );
      void qc.invalidateQueries({ queryKey: ["admin", "kyc-accounts"] });
      void qc.invalidateQueries({ queryKey: ["admin-client-detail"] });
    },
    onError: (e) => toast.error("KYC override failed", e instanceof Error ? e.message : "Error"),
  });

  // ── Legacy document mutation ───────────────────────────────────────────────────
  const reviewMut = useMutation({
    mutationFn: ({ userId, docId, status, reason }: {
      userId: string; docId: string; status: string; reason?: string;
    }) => apiPost("/api/v1/admin/documents/review", { userId, documentId: docId, status, reason }, "admin"),
    onSuccess: (_, vars) => {
      toast.success(`Document ${vars.status}`, `Document ${vars.docId.slice(0, 8)} updated`);
      void qc.invalidateQueries({ queryKey: ["admin", "kyc-accounts"] });
    },
    onError: (e) => toast.error("Review failed", e instanceof Error ? e.message : "Error"),
  });

  const isFetching = view === "cases" ? casesQ.isFetching : accountsQ.isFetching;
  const isLoading  = view === "cases" ? casesQ.isLoading  : accountsQ.isLoading;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-cyan-400" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Admin</p>
              <h1 className="text-xl font-extrabold text-white">KYC Review Panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              totalPending > 0 ? "bg-amber-400/10 text-amber-400" : "bg-emerald-400/10 text-emerald-400"
            }`}>{totalPending} pending</div>
            <button type="button" onClick={() => { void casesQ.refetch(); void accountsQ.refetch(); }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-[11px] text-slate-400 transition hover:text-white">
              <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
        {(
          [
            ["cases",  `KYC Cases (${pendingCases.length})`] as const,
            ["legacy", `Client KYC (${pendingKycClients.length})`] as const,
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`-mb-px border-b-2 px-4 py-3 text-[12px] font-semibold transition ${
              view === v
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}>{label}</button>
        ))}
      </div>

      <main className="mx-auto max-w-[1100px] space-y-6 p-6">
        {isLoading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
            Loading KYC queue…
          </div>
        ) : view === "cases" ? (
          /* ── KYC Service Cases ──────────────────────────────────────────────── */
          (casesQ.data ?? []).length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
              No KYC cases pending review. Cases appear here once documents are uploaded and processed.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(casesQ.data ?? []).map((kase) => {
                const isApproving = approveCaseMut.isPending && approveCaseMut.variables?.caseId === kase.id;
                const isRejecting = rejectCaseMut.isPending  && rejectCaseMut.variables?.caseId  === kase.id;
                const isPending   = isApproving || isRejecting;
                const needsReview = REVIEW_STATUSES.has(kase.status);

                return (
                  <div key={kase.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-[10px] text-slate-500">uid: {kase.userId.slice(0, 12)}…</p>
                        <p className="text-[11px] text-slate-400">Case {kase.id.slice(0, 8)}…</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${CASE_STATUS_CLS[kase.status]}`}>
                        {kase.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Risk score</span>
                        <span className={`font-bold ${
                          kase.riskScore > 70 ? "text-rose-400" :
                          kase.riskScore > 40 ? "text-amber-400" : "text-emerald-400"
                        }`}>{kase.riskScore}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Verification</span>
                        <span className="font-bold text-white">{kase.verificationScore}%</span>
                      </div>
                      {kase.documents.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {kase.documents.map((d) => (
                            <span key={d.id} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              DOC_KEY_CLS[d.documentKey] ?? "bg-slate-700 text-slate-300"
                            }`}>{d.documentKey}</span>
                          ))}
                        </div>
                      )}

                      {/* Sumsub review result */}
                      {kase.sumsubApplicantId && (
                        <div className="mt-2 space-y-1 border-t border-slate-800 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">Sumsub</span>
                            {kase.sumsubReviewAnswer ? (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                kase.sumsubReviewAnswer === "GREEN"
                                  ? "bg-emerald-400/10 text-emerald-400"
                                  : "bg-rose-400/10 text-rose-400"
                              }`}>
                                {kase.sumsubReviewAnswer === "GREEN" ? "APPROVED" : "REJECTED"}
                              </span>
                            ) : kase.sumsubReviewStatus ? (
                              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                {kase.sumsubReviewStatus.toUpperCase()}
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                SUBMITTED
                              </span>
                            )}
                          </div>
                          {kase.sumsubInspectionId && (
                            <a
                              href={`https://cockpit.sumsub.com/inspection/${kase.sumsubInspectionId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition"
                            >
                              <ExternalLink size={10} /> Open in Sumsub cockpit
                            </a>
                          )}
                          {!kase.sumsubInspectionId && kase.sumsubApplicantId && (
                            <a
                              href={`https://cockpit.sumsub.com/checkus#/applicant/${kase.sumsubApplicantId}/basicInfo`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 transition"
                            >
                              <ExternalLink size={10} /> View applicant in Sumsub
                            </a>
                          )}
                        </div>
                      )}

                      <p className="text-[10px] text-slate-600">Submitted {dateShort(kase.createdAt)}</p>
                    </div>

                    {needsReview && (
                      <div className="space-y-2">
                        <input type="text" placeholder="Rejection reason (required to reject)…"
                          value={rejectNote[kase.id] ?? ""}
                          onChange={(e) => setNote((p) => ({ ...p, [kase.id]: e.target.value }))}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button type="button" disabled={isPending}
                            onClick={() => approveCaseMut.mutate({ caseId: kase.id })}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
                            <CheckCircle2 size={11} /> {isApproving ? "…" : "Approve"}
                          </button>
                          <button type="button" disabled={isPending || !rejectNote[kase.id]}
                            onClick={() => rejectCaseMut.mutate({ caseId: kase.id, reason: rejectNote[kase.id] ?? "" })}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-500/15 py-2 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50">
                            <XCircle size={11} /> {isRejecting ? "…" : "Reject"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Client KYC Status (direct override) ───────────────────────────── */
          <div className="space-y-6">

            {/* ── Direct KYC Override ─────────────────────────────────────────── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <UserCheck size={14} className="text-cyan-400" />
                <h2 className="text-[12px] font-bold uppercase tracking-widest text-cyan-400">
                  Client KYC Override — {pendingKycClients.length} clients pending
                </h2>
              </div>

              {pendingKycClients.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center text-slate-500 text-sm">
                  All clients have approved KYC.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500">
                        <th className="px-4 py-3 text-left">Client</th>
                        <th className="px-4 py-3 text-left">Tier</th>
                        <th className="px-4 py-3 text-left">KYC Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingKycClients.map((client) => {
                        const isOverriding = kycOverrideMut.isPending &&
                          kycOverrideMut.variables?.userId === client.userId;
                        return (
                          <tr key={client.userId} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-white">{client.profile.fullName}</p>
                              <p className="text-[11px] text-slate-500">{client.profile.email}</p>
                            </td>
                            <td className="px-4 py-3 text-[11px] text-slate-400">{client.profile.tier}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                KYC_STATUS_CLS[client.profile.kycStatus] ?? "bg-slate-700 text-slate-400"
                              }`}>
                                {client.profile.kycStatus.replace(/_/g, " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={isOverriding}
                                  onClick={() => kycOverrideMut.mutate({ userId: client.userId, kycStatus: "approved" })}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                                >
                                  <CheckCircle2 size={11} />
                                  {isOverriding ? "…" : "Approve KYC"}
                                </button>
                                <button
                                  type="button"
                                  disabled={isOverriding}
                                  onClick={() => kycOverrideMut.mutate({ userId: client.userId, kycStatus: "rejected" })}
                                  className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
                                >
                                  <XCircle size={11} />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Legacy Pending Documents ─────────────────────────────────────── */}
            {legacyDocs.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-[12px] font-bold uppercase tracking-widest text-slate-400">
                    Pending Documents — {legacyDocs.length}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {legacyDocs.map((doc) => {
                    const isPending = reviewMut.isPending && reviewMut.variables?.docId === doc.id;
                    return (
                      <div key={doc.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] text-slate-500">{doc.email}</p>
                            <p className="font-bold text-white">{doc.userName}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${LEGACY_STATUS_CLS[doc.status]}`}>
                            {doc.status === "PENDING_REVIEW" ? "PENDING" : doc.status}
                          </span>
                        </div>

                        <div className="mb-3 space-y-1">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            DOC_KEY_CLS[doc.type] ?? "bg-slate-700 text-slate-300"
                          }`}>{doc.type}</span>
                          {doc.fileName && (
                            <p className="mt-2 truncate font-mono text-[11px] text-slate-500">{doc.fileName}</p>
                          )}
                          <p className="text-[10px] text-slate-600">Uploaded {dateShort(doc.uploadedAt)}</p>
                          {doc.rejectionReason && (
                            <p className="text-[10px] text-rose-400">Rejected: {doc.rejectionReason}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <input type="text" placeholder="Rejection reason (optional)…"
                            value={rejectNote[doc.id] ?? ""}
                            onChange={(e) => setNote((p) => ({ ...p, [doc.id]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button type="button" disabled={isPending}
                              onClick={() => reviewMut.mutate({ userId: doc.userId, docId: doc.id, status: "APPROVED" })}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/15 py-2 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50">
                              <CheckCircle2 size={11} /> {isPending ? "…" : "Approve"}
                            </button>
                            <button type="button" disabled={isPending}
                              onClick={() => reviewMut.mutate({ userId: doc.userId, docId: doc.id, status: "REJECTED", reason: rejectNote[doc.id] })}
                              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-500/15 py-2 text-[11px] font-bold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50">
                              <XCircle size={11} /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default KYCReviewPanel;
