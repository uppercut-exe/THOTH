import { useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import {
  getDailyReview, getWeeklyReview, getMonthlyReview, getQuarterlyReview,
  type RhythmReview, type RhythmSection, type RhythmItem,
} from "../data/executiveIntelligence";
import {
  Sun, Calendar, BarChart3, TrendingUp, CheckCircle2,
  AlertTriangle, Minus, ArrowRight, Activity, Briefcase,
  DollarSign, Heart, Package, Users, Target,
} from "lucide-react";

type RhythmType = "daily" | "weekly" | "monthly" | "quarterly";

const RHYTHM_TABS: Array<{ id: RhythmType; labelEn: string; labelAr: string; icon: React.ElementType; subtitleEn: string; subtitleAr: string }> = [
  { id: "daily",     labelEn: "Daily",     labelAr: "يومي",      icon: Sun,       subtitleEn: "Morning check-in",       subtitleAr: "تسجيل صباحي" },
  { id: "weekly",    labelEn: "Weekly",    labelAr: "أسبوعي",    icon: Calendar,  subtitleEn: "Business performance",   subtitleAr: "الأداء التجاري" },
  { id: "monthly",   labelEn: "Monthly",   labelAr: "شهري",      icon: BarChart3, subtitleEn: "Health & relationships", subtitleAr: "الصحة والعلاقات" },
  { id: "quarterly", labelEn: "Quarterly", labelAr: "ربع سنوي",  icon: TrendingUp,subtitleEn: "Strategic review",       subtitleAr: "المراجعة الاستراتيجية" },
];

const ICON_MAP: Record<string, React.ElementType> = {
  sun: Sun, zap: Activity, briefcase: Briefcase, dollar: DollarSign,
  package: Package, users: Users, heart: Heart, target: Target, landmark: BarChart3,
};

const STATUS_STYLE: Record<string, { icon: React.ElementType; iconCl: string; bg: string; border: string; dot: string }> = {
  green: { icon: CheckCircle2,   iconCl: "text-emerald-600", bg: "bg-emerald-50/40", border: "border-emerald-200/40", dot: "bg-emerald-500" },
  amber: { icon: AlertTriangle,  iconCl: "text-amber-600",   bg: "bg-amber-50/40",   border: "border-amber-200/40",   dot: "bg-amber-500" },
  red:   { icon: AlertTriangle,  iconCl: "text-rose-600",    bg: "bg-rose-50/40",    border: "border-rose-200/40",    dot: "bg-rose-500" },
};

// ─── Score ring ───────────────────────────────────────────

function ScoreRing({ score, size = 88 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 50 ? "hsl(var(--primary))" : score >= 35 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border) / 0.25)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-semibold text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
          {score}
        </span>
        <span className="text-[8px] text-muted-foreground/40 mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ─── Rhythm section ───────────────────────────────────────

function RhythmSectionView({ section, ar }: { section: RhythmSection; ar: boolean }) {
  const SectionIcon = ICON_MAP[section.icon] || Activity;
  const statusCounts = {
    green: section.items.filter((i) => i.status === "green").length,
    amber: section.items.filter((i) => i.status === "amber").length,
    red: section.items.filter((i) => i.status === "red").length,
  };

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-muted/20 border-b border-border/25">
        <div className="flex items-center gap-2.5">
          <SectionIcon size={14} strokeWidth={1.75} className="text-muted-foreground/60" />
          <h3 className="text-[13px] font-medium text-foreground">{ar ? section.titleAr : section.titleEn}</h3>
        </div>
        <div className="flex items-center gap-2">
          {statusCounts.green > 0 && <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center">{statusCounts.green}</span>}
          {statusCounts.amber > 0 && <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold flex items-center justify-center">{statusCounts.amber}</span>}
          {statusCounts.red > 0 && <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold flex items-center justify-center">{statusCounts.red}</span>}
        </div>
      </div>
      {/* Items */}
      <div className="divide-y divide-border/20">
        {section.items.map((item) => {
          const s = STATUS_STYLE[item.status];
          const ItemIcon = s.icon;
          return (
            <div key={item.id} className={`flex items-center gap-4 px-5 py-3.5 ${s.bg} border-l-2 ${item.status === "green" ? "border-emerald-400/50" : item.status === "amber" ? "border-amber-400/50" : "border-rose-400/50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.status === "green" ? "bg-emerald-100" : item.status === "amber" ? "bg-amber-100" : "bg-rose-100"}`}>
                <ItemIcon size={12} strokeWidth={1.75} className={s.iconCl} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground">{ar ? item.labelAr : item.labelEn}</p>
                {item.actionEn && item.status !== "green" && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-primary">
                    <ArrowRight size={9} strokeWidth={2} />
                    <span>{ar ? item.actionAr : item.actionEn}</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>
                  {ar ? item.valueAr : item.valueEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Review panel ─────────────────────────────────────────

function ReviewPanel({ review, ar }: { review: RhythmReview; ar: boolean }) {
  const allGreen = review.sections.every((s) => s.items.every((i) => i.status === "green"));
  const hasRed = review.sections.some((s) => s.items.some((i) => i.status === "red"));

  const overallStatus = allGreen ? "green" : hasRed ? "red" : "amber";
  const overallLabelEn = allGreen ? "All Clear" : hasRed ? "Needs Attention" : "Monitor";
  const overallLabelAr = allGreen ? "كل شيء طيب" : hasRed ? "يحتاج اهتماماً" : "تتبع";
  const overallColors = {
    green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border border-amber-200",
    red: "bg-rose-50 text-rose-700 border border-rose-200",
  };

  return (
    <div className="space-y-5">
      {/* Review summary bar */}
      <div className="flex items-center gap-5 p-5 border border-border/40 rounded-xl bg-background">
        <ScoreRing score={review.overallScore} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? review.titleAr : review.titleEn}</p>
          <p className="text-[14px] font-medium text-foreground leading-snug mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
            {ar ? review.subtitleAr : review.subtitleEn}
          </p>
          <span className={`inline-flex items-center text-[10px] font-medium px-2.5 py-1 rounded-full ${overallColors[overallStatus]}`}>
            {ar ? overallLabelAr : overallLabelEn}
          </span>
        </div>
      </div>

      {/* Sections */}
      {review.sections.map((section, i) => (
        <RhythmSectionView key={i} section={section} ar={ar} />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function OperatingRhythms() {
  const { lang } = useLanguage();
  const [activeRhythm, setActiveRhythm] = useState<RhythmType>("daily");
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "إيقاعات العمل" : "Operating Rhythms"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف بيانات عشان تفعّل المراجعات اليومية والأسبوعية." : "Add data to activate daily and weekly operating reviews."}</p>
      </div>
    </div>
  );

  const daily = useMemo(getDailyReview, []);
  const weekly = useMemo(getWeeklyReview, []);
  const monthly = useMemo(getMonthlyReview, []);
  const quarterly = useMemo(getQuarterlyReview, []);

  const reviews: Record<RhythmType, RhythmReview> = { daily, weekly, monthly, quarterly };
  const current = reviews[activeRhythm];

  const getStatusColor = (review: RhythmReview) => {
    const hasRed = review.sections.some((s) => s.items.some((i) => i.status === "red"));
    const allGreen = review.sections.every((s) => s.items.every((i) => i.status === "green"));
    return hasRed ? "bg-rose-500" : allGreen ? "bg-emerald-500" : "bg-amber-500";
  };

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Activity size={14} strokeWidth={1.75} className="text-violet-500" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "إيقاعات التشغيل" : "Operating Rhythms"}</p>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "مراجعات التشغيل الهيكلية" : "Structured Operating Reviews"}
          </h1>
          <p className="text-[12px] text-muted-foreground/60 mb-5">
            {ar ? "يومي · أسبوعي · شهري · ربع سنوي" : "Daily · Weekly · Monthly · Quarterly"}
          </p>

          {/* Rhythm selector cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {RHYTHM_TABS.map((tab) => {
              const Icon = tab.icon;
              const review = reviews[tab.id];
              const isActive = activeRhythm === tab.id;
              const dot = getStatusColor(review);
              return (
                <button key={tab.id} onClick={() => setActiveRhythm(tab.id)}
                  className={`text-left px-4 py-3.5 rounded-xl border transition-all ${isActive ? "border-primary bg-primary/8" : "border-border/40 bg-background hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={15} strokeWidth={1.75} className={isActive ? "text-primary" : "text-muted-foreground/60"} />
                    <div className={`w-2 h-2 rounded-full ${dot}`} />
                  </div>
                  <p className={`text-[13px] font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                    {ar ? tab.labelAr : tab.labelEn}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{ar ? tab.subtitleAr : tab.subtitleEn}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 md:px-10 py-7 max-w-[1100px]">
        <ReviewPanel review={current} ar={ar} />
      </div>
    </div>
  );
}
