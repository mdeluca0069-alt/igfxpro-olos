/**
 * IGFXPRO — Client Onboarding
 * Real KYC status from API + compliance disclosures.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, CheckCircle2, Clock,
  FileText, Shield, ShieldAlert, X,
} from "lucide-react";
import { RiskWarningOverlay } from "../../components/compliance/RiskWarningOverlay";
import { useState } from "react";
import { apiGet } from "../../shared/lib/apiHelpers";
import { usePageTitle } from "../../hooks/usePageTitle";

type OnboardingStatus = {
  kyc: "pending" | "approved" | "rejected" | "in_review";
  appropriateness: "required" | "completed" | "waived";
  documents: string[];
  liveTradingAllowed: boolean;
};

type ComplianceDisclosure = {
  jurisdiction: string;
  retailProtections: string[];
  legalNote: string;
};

const KYC_STATUS_DISPLAY = {
  approved:  { label: "Approved",    cls: "text-emerald-300", icon: CheckCircle2 },
  rejected:  { label: "Rejected",    cls: "text-rose-300",    icon: X            },
  in_review: { label: "In review",   cls: "text-amber-300",   icon: Clock        },
  pending:   { label: "Pending",     cls: "text-slate-500",   icon: FileText     },
};

export default function OnboardingPage() {
  usePageTitle("Onboarding");
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  const { data: onboarding, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status"],
    queryFn:  () => apiGet("/api/v1/onboarding/status"),
    staleTime: 30_000,
  });

  const { data: disclosures } = useQuery<ComplianceDisclosure>({
    queryKey: ["compliance-disclosures"],
    queryFn:  () => apiGet("/api/v1/compliance/disclosures"),
    staleTime: 300_000,
  });

  const kycMeta = KYC_STATUS_DISPLAY[onboarding?.kyc ?? "pending"];

  const steps = [
    {
      id: "kyc",
      label: "Identity verification",
      detail: "Passport / National ID + proof of address + selfie",
      status: onboarding?.kyc ?? "pending",
      statusLabel: kycMeta.label,
      cls: kycMeta.cls,
      action: { label: "Upload documents", to: "/documents" },
    },
    {
      id: "appropriateness",
      label: "Appropriateness test",
      detail: "MiFID II suitability assessment for leveraged CFD instruments",
      status: onboarding?.appropriateness ?? "required",
      statusLabel:
        onboarding?.appropriateness === "completed" ? "Completed"
        : onboarding?.appropriateness === "waived" ? "Waived"
        : "Required",
      cls:
        onboarding?.appropriateness === "completed" ? "text-emerald-300"
        : onboarding?.appropriateness === "waived" ? "text-cyan-300"
        : "text-amber-300",
      action: null,
    },
    {
      id: "live",
      label: "Live trading enablement",
      detail: "Unlocked automatically once KYC + appropriateness are complete",
      status: onboarding?.liveTradingAllowed ? "approved" : "blocked",
      statusLabel: onboarding?.liveTradingAllowed ? "Enabled" : "Pending",
      cls: onboarding?.liveTradingAllowed ? "text-emerald-300" : "text-slate-500",
      action: null,
    },
  ];

  const approved = steps.filter((s) => s.status === "approved" || s.status === "completed").length;

  return (
    <main className="grid gap-5 p-5 lg:grid-cols-[1fr_400px]">

      {/* Left: steps */}
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">IGFXPRO · Compliance</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-white">Account Onboarding</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            Complete verification steps to unlock live trading
          </p>
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-bold text-white">Verification progress</p>
            <p className="text-[11px] text-slate-500">{approved} / {steps.length}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                 style={{ width: `${(approved / steps.length) * 100}%` }} />
          </div>
        </div>

        {/* Steps */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-[#07111e]" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step) => (
              <div key={step.id}
                className={`rounded-2xl border bg-[#07111e] p-5 ${
                  step.status === "approved" || step.status === "completed"
                    ? "border-emerald-500/20"
                    : step.status === "in_review" || step.status === "PENDING_REVIEW"
                    ? "border-amber-500/20"
                    : step.status === "rejected"
                    ? "border-rose-500/20"
                    : "border-slate-800"
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white">{step.label}</h3>
                    <p className="mt-0.5 text-[12px] text-slate-500">{step.detail}</p>
                  </div>
                  <span className={`shrink-0 text-[11px] font-bold ${step.cls}`}>{step.statusLabel}</span>
                </div>
                {step.action && (
                  <Link to={step.action.to}
                    className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-cyan-400 hover:text-cyan-300">
                    {step.action.label} <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {!onboarding?.liveTradingAllowed && (
          <button
            onClick={() => setShowRiskWarning(true)}
            className="w-full rounded-2xl bg-cyan-400 py-3.5 text-sm font-extrabold text-slate-950 transition hover:bg-cyan-300">
            Continue onboarding
          </button>
        )}

        {onboarding?.liveTradingAllowed && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
            <BadgeCheck size={20} className="shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-emerald-300">Verification complete</p>
              <p className="text-[11px] text-slate-500">Live trading is enabled. You can now trade with real funds.</p>
            </div>
            <Link to="/trading" className="ml-auto shrink-0 flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-4 py-2 text-[12px] font-bold text-emerald-300 hover:bg-emerald-500/30">
              Trade now <ArrowRight size={11} />
            </Link>
          </div>
        )}
      </div>

      {/* Right: disclosures */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-400" />
            <p className="text-[11px] font-bold text-amber-300">CFD Risk Warning</p>
          </div>
          <p className="text-[11px] leading-5 text-amber-200/70">
            CFDs are complex instruments with a high risk of losing money rapidly due to leverage.
            Between 74%–89% of retail investor accounts lose money when trading CFDs.
            Make sure you understand how CFDs work and whether you can afford to take the risk of losing your money.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#07111e] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Shield size={14} className="text-cyan-400" />
            <p className="text-[11px] font-bold text-white">
              Retail protections — {disclosures?.jurisdiction ?? "EU"}
            </p>
          </div>
          <ul className="space-y-2">
            {(disclosures?.retailProtections ?? [
              "ESMA retail leverage caps enforced by asset class",
              "Negative balance protection per CFD account",
              "Margin close-out and stop-out monitoring",
              "Appropriateness and KYC required before live trading",
            ]).map((p) => (
              <li key={p} className="flex items-start gap-2 text-[11px] text-slate-500">
                <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-emerald-400/60" /> {p}
              </li>
            ))}
          </ul>
        </div>

        {disclosures?.legalNote && (
          <div className="rounded-2xl border border-slate-800/50 bg-slate-900/30 p-4">
            <p className="text-[10px] leading-5 text-slate-600">{disclosures.legalNote}</p>
          </div>
        )}
      </div>

      <RiskWarningOverlay
        open={showRiskWarning}
        onAcknowledge={() => setShowRiskWarning(false)}
        onDecline={() => setShowRiskWarning(false)}
      />
    </main>
  );
}
