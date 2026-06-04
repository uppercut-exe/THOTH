import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  loadInvoices, saveInvoices, loadPayments,
  fmtCurrency, INVOICE_STATUS_META, PAYMENT_METHOD_META,
  type Invoice, type InvoiceStatus, type Payment,
} from "../data/finance";
import {
  ArrowLeft, ChevronRight, Building2, User, Calendar, Clock,
  DollarSign, FileText, StickyNote, Receipt, CreditCard,
  CheckCircle2, Send, AlertTriangle, X as XIcon, Check,
  Plus, ArrowRightCircle, Sparkles, TrendingUp, Target, Shield, Zap,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab types ────────────────────────────────────────────

type InvTab = "overview" | "timeline" | "organization" | "contact" | "payments" | "notes" | "activity";
const TABS: { id: InvTab; en: string; ar: string }[] = [
  { id: "overview",     en: "Overview",     ar: "نظرة عامة" },
  { id: "timeline",     en: "Timeline",     ar: "الجدول الزمني" },
  { id: "organization", en: "Organization", ar: "المنظمة" },
  { id: "contact",      en: "Contact",      ar: "جهة الاتصال" },
  { id: "payments",     en: "Payments",     ar: "المدفوعات" },
  { id: "notes",        en: "Notes",        ar: "الملاحظات" },
  { id: "activity",     en: "Activity",     ar: "النشاط" },
];

// ─── Section ──────────────────────────────────────────────

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
      <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0"><Icon size={13} strokeWidth={1.75} className="text-muted-foreground" /></div>
      <div className="flex-1 min-w-0"><p className="text-[10px] text-muted-foreground/70 mb-0.5">{label}</p><div className="text-[13px] text-foreground">{value}</div></div>
    </div>
  );
}

// ─── Note type ────────────────────────────────────────────

interface NoteItem { id: string; authorEn: string; authorAr: string; contentEn: string; contentAr: string; dateEn: string; dateAr: string; }

function AddNoteModal({ open, onClose, onAdd, lang }: { open: boolean; onClose: () => void; onAdd: (t: string) => void; lang: "en" | "ar" }) {
  const ar = lang === "ar"; const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "إضافة ملاحظة" : "Add Note"}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><XIcon size={14} strokeWidth={2} /></button>
        </div>
        <div className="px-6 py-4"><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={ar ? "اكتب…" : "Write…"} rows={4} autoFocus className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none" /></div>
        <div className="px-6 py-3 border-t border-border/40 flex justify-end gap-3">
          <button onClick={onClose} className="h-8 px-4 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); onClose(); } }} disabled={!text.trim()} className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">{ar ? "إضافة" : "Add"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

export default function FinanceDetail() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmt = (v: number) => fmtCurrency(v, "SAR", ar ? "ar-SA" : "en-SA");

  const [allInvoices, setAllInvoices] = useState(loadInvoices);
  const inv = allInvoices.find((i) => i.id === id);
  const allPayments = loadPayments();

  const [activeTab, setActiveTab] = useState<InvTab>("overview");
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  function showToast(msg: string) { setActionToast(msg); setTimeout(() => setActionToast(null), 2200); }

  function changeStatus(newStatus: InvoiceStatus) {
    setAllInvoices((prev) => {
      const updated = prev.map((i) => {
        if (i.id !== id) return i;
        const paidAmount = newStatus === "paid" ? i.amount : i.paidAmount;
        return { ...i, status: newStatus, paidAmount };
      });
      saveInvoices(updated);
      return updated;
    });
    setStatusMenuOpen(false);
    showToast(ar ? "تم تحديث الحالة" : "Status updated");
  }

  function handleAddNote(text: string) {
    setLocalNotes((prev) => [{ id: `n-${Date.now()}`, authorEn: "You", authorAr: "أنت", contentEn: text, contentAr: text, dateEn: "Just now", dateAr: "الآن" }, ...prev]);
    showToast(ar ? "تمت إضافة الملاحظة" : "Note added");
  }

  if (!inv) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center"><Receipt size={20} className="text-muted-foreground" strokeWidth={1.5} /></div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "لم يُعثر على الفاتورة" : "Invoice not found"}</p>
        <button onClick={() => navigate("/finance")} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"><ArrowLeft size={12} strokeWidth={2} />{ar ? "العودة" : "Back"}</button>
      </div>
    );
  }

  const sm = INVOICE_STATUS_META[inv.status];
  const invPayments = allPayments.filter((p) => p.invoiceId === inv.id && p.amount > 0);
  const balance = inv.amount - inv.paidAmount;

  // Sample notes
  const sampleNotes: NoteItem[] = [
    { id: "sn1", authorEn: "Finance Team", authorAr: "فريق المالية", contentEn: `Invoice ${inv.number} created for ${inv.orgNameEn}. Payment terms: Net 30.`, contentAr: `تم إنشاء الفاتورة ${inv.number} لـ ${inv.orgNameAr}. شروط الدفع: صافي ٣٠.`, dateEn: inv.issueDateEn, dateAr: inv.issueDateAr },
  ];
  const allNotes = [...localNotes, ...sampleNotes];

  // Timeline
  const timeline = [
    { id: "tl1", kind: "created", titleEn: "Invoice created", titleAr: "تم إنشاء الفاتورة", descEn: `${inv.number} for ${fmt(inv.amount)}`, descAr: `${inv.number} بمبلغ ${fmt(inv.amount)}`, dateEn: inv.issueDateEn, dateAr: inv.issueDateAr },
    ...(inv.status !== "draft" ? [{ id: "tl2", kind: "sent", titleEn: "Invoice sent to client", titleAr: "تم إرسال الفاتورة للعميل", dateEn: inv.issueDateEn, dateAr: inv.issueDateAr }] : []),
    ...invPayments.map((p, i) => ({ id: `tl-p${i}`, kind: "payment", titleEn: `Payment received: ${fmt(p.amount)}`, titleAr: `دفعة مستلمة: ${fmt(p.amount)}`, descEn: `${PAYMENT_METHOD_META[p.method].en} — ${p.referenceEn || ""}`, descAr: `${PAYMENT_METHOD_META[p.method].ar} — ${p.referenceAr || ""}`, dateEn: p.dateEn, dateAr: p.dateAr })),
    ...(inv.status === "paid" ? [{ id: "tl-done", kind: "paid", titleEn: "Invoice fully paid", titleAr: "الفاتورة مدفوعة بالكامل", dateEn: invPayments[invPayments.length - 1]?.dateEn || inv.dueDateEn, dateAr: invPayments[invPayments.length - 1]?.dateAr || inv.dueDateAr }] : []),
    ...(inv.status === "overdue" ? [{ id: "tl-od", kind: "overdue", titleEn: "Invoice overdue", titleAr: "الفاتورة متأخرة", descEn: `Past due date: ${inv.dueDateEn}`, descAr: `تجاوز تاريخ الاستحقاق: ${inv.dueDateAr}`, dateEn: inv.dueDateEn, dateAr: inv.dueDateAr }] : []),
  ];

  const TL_ICONS: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
    created: { Icon: Plus, color: "text-primary", bg: "bg-primary/8" },
    sent: { Icon: Send, color: "text-blue-500", bg: "bg-blue-50" },
    payment: { Icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    paid: { Icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    overdue: { Icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50" },
  };

  // Activity
  const activity = [
    { id: "a1", kind: "created", titleEn: `Invoice ${inv.number} created`, titleAr: `تم إنشاء الفاتورة ${inv.number}`, dateEn: inv.issueDateEn, dateAr: inv.issueDateAr },
    ...(invPayments.length > 0 ? [{ id: "a2", kind: "payment", titleEn: `${invPayments.length} payment(s) recorded`, titleAr: `تم تسجيل ${invPayments.length} دفعة`, dateEn: invPayments[0].dateEn, dateAr: invPayments[0].dateAr }] : []),
    { id: "a3", kind: "sent", titleEn: "Invoice emailed to contact", titleAr: "تم إرسال الفاتورة بالبريد", dateEn: inv.issueDateEn, dateAr: inv.issueDateAr },
  ];

  // Intelligence
  const insights = [
    {
      icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50",
      titleEn: "Payment History", titleAr: "سجل الدفع",
      valueEn: inv.paidAmount > 0 ? `${fmt(inv.paidAmount)} received (${Math.round(inv.paidAmount / inv.amount * 100)}%)` : "No payments yet",
      valueAr: inv.paidAmount > 0 ? `${fmt(inv.paidAmount)} مستلم (${Math.round(inv.paidAmount / inv.amount * 100)}%)` : "لا مدفوعات بعد",
      descEn: inv.paidAmount >= inv.amount ? "Fully collected. No follow-up needed." : balance > 0 ? `Outstanding: ${fmt(balance)}. Follow up with ${inv.contactNameEn}.` : "Payment processing.",
      descAr: inv.paidAmount >= inv.amount ? "مُحصّل بالكامل. لا حاجة للمتابعة." : balance > 0 ? `مستحق: ${fmt(balance)}. تابع مع ${inv.contactNameAr}.` : "الدفع قيد المعالجة.",
    },
    {
      icon: inv.status === "overdue" ? AlertTriangle : Shield,
      color: inv.status === "overdue" ? "text-rose-500" : "text-primary",
      bg: inv.status === "overdue" ? "bg-rose-50" : "bg-primary/8",
      titleEn: "Risk Assessment", titleAr: "تقييم المخاطر",
      valueEn: inv.status === "overdue" ? "High risk — overdue" : inv.status === "paid" ? "No risk — fully paid" : "Normal — within terms",
      valueAr: inv.status === "overdue" ? "خطر عالي — متأخرة" : inv.status === "paid" ? "بدون خطر — مدفوعة" : "طبيعي — ضمن الشروط",
      descEn: inv.status === "overdue" ? "Escalate to account manager. Consider payment plan." : "No action needed.",
      descAr: inv.status === "overdue" ? "صعّد لمدير الحساب. فكر في خطة دفع." : "لا إجراء مطلوب.",
    },
    {
      icon: Zap, color: "text-violet-600", bg: "bg-violet-50",
      titleEn: "Recommended Action", titleAr: "الإجراء الموصى به",
      valueEn: inv.status === "draft" ? "Send to client" : inv.status === "sent" ? "Follow up on payment" : inv.status === "overdue" ? "Escalate immediately" : "Archive and close",
      valueAr: inv.status === "draft" ? "أرسل للعميل" : inv.status === "sent" ? "تابع الدفع" : inv.status === "overdue" ? "صعّد فوراً" : "أرشف وأغلق",
      descEn: `Contact: ${inv.contactNameEn} at ${inv.orgNameEn}.`,
      descAr: `جهة الاتصال: ${inv.contactNameAr} في ${inv.orgNameAr}.`,
    },
  ];

  return (
    <div className="min-h-full">
      {actionToast && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-foreground text-background text-[13px] font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"><Check size={14} strokeWidth={2.5} />{actionToast}</div>
      )}

      {/* ═══ HERO ═══ */}
      <div className="relative border-b border-border/40" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.35) 0%, hsl(var(--background)) 65%)" }}>
        <div className="px-8 md:px-10 pt-6">
          <button onClick={() => navigate("/finance")} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />{ar ? "المالية" : "Finance"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70 truncate max-w-[200px]">{inv.number}</span>
          </button>
        </div>

        <div className="px-8 md:px-10 pt-5 pb-6 max-w-[960px]">
          <div className="flex items-center gap-2.5 flex-wrap mb-4">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sm.pill}`}><div className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{ar ? sm.ar : sm.en}</div>
            <span className="text-[11px] font-mono text-muted-foreground px-2.5 py-1 rounded-full bg-muted border border-border/40">{inv.number}</span>
          </div>

          <h1 className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}>{ar ? inv.titleAr : inv.titleEn}</h1>
          <p className="text-[24px] font-medium text-primary mb-3 tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{fmt(inv.amount)}</p>

          <p className="text-[13px] text-muted-foreground">
            {ar ? inv.orgNameAr : inv.orgNameEn}
            <span className="mx-2 text-border">·</span>{ar ? inv.contactNameAr : inv.contactNameEn}
            <span className="mx-2 text-border">·</span><Calendar size={10} strokeWidth={1.75} className="inline text-muted-foreground/60" /> {ar ? inv.dueDateAr : inv.dueDateEn}
          </p>

          {/* Progress bar */}
          {inv.status !== "cancelled" && (
            <div className="mt-5 flex items-center gap-4">
              <div className="flex-1 h-[5px] rounded-full bg-border/40 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${inv.paidAmount >= inv.amount ? "bg-emerald-500" : "bg-primary/60"}`} style={{ width: `${Math.min(100, Math.round(inv.paidAmount / inv.amount * 100))}%` }} />
              </div>
              <span className="text-[13px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{Math.round(inv.paidAmount / inv.amount * 100)}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 mt-6 flex-wrap">
            <div className="relative">
              <button onClick={() => setStatusMenuOpen(!statusMenuOpen)} className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"><ArrowRightCircle size={13} strokeWidth={1.75} />{ar ? "تغيير الحالة" : "Change Status"}</button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute top-full mt-1.5 start-0 z-50 bg-background border border-border/60 rounded-xl shadow-lg py-1.5 min-w-[180px]">
                    {(["draft", "sent", "paid", "overdue", "cancelled"] as InvoiceStatus[]).map((s) => {
                      const m = INVOICE_STATUS_META[s]; const isCurrent = s === inv.status;
                      return (<button key={s} onClick={() => changeStatus(s)} disabled={isCurrent} className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-start transition-colors ${isCurrent ? "text-primary bg-primary/5 font-medium" : "text-foreground hover:bg-muted"}`}><div className={`w-2 h-2 rounded-full ${m.dot}`} />{ar ? m.ar : m.en}{isCurrent && <Check size={12} strokeWidth={2.5} className="ms-auto text-primary" />}</button>);
                    })}
                  </div>
                </>
              )}
            </div>

            {inv.status === "draft" && <button onClick={() => changeStatus("sent")} className="h-8 px-3.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 flex items-center gap-1.5 transition-opacity"><Send size={13} strokeWidth={1.75} />{ar ? "إرسال" : "Mark Sent"}</button>}
            {["sent", "overdue"].includes(inv.status) && <button onClick={() => changeStatus("paid")} className="h-8 px-3.5 rounded-xl bg-emerald-500 text-white text-[12px] font-medium hover:bg-emerald-600 flex items-center gap-1.5 transition-colors"><CheckCircle2 size={13} strokeWidth={2} />{ar ? "تم الدفع" : "Mark Paid"}</button>}
            <button onClick={() => setNoteModalOpen(true)} className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"><StickyNote size={13} strokeWidth={1.75} />{ar ? "ملاحظة" : "Add Note"}</button>
          </div>
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div className="border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="px-8 md:px-10 flex items-center gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"}`}>{ar ? tab.ar : tab.en}</button>
          ))}
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="px-8 md:px-10 py-7 max-w-[960px]">

        {activeTab === "overview" && (
          <div className="space-y-6">
            {inv.noteEn && <Section title={ar ? "ملاحظة" : "Note"}><div className="px-6 py-5"><p className="text-[14px] text-foreground/85 leading-[1.8] max-w-[680px]" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? inv.noteAr : inv.noteEn}</p></div></Section>}

            <Section title={ar ? "التفاصيل" : "Details"}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/25">
                <div className="divide-y divide-border/25">
                  <DetailRow icon={DollarSign} label={ar ? "المبلغ" : "Amount"} value={<span className="font-semibold tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{fmt(inv.amount)}</span>} />
                  <DetailRow icon={CheckCircle2} label={ar ? "المدفوع" : "Paid"} value={<span className="text-emerald-600 font-semibold tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{fmt(inv.paidAmount)}</span>} />
                  <DetailRow icon={AlertTriangle} label={ar ? "المتبقي" : "Balance"} value={<span className={`font-semibold tabular-nums ${balance > 0 ? "text-amber-600" : "text-emerald-600"}`} style={{ fontFamily: "var(--app-font-serif)" }}>{fmt(balance)}</span>} />
                </div>
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Building2} label={ar ? "المنظمة" : "Organization"} value={ar ? inv.orgNameAr : inv.orgNameEn} />
                  <DetailRow icon={User} label={ar ? "جهة الاتصال" : "Contact"} value={<div className="flex items-center gap-2"><div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? inv.contactNameAr : inv.contactNameEn)}</div>{ar ? inv.contactNameAr : inv.contactNameEn}</div>} />
                  <DetailRow icon={Calendar} label={ar ? "الاستحقاق" : "Due Date"} value={ar ? inv.dueDateAr : inv.dueDateEn} />
                </div>
              </div>
            </Section>

            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: fmt(inv.amount), label: ar ? "المبلغ" : "Amount" },
                  { value: fmt(inv.paidAmount), label: ar ? "المدفوع" : "Paid" },
                  { value: fmt(balance), label: ar ? "المتبقي" : "Balance" },
                  { value: `${Math.round(inv.paidAmount / inv.amount * 100)}%`, label: ar ? "التحصيل" : "Collected" },
                ].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
                    <p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Intelligence */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 mb-2"><Sparkles size={14} strokeWidth={1.75} className="text-primary" /><span className="text-[13px] font-medium text-foreground">{ar ? "رؤى مالية" : "Finance Insights"}</span><span className="text-[10px] text-muted-foreground/50 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "ذكاء اصطناعي" : "AI"}</span></div>
              {insights.map((card, i) => (
                <div key={i} className="border border-border/40 rounded-xl bg-background p-5 hover:shadow-sm transition-shadow">
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
          </div>
        )}

        {activeTab === "timeline" && (
          <Section title={ar ? "الجدول الزمني" : "Timeline"}>
            <div className="px-6 py-2">
              {timeline.map((ev, i) => {
                const { Icon, color, bg } = TL_ICONS[ev.kind] || TL_ICONS.created;
                const isLast = i === timeline.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>{!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}</div>
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

        {activeTab === "organization" && (
          <Section title={ar ? "المنظمة" : "Organization"}>
            <div className="flex items-center gap-3.5 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Building2 size={15} strokeWidth={1.75} className="text-amber-600" /></div>
              <div><p className="text-[13px] font-medium text-foreground">{ar ? inv.orgNameAr : inv.orgNameEn}</p><p className="text-[11px] text-muted-foreground">{ar ? "العميل" : "Client"}</p></div>
            </div>
          </Section>
        )}

        {activeTab === "contact" && (
          <Section title={ar ? "جهة الاتصال" : "Contact"}>
            <div className="flex items-center gap-3.5 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">{initials(ar ? inv.contactNameAr : inv.contactNameEn)}</div>
              <div><p className="text-[13px] font-medium text-foreground">{ar ? inv.contactNameAr : inv.contactNameEn}</p><p className="text-[11px] text-muted-foreground">{ar ? "جهة اتصال الفاتورة" : "Invoice Contact"}</p></div>
            </div>
          </Section>
        )}

        {activeTab === "payments" && (
          <Section title={ar ? "المدفوعات" : "Payments"}>
            {invPayments.length > 0 ? (
              <div className="divide-y divide-border/25">
                {invPayments.map((p) => {
                  const mm = PAYMENT_METHOD_META[p.method];
                  return (
                    <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><CreditCard size={14} strokeWidth={1.75} className="text-emerald-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">{fmt(p.amount)}</p>
                        <p className="text-[11px] text-muted-foreground">{ar ? mm.ar : mm.en}{p.referenceEn ? ` · ${p.referenceEn}` : ""} · {ar ? p.dateAr : p.dateEn}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا مدفوعات بعد" : "No payments recorded"}</p></div>
            )}
          </Section>
        )}

        {activeTab === "notes" && (
          <Section title={ar ? "الملاحظات" : "Notes"} action={<button onClick={() => setNoteModalOpen(true)} className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"><Plus size={12} strokeWidth={2.5} />{ar ? "إضافة" : "Add"}</button>}>
            <div className="divide-y divide-border/25">
              {allNotes.map((n) => (
                <div key={n.id} className="px-6 py-4">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? n.authorAr : n.authorEn)}</div>
                    <span className="text-[12px] font-medium text-foreground">{ar ? n.authorAr : n.authorEn}</span>
                    <span className="text-[10px] text-muted-foreground/50 ms-auto">{ar ? n.dateAr : n.dateEn}</span>
                  </div>
                  <p className="text-[13px] text-foreground/80 leading-[1.7]" style={{ paddingInlineStart: "2.125rem" }}>{ar ? n.contentAr : n.contentEn}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {activeTab === "activity" && (
          <Section title={ar ? "النشاط" : "Activity"}>
            <div className="px-6 py-2">
              {activity.map((ev, i) => {
                const { Icon, color, bg } = TL_ICONS[ev.kind] || TL_ICONS.created;
                const isLast = i === activity.length - 1;
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div className="flex flex-col items-center"><div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}><Icon size={14} strokeWidth={1.75} className={color} /></div>{!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}</div>
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
      </div>

      <AddNoteModal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} onAdd={handleAddNote} lang={lang} />
    </div>
  );
}
