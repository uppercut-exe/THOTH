import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import {
  generateExecutiveBriefing,
  generateIntelligenceFeed,
  generateWorkQueue,
  detectAllRisks,
  type FeedItem,
  type FeedItemType,
} from "../data/executiveIntelligence";
import { computeBusinessHealth } from "../data/intelligence";
import { loadDeals, formatCurrency } from "../data/sales";
import { loadWorkItems } from "../data/work";
import { loadInvoices } from "../data/finance";
import Today from "./Today";
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Lightbulb, Zap, Shield, Flame, ChevronRight, Activity,
  Briefcase, ShoppingBag, Landmark, Package, Users, Building2,
  Star, Radio, Target, ArrowRight,
} from "lucide-react";

// ─── Feed item styling ────────────────────────────────────

const FEED_TYPE_STYLE: Record<FeedItemType, { bg: string; border: string; iconCl: string; icon: React.ElementType; dot: string }> = {
  alert:       { bg: "bg-rose-50",    border: "border-rose-200/60",   iconCl: "text-rose-600",    icon: AlertTriangle, dot: "bg-rose-500" },
  win:         { bg: "bg-emerald-50", border: "border-emerald-200/60",iconCl: "text-emerald-600", icon: CheckCircle2,  dot: "bg-emerald-500" },
  opportunity: { bg: "bg-amber-50",   border: "border-amber-200/60",  iconCl: "text-amber-600",   icon: Lightbulb,     dot: "bg-amber-500" },
  insight:     { bg: "bg-primary/8",  border: "border-primary/20",    iconCl: "text-primary",     icon: Activity,      dot: "bg-primary" },
  risk:        { bg: "bg-orange-50",  border: "border-orange-200/60", iconCl: "text-orange-600",  icon: Shield,        dot: "bg-orange-500" },
  action:      { bg: "bg-violet-50",  border: "border-violet-200/60", iconCl: "text-violet-600",  icon: Zap,           dot: "bg-violet-500" },
};

const MODULE_ICON: Record<string, React.ElementType> = {
  finance: Landmark, sales: ShoppingBag, work: Briefcase,
  resources: Package, organizations: Building2, people: Users,
};

// ─── Shared UI ────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "stable" | "down" }) {
  if (trend === "up") return <TrendingUp size={12} strokeWidth={2} className="text-emerald-500" />;
  if (trend === "down") return <TrendingDown size={12} strokeWidth={2} className="text-rose-500" />;
  return <Minus size={12} strokeWidth={2} className="text-muted-foreground/50" />;
}

// ─── Health ring ──────────────────────────────────────────

function HealthRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 55 ? "hsl(var(--primary))" : score >= 35 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border) / 0.25)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-semibold text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
          {score}
        </span>
        <span className="text-[9px] text-muted-foreground/50 mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function ExecutiveDashboard() {
  const { lang } = useLanguage();
  const { onboardingData } = useOnboarding();
  const { workspace } = useAuth();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  if (!isDemoMode) return <Today />;

  const briefing = useMemo(generateExecutiveBriefing, []);
  const feed = useMemo(generateIntelligenceFeed, []);
  const queue = useMemo(generateWorkQueue, []);
  const risks = useMemo(detectAllRisks, []);
  const health = useMemo(computeBusinessHealth, []);

  const deals = useMemo(loadDeals, []);
  const work = useMemo(loadWorkItems, []);
  const invoices = useMemo(loadInvoices, []);

  const companyName = onboardingData?.companyName || "THOTH";
  const industry = onboardingData?.industry || "";

  const fmt = (v: number) => formatCurrency(v, "SAR");
  const pipeline = deals.filter((d) => !["won", "lost"].includes(d.stage)).reduce((s, d) => s + d.value * d.probability / 100, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const inFlightCount = work.filter((w) => w.status === "in_progress").length;
  const doneRate = work.length > 0 ? Math.round(work.filter((w) => w.status === "done").length / work.length * 100) : 0;

  const topMetrics = [
    { labelEn: "Pipeline", labelAr: "خط الأنابيب", value: fmt(pipeline), color: "text-amber-500", trend: pipeline > 500000 ? "up" as const : "stable" as const },
    { labelEn: "In Progress", labelAr: "قيد التنفيذ", value: `${inFlightCount}`, color: "text-blue-500", trend: "stable" as const },
    { labelEn: "Completion", labelAr: "الإنجاز", value: `${doneRate}%`, color: "text-emerald-600", trend: doneRate >= 50 ? "up" as const : "down" as const },
    { labelEn: "Overdue Inv.", labelAr: "فواتير متأخرة", value: `${overdueCount}`, color: overdueCount > 0 ? "text-rose-500" : "text-emerald-600", trend: overdueCount > 0 ? "down" as const : "up" as const },
    { labelEn: "Active Risks", labelAr: "مخاطر نشطة", value: `${risks.filter((r) => r.severityScore >= 70).length}`, color: "text-rose-500", trend: "down" as const },
    { labelEn: "Health Score", labelAr: "مؤشر الصحة", value: `${health.score}`, color: "text-primary", trend: health.score >= 65 ? "up" as const : "stable" as const },
  ];

  function handleFeedClick(item: FeedItem) {
    if (item.module === "finance" && item.entityId) navigate(`/finance/${item.entityId}`);
    else if (item.module === "sales" && item.entityId) navigate(`/sales/${item.entityId}`);
    else if (item.module === "work" && item.entityId) navigate(`/work/${item.entityId}`);
    else if (item.module === "organizations" && item.entityId) navigate(`/organizations/${item.entityId}`);
  }

  function handleQueueClick(q: typeof queue[0]) {
    if (q.module === "finance" && q.entityId) navigate(`/finance/${q.entityId}`);
    else if (q.module === "sales" && q.entityId) navigate(`/sales/${q.entityId}`);
    else if (q.module === "work" && q.entityId) navigate(`/work/${q.entityId}`);
    else if (q.module === "organizations" && q.entityId) navigate(`/organizations/${q.entityId}`);
    else if (q.module === "resources" && q.entityId) navigate(`/resources/${q.entityId}`);
  }

  return (
    <div className="min-h-full">

      {/* ── Hero ── */}
      <div className="border-b border-border/40 px-8 md:px-10 py-7"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.35) 0%, hsl(var(--background)) 55%)" }}>
        <div className="max-w-[1100px]">
          {/* Title row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Radio size={12} strokeWidth={2} className="text-emerald-500 animate-pulse" />
                <p className="text-[10px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "لوحة التحكم التنفيذية" : "Executive Dashboard"}</p>
              </div>
              <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
                {companyName}
              </h1>
              {industry && <p className="text-[12px] text-muted-foreground/60 mt-0.5">{industry}</p>}
            </div>
            <div className="shrink-0 hidden md:block">
              <HealthRing score={health.score} />
              <p className="text-[10px] text-muted-foreground/50 text-center mt-1">{ar ? "الصحة" : "Health"}</p>
            </div>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
            {topMetrics.map((m) => (
              <div key={m.labelEn} className="bg-background/70 border border-border/40 rounded-xl px-3.5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wide">{ar ? m.labelAr : m.labelEn}</p>
                  <TrendIcon trend={m.trend} />
                </div>
                <p className={`text-[18px] font-semibold tabular-nums leading-none ${m.color}`} style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 md:px-10 py-7 max-w-[1100px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

          {/* ── Left: Feed + Priorities ── */}
          <div className="lg:col-span-2 space-y-7">

            {/* Executive Briefing */}
            <div className="border border-primary/20 rounded-xl bg-primary/5 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Star size={13} strokeWidth={1.75} className="text-primary" />
                <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase">{ar ? "الإحاطة التنفيذية" : "Executive Briefing"}</p>
                <span className="text-[10px] text-muted-foreground/40">{briefing.dateEn}</span>
              </div>
              <p className="text-[12.5px] text-foreground/80 leading-relaxed">
                {ar ? briefing.summaryAr : briefing.summaryEn}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${briefing.overallScore >= 70 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : briefing.overallScore >= 50 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                  {ar ? briefing.overallLabelAr : briefing.overallLabelEn}
                </span>
                <span className="text-[10px] text-muted-foreground/50">{briefing.overallScore}/100</span>
              </div>
            </div>

            {/* Intelligence Feed */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Radio size={13} strokeWidth={1.75} className="text-primary" />
                <h2 className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
                  {ar ? "بث الذكاء" : "Intelligence Feed"}
                </h2>
              </div>
              <div className="space-y-2">
                {feed.slice(0, 8).map((item) => {
                  const s = FEED_TYPE_STYLE[item.type];
                  const Icon = s.icon;
                  return (
                    <div key={item.id}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${s.border} hover:shadow-sm transition-shadow cursor-pointer group`}
                      onClick={() => handleFeedClick(item)}>
                      <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={13} strokeWidth={1.75} className={s.iconCl} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                          {ar ? item.titleAr : item.titleEn}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">{ar ? item.descAr : item.descEn}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground/40">{ar ? item.timeAgoAr : item.timeAgoEn}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Priorities */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={13} strokeWidth={1.75} className="text-orange-500" />
                  <h2 className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
                    {ar ? "أولويات اليوم" : "Today's Priorities"}
                  </h2>
                </div>
                <button className="text-[11px] text-primary hover:opacity-70 transition-opacity flex items-center gap-1" onClick={() => navigate("/queue")}>
                  {ar ? "الكل" : "View all"} <ArrowRight size={11} strokeWidth={2} />
                </button>
              </div>
              <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/25">
                {queue.slice(0, 5).map((item, i) => {
                  const ModIcon = MODULE_ICON[item.module] || Briefcase;
                  const catColor: Record<string, string> = {
                    revenue: "text-amber-600 bg-amber-50",
                    operations: "text-blue-600 bg-blue-50",
                    relationships: "text-violet-600 bg-violet-50",
                    risk: "text-rose-600 bg-rose-50",
                  };
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/10 cursor-pointer group transition-colors"
                      onClick={() => handleQueueClick(item)}>
                      <span className="text-[10px] text-muted-foreground/30 tabular-nums w-4 shrink-0">{i + 1}</span>
                      <div className={`w-7 h-7 rounded-lg ${catColor[item.category]?.split(" ")[1] || "bg-muted"} flex items-center justify-center shrink-0`}>
                        <ModIcon size={13} strokeWidth={1.75} className={catColor[item.category]?.split(" ")[0] || "text-muted-foreground"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-foreground group-hover:text-primary transition-colors truncate">{ar ? item.titleAr : item.titleEn}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{ar ? item.actionAr : item.actionEn}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-14">
                          <ScoreBar score={item.priorityScore} color={item.priorityScore >= 80 ? "bg-rose-500" : item.priorityScore >= 60 ? "bg-amber-500" : "bg-blue-500"} />
                        </div>
                        <span className="text-[11px] font-semibold tabular-nums text-foreground w-5 text-right">{item.priorityScore}</span>
                        <ChevronRight size={12} strokeWidth={1.75} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: Risks + Briefing Details ── */}
          <div className="space-y-5">

            {/* Sub-health scores */}
            <div className="border border-border/40 rounded-xl p-4 bg-background">
              <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "مؤشرات الصحة" : "Health Indicators"}</p>
              {[
                { labelEn: "Sales",   labelAr: "المبيعات", score: health.salesScore,    color: "bg-amber-500" },
                { labelEn: "Work",    labelAr: "العمل",    score: health.workScore,     color: "bg-blue-500" },
                { labelEn: "Finance", labelAr: "المالية",  score: health.financeScore,  color: "bg-emerald-500" },
                { labelEn: "Assets",  labelAr: "الأصول",   score: health.resourceScore, color: "bg-violet-500" },
              ].map((s) => (
                <div key={s.labelEn} className="mb-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-muted-foreground">{ar ? s.labelAr : s.labelEn}</p>
                    <p className="text-[11px] font-medium tabular-nums text-foreground">{s.score}</p>
                  </div>
                  <ScoreBar score={s.score} color={s.score >= 70 ? "bg-emerald-500" : s.score >= 50 ? s.color : "bg-rose-500"} />
                </div>
              ))}
            </div>

            {/* Top risks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield size={13} strokeWidth={1.75} className="text-rose-500" />
                  <h3 className="text-[13px] font-medium text-foreground">{ar ? "أبرز المخاطر" : "Top Risks"}</h3>
                </div>
                <button className="text-[11px] text-primary hover:opacity-70 transition-opacity flex items-center gap-1" onClick={() => navigate("/risk")}>
                  {ar ? "الكل" : "All"} <ArrowRight size={11} strokeWidth={2} />
                </button>
              </div>
              <div className="space-y-2">
                {risks.slice(0, 4).map((r) => (
                  <div key={r.id} className="border border-rose-200/40 bg-rose-50/20 rounded-xl px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[12px] font-medium text-foreground leading-snug">{ar ? r.titleAr : r.titleEn}</p>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${r.severityScore >= 80 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.severityScore}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{ar ? r.mitigationAr : r.mitigationEn}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={13} strokeWidth={1.75} className="text-amber-500" />
                <h3 className="text-[13px] font-medium text-foreground">{ar ? "الفرص" : "Opportunities"}</h3>
              </div>
              <div className="space-y-2">
                {briefing.opportunities.slice(0, 3).map((opp, i) => (
                  <div key={i} className="border border-amber-200/40 bg-amber-50/20 rounded-xl px-4 py-3">
                    <p className="text-[11px] text-foreground/80 leading-relaxed">{ar ? opp.ar : opp.en}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick nav */}
            <div className="border border-border/40 rounded-xl p-4 bg-background">
              <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "الأدوات التنفيذية" : "Executive Tools"}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { labelEn: "Work Queue", labelAr: "قائمة المهام", path: "/queue", icon: Target, color: "text-orange-500 bg-orange-50" },
                  { labelEn: "Risk Radar", labelAr: "رادار المخاطر", path: "/risk", icon: Shield, color: "text-rose-500 bg-rose-50" },
                  { labelEn: "Forecast", labelAr: "التوقعات", path: "/forecast", icon: TrendingUp, color: "text-blue-500 bg-blue-50" },
                  { labelEn: "Rhythms", labelAr: "الإيقاعات", path: "/rhythms", icon: Activity, color: "text-violet-500 bg-violet-50" },
                  { labelEn: "Executive", labelAr: "التنفيذي", path: "/exec", icon: Star, color: "text-amber-500 bg-amber-50" },
                  { labelEn: "Decisions", labelAr: "القرارات", path: "/decisions", icon: Zap, color: "text-primary bg-primary/8" },
                ].map((t) => {
                  const Icon = t.icon;
                  const [iconCl, bgCl] = t.color.split(" ");
                  return (
                    <button key={t.path}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors text-left group"
                      onClick={() => navigate(t.path)}>
                      <div className={`w-6 h-6 rounded-md ${bgCl} flex items-center justify-center shrink-0`}>
                        <Icon size={12} strokeWidth={1.75} className={iconCl} />
                      </div>
                      <span className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {ar ? t.labelAr : t.labelEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
