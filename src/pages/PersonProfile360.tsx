import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { RelatedRecords, BacklinksSection } from "../components/RelatedRecords";
import { ContextPanel } from "../components/ContextPanel";
import {
  PEOPLE, STATUS_META, TYPE_META,
  type Person, type NoteItem as PeopleNoteItem,
} from "../data/people";
import { loadDeals, formatCurrency, formatCurrencyAr, STAGE_META, type Deal } from "../data/sales";
import { loadWorkItems, STATUS_META as WORK_STATUS_META, KIND_META, type WorkItem } from "../data/work";
import { ORGANIZATIONS, ORG_TYPE_META, ORG_RELATIONSHIP_META } from "../data/organizations";
import {
  ArrowLeft, ChevronRight, User, Building2, Globe, Mail, Phone,
  MapPin, Calendar, Clock, Star, Briefcase, ShoppingBag,
  FileText, StickyNote, Activity, Sparkles, TrendingUp,
  AlertTriangle, CheckCircle2, Target, DollarSign, Zap, Shield,
  Plus, X, Check, Download, Upload, Linkedin,
  Image, FolderArchive, Sheet, Link2, MessageSquare,
  UserPlus, ArrowRightCircle, Heart, Eye, Brain,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab types ────────────────────────────────────────────

type PersonTab = "overview" | "timeline" | "organizations" | "sales" | "work" | "activity" | "files" | "notes" | "intelligence";

const TABS: { id: PersonTab; en: string; ar: string }[] = [
  { id: "overview",      en: "Overview",       ar: "نظرة عامة" },
  { id: "timeline",      en: "Timeline",       ar: "الجدول الزمني" },
  { id: "organizations", en: "Organizations",  ar: "المنظمات" },
  { id: "sales",         en: "Sales",          ar: "المبيعات" },
  { id: "work",          en: "Work",           ar: "العمل" },
  { id: "activity",      en: "Activity",       ar: "النشاط" },
  { id: "files",         en: "Files",          ar: "الملفات" },
  { id: "notes",         en: "Notes",          ar: "الملاحظات" },
  { id: "intelligence",  en: "Intelligence",   ar: "الذكاء" },
];

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

// ─── Relationship score badge ─────────────────────────────

function ScoreBadge({ score, ar }: { score: number; ar: boolean }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tabular-nums ${color}`}>
      <Heart size={10} strokeWidth={2} />{score}
    </span>
  );
}

// ─── Note type ────────────────────────────────────────────

interface NoteItem { id: string; authorEn: string; authorAr: string; contentEn: string; contentAr: string; dateEn: string; dateAr: string; }

// ─── Add Note Modal ───────────────────────────────────────

function AddNoteModal({ open, onClose, onAdd, lang }: { open: boolean; onClose: () => void; onAdd: (t: string) => void; lang: "en" | "ar" }) {
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

// ─── Compute relationship score ───────────────────────────

function computeRelScore(person: Person, deals: Deal[], work: WorkItem[]): number {
  let score = 40; // base
  if (person.status === "active") score += 15;
  if (person.metrics) score += 10;
  if (deals.length > 0) score += 15;
  if (work.length > 0) score += 10;
  if (person.activity && person.activity.length > 3) score += 10;
  return Math.min(score, 100);
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function PersonProfile360() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmtVal = ar ? formatCurrencyAr : formatCurrency;

  const person = PEOPLE.find((p) => p.id === id);
  const [activeTab, setActiveTab] = useState<PersonTab>("overview");
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);

  function showToast(msg: string) { setActionToast(msg); setTimeout(() => setActionToast(null), 2200); }

  function handleAddNote(text: string) {
    setLocalNotes((prev) => [{ id: `n-${Date.now()}`, authorEn: "You", authorAr: "أنت", contentEn: text, contentAr: text, dateEn: "Just now", dateAr: "الآن" }, ...prev]);
    showToast(ar ? "تمت إضافة الملاحظة" : "Note added");
  }

  if (!person) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center"><User size={20} className="text-muted-foreground" strokeWidth={1.5} /></div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "لم يُعثر على الشخص" : "Person not found"}</p>
        <button onClick={() => navigate("/people")} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"><ArrowLeft size={12} strokeWidth={2} />{ar ? "العودة" : "Back"}</button>
      </div>
    );
  }

  const statusMeta = STATUS_META[person.status];
  const typeMeta = TYPE_META[person.type];

  // ── Cross-module data ──
  const allDeals = loadDeals();
  const personDeals = allDeals.filter((d) =>
    d.contactNameEn.toLowerCase().includes(person.name.split(" ")[0].toLowerCase()) ||
    d.ownerEn.toLowerCase().includes(person.name.split(" ")[0].toLowerCase())
  );
  const activeDeals = personDeals.filter((d) => !["won", "lost"].includes(d.stage));
  const wonDeals = personDeals.filter((d) => d.stage === "won");
  const lostDeals = personDeals.filter((d) => d.stage === "lost");
  const totalInfluenced = personDeals.reduce((s, d) => s + d.value, 0);

  const allWork = loadWorkItems();
  const personWork = allWork.filter((w) =>
    w.assigneeEn.toLowerCase().includes(person.name.split(" ")[0].toLowerCase()) ||
    (w.relatedPersonNameEn && w.relatedPersonNameEn.toLowerCase().includes(person.name.split(" ")[0].toLowerCase()))
  );

  // Connected orgs
  const connectedOrgs = ORGANIZATIONS.filter((o) =>
    o.nameEn.toLowerCase().includes(person.company.split(" ")[0].toLowerCase()) ||
    person.company.toLowerCase().includes(o.nameEn.split(" ")[0].toLowerCase())
  );

  const relScore = computeRelScore(person, personDeals, personWork);

  // Notes from person data + local
  const existingNotes: NoteItem[] = (person.notes || []).map((n) => ({
    id: n.id, authorEn: n.authorEn, authorAr: n.authorAr,
    contentEn: n.textEn, contentAr: n.textAr,
    dateEn: n.dateEn, dateAr: n.dateAr,
  }));
  const allNotes = [...localNotes, ...existingNotes];

  // Files from person data
  const files = person.files || [];

  const FILE_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    pdf: { Icon: FileText, color: "text-rose-500", bg: "bg-rose-50" },
    doc: { Icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    xls: { Icon: Sheet, color: "text-emerald-600", bg: "bg-emerald-50" },
    img: { Icon: Image, color: "text-violet-500", bg: "bg-violet-50" },
    zip: { Icon: FolderArchive, color: "text-amber-500", bg: "bg-amber-50" },
  };

  // Timeline
  const timeline = [
    { id: "tl1", kind: "created", titleEn: "Contact created", titleAr: "تم إنشاء جهة الاتصال", descEn: `${person.name} was added as a ${typeMeta.en.toLowerCase()}.`, descAr: `تمت إضافة ${person.nameAr} كـ${typeMeta.ar}.`, dateEn: person.metrics?.sinceEn || "2022", dateAr: person.metrics?.sinceAr || "٢٠٢٢" },
    { id: "tl2", kind: "contact", titleEn: "First contact established", titleAr: "تم تأسيس أول اتصال", descEn: `Initial outreach via email to ${person.email}.`, descAr: `تواصل أولي عبر البريد إلى ${person.email}.`, dateEn: person.metrics?.sinceEn || "2022", dateAr: person.metrics?.sinceAr || "٢٠٢٢" },
    ...(personDeals.length > 0 ? [{ id: "tl3", kind: "deal", titleEn: `${personDeals.length} opportunity(s) created`, titleAr: `تم إنشاء ${personDeals.length} فرصة`, descEn: `Total influenced: ${formatCurrency(totalInfluenced, "SAR")}`, descAr: `إجمالي التأثير: ${formatCurrencyAr(totalInfluenced, "SAR")}`, dateEn: "2025", dateAr: "٢٠٢٥" }] : []),
    ...(personWork.length > 0 ? [{ id: "tl4", kind: "work", titleEn: `${personWork.length} work item(s) assigned`, titleAr: `تم تعيين ${personWork.length} عنصر عمل`, dateEn: "2025", dateAr: "٢٠٢٥" }] : []),
    { id: "tl5", kind: "note", titleEn: "Notes added", titleAr: "تمت إضافة ملاحظات", dateEn: person.lastContactEn, dateAr: person.lastContactAr },
  ];

  const TL_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    created: { Icon: UserPlus, color: "text-primary", bg: "bg-primary/8" },
    contact: { Icon: Mail, color: "text-violet-500", bg: "bg-violet-50" },
    deal: { Icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    work: { Icon: Briefcase, color: "text-amber-500", bg: "bg-amber-50" },
    note: { Icon: StickyNote, color: "text-blue-500", bg: "bg-blue-50" },
    meeting: { Icon: Calendar, color: "text-cyan-600", bg: "bg-cyan-50" },
  };

  // Activity — merge person's own activity + cross-module
  const activityEvents = [
    ...(person.activity || []).slice(0, 4).map((a, i) => ({
      id: `pa-${i}`, kind: a.kind, titleEn: a.textEn, titleAr: a.textAr, dateEn: a.dateEn, dateAr: a.dateAr,
    })),
    ...(personDeals.length > 0 ? [{ id: "da1", kind: "deal" as const, titleEn: `Deal "${personDeals[0].titleEn}" — ${STAGE_META[personDeals[0].stage].en}`, titleAr: `صفقة "${personDeals[0].titleAr}" — ${STAGE_META[personDeals[0].stage].ar}`, dateEn: "Aug 2025", dateAr: "أغسطس ٢٠٢٥" }] : []),
    ...(personWork.length > 0 ? [{ id: "wa1", kind: "work" as const, titleEn: `Work "${personWork[0].titleEn}" — ${personWork[0].progress}%`, titleAr: `عمل "${personWork[0].titleAr}" — ${personWork[0].progress}%`, dateEn: "Aug 2025", dateAr: "أغسطس ٢٠٢٥" }] : []),
  ];

  const ACT_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    email: { Icon: Mail, color: "text-primary", bg: "bg-primary/8" },
    call: { Icon: Phone, color: "text-violet-500", bg: "bg-violet-50" },
    meeting: { Icon: Calendar, color: "text-cyan-600", bg: "bg-cyan-50" },
    payment: { Icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    order: { Icon: ShoppingBag, color: "text-amber-500", bg: "bg-amber-50" },
    note: { Icon: StickyNote, color: "text-blue-500", bg: "bg-blue-50" },
    contract: { Icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    added: { Icon: UserPlus, color: "text-muted-foreground", bg: "bg-muted" },
    deal: { Icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    work: { Icon: Briefcase, color: "text-amber-500", bg: "bg-amber-50" },
  };

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
          <button onClick={() => navigate("/people")} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            {ar ? "الأشخاص" : "People"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70 truncate max-w-[200px]">{ar ? person.nameAr : person.name}</span>
          </button>
        </div>

        <div className="px-8 md:px-10 pt-5 pb-6 max-w-[960px]">
          <div className="flex items-start gap-5 mb-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[16px] font-semibold shrink-0 ${person.avatarColor}`}>
              {initials(ar ? person.nameAr : person.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${typeMeta.pill}`}>{ar ? typeMeta.ar : typeMeta.en}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  <span className="text-[11px] text-muted-foreground">{ar ? statusMeta.ar : statusMeta.en}</span>
                </div>
                <ScoreBadge score={relScore} ar={ar} />
              </div>
              <h1 className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
                {ar ? person.nameAr : person.name}
              </h1>
              <p className="text-[13px] text-muted-foreground">
                {ar ? person.roleAr : person.role}
                <span className="mx-2 text-border">·</span>
                <Building2 size={10} strokeWidth={1.75} className="inline text-muted-foreground/60" /> {ar ? person.companyAr : person.company}
                {person.city && <><span className="mx-2 text-border">·</span><MapPin size={10} strokeWidth={1.75} className="inline text-muted-foreground/60" /> {ar ? `${person.cityAr}, ${person.countryAr}` : `${person.city}, ${person.country}`}</>}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { value: String(personDeals.length), label: ar ? "صفقات" : "Deals" },
              { value: String(personWork.length), label: ar ? "عمل" : "Work" },
              { value: person.metrics ? String(person.metrics.transactionCount) : "0", label: ar ? "معاملات" : "Transactions" },
              { value: String(relScore), label: ar ? "العلاقة" : "Score" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-[18px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}

            <button
              onClick={() => setContextPanelOpen(true)}
              className="ms-auto flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Brain size={13} strokeWidth={1.75} />
              {ar ? "الاتصالات" : "Connections"}
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
            {person.bioEn && (
              <Section title={ar ? "نبذة" : "About"}>
                <div className="px-6 py-5">
                  <p className="text-[14px] text-foreground/85 leading-[1.8] max-w-[680px]" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? person.bioAr : person.bioEn}</p>
                </div>
              </Section>
            )}

            <Section title={ar ? "التفاصيل" : "Details"}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/25">
                <div className="divide-y divide-border/25">
                  <DetailRow icon={User} label={ar ? "الاسم" : "Name"} value={ar ? person.nameAr : person.name} />
                  <DetailRow icon={Briefcase} label={ar ? "الدور" : "Role"} value={ar ? person.roleAr : person.role} />
                  <DetailRow icon={Building2} label={ar ? "المنظمة" : "Organization"} value={ar ? person.companyAr : person.company} />
                  <DetailRow icon={Heart} label={ar ? "نقاط العلاقة" : "Relationship Score"} value={<ScoreBadge score={relScore} ar={ar} />} />
                </div>
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Mail} label={ar ? "البريد" : "Email"} value={person.email} />
                  <DetailRow icon={Phone} label={ar ? "الهاتف" : "Phone"} value={person.phone} />
                  {person.city && <DetailRow icon={MapPin} label={ar ? "الموقع" : "Location"} value={ar ? `${person.cityAr}, ${person.countryAr}` : `${person.city}, ${person.country}`} />}
                  {person.linkedin && <DetailRow icon={Linkedin} label="LinkedIn" value={person.linkedin} />}
                </div>
              </div>
            </Section>

            {/* Metrics strip */}
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: person.metrics?.totalValue || "—", label: ar ? "القيمة الإجمالية" : "Total Value" },
                  { value: String(personDeals.length), label: ar ? "الصفقات" : "Deals" },
                  { value: String(personWork.length), label: ar ? "عناصر العمل" : "Work Items" },
                  { value: person.lastContactEn, label: ar ? "آخر تواصل" : "Last Contact" },
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
                const { Icon, color, bg } = TL_ICONS[ev.kind] || TL_ICONS.note;
                const isLast = i === timeline.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p>
                      {"descEn" in ev && ev.descEn && <p className="text-[12px] text-muted-foreground/80 mt-1">{ar ? (ev as any).descAr : ev.descEn}</p>}
                      <p className="text-[11px] text-muted-foreground/60 mt-1">{ar ? ev.dateAr : ev.dateEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ORGANIZATIONS */}
        {activeTab === "organizations" && (
          <Section title={ar ? "المنظمات المرتبطة" : "Connected Organizations"}>
            {connectedOrgs.length > 0 ? (
              <div className="divide-y divide-border/25">
                {connectedOrgs.map((o) => {
                  const rm = ORG_RELATIONSHIP_META[o.relationship];
                  return (
                    <div key={o.id} onClick={() => navigate(`/organizations/${o.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-semibold shrink-0 ${o.avatarColor}`}>{initials(ar ? o.nameAr : o.nameEn)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${rm.pill}`}>{ar ? rm.ar : rm.en}</span>
                          <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? o.nameAr : o.nameEn}</h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{ar ? o.industryAr : o.industryEn}</p>
                      </div>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Building2 size={15} strokeWidth={1.75} className="text-amber-600" /></div>
                  <div><p className="text-[13px] font-medium text-foreground">{ar ? person.companyAr : person.company}</p><p className="text-[11px] text-muted-foreground">{ar ? "المنظمة الأساسية" : "Primary Organization"}</p></div>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* SALES */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: String(activeDeals.length), label: ar ? "نشطة" : "Active" },
                  { value: String(wonDeals.length), label: ar ? "فائزة" : "Won" },
                  { value: String(lostDeals.length), label: ar ? "خاسرة" : "Lost" },
                  { value: fmtVal(totalInfluenced, "SAR"), label: ar ? "القيمة المؤثرة" : "Influenced" },
                ].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
                    <p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Section title={ar ? "الصفقات" : "Opportunities"}>
              {personDeals.length > 0 ? (
                <div className="divide-y divide-border/25">
                  {personDeals.map((deal) => {
                    const sm = STAGE_META[deal.stage];
                    return (
                      <div key={deal.id} onClick={() => navigate(`/sales/${deal.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><DollarSign size={14} strokeWidth={1.75} className="text-emerald-600" /></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? deal.titleAr : deal.titleEn}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><div className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} /><span>{ar ? sm.ar : sm.en}</span></div>
                        </div>
                        <span className="text-[13px] font-semibold text-foreground tabular-nums shrink-0 hidden sm:block" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(deal.value, deal.currency)}</span>
                        <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد صفقات" : "No deals linked"}</p></div>
              )}
            </Section>
          </div>
        )}

        {/* WORK */}
        {activeTab === "work" && (
          <Section title={ar ? "عمل مرتبط" : "Connected Work"}>
            {personWork.length > 0 ? (
              <div className="divide-y divide-border/25">
                {personWork.map((w) => {
                  const ws = WORK_STATUS_META[w.status]; const wk = KIND_META[w.kind];
                  return (
                    <div key={w.id} onClick={() => navigate(`/work/${w.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Briefcase size={14} strokeWidth={1.75} className="text-amber-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${wk.pill}`}>{ar ? wk.ar : wk.en}</span>
                          <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? w.titleAr : w.titleEn}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><div className={`w-1.5 h-1.5 rounded-full ${ws.dot}`} /><span>{ar ? ws.ar : ws.en}</span><span>·</span><span>{w.progress}%</span></div>
                      </div>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا يوجد عمل مرتبط" : "No work items linked"}</p></div>
            )}
          </Section>
        )}

        {/* ACTIVITY */}
        {activeTab === "activity" && (
          <Section title={ar ? "النشاط الموحد" : "Unified Activity"}>
            <div className="px-6 py-2">
              {activityEvents.map((ev, i) => {
                const { Icon, color, bg } = ACT_ICONS[ev.kind] || ACT_ICONS.note;
                const isLast = i === activityEvents.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1">{ar ? ev.dateAr : ev.dateEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* FILES */}
        {activeTab === "files" && (
          <Section title={ar ? "الملفات" : "Files"}>
            {files.length > 0 ? (
              <div className="divide-y divide-border/25">
                {files.map((file) => {
                  const fm = FILE_ICONS[file.kind] || FILE_ICONS.doc;
                  return (
                    <div key={file.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/15 transition-colors">
                      <div className={`w-9 h-9 rounded-xl ${fm.bg} flex items-center justify-center shrink-0`}><fm.Icon size={15} strokeWidth={1.75} className={fm.color} /></div>
                      <div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-foreground truncate">{ar ? file.nameAr : file.nameEn}</p><p className="text-[11px] text-muted-foreground">{file.size} · {ar ? file.dateAr : file.dateEn}</p></div>
                      <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors shrink-0"><Download size={13} strokeWidth={1.75} /></button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد ملفات" : "No files attached"}</p></div>
            )}
          </Section>
        )}

        {/* NOTES */}
        {activeTab === "notes" && (
          <Section title={ar ? "الملاحظات" : "Notes"} action={
            <button onClick={() => setNoteModalOpen(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"><Plus size={12} strokeWidth={2.5} />{ar ? "إضافة" : "Add"}</button>
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

        {/* INTELLIGENCE */}
        {activeTab === "intelligence" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 mb-2">
              <Sparkles size={14} strokeWidth={1.75} className="text-primary" />
              <h3 className="text-[13px] font-medium text-foreground">{ar ? "ذكاء العلاقة" : "Relationship Intelligence"}</h3>
              <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "ذكاء اصطناعي" : "AI-powered"}</span>
            </div>

            <div className="border border-border/40 rounded-xl bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border/30">
                <Brain size={13} strokeWidth={1.75} className="text-primary/70" />
                <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">{ar ? "الاتصالات" : "Connections"}</h3>
              </div>
              <RelatedRecords entityType="person" entityId={person.id} />
            </div>
            <BacklinksSection entityType="person" entityId={person.id} />

            {[
              {
                icon: Heart, color: relScore >= 70 ? "text-emerald-600" : "text-amber-600", bg: relScore >= 70 ? "bg-emerald-50" : "bg-amber-50",
                titleEn: "Relationship Strength", titleAr: "قوة العلاقة",
                valueEn: relScore >= 80 ? "Strong — active engagement" : relScore >= 60 ? "Moderate — needs nurturing" : "Weak — re-engage urgently",
                valueAr: relScore >= 80 ? "قوية — مشاركة نشطة" : relScore >= 60 ? "متوسطة — تحتاج رعاية" : "ضعيفة — أعد التواصل بشكل عاجل",
                descEn: `Score: ${relScore}/100. ${relScore >= 70 ? "Regular touchpoints are maintaining this relationship well." : "Consider scheduling a personal check-in this week."}`,
                descAr: `النقاط: ${relScore}/١٠٠. ${relScore >= 70 ? "نقاط الاتصال المنتظمة تحافظ على هذه العلاقة جيداً." : "فكر في جدولة متابعة شخصية هذا الأسبوع."}`,
              },
              {
                icon: TrendingUp, color: "text-primary", bg: "bg-primary/8",
                titleEn: "Engagement Trend", titleAr: "اتجاه المشاركة",
                valueEn: (person.activity?.length || 0) > 3 ? "Increasing — 4+ recent interactions" : "Stable — maintain current cadence",
                valueAr: (person.activity?.length || 0) > 3 ? "متزايد — أكثر من ٤ تفاعلات حديثة" : "مستقر — حافظ على الإيقاع الحالي",
                descEn: `Last contact: ${person.lastContactEn}. ${personDeals.length > 0 ? `${personDeals.length} active deal(s) driving engagement.` : "No active deals — consider proactive outreach."}`,
                descAr: `آخر تواصل: ${person.lastContactAr}. ${personDeals.length > 0 ? `${personDeals.length} صفقة نشطة تدفع المشاركة.` : "لا صفقات نشطة — فكر في تواصل استباقي."}`,
              },
              {
                icon: activeDeals.length > 0 ? Target : Shield,
                color: activeDeals.length > 0 ? "text-amber-600" : "text-muted-foreground",
                bg: activeDeals.length > 0 ? "bg-amber-50" : "bg-muted",
                titleEn: "Opportunities at Risk", titleAr: "الفرص المعرضة للخطر",
                valueEn: activeDeals.length > 0 ? `${activeDeals.length} open deal(s) worth ${formatCurrency(activeDeals.reduce((s, d) => s + d.value, 0), "SAR")}` : "No open deals — relationship is non-commercial currently",
                valueAr: activeDeals.length > 0 ? `${activeDeals.length} صفقة مفتوحة بقيمة ${formatCurrencyAr(activeDeals.reduce((s, d) => s + d.value, 0), "SAR")}` : "لا صفقات مفتوحة — العلاقة غير تجارية حالياً",
                descEn: activeDeals.length > 0 ? "Monitor deal progress and maintain champion relationship." : "Consider re-engagement or referral opportunity.",
                descAr: activeDeals.length > 0 ? "راقب تقدم الصفقات وحافظ على علاقة البطل." : "فكر في إعادة التواصل أو فرصة إحالة.",
              },
              {
                icon: Zap, color: "text-violet-600", bg: "bg-violet-50",
                titleEn: "Recommended Next Action", titleAr: "الإجراء التالي الموصى به",
                valueEn: personDeals.length > 0 ? "Follow up on active proposals" : personWork.length > 0 ? "Check work delivery progress" : "Schedule a catch-up call",
                valueAr: personDeals.length > 0 ? "متابعة العروض النشطة" : personWork.length > 0 ? "التحقق من تقدم تسليم العمل" : "جدولة مكالمة متابعة",
                descEn: `Best channel: ${person.email ? "Email" : "Phone"}. Optimal timing: this week.`,
                descAr: `أفضل قناة: ${person.email ? "البريد الإلكتروني" : "الهاتف"}. التوقيت الأمثل: هذا الأسبوع.`,
              },
            ].map((card, i) => (
              <div key={i} className="border border-border/40 rounded-xl bg-background overflow-hidden p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}><card.icon size={18} strokeWidth={1.75} className={card.color} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? card.titleAr : card.titleEn}</p>
                    <p className="text-[14px] font-medium text-foreground leading-snug mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>{ar ? card.valueAr : card.valueEn}</p>
                    <p className="text-[12px] text-muted-foreground/70 leading-relaxed">{ar ? card.descAr : card.descEn}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddNoteModal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} onAdd={handleAddNote} lang={lang} />

      <ContextPanel
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        entityType="person"
        entityId={person.id}
        titleEn={person.name}
        titleAr={person.nameAr}
      />
    </div>
  );
}
