import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { RelatedRecords, BacklinksSection } from "../components/RelatedRecords";
import { ContextPanel } from "../components/ContextPanel";
import {
  ORGANIZATIONS, ORG_TYPE_META, ORG_STATUS_META, ORG_RELATIONSHIP_META, ORG_LIFECYCLE_META,
  totalDepartments, totalTeams,
  type Organization,
} from "../data/organizations";
import { loadDeals, formatCurrency, formatCurrencyAr, STAGE_META, type Deal } from "../data/sales";
import { loadWorkItems, STATUS_META as WORK_STATUS_META, KIND_META, type WorkItem } from "../data/work";
import {
  ArrowLeft, ChevronRight, Building2, Globe, Mail, Phone, MapPin,
  Users, Calendar, Clock, Star, Briefcase, ShoppingBag,
  FileText, StickyNote, Activity, Sparkles, TrendingUp,
  AlertTriangle, CheckCircle2, Target, DollarSign, ArrowRightCircle,
  Plus, X, Check, Download, Upload,
  Image, FolderArchive, Sheet, Link2, Eye, Zap, Shield, Brain,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab types ────────────────────────────────────────────

type OrgTab = "overview" | "timeline" | "people" | "sales" | "work" | "activity" | "files" | "notes" | "intelligence";

const TABS: { id: OrgTab; en: string; ar: string }[] = [
  { id: "overview",     en: "Overview",      ar: "نظرة عامة" },
  { id: "timeline",     en: "Timeline",      ar: "الجدول الزمني" },
  { id: "people",       en: "People",        ar: "الأشخاص" },
  { id: "sales",        en: "Sales",         ar: "المبيعات" },
  { id: "work",         en: "Work",          ar: "العمل" },
  { id: "activity",     en: "Activity",      ar: "النشاط" },
  { id: "files",        en: "Files",         ar: "الملفات" },
  { id: "notes",        en: "Notes",         ar: "الملاحظات" },
  { id: "intelligence", en: "Intelligence",  ar: "الذكاء" },
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

// ─── Health score badge ───────────────────────────────────

function HealthBadge({ score, ar }: { score: number; ar: boolean }) {
  const color = score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : score >= 60 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tabular-nums ${color}`}>
      <Star size={10} strokeWidth={2} />
      {score}
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

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function OrganizationProfile360() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmtVal = ar ? formatCurrencyAr : formatCurrency;

  const org = ORGANIZATIONS.find((o) => o.id === id);
  const [activeTab, setActiveTab] = useState<OrgTab>("overview");
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);

  function showToast(msg: string) { setActionToast(msg); setTimeout(() => setActionToast(null), 2200); }

  function handleAddNote(text: string) {
    setLocalNotes((prev) => [{ id: `n-${Date.now()}`, authorEn: "You", authorAr: "أنت", contentEn: text, contentAr: text, dateEn: "Just now", dateAr: "الآن" }, ...prev]);
    showToast(ar ? "تمت إضافة الملاحظة" : "Note added");
  }

  if (!org) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center"><Building2 size={20} className="text-muted-foreground" strokeWidth={1.5} /></div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "لم يُعثر على المنظمة" : "Organization not found"}</p>
        <button onClick={() => navigate("/organizations")} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"><ArrowLeft size={12} strokeWidth={2} />{ar ? "العودة" : "Back"}</button>
      </div>
    );
  }

  const typeMeta = ORG_TYPE_META[org.type];
  const statusMeta = ORG_STATUS_META[org.status];
  const relMeta = ORG_RELATIONSHIP_META[org.relationship];
  const lcMeta = ORG_LIFECYCLE_META[org.lifecycle];
  const depts = totalDepartments(org);
  const teams = totalTeams(org);
  const hqBranch = org.branches.find((b) => b.isHQ) || org.branches[0];

  // ── Cross-module data (name-based matching) ──
  const allDeals = loadDeals();
  const orgDeals = allDeals.filter((d) => d.orgNameEn && org.nameEn.toLowerCase().includes(d.orgNameEn.split(" ")[0].toLowerCase()) || d.orgNameEn?.toLowerCase().includes(org.nameEn.split(" ")[0].toLowerCase()));
  const activeDeals = orgDeals.filter((d) => !["won", "lost"].includes(d.stage));
  const wonDeals = orgDeals.filter((d) => d.stage === "won");
  const lostDeals = orgDeals.filter((d) => d.stage === "lost");
  const pipelineValue = activeDeals.reduce((s, d) => s + d.value, 0);
  const totalRevenue = wonDeals.reduce((s, d) => s + d.value, 0);

  const allWork = loadWorkItems();
  const orgWork = allWork.filter((w) => w.relatedOrgNameEn && org.nameEn.toLowerCase().includes(w.relatedOrgNameEn.split(" ")[0].toLowerCase()) || w.relatedOrgNameEn?.toLowerCase().includes(org.nameEn.split(" ")[0].toLowerCase()));

  // People from departments
  const keyPeople: { nameEn: string; nameAr: string; roleEn: string; roleAr: string }[] = [];
  org.branches.forEach((b) => b.departments.forEach((d) => {
    if (d.leadEn) keyPeople.push({ nameEn: d.leadEn, nameAr: d.leadAr || d.leadEn, roleEn: `${d.nameEn} Lead`, roleAr: `رئيس ${d.nameAr}` });
  }));

  // Sample notes
  const sampleNotes: NoteItem[] = [
    { id: "sn1", authorEn: org.ownerEn, authorAr: org.ownerAr, contentEn: `Quarterly review completed for ${org.nameEn}. All KPIs on track. Renewal discussion scheduled for next month.`, contentAr: `تمت المراجعة الربعية لـ ${org.nameAr}. جميع مؤشرات الأداء في المسار. مناقشة التجديد مجدولة للشهر القادم.`, dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥" },
    { id: "sn2", authorEn: "Admin", authorAr: "المدير", contentEn: "Updated contact information and verified billing address. New procurement contact added.", contentAr: "تم تحديث معلومات الاتصال والتحقق من عنوان الفواتير. تمت إضافة جهة اتصال مشتريات جديدة.", dateEn: "Jul 20, 2025", dateAr: "٢٠ يوليو ٢٠٢٥" },
  ];
  const allNotes = [...localNotes, ...sampleNotes];

  // Sample files
  const sampleFiles = [
    { id: "f1", nameEn: "Master Service Agreement.pdf", nameAr: "اتفاقية الخدمات الرئيسية.pdf", kind: "pdf" as const, sizeEn: "3.2 MB", sizeAr: "٣.٢ م.ب" },
    { id: "f2", nameEn: "Company Profile.pdf", nameAr: "ملف الشركة.pdf", kind: "pdf" as const, sizeEn: "1.8 MB", sizeAr: "١.٨ م.ب" },
    { id: "f3", nameEn: "Price List 2025.xlsx", nameAr: "قائمة الأسعار ٢٠٢٥.xlsx", kind: "xls" as const, sizeEn: "450 KB", sizeAr: "٤٥٠ ك.ب" },
    { id: "f4", nameEn: "Office Photos.zip", nameAr: "صور المكتب.zip", kind: "zip" as const, sizeEn: "22 MB", sizeAr: "٢٢ م.ب" },
  ];
  const FILE_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    pdf: { Icon: FileText, color: "text-rose-500", bg: "bg-rose-50" },
    xls: { Icon: Sheet, color: "text-emerald-600", bg: "bg-emerald-50" },
    zip: { Icon: FolderArchive, color: "text-amber-500", bg: "bg-amber-50" },
    doc: { Icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  };

  // Timeline
  const timeline = [
    { id: "tl1", kind: "created", titleEn: "Organization created", titleAr: "تم إنشاء المنظمة", descEn: `${org.nameEn} was added to the system.`, descAr: `تمت إضافة ${org.nameAr} إلى النظام.`, dateEn: `Est. ${org.founded}`, dateAr: `تأسست ${org.founded}` },
    { id: "tl2", kind: "contact", titleEn: "First contact established", titleAr: "تم تأسيس أول اتصال", dateEn: "Jul 2025", dateAr: "يوليو ٢٠٢٥" },
    ...(orgDeals.length > 0 ? [{ id: "tl3", kind: "deal", titleEn: `${orgDeals.length} opportunity(s) created`, titleAr: `تم إنشاء ${orgDeals.length} فرصة(فرص)`, descEn: `Total pipeline: ${formatCurrency(pipelineValue + totalRevenue, "SAR")}`, descAr: `إجمالي خط المبيعات: ${formatCurrencyAr(pipelineValue + totalRevenue, "SAR")}`, dateEn: "Jul-Aug 2025", dateAr: "يوليو-أغسطس ٢٠٢٥" }] : []),
    ...(orgWork.length > 0 ? [{ id: "tl4", kind: "work", titleEn: `${orgWork.length} work item(s) created`, titleAr: `تم إنشاء ${orgWork.length} عنصر(عناصر) عمل`, dateEn: "Aug 2025", dateAr: "أغسطس ٢٠٢٥" }] : []),
    { id: "tl5", kind: "note", titleEn: "Notes added", titleAr: "تمت إضافة ملاحظات", dateEn: "Aug 2025", dateAr: "أغسطس ٢٠٢٥" },
  ];

  const TL_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    created: { Icon: Plus, color: "text-primary", bg: "bg-primary/8" },
    contact: { Icon: Users, color: "text-violet-500", bg: "bg-violet-50" },
    deal: { Icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    work: { Icon: Briefcase, color: "text-amber-500", bg: "bg-amber-50" },
    note: { Icon: StickyNote, color: "text-blue-500", bg: "bg-blue-50" },
  };

  // Activity
  const activityEvents = [
    ...(orgDeals.length > 0 ? [{ id: "ae1", kind: "deal", titleEn: `Deal "${orgDeals[0].titleEn}" updated`, titleAr: `تم تحديث صفقة "${orgDeals[0].titleAr}"`, descEn: `Stage: ${STAGE_META[orgDeals[0].stage].en}`, descAr: `المرحلة: ${STAGE_META[orgDeals[0].stage].ar}`, dateEn: "Aug 2025", dateAr: "أغسطس ٢٠٢٥" }] : []),
    ...(orgWork.length > 0 ? [{ id: "ae2", kind: "work", titleEn: `Work "${orgWork[0].titleEn}" in progress`, titleAr: `العمل "${orgWork[0].titleAr}" قيد التنفيذ`, descEn: `Progress: ${orgWork[0].progress}%`, descAr: `التقدم: ${orgWork[0].progress}%`, dateEn: "Aug 2025", dateAr: "أغسطس ٢٠٢٥" }] : []),
    { id: "ae3", kind: "note", titleEn: "Quarterly review note added", titleAr: "تمت إضافة ملاحظة المراجعة الربعية", descEn: `By ${org.ownerEn}`, descAr: `بواسطة ${org.ownerAr}`, dateEn: "Aug 1, 2025", dateAr: "١ أغسطس ٢٠٢٥" },
    { id: "ae4", kind: "status", titleEn: "Status verified: Active", titleAr: "تم التحقق من الحالة: نشطة", descEn: "Annual compliance check completed.", descAr: "اكتمل فحص الامتثال السنوي.", dateEn: "Jul 2025", dateAr: "يوليو ٢٠٢٥" },
  ];

  const ACT_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    deal: { Icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    work: { Icon: Briefcase, color: "text-amber-500", bg: "bg-amber-50" },
    note: { Icon: StickyNote, color: "text-blue-500", bg: "bg-blue-50" },
    status: { Icon: CheckCircle2, color: "text-primary", bg: "bg-primary/8" },
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
          <button onClick={() => navigate("/organizations")} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            {ar ? "المنظمات" : "Organizations"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70 truncate max-w-[200px]">{ar ? org.nameAr : org.nameEn}</span>
          </button>
        </div>

        <div className="px-8 md:px-10 pt-5 pb-6 max-w-[960px]">
          {/* Avatar + name */}
          <div className="flex items-start gap-5 mb-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[16px] font-semibold shrink-0 ${org.avatarColor}`}>
              {initials(ar ? org.nameAr : org.nameEn)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${relMeta.pill}`}>{ar ? relMeta.ar : relMeta.en}</span>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${typeMeta.pill}`}>{ar ? typeMeta.ar : typeMeta.en}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  <span className="text-[11px] text-muted-foreground">{ar ? statusMeta.ar : statusMeta.en}</span>
                </div>
                <HealthBadge score={org.healthScore} ar={ar} />
              </div>
              <h1 className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>
                {ar ? org.nameAr : org.nameEn}
              </h1>
              <p className="text-[13px] text-muted-foreground">
                {ar ? org.industryAr : org.industryEn}
                {hqBranch && <><span className="mx-2 text-border">·</span><MapPin size={10} strokeWidth={1.75} className="inline text-muted-foreground/60" /> {ar ? `${hqBranch.cityAr}, ${hqBranch.countryAr}` : `${hqBranch.cityEn}, ${hqBranch.countryEn}`}</>}
                <span className="mx-2 text-border">·</span>{ar ? `منذ ${org.founded}` : `Est. ${org.founded}`}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 mb-1">
            <button
              onClick={() => setContextPanelOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Brain size={13} strokeWidth={1.75} />
              {ar ? "الاتصالات" : "Connections"}
            </button>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-6 flex-wrap">
            {[
              { value: org.headcount.toLocaleString(), label: ar ? "موظف" : "People" },
              { value: String(org.branches.length), label: ar ? "فروع" : "Branches" },
              { value: String(depts), label: ar ? "أقسام" : "Depts" },
              { value: String(orgDeals.length), label: ar ? "صفقات" : "Deals" },
              { value: String(orgWork.length), label: ar ? "عمل" : "Work" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-[18px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
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
            <Section title={ar ? "عن المنظمة" : "About"}>
              <div className="px-6 py-5">
                <p className="text-[14px] text-foreground/85 leading-[1.8] max-w-[680px]" style={{ fontFamily: "var(--app-font-serif)" }}>
                  {ar ? org.descAr : org.descEn}
                </p>
              </div>
            </Section>

            <Section title={ar ? "التفاصيل" : "Details"}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/25">
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Building2} label={ar ? "النوع" : "Type"} value={<span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${typeMeta.pill}`}>{ar ? typeMeta.ar : typeMeta.en}</span>} />
                  <DetailRow icon={ShoppingBag} label={ar ? "العلاقة" : "Relationship"} value={<span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${relMeta.pill}`}>{ar ? relMeta.ar : relMeta.en}</span>} />
                  <DetailRow icon={Users} label={ar ? "المسؤول" : "Owner"} value={
                    <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? org.ownerAr : org.ownerEn)}</div>{ar ? org.ownerAr : org.ownerEn}</div>
                  } />
                  <DetailRow icon={Star} label={ar ? "نقاط الصحة" : "Health Score"} value={<HealthBadge score={org.healthScore} ar={ar} />} />
                </div>
                <div className="divide-y divide-border/25">
                  {org.website && <DetailRow icon={Globe} label={ar ? "الموقع" : "Website"} value={org.website} />}
                  {org.email && <DetailRow icon={Mail} label={ar ? "البريد" : "Email"} value={org.email} />}
                  {org.phone && <DetailRow icon={Phone} label={ar ? "الهاتف" : "Phone"} value={org.phone} />}
                  {org.addressEn && <DetailRow icon={MapPin} label={ar ? "العنوان" : "Address"} value={ar ? org.addressAr : org.addressEn} />}
                </div>
              </div>
            </Section>

            {/* Lifecycle + metrics */}
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: ar ? lcMeta.ar : lcMeta.en, label: ar ? "دورة الحياة" : "Lifecycle" },
                  { value: fmtVal(pipelineValue, "SAR"), label: ar ? "قيمة الخط" : "Pipeline" },
                  { value: fmtVal(totalRevenue, "SAR"), label: ar ? "الإيرادات" : "Revenue" },
                  { value: String(org.healthScore), label: ar ? "نقاط الصحة" : "Health" },
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
          <Section title={ar ? "الجدول الزمني" : "Business Timeline"}>
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

        {/* PEOPLE */}
        {activeTab === "people" && (
          <Section title={ar ? "جهات الاتصال الرئيسية" : "Key Contacts"}>
            {keyPeople.length > 0 ? (
              <div className="divide-y divide-border/25">
                {keyPeople.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center gap-3.5 px-6 py-4 hover:bg-muted/15 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">{initials(ar ? p.nameAr : p.nameEn)}</div>
                    <div><p className="text-[13px] font-medium text-foreground">{ar ? p.nameAr : p.nameEn}</p><p className="text-[11px] text-muted-foreground">{ar ? p.roleAr : p.roleEn}</p></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد جهات اتصال" : "No contacts found"}</p></div>
            )}
          </Section>
        )}

        {/* SALES */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: String(activeDeals.length), label: ar ? "صفقات نشطة" : "Active" },
                  { value: String(wonDeals.length), label: ar ? "فائزة" : "Won" },
                  { value: String(lostDeals.length), label: ar ? "خاسرة" : "Lost" },
                  { value: fmtVal(pipelineValue, "SAR"), label: ar ? "قيمة الخط" : "Pipeline" },
                ].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
                    <p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Section title={ar ? "الصفقات" : "Opportunities"}>
              {orgDeals.length > 0 ? (
                <div className="divide-y divide-border/25">
                  {orgDeals.map((deal) => {
                    const sm = STAGE_META[deal.stage];
                    return (
                      <div key={deal.id} onClick={() => navigate(`/sales/${deal.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><DollarSign size={14} strokeWidth={1.75} className="text-emerald-600" /></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? deal.titleAr : deal.titleEn}</h4>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><div className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} /><span>{ar ? sm.ar : sm.en}</span><span>·</span><span>{ar ? deal.ownerAr : deal.ownerEn}</span></div>
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
            {orgWork.length > 0 ? (
              <div className="divide-y divide-border/25">
                {orgWork.map((w) => {
                  const ws = WORK_STATUS_META[w.status];
                  const wk = KIND_META[w.kind];
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
                const { Icon, color, bg } = ACT_ICONS[ev.kind] || ACT_ICONS.status;
                const isLast = i === activityEvents.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p>
                      <p className="text-[12px] text-muted-foreground/70 mt-0.5">{ar ? ev.descAr : ev.descEn}</p>
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
          <Section title={ar ? "الملفات" : "Files"} action={
            <button onClick={() => showToast(ar ? "جارٍ فتح منتقي الملفات…" : "Opening file picker…")} className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"><Upload size={12} strokeWidth={2.5} />{ar ? "رفع" : "Upload"}</button>
          }>
            <div className="divide-y divide-border/25">
              {sampleFiles.map((file) => {
                const fm = FILE_ICONS[file.kind] || FILE_ICONS.doc;
                return (
                  <div key={file.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/15 transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${fm.bg} flex items-center justify-center shrink-0`}><fm.Icon size={15} strokeWidth={1.75} className={fm.color} /></div>
                    <div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-foreground truncate">{ar ? file.nameAr : file.nameEn}</p><p className="text-[11px] text-muted-foreground">{ar ? file.sizeAr : file.sizeEn}</p></div>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors shrink-0"><Download size={13} strokeWidth={1.75} /></button>
                  </div>
                );
              })}
            </div>
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
            <div className="border border-border/40 rounded-xl bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border/30">
                <Brain size={13} strokeWidth={1.75} className="text-primary/70" />
                <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">{ar ? "الاتصالات" : "Connections"}</h3>
              </div>
              <RelatedRecords entityType="organization" entityId={org.id} />
            </div>
            <BacklinksSection entityType="organization" entityId={org.id} />
            <div className="flex items-center gap-2.5 mb-2">
              <Sparkles size={14} strokeWidth={1.75} className="text-primary" />
              <h3 className="text-[13px] font-medium text-foreground">{ar ? "رؤى الأعمال" : "Business Insights"}</h3>
              <span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "ذكاء اصطناعي" : "AI-powered"}</span>
            </div>

            {/* Intelligence cards */}
            {[
              {
                icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50",
                titleEn: "Revenue Trend", titleAr: "اتجاه الإيرادات",
                valueEn: totalRevenue > 0 ? `${fmtVal(totalRevenue, "SAR")} closed revenue` : "No closed deals yet",
                valueAr: totalRevenue > 0 ? `${fmtVal(totalRevenue, "SAR")} إيرادات مغلقة` : "لا توجد صفقات مغلقة بعد",
                descEn: totalRevenue > 0 ? "This organization has strong purchasing history. Consider upsell opportunities." : "Focus on converting active pipeline opportunities to build revenue base.",
                descAr: totalRevenue > 0 ? "هذه المنظمة لديها سجل شراء قوي. فكر في فرص البيع الإضافي." : "ركز على تحويل فرص خط المبيعات النشطة لبناء قاعدة إيرادات.",
              },
              {
                icon: Target, color: "text-amber-600", bg: "bg-amber-50",
                titleEn: "Open Opportunities", titleAr: "الفرص المفتوحة",
                valueEn: `${activeDeals.length} active deal${activeDeals.length !== 1 ? "s" : ""} worth ${fmtVal(pipelineValue, "SAR")}`,
                valueAr: `${activeDeals.length} صفقة نشطة بقيمة ${fmtVal(pipelineValue, "SAR")}`,
                descEn: activeDeals.length > 0 ? "Pipeline is healthy. Prioritize deals in negotiation stage for faster close." : "No active pipeline. Consider initiating a new outreach campaign.",
                descAr: activeDeals.length > 0 ? "خط المبيعات صحي. أعطِ الأولوية للصفقات في مرحلة التفاوض للإغلاق الأسرع." : "لا يوجد خط مبيعات نشط. فكر في بدء حملة تواصل جديدة.",
              },
              {
                icon: org.healthScore >= 70 ? Shield : AlertTriangle,
                color: org.healthScore >= 70 ? "text-primary" : "text-rose-500",
                bg: org.healthScore >= 70 ? "bg-primary/8" : "bg-rose-50",
                titleEn: "Risk Assessment", titleAr: "تقييم المخاطر",
                valueEn: org.healthScore >= 80 ? "Low risk — strong engagement" : org.healthScore >= 60 ? "Medium risk — needs attention" : "High risk — engagement declining",
                valueAr: org.healthScore >= 80 ? "خطر منخفض — مشاركة قوية" : org.healthScore >= 60 ? "خطر متوسط — يحتاج اهتمام" : "خطر مرتفع — المشاركة في تراجع",
                descEn: `Health score: ${org.healthScore}/100. ${org.healthScore >= 70 ? "Continue regular touchpoints and QBRs." : "Schedule an executive review and address open issues immediately."}`,
                descAr: `نقاط الصحة: ${org.healthScore}/١٠٠. ${org.healthScore >= 70 ? "استمر في نقاط الاتصال المنتظمة والمراجعات الربعية." : "جدول مراجعة تنفيذية ومعالجة المشاكل المفتوحة فوراً."}`,
              },
              {
                icon: Zap, color: "text-violet-600", bg: "bg-violet-50",
                titleEn: "Recommended Next Action", titleAr: "الإجراء التالي الموصى به",
                valueEn: activeDeals.length > 0 ? "Follow up on active proposals" : orgWork.length > 0 ? "Check progress on active work" : "Schedule introductory meeting",
                valueAr: activeDeals.length > 0 ? "متابعة العروض النشطة" : orgWork.length > 0 ? "التحقق من تقدم العمل النشط" : "جدولة اجتماع تعريفي",
                descEn: `Owner: ${org.ownerEn}. Best time to act: this week.`,
                descAr: `المسؤول: ${org.ownerAr}. أفضل وقت للتصرف: هذا الأسبوع.`,
              },
            ].map((card, i) => (
              <div key={i} className="border border-border/40 rounded-xl bg-background overflow-hidden p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                    <card.icon size={18} strokeWidth={1.75} className={card.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? card.titleAr : card.titleEn}</p>
                    <p className="text-[14px] font-medium text-foreground leading-snug mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
                      {ar ? card.valueAr : card.valueEn}
                    </p>
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
        entityType="organization"
        entityId={org.id}
        titleEn={org.nameEn}
        titleAr={org.nameAr}
      />
    </div>
  );
}
