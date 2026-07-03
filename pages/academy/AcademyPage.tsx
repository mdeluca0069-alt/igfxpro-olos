import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Panel } from "../../components/ui/Panel";
import { PanelSkeleton } from "../../components/ui/Skeleton";
import { apiGet } from "../../shared/lib/apiHelpers";
import { usePageTitle } from "../../hooks/usePageTitle";

type AcademyContent = {
  id: string; title: string; description: string; category: string;
  level: string; contentType: string; duration?: number;
};

const FEATURED = [
  { id: "risk-1",    title: "Risk before leverage",   category: "risk_management",   level: "beginner",     contentType: "article",  description: "Understanding position sizing, stop-loss placement and leverage impact before placing your first trade." },
  { id: "order-1",   title: "Order lifecycle deep-dive", category: "olos_101",      level: "intermediate", contentType: "video",   description: "From order placement to fill confirmation: how IGFXPRO routes, validates and executes your orders." },
  { id: "olos-1",    title: "OLOS AI playbook",       category: "trading_psychology", level: "advanced",   contentType: "course",  description: "How OLOS generates signals, confidence scores and regime-aware trade setups for institutional-grade trading." },
];

export default function AcademyPage() {
  usePageTitle("Academy");

  const { data: content, isLoading } = useQuery<AcademyContent[]>({
    queryKey:  ["academy-content"],
    queryFn:   () => apiGet("/api/v1/academy/content"),
    staleTime: 5 * 60_000,
  });

  const courses = content?.length ? content : FEATURED;

  return (
    <main className="space-y-4 p-5">
      <Panel title="Trading Academy" eyebrow="education">
        <p className="text-sm text-slate-400">
          Institutional-grade trading education with progress tracking, quiz engines and compliance-friendly learning records.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["All", "Risk", "Indicators", "OLOS AI", "Psychology"].map((cat) => (
            <button key={cat} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition">
              {cat}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <PanelSkeleton key={i} rows={3} />)
        ) : (
          courses.map((course) => (
            <Panel key={course.id} title={course.title} eyebrow={`${course.level} · ${course.contentType}`}>
              <p className="text-sm leading-6 text-slate-400">{course.description}</p>
              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/15 transition">
                <Play size={14} aria-hidden />
                {course.contentType === "video" ? "Watch" : "Read"} now
              </button>
            </Panel>
          ))
        )}
      </div>
    </main>
  );
}
