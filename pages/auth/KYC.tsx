/**
 * IGFXPRO — KYC Onboarding
 * Uses the Sumsub Web SDK when SUMSUB_APP_TOKEN is configured.
 * Falls back to manual file upload when Sumsub is not configured.
 */
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SumsubWebSdk from "@sumsub/websdk-react";
import {
  Camera, CheckCircle2,
  Clock, FileText, Shield, Upload, X,
  BadgeCheck, Fingerprint, IdCard,
} from "lucide-react";
import { apiGet, apiPost } from "../../shared/lib/apiHelpers";
import { useToast }        from "../../components/ui/Toast";
import { usePageTitle }    from "../../hooks/usePageTitle";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentStatus = "NOT_UPLOADED" | "PENDING_ADMIN" | "APPROVED" | "REJECTED";

type KycDocument = {
  id:              string;
  documentKey:     string;
  label:           string;
  status:          DocumentStatus;
  fileName?:       string;
  rejectionReason?: string;
};

type OnboardingStatus = {
  kyc:               "pending" | "approved" | "rejected" | "in_review";
  appropriateness:   "required" | "completed" | "waived";
  documents:         string[];
  liveTradingAllowed: boolean;
};

type KycStatusResp = {
  kycStatus:  string;
  documents:  KycDocument[];
  onboarding: OnboardingStatus;
};

type SumsubTokenResp = {
  ok:          boolean;
  token?:      string;
  applicantId?: string;
  reason?:     string;
};

// ─── Document step metadata ───────────────────────────────────────────────────

const DOCUMENT_STEPS: { key: string; label: string; description: string; icon: React.ElementType }[] = [
  {
    key:         "PASSPORT",
    label:       "Passport / Government ID",
    description: "Clear photo of your valid passport or national ID card (front + back)",
    icon:        IdCard,
  },
  {
    key:         "SELFIE",
    label:       "Live Selfie",
    description: "A clear selfie holding your ID document next to your face",
    icon:        Camera,
  },
  {
    key:         "PROOF_OF_ADDRESS",
    label:       "Proof of Address",
    description: "Utility bill, bank statement, or tax document dated within 3 months",
    icon:        FileText,
  },
];

const STATUS_META: Record<DocumentStatus, { label: string; cls: string; icon: React.ElementType }> = {
  NOT_UPLOADED: { label: "Not uploaded",    cls: "text-slate-500",   icon: Upload       },
  PENDING_ADMIN:{ label: "Under review",    cls: "text-amber-400",   icon: Clock        },
  APPROVED:     { label: "Approved",        cls: "text-emerald-400", icon: CheckCircle2 },
  REJECTED:     { label: "Rejected",        cls: "text-rose-400",    icon: X            },
};

// ─── Sumsub embedded widget ───────────────────────────────────────────────────

function SumsubWidget({ onComplete }: { onComplete: () => void }) {
  const { data, isLoading, isError, error } = useQuery<SumsubTokenResp>({
    queryKey: ["sumsub-token"],
    queryFn:  () => apiGet("/api/v1/kyc/sumsub/access-token"),
    staleTime: 9 * 60 * 1000, // token valid 10 min — refresh at 9
    retry: false,
  });

  const handleMessage = useCallback((type: string, _payload: unknown) => {
    // applicantSubmitted fires when the user completes the Sumsub flow
    if (type === "applicantSubmitted" || type === "applicantResubmitted") {
      onComplete();
    }
  }, [onComplete]);

  const handleError = useCallback((data: unknown) => {
    console.error("[sumsub-sdk]", data);
  }, []);

  const expirationHandler = useCallback(async (): Promise<string> => {
    const resp: SumsubTokenResp = await apiGet("/api/v1/kyc/sumsub/access-token");
    if (!resp.ok || !resp.token) throw new Error("Failed to refresh Sumsub token");
    return resp.token;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-[#07111e] py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
      </div>
    );
  }

  if (isError || !data?.ok || !data.token) {
    const reason = (error as Error)?.message ?? data?.reason ?? "Unknown error";
    if (reason.includes("SUMSUB_NOT_CONFIGURED")) return null; // signal: use fallback
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-[12px] text-rose-300">
        Verification service unavailable: {reason}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#07111e]">
      <SumsubWebSdk
        accessToken={data.token}
        expirationHandler={expirationHandler}
        config={{ lang: "en", theme: "dark" }}
        onMessage={handleMessage}
        onError={handleError}
      />
    </div>
  );
}

// ─── File drop zone ───────────────────────────────────────────────────────────

function DropZone({ onFile, loading }: { onFile: (file: File) => void; loading: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
        dragging ? "border-cyan-400 bg-cyan-400/5" : "border-slate-700 hover:border-slate-600 bg-slate-900/30"
      } ${loading ? "pointer-events-none opacity-60" : ""}`}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept="image/*,.pdf"
        className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
          <p className="text-[12px] text-slate-400">Uploading…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload size={24} className="text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-300">Drop file or click to upload</p>
            <p className="mt-0.5 text-[11px] text-slate-600">JPG, PNG, PDF · max 10 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocumentCard({
  step, doc, onUpload, uploading,
}: {
  step: { key: string; label: string; description: string; icon: React.ElementType };
  doc: KycDocument | undefined;
  onUpload: (key: string, file: File) => void;
  uploading: string | null;
}) {
  const status: DocumentStatus = doc?.status ?? "NOT_UPLOADED";
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const StepIcon   = step.icon;
  const isUploading = uploading === step.key;

  return (
    <div className={`rounded-2xl border bg-[#07111e] ${
      status === "APPROVED"  ? "border-emerald-500/20" :
      status === "REJECTED"  ? "border-rose-500/20"    :
      status === "PENDING_ADMIN" ? "border-amber-500/20" :
      "border-slate-800"
    }`}>
      <div className="p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            status === "APPROVED" ? "bg-emerald-500/15" :
            status === "REJECTED" ? "bg-rose-500/15" :
            "bg-slate-800"
          }`}>
            <StepIcon size={18} className={
              status === "APPROVED" ? "text-emerald-400" :
              status === "REJECTED" ? "text-rose-400"    :
              "text-slate-400"
            } />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{step.label}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">{step.description}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-[11px] font-bold ${meta.cls}`}>
            <StatusIcon size={12} />
            {meta.label}
          </div>
        </div>

        {doc?.fileName && status !== "NOT_UPLOADED" && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2">
            <FileText size={13} className="text-slate-500" />
            <span className="text-[11px] text-slate-400 truncate">{doc.fileName}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${
              status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" :
              status === "PENDING_ADMIN" ? "bg-amber-500/15 text-amber-300" :
              "bg-rose-500/15 text-rose-300"
            }`}>{meta.label}</span>
          </div>
        )}

        {status === "REJECTED" && doc?.rejectionReason && (
          <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="text-[10px] font-bold text-rose-400">Rejection reason:</p>
            <p className="mt-1 text-[11px] text-rose-300/80">{doc.rejectionReason}</p>
          </div>
        )}

        {(status === "NOT_UPLOADED" || status === "REJECTED") && (
          <DropZone onFile={(file) => onUpload(step.key, file)} loading={isUploading} />
        )}

        {status === "PENDING_ADMIN" && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Clock size={14} className="shrink-0 text-amber-400" />
            <p className="text-[11px] text-amber-300">Under review · typically 1-2 business days</p>
          </div>
        )}

        {status === "APPROVED" && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
            <p className="text-[11px] text-emerald-300">Verified and approved</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KYC status hero ─────────────────────────────────────────────────────────

function KycStatusHero({ status, liveTradingAllowed }: {
  status: string | undefined;
  liveTradingAllowed: boolean;
}) {
  const kycStatus = status ?? "pending";
  const config = {
    approved:  { label: "KYC Approved",        cls: "text-emerald-300", border: "border-emerald-500/20", bg: "bg-emerald-500/8",   Icon: BadgeCheck },
    rejected:  { label: "KYC Rejected",         cls: "text-rose-300",    border: "border-rose-500/20",    bg: "bg-rose-500/8",      Icon: X          },
    in_review: { label: "Under Review",          cls: "text-amber-300",   border: "border-amber-500/20",   bg: "bg-amber-500/8",     Icon: Clock      },
    pending:   { label: "Verification Pending",  cls: "text-slate-400",   border: "border-slate-700",      bg: "bg-slate-900/30",    Icon: Shield     },
  }[kycStatus] ?? { label: kycStatus, cls: "text-slate-400", border: "border-slate-700", bg: "bg-slate-900/30", Icon: Shield };

  const { Icon } = config;

  return (
    <div className={`rounded-2xl border p-5 ${config.border} ${config.bg}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${config.border}`}>
          <Icon size={22} className={config.cls} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Verification status</p>
          <p className={`mt-0.5 text-xl font-extrabold ${config.cls}`}>{config.label}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-slate-500">Live trading</p>
          <p className={`text-sm font-bold ${liveTradingAllowed ? "text-emerald-300" : "text-slate-500"}`}>
            {liveTradingAllowed ? "Enabled" : "Pending KYC"}
          </p>
        </div>
      </div>

      {kycStatus === "approved" && (
        <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-400/70">
          <Fingerprint size={12} />
          Your identity has been verified. You can now trade with real funds.
        </div>
      )}

      {kycStatus === "pending" && (
        <div className="mt-4 text-[11px] text-slate-500">
          Complete all required documents below to unlock live trading. Review typically takes 1-2 business days.
        </div>
      )}

      {kycStatus === "in_review" && (
        <div className="mt-4 text-[11px] text-amber-400/70">
          Your documents are being reviewed by our compliance team. We'll notify you when verification is complete.
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function KYCPage() {
  usePageTitle("KYC Verification");
  const qc    = useQueryClient();
  const toast = useToast();
  const [uploading, setUploading] = useState<string | null>(null);

  // Probe Sumsub availability (no-retry so fallback is instant)
  const sumsubProbe = useQuery<SumsubTokenResp>({
    queryKey: ["sumsub-probe"],
    queryFn:  () => apiGet("/api/v1/kyc/sumsub/access-token"),
    staleTime: 9 * 60 * 1000,
    retry: false,
  });

  const sumsubConfigured =
    sumsubProbe.isSuccess &&
    sumsubProbe.data?.ok === true &&
    Boolean(sumsubProbe.data?.token);

  const { data, isLoading } = useQuery<KycStatusResp>({
    queryKey: ["kyc-status"],
    queryFn:  () => apiGet("/api/v1/client/account"),
    staleTime: 30_000,
  });

  const onboardingQ = useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status"],
    queryFn:  () => apiGet("/api/v1/onboarding/status"),
    staleTime: 60_000,
  });

  const uploadMut = useMutation({
    mutationFn: ({ documentKey, file }: { documentKey: string; file: File }) => {
      const toBase64 = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      return toBase64(file).then((content) =>
        apiPost("/api/v1/client/documents/upload", {
          documentKey,
          label:    DOCUMENT_STEPS.find((s) => s.key === documentKey)?.label ?? documentKey,
          fileName: file.name,
          content,
          mimeType: file.type,
        }),
      );
    },
    onSuccess: () => {
      toast.success("Document uploaded", "Under review — we'll notify you when approved");
      setUploading(null);
      void qc.invalidateQueries({ queryKey: ["kyc-status"] });
      void qc.invalidateQueries({ queryKey: ["onboarding-status"] });
    },
    onError: (err) => {
      setUploading(null);
      toast.error("Upload failed", (err as Error).message ?? "Please try again");
    },
  });

  const handleUpload = useCallback((documentKey: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large", "Maximum file size is 10 MB");
      return;
    }
    setUploading(documentKey);
    uploadMut.mutate({ documentKey, file });
  }, [uploadMut, toast]);

  const handleSumsubComplete = useCallback(() => {
    toast.success("Documents submitted", "Our compliance team will review your submission shortly");
    void qc.invalidateQueries({ queryKey: ["kyc-status"] });
    void qc.invalidateQueries({ queryKey: ["onboarding-status"] });
  }, [qc, toast]);

  const documents: KycDocument[] = (data as Record<string, unknown> | undefined)?.documents as KycDocument[] ?? [];
  const kycStatus = (data as Record<string, unknown> | undefined)?.kycStatus as string | undefined ?? onboardingQ.data?.kyc;
  const liveTradingAllowed = onboardingQ.data?.liveTradingAllowed ?? false;

  const approvedCount = DOCUMENT_STEPS.filter((step) => {
    const doc = documents.find((d) => d.documentKey === step.key);
    return doc?.status === "APPROVED";
  }).length;

  const kycComplete = kycStatus === "approved" || kycStatus === "rejected";

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-200">
      <main className="mx-auto max-w-[900px] space-y-5 p-4 md:p-6">

        {/* Header */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">IGFXPRO · Compliance</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-white">Identity Verification</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            Complete KYC to unlock live trading. All documents are encrypted and stored securely.
          </p>
        </div>

        {/* Status hero */}
        {!isLoading && <KycStatusHero status={kycStatus} liveTradingAllowed={liveTradingAllowed} />}

        {/* Progress bar (shown for manual flow) */}
        {!sumsubConfigured && (
          <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold text-white">Verification progress</p>
              <p className="text-[11px] text-slate-500">{approvedCount} / {DOCUMENT_STEPS.length} documents</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                   style={{ width: `${(approvedCount / DOCUMENT_STEPS.length) * 100}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {DOCUMENT_STEPS.map((step) => {
                const doc = documents.find((d) => d.documentKey === step.key);
                const status = doc?.status ?? "NOT_UPLOADED";
                const { label: statusLabel, cls } = STATUS_META[status];
                const StepIcon = step.icon;
                return (
                  <div key={step.key} className="flex items-center gap-1.5">
                    <StepIcon size={11} className={cls} />
                    <span className={`text-[10px] ${cls}`}>{step.label}: {statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Verification section */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-[#07111e]" />)}
          </div>
        ) : kycComplete ? null : sumsubConfigured ? (
          /* ── Sumsub embedded widget ─────────────────────────────────────────── */
          <SumsubWidget onComplete={handleSumsubComplete} />
        ) : (
          /* ── Manual document upload fallback ────────────────────────────────── */
          <div className="space-y-4">
            {DOCUMENT_STEPS.map((step) => {
              const doc = documents.find((d) => d.documentKey === step.key);
              return (
                <DocumentCard
                  key={step.key}
                  step={step}
                  doc={doc}
                  onUpload={handleUpload}
                  uploading={uploading}
                />
              );
            })}
          </div>
        )}

        {/* Info footer */}
        <div className="rounded-2xl border border-slate-800/60 bg-[#07111e]/60 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" />
            <p className="text-[11px] font-bold text-white">Privacy & Security</p>
          </div>
          <ul className="space-y-1.5">
            {[
              "Documents are encrypted with AES-256 at rest and in transit",
              "Data is processed under GDPR and applicable regulations",
              "Documents are reviewed by certified compliance officers only",
              "You can request deletion of your data at any time",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[11px] text-slate-500">
                <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-emerald-400/60" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
