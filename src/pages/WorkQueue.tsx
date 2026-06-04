import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import { generateWorkQueue, prioritizeItems, type QueueItem } from "../data/executiveIntelligence";
import {
  Target, Flame, TrendingUp, Zap, ChevronRight, Filter,
  Briefcase, ShoppingBag, Landmark, Package, Users, Building2,
  CheckCircle2, ArrowUpDown,
} from "lucide-react";

type SortKey = "priority" | "impact" | "urgency" | "effort";
type FilterCat = "all" | "revenue" | "operations" | "relationships" | "risk";

const CAT_STYLE: Record<string, { labelEn: string; labelAr: string; pill: string; dot: string }> = {
  revenue:       { labelEn: "Revenue",       labelAr: "إيرادات",  pill: "bg-amber-50 text-amber-700 border border-amber-200",   dot: "bg-amber-500" },
  operations:    { labelEn: "Operations",    labelAr: "عمليات",   pill: "bg-blue-50 text-blue-700 border border-blue-200",       dot: "bg-blue-500" },
  relationships: { labelEn: "Relationships", labelAr: "علاقات",   pill: "bg-violet-50 text-violet-700 border border-violet-200", dot: "bg-violet-500" },
  risk:          { labelEn: "Risk",          labelAr: "مخاطر",    pill: "bg-rose-50 text-rose-700 border border-rose-200",       dot: "bg-rose-500" },
};

const MODULE_ICON: Record<string, React.ElementType> = {
  finance: Landmark, sales: ShoppingBag, work: Briefcase,
  resources: Package, organizations: Building2, people: Users,
};

function ScorePill({ score, color }: { score: number; color: string }) {
  return (
    <div className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-[11px] font-semibold tabular-nums ${color}`}>
      {score}
    </div>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
    </div>
  );
}

// ─── Queue row ────────────────────────────────────────────

function QueueRow({ item, index, ar, navigate }: { item: QueueItem; index: number; ar: boolean; navigate: (p: string) => void }) {
  const cat = CAT_STYLE[item.category];
  const ModIcon = MODULE_ICON[item.module] || Briefcase;

  function handleClick() {
    if (item.module === "finance" && item.entityId) navigate(`/finance/${item.entityId}`);
    else if (item.module === "sales" && item.entityId) navigate(`/sales/${item.entityId}`);
    else if (item.module === "work" && item.entityId) navigate(`/work/${item.entityId}`);
    else if (item.module === "resources" && item.entityId) navigate(`/resources/${item.entityId}`);
    else if (item.module === "organizations" && item.entityId) navigate(`/organizations/${item.entityId}`);
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 cursor-pointer group transition-colors border-b border-border/25 last:border-0"
      onClick={handleClick}>
      <span className="text-[11px] text-muted-foreground/30 tabular-nums w-5 shrink-0 text-right">{index + 1}</span>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl ${cat.pill.split(" ")[0]} flex items-center justify-center shrink-0`}>
        <ModIcon size={15} strokeWidth={1.75} className={cat.pill.split(" ")[1]} />
      </div>

      {/* Title + context */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors truncate">
            {ar ? item.titleAr : item.titleEn}
          </p>
          <span className={`inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${cat.pill}`}>
            {ar ? cat.labelAr : cat.labelEn}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground/60 truncate">{ar ? item.actionAr : item.actionEn}</p>
      </div>

      {/* Score bars */}
      <div className="hidden md:flex items-center gap-4 shrink-0 w-52">
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <p className="text-[9px] text-muted-foreground/40">{ar ? "أثر" : "Impact"}</p>
            <p className="text-[9px] tabular-nums text-muted-foreground/60">{item.impactScore}</p>
          </div>
          <ScoreBar score={item.impactScore} color="bg-emerald-500" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between mb-0.5">
            <p className="text-[9px] text-muted-foreground/40">{ar ? "عجلة" : "Urgency"}</p>
            <p className="text-[9px] tabular-nums text-muted-foreground/60">{item.urgencyScore}</p>
          </div>
          <ScoreBar score={item.urgencyScore} color="bg-amber-500" />
        </div>
      </div>

      {/* Priority score */}
      <div className="flex items-center gap-2 shrink-0">
        <ScorePill score={item.priorityScore}
          color={item.priorityScore >= 75 ? "bg-rose-50 text-rose-700" : item.priorityScore >= 55 ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"} />
        <span className="hidden sm:block text-[10px] text-muted-foreground/50 w-14">{ar ? item.effortLabelAr : item.effortLabelEn}</span>
        <ChevronRight size={13} strokeWidth={1.75} className="text-muted-foreground/20 group-hover:text-primary/50 transition-colors" />
      </div>
    </div>
  );
}

// ─── Scoring legend ───────────────────────────────────────

function ScoringLegend({ ar }: { ar: boolean }) {
  const items = [
    { labelEn: "Impact Score (35%)", labelAr: "مؤشر الأثر (٣٥%)", descEn: "Financial value at stake, or operational consequence if not acted on.", descAr: "القيمة المالية المعرضة للخطر، أو النتيجة التشغيلية إذا لم يُتصرف.", color: "bg-emerald-500" },
    { labelEn: "Urgency Score (45%)", labelAr: "مؤشر العجلة (٤٥%)", descEn: "Time pressure — based on due dates, overdue status, and priority level.", descAr: "ضغط الوقت — بناءً على تواريخ الاستحقاق والحالة المتأخرة ومستوى الأولوية.", color: "bg-amber-500" },
    { labelEn: "Effort Discount (20%)", labelAr: "خصم الجهد (٢٠%)", descEn: "Lower effort items score higher. Quick wins are preferred over multi-day projects.", descAr: "العناصر منخفضة الجهد تسجل درجات أعلى. الفوز السريع يُفضّل على المشاريع متعددة الأيام.", color: "bg-blue-500" },
    { labelEn: "Priority Score", labelAr: "مؤشر الأولوية", descEn: "Composite score = (Impact × 0.35) + (Urgency × 0.45) + ((100 − Effort) × 0.20)", descAr: "الدرجة المركّبة = (الأثر × ٠.٣٥) + (العجلة × ٠.٤٥) + ((١٠٠ − الجهد) × ٠.٢٠)", color: "bg-rose-500" },
  ];

  const cats = [
    { key: "revenue", descEn: "Revenue-generating or cash-collection items.", descAr: "عناصر توليد الإيرادات أو تحصيل النقد." },
    { key: "operations", descEn: "Delivery, execution, and operational items.", descAr: "التسليم والتنفيذ والعناصر التشغيلية." },
    { key: "relationships", descEn: "Client, partner, and contact engagement.", descAr: "مشاركة العملاء والشركاء وجهات الاتصال." },
    { key: "risk", descEn: "Risk mitigation, maintenance, and blockers.", descAr: "التخفيف من المخاطر والصيانة والعوائق." },
  ];

  return (
    <div className="space-y-7">
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-4">{ar ? "كيف تُحسب الأولوية" : "How Priority is Calculated"}</h3>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border border-border/40 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <p className="text-[13px] font-medium text-foreground">{ar ? item.labelAr : item.labelEn}</p>
              </div>
              <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{ar ? item.descAr : item.descEn}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-4">{ar ? "تصنيفات العناصر" : "Item Categories"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cats.map((c) => {
            const cat = CAT_STYLE[c.key];
            return (
              <div key={c.key} className="border border-border/40 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${cat.dot}`} />
                  <p className="text-[12px] font-medium text-foreground">{ar ? cat.labelAr : cat.labelEn}</p>
                </div>
                <p className="text-[11px] text-muted-foreground/70">{ar ? c.descAr : c.descEn}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function WorkQueue() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"queue" | "scoring">("queue");
  const [sortBy, setSortBy] = useState<SortKey>("priority");
  const [filterCat, setFilterCat] = useState<FilterCat>("all");
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "قائمة الشغل" : "Work Queue"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف صفقات ومهام وفواتير عشان تفعّل ترتيب الأولويات الذكي." : "Add deals, work items, and invoices to activate intelligent prioritization."}</p>
      </div>
    </div>
  );

  const rawQueue = useMemo(generateWorkQueue, []);

  const sorted = useMemo(() => {
    let items = filterCat === "all" ? rawQueue : rawQueue.filter((q) => q.category === filterCat);
    return [...items].sort((a, b) => {
      if (sortBy === "priority") return b.priorityScore - a.priorityScore;
      if (sortBy === "impact")   return b.impactScore - a.impactScore;
      if (sortBy === "urgency")  return b.urgencyScore - a.urgencyScore;
      if (sortBy === "effort")   return a.effortScore - b.effortScore;
      return 0;
    });
  }, [rawQueue, sortBy, filterCat]);

  const catCounts = useMemo(() => ({
    all: rawQueue.length,
    revenue: rawQueue.filter((q) => q.category === "revenue").length,
    operations: rawQueue.filter((q) => q.category === "operations").length,
    relationships: rawQueue.filter((q) => q.category === "relationships").length,
    risk: rawQueue.filter((q) => q.category === "risk").length,
  }), [rawQueue]);

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Target size={14} strokeWidth={1.75} className="text-orange-500" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "قائمة الشغل المستقلة" : "Autonomous Work Queue"}</p>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "قائمة الأولويات الاستراتيجية" : "Strategic Priority Queue"}
          </h1>
          <p className="text-[12px] text-muted-foreground/60 mb-5">{ar ? "مرتبة حسب الأثر والعجلة والجهد" : "Ranked by impact, urgency, and effort"}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "revenue", "operations", "relationships", "risk"] as FilterCat[]).map((cat) => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${filterCat === cat ? "bg-foreground text-background border-foreground" : "bg-background border-border/40 text-muted-foreground hover:text-foreground"}`}>
                {cat === "all" ? (ar ? `الكل (${catCounts.all})` : `All (${catCounts.all})`) : (ar ? `${CAT_STYLE[cat].labelAr} (${catCounts[cat]})` : `${CAT_STYLE[cat].labelEn} (${catCounts[cat]})`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 max-w-[1100px] flex items-center justify-between">
          <div className="flex gap-0 -mb-px">
            {[
              { id: "queue" as const, labelEn: "Queue", labelAr: "القائمة", icon: Target },
              { id: "scoring" as const, labelEn: "Scoring Logic", labelAr: "منطق التسجيل", icon: ArrowUpDown },
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
          {tab === "queue" && (
            <div className="flex items-center gap-2">
              <Filter size={12} strokeWidth={1.75} className="text-muted-foreground/50" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="text-[11px] bg-transparent text-muted-foreground border-none outline-none cursor-pointer"
              >
                <option value="priority">{ar ? "الأولوية" : "Priority"}</option>
                <option value="impact">{ar ? "الأثر" : "Impact"}</option>
                <option value="urgency">{ar ? "العجلة" : "Urgency"}</option>
                <option value="effort">{ar ? "الجهد" : "Effort"}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 md:px-10 py-7 max-w-[1100px]">
        {tab === "queue" && (
          sorted.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <CheckCircle2 size={28} strokeWidth={1.5} className="text-emerald-400 mb-3" />
              <p className="text-[14px] text-muted-foreground">{ar ? "القائمة فارغة — كل شيء مكتمل!" : "Queue is clear — everything is on track!"}</p>
            </div>
          ) : (
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              {sorted.map((item, i) => (
                <QueueRow key={item.id} item={item} index={i} ar={ar} navigate={navigate} />
              ))}
            </div>
          )
        )}
        {tab === "scoring" && <ScoringLegend ar={ar} />}
      </div>
    </div>
  );
}
