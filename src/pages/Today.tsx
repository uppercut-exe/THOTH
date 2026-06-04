import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { exportCSV } from "../lib/csv-export";
import { useLocation } from "wouter";
import type { Database } from "../lib/database.types";
import {
  ChevronRight,
  Zap,
  FileText,
  Users,
  Building2,
  Briefcase,
  ShoppingBag,
  Landmark,
  Package,
  Loader2,
  Download,
  CheckCircle2,
  Circle,
  ArrowRight,
  Map,
  Database as DatabaseIcon,
  DollarSign,
  Receipt,
} from "lucide-react";

type Tables = Database["public"]["Tables"];

// ─── Helpers ──────────────────────────────────────────────

function getGreeting(lang: "en" | "ar"): string {
  const hour = new Date().getHours();
  if (lang === "ar") {
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء النور";
  }
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(lang: "en" | "ar"): string {
  const now = new Date();
  if (lang === "ar") {
    return now.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });
  }
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function fmtCurrency(v: number, currency: string, locale: string = "en-SA"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

function Section({ en, ar, lang, children }: { en: string; ar: string; lang: "en" | "ar"; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-[11px] font-semibold text-muted-foreground tracking-[0.1em] uppercase shrink-0">
          {lang === "ar" ? ar : en}
        </h2>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      {children}
    </section>
  );
}

// ─── Step card (numbered onboarding) ─────────────────────

function StepCard({ step, icon: Icon, titleEn, titleAr, descEn, descAr, ar, done, onClick }: {
  step: number; icon: React.ElementType; titleEn: string; titleAr: string;
  descEn: string; descAr: string; ar: boolean; done: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`group text-start flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-150 cursor-pointer ${
      done
        ? "bg-emerald-50/40 border-emerald-200/50 hover:border-emerald-300/60"
        : "bg-background border-border/40 hover:border-primary/30 hover:shadow-sm"
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[13px] font-semibold ${
        done ? "bg-emerald-100 text-emerald-700" : "bg-primary/8 text-primary"
      }`}>
        {done ? <CheckCircle2 size={16} strokeWidth={2} /> : step}
      </div>
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <Icon size={15} strokeWidth={1.75} className={done ? "text-emerald-600" : "text-muted-foreground"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium leading-snug ${done ? "text-emerald-800" : "text-foreground"}`} style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? titleAr : titleEn}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{ar ? descAr : descEn}</p>
      </div>
      <ArrowRight size={14} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
    </button>
  );
}

// ─── Data overview row (with export) ─────────────────────

function DataRow({ icon: Icon, labelEn, labelAr, count, ar, color, onView, onExport }: {
  icon: React.ElementType; labelEn: string; labelAr: string; count: number;
  ar: boolean; color: string; onView: () => void; onExport: (() => void) | null;
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3 bg-background border border-border/30 rounded-xl hover:border-border/60 transition-colors group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={14} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{ar ? labelAr : labelEn}</p>
      </div>
      <span className="text-[16px] font-semibold text-foreground tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>
        {count}
      </span>
      <button onClick={onView} className="text-[11px] text-primary hover:text-primary/70 font-medium transition-colors shrink-0">
        {ar ? "عرض" : "View"}
      </button>
      {onExport && count > 0 && (
        <button onClick={onExport} title={ar ? "صدّر CSV" : "Export CSV"}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors shrink-0">
          <Download size={13} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

// ─── Status indicator ────────────────────────────────────

function DataStatus({ ar }: { ar: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/50 border border-emerald-200/40 rounded-lg">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-[11px] text-emerald-700 font-medium">
        {ar ? "بياناتك محفوظة · Supabase" : "Data saved · Live"}
      </span>
    </div>
  );
}

// ─── Live Metrics Row ────────────────────────────────────

interface MetricData { labelEn: string; labelAr: string; value: string; subEn: string; subAr: string; }

function MetricsRow({ metrics, ar }: { metrics: MetricData[]; ar: boolean }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/30">
      {metrics.map((h, i) => (
        <div key={i} className="bg-background px-6 py-5 flex flex-col gap-2.5 hover:bg-muted/20 transition-colors duration-150">
          <p className="text-[11px] text-muted-foreground tracking-wide">{ar ? h.labelAr : h.labelEn}</p>
          <span className="text-[22px] font-medium text-foreground leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {h.value}
          </span>
          <p className="text-[11px] text-muted-foreground/60">{ar ? h.subAr : h.subEn}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Work Items List ─────────────────────────────────────

function WorkItemsList({ items, ar }: { items: Tables["work_items"]["Row"][]; ar: boolean }) {
  const statusStyles: Record<string, string> = {
    in_progress: "bg-primary/8 text-primary",
    review: "bg-amber-50 text-amber-700 border border-amber-200/60",
    todo: "bg-muted text-muted-foreground",
    blocked: "bg-rose-50 text-rose-600 border border-rose-200/60",
    done: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  };

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden divide-y divide-border/40">
      {items.slice(0, 5).map((item) => (
        <div key={item.id} className="flex items-center gap-5 px-5 py-4 bg-background hover:bg-muted/20 transition-colors duration-150 group cursor-default">
          <div className="shrink-0 w-[38px] flex flex-col items-center gap-1">
            <span className="text-[15px] font-medium text-foreground leading-none" style={{ fontFamily: "var(--app-font-serif)" }}>
              {item.progress}
            </span>
            <span className="text-[10px] text-muted-foreground/60">%</span>
          </div>
          <div className="w-px self-stretch bg-border/40 shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[13.5px] font-medium text-foreground truncate leading-snug" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? (item.title_ar ?? item.title_en) : item.title_en}
              </h3>
              <span className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full ${statusStyles[item.status] ?? "bg-muted text-muted-foreground"}`}>
                {item.status.replace("_", " ")}
              </span>
            </div>
            <div className="h-[3px] rounded-full bg-border/50 overflow-hidden">
              <div className="h-full rounded-full bg-primary/50 transition-all duration-700" style={{ width: `${item.progress}%` }} />
            </div>
          </div>
          <ChevronRight size={13} className="shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function Today() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  const [, navigate] = useLocation();

  const ar = lang === "ar";
  const settings = workspace?.settings as Record<string, unknown> | undefined;
  const companyName = (settings?.company_name as string) || workspace?.name || "THOTH";
  const currency = (settings?.currency as string) || "SAR";
  const greeting = getGreeting(lang);
  const dateStr = formatDate(lang);

  const [loading, setLoading] = useState(!isDemoMode);
  const [deals, setDeals] = useState<Tables["deals"]["Row"][]>([]);
  const [invoices, setInvoices] = useState<Tables["invoices"]["Row"][]>([]);
  const [expenses, setExpenses] = useState<Tables["expenses"]["Row"][]>([]);
  const [workItems, setWorkItems] = useState<Tables["work_items"]["Row"][]>([]);
  const [people, setPeople] = useState<Tables["people"]["Row"][]>([]);
  const [orgs, setOrgs] = useState<Tables["organizations"]["Row"][]>([]);
  const [resources, setResources] = useState<Tables["resources"]["Row"][]>([]);

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    const ds = getDataSource();
    const wsId = workspace.id;
    Promise.all([
      ds.deals.list(wsId),
      ds.invoices.list(wsId),
      ds.expenses.list(wsId),
      ds.work_items.list(wsId),
      ds.people.list(wsId),
      ds.organizations.list(wsId),
      ds.resources.list(wsId),
    ]).then(([d, i, exp, w, p, o, r]) => {
      setDeals(d as Tables["deals"]["Row"][]);
      setInvoices(i as Tables["invoices"]["Row"][]);
      setExpenses(exp as Tables["expenses"]["Row"][]);
      setWorkItems(w as Tables["work_items"]["Row"][]);
      setPeople(p as Tables["people"]["Row"][]);
      setOrgs(o as Tables["organizations"]["Row"][]);
      setResources(r as Tables["resources"]["Row"][]);
    }).finally(() => setLoading(false));
  }, [workspace?.id]);

  const totalRecords = deals.length + invoices.length + workItems.length + people.length + orgs.length + resources.length + expenses.length;
  const hasData = totalRecords > 0;

  // Computed metrics
  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const revenue = paidInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const outstanding = invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0);
  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const pipelineValue = activeDeals.reduce((s, d) => s + Number(d.value) * (d.probability / 100), 0);
  const activeWork = workItems.filter((w) => w.status !== "done");

  const metrics: MetricData[] = [
    {
      labelEn: "Revenue Collected", labelAr: "الإيرادات المحصّلة",
      value: fmtCurrency(revenue, currency, ar ? "ar-SA" : "en-SA"),
      subEn: `${paidInvoices.length} paid invoices`, subAr: `${paidInvoices.length} فاتورة مدفوعة`,
    },
    {
      labelEn: "Pipeline Value", labelAr: "قيمة الصفقات",
      value: fmtCurrency(pipelineValue, currency, ar ? "ar-SA" : "en-SA"),
      subEn: `${activeDeals.length} active deals`, subAr: `${activeDeals.length} صفقة نشطة`,
    },
    {
      labelEn: "Outstanding", labelAr: "المستحقات",
      value: fmtCurrency(outstanding, currency, ar ? "ar-SA" : "en-SA"),
      subEn: `${overdueInvoices.length} overdue`, subAr: `${overdueInvoices.length} متأخرة`,
    },
    {
      labelEn: "Active Work", labelAr: "الشغل النشط",
      value: `${activeWork.length}`,
      subEn: `${workItems.filter((w) => w.status === "done").length} completed`, subAr: `${workItems.filter((w) => w.status === "done").length} مكتمل`,
    },
  ];

  // Export helpers
  const exp = (rows: Record<string, unknown>[], name: string) => exportCSV(rows, `thoth-${name}-${new Date().toISOString().slice(0, 10)}.csv`);

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[960px] mx-auto">

      {/* Page header + status */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-3">{dateStr}</p>
            <h1 className="text-[30px] font-medium text-foreground leading-tight mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {greeting}, {companyName}
            </h1>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[480px]">
              {ar ? "كل اللي يهمك في شغلك النهاردة، في لمحة واحدة." : "Everything that matters in your business today, at a glance."}
            </p>
          </div>
          {!isDemoMode && !loading && <DataStatus ar={ar} />}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
        </div>
      ) : !hasData ? (
        <>
          {/* ── Welcome hero ── */}
          <div className="bg-background border border-border/40 rounded-2xl p-8 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[16px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                  {ar ? "أهلاً بيك في ثوث" : "Welcome to THOTH"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {ar ? "مساحة عملك جاهزة. ابدأ من هنا." : "Your workspace is ready. Start here."}
                </p>
              </div>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[520px]">
              {ar
                ? "ثوث بيساعدك تدير شغلك — العملاء، المبيعات، الحسابات، والمهام. اتبع الخطوات دي عشان تبدأ."
                : "THOTH helps you manage your business — customers, sales, finance, and work. Follow these steps to get started."}
            </p>
          </div>

          {/* ── Numbered steps ── */}
          <Section en="Getting Started" ar="ابدأ من هنا" lang={lang}>
            <div className="flex flex-col gap-2.5">
              <StepCard step={1} icon={Building2} done={orgs.length > 0}
                titleEn="Add your first company or customer" titleAr="ضيف أول شركة أو عميل"
                descEn="Build your customer database" descAr="ابني قاعدة بيانات العملاء"
                ar={ar} onClick={() => navigate("/organizations")} />
              <StepCard step={2} icon={Users} done={people.length > 0}
                titleEn="Add contacts and people" titleAr="ضيف جهات اتصال وأشخاص"
                descEn="Import your key contacts" descAr="ضيف الأشخاص المهمين"
                ar={ar} onClick={() => navigate("/people")} />
              <StepCard step={3} icon={Briefcase} done={workItems.length > 0}
                titleEn="Create a work item, task, or project" titleAr="أنشئ مهمة أو مشروع"
                descEn="Track your work and orders" descAr="تتبع الشغل والطلبات"
                ar={ar} onClick={() => navigate("/work")} />
              <StepCard step={4} icon={ShoppingBag} done={deals.length > 0}
                titleEn="Add a deal or opportunity" titleAr="سجّل صفقة أو فرصة"
                descEn="Track your sales pipeline" descAr="تابع خط المبيعات"
                ar={ar} onClick={() => navigate("/sales")} />
              <StepCard step={5} icon={FileText} done={invoices.length > 0}
                titleEn="Create an invoice or expense" titleAr="أنشئ فاتورة أو مصروف"
                descEn="Start managing your finances" descAr="ابدأ بإدارة الحسابات"
                ar={ar} onClick={() => navigate("/finance")} />
            </div>
          </Section>

          {/* ── Roadmap teaser ── */}
          <div className="mt-2 mb-8">
            <button onClick={() => navigate("/roadmap")}
              className="group flex items-center gap-3 px-5 py-4 bg-primary/5 border border-primary/15 rounded-xl hover:bg-primary/8 transition-all w-full text-start">
              <Map size={16} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
                  {ar ? "شوف خارطة طريق ثوث" : "View THOTH ERP Roadmap"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {ar ? "الأقسام المتاحة واللي جاية قريب" : "See what's live and what's coming next"}
                </p>
              </div>
              <ArrowRight size={14} className="text-primary/50 group-hover:text-primary transition-colors shrink-0" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ── Business Health ── */}
          <Section en="Business Health" ar="صحة الأعمال" lang={lang}>
            <MetricsRow metrics={metrics} ar={ar} />
          </Section>

          {/* ── Data Overview ── */}
          <Section en="Your Data" ar="بياناتك" lang={lang}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <DataRow icon={Building2} labelEn="Organizations" labelAr="الشركات" count={orgs.length}
                color="text-emerald-600 bg-emerald-50" ar={ar} onView={() => navigate("/organizations")}
                onExport={() => exp(orgs, "organizations")} />
              <DataRow icon={Users} labelEn="People" labelAr="الأشخاص" count={people.length}
                color="text-violet-600 bg-violet-50" ar={ar} onView={() => navigate("/people")}
                onExport={() => exp(people, "people")} />
              <DataRow icon={Briefcase} labelEn="Work Items" labelAr="المهام" count={workItems.length}
                color="text-blue-600 bg-blue-50" ar={ar} onView={() => navigate("/work")}
                onExport={() => exp(workItems, "work-items")} />
              <DataRow icon={ShoppingBag} labelEn="Deals" labelAr="الصفقات" count={deals.length}
                color="text-amber-600 bg-amber-50" ar={ar} onView={() => navigate("/sales")}
                onExport={() => exp(deals, "deals")} />
              <DataRow icon={FileText} labelEn="Invoices" labelAr="الفواتير" count={invoices.length}
                color="text-cyan-600 bg-cyan-50" ar={ar} onView={() => navigate("/finance")}
                onExport={() => exp(invoices, "invoices")} />
              <DataRow icon={Receipt} labelEn="Expenses" labelAr="المصاريف" count={expenses.length}
                color="text-rose-600 bg-rose-50" ar={ar} onView={() => navigate("/finance")}
                onExport={expenses.length > 0 ? () => exp(expenses, "expenses") : null} />
              <DataRow icon={Package} labelEn="Resources" labelAr="الموارد" count={resources.length}
                color="text-orange-600 bg-orange-50" ar={ar} onView={() => navigate("/resources")}
                onExport={() => exp(resources, "resources")} />
            </div>
            <p className="text-[11px] text-muted-foreground/50 mt-3 text-center">
              {ar ? `${totalRecords} سجل إجمالي في مساحة عملك` : `${totalRecords} total records in your workspace`}
            </p>
          </Section>

          {/* ── Work In Motion ── */}
          {activeWork.length > 0 && (
            <Section en="Work In Motion" ar="الشغل الجاري" lang={lang}>
              <WorkItemsList items={activeWork} ar={ar} />
            </Section>
          )}

          {/* ── Needs Attention ── */}
          {overdueInvoices.length > 0 && (
            <Section en="Needs Attention" ar="محتاج اهتمام" lang={lang}>
              <div className="flex flex-col gap-3">
                {overdueInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-5 py-4 rounded-xl border bg-rose-50/60 border-rose-100 group cursor-default hover:shadow-sm transition-all duration-150">
                    <div className="w-1 self-stretch rounded-full bg-rose-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10.5px] font-semibold tracking-wide uppercase text-rose-600">
                        {ar ? "متأخر" : "Overdue"}
                      </span>
                      <p className="text-[13.5px] font-medium text-foreground mt-0.5 leading-snug" style={{ fontFamily: "var(--app-font-serif)" }}>
                        {inv.number} — {ar ? (inv.org_name_ar ?? inv.org_name_en) : inv.org_name_en}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {fmtCurrency(Number(inv.amount), inv.currency, ar ? "ar-SA" : "en-SA")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Quick Actions ── */}
          <Section en="Add Data" ar="ضيف بيانات" lang={lang}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { icon: Building2, en: "Customer", ar: "عميل", path: "/organizations" },
                { icon: Users, en: "Contact", ar: "شخص", path: "/people" },
                { icon: Briefcase, en: "Work Item", ar: "مهمة", path: "/work" },
                { icon: ShoppingBag, en: "Deal", ar: "صفقة", path: "/sales" },
                { icon: FileText, en: "Invoice", ar: "فاتورة", path: "/finance" },
                { icon: DollarSign, en: "Expense", ar: "مصروف", path: "/finance" },
                { icon: Package, en: "Resource", ar: "مورد", path: "/resources" },
                { icon: Map, en: "Roadmap", ar: "خارطة الطريق", path: "/roadmap" },
              ].map((item) => {
                const I = item.icon;
                return (
                  <button key={item.en} onClick={() => navigate(item.path)}
                    className="group flex flex-col items-center gap-2 px-3 py-4 rounded-xl border border-border/40 bg-background hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                      <I size={15} className="text-primary" strokeWidth={1.75} />
                    </div>
                    <span className="text-[11.5px] font-medium text-foreground">{ar ? item.ar : item.en}</span>
                  </button>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
