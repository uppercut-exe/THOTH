import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  loadInvoices, saveInvoices, loadPayments, loadExpenses,
  fmtCurrency, INVOICE_STATUS_META, PAYMENT_METHOD_META,
  EXPENSE_CATEGORY_META, EXPENSE_STATUS_META,
  type Invoice, type InvoiceStatus, type Expense,
} from "../data/finance";
import {
  Search, X, DollarSign, CreditCard, TrendingUp, TrendingDown,
  Wallet, PiggyBank, FileText, ChevronRight, Building2, User,
  Calendar, Receipt, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { isDemoMode } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { FinanceLive } from "../lib/liveViews";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab types ────────────────────────────────────────────

type FinTab = "invoices" | "payments" | "expenses";
const FIN_TABS: { id: FinTab; en: string; ar: string }[] = [
  { id: "invoices", en: "Invoices", ar: "الفواتير" },
  { id: "payments", en: "Payments", ar: "المدفوعات" },
  { id: "expenses", en: "Expenses", ar: "المصروفات" },
];

// ─── Status filters ───────────────────────────────────────

const INV_STATUS_FILTERS: { value: InvoiceStatus | "all"; en: string; ar: string }[] = [
  { value: "all",       en: "All",       ar: "الكل" },
  { value: "draft",     en: "Draft",     ar: "مسودة" },
  { value: "sent",      en: "Sent",      ar: "مُرسلة" },
  { value: "paid",      en: "Paid",      ar: "مدفوعة" },
  { value: "overdue",   en: "Overdue",   ar: "متأخرة" },
  { value: "cancelled", en: "Cancelled", ar: "ملغاة" },
];

// ═══════════════════════════════════════════════════════════

function FinanceDemo() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmt = (v: number) => fmtCurrency(v, "SAR", ar ? "ar-SA" : "en-SA");

  const [invoices] = useState(loadInvoices);
  const payments = loadPayments();
  const expenses = loadExpenses();

  const [activeTab, setActiveTab] = useState<FinTab>("invoices");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  // ── Dashboard metrics ──
  const revenue = useMemo(() => invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0), [invoices]);
  const outstanding = useMemo(() => invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.amount - i.paidAmount, 0), [invoices]);
  const paymentsTotal = useMemo(() => payments.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0), [payments]);
  const expensesTotal = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const cashPosition = revenue - expensesTotal;
  const profitEstimate = revenue - expensesTotal;

  // ── Filtered invoices ──
  const filteredInv = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((i) => {
      const ms = !q || i.number.toLowerCase().includes(q) || i.titleEn.toLowerCase().includes(q) || i.orgNameEn.toLowerCase().includes(q) || i.contactNameEn.toLowerCase().includes(q);
      const mst = statusFilter === "all" || i.status === statusFilter;
      return ms && mst;
    });
  }, [invoices, search, statusFilter]);

  // ── Filtered payments ──
  const filteredPay = useMemo(() => {
    const q = search.toLowerCase().trim();
    return payments.filter((p) => !q || p.invoiceNumber.toLowerCase().includes(q) || p.referenceEn?.toLowerCase().includes(q));
  }, [payments, search]);

  // ── Filtered expenses ──
  const filteredExp = useMemo(() => {
    const q = search.toLowerCase().trim();
    return expenses.filter((e) => !q || e.vendorEn.toLowerCase().includes(q) || e.descEn.toLowerCase().includes(q) || e.category.includes(q));
  }, [expenses, search]);

  return (
    <div className="min-h-full">

      {/* ── Dashboard Header ── */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{ar ? "المالية" : "Finance"}</p>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-6" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "لوحة المالية" : "Financial Overview"}
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: DollarSign,    value: fmt(revenue),        label: ar ? "الإيرادات" : "Revenue",       color: "text-emerald-600", trend: "+12%", up: true },
              { icon: FileText,      value: fmt(outstanding),    label: ar ? "فواتير معلقة" : "Outstanding", color: "text-amber-500",   trend: null, up: false },
              { icon: CreditCard,    value: fmt(paymentsTotal),  label: ar ? "مدفوعات مستلمة" : "Received",  color: "text-primary",     trend: "+8%", up: true },
              { icon: ArrowDownRight,value: fmt(expensesTotal),  label: ar ? "المصروفات" : "Expenses",      color: "text-rose-500",    trend: "-3%", up: false },
              { icon: Wallet,        value: fmt(cashPosition),   label: ar ? "الموقف النقدي" : "Cash Position", color: cashPosition >= 0 ? "text-emerald-600" : "text-rose-500", trend: null, up: cashPosition >= 0 },
              { icon: PiggyBank,     value: fmt(profitEstimate), label: ar ? "تقدير الربح" : "Profit Est.",  color: profitEstimate >= 0 ? "text-emerald-600" : "text-rose-500", trend: null, up: profitEstimate >= 0 },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <m.icon size={14} strokeWidth={1.75} className={m.color} />
                  {m.trend && (
                    <span className={`text-[10px] font-medium ${m.up ? "text-emerald-600" : "text-rose-500"}`}>
                      {m.trend}
                    </span>
                  )}
                </div>
                <p className="text-[17px] font-medium text-foreground leading-none tabular-nums mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar + filters ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 flex items-center gap-0">
          {FIN_TABS.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(""); setStatusFilter("all"); }}
              className={`px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"}`}>
              {ar ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 md:px-10 py-6 max-w-[1100px]">

        {/* ── Search + filter bar ── */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <div className="relative min-w-[200px] flex-1 max-w-[280px]">
            <Search size={13} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث…" : `Search ${activeTab}…`}
              className="w-full h-9 ps-8 pe-4 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
          </div>

          {activeTab === "invoices" && (
            <>
              <div className="h-5 w-px bg-border/60 hidden sm:block" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {INV_STATUS_FILTERS.map((f) => (
                  <button key={f.value} onClick={() => setStatusFilter(f.value as InvoiceStatus | "all")}
                    className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-all ${statusFilter === f.value ? "bg-primary/8 text-primary border-primary/25" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                    {ar ? f.ar : f.en}
                  </button>
                ))}
              </div>
            </>
          )}

          {search && (
            <button onClick={() => setSearch("")} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all">
              <X size={11} strokeWidth={2} />{ar ? "مسح" : "Clear"}
            </button>
          )}
        </div>

        {/* ── INVOICES TAB ── */}
        {activeTab === "invoices" && (
          <>
            <p className="text-[12px] text-muted-foreground mb-4">{ar ? `${filteredInv.length} فاتورة` : `${filteredInv.length} invoice${filteredInv.length !== 1 ? "s" : ""}`}</p>
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/25">
              {filteredInv.map((inv) => {
                const sm = INVOICE_STATUS_META[inv.status];
                return (
                  <div key={inv.id} onClick={() => navigate(`/finance/${inv.id}`)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/15 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <Receipt size={16} strokeWidth={1.75} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <span className="text-[11px] font-mono text-muted-foreground">{inv.number}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sm.pill}`}>{ar ? sm.ar : sm.en}</span>
                      </div>
                      <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? inv.titleAr : inv.titleEn}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Building2 size={10} strokeWidth={1.75} className="text-muted-foreground/50" />{ar ? inv.orgNameAr : inv.orgNameEn}</span>
                        <span className="flex items-center gap-1"><Calendar size={10} strokeWidth={1.75} className="text-muted-foreground/50" />{ar ? inv.dueDateAr : inv.dueDateEn}</span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-[14px] font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{fmt(inv.amount)}</p>
                      {inv.paidAmount > 0 && inv.paidAmount < inv.amount && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">{fmt(inv.paidAmount)} {ar ? "مدفوع" : "paid"}</p>
                      )}
                    </div>
                    <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
                  </div>
                );
              })}
              {filteredInv.length === 0 && (
                <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد فواتير" : "No invoices found"}</p></div>
              )}
            </div>
          </>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab === "payments" && (
          <>
            <p className="text-[12px] text-muted-foreground mb-4">{ar ? `${filteredPay.length} دفعة` : `${filteredPay.length} payment${filteredPay.length !== 1 ? "s" : ""}`}</p>
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/25">
              {filteredPay.filter((p) => p.amount > 0).map((pay) => {
                const mm = PAYMENT_METHOD_META[pay.method];
                return (
                  <div key={pay.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/15 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <CreditCard size={16} strokeWidth={1.75} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-foreground">{pay.invoiceNumber}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span>{ar ? mm.ar : mm.en}</span>
                        {pay.referenceEn && <><span className="text-border">·</span><span className="font-mono">{pay.referenceEn}</span></>}
                        <span className="text-border">·</span>
                        <span>{ar ? pay.dateAr : pay.dateEn}</span>
                      </div>
                    </div>
                    <p className="text-[14px] font-semibold text-emerald-600 tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>+{fmt(pay.amount)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === "expenses" && (
          <>
            <p className="text-[12px] text-muted-foreground mb-4">{ar ? `${filteredExp.length} مصروف` : `${filteredExp.length} expense${filteredExp.length !== 1 ? "s" : ""}`}</p>
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/25">
              {filteredExp.map((exp) => {
                const cm = EXPENSE_CATEGORY_META[exp.category];
                const es = EXPENSE_STATUS_META[exp.status];
                return (
                  <div key={exp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/15 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <ArrowDownRight size={16} strokeWidth={1.75} className="text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cm.pill}`}>{ar ? cm.ar : cm.en}</span>
                        <div className="flex items-center gap-1"><div className={`w-1.5 h-1.5 rounded-full ${es.dot}`} /><span className="text-[10px] text-muted-foreground">{ar ? es.ar : es.en}</span></div>
                      </div>
                      <h4 className="text-[13px] font-medium text-foreground">{ar ? exp.vendorAr : exp.vendorEn}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ar ? exp.descAr : exp.descEn} · {ar ? exp.dateAr : exp.dateEn}</p>
                    </div>
                    <p className="text-[14px] font-semibold text-rose-500 tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>-{fmt(exp.amount)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Finance() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  if (!isDemoMode) return <FinanceLive workspaceId={workspace?.id ?? ""} lang={lang} />;
  return <FinanceDemo />;
}
