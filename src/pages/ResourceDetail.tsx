import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  loadResources, saveResources, fmtVal,
  RESOURCE_TYPE_META, RESOURCE_STATUS_META, MAINT_STATUS_META,
  type Resource, type ResourceStatus,
} from "../data/resources";
import { loadWorkItems, STATUS_META as W_SM, KIND_META, type WorkItem } from "../data/work";
import {
  ArrowLeft, ChevronRight, MapPin, User, Calendar, Clock,
  DollarSign, Gauge, Package, Wrench, Truck, Building2, FileCheck, Box,
  FileText, StickyNote, Plus, X, Check, Download, Upload,
  ArrowRightCircle, CheckCircle2, AlertTriangle, Briefcase,
  Sparkles, TrendingUp, Target, Shield, Zap, Eye,
  Image, FolderArchive, Sheet,
} from "lucide-react";

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

const TYPE_ICONS: Record<string, React.ElementType> = { equipment: Wrench, inventory: Box, vehicle: Truck, facility: Building2, license: FileCheck, other: Package };

type ResTab = "overview" | "timeline" | "assignments" | "maintenance" | "files" | "notes" | "activity";
const TABS: { id: ResTab; en: string; ar: string }[] = [
  { id: "overview",    en: "Overview",    ar: "نظرة عامة" },
  { id: "timeline",    en: "Timeline",    ar: "الجدول الزمني" },
  { id: "assignments", en: "Assignments", ar: "التعيينات" },
  { id: "maintenance", en: "Maintenance", ar: "الصيانة" },
  { id: "files",       en: "Files",       ar: "الملفات" },
  { id: "notes",       en: "Notes",       ar: "الملاحظات" },
  { id: "activity",    en: "Activity",    ar: "النشاط" },
];

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (<div className="border border-border/40 rounded-xl bg-background overflow-hidden"><div className="flex items-center justify-between px-6 py-4 border-b border-border/30"><h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">{title}</h3>{action}</div>{children}</div>);
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (<div className="flex items-center gap-3.5 px-6 py-3.5"><div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0"><Icon size={13} strokeWidth={1.75} className="text-muted-foreground" /></div><div className="flex-1 min-w-0"><p className="text-[10px] text-muted-foreground/70 mb-0.5">{label}</p><div className="text-[13px] text-foreground">{value}</div></div></div>);
}

interface NoteItem { id: string; authorEn: string; authorAr: string; contentEn: string; contentAr: string; dateEn: string; dateAr: string; }

function AddNoteModal({ open, onClose, onAdd, lang }: { open: boolean; onClose: () => void; onAdd: (t: string) => void; lang: "en" | "ar" }) {
  const ar = lang === "ar"; const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40"><h2 className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "إضافة ملاحظة" : "Add Note"}</h2><button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X size={14} strokeWidth={2} /></button></div>
        <div className="px-6 py-4"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={ar ? "اكتب…" : "Write…"} rows={4} autoFocus className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none" /></div>
        <div className="px-6 py-3 border-t border-border/40 flex justify-end gap-3"><button onClick={onClose} className="h-8 px-4 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">{ar ? "إلغاء" : "Cancel"}</button><button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); onClose(); } }} disabled={!text.trim()} className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">{ar ? "إضافة" : "Add"}</button></div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

export default function ResourceDetail() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmt = (v: number) => fmtVal(v, "SAR", ar ? "ar-SA" : "en-SA");

  const [allRes, setAllRes] = useState(loadResources);
  const res = allRes.find((r) => r.id === id);

  const [activeTab, setActiveTab] = useState<ResTab>("overview");
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  function showToast(msg: string) { setActionToast(msg); setTimeout(() => setActionToast(null), 2200); }

  function changeStatus(s: ResourceStatus) {
    setAllRes((prev) => { const u = prev.map((r) => r.id === id ? { ...r, status: s, utilization: s === "retired" ? 0 : s === "maintenance" ? 0 : r.utilization } : r); saveResources(u); return u; });
    setStatusMenuOpen(false);
    showToast(ar ? "تم تحديث الحالة" : "Status updated");
  }

  function handleAddNote(text: string) {
    setLocalNotes((prev) => [{ id: `n-${Date.now()}`, authorEn: "You", authorAr: "أنت", contentEn: text, contentAr: text, dateEn: "Just now", dateAr: "الآن" }, ...prev]);
    showToast(ar ? "تمت إضافة الملاحظة" : "Note added");
  }

  if (!res) {
    return (<div className="min-h-full flex flex-col items-center justify-center gap-4 p-8"><div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center"><Package size={20} className="text-muted-foreground" strokeWidth={1.5} /></div><p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "لم يُعثر على المورد" : "Resource not found"}</p><button onClick={() => navigate("/resources")} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"><ArrowLeft size={12} strokeWidth={2} />{ar ? "العودة" : "Back"}</button></div>);
  }

  const tm = RESOURCE_TYPE_META[res.type];
  const sm = RESOURCE_STATUS_META[res.status];
  const Icon = TYPE_ICONS[res.type] || Package;

  // Related work
  const allWork = loadWorkItems();
  const relWork: WorkItem[] = res.relatedWorkId ? allWork.filter((w) => w.id === res.relatedWorkId) : [];

  const sampleNotes: NoteItem[] = [{ id: "sn1", authorEn: res.ownerEn, authorAr: res.ownerAr, contentEn: `Asset ${res.nameEn} registered and operational. Annual maintenance schedule set.`, contentAr: `تم تسجيل الأصل ${res.nameAr} وهو قيد التشغيل. تم تحديد جدول الصيانة السنوي.`, dateEn: res.purchaseDateEn, dateAr: res.purchaseDateAr }];
  const allNotes = [...localNotes, ...sampleNotes];

  const sampleFiles = [
    { id: "f1", nameEn: "Purchase Invoice.pdf", nameAr: "فاتورة الشراء.pdf", kind: "pdf" as const, sizeEn: "1.8 MB", sizeAr: "١.٨ م.ب" },
    { id: "f2", nameEn: "Warranty Certificate.pdf", nameAr: "شهادة الضمان.pdf", kind: "pdf" as const, sizeEn: "450 KB", sizeAr: "٤٥٠ ك.ب" },
    { id: "f3", nameEn: "User Manual.pdf", nameAr: "دليل المستخدم.pdf", kind: "pdf" as const, sizeEn: "5.2 MB", sizeAr: "٥.٢ م.ب" },
  ];
  const FILE_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = { pdf: { Icon: FileText, color: "text-rose-500", bg: "bg-rose-50" }, xls: { Icon: Sheet, color: "text-emerald-600", bg: "bg-emerald-50" }, zip: { Icon: FolderArchive, color: "text-amber-500", bg: "bg-amber-50" } };

  const timeline = [
    { id: "tl1", kind: "purchase", titleEn: "Asset acquired", titleAr: "تم اقتناء الأصل", descEn: `${res.nameEn} purchased for ${fmt(res.value)}`, descAr: `تم شراء ${res.nameAr} بمبلغ ${fmt(res.value)}`, dateEn: res.purchaseDateEn, dateAr: res.purchaseDateAr },
    ...(res.assignedToEn ? [{ id: "tl2", kind: "assigned", titleEn: `Assigned to ${res.assignedToEn}`, titleAr: `تم التعيين إلى ${res.assignedToAr}`, dateEn: res.purchaseDateEn, dateAr: res.purchaseDateAr }] : []),
    ...res.maintenance.filter((m) => m.status === "completed").map((m, i) => ({ id: `tl-m${i}`, kind: "maintenance", titleEn: m.titleEn, titleAr: m.titleAr, descEn: m.costEn || "", descAr: m.costAr || "", dateEn: m.dateEn, dateAr: m.dateAr })),
    ...(res.status === "retired" ? [{ id: "tl-ret", kind: "retired", titleEn: "Asset retired", titleAr: "تم إيقاف الأصل", dateEn: "2025", dateAr: "٢٠٢٥" }] : []),
  ];

  const TL_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    purchase: { Icon: DollarSign, color: "text-primary", bg: "bg-primary/8" },
    assigned: { Icon: User, color: "text-violet-500", bg: "bg-violet-50" },
    maintenance: { Icon: Wrench, color: "text-amber-500", bg: "bg-amber-50" },
    retired: { Icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" },
  };

  const upcomingMaint = res.maintenance.filter((m) => m.status === "upcoming");
  const overdueMaint = res.maintenance.filter((m) => m.status === "overdue");
  const completedMaint = res.maintenance.filter((m) => m.status === "completed");

  // Intelligence
  const insights = [
    {
      icon: Gauge, color: res.utilization >= 60 ? "text-emerald-600" : "text-amber-600", bg: res.utilization >= 60 ? "bg-emerald-50" : "bg-amber-50",
      titleEn: "Utilization", titleAr: "الاستخدام",
      valueEn: res.utilization >= 70 ? `${res.utilization}% — Well utilized` : res.utilization >= 30 ? `${res.utilization}% — Moderate use` : `${res.utilization}% — Underutilized`,
      valueAr: res.utilization >= 70 ? `${res.utilization}% — مستخدم جيداً` : res.utilization >= 30 ? `${res.utilization}% — استخدام متوسط` : `${res.utilization}% — استخدام منخفض`,
      descEn: res.utilization < 40 ? "Consider reassigning or scheduling for additional work." : "Current utilization is healthy.",
      descAr: res.utilization < 40 ? "فكر في إعادة التعيين أو جدولة عمل إضافي." : "الاستخدام الحالي صحي.",
    },
    {
      icon: overdueMaint.length > 0 ? AlertTriangle : Shield,
      color: overdueMaint.length > 0 ? "text-rose-500" : "text-emerald-600",
      bg: overdueMaint.length > 0 ? "bg-rose-50" : "bg-emerald-50",
      titleEn: "Maintenance Risk", titleAr: "خطر الصيانة",
      valueEn: overdueMaint.length > 0 ? `${overdueMaint.length} overdue maintenance item(s)` : upcomingMaint.length > 0 ? `${upcomingMaint.length} upcoming — on schedule` : "No maintenance due",
      valueAr: overdueMaint.length > 0 ? `${overdueMaint.length} صيانة متأخرة` : upcomingMaint.length > 0 ? `${upcomingMaint.length} قادمة — في الموعد` : "لا صيانة مستحقة",
      descEn: overdueMaint.length > 0 ? "Schedule maintenance immediately to avoid equipment failure." : "Maintenance schedule is current.",
      descAr: overdueMaint.length > 0 ? "جدول الصيانة فوراً لتجنب عطل المعدات." : "جدول الصيانة محدّث.",
    },
    {
      icon: TrendingUp, color: "text-primary", bg: "bg-primary/8",
      titleEn: "Asset Value", titleAr: "قيمة الأصل",
      valueEn: `${fmt(res.value)} — ${res.status === "retired" ? "Pending disposal" : "Current book value"}`,
      valueAr: `${fmt(res.value)} — ${res.status === "retired" ? "بانتظار التخلص" : "القيمة الدفترية الحالية"}`,
      descEn: res.status === "retired" ? "Consider salvage value assessment." : "Asset is in service.",
      descAr: res.status === "retired" ? "فكر في تقييم قيمة الإنقاذ." : "الأصل قيد الخدمة.",
    },
    {
      icon: Zap, color: "text-violet-600", bg: "bg-violet-50",
      titleEn: "Recommended Action", titleAr: "الإجراء الموصى به",
      valueEn: overdueMaint.length > 0 ? "Schedule overdue maintenance" : res.utilization < 30 ? "Find new assignment" : res.status === "retired" ? "Process disposal" : "No action needed",
      valueAr: overdueMaint.length > 0 ? "جدول الصيانة المتأخرة" : res.utilization < 30 ? "ابحث عن تعيين جديد" : res.status === "retired" ? "معالجة التخلص" : "لا إجراء مطلوب",
      descEn: `Owner: ${res.ownerEn}.`,
      descAr: `المسؤول: ${res.ownerAr}.`,
    },
  ];

  return (
    <div className="min-h-full">
      {actionToast && (<div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-foreground text-background text-[13px] font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"><Check size={14} strokeWidth={2.5} />{actionToast}</div>)}

      {/* HERO */}
      <div className="relative border-b border-border/40" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.35) 0%, hsl(var(--background)) 65%)" }}>
        <div className="px-8 md:px-10 pt-6">
          <button onClick={() => navigate("/resources")} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />{ar ? "الموارد" : "Resources"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" /><span className="text-foreground/70 truncate max-w-[200px]">{ar ? res.nameAr : res.nameEn}</span>
          </button>
        </div>

        <div className="px-8 md:px-10 pt-5 pb-6 max-w-[960px]">
          <div className="flex items-start gap-5 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center shrink-0"><Icon size={22} strokeWidth={1.75} className="text-primary" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${tm.pill}`}>{ar ? tm.ar : tm.en}</span>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sm.pill}`}><div className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{ar ? sm.ar : sm.en}</div>
              </div>
              <h1 className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>{ar ? res.nameAr : res.nameEn}</h1>
              <p className="text-[13px] text-muted-foreground">
                <MapPin size={10} strokeWidth={1.75} className="inline text-muted-foreground/60" /> {ar ? res.locationAr : res.locationEn}
                <span className="mx-2 text-border">·</span>{ar ? res.ownerAr : res.ownerEn}
                <span className="mx-2 text-border">·</span><span className="tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{fmt(res.value)}</span>
              </p>
            </div>
          </div>

          {/* Utilization bar */}
          {res.status !== "retired" && (
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-[5px] rounded-full bg-border/40 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${res.utilization >= 70 ? "bg-emerald-500" : res.utilization >= 40 ? "bg-amber-500" : "bg-rose-400"}`} style={{ width: `${res.utilization}%` }} />
              </div>
              <span className="text-[13px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{res.utilization}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <button onClick={() => setStatusMenuOpen(!statusMenuOpen)} className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"><ArrowRightCircle size={13} strokeWidth={1.75} />{ar ? "تغيير الحالة" : "Change Status"}</button>
              {statusMenuOpen && (<><div className="fixed inset-0 z-40" onClick={() => setStatusMenuOpen(false)} /><div className="absolute top-full mt-1.5 start-0 z-50 bg-background border border-border/60 rounded-xl shadow-lg py-1.5 min-w-[180px]">
                {(["active", "idle", "maintenance", "retired"] as ResourceStatus[]).map((s) => { const m = RESOURCE_STATUS_META[s]; const c = s === res.status; return (<button key={s} onClick={() => changeStatus(s)} disabled={c} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-start transition-colors ${c ? "text-primary bg-primary/5 font-medium" : "text-foreground hover:bg-muted"}`}><div className={`w-2 h-2 rounded-full ${m.dot}`} />{ar ? m.ar : m.en}{c && <Check size={12} strokeWidth={2.5} className="ms-auto text-primary" />}</button>); })}
              </div></>)}
            </div>
            <button onClick={() => setNoteModalOpen(true)} className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"><StickyNote size={13} strokeWidth={1.75} />{ar ? "ملاحظة" : "Add Note"}</button>
            {res.status !== "retired" && <button onClick={() => changeStatus("retired")} className="h-8 px-3.5 rounded-xl border border-rose-300 text-rose-600 text-[12px] font-medium hover:bg-rose-50 flex items-center gap-1.5 transition-colors"><AlertTriangle size={13} strokeWidth={1.75} />{ar ? "إيقاف" : "Retire"}</button>}
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="px-8 md:px-10 flex items-center gap-0 overflow-x-auto">
          {TABS.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"}`}>{ar ? tab.ar : tab.en}</button>))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="px-8 md:px-10 py-7 max-w-[960px]">

        {activeTab === "overview" && (
          <div className="space-y-6">
            <Section title={ar ? "الوصف" : "Description"}><div className="px-6 py-5"><p className="text-[14px] text-foreground/85 leading-[1.8] max-w-[680px]" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? res.descAr : res.descEn}</p></div></Section>

            <Section title={ar ? "التفاصيل" : "Details"}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/25">
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Icon} label={ar ? "النوع" : "Type"} value={<span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${tm.pill}`}>{ar ? tm.ar : tm.en}</span>} />
                  <DetailRow icon={User} label={ar ? "المسؤول" : "Owner"} value={ar ? res.ownerAr : res.ownerEn} />
                  <DetailRow icon={MapPin} label={ar ? "الموقع" : "Location"} value={ar ? res.locationAr : res.locationEn} />
                  {res.assignedToEn && <DetailRow icon={User} label={ar ? "مُعيّن إلى" : "Assigned To"} value={<div className="flex items-center gap-2"><div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? res.assignedToAr! : res.assignedToEn)}</div>{ar ? res.assignedToAr : res.assignedToEn}</div>} />}
                </div>
                <div className="divide-y divide-border/25">
                  <DetailRow icon={DollarSign} label={ar ? "القيمة" : "Value"} value={<span className="font-semibold tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{fmt(res.value)}</span>} />
                  <DetailRow icon={Gauge} label={ar ? "الاستخدام" : "Utilization"} value={`${res.utilization}%`} />
                  <DetailRow icon={Calendar} label={ar ? "تاريخ الشراء" : "Purchased"} value={ar ? res.purchaseDateAr : res.purchaseDateEn} />
                  {res.sku && <DetailRow icon={Package} label="SKU" value={<span className="font-mono">{res.sku} · {res.quantity} {ar ? "وحدة" : "units"} × {fmt(res.unitCost!)}</span>} />}
                </div>
              </div>
            </Section>

            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[{ value: fmt(res.value), label: ar ? "القيمة" : "Value" }, { value: `${res.utilization}%`, label: ar ? "الاستخدام" : "Utilization" }, { value: String(res.maintenance.length), label: ar ? "سجلات الصيانة" : "Maintenance" }, { value: ar ? sm.ar : sm.en, label: ar ? "الحالة" : "Status" }].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5"><p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
                ))}
              </div>
            </div>

            {/* Intelligence */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 mb-2"><Sparkles size={14} strokeWidth={1.75} className="text-primary" /><span className="text-[13px] font-medium text-foreground">{ar ? "رؤى الموارد" : "Resource Insights"}</span><span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "ذكاء اصطناعي" : "AI"}</span></div>
              {insights.map((c, i) => (
                <div key={i} className="border border-border/40 rounded-xl bg-background p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}><c.icon size={18} strokeWidth={1.75} className={c.color} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground/60 tracking-wide uppercase mb-1">{ar ? c.titleAr : c.titleEn}</p>
                      <p className="text-[14px] font-medium text-foreground leading-snug mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>{ar ? c.valueAr : c.valueEn}</p>
                      <p className="text-[12px] text-muted-foreground/70 leading-relaxed">{ar ? c.descAr : c.descEn}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <Section title={ar ? "الجدول الزمني" : "Asset Timeline"}>
            <div className="px-6 py-2">
              {timeline.map((ev, i) => { const { Icon: TIcon, color, bg } = TL_ICONS[ev.kind] || TL_ICONS.purchase; const isLast = i === timeline.length - 1; return (
                <div key={ev.id} className="flex gap-4"><div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><TIcon size={14} strokeWidth={1.75} className={color} /></div>{!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}</div><div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}><p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p>{ev.descEn && <p className="text-[12px] text-muted-foreground/80 mt-1">{ar ? ev.descAr : ev.descEn}</p>}<p className="text-[11px] text-muted-foreground/60 mt-1">{ar ? ev.dateAr : ev.dateEn}</p></div></div>
              ); })}
            </div>
          </Section>
        )}

        {activeTab === "assignments" && (
          <div className="space-y-6">
            <Section title={ar ? "التعيين الحالي" : "Current Assignment"}>
              {res.assignedToEn ? (
                <div className="flex items-center gap-3.5 px-6 py-4"><div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">{initials(ar ? res.assignedToAr! : res.assignedToEn)}</div><div><p className="text-[13px] font-medium text-foreground">{ar ? res.assignedToAr : res.assignedToEn}</p><p className="text-[11px] text-muted-foreground">{ar ? "مُعيّن حالياً" : "Currently assigned"}</p></div></div>
              ) : (<div className="px-6 py-10 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "غير مُعيّن" : "Not assigned"}</p></div>)}
            </Section>
            {relWork.length > 0 && (
              <Section title={ar ? "عمل مرتبط" : "Related Work"}>
                <div className="divide-y divide-border/25">
                  {relWork.map((w) => { const ws = W_SM[w.status]; const wk = KIND_META[w.kind]; return (
                    <div key={w.id} onClick={() => navigate(`/work/${w.id}`)} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Briefcase size={14} strokeWidth={1.75} className="text-amber-600" /></div>
                      <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${wk.pill}`}>{ar ? wk.ar : wk.en}</span><h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? w.titleAr : w.titleEn}</h4></div><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><div className={`w-1.5 h-1.5 rounded-full ${ws.dot}`} /><span>{ar ? ws.ar : ws.en}</span></div></div>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                    </div>
                  ); })}
                </div>
              </Section>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className="space-y-6">
            {overdueMaint.length > 0 && (
              <Section title={ar ? "متأخرة" : "Overdue"}>
                <div className="divide-y divide-border/25">{overdueMaint.map((m) => { const ms = MAINT_STATUS_META[m.status]; return (<div key={m.id} className="flex items-center gap-4 px-6 py-4"><div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0"><AlertTriangle size={14} strokeWidth={1.75} className="text-rose-500" /></div><div className="flex-1"><p className="text-[13px] font-medium text-foreground">{ar ? m.titleAr : m.titleEn}</p><p className="text-[11px] text-muted-foreground">{ar ? m.dateAr : m.dateEn}{m.costEn ? ` · ${ar ? m.costAr : m.costEn}` : ""}</p></div><div className={`w-2 h-2 rounded-full ${ms.dot}`} /></div>); })}</div>
              </Section>
            )}
            {upcomingMaint.length > 0 && (
              <Section title={ar ? "قادمة" : "Upcoming"}>
                <div className="divide-y divide-border/25">{upcomingMaint.map((m) => { const ms = MAINT_STATUS_META[m.status]; return (<div key={m.id} className="flex items-center gap-4 px-6 py-4"><div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0"><Calendar size={14} strokeWidth={1.75} className="text-primary" /></div><div className="flex-1"><p className="text-[13px] font-medium text-foreground">{ar ? m.titleAr : m.titleEn}</p><p className="text-[11px] text-muted-foreground">{ar ? m.dateAr : m.dateEn}{m.costEn ? ` · ${ar ? m.costAr : m.costEn}` : ""}</p></div><div className={`w-2 h-2 rounded-full ${ms.dot}`} /></div>); })}</div>
              </Section>
            )}
            {completedMaint.length > 0 && (
              <Section title={ar ? "مكتملة" : "Completed"}>
                <div className="divide-y divide-border/25">{completedMaint.map((m) => { const ms = MAINT_STATUS_META[m.status]; return (<div key={m.id} className="flex items-center gap-4 px-6 py-4"><div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><CheckCircle2 size={14} strokeWidth={1.75} className="text-emerald-500" /></div><div className="flex-1"><p className="text-[13px] font-medium text-foreground">{ar ? m.titleAr : m.titleEn}</p><p className="text-[11px] text-muted-foreground">{ar ? m.dateAr : m.dateEn}{m.costEn ? ` · ${ar ? m.costAr : m.costEn}` : ""}</p></div><div className={`w-2 h-2 rounded-full ${ms.dot}`} /></div>); })}</div>
              </Section>
            )}
            {res.maintenance.length === 0 && (<div className="border border-border/40 rounded-xl py-14 text-center bg-background"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا سجلات صيانة" : "No maintenance records"}</p></div>)}
          </div>
        )}

        {activeTab === "files" && (
          <Section title={ar ? "الملفات" : "Files"}>
            <div className="divide-y divide-border/25">{sampleFiles.map((f) => { const fm = FILE_ICONS[f.kind] || FILE_ICONS.pdf; return (<div key={f.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/15 transition-colors"><div className={`w-9 h-9 rounded-xl ${fm.bg} flex items-center justify-center shrink-0`}><fm.Icon size={15} strokeWidth={1.75} className={fm.color} /></div><div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-foreground truncate">{ar ? f.nameAr : f.nameEn}</p><p className="text-[11px] text-muted-foreground">{ar ? f.sizeAr : f.sizeEn}</p></div><button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors shrink-0"><Download size={13} strokeWidth={1.75} /></button></div>); })}</div>
          </Section>
        )}

        {activeTab === "notes" && (
          <Section title={ar ? "الملاحظات" : "Notes"} action={<button onClick={() => setNoteModalOpen(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"><Plus size={12} strokeWidth={2.5} />{ar ? "إضافة" : "Add"}</button>}>
            <div className="divide-y divide-border/25">{allNotes.map((n) => (<div key={n.id} className="px-6 py-4"><div className="flex items-center gap-2.5 mb-2.5"><div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? n.authorAr : n.authorEn)}</div><span className="text-[12px] font-medium text-foreground">{ar ? n.authorAr : n.authorEn}</span><span className="text-[10px] text-muted-foreground/50 ms-auto">{ar ? n.dateAr : n.dateEn}</span></div><p className="text-[13px] text-foreground/80 leading-[1.7]" style={{ paddingInlineStart: "2.125rem" }}>{ar ? n.contentAr : n.contentEn}</p></div>))}</div>
          </Section>
        )}

        {activeTab === "activity" && (
          <Section title={ar ? "النشاط" : "Activity"}>
            <div className="px-6 py-2">
              {[
                { id: "ra1", kind: "purchase", titleEn: `${res.nameEn} acquired`, titleAr: `تم اقتناء ${res.nameAr}`, dateEn: res.purchaseDateEn, dateAr: res.purchaseDateAr },
                ...(res.assignedToEn ? [{ id: "ra2", kind: "assigned", titleEn: `Assigned to ${res.assignedToEn}`, titleAr: `تم التعيين إلى ${res.assignedToAr}`, dateEn: res.purchaseDateEn, dateAr: res.purchaseDateAr }] : []),
                ...res.maintenance.map((m, i) => ({ id: `ra-m${i}`, kind: "maintenance", titleEn: `Maintenance: ${m.titleEn}`, titleAr: `صيانة: ${m.titleAr}`, dateEn: m.dateEn, dateAr: m.dateAr })),
              ].map((ev, i, arr) => { const { Icon: TIcon, color, bg } = TL_ICONS[ev.kind] || TL_ICONS.purchase; const isLast = i === arr.length - 1; return (
                <div key={ev.id} className="flex gap-4"><div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><TIcon size={14} strokeWidth={1.75} className={color} /></div>{!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}</div><div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}><p className="text-[13px] font-medium text-foreground">{ar ? ev.titleAr : ev.titleEn}</p><p className="text-[11px] text-muted-foreground/50 mt-1">{ar ? ev.dateAr : ev.dateEn}</p></div></div>
              ); })}
            </div>
          </Section>
        )}
      </div>

      <AddNoteModal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} onAdd={handleAddNote} lang={lang} />
    </div>
  );
}
