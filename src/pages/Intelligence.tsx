import { useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import { Sparkles as SparklesEmpty } from "lucide-react";
import { formatCurrency, formatCurrencyAr } from "../data/sales";
import {
  computeBusinessHealth, computeDashboardMetrics,
  getSalesInsights, getWorkInsights, getFinanceInsights,
  getResourceInsights, getOrgInsights, getPeopleInsights,
  getRecommendedActions, HEALTH_META,
  type InsightCard, type RecommendedAction,
} from "../data/intelligence";
import {
  Sparkles, TrendingUp, Target, Briefcase, Gauge,
  DollarSign, Heart, ShoppingBag, Building2, Users, Package,
  AlertTriangle, CheckCircle2, ArrowRight, Star,
  Zap, Shield, Eye, ChevronRight, Landmark,
} from "lucide-react";

// ─── Severity styling ─────────────────────────────────────

const SEV_STYLE: Record<string, { border: string; icon: string; bg: string }> = {
  positive: { border: "border-emerald-200/60", icon: "text-emerald-600", bg: "bg-emerald-50" },
  neutral:  { border: "border-border/40",      icon: "text-primary",     bg: "bg-primary/8" },
  warning:  { border: "border-amber-200/60",   icon: "text-amber-600",   bg: "bg-amber-50" },
  critical: { border: "border-rose-200/60",     icon: "text-rose-600",    bg: "bg-rose-50" },
};

const MODULE_ICONS: Record<string, React.ElementType> = {
  sales: ShoppingBag, work: Briefcase, finance: Landmark, resources: Package,
  organizations: Building2, people: Users, system: Sparkles,
};

const PRIORITY_STYLE: Record<string, { dot: string; label: string; labelAr: string }> = {
  high:   { dot: "bg-rose-500",    label: "High",   labelAr: "عالي" },
  medium: { dot: "bg-amber-500",   label: "Medium", labelAr: "متوسط" },
  low:    { dot: "bg-stone-400",   label: "Low",    labelAr: "منخفض" },
};

// ─── Health ring ──────────────────────────────────────────

function HealthRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "hsl(var(--primary))" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border) / 0.3)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground mt-1">/ 100</span>
      </div>
    </div>
  );
}

// ─── Insight card component ───────────────────────────────

function InsightCardView({ card, lang, onNavigate }: { card: InsightCard; lang: "en" | "ar"; onNavigate?: (path: string) => void }) {
  const ar = lang === "ar";
  const sev = SEV_STYLE[card.severity] || SEV_STYLE.neutral;
  const ModIcon = MODULE_ICONS[card.module] || Sparkles;

  return (
    <div className={`border ${sev.border} rounded-xl bg-background p-5 hover:shadow-sm transition-shadow`}>
      <div className="flex items-start gap-3.5">
        <div className={`w-9 h-9 rounded-xl ${sev.bg} flex items-center justify-center shrink-0`}>
          <ModIcon size={16} strokeWidth={1.75} className={sev.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? card.titleAr : card.titleEn}</p>
          <p className="text-[13px] font-medium text-foreground leading-snug mb-1.5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
            {ar ? card.valueAr : card.valueEn}
          </p>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{ar ? card.descAr : card.descEn}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────

function SectionHeader({ icon: Icon, titleEn, titleAr, ar, color }: {
  icon: React.ElementType; titleEn: string; titleAr: string; ar: boolean; color: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4 mt-10 first:mt-0">
      <Icon size={15} strokeWidth={1.75} className={color} />
      <h2 className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
        {ar ? titleAr : titleEn}
      </h2>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

function ProductionEmptyState() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-primary/8 mx-auto flex items-center justify-center mb-4">
          <SparklesEmpty size={22} className="text-primary/50" />
        </div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? "محرك الذكاء" : "Intelligence Engine"}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {ar
            ? "ضيف بيانات في مساحة عملك عشان تفعّل الرؤى الذكية. ابدأ بصفقات وفواتير ومهام."
            : "Add data to your workspace to activate intelligent insights. Start by creating deals, invoices, and work items."}
        </p>
      </div>
    </div>
  );
}

export default function Intelligence() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  if (!isDemoMode) return <ProductionEmptyState />;

  const fmt = ar ? formatCurrencyAr : formatCurrency;

  const health = useMemo(computeBusinessHealth, []);
  const metrics = useMemo(computeDashboardMetrics, []);
  const hm = HEALTH_META[health.level];

  const salesInsights = useMemo(getSalesInsights, []);
  const workInsights = useMemo(getWorkInsights, []);
  const financeInsights = useMemo(getFinanceInsights, []);
  const resourceInsights = useMemo(getResourceInsights, []);
  const orgInsights = useMemo(getOrgInsights, []);
  const peopleInsights = useMemo(getPeopleInsights, []);
  const actions = useMemo(getRecommendedActions, []);

  return (
    <div className="min-h-full">

      {/* ── Hero ── */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Sparkles size={14} strokeWidth={1.75} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "الذكاء" : "Intelligence"}</p>
            <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "ذكاء اصطناعي" : "AI-powered"}</span>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-6" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "لوحة الذكاء" : "Intelligence Dashboard"}
          </h1>

          {/* Health score + metrics */}
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Health ring */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <HealthRing score={health.score} />
              <div className={`px-3 py-1 rounded-full text-[11px] font-semibold ${hm.color} ${hm.bg} border border-current/20`}>
                {ar ? hm.ar : hm.en}
              </div>
              <p className="text-[10px] text-muted-foreground">{ar ? "صحة الأعمال" : "Business Health"}</p>
            </div>

            {/* Sub-scores */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: ar ? "المبيعات" : "Sales", score: health.salesScore, icon: ShoppingBag, color: "text-amber-500" },
                { label: ar ? "العمل" : "Work", score: health.workScore, icon: Briefcase, color: "text-blue-500" },
                { label: ar ? "المالية" : "Finance", score: health.financeScore, icon: Landmark, color: "text-emerald-600" },
                { label: ar ? "الموارد" : "Resources", score: health.resourceScore, icon: Package, color: "text-violet-500" },
              ].map((s, i) => (
                <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <s.icon size={13} strokeWidth={1.75} className={s.color} />
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-[22px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{s.score}</p>
                    <span className="text-[10px] text-muted-foreground/50 mb-0.5">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            {[
              { icon: TrendingUp, value: fmt(metrics.revenueForecast, "SAR"), label: ar ? "توقع الإيرادات" : "Revenue Forecast", color: "text-emerald-600" },
              { icon: Target,     value: String(metrics.openOpportunities), label: ar ? "فرص مفتوحة" : "Open Opps",          color: "text-amber-500" },
              { icon: AlertTriangle, value: `${metrics.workRiskScore}%`, label: ar ? "مخاطر العمل" : "Work Risk",         color: "text-rose-500" },
              { icon: Gauge,      value: `${metrics.resourceUtilization}%`, label: ar ? "استخدام الموارد" : "Res. Utilization", color: "text-violet-500" },
              { icon: DollarSign, value: `${metrics.cashHealth}%`, label: ar ? "صحة النقد" : "Cash Health",        color: "text-cyan-600" },
              { icon: Heart,      value: String(metrics.businessHealth), label: ar ? "صحة الأعمال" : "Health Score",       color: "text-primary" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <m.icon size={12} strokeWidth={1.75} className={m.color} />
                  <p className="text-[9px] text-muted-foreground">{m.label}</p>
                </div>
                <p className="text-[16px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 md:px-10 py-8 max-w-[1100px]">

        {/* Recommended Actions */}
        <SectionHeader icon={Zap} titleEn="Recommended Actions" titleAr="إجراءات موصى بها" ar={ar} color="text-violet-600" />
        <div className="border border-border/40 rounded-xl bg-background overflow-hidden divide-y divide-border/25 mb-4">
          {actions.slice(0, 8).map((action) => {
            const ps = PRIORITY_STYLE[action.priority];
            const ModIcon = MODULE_ICONS[action.module] || Sparkles;
            return (
              <div key={action.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/15 transition-colors cursor-pointer group"
                onClick={() => {
                  if (action.module === "finance" && action.entityId) navigate(`/finance/${action.entityId}`);
                  else if (action.module === "sales" && action.entityId) navigate(`/sales/${action.entityId}`);
                  else if (action.module === "work" && action.entityId) navigate(`/work/${action.entityId}`);
                  else if (action.module === "resources" && action.entityId) navigate(`/resources/${action.entityId}`);
                }}>
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <ModIcon size={14} strokeWidth={1.75} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? action.titleAr : action.titleEn}</h4>
                  <p className="text-[11px] text-muted-foreground truncate">{ar ? action.descAr : action.descEn}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                  <span className="text-[10px] text-muted-foreground">{ar ? ps.labelAr : ps.label}</span>
                </div>
                <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Sales Intelligence */}
        <SectionHeader icon={ShoppingBag} titleEn="Sales Intelligence" titleAr="ذكاء المبيعات" ar={ar} color="text-amber-500" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {salesInsights.map((c) => <InsightCardView key={c.id} card={c} lang={lang} onNavigate={navigate} />)}
        </div>

        {/* Work Intelligence */}
        <SectionHeader icon={Briefcase} titleEn="Work Intelligence" titleAr="ذكاء العمل" ar={ar} color="text-blue-500" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {workInsights.map((c) => <InsightCardView key={c.id} card={c} lang={lang} />)}
        </div>

        {/* Finance Intelligence */}
        <SectionHeader icon={Landmark} titleEn="Finance Intelligence" titleAr="ذكاء المالية" ar={ar} color="text-emerald-600" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {financeInsights.map((c) => <InsightCardView key={c.id} card={c} lang={lang} />)}
        </div>

        {/* Resource Intelligence */}
        <SectionHeader icon={Package} titleEn="Resource Intelligence" titleAr="ذكاء الموارد" ar={ar} color="text-violet-500" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {resourceInsights.map((c) => <InsightCardView key={c.id} card={c} lang={lang} />)}
        </div>

        {/* Organization Intelligence */}
        <SectionHeader icon={Building2} titleEn="Organization Intelligence" titleAr="ذكاء المنظمات" ar={ar} color="text-cyan-600" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {orgInsights.map((c) => <InsightCardView key={c.id} card={c} lang={lang} />)}
        </div>

        {/* People Intelligence */}
        <SectionHeader icon={Users} titleEn="People Intelligence" titleAr="ذكاء الأشخاص" ar={ar} color="text-rose-500" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {peopleInsights.map((c) => <InsightCardView key={c.id} card={c} lang={lang} />)}
        </div>
      </div>
    </div>
  );
}
