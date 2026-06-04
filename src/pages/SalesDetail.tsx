import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { RelatedRecords, BacklinksSection } from "../components/RelatedRecords";
import { ContextPanel } from "../components/ContextPanel";
import {
  loadDeals, saveDeals, formatCurrency, formatCurrencyAr,
  STAGE_META, DEAL_PRIORITY_META, STAGE_ORDER, PIPELINE_STAGES,
  type Deal, type DealStage,
} from "../data/sales";
import { loadWorkItems, STATUS_META, KIND_META, type WorkItem } from "../data/work";
import {
  ArrowLeft, ChevronRight, User, Building2, Calendar,
  Clock, Users, ShoppingBag, FileText, StickyNote,
  CheckCircle2, Circle, Timer, Eye, Inbox,
  Plus, Paperclip, MessageSquare, ArrowRightCircle,
  UserPlus, Upload, Tag, DollarSign, TrendingUp,
  Image, FolderArchive, Sheet, Download, Link2,
  X, Check, Trophy, XCircle, Briefcase, Percent, Brain,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab types ────────────────────────────────────────────

type DealTab = "overview" | "timeline" | "people" | "organization" | "notes" | "activity" | "related" | "financial";

const TABS: { id: DealTab; en: string; ar: string }[] = [
  { id: "overview",     en: "Overview",     ar: "نظرة عامة" },
  { id: "timeline",     en: "Timeline",     ar: "الجدول الزمني" },
  { id: "people",       en: "People",       ar: "الأشخاص" },
  { id: "organization", en: "Organization", ar: "المنظمة" },
  { id: "notes",        en: "Notes",        ar: "الملاحظات" },
  { id: "activity",     en: "Activity",     ar: "النشاط" },
  { id: "related",      en: "Related Work", ar: "عمل مرتبط" },
  { id: "financial",    en: "Financial",    ar: "المالية" },
];

// ─── Stage stepper ────────────────────────────────────────

const STAGE_ICONS: Record<DealStage, React.ElementType> = {
  lead: Inbox, qualified: Circle, proposal: FileText,
  negotiation: Timer, won: Trophy, lost: XCircle,
};

function StageStepper({ current, lang }: { current: DealStage; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const displayStages = current === "lost" ? [...PIPELINE_STAGES, "lost" as DealStage] : [...PIPELINE_STAGES, "won" as DealStage];
  const currentIdx = displayStages.indexOf(current);

  return (
    <div className="flex items-center gap-0 flex-wrap">
      {displayStages.map((stage, i) => {
        const meta = STAGE_META[stage];
        const isActive = i === currentIdx;
        const isPast = i < currentIdx;
        const Icon = STAGE_ICONS[stage];
        return (
          <div key={stage} className="flex items-center">
            {i > 0 && <div className={`w-6 md:w-8 h-px ${isPast ? "bg-primary/40" : "bg-border/50"}`} />}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${isActive ? "bg-primary/8 border border-primary/20" : ""} ${isPast ? "opacity-60" : !isActive ? "opacity-40" : ""}`}>
              <Icon size={12} strokeWidth={isActive ? 2 : 1.75} className={isActive ? (stage === "lost" ? "text-rose-500" : stage === "won" ? "text-emerald-500" : "text-primary") : isPast ? "text-emerald-500" : "text-muted-foreground"} />
              <span className={`text-[11px] font-medium whitespace-nowrap ${isActive ? (stage === "lost" ? "text-rose-500" : stage === "won" ? "text-emerald-500" : "text-primary") : "text-muted-foreground"}`}>
                {ar ? meta.ar : meta.en}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="border border-border/40 rounded-xl bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5 px-6 py-3.5">
      <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
        <Icon size={13} strokeWidth={1.75} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground/70 mb-0.5">{label}</p>
        <div className="text-[13px] text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ─── Timeline events ──────────────────────────────────────

interface TimelineEvent { id: string; kind: string; titleEn: string; titleAr: string; descEn?: string; descAr?: string; dateEn: string; dateAr: string; actorEn: string; actorAr: string; }

function getDealTimeline(deal: Deal): TimelineEvent[] {
  const events: TimelineEvent[] = [
    { id: "t1", kind: "created", titleEn: "Deal created", titleAr: "تم إنشاء الصفقة", descEn: `"${deal.titleEn}" entered the pipeline as a lead.`, descAr: `دخلت "${deal.titleAr}" خط المبيعات كعميل محتمل.`, dateEn: deal.createdEn, dateAr: deal.createdAr, actorEn: deal.ownerEn, actorAr: deal.ownerAr },
    { id: "t2", kind: "assigned", titleEn: `Assigned to ${deal.ownerEn}`, titleAr: `تم التعيين إلى ${deal.ownerAr}`, dateEn: deal.createdEn, dateAr: deal.createdAr, actorEn: "Admin", actorAr: "المدير" },
  ];
  if (deal.stage !== "lead") events.push({ id: "t3", kind: "stage", titleEn: "Qualified — requirements confirmed", titleAr: "مؤهل — تم تأكيد المتطلبات", dateEn: deal.createdEn, dateAr: deal.createdAr, actorEn: deal.ownerEn, actorAr: deal.ownerAr });
  if (["proposal", "negotiation", "won", "lost"].includes(deal.stage)) events.push({ id: "t4", kind: "proposal", titleEn: "Proposal sent to client", titleAr: "تم إرسال العرض للعميل", descEn: `Proposal valued at ${formatCurrency(deal.value, deal.currency)} submitted.`, descAr: `تم تقديم عرض بقيمة ${formatCurrencyAr(deal.value, deal.currency)}.`, dateEn: deal.createdEn, dateAr: deal.createdAr, actorEn: deal.ownerEn, actorAr: deal.ownerAr });
  if (["negotiation", "won", "lost"].includes(deal.stage)) events.push({ id: "t5", kind: "negotiation", titleEn: "Entered negotiation phase", titleAr: "دخلت مرحلة التفاوض", dateEn: deal.expectedCloseDateEn, dateAr: deal.expectedCloseDateAr, actorEn: deal.contactNameEn, actorAr: deal.contactNameAr });
  if (deal.stage === "won") events.push({ id: "t6", kind: "won", titleEn: "Deal won!", titleAr: "تم الفوز بالصفقة!", descEn: "Contract signed and payment terms agreed.", descAr: "تم توقيع العقد والاتفاق على شروط الدفع.", dateEn: deal.expectedCloseDateEn, dateAr: deal.expectedCloseDateAr, actorEn: deal.ownerEn, actorAr: deal.ownerAr });
  if (deal.stage === "lost") events.push({ id: "t6", kind: "lost", titleEn: "Deal lost", titleAr: "خُسرت الصفقة", descEn: "Client chose a competing offer.", descAr: "اختار العميل عرضاً منافساً.", dateEn: deal.expectedCloseDateEn, dateAr: deal.expectedCloseDateAr, actorEn: deal.ownerEn, actorAr: deal.ownerAr });
  return events;
}

const TL_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  created:     { Icon: Plus,             color: "text-primary",     bg: "bg-primary/8" },
  assigned:    { Icon: UserPlus,         color: "text-violet-500",  bg: "bg-violet-50" },
  stage:       { Icon: ArrowRightCircle, color: "text-amber-500",   bg: "bg-amber-50" },
  proposal:    { Icon: FileText,         color: "text-blue-500",    bg: "bg-blue-50" },
  negotiation: { Icon: MessageSquare,    color: "text-violet-500",  bg: "bg-violet-50" },
  won:         { Icon: Trophy,           color: "text-emerald-500", bg: "bg-emerald-50" },
  lost:        { Icon: XCircle,          color: "text-rose-500",    bg: "bg-rose-50" },
};

// ─── Notes ────────────────────────────────────────────────

interface NoteItem { id: string; authorEn: string; authorAr: string; contentEn: string; contentAr: string; dateEn: string; dateAr: string; }

function getSampleNotes(deal: Deal): NoteItem[] {
  return [
    { id: "n1", authorEn: deal.ownerEn, authorAr: deal.ownerAr, contentEn: "Had initial discovery call with the client. They have clear requirements and budget allocated for Q3. Decision-maker is the Procurement Director.", contentAr: "تمت مكالمة الاكتشاف الأولية مع العميل. لديهم متطلبات واضحة وميزانية مخصصة للربع الثالث. صانع القرار هو مدير المشتريات.", dateEn: deal.createdEn, dateAr: deal.createdAr },
    { id: "n2", authorEn: "Admin", authorAr: "المدير", contentEn: "Competitive landscape: 2 other vendors have been invited. Our advantage is local manufacturing and faster delivery timeline.", contentAr: "المشهد التنافسي: تمت دعوة مزودين آخرين. ميزتنا هي التصنيع المحلي والجدول الزمني الأسرع للتسليم.", dateEn: deal.createdEn, dateAr: deal.createdAr },
  ];
}

// ─── Activity ─────────────────────────────────────────────

function getSampleActivity(deal: Deal): { id: string; kind: string; titleEn: string; titleAr: string; descEn: string; descAr: string; dateEn: string; dateAr: string }[] {
  return [
    { id: "a1", kind: "email", titleEn: "Proposal email sent", titleAr: "تم إرسال بريد العرض", descEn: `Detailed proposal sent to ${deal.contactNameEn} at ${deal.orgNameEn || "the client"}.`, descAr: `تم إرسال عرض مفصل إلى ${deal.contactNameAr} في ${deal.orgNameAr || "العميل"}.`, dateEn: deal.createdEn, dateAr: deal.createdAr },
    { id: "a2", kind: "meeting", titleEn: "On-site presentation", titleAr: "عرض في الموقع", descEn: `Presented furniture samples and design concepts to the client team.`, descAr: `تم عرض عينات الأثاث ومفاهيم التصميم لفريق العميل.`, dateEn: deal.createdEn, dateAr: deal.createdAr },
    { id: "a3", kind: "call", titleEn: "Follow-up call", titleAr: "مكالمة متابعة", descEn: "Discussed timeline, pricing adjustments, and warranty terms.", descAr: "تمت مناقشة الجدول الزمني وتعديلات الأسعار وشروط الضمان.", dateEn: deal.expectedCloseDateEn, dateAr: deal.expectedCloseDateAr },
  ];
}

const ACT_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  email:   { Icon: MessageSquare, color: "text-primary",    bg: "bg-primary/8" },
  meeting: { Icon: Calendar,      color: "text-cyan-600",   bg: "bg-cyan-50" },
  call:    { Icon: Users,         color: "text-violet-500", bg: "bg-violet-50" },
};

// ─── Add Note Modal ───────────────────────────────────────

function AddNoteModal({ open, onClose, onAdd, lang }: { open: boolean; onClose: () => void; onAdd: (text: string) => void; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "إضافة ملاحظة" : "Add Note"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={14} strokeWidth={2} /></button>
        </div>
        <div className="px-6 py-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={ar ? "اكتب ملاحظتك…" : "Write your note…"} rows={4} autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none" />
        </div>
        <div className="px-6 py-3 border-t border-border/40 flex justify-end gap-3">
          <button onClick={onClose} className="h-8 px-4 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); onClose(); } }} disabled={!text.trim()}
            className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">{ar ? "إضافة" : "Add Note"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function SalesDetail() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmtVal = ar ? formatCurrencyAr : formatCurrency;

  const [allDeals, setAllDeals] = useState<Deal[]>(loadDeals);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const deal = allDeals.find((d) => d.id === id);

  const [activeTab, setActiveTab] = useState<DealTab>("overview");
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  function showToast(msg: string) { setActionToast(msg); setTimeout(() => setActionToast(null), 2200); }

  function changeStage(newStage: DealStage) {
    setAllDeals((prev) => {
      const updated = prev.map((d) => {
        if (d.id !== id) return d;
        const probability = newStage === "won" ? 100 : newStage === "lost" ? 0 : d.probability;
        return { ...d, stage: newStage, probability };
      });
      saveDeals(updated);
      return updated;
    });
    setStageMenuOpen(false);
    showToast(ar ? "تم تغيير المرحلة" : "Stage updated");
  }

  function handleAddNote(text: string) {
    setLocalNotes((prev) => [{ id: `n-${Date.now()}`, authorEn: "You", authorAr: "أنت", contentEn: text, contentAr: text, dateEn: "Just now", dateAr: "الآن" }, ...prev]);
    showToast(ar ? "تمت إضافة الملاحظة" : "Note added");
  }

  // Not found
  if (!deal) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <ShoppingBag size={20} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "لم يُعثر على الصفقة" : "Deal not found"}</p>
        <button onClick={() => navigate("/sales")} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline">
          <ArrowLeft size={12} strokeWidth={2} />{ar ? "العودة إلى المبيعات" : "Back to Sales"}
        </button>
      </div>
    );
  }

  const stageMeta    = STAGE_META[deal.stage];
  const priorityMeta = DEAL_PRIORITY_META[deal.priority];
  const timeline     = getDealTimeline(deal);
  const sampleNotes  = getSampleNotes(deal);
  const allNotes     = [...localNotes, ...sampleNotes];
  const activity     = getSampleActivity(deal);

  // Related work items
  const workItems = loadWorkItems();
  const relatedWork: WorkItem[] = deal.relatedWorkIds
    ? workItems.filter((w) => deal.relatedWorkIds!.includes(w.id))
    : [];

  // Weighted value
  const weightedValue = deal.value * (deal.probability / 100);

  return (
    <div className="min-h-full">

      {/* Toast */}
      {actionToast && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-foreground text-background text-[13px] font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check size={14} strokeWidth={2.5} />{actionToast}
        </div>
      )}

      {/* ═══ HERO ═══════════════════════════════════════════ */}
      <div className="relative border-b border-border/40" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.35) 0%, hsl(var(--background)) 65%)" }}>
        <div className="px-8 md:px-10 pt-6">
          <button onClick={() => navigate("/sales")} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            {ar ? "المبيعات" : "Sales"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70 truncate max-w-[200px]">{ar ? deal.titleAr : deal.titleEn}</span>
          </button>
        </div>

        <div className="px-8 md:px-10 pt-5 pb-6 max-w-[960px]">
          {/* Pills */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${stageMeta.pill}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${stageMeta.dot}`} />{ar ? stageMeta.ar : stageMeta.en}
            </div>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${priorityMeta.pill}`}>{ar ? priorityMeta.ar : priorityMeta.en}</span>
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/20 tabular-nums">
              {deal.probability}%
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
            {ar ? deal.titleAr : deal.titleEn}
          </h1>

          {/* Value */}
          <p className="text-[22px] font-medium text-primary mb-3 tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {fmtVal(deal.value, deal.currency)}
          </p>

          {/* Meta line */}
          <p className="text-[13px] text-muted-foreground leading-snug">
            {ar ? deal.ownerAr : deal.ownerEn}
            {deal.orgNameEn && <><span className="mx-2 text-border">·</span>{ar ? deal.orgNameAr : deal.orgNameEn}</>}
            <span className="mx-2 text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={10} strokeWidth={1.75} className="text-muted-foreground/60" />
              {ar ? deal.expectedCloseDateAr : deal.expectedCloseDateEn}
            </span>
          </p>

          {/* Stepper */}
          <div className="mt-5"><StageStepper current={deal.stage} lang={lang} /></div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 mt-6 flex-wrap">
            <div className="relative">
              <button onClick={() => setStageMenuOpen(!stageMenuOpen)} className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors">
                <ArrowRightCircle size={13} strokeWidth={1.75} />{ar ? "تغيير المرحلة" : "Change Stage"}
              </button>
              {stageMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStageMenuOpen(false)} />
                  <div className="absolute top-full mt-1.5 start-0 z-50 bg-background border border-border/60 rounded-xl shadow-lg py-1.5 min-w-[180px]">
                    {STAGE_ORDER.map((s) => {
                      const m = STAGE_META[s];
                      const isCurrent = s === deal.stage;
                      return (
                        <button key={s} onClick={() => changeStage(s)} disabled={isCurrent}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-start transition-colors ${isCurrent ? "text-primary bg-primary/5 font-medium" : "text-foreground hover:bg-muted"}`}>
                          <div className={`w-2 h-2 rounded-full ${m.dot}`} />{ar ? m.ar : m.en}
                          {isCurrent && <Check size={12} strokeWidth={2.5} className="ms-auto text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button onClick={() => setNoteModalOpen(true)} className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors">
              <StickyNote size={13} strokeWidth={1.75} />{ar ? "إضافة ملاحظة" : "Add Note"}
            </button>

            {deal.stage !== "won" && deal.stage !== "lost" && (
              <>
                <button onClick={() => changeStage("won")} className="h-8 px-3.5 rounded-xl bg-emerald-500 text-white text-[12px] font-medium hover:bg-emerald-600 flex items-center gap-1.5 transition-colors">
                  <Trophy size={13} strokeWidth={2} />{ar ? "فاز" : "Mark Won"}
                </button>
                <button onClick={() => changeStage("lost")} className="h-8 px-3.5 rounded-xl border border-rose-300 text-rose-600 text-[12px] font-medium hover:bg-rose-50 flex items-center gap-1.5 transition-colors">
                  <XCircle size={13} strokeWidth={1.75} />{ar ? "خسر" : "Mark Lost"}
                </button>
              </>
            )}

            <button onClick={() => { navigate("/work"); showToast(ar ? "انتقل إلى العمل لإنشاء عنصر جديد" : "Navigate to Work to create an item"); }}
              className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors">
              <Briefcase size={13} strokeWidth={1.75} />{ar ? "إنشاء عمل" : "Create Work"}
            </button>

            <button onClick={() => setContextPanelOpen(true)}
              className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors ms-auto">
              <Brain size={13} strokeWidth={1.75} />{ar ? "الاتصالات" : "Connections"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TAB BAR ════════════════════════════════════════ */}
      <div className="border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="px-8 md:px-10 flex items-center gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"}`}>
              {ar ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB CONTENT ════════════════════════════════════ */}
      <div className="px-8 md:px-10 py-7 max-w-[960px]">

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Section title={ar ? "الوصف" : "Description"}>
              <div className="px-6 py-5">
                <p className="text-[14px] text-foreground/85 leading-[1.8] max-w-[680px]" style={{ fontFamily: "var(--app-font-serif)" }}>
                  {ar ? deal.descAr : deal.descEn}
                </p>
              </div>
            </Section>

            <Section title={ar ? "التفاصيل" : "Details"}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/25">
                <div className="divide-y divide-border/25">
                  <DetailRow icon={DollarSign} label={ar ? "القيمة" : "Value"} value={
                    <span className="font-semibold tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(deal.value, deal.currency)}</span>
                  } />
                  <DetailRow icon={Percent} label={ar ? "الاحتمالية" : "Probability"} value={`${deal.probability}%`} />
                  <DetailRow icon={User} label={ar ? "المسؤول" : "Owner"} value={
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? deal.ownerAr : deal.ownerEn)}</div>
                      {ar ? deal.ownerAr : deal.ownerEn}
                    </div>
                  } />
                </div>
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Tag} label={ar ? "الأولوية" : "Priority"} value={
                    <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${priorityMeta.dot}`} />{ar ? priorityMeta.ar : priorityMeta.en}</div>
                  } />
                  <DetailRow icon={Calendar} label={ar ? "الإغلاق المتوقع" : "Expected Close"} value={ar ? deal.expectedCloseDateAr : deal.expectedCloseDateEn} />
                  <DetailRow icon={Clock} label={ar ? "تاريخ الإنشاء" : "Created"} value={ar ? deal.createdAr : deal.createdEn} />
                </div>
              </div>
            </Section>

            {/* Summary metrics */}
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: fmtVal(deal.value, deal.currency), label: ar ? "القيمة" : "Value" },
                  { value: `${deal.probability}%`, label: ar ? "الاحتمالية" : "Probability" },
                  { value: fmtVal(Math.round(weightedValue), deal.currency), label: ar ? "القيمة المرجحة" : "Weighted" },
                  { value: ar ? stageMeta.ar : stageMeta.en, label: ar ? "المرحلة" : "Stage" },
                ].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
                    <p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {activeTab === "timeline" && (
          <Section title={ar ? "الجدول الزمني" : "Timeline"}>
            <div className="px-6 py-2">
              {timeline.map((ev, i) => {
                const { Icon, color, bg } = TL_ICONS[ev.kind] || TL_ICONS.stage;
                const isLast = i === timeline.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p>
                      {ev.descEn && <p className="text-[12px] text-muted-foreground/80 mt-1 leading-relaxed">{ar ? ev.descAr : ev.descEn}</p>}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{ar ? ev.actorAr : ev.actorEn} · {ar ? ev.dateAr : ev.dateEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* PEOPLE */}
        {activeTab === "people" && (
          <Section title={ar ? "الأشخاص" : "People"}>
            <div className="divide-y divide-border/25">
              <div className="flex items-center gap-3.5 px-6 py-4 hover:bg-muted/15 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">{initials(ar ? deal.ownerAr : deal.ownerEn)}</div>
                <div><p className="text-[13px] font-medium text-foreground">{ar ? deal.ownerAr : deal.ownerEn}</p><p className="text-[11px] text-muted-foreground">{ar ? "مسؤول الصفقة" : "Deal Owner"}</p></div>
              </div>
              <div className="flex items-center gap-3.5 px-6 py-4 hover:bg-muted/15 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-[11px] font-semibold text-violet-500 shrink-0">{initials(ar ? deal.contactNameAr : deal.contactNameEn)}</div>
                <div><p className="text-[13px] font-medium text-foreground">{ar ? deal.contactNameAr : deal.contactNameEn}</p><p className="text-[11px] text-muted-foreground">{deal.contactRole || (ar ? "جهة الاتصال" : "Contact")}</p></div>
              </div>
            </div>
          </Section>
        )}

        {/* ORGANIZATION */}
        {activeTab === "organization" && (
          <Section title={ar ? "المنظمة" : "Organization"}>
            {deal.orgNameEn ? (
              <div className="flex items-center gap-3.5 px-6 py-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Building2 size={15} strokeWidth={1.75} className="text-amber-600" /></div>
                <div><p className="text-[13px] font-medium text-foreground">{ar ? deal.orgNameAr : deal.orgNameEn}</p><p className="text-[11px] text-muted-foreground">{ar ? "العميل / المنظمة" : "Client / Organization"}</p></div>
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center"><Building2 size={16} className="text-muted-foreground/40" strokeWidth={1.5} /></div>
                <p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد منظمة مرتبطة" : "No organization linked"}</p>
              </div>
            )}
          </Section>
        )}

        {/* NOTES */}
        {activeTab === "notes" && (
          <Section title={ar ? "الملاحظات" : "Notes"} action={
            <button onClick={() => setNoteModalOpen(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors">
              <Plus size={12} strokeWidth={2.5} />{ar ? "إضافة" : "Add"}
            </button>
          }>
            <div className="divide-y divide-border/25">
              {allNotes.map((note) => (
                <div key={note.id} className="px-6 py-4">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? note.authorAr : note.authorEn)}</div>
                    <span className="text-[12px] font-medium text-foreground">{ar ? note.authorAr : note.authorEn}</span>
                    <span className="text-[10px] text-muted-foreground/50 ms-auto">{ar ? note.dateAr : note.dateEn}</span>
                  </div>
                  <p className="text-[13px] text-foreground/80 leading-[1.7]" style={{ paddingInlineStart: "2.125rem" }}>{ar ? note.contentAr : note.contentEn}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <Section title={ar ? "النشاط" : "Activity"}>
            <div className="px-6 py-2">
              {activity.map((ev, i) => {
                const { Icon, color, bg } = ACT_ICONS[ev.kind] || ACT_ICONS.email;
                const isLast = i === activity.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p>
                      <p className="text-[12px] text-muted-foreground/70 mt-0.5 leading-relaxed">{ar ? ev.descAr : ev.descEn}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1">{ar ? ev.dateAr : ev.dateEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* RELATED WORK */}
        {activeTab === "related" && (
          <Section title={ar ? "عمل مرتبط" : "Related Work"}>
            {relatedWork.length > 0 ? (
              <div className="divide-y divide-border/25">
                {relatedWork.map((w) => {
                  const wStatus = STATUS_META[w.status];
                  const wKind = KIND_META[w.kind];
                  return (
                    <div key={w.id} onClick={() => navigate(`/work/${w.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0"><Briefcase size={14} strokeWidth={1.75} className="text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${wKind.pill}`}>{ar ? wKind.ar : wKind.en}</span>
                          <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? w.titleAr : w.titleEn}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <div className={`w-1.5 h-1.5 rounded-full ${wStatus.dot}`} /><span>{ar ? wStatus.ar : wStatus.en}</span><span>·</span><span>{ar ? w.assigneeAr : w.assigneeEn}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center"><Briefcase size={16} className="text-muted-foreground/40" strokeWidth={1.5} /></div>
                <p className="text-[13px] text-muted-foreground/60">{ar ? "لا يوجد عمل مرتبط" : "No related work items"}</p>
                <button onClick={() => navigate("/work")} className="mt-3 text-[12px] text-primary hover:underline">{ar ? "انتقل إلى العمل" : "Go to Work"}</button>
              </div>
            )}
          </Section>
        )}

        {/* RELATED */}
        {activeTab === "related" && (
          <div className="space-y-4">
            <Section title={ar ? "السجلات المرتبطة" : "Related Records"}>
              <RelatedRecords entityType="deal" entityId={deal.id} />
            </Section>
            <BacklinksSection entityType="deal" entityId={deal.id} />
          </div>
        )}

        {/* FINANCIAL */}
        {activeTab === "financial" && (
          <div className="space-y-6">
            <Section title={ar ? "الملخص المالي" : "Financial Summary"}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border/20">
                {[
                  { value: fmtVal(deal.value, deal.currency), label: ar ? "قيمة الصفقة" : "Deal Value" },
                  { value: `${deal.probability}%`, label: ar ? "الاحتمالية" : "Probability" },
                  { value: fmtVal(Math.round(weightedValue), deal.currency), label: ar ? "القيمة المرجحة" : "Weighted Value" },
                ].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-6 flex flex-col gap-2">
                    <p className="text-[24px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={ar ? "شروط التسعير" : "Pricing Terms"}>
              <div className="divide-y divide-border/25">
                <DetailRow icon={DollarSign} label={ar ? "العملة" : "Currency"} value={deal.currency} />
                <DetailRow icon={Calendar} label={ar ? "الإغلاق المتوقع" : "Expected Close"} value={ar ? deal.expectedCloseDateAr : deal.expectedCloseDateEn} />
                <DetailRow icon={TrendingUp} label={ar ? "المرحلة" : "Stage"} value={
                  <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${stageMeta.dot}`} />{ar ? stageMeta.ar : stageMeta.en}</div>
                } />
              </div>
            </Section>
          </div>
        )}
      </div>

      <AddNoteModal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} onAdd={handleAddNote} lang={lang} />

      <ContextPanel
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        entityType="deal"
        entityId={deal.id}
        titleEn={deal.titleEn}
        titleAr={deal.titleAr}
      />
    </div>
  );
}
