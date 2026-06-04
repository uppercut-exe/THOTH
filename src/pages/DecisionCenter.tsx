import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { useOnboarding } from "../context/OnboardingContext";
import { isDemoMode } from "../lib/supabase";
import { loadDeals } from "../data/sales";
import { loadWorkItems } from "../data/work";
import { loadInvoices } from "../data/finance";
import { ORGANIZATIONS } from "../data/organizations";
import {
  getDecisionCenterData,
  detectOpportunityClusters,
  analyzePatterns,
  detectGoalDrift,
  computeProjectHealthScores,
  getDailyFocusItems,
  analyzeRelationships,
  detectFrictionPoints,
  generateWeeklyReport,
  computeLifeAlignment,
  type StalledItem,
  type BlockerItem,
  type UnresolvedDecision,
  type OpportunityCluster,
  type ProductivityPattern,
  type GoalDriftItem,
  type ProjectHealth,
  type FocusItem,
  type RelationshipSummary,
  type FrictionPoint,
  type WeeklyReport,
  type AlignmentDimension,
} from "../data/decisionIntelligence";
import {
  Target, Lightbulb, BarChart3, Compass, Heart, Zap,
  Network, AlertOctagon, FileText, Star, ChevronRight,
  TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Clock, Users, Building2, Briefcase,
  ShoppingBag, Landmark, Package, ArrowRight, Activity,
  Shield, Flame, Eye, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────

type TabId =
  | "decisions" | "opportunities" | "patterns" | "goal-drift"
  | "health" | "focus" | "relationships" | "friction"
  | "weekly" | "alignment" | "workspace";

interface Tab {
  id: TabId;
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
  color: string;
}

const TABS: Tab[] = [
  { id: "decisions",      labelEn: "Decisions",      labelAr: "القرارات",      icon: Target,       color: "text-rose-500" },
  { id: "opportunities",  labelEn: "Opportunities",  labelAr: "الفرص",         icon: Lightbulb,    color: "text-amber-500" },
  { id: "patterns",       labelEn: "Patterns",       labelAr: "الأنماط",       icon: BarChart3,    color: "text-blue-500" },
  { id: "goal-drift",     labelEn: "Goal Drift",     labelAr: "انحراف الأهداف", icon: Compass,     color: "text-violet-500" },
  { id: "health",         labelEn: "Health",         labelAr: "الصحة",         icon: Heart,        color: "text-emerald-600" },
  { id: "focus",          labelEn: "Focus",          labelAr: "التركيز",       icon: Zap,          color: "text-orange-500" },
  { id: "relationships",  labelEn: "Relationships",  labelAr: "العلاقات",      icon: Network,      color: "text-cyan-600" },
  { id: "friction",       labelEn: "Friction",       labelAr: "الاحتكاك",      icon: AlertOctagon, color: "text-red-500" },
  { id: "weekly",         labelEn: "Weekly",         labelAr: "الأسبوعي",      icon: FileText,     color: "text-indigo-500" },
  { id: "alignment",      labelEn: "Alignment",      labelAr: "التوافق",       icon: Star,         color: "text-yellow-500" },
  { id: "workspace",     labelEn: "Workspace",      labelAr: "مساحة العمل",   icon: FileText,     color: "text-teal-600" },
];

// ─── Shared UI components ─────────────────────────────────

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-[17px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
        {children}
      </h2>
      {sub && <p className="text-[12px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${color}`}>
      {children}
    </span>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${score}%` }} />
    </div>
  );
}

function ScoreRing({ score, size = 72, color }: { score: number; size?: number; color: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border) / 0.3)" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[15px] font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{score}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, titleEn, titleAr, ar }: { icon: React.ElementType; titleEn: string; titleAr: string; ar: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Icon size={18} strokeWidth={1.5} className="text-muted-foreground/40" />
      </div>
      <p className="text-[13px] text-muted-foreground">{ar ? titleAr : titleEn}</p>
    </div>
  );
}

// ─── 1. Decision Center Tab ───────────────────────────────

function DecisionsTab({ ar, navigate }: { ar: boolean; navigate: (p: string) => void }) {
  const data = useMemo(getDecisionCenterData, []);

  const severityDot: Record<string, string> = {
    high: "bg-rose-500", medium: "bg-amber-500", low: "bg-stone-400",
  };

  return (
    <div className="space-y-8">
      {/* Blockers */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={14} strokeWidth={1.75} className="text-rose-500" />
          <h3 className="text-[13px] font-medium text-foreground">{ar ? "العوائق النشطة" : "Active Blockers"}</h3>
          {data.blockers.length > 0 && (
            <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-medium">{data.blockers.length}</span>
          )}
        </div>
        {data.blockers.length === 0 ? (
          <EmptyState icon={CheckCircle2} titleEn="No active blockers" titleAr="لا عوائق نشطة" ar={ar} />
        ) : (
          <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/25">
            {data.blockers.map((b) => (
              <div key={b.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/10 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${b.severity === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{ar ? b.titleAr : b.titleEn}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">{ar ? b.descAr : b.descEn}</p>
                </div>
                <Pill color={b.severity === "high" ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}>
                  {ar ? (b.severity === "high" ? "عالي" : "متوسط") : b.severity}
                </Pill>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stalled */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} strokeWidth={1.75} className="text-amber-500" />
          <h3 className="text-[13px] font-medium text-foreground">{ar ? "المشاريع المتوقفة" : "Stalled Projects"}</h3>
          {data.stalled.length > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">{data.stalled.length}</span>
          )}
        </div>
        {data.stalled.length === 0 ? (
          <EmptyState icon={CheckCircle2} titleEn="No stalled projects" titleAr="لا مشاريع متوقفة" ar={ar} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.stalled.map((s) => (
              <div key={s.id} className="border border-amber-200/50 bg-amber-50/30 rounded-xl px-4 py-3.5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-medium text-foreground leading-snug">{ar ? s.titleAr : s.titleEn}</p>
                  <Pill color="bg-amber-100 text-amber-700 border border-amber-200">{ar ? s.statusAr : s.statusEn}</Pill>
                </div>
                {s.progress !== undefined && (
                  <div className="flex items-center gap-2 mb-2">
                    <ScoreBar score={s.progress} color="bg-amber-400" />
                    <span className="text-[10px] text-muted-foreground shrink-0">{s.progress}%</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/70">{ar ? s.severityReasonAr : s.severityReason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unresolved */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye size={14} strokeWidth={1.75} className="text-violet-500" />
          <h3 className="text-[13px] font-medium text-foreground">{ar ? "قرارات غير محلولة" : "Unresolved Decisions"}</h3>
          {data.unresolved.length > 0 && (
            <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">{data.unresolved.length}</span>
          )}
        </div>
        {data.unresolved.length === 0 ? (
          <EmptyState icon={CheckCircle2} titleEn="No pending decisions" titleAr="لا قرارات معلقة" ar={ar} />
        ) : (
          <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/25">
            {data.unresolved.map((u) => (
              <div key={u.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/10 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Eye size={14} strokeWidth={1.75} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">{ar ? u.titleAr : u.titleEn}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{ar ? u.waitingOnAr : u.waitingOnEn}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">{ar ? u.ageAr : u.ageEn}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 2. Opportunities Tab ─────────────────────────────────

function OpportunitiesTab({ ar }: { ar: boolean }) {
  const clusters = useMemo(detectOpportunityClusters, []);

  const scoreColor: Record<string, string> = {
    Revenue: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    Growth: "bg-blue-50 text-blue-700 border border-blue-200",
    Pipeline: "bg-amber-50 text-amber-700 border border-amber-200",
    Retention: "bg-violet-50 text-violet-700 border border-violet-200",
  };

  return (
    <div className="space-y-4">
      {clusters.length === 0 ? (
        <EmptyState icon={Lightbulb} titleEn="No new opportunities detected" titleAr="لا فرص جديدة مكتشفة" ar={ar} />
      ) : (
        clusters.map((c) => (
          <div key={c.id} className="border border-border/40 rounded-xl p-5 hover:shadow-sm transition-shadow bg-background">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Lightbulb size={16} strokeWidth={1.75} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-0.5">{ar ? c.titleAr : c.titleEn}</p>
                <p className="text-[13px] font-medium text-foreground leading-snug">{ar ? c.descAr : c.descEn}</p>
              </div>
              <Pill color={scoreColor[c.scoreLabel] || "bg-muted text-muted-foreground border border-border"}>
                {c.scoreLabel}
              </Pill>
            </div>
            {c.items.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {c.items.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-muted/50 border border-border/40 rounded-full px-2.5 py-1 text-muted-foreground">
                    <span className="text-muted-foreground/50">{item.type}</span>
                    <span>{ar ? item.nameAr : item.nameEn}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary cursor-pointer hover:opacity-80 transition-opacity">
              <ArrowRight size={12} strokeWidth={2} />
              {ar ? c.actionAr : c.actionEn}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── 3. Patterns Tab ─────────────────────────────────────

function PatternsTab({ ar }: { ar: boolean }) {
  const data = useMemo(analyzePatterns, []);

  const trendIcon = data.velocityTrend === "improving" ? TrendingUp : data.velocityTrend === "declining" ? TrendingDown : Minus;
  const trendColor = data.velocityTrend === "improving" ? "text-emerald-600" : data.velocityTrend === "declining" ? "text-rose-500" : "text-muted-foreground";
  const trendLabelEn = data.velocityTrend === "improving" ? "Improving" : data.velocityTrend === "declining" ? "Declining" : "Stable";
  const trendLabelAr = data.velocityTrend === "improving" ? "يتحسن" : data.velocityTrend === "declining" ? "يتراجع" : "مستقر";

  const patternColor: Record<string, string> = {
    success: "border-emerald-200/60 bg-emerald-50/30",
    failure: "border-rose-200/60 bg-rose-50/30",
    neutral: "border-border/40 bg-background",
  };
  const patternIcon: Record<string, React.ElementType> = {
    success: TrendingUp,
    failure: TrendingDown,
    neutral: Activity,
  };
  const patternIconColor: Record<string, string> = {
    success: "text-emerald-600",
    failure: "text-rose-500",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
          <p className="text-[10px] text-muted-foreground mb-1">{ar ? "معدل الإنجاز" : "Completion Rate"}</p>
          <p className="text-[24px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{data.successRate}%</p>
        </div>
        <div className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
          <p className="text-[10px] text-muted-foreground mb-1">{ar ? "زخم السرعة" : "Velocity Trend"}</p>
          <div className="flex items-center gap-1.5">
            {(() => { const Icon = trendIcon; return <Icon size={18} strokeWidth={1.75} className={trendColor} />; })()}
            <p className="text-[14px] font-medium text-foreground">{ar ? trendLabelAr : trendLabelEn}</p>
          </div>
        </div>
        <div className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
          <p className="text-[10px] text-muted-foreground mb-1">{ar ? "أعضاء الفريق" : "Team Members"}</p>
          <p className="text-[24px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{data.assignees.length}</p>
        </div>
      </div>

      {/* Patterns */}
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-3">{ar ? "الأنماط المكتشفة" : "Detected Patterns"}</h3>
        <div className="space-y-3">
          {data.patterns.map((p) => {
            const Icon = patternIcon[p.type];
            return (
              <div key={p.id} className={`border ${patternColor[p.type]} rounded-xl px-5 py-4`}>
                <div className="flex items-start gap-3">
                  <Icon size={15} strokeWidth={1.75} className={`${patternIconColor[p.type]} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{ar ? p.titleAr : p.titleEn}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 leading-relaxed">{ar ? p.descAr : p.descEn}</p>
                    <p className="text-[10px] font-medium text-primary mt-2">{ar ? p.metricAr : p.metric}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignee leaderboard */}
      {data.assignees.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-foreground mb-3">{ar ? "أداء الفريق" : "Team Performance"}</h3>
          <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/25">
            {data.assignees.slice(0, 6).map((a, i) => (
              <div key={a.name} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/10 transition-colors">
                <span className="text-[11px] text-muted-foreground/50 w-4 shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{ar ? a.nameAr : a.name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.assigned} {ar ? "مُعيّن" : "assigned"} · {a.completed} {ar ? "مكتمل" : "done"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20">
                    <ScoreBar score={a.completionRate} color={a.completionRate >= 60 ? "bg-emerald-500" : a.completionRate >= 30 ? "bg-amber-500" : "bg-rose-500"} />
                  </div>
                  <span className="text-[12px] font-medium text-foreground tabular-nums w-8">{a.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 4. Goal Drift Tab ────────────────────────────────────

function GoalDriftTab({ ar, industry }: { ar: boolean; industry?: string }) {
  const items = useMemo(() => detectGoalDrift(industry), [industry]);

  const driftStyle: Record<string, { bg: string; border: string; dot: string; labelEn: string; labelAr: string }> = {
    on_track:  { bg: "bg-emerald-50/40", border: "border-emerald-200/60", dot: "bg-emerald-500", labelEn: "On Track",  labelAr: "على المسار" },
    drifting:  { bg: "bg-amber-50/40",   border: "border-amber-200/60",   dot: "bg-amber-500",   labelEn: "Drifting",  labelAr: "ينحرف" },
    neglected: { bg: "bg-rose-50/40",    border: "border-rose-200/60",    dot: "bg-rose-500",    labelEn: "Neglected", labelAr: "مهمل" },
  };

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const s = driftStyle[item.driftLevel];
        return (
          <div key={item.id} className={`border ${s.border} ${s.bg} rounded-xl px-5 py-4`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                <p className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
                  {ar ? item.goalAr : item.goalEn}
                </p>
              </div>
              <Pill color={`${s.bg} ${s.border} ${item.driftLevel === "on_track" ? "text-emerald-700" : item.driftLevel === "drifting" ? "text-amber-700" : "text-rose-700"}`}>
                {ar ? s.labelAr : s.labelEn}
              </Pill>
            </div>
            <p className="text-[12px] text-muted-foreground mb-2">{ar ? item.currentStateAr : item.currentStateEn}</p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-3">{ar ? item.evidenceAr : item.evidenceEn}</p>
            {item.driftLevel !== "on_track" && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                <ArrowRight size={11} strokeWidth={2} />
                {ar ? item.actionAr : item.actionEn}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 5. Project Health Tab ────────────────────────────────

function HealthTab({ ar }: { ar: boolean }) {
  const projects = useMemo(computeProjectHealthScores, []);

  const levelStyle: Record<string, { bg: string; text: string; labelEn: string; labelAr: string; bar: string }> = {
    healthy:  { bg: "bg-emerald-50",  text: "text-emerald-700", labelEn: "Healthy",  labelAr: "صحي",    bar: "bg-emerald-500" },
    at_risk:  { bg: "bg-amber-50",    text: "text-amber-700",   labelEn: "At Risk",  labelAr: "في خطر", bar: "bg-amber-500" },
    critical: { bg: "bg-rose-50",     text: "text-rose-700",    labelEn: "Critical", labelAr: "حرج",    bar: "bg-rose-500" },
  };

  const grouped = {
    critical: projects.filter((p) => p.level === "critical"),
    at_risk:  projects.filter((p) => p.level === "at_risk"),
    healthy:  projects.filter((p) => p.level === "healthy"),
  };

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {(["critical", "at_risk", "healthy"] as const).map((level) => {
          const s = levelStyle[level];
          return (
            <div key={level} className={`${s.bg} border border-current/10 rounded-xl px-4 py-3`}>
              <p className={`text-[11px] font-medium ${s.text} mb-1`}>{ar ? s.labelAr : s.labelEn}</p>
              <p className={`text-[28px] font-medium ${s.text} tabular-nums leading-none`} style={{ fontFamily: "var(--app-font-serif)" }}>{grouped[level].length}</p>
            </div>
          );
        })}
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <EmptyState icon={Heart} titleEn="All projects complete" titleAr="جميع المشاريع مكتملة" ar={ar} />
      ) : (
        <div className="space-y-2.5">
          {projects.map((p) => {
            const s = levelStyle[p.level];
            return (
              <div key={p.id} className="border border-border/40 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow bg-background">
                <div className="flex items-start gap-4">
                  <ScoreRing
                    score={p.score}
                    color={p.level === "healthy" ? "#10b981" : p.level === "at_risk" ? "#f59e0b" : "#ef4444"}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[13px] font-medium text-foreground leading-snug">{ar ? p.titleAr : p.titleEn}</p>
                      <Pill color={`${s.bg} ${s.text} border border-current/20`}>{ar ? s.labelAr : s.labelEn}</Pill>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-2.5">
                      <div>
                        <p className="text-[9px] text-muted-foreground/50 mb-1">{ar ? "الزخم" : "Momentum"}</p>
                        <ScoreBar score={p.momentum} color="bg-blue-500" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground/50 mb-1">{ar ? "النشاط" : "Activity"}</p>
                        <ScoreBar score={p.activity} color="bg-violet-500" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground/50 mb-1">{ar ? "التقدم" : "Progress"}</p>
                        <ScoreBar score={p.progress} color={s.bar} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                      <span>{ar ? p.statusAr : p.statusEn}</span>
                      <span>·</span>
                      <span>{p.assigneeEn}</span>
                      <span>·</span>
                      <span>{ar ? "موعد: " : "Due: "}{p.dueDateEn}</span>
                      {p.blockerCount > 0 && <span className="text-rose-500">· {p.blockerCount} {ar ? "عائق" : "blocker(s)"}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 6. Focus Tab ─────────────────────────────────────────

function FocusTab({ ar, navigate }: { ar: boolean; navigate: (p: string) => void }) {
  const items = useMemo(getDailyFocusItems, []);

  const moduleIcon: Record<string, React.ElementType> = {
    finance: Landmark, sales: ShoppingBag, work: Briefcase,
    resources: Package, organizations: Building2, people: Users,
  };
  const moduleBg: Record<string, string> = {
    finance: "bg-emerald-50", sales: "bg-amber-50", work: "bg-blue-50",
    resources: "bg-violet-50", organizations: "bg-cyan-50", people: "bg-rose-50",
  };
  const moduleIconColor: Record<string, string> = {
    finance: "text-emerald-600", sales: "text-amber-600", work: "text-blue-600",
    resources: "text-violet-600", organizations: "text-cyan-600", people: "text-rose-500",
  };

  function handleClick(item: FocusItem) {
    if (item.module === "finance" && item.entityId) navigate(`/finance/${item.entityId}`);
    else if (item.module === "sales" && item.entityId) navigate(`/sales/${item.entityId}`);
    else if (item.module === "work" && item.entityId) navigate(`/work/${item.entityId}`);
    else if (item.module === "resources" && item.entityId) navigate(`/resources/${item.entityId}`);
    else if (item.module === "organizations" && item.entityId) navigate(`/organizations/${item.entityId}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground mb-4">{ar ? "أعلى الإجراءات تأثيراً لليوم — مرتبة حسب الرافعة المالية" : "Today's highest-leverage actions — ranked by impact"}</p>
      {items.length === 0 ? (
        <EmptyState icon={Zap} titleEn="No focus items today" titleAr="لا عناصر تركيز اليوم" ar={ar} />
      ) : (
        items.map((item, i) => {
          const Icon = moduleIcon[item.module] || Briefcase;
          const bg = moduleBg[item.module] || "bg-muted";
          const iconCl = moduleIconColor[item.module] || "text-primary";
          return (
            <div key={item.id} className="border border-border/40 rounded-xl px-5 py-4 hover:shadow-sm transition-shadow bg-background cursor-pointer group" onClick={() => handleClick(item)}>
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums font-medium">{String(i + 1).padStart(2, "0")}</span>
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon size={15} strokeWidth={1.75} className={iconCl} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{ar ? item.titleAr : item.titleEn}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Pill color="bg-muted text-muted-foreground border border-border/40">{item.timeEst}</Pill>
                      <div className="flex items-center gap-1">
                        <Flame size={11} strokeWidth={1.75} className={item.leverageScore >= 90 ? "text-rose-500" : "text-amber-500"} />
                        <span className="text-[10px] font-medium text-muted-foreground">{item.leverageScore}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-2">{ar ? item.whyAr : item.whyEn}</p>
                  <Pill color="bg-primary/8 text-primary border border-primary/20">{ar ? item.leverageAr : item.leverageEn}</Pill>
                </div>
                <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0 mt-1" />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── 7. Relationships Tab ─────────────────────────────────

function RelationshipsTab({ ar }: { ar: boolean }) {
  const data = useMemo(analyzeRelationships, []);

  const typeIcon: Record<string, React.ElementType> = {
    person: Users, organization: Building2, work: Briefcase, deal: ShoppingBag, invoice: Landmark, resource: Package,
  };
  const typeLabel: Record<string, { en: string; ar: string }> = {
    person: { en: "Person", ar: "شخص" },
    organization: { en: "Org", ar: "منظمة" },
    work: { en: "Work", ar: "عمل" },
    deal: { en: "Deal", ar: "صفقة" },
    invoice: { en: "Invoice", ar: "فاتورة" },
    resource: { en: "Resource", ar: "مورد" },
  };

  return (
    <div className="space-y-7">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
          <p className="text-[10px] text-muted-foreground mb-1">{ar ? "إجمالي العلاقات" : "Total Relationships"}</p>
          <p className="text-[26px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{data.totalRelationships}</p>
        </div>
        <div className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
          <p className="text-[10px] text-muted-foreground mb-1">{ar ? "كثافة الشبكة" : "Network Density"}</p>
          <p className="text-[26px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{data.networkDensity}%</p>
        </div>
        <div className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
          <p className="text-[10px] text-muted-foreground mb-1">{ar ? "كيانات معزولة" : "Isolated Entities"}</p>
          <p className="text-[26px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{data.isolatedCount}</p>
        </div>
      </div>

      {/* Hubs */}
      {data.hubs.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-foreground mb-3">{ar ? "مراكز الشبكة" : "Network Hubs"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.hubs.map((hub) => {
              const Icon = typeIcon[hub.type] || Briefcase;
              return (
                <div key={hub.id} className="border border-border/40 rounded-xl px-4 py-3.5 bg-background hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                      <Icon size={14} strokeWidth={1.75} className="text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{ar ? hub.nameAr : hub.nameEn}</p>
                      <p className="text-[10px] text-muted-foreground">{ar ? (typeLabel[hub.type]?.ar || hub.type) : (typeLabel[hub.type]?.en || hub.type)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[16px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{hub.connectionCount}</p>
                      <p className="text-[9px] text-muted-foreground/50">{ar ? "اتصال" : "connections"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hub.types.map((t) => (
                      <Pill key={t} color="bg-muted/60 text-muted-foreground border border-border/40">{ar ? (typeLabel[t]?.ar || t) : (typeLabel[t]?.en || t)}</Pill>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bridge insights */}
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-3">{ar ? "رؤى الشبكة" : "Network Insights"}</h3>
        <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/25">
          {data.keyBridges.map((b, i) => (
            <div key={i} className="flex items-start gap-3.5 px-5 py-3.5">
              <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                <Network size={12} strokeWidth={1.75} className="text-primary" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-foreground">{ar ? b.titleAr : b.titleEn}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">{ar ? b.descAr : b.descEn}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 8. Friction Tab ─────────────────────────────────────

function FrictionTab({ ar }: { ar: boolean }) {
  const points = useMemo(detectFrictionPoints, []);

  const frictionIcon: Record<string, React.ElementType> = {
    bottleneck: AlertTriangle, inactive: Clock, overload: Flame, gap: Shield,
  };
  const frictionBg: Record<string, string> = {
    bottleneck: "bg-rose-50", inactive: "bg-amber-50", overload: "bg-orange-50", gap: "bg-violet-50",
  };
  const frictionColor: Record<string, string> = {
    bottleneck: "text-rose-600", inactive: "text-amber-600", overload: "text-orange-600", gap: "text-violet-600",
  };
  const frictionLabelEn: Record<string, string> = {
    bottleneck: "Bottleneck", inactive: "Inactive", overload: "Overload", gap: "Gap",
  };
  const frictionLabelAr: Record<string, string> = {
    bottleneck: "عنق زجاجة", inactive: "خامل", overload: "حمل زائد", gap: "فجوة",
  };

  return (
    <div className="space-y-3">
      {points.length === 0 ? (
        <EmptyState icon={CheckCircle2} titleEn="No friction points detected" titleAr="لا نقاط احتكاك مكتشفة" ar={ar} />
      ) : (
        points.map((f) => {
          const Icon = frictionIcon[f.frictionType] || AlertOctagon;
          const bg = frictionBg[f.frictionType] || "bg-muted";
          const iconCl = frictionColor[f.frictionType] || "text-muted-foreground";
          return (
            <div key={f.id} className={`border ${f.severity === "high" ? "border-rose-200/60" : "border-amber-200/60"} rounded-xl px-5 py-4`}>
              <div className="flex items-start gap-3.5">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={15} strokeWidth={1.75} className={iconCl} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[13px] font-medium text-foreground">{ar ? f.titleAr : f.titleEn}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Pill color={f.severity === "high" ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-amber-50 text-amber-700 border border-amber-200"}>
                        {ar ? (f.severity === "high" ? "عالي" : "متوسط") : f.severity}
                      </Pill>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-1.5">{ar ? f.descAr : f.descEn}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
                    <span>{ar ? (frictionLabelAr[f.frictionType]) : (frictionLabelEn[f.frictionType])}</span>
                    <span>·</span>
                    <span>{f.affectedCount} {ar ? "متأثر" : "affected"}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── 9. Weekly Report Tab ─────────────────────────────────

function WeeklyTab({ ar }: { ar: boolean }) {
  const report = useMemo(generateWeeklyReport, []);

  const scoreColor = report.overallScore >= 70 ? "#10b981" : report.overallScore >= 50 ? "hsl(var(--primary))" : "#ef4444";
  const circ = 2 * Math.PI * 46;
  const offset = circ - (report.overallScore / 100) * circ;

  const sections: Array<{
    key: keyof WeeklyReport;
    titleEn: string;
    titleAr: string;
    icon: React.ElementType;
    bg: string;
    iconCl: string;
    border: string;
    pillCl: string;
  }> = [
    { key: "wins",         titleEn: "Wins",         titleAr: "الانتصارات",    icon: TrendingUp,    bg: "bg-emerald-50",  iconCl: "text-emerald-600", border: "border-emerald-200/60", pillCl: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    { key: "risks",        titleEn: "Risks",         titleAr: "المخاطر",      icon: AlertTriangle, bg: "bg-rose-50",     iconCl: "text-rose-600",    border: "border-rose-200/60",    pillCl: "bg-rose-50 text-rose-700 border border-rose-200" },
    { key: "opportunities",titleEn: "Opportunities", titleAr: "الفرص",        icon: Lightbulb,     bg: "bg-amber-50",    iconCl: "text-amber-600",   border: "border-amber-200/60",   pillCl: "bg-amber-50 text-amber-700 border border-amber-200" },
    { key: "bottlenecks",  titleEn: "Bottlenecks",   titleAr: "عوائق",        icon: AlertOctagon,  bg: "bg-violet-50",   iconCl: "text-violet-600",  border: "border-violet-200/60",  pillCl: "bg-violet-50 text-violet-700 border border-violet-200" },
  ];

  return (
    <div className="space-y-7">
      {/* Summary ring */}
      <div className="flex items-center gap-6 p-5 border border-border/40 rounded-xl bg-background">
        <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
          <svg width={108} height={108} className="-rotate-90">
            <circle cx={54} cy={54} r={46} fill="none" stroke="hsl(var(--border) / 0.25)" strokeWidth={7} />
            <circle cx={54} cy={54} r={46} fill="none" stroke={scoreColor} strokeWidth={7}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[24px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
              {report.overallScore}
            </span>
            <span className="text-[9px] text-muted-foreground/50 mt-1">/100</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? "التقرير الأسبوعي" : "Weekly Report"}</p>
          <p className="text-[18px] font-medium text-foreground leading-snug mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {ar ? report.overallLabelAr : report.overallLabelEn}
          </p>
          <div className="flex gap-2 flex-wrap">
            {[
              { count: report.wins.length, labelEn: "wins", labelAr: "انتصار", color: "text-emerald-600" },
              { count: report.risks.length, labelEn: "risks", labelAr: "خطر", color: "text-rose-500" },
              { count: report.opportunities.length, labelEn: "opps", labelAr: "فرصة", color: "text-amber-600" },
              { count: report.bottlenecks.length, labelEn: "blocks", labelAr: "عائق", color: "text-violet-600" },
            ].map((s) => (
              <span key={s.labelEn} className={`text-[11px] font-medium ${s.color}`}>
                {s.count} {ar ? s.labelAr : s.labelEn}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((sec) => {
        const items = report[sec.key] as WeeklyReport["wins"];
        if (items.length === 0) return null;
        return (
          <div key={sec.key}>
            <div className="flex items-center gap-2 mb-3">
              <sec.icon size={14} strokeWidth={1.75} className={sec.iconCl} />
              <h3 className="text-[13px] font-medium text-foreground">{ar ? sec.titleAr : sec.titleEn}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sec.pillCl}`}>{items.length}</span>
            </div>
            <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/25">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-muted/10 transition-colors">
                  <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${sec.iconCl.replace("text-", "bg-")}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[13px] font-medium text-foreground">{ar ? item.titleAr : item.titleEn}</p>
                      {item.value && <span className="text-[11px] font-medium text-primary shrink-0">{item.value}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{ar ? item.descAr : item.descEn}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 10. Alignment Tab ────────────────────────────────────

function AlignmentTab({ ar, industry, companySize }: { ar: boolean; industry?: string; companySize?: string }) {
  const data = useMemo(() => computeLifeAlignment(industry, companySize), [industry, companySize]);

  const trendIcon = (t: string) => t === "up" ? TrendingUp : t === "down" ? TrendingDown : Minus;
  const trendCl = (t: string) => t === "up" ? "text-emerald-600" : t === "down" ? "text-rose-500" : "text-muted-foreground";

  const scoreColor = (s: number) =>
    s >= 70 ? "#10b981" : s >= 50 ? "hsl(var(--primary))" : s >= 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-7">
      {/* Overall */}
      <div className="flex items-center gap-5 p-5 border border-border/40 rounded-xl bg-background">
        <ScoreRing score={data.overallScore} size={80} color={scoreColor(data.overallScore)} />
        <div>
          <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? "توافق الحياة" : "Life Alignment"}</p>
          <p className="text-[14px] font-medium text-foreground leading-snug" style={{ fontFamily: "var(--app-font-serif)" }}>
            {ar ? data.summaryAr : data.summaryEn}
          </p>
        </div>
      </div>

      {/* Dimensions */}
      <div className="space-y-4">
        {data.dimensions.map((d) => {
          const TIcon = trendIcon(d.trend);
          return (
            <div key={d.id} className="border border-border/40 rounded-xl px-5 py-4 bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <ScoreRing score={d.score} size={64} color={scoreColor(d.score)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
                      {ar ? d.dimensionAr : d.dimensionEn}
                    </p>
                    <TIcon size={14} strokeWidth={1.75} className={trendCl(d.trend)} />
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 mb-2 leading-relaxed">{ar ? d.insightAr : d.insightEn}</p>
                  <div className="mb-2">
                    <ScoreBar score={d.score} color={d.score >= 65 ? "bg-emerald-500" : d.score >= 40 ? "bg-amber-500" : "bg-rose-500"} />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 italic mb-1.5">
                    {ar ? d.becomingGoalAr : d.becomingGoalEn}
                  </p>
                  {d.score < 70 && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary mt-1">
                      <ArrowRight size={11} strokeWidth={2} />
                      {ar ? d.actionAr : d.actionEn}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Decision Workspace Tab ───────────────────────────────

interface DecisionTemplate {
  id: string;
  titleEn: string;
  titleAr: string;
  contextEn: string;
  contextAr: string;
  category: string;
  recommendationsEn: string[];
  recommendationsAr: string[];
  risksEn: string[];
  risksAr: string[];
  stakeholdersEn: string[];
  stakeholdersAr: string[];
  dependenciesEn: string[];
  dependenciesAr: string[];
  urgency: "high" | "medium" | "low";
}

function buildDecisionTemplates(): DecisionTemplate[] {
  const deals = loadDeals().filter((d) => d.stage === "negotiation").slice(0, 2);
  const work = loadWorkItems().filter((w) => w.priority === "urgent" && w.status !== "done").slice(0, 2);
  const invoices = loadInvoices().filter((i) => i.status === "overdue").slice(0, 2);
  const atRisk = ORGANIZATIONS.filter((o) => o.healthScore < 55).slice(0, 1);

  const templates: DecisionTemplate[] = [];

  deals.forEach((deal) => {
    templates.push({
      id: `ws-deal-${deal.id}`, category: "Sales",
      titleEn: `Close decision: ${deal.titleEn}`,
      titleAr: `قرار الإغلاق: ${deal.titleAr}`,
      contextEn: `${deal.value.toLocaleString()} SAR deal at ${deal.probability}% probability — in negotiation.`,
      contextAr: `صفقة ${deal.value.toLocaleString()} ر.س باحتمالية ${deal.probability}% — في التفاوض.`,
      recommendationsEn: [
        "Prepare final commercial proposal with value summary",
        "Identify and address remaining objections",
        `Set firm closing deadline for ${deal.expectedCloseDateEn || "next 14 days"}`,
      ],
      recommendationsAr: [
        "أعد العرض التجاري النهائي مع ملخص القيمة",
        "حدد الاعتراضات المتبقية وعالجها",
        `ضع موعداً نهائياً حازماً للإغلاق في ${deal.expectedCloseDateAr || "١٤ يوماً القادمة"}`,
      ],
      risksEn: [
        "Competitor may close window if decision delays",
        "Internal stakeholders may lose momentum",
        "Cash flow impact if deal slips to next quarter",
      ],
      risksAr: [
        "قد يغلق المنافس الفرصة في حال التأخر في القرار",
        "قد يفقد المعنيون الداخليون الزخم",
        "تأثير على التدفق النقدي إذا انزلقت الصفقة إلى الربع القادم",
      ],
      stakeholdersEn: ["Sales Lead", "Finance Director", "Legal Team", deal.orgNameEn],
      stakeholdersAr: ["قائد المبيعات", "مدير المالية", "الفريق القانوني", deal.orgNameAr],
      dependenciesEn: ["Contract template approval", "Pricing sign-off", "Credit check"],
      dependenciesAr: ["الموافقة على قالب العقد", "اعتماد التسعير", "فحص الائتمان"],
      urgency: "high",
    });
  });

  work.forEach((w) => {
    templates.push({
      id: `ws-work-${w.id}`, category: "Operations",
      titleEn: `Resolve urgency: ${w.titleEn}`,
      titleAr: `حل العجلة: ${w.titleAr}`,
      contextEn: `${w.progress}% complete. Assigned to ${w.assigneeEn}. Priority: Urgent.`,
      contextAr: `${w.progress}% مكتمل. مُعيّن لـ ${w.assigneeAr}. الأولوية: عاجل.`,
      recommendationsEn: [
        `Clear blockers with ${w.assigneeEn} within 24 hours`,
        "Allocate additional resources if behind schedule",
        "Reduce scope if full delivery is not feasible",
      ],
      recommendationsAr: [
        `أزل العوائق مع ${w.assigneeAr} خلال ٢٤ ساعة`,
        "خصّص موارد إضافية إذا كان متأخراً عن الجدول",
        "قلّل النطاق إذا لم يكن التسليم الكامل ممكناً",
      ],
      risksEn: [
        "Missed delivery impacts client confidence",
        "Unresolved urgency cascades to dependent tasks",
        "Team morale suffers from persistent blockers",
      ],
      risksAr: [
        "التسليم الفائت يؤثر على ثقة العميل",
        "العجلة غير المحلولة تتتالى على المهام التابعة",
        "معنويات الفريق تتأثر بالعوائق المستمرة",
      ],
      stakeholdersEn: [w.assigneeEn, "Operations Manager", "Affected Client"],
      stakeholdersAr: [w.assigneeAr, "مدير العمليات", "العميل المتأثر"],
      dependenciesEn: ["Resource availability", "Technical environment", "Approval chain"],
      dependenciesAr: ["توافر الموارد", "البيئة التقنية", "سلسلة الاعتماد"],
      urgency: "high",
    });
  });

  invoices.forEach((inv) => {
    templates.push({
      id: `ws-inv-${inv.id}`, category: "Finance",
      titleEn: `Collection decision: ${inv.number}`,
      titleAr: `قرار التحصيل: ${inv.number}`,
      contextEn: `${inv.amount.toLocaleString()} SAR overdue from ${inv.orgNameEn}.`,
      contextAr: `${inv.amount.toLocaleString()} ر.س متأخرة من ${inv.orgNameAr}.`,
      recommendationsEn: [
        "Send formal demand letter via registered mail",
        "Escalate to senior management contact at client",
        "Evaluate credit hold on future orders if no response in 7 days",
      ],
      recommendationsAr: [
        "أرسل خطاب مطالبة رسمي عبر البريد المسجّل",
        "صعّد إلى جهة اتصال الإدارة العليا لدى العميل",
        "قيّم تجميد الائتمان على الطلبات المستقبلية إذا لم يكن هناك رد خلال ٧ أيام",
      ],
      risksEn: [
        "Prolonged delay triggers bad-debt write-off",
        "Relationship damage if escalation is mishandled",
        "Working capital compression impacts operations",
      ],
      risksAr: [
        "التأخير المطوّل يؤدي إلى شطب الديون المعدومة",
        "تلف العلاقة إذا أُسيء التعامل مع التصعيد",
        "ضغط رأس المال العامل يؤثر على العمليات",
      ],
      stakeholdersEn: ["Finance Manager", inv.orgNameEn, "Legal Counsel", "Account Manager"],
      stakeholdersAr: ["مدير المالية", inv.orgNameAr, "المستشار القانوني", "مدير الحساب"],
      dependenciesEn: ["Invoice delivery confirmation", "Contract terms review", "Legal opinion"],
      dependenciesAr: ["تأكيد تسليم الفاتورة", "مراجعة بنود العقد", "رأي قانوني"],
      urgency: "high",
    });
  });

  atRisk.forEach((org) => {
    templates.push({
      id: `ws-org-${org.id}`, category: "Relationships",
      titleEn: `Retention decision: ${org.nameEn}`,
      titleAr: `قرار الاحتفاظ: ${org.nameAr}`,
      contextEn: `Health score ${org.healthScore}/100. Lifecycle: ${org.lifecycle}. Headcount: ${org.headcount}.`,
      contextAr: `مؤشر الصحة ${org.healthScore}/100. دورة الحياة: ${org.lifecycle}. عدد الموظفين: ${org.headcount}.`,
      recommendationsEn: [
        "Schedule executive-level review meeting within 2 weeks",
        "Identify top 3 unresolved pain points and present a resolution plan",
        "Offer a loyalty incentive or service upgrade to demonstrate commitment",
      ],
      recommendationsAr: [
        "جدول اجتماع مراجعة على مستوى تنفيذي خلال أسبوعين",
        "حدد أهم ٣ نقاط ألم غير محلولة وقدّم خطة حل",
        "اعرض حافزاً على الولاء أو ترقية الخدمة لإظهار الالتزام",
      ],
      risksEn: [
        "Account churn leads to revenue loss and negative referrals",
        "Competitor may already be in conversation",
        "Delayed action signals indifference to client health",
      ],
      risksAr: [
        "انقطاع الحساب يؤدي إلى خسارة الإيرادات وتوصيات سلبية",
        "قد يكون المنافس في محادثة بالفعل",
        "التأخر في الإجراء يُشير إلى اللامبالاة بصحة العميل",
      ],
      stakeholdersEn: ["Account Manager", "Customer Success", org.ownerEn, "CEO"],
      stakeholdersAr: ["مدير الحساب", "نجاح العملاء", org.ownerAr, "الرئيس التنفيذي"],
      dependenciesEn: ["NPS/satisfaction data", "Contract renewal timeline", "Product roadmap"],
      dependenciesAr: ["بيانات رضا العميل", "الجدول الزمني لتجديد العقد", "خارطة طريق المنتج"],
      urgency: "medium",
    });
  });

  return templates;
}

function WorkspaceTab({ ar }: { ar: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);

  const templates = useMemo(buildDecisionTemplates, []);
  const selectedItem = templates.find((t) => t.id === selected) || null;

  const catColor: Record<string, string> = {
    Sales: "bg-amber-50 text-amber-700 border border-amber-200",
    Operations: "bg-blue-50 text-blue-700 border border-blue-200",
    Finance: "bg-rose-50 text-rose-700 border border-rose-200",
    Relationships: "bg-violet-50 text-violet-700 border border-violet-200",
  };

  const urgencyDot: Record<string, string> = {
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <CheckCircle2 size={28} strokeWidth={1.5} className="text-emerald-400 mb-3" />
        <p className="text-[14px] text-muted-foreground">{ar ? "لا قرارات مطلوبة حالياً" : "No decisions required right now"}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Decision list */}
      <div className="lg:col-span-1">
        <p className="text-[11px] text-muted-foreground/60 mb-3">{ar ? "القرارات المطلوبة" : "Decisions Required"} — {templates.length}</p>
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id}
              className={`border rounded-xl px-4 py-3.5 cursor-pointer transition-all hover:shadow-sm ${selected === t.id ? "border-primary bg-primary/5" : "border-border/40 bg-background"}`}
              onClick={() => setSelected(selected === t.id ? null : t.id)}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDot[t.urgency]}`} />
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${catColor[t.category] || "bg-muted text-muted-foreground"}`}>{t.category}</span>
                </div>
              </div>
              <p className="text-[12.5px] font-medium text-foreground leading-snug">{ar ? t.titleAr : t.titleEn}</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1 line-clamp-2">{ar ? t.contextAr : t.contextEn}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Decision workspace */}
      <div className="lg:col-span-2">
        {!selectedItem ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border/40 rounded-2xl text-center">
            <FileText size={24} strokeWidth={1.5} className="text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground/60">{ar ? "اختر قراراً من القائمة" : "Select a decision from the list"}</p>
            <p className="text-[11px] text-muted-foreground/40 mt-1">{ar ? "سيظهر هنا ورقة العمل الكاملة" : "The full decision workspace will appear here"}</p>
          </div>
        ) : (
          <div className="border border-border/40 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/30 bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${catColor[selectedItem.category] || "bg-muted text-muted-foreground"}`}>{selectedItem.category}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${urgencyDot[selectedItem.urgency]}`} />
                <span className="text-[10px] text-muted-foreground/60 capitalize">{selectedItem.urgency} urgency</span>
              </div>
              <h3 className="text-[16px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
                {ar ? selectedItem.titleAr : selectedItem.titleEn}
              </h3>
              <p className="text-[12px] text-muted-foreground/70 mt-1">{ar ? selectedItem.contextAr : selectedItem.contextEn}</p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Recommendations */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={13} strokeWidth={1.75} className="text-amber-500" />
                  <p className="text-[12px] font-semibold text-foreground">{ar ? "التوصيات" : "Recommendations"}</p>
                </div>
                <div className="space-y-2">
                  {(ar ? selectedItem.recommendationsAr : selectedItem.recommendationsEn).map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[12px] text-foreground/80">
                      <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={13} strokeWidth={1.75} className="text-rose-500" />
                  <p className="text-[12px] font-semibold text-foreground">{ar ? "المخاطر" : "Risks"}</p>
                </div>
                <div className="space-y-1.5">
                  {(ar ? selectedItem.risksAr : selectedItem.risksEn).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11.5px] text-foreground/75 bg-rose-50/30 border border-rose-100 rounded-lg px-3 py-2">
                      <AlertTriangle size={11} strokeWidth={1.75} className="text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stakeholders + Dependencies */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={13} strokeWidth={1.75} className="text-violet-500" />
                    <p className="text-[12px] font-semibold text-foreground">{ar ? "المعنيون" : "Stakeholders"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(ar ? selectedItem.stakeholdersAr : selectedItem.stakeholdersEn).map((s, i) => (
                      <span key={i} className="text-[10px] px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Activity size={13} strokeWidth={1.75} className="text-primary" />
                    <p className="text-[12px] font-semibold text-foreground">{ar ? "التبعيات" : "Dependencies"}</p>
                  </div>
                  <div className="space-y-1">
                    {(ar ? selectedItem.dependenciesAr : selectedItem.dependenciesEn).map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function DecisionCenter() {
  const { lang } = useLanguage();
  const { onboardingData } = useOnboarding();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("decisions");
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "مركز القرارات" : "Decision Center"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف بيانات عشان تفعّل تحليل القرارات والرؤى الذكية." : "Add data to your workspace to activate decision analysis and intelligent insights."}</p>
      </div>
    </div>
  );

  const decisionData = useMemo(getDecisionCenterData, []);
  const totalAlerts = decisionData.blockers.length + decisionData.stalled.length + decisionData.unresolved.length;

  const weeklyReport = useMemo(generateWeeklyReport, []);
  const alignment = useMemo(() => computeLifeAlignment(onboardingData?.industry, onboardingData?.companySize), [onboardingData]);

  const heroMetrics = [
    { labelEn: "Blockers", labelAr: "عوائق", value: decisionData.blockers.length, color: "text-rose-500" },
    { labelEn: "Stalled", labelAr: "متوقف", value: decisionData.stalled.length, color: "text-amber-500" },
    { labelEn: "Weekly Score", labelAr: "درجة الأسبوع", value: weeklyReport.overallScore, color: "text-primary" },
    { labelEn: "Alignment", labelAr: "التوافق", value: `${alignment.overallScore}%`, color: "text-violet-600" },
  ];

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-full">

      {/* ── Hero ── */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Target size={14} strokeWidth={1.75} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "مركز القرارات" : "Decision Center"}</p>
            <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "Sprint 21" : "Sprint 21"}</span>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "طبقة الذكاء في القرار" : "Decision Intelligence Layer"}
          </h1>
          <p className="text-[13px] text-muted-foreground/70 mb-6">
            {ar ? "رؤى مشتقة من بياناتك — لا نصائح عامة" : "Insights derived from your data — no generic advice"}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {heroMetrics.map((m) => (
              <div key={m.labelEn} className="bg-background border border-border/40 rounded-xl px-4 py-3">
                <p className="text-[10px] text-muted-foreground mb-1.5">{ar ? m.labelAr : m.labelEn}</p>
                <p className={`text-[22px] font-medium tabular-nums leading-none ${m.color}`} style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 max-w-[1100px]">
          <div className="flex gap-0 overflow-x-auto scrollbar-none -mb-px">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3.5 py-3.5 text-[12px] whitespace-nowrap shrink-0
                    border-b-2 transition-all duration-150
                    ${isActive
                      ? `border-primary ${tab.color} font-medium`
                      : "border-transparent text-muted-foreground hover:text-foreground"
                    }
                  `}
                >
                  <Icon size={13} strokeWidth={isActive ? 2 : 1.75} />
                  {ar ? tab.labelAr : tab.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 md:px-10 py-8 max-w-[1100px]">
        <div className="flex items-center gap-2.5 mb-6">
          {(() => { const Icon = activeTabMeta.icon; return <Icon size={15} strokeWidth={1.75} className={activeTabMeta.color} />; })()}
          <h2 className="text-[18px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {ar ? activeTabMeta.labelAr : activeTabMeta.labelEn}
          </h2>
        </div>

        {activeTab === "decisions"     && <DecisionsTab ar={ar} navigate={navigate} />}
        {activeTab === "opportunities" && <OpportunitiesTab ar={ar} />}
        {activeTab === "patterns"      && <PatternsTab ar={ar} />}
        {activeTab === "goal-drift"    && <GoalDriftTab ar={ar} industry={onboardingData?.industry} />}
        {activeTab === "health"        && <HealthTab ar={ar} />}
        {activeTab === "focus"         && <FocusTab ar={ar} navigate={navigate} />}
        {activeTab === "relationships" && <RelationshipsTab ar={ar} />}
        {activeTab === "friction"      && <FrictionTab ar={ar} />}
        {activeTab === "weekly"        && <WeeklyTab ar={ar} />}
        {activeTab === "alignment"     && <AlignmentTab ar={ar} industry={onboardingData?.industry} companySize={onboardingData?.companySize} />}
        {activeTab === "workspace"     && <WorkspaceTab ar={ar} />}
      </div>
    </div>
  );
}
