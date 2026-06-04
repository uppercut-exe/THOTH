import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import {
  ACTIVITY_EVENTS, MODULE_META, KIND_LABELS, UNIQUE_AUTHORS, DATE_GROUP_ORDER,
  generateCrossModuleEvents,
  type ActivityEvent, type ActivityModule, type ActivityKind,
} from "../data/activity";
import { type LucideIcon } from "lucide-react";
import {
  Search, X, Filter, ChevronDown,
  UserPlus, FileText, Send, CheckCircle2, DollarSign, Package,
  CheckSquare, Users, StickyNote, Calendar, FileCheck, Paperclip,
  Building2, RefreshCw, UserCheck, Briefcase, ShoppingBag,
  ArrowRightCircle, Trophy, XCircle, Phone, Mail,
  Sparkles, TrendingUp, AlertTriangle, Target, Zap, Shield,
  Eye, ChevronRight,
} from "lucide-react";

// ─── Kind visual metadata ─────────────────────────────────

const KIND_META: Record<string, { Icon: LucideIcon; bg: string; color: string }> = {
  customer_added:      { Icon: UserPlus,       bg: "bg-violet-50",    color: "text-violet-600" },
  quotation_created:   { Icon: FileText,       bg: "bg-amber-50",     color: "text-amber-600" },
  invoice_sent:        { Icon: Send,           bg: "bg-blue-50",      color: "text-blue-600" },
  invoice_paid:        { Icon: CheckCircle2,   bg: "bg-emerald-50",   color: "text-emerald-600" },
  payment_received:    { Icon: DollarSign,     bg: "bg-emerald-50",   color: "text-emerald-600" },
  order_placed:        { Icon: Package,        bg: "bg-orange-50",    color: "text-orange-500" },
  work_completed:      { Icon: CheckSquare,    bg: "bg-emerald-50",   color: "text-emerald-600" },
  employee_assigned:   { Icon: Users,          bg: "bg-cyan-50",      color: "text-cyan-600" },
  note_added:          { Icon: StickyNote,     bg: "bg-muted/70",     color: "text-muted-foreground" },
  meeting_scheduled:   { Icon: Calendar,       bg: "bg-violet-50",    color: "text-violet-600" },
  contract_signed:     { Icon: FileCheck,      bg: "bg-blue-50",      color: "text-blue-600" },
  file_uploaded:       { Icon: Paperclip,      bg: "bg-muted/70",     color: "text-muted-foreground" },
  organization_added:  { Icon: Building2,      bg: "bg-cyan-50",      color: "text-cyan-600" },
  status_changed:      { Icon: RefreshCw,      bg: "bg-muted/70",     color: "text-muted-foreground" },
  contact_updated:     { Icon: UserCheck,      bg: "bg-primary/8",    color: "text-primary" },
  work_created:        { Icon: Briefcase,      bg: "bg-blue-50",      color: "text-blue-600" },
  work_assigned:       { Icon: Users,          bg: "bg-cyan-50",      color: "text-cyan-600" },
  work_status_changed: { Icon: ArrowRightCircle, bg: "bg-amber-50",   color: "text-amber-500" },
  deal_created:        { Icon: ShoppingBag,    bg: "bg-amber-50",     color: "text-amber-600" },
  deal_stage_changed:  { Icon: ArrowRightCircle, bg: "bg-violet-50",  color: "text-violet-500" },
  deal_won:            { Icon: Trophy,         bg: "bg-emerald-50",   color: "text-emerald-600" },
  deal_lost:           { Icon: XCircle,        bg: "bg-rose-50",      color: "text-rose-500" },
  person_added:        { Icon: UserPlus,       bg: "bg-violet-50",    color: "text-violet-600" },
  contacted:           { Icon: Phone,          bg: "bg-primary/8",    color: "text-primary" },
};

function getKindMeta(kind: string) {
  return KIND_META[kind] || { Icon: RefreshCw, bg: "bg-muted/70", color: "text-muted-foreground" };
}

// ─── Module filter config ─────────────────────────────────

const MODULE_FILTERS: { value: ActivityModule | "all"; en: string; ar: string }[] = [
  { value: "all",           en: "All",           ar: "الكل" },
  { value: "work",          en: "Work",          ar: "العمل" },
  { value: "sales",         en: "Sales",         ar: "المبيعات" },
  { value: "organizations", en: "Organizations", ar: "المنظمات" },
  { value: "people",        en: "People",        ar: "الأشخاص" },
  { value: "finance",       en: "Finance",       ar: "المالية" },
];

// ─── Detail Drawer ────────────────────────────────────────

function DetailDrawer({ event, lang, onClose, onNavigate }: {
  event: ActivityEvent; lang: "en" | "ar"; onClose: () => void; onNavigate: (path: string) => void;
}) {
  const ar = lang === "ar";
  const km = getKindMeta(event.kind);
  const mm = MODULE_META[event.module] || MODULE_META.work;
  const kl = KIND_LABELS[event.kind as ActivityKind];

  const authorInitials = event.authorEn.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  // Determine navigation target
  let navPath: string | null = null;
  if (event.entityId) {
    if (event.module === "work" || event.kind.startsWith("work")) navPath = `/work/${event.entityId}`;
    else if (event.module === "sales" || event.kind.startsWith("deal")) navPath = `/sales/${event.entityId}`;
    else if (event.entityType === "person") navPath = `/people/${event.entityId}`;
    else if (event.entityType === "organization") navPath = `/organizations/${event.entityId}`;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-y-0 end-0 z-50 w-full max-w-[420px] bg-background border-s border-border/40 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 sticky top-0 bg-background z-10">
          <h2 className="text-[14px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
            {ar ? "تفاصيل النشاط" : "Activity Detail"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Event header */}
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl ${km.bg} flex items-center justify-center shrink-0`}>
              <km.Icon size={18} strokeWidth={1.75} className={km.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-1">
                {kl ? (ar ? kl.ar : kl.en) : event.kind}
              </p>
              <p className="text-[15px] font-medium text-foreground leading-snug" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? event.titleAr : event.titleEn}
                {event.entityNameEn && <span className="text-primary"> {ar ? event.entityNameAr : event.entityNameEn}</span>}
              </p>
            </div>
          </div>

          {/* Details */}
          {(event.detailEn || event.valueEn) && (
            <div className="border border-border/40 rounded-xl px-5 py-4 bg-muted/10">
              {event.valueEn && <p className="text-[14px] font-semibold text-foreground mb-1 tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? event.valueAr : event.valueEn}</p>}
              {event.detailEn && <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? event.detailAr : event.detailEn}</p>}
            </div>
          )}

          {/* Actor */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold ${event.authorColor}`}>
              {authorInitials}
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">{ar ? event.authorAr : event.authorEn}</p>
              <p className="text-[11px] text-muted-foreground">{ar ? event.timeAr : event.timeEn}</p>
            </div>
          </div>

          {/* Module badge */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${mm.dot}`} />
            <span className={`text-[12px] font-medium ${mm.subtle}`}>{ar ? mm.ar : mm.en}</span>
          </div>

          {/* Navigate to entity */}
          {navPath && (
            <button
              onClick={() => { onNavigate(navPath!); onClose(); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border/40 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Eye size={14} strokeWidth={1.75} className="text-muted-foreground" />
                <span className="text-[12px] font-medium text-foreground group-hover:text-primary transition-colors">
                  {ar ? "عرض التفاصيل" : "View Full Details"}
                </span>
              </div>
              <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Event row ────────────────────────────────────────────

function EventRow({ event, lang, isLast, onClick }: {
  event: ActivityEvent; lang: "en" | "ar"; isLast: boolean; onClick: () => void;
}) {
  const ar = lang === "ar";
  const km = getKindMeta(event.kind);
  const mm = MODULE_META[event.module] || MODULE_META.work;
  const { Icon } = km;

  const authorInitials = event.authorEn.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div
      className={`relative flex items-start gap-4 ${!isLast ? "pb-6" : "pb-1"} cursor-pointer group`}
      onClick={onClick}
    >
      <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-4 ring-background ${km.bg} group-hover:scale-105 transition-transform`}>
        <Icon size={15} className={km.color} strokeWidth={1.75} />
      </div>

      <div className="flex-1 min-w-0 pt-1">
        <p className="text-[13.5px] text-foreground leading-snug group-hover:text-primary/90 transition-colors">
          <span className="font-medium">{ar ? event.titleAr : event.titleEn}</span>
          {event.entityNameEn && <span className="text-primary font-normal"> {ar ? event.entityNameAr : event.entityNameEn}</span>}
        </p>

        {(event.valueEn || event.detailEn) && (
          <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            {event.valueEn && <span className="font-medium text-foreground/75">{ar ? event.valueAr : event.valueEn}</span>}
            {event.valueEn && event.detailEn && <span className="text-border">·</span>}
            {event.detailEn && <span>{ar ? event.detailAr : event.detailEn}</span>}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2.5">
          <div className={`w-[18px] h-[18px] rounded-md flex items-center justify-center text-[8.5px] font-bold shrink-0 leading-none ${event.authorColor}`}>
            {authorInitials}
          </div>
          <span className="text-[11.5px] text-muted-foreground">{ar ? event.authorAr : event.authorEn}</span>
          <span className="text-border/60">·</span>
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${mm.dot}`} />
          <span className={`text-[11.5px] font-medium ${mm.subtle}`}>{ar ? mm.ar : mm.en}</span>
        </div>
      </div>

      <span className="text-[11.5px] text-muted-foreground shrink-0 pt-1 tabular-nums">
        {ar ? event.timeAr : event.timeEn}
      </span>
    </div>
  );
}

// ─── Date section ─────────────────────────────────────────

function DateSection({ groupEn, groupAr, events, lang, onEventClick }: {
  groupEn: string; groupAr: string; events: ActivityEvent[]; lang: "en" | "ar";
  onEventClick: (ev: ActivityEvent) => void;
}) {
  const ar = lang === "ar";
  const isToday = groupEn === "Today";

  return (
    <div className="mb-10 last:mb-4">
      <div className="flex items-center gap-3 mb-5 sticky top-[57px] z-10 bg-background/95 backdrop-blur-sm py-2 -mx-1 px-1">
        <h2 className="text-[11.5px] font-semibold text-muted-foreground tracking-[0.07em] uppercase whitespace-nowrap flex items-center gap-2">
          {ar ? groupAr : groupEn}
          {isToday && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 normal-case tracking-normal">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />Live
            </span>
          )}
        </h2>
        <div className="flex-1 h-px bg-border/35" />
        <span className="text-[11px] text-muted-foreground/60 tabular-nums shrink-0">{events.length}</span>
      </div>

      <div className="relative ps-2">
        {events.length > 1 && <div className="absolute start-[25px] top-5 bottom-8 w-px bg-border/25" aria-hidden="true" />}
        {events.map((ev, i) => (
          <EventRow key={ev.id} event={ev} lang={lang} isLast={i === events.length - 1} onClick={() => onEventClick(ev)} />
        ))}
      </div>
    </div>
  );
}

// ─── Intelligence Panel ───────────────────────────────────

function IntelligencePanel({ allEvents, lang }: { allEvents: ActivityEvent[]; lang: "en" | "ar" }) {
  const ar = lang === "ar";

  // Compute intelligence
  const workEvents = allEvents.filter((e) => e.module === "work");
  const salesEvents = allEvents.filter((e) => e.module === "sales");
  const completedWork = workEvents.filter((e) => e.kind === "work_completed").length;
  const wonDeals = salesEvents.filter((e) => e.kind === "deal_won").length;
  const stalledDeals = salesEvents.filter((e) => e.kind === "deal_created").length;

  // Most active author
  const authorCounts: Record<string, number> = {};
  allEvents.forEach((e) => { authorCounts[e.authorEn] = (authorCounts[e.authorEn] || 0) + 1; });
  const topAuthor = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];

  // Most active module
  const moduleCounts: Record<string, number> = {};
  allEvents.forEach((e) => { moduleCounts[e.module] = (moduleCounts[e.module] || 0) + 1; });
  const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];

  const cards = [
    {
      icon: Users, color: "text-violet-600", bg: "bg-violet-50",
      titleEn: "Most Active Person", titleAr: "أكثر شخص نشاطاً",
      valueEn: topAuthor ? `${topAuthor[0]} — ${topAuthor[1]} activities` : "No data",
      valueAr: topAuthor ? `${topAuthor[0]} — ${topAuthor[1]} نشاط` : "لا بيانات",
      descEn: "Consider recognizing top contributors and distributing workload evenly.",
      descAr: "فكر في تقدير أفضل المساهمين وتوزيع عبء العمل بالتساوي.",
    },
    {
      icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50",
      titleEn: "Completed Work", titleAr: "العمل المكتمل",
      valueEn: `${completedWork} item${completedWork !== 1 ? "s" : ""} completed this period`,
      valueAr: `${completedWork} عنصر مكتمل في هذه الفترة`,
      descEn: completedWork > 3 ? "Strong execution pace. Keep momentum." : "Consider reviewing blockers on in-progress items.",
      descAr: completedWork > 3 ? "وتيرة تنفيذ قوية. حافظ على الزخم." : "فكر في مراجعة العوائق على العناصر قيد التنفيذ.",
    },
    {
      icon: stalledDeals > 2 ? AlertTriangle : Target,
      color: stalledDeals > 2 ? "text-amber-600" : "text-primary",
      bg: stalledDeals > 2 ? "bg-amber-50" : "bg-primary/8",
      titleEn: "Stalled Opportunities", titleAr: "الفرص المتوقفة",
      valueEn: `${stalledDeals} deal${stalledDeals !== 1 ? "s" : ""} in early stages`,
      valueAr: `${stalledDeals} صفقة في مراحل مبكرة`,
      descEn: "Follow up on lead-stage deals to advance them through the pipeline.",
      descAr: "تابع صفقات مرحلة العميل المحتمل لتقدمها في خط المبيعات.",
    },
    {
      icon: Zap, color: "text-cyan-600", bg: "bg-cyan-50",
      titleEn: "Recommended Follow-Ups", titleAr: "المتابعات الموصى بها",
      valueEn: `${Math.max(1, Math.floor(allEvents.length / 10))} actions recommended this week`,
      valueAr: `${Math.max(1, Math.floor(allEvents.length / 10))} إجراءات موصى بها هذا الأسبوع`,
      descEn: "Review stalled work items, follow up on open proposals, and schedule client check-ins.",
      descAr: "راجع عناصر العمل المتوقفة، تابع العروض المفتوحة، وجدول متابعات العملاء.",
    },
  ];

  return (
    <div className="border-t border-border/40 px-8 md:px-10 py-8 max-w-[820px]">
      <div className="flex items-center gap-2.5 mb-5">
        <Sparkles size={14} strokeWidth={1.75} className="text-primary" />
        <h3 className="text-[13px] font-medium text-foreground">{ar ? "ذكاء النشاط" : "Activity Intelligence"}</h3>
        <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "ذكاء اصطناعي" : "AI-powered"}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="border border-border/40 rounded-xl bg-background p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3.5">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                <card.icon size={16} strokeWidth={1.75} className={card.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? card.titleAr : card.titleEn}</p>
                <p className="text-[13px] font-medium text-foreground leading-snug mb-1.5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>{ar ? card.valueAr : card.valueEn}</p>
                <p className="text-[11px] text-muted-foreground/70 leading-relaxed">{ar ? card.descAr : card.descEn}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function ActivityFeed() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "سجل النشاط" : "Activity Feed"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "هتلاقي هنا كل التحديثات لما تضيف أو تعدّل أي حاجة في مساحة عملك." : "Events will appear here as you create and update records in your workspace."}</p>
      </div>
    </div>
  );

  const [search,       setSearch]       = useState("");
  const [moduleFilter, setModuleFilter] = useState<ActivityModule | "all">("all");
  const [kindFilter,   setKindFilter]   = useState<ActivityKind   | "all">("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);

  // Merge static + cross-module events
  const allEvents = useMemo(() => {
    const cross = generateCrossModuleEvents();
    return [...ACTIVITY_EVENTS, ...cross];
  }, []);

  // Unique authors from merged set
  const allAuthors = useMemo(() => {
    const set = new Map<string, string>();
    allEvents.forEach((e) => { if (!set.has(e.authorEn)) set.set(e.authorEn, e.authorAr); });
    return Array.from(set.entries()).map(([en, arName]) => ({ en, ar: arName }));
  }, [allEvents]);

  const hasFilters = search !== "" || moduleFilter !== "all" || kindFilter !== "all" || authorFilter !== "all";
  function clearFilters() { setSearch(""); setModuleFilter("all"); setKindFilter("all"); setAuthorFilter("all"); }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allEvents.filter((ev) => {
      const matchSearch = !q
        || ev.titleEn.toLowerCase().includes(q) || ev.titleAr?.includes(q)
        || ev.detailEn?.toLowerCase().includes(q)
        || ev.entityNameEn?.toLowerCase().includes(q)
        || ev.authorEn.toLowerCase().includes(q)
        || ev.valueEn?.includes(q);
      const matchModule = moduleFilter === "all" || ev.module === moduleFilter;
      const matchKind   = kindFilter   === "all" || ev.kind   === kindFilter;
      const matchAuthor = authorFilter === "all" || ev.authorEn === authorFilter;
      return matchSearch && matchModule && matchKind && matchAuthor;
    });
  }, [allEvents, search, moduleFilter, kindFilter, authorFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { ar: string; events: ActivityEvent[] }>();
    for (const ev of filtered) {
      if (!map.has(ev.dateGroupEn)) map.set(ev.dateGroupEn, { ar: ev.dateGroupAr, events: [] });
      map.get(ev.dateGroupEn)!.events.push(ev);
    }
    return [...DATE_GROUP_ORDER, "Last Week", "Earlier"]
      .filter((g, i, arr) => arr.indexOf(g) === i)
      .filter((g) => map.has(g))
      .map((g) => ({ en: g, ...map.get(g)! }));
  }, [filtered]);

  // Dashboard metrics
  const todayCount = useMemo(() => allEvents.filter((e) => e.dateGroupEn === "Today").length, [allEvents]);
  const thisWeekCount = useMemo(() => allEvents.filter((e) => !["Last Week", "Earlier"].includes(e.dateGroupEn)).length, [allEvents]);
  const activeUsers = useMemo(() => new Set(allEvents.map((e) => e.authorEn)).size, [allEvents]);
  const openOpps = useMemo(() => allEvents.filter((e) => e.kind === "deal_created").length, [allEvents]);
  const completedWork = useMemo(() => allEvents.filter((e) => e.kind === "work_completed").length, [allEvents]);

  return (
    <div className="min-h-full">

      {/* ── Dashboard Header ───────────────────────────────── */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[820px]">
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{ar ? "مركز النشاط" : "Activity Hub"}</p>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "رسم النشاط الموحد" : "Unified Activity Graph"}
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              <span className="text-[10.5px] font-semibold tracking-wide">Live</span>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground mb-6">
            {ar ? `${allEvents.length} حدث من جميع الوحدات` : `${allEvents.length} events from all modules`}
          </p>

          {/* Metrics strip */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { value: todayCount, label: ar ? "اليوم" : "Today", icon: Calendar, color: "text-primary" },
              { value: thisWeekCount, label: ar ? "هذا الأسبوع" : "This Week", icon: TrendingUp, color: "text-amber-500" },
              { value: activeUsers, label: ar ? "مستخدمين نشطين" : "Active Users", icon: Users, color: "text-violet-500" },
              { value: openOpps, label: ar ? "فرص مفتوحة" : "Open Opps", icon: Target, color: "text-emerald-500" },
              { value: completedWork, label: ar ? "عمل مكتمل" : "Completed", icon: CheckSquare, color: "text-cyan-600" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <m.icon size={13} strokeWidth={1.75} className={m.color} />
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
                <p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 py-3 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1 max-w-[260px]">
            <Search size={13} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث…" : "Search events…"}
              className="w-full h-9 ps-8 pe-4 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" />

          <div className="flex items-center gap-1.5 flex-wrap">
            {MODULE_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setModuleFilter(f.value as ActivityModule | "all")}
                className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-all duration-150 ${moduleFilter === f.value ? "bg-primary/8 text-primary border-primary/25" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {ar ? f.ar : f.en}
                {f.value !== "all" && <span className="ms-1.5 text-[10.5px] text-muted-foreground/50">{allEvents.filter((e) => e.module === f.value).length}</span>}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" />

          <div className="relative">
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as ActivityKind | "all")}
              className="h-7 ps-2.5 pe-7 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none appearance-none cursor-pointer">
              <option value="all">{ar ? "كل الأنواع" : "All types"}</option>
              {(Object.keys(KIND_LABELS) as ActivityKind[]).map((k) => (
                <option key={k} value={k}>{ar ? KIND_LABELS[k].ar : KIND_LABELS[k].en}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative">
            <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}
              className="h-7 ps-2.5 pe-7 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none appearance-none cursor-pointer">
              <option value="all">{ar ? "كل الأعضاء" : "All authors"}</option>
              {allAuthors.map((a) => (<option key={a.en} value={a.en}>{ar ? a.ar : a.en}</option>))}
            </select>
            <ChevronDown size={11} className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all">
              <X size={11} strokeWidth={2} />{ar ? "مسح" : "Clear"}
            </button>
          )}

          <div className="flex-1" />
          <span className="text-[12px] text-muted-foreground whitespace-nowrap">
            {filtered.length !== allEvents.length
              ? (ar ? `${filtered.length} من ${allEvents.length}` : `${filtered.length} of ${allEvents.length}`)
              : (ar ? `${filtered.length} حدث` : `${filtered.length} events`)
            }
          </span>
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────── */}
      <div className="px-8 md:px-10 py-8 max-w-[820px]">
        {grouped.length === 0 ? (
          <div className="border border-border/40 rounded-xl py-20 text-center bg-background">
            <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center"><Filter size={16} className="text-muted-foreground" strokeWidth={1.5} /></div>
            <p className="text-[13px] font-medium text-foreground mb-1">{ar ? "لا توجد أحداث" : "No events found"}</p>
            <p className="text-[12px] text-muted-foreground">{ar ? "جرب تغيير الفلاتر" : "Try adjusting your filters"}</p>
            {hasFilters && <button onClick={clearFilters} className="mt-4 text-[12px] text-primary hover:underline">{ar ? "مسح الفلاتر" : "Clear filters"}</button>}
          </div>
        ) : (
          grouped.map((group) => (
            <DateSection key={group.en} groupEn={group.en} groupAr={group.ar} events={group.events} lang={lang} onEventClick={setSelectedEvent} />
          ))
        )}
      </div>

      {/* ── Intelligence Panel ──────────────────────────────── */}
      <IntelligencePanel allEvents={allEvents} lang={lang} />

      {/* ── Detail Drawer ──────────────────────────────────── */}
      {selectedEvent && (
        <DetailDrawer event={selectedEvent} lang={lang} onClose={() => setSelectedEvent(null)} onNavigate={navigate} />
      )}
    </div>
  );
}
