import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import { generateForecasts, analyzeDependencies, type ForecastItem, type DependencyNode } from "../data/executiveIntelligence";
import {
  TrendingUp, TrendingDown, Minus, Clock, CheckCircle2,
  AlertTriangle, Network, ArrowRight, ChevronRight, Layers,
} from "lucide-react";

type ForecastTab = "forecasts" | "dependencies";

const TREND_STYLE: Record<string, { border: string; bg: string; iconCl: string; labelEn: string; labelAr: string }> = {
  ahead:    { border: "border-emerald-200/60", bg: "bg-emerald-50/30", iconCl: "text-emerald-600", labelEn: "Ahead",    labelAr: "قبل الموعد" },
  on_track: { border: "border-primary/20",     bg: "bg-primary/5",     iconCl: "text-primary",    labelEn: "On Track", labelAr: "على المسار" },
  delayed:  { border: "border-amber-200/60",   bg: "bg-amber-50/30",   iconCl: "text-amber-600",  labelEn: "Delayed",  labelAr: "متأخر" },
  at_risk:  { border: "border-rose-200/60",    bg: "bg-rose-50/30",    iconCl: "text-rose-600",   labelEn: "At Risk",  labelAr: "في خطر" },
};

function TrendBadge({ trend, ar }: { trend: string; ar: boolean }) {
  const s = TREND_STYLE[trend] || TREND_STYLE.on_track;
  const Icon = trend === "ahead" ? TrendingUp : trend === "at_risk" ? TrendingDown : trend === "delayed" ? AlertTriangle : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.border} ${s.bg} ${s.iconCl}`}>
      <Icon size={10} strokeWidth={2} />
      {ar ? TREND_STYLE[trend]?.labelAr : TREND_STYLE[trend]?.labelEn}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground/60 w-7">{score}%</span>
    </div>
  );
}

function ProgressBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 40 ? "bg-blue-500" : "bg-muted-foreground/30";
  return (
    <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

// ─── Forecast card ────────────────────────────────────────

function ForecastCard({ item, ar, navigate }: { item: ForecastItem; ar: boolean; navigate: (p: string) => void }) {
  const s = TREND_STYLE[item.trend] || TREND_STYLE.on_track;
  return (
    <div className={`border ${s.border} ${s.bg} rounded-xl px-5 py-4 hover:shadow-sm transition-shadow cursor-pointer group`}
      onClick={() => navigate(`/work/${item.id}`)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors leading-snug mb-1">
            {ar ? item.titleAr : item.titleEn}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendBadge trend={item.trend} ar={ar} />
            <span className="text-[10px] text-muted-foreground/60">{ar ? item.statusAr : item.statusEn}</span>
            <span className="text-[10px] text-muted-foreground/40">· {item.assigneeEn}</span>
          </div>
        </div>
        <ChevronRight size={13} strokeWidth={1.75} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <p className="text-[9px] text-muted-foreground/50">{ar ? "التقدم الحالي" : "Current Progress"}</p>
          <p className="text-[9px] text-muted-foreground/70 tabular-nums">{item.currentProgress}%</p>
        </div>
        <ProgressBar score={item.currentProgress} />
      </div>

      {/* Date info */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[9px] text-muted-foreground/50 mb-0.5">{ar ? "الموعد المجدول" : "Scheduled Due"}</p>
          <p className="text-[11px] font-medium text-foreground">{item.scheduledDateEn}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground/50 mb-0.5">{ar ? "الاكتمال المتوقع" : "Predicted Completion"}</p>
          <p className={`text-[11px] font-medium ${item.daysOverSchedule > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {item.predictedCompletionEn}
          </p>
        </div>
      </div>

      {item.daysOverSchedule > 0 && (
        <p className="text-[10px] text-rose-600/80 mb-2.5">
          {ar ? `${item.daysOverSchedule} أيام بعد الموعد` : `${item.daysOverSchedule} days past schedule`}
        </p>
      )}

      {/* Confidence */}
      <div>
        <p className="text-[9px] text-muted-foreground/50 mb-1">{ar ? "ثقة التوقع" : "Forecast Confidence"}</p>
        <ConfidenceBar score={item.confidenceScore} />
      </div>
    </div>
  );
}

// ─── Dependency node ──────────────────────────────────────

function DepNodeCard({ node, ar }: { node: DependencyNode; ar: boolean }) {
  const statusColors: Record<string, string> = {
    backlog: "bg-stone-100 text-stone-600",
    planned: "bg-primary/8 text-primary",
    in_progress: "bg-amber-100 text-amber-700",
    review: "bg-violet-100 text-violet-700",
    done: "bg-emerald-100 text-emerald-700",
  };

  const isCritical = node.criticalPath;
  const isBlocking = node.isBlocking.length > 0;
  const isBlocked = node.blockedBy.length > 0;

  return (
    <div className={`border ${isCritical ? "border-rose-200/60" : "border-border/40"} rounded-xl px-4 py-3.5 bg-background`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {isCritical && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
            <p className="text-[12.5px] font-medium text-foreground leading-snug truncate">{ar ? node.titleAr : node.titleEn}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[node.status] || "bg-muted text-muted-foreground"}`}>
              {ar ? node.statusAr : node.statusEn}
            </span>
            <span className="text-[9px] text-muted-foreground/40 capitalize">{node.entityType}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>{node.progress}%</p>
          <p className="text-[9px] text-muted-foreground/40">{ar ? "تقدم" : "progress"}</p>
        </div>
      </div>

      {node.isBlocking.length > 0 && (
        <div className="mt-2">
          <p className="text-[9px] text-muted-foreground/50 mb-1">{ar ? "تحجب:" : "Blocking:"}</p>
          <div className="space-y-1">
            {node.isBlocking.slice(0, 2).map((b) => (
              <div key={b.id} className="flex items-center gap-1.5 text-[10px] text-rose-600">
                <ArrowRight size={9} strokeWidth={2} />
                <span className="truncate">{ar ? b.titleAr : b.titleEn}</span>
              </div>
            ))}
            {node.isBlocking.length > 2 && (
              <p className="text-[10px] text-muted-foreground/50">+{node.isBlocking.length - 2} more</p>
            )}
          </div>
        </div>
      )}

      {node.blockedBy.length > 0 && (
        <div className="mt-2">
          <p className="text-[9px] text-muted-foreground/50 mb-1">{ar ? "محجوب بواسطة:" : "Blocked by:"}</p>
          <div className="space-y-1">
            {node.blockedBy.slice(0, 2).map((b) => (
              <div key={b.id} className="flex items-center gap-1.5 text-[10px] text-amber-600">
                <ArrowRight size={9} strokeWidth={2} className="rotate-180" />
                <span className="truncate">{ar ? b.titleAr : b.titleEn}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function ForecastEngine() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<ForecastTab>("forecasts");
  const [filterTrend, setFilterTrend] = useState<string>("all");
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "محرك التوقعات" : "Forecast Engine"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف مهام بمواعيد عشان تفعّل توقعات الإنجاز." : "Add work items with due dates to activate completion forecasting."}</p>
      </div>
    </div>
  );

  const forecasts = useMemo(generateForecasts, []);
  const deps = useMemo(analyzeDependencies, []);

  const filtered = filterTrend === "all" ? forecasts : forecasts.filter((f) => f.trend === filterTrend);

  const trendCounts = {
    all: forecasts.length,
    at_risk: forecasts.filter((f) => f.trend === "at_risk").length,
    delayed: forecasts.filter((f) => f.trend === "delayed").length,
    on_track: forecasts.filter((f) => f.trend === "on_track").length,
    ahead: forecasts.filter((f) => f.trend === "ahead").length,
  };

  const avgConfidence = forecasts.length > 0
    ? Math.round(forecasts.reduce((s, f) => s + f.confidenceScore, 0) / forecasts.length)
    : 0;
  const totalOverdue = forecasts.filter((f) => f.daysOverSchedule > 0).reduce((s, f) => s + f.daysOverSchedule, 0);
  const criticalDeps = deps.filter((d) => d.criticalPath).length;

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <TrendingUp size={14} strokeWidth={1.75} className="text-blue-500" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "محرك التوقعات" : "Forecast Engine"}</p>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "التوقعات وتبعيات المشاريع" : "Forecasts & Dependency Intelligence"}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { labelEn: "Avg Confidence", labelAr: "متوسط الثقة", value: `${avgConfidence}%`, color: avgConfidence >= 60 ? "text-emerald-600" : "text-amber-600" },
              { labelEn: "At Risk", labelAr: "في خطر", value: trendCounts.at_risk, color: "text-rose-500" },
              { labelEn: "Delayed", labelAr: "متأخر", value: trendCounts.delayed, color: "text-amber-600" },
              { labelEn: "Critical Dependencies", labelAr: "تبعيات حرجة", value: criticalDeps, color: "text-violet-600" },
            ].map((m) => (
              <div key={m.labelEn} className="bg-background border border-border/40 rounded-xl px-4 py-3">
                <p className="text-[9px] text-muted-foreground mb-1.5">{ar ? m.labelAr : m.labelEn}</p>
                <p className={`text-[22px] font-medium tabular-nums leading-none ${m.color}`} style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 max-w-[1100px] flex items-center justify-between">
          <div className="flex gap-0 -mb-px">
            {[
              { id: "forecasts" as const,    labelEn: "Forecasts",    labelAr: "التوقعات",   icon: TrendingUp },
              { id: "dependencies" as const, labelEn: "Dependencies", labelAr: "التبعيات",  icon: Network },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-[12px] border-b-2 transition-all shrink-0 ${tab === t.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon size={13} strokeWidth={tab === t.id ? 2 : 1.75} />
                  {ar ? t.labelAr : t.labelEn}
                </button>
              );
            })}
          </div>
          {tab === "forecasts" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["all", "at_risk", "delayed", "on_track", "ahead"] as const).map((f) => (
                <button key={f} onClick={() => setFilterTrend(f)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${filterTrend === f ? "bg-foreground text-background border-foreground" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? (ar ? "الكل" : "All") : (ar ? TREND_STYLE[f]?.labelAr : TREND_STYLE[f]?.labelEn)} ({trendCounts[f]})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 md:px-10 py-7 max-w-[1100px]">
        {tab === "forecasts" && (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <CheckCircle2 size={28} strokeWidth={1.5} className="text-emerald-400 mb-3" />
              <p className="text-[14px] text-muted-foreground">{ar ? "جميع المشاريع مكتملة" : "All projects completed"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <ForecastCard key={item.id} item={item} ar={ar} navigate={navigate} />
              ))}
            </div>
          )
        )}

        {tab === "dependencies" && (
          deps.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Layers size={28} strokeWidth={1.5} className="text-muted-foreground/30 mb-3" />
              <p className="text-[14px] text-muted-foreground">{ar ? "لا تبعيات مكتشفة" : "No dependencies detected"}</p>
              <p className="text-[12px] text-muted-foreground/50 mt-1 text-center max-w-xs">
                {ar ? "أضف علاقات بين العناصر في صفحة الذاكرة لكشف التبعيات" : "Add relationships between items in the Memory page to reveal dependencies"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {deps.filter((d) => d.criticalPath).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <h3 className="text-[13px] font-medium text-foreground">{ar ? "المسار الحرج" : "Critical Path"}</h3>
                    <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">{deps.filter((d) => d.criticalPath).length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {deps.filter((d) => d.criticalPath).map((node) => (
                      <DepNodeCard key={node.id} node={node} ar={ar} />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Network size={14} strokeWidth={1.75} className="text-muted-foreground/60" />
                  <h3 className="text-[13px] font-medium text-foreground">{ar ? "جميع التبعيات" : "All Dependencies"}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deps.filter((d) => !d.criticalPath).map((node) => (
                    <DepNodeCard key={node.id} node={node} ar={ar} />
                  ))}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
