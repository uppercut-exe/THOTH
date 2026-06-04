import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import { detectAllRisks, type RiskItem, type RiskType } from "../data/executiveIntelligence";
import {
  Shield, AlertTriangle, AlertOctagon, Clock, UserX,
  Link2, Landmark, Building2, CheckCircle2, ChevronRight,
} from "lucide-react";

const RISK_TYPE_META: Record<RiskType, { icon: React.ElementType; labelEn: string; labelAr: string; color: string; bg: string; border: string }> = {
  stalled:            { icon: Clock,         labelEn: "Stalled Project",      labelAr: "مشروع متوقف",    color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200/60" },
  missing_owner:      { icon: UserX,         labelEn: "Missing Owner",        labelAr: "بلا مالك",        color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200/60" },
  delayed:            { icon: AlertTriangle,  labelEn: "Delayed Milestone",    labelAr: "إنجاز متأخر",    color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200/60" },
  dependency_failure: { icon: Link2,          labelEn: "Dependency Failure",   labelAr: "فشل تبعية",       color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200/60" },
  overdue_invoice:    { icon: Landmark,       labelEn: "Overdue Invoice",      labelAr: "فاتورة متأخرة",  color: "text-rose-600",   bg: "bg-rose-50",   border: "border-rose-200/60" },
  at_risk_account:    { icon: Building2,      labelEn: "At-Risk Account",      labelAr: "حساب في خطر",    color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200/60" },
};

type FilterType = "all" | RiskType;

function SeverityRing({ score }: { score: number }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#ef4444" : score >= 60 ? "#f59e0b" : "#94a3b8";
  return (
    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
      <svg width={64} height={64} className="-rotate-90">
        <circle cx={32} cy={32} r={r} fill="none" stroke="hsl(var(--border) / 0.25)" strokeWidth={5} />
        <circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{score}</span>
      </div>
    </div>
  );
}

function RiskCard({ risk, ar, navigate }: { risk: RiskItem; ar: boolean; navigate: (p: string) => void }) {
  const meta = RISK_TYPE_META[risk.type];
  const Icon = meta.icon;

  function handleClick() {
    if (risk.module === "finance" && risk.entityId) navigate(`/finance/${risk.entityId}`);
    else if (risk.module === "sales" && risk.entityId) navigate(`/sales/${risk.entityId}`);
    else if (risk.module === "work" && risk.entityId) navigate(`/work/${risk.entityId}`);
    else if (risk.module === "organizations" && risk.entityId) navigate(`/organizations/${risk.entityId}`);
    else if (risk.module === "resources" && risk.entityId) navigate(`/resources/${risk.entityId}`);
  }

  return (
    <div className={`border ${meta.border} rounded-xl px-5 py-4 hover:shadow-sm transition-shadow cursor-pointer group bg-background`}
      onClick={handleClick}>
      <div className="flex items-start gap-4">
        <SeverityRing score={risk.severityScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{ar ? risk.titleAr : risk.titleEn}</p>
            <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${meta.bg} ${meta.color}`}>
              <Icon size={9} strokeWidth={2} />
              {ar ? meta.labelAr : meta.labelEn}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed mb-2">{ar ? risk.descAr : risk.descEn}</p>
          <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground/60 bg-muted/30 rounded-lg px-3 py-2">
            <Shield size={10} strokeWidth={1.75} className="shrink-0 mt-0.5 text-primary/60" />
            <span className="leading-relaxed">{ar ? risk.mitigationAr : risk.mitigationEn}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RiskRadar() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "رادار المخاطر" : "Risk Radar"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف بيانات عشان تفعّل رصد المخاطر التلقائي." : "Add data to activate automatic risk detection."}</p>
      </div>
    </div>
  );

  const risks = useMemo(detectAllRisks, []);
  const filtered = filterType === "all" ? risks : risks.filter((r) => r.type === filterType);

  const highRisks = risks.filter((r) => r.severityScore >= 75);
  const medRisks = risks.filter((r) => r.severityScore >= 50 && r.severityScore < 75);
  const overallRiskScore = risks.length > 0
    ? Math.round(risks.reduce((s, r) => s + r.severityScore, 0) / risks.length)
    : 0;

  const typeCounts = Object.fromEntries(
    (Object.keys(RISK_TYPE_META) as RiskType[]).map((t) => [t, risks.filter((r) => r.type === t).length])
  );

  const r = 52; const circ = 2 * Math.PI * r;
  const offset = circ - (overallRiskScore / 100) * circ;
  const ringColor = overallRiskScore >= 70 ? "#ef4444" : overallRiskScore >= 45 ? "#f59e0b" : "#10b981";

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertOctagon size={14} strokeWidth={1.75} className="text-rose-500" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "رادار المخاطر" : "Risk Radar"}</p>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "رصد المخاطر في الوقت الحقيقي" : "Real-Time Risk Detection"}
          </h1>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Overall risk ring */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative" style={{ width: 120, height: 120 }}>
                <svg width={120} height={120} className="-rotate-90">
                  <circle cx={60} cy={60} r={r} fill="none" stroke="hsl(var(--border) / 0.25)" strokeWidth={7} />
                  <circle cx={60} cy={60} r={r} fill="none" stroke={ringColor} strokeWidth={7}
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[26px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
                    {overallRiskScore}
                  </span>
                  <span className="text-[9px] text-muted-foreground/50 mt-0.5">/100</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2">{ar ? "مؤشر المخاطر" : "Risk Index"}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
              <div className="bg-background border border-rose-200/40 rounded-xl px-4 py-3">
                <p className="text-[9px] text-muted-foreground mb-1">{ar ? "مخاطر عالية" : "High Risks"}</p>
                <p className="text-[26px] font-medium text-rose-600 tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>{highRisks.length}</p>
              </div>
              <div className="bg-background border border-amber-200/40 rounded-xl px-4 py-3">
                <p className="text-[9px] text-muted-foreground mb-1">{ar ? "مخاطر متوسطة" : "Medium Risks"}</p>
                <p className="text-[26px] font-medium text-amber-600 tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>{medRisks.length}</p>
              </div>
              <div className="bg-background border border-border/40 rounded-xl px-4 py-3">
                <p className="text-[9px] text-muted-foreground mb-1">{ar ? "المتوقف" : "Stalled"}</p>
                <p className="text-[26px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>{typeCounts.stalled || 0}</p>
              </div>
              <div className="bg-background border border-border/40 rounded-xl px-4 py-3">
                <p className="text-[9px] text-muted-foreground mb-1">{ar ? "إجمالي" : "Total Risks"}</p>
                <p className="text-[26px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>{risks.length}</p>
              </div>
            </div>
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-2 mt-5 flex-wrap">
            <button onClick={() => setFilterType("all")}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${filterType === "all" ? "bg-foreground text-background border-foreground" : "bg-background border-border/40 text-muted-foreground hover:text-foreground"}`}>
              {ar ? `الكل (${risks.length})` : `All (${risks.length})`}
            </button>
            {(Object.keys(RISK_TYPE_META) as RiskType[]).map((t) => {
              const count = typeCounts[t] || 0;
              if (count === 0) return null;
              const meta = RISK_TYPE_META[t];
              return (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${filterType === t ? "bg-foreground text-background border-foreground" : `bg-background border-border/40 ${meta.color} hover:border-current`}`}>
                  {ar ? `${meta.labelAr} (${count})` : `${meta.labelEn} (${count})`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 md:px-10 py-7 max-w-[1100px]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <CheckCircle2 size={28} strokeWidth={1.5} className="text-emerald-400 mb-3" />
            <p className="text-[14px] text-muted-foreground">{ar ? "لا مخاطر مكتشفة" : "No risks detected"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((risk) => (
              <RiskCard key={risk.id} risk={risk} ar={ar} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
