import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { useLocation } from "wouter";
import type { Database } from "../lib/database.types";
import {
  TrendingUp,
  ArrowUpRight,
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
  Plus,
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

// ─── Quick Action Card ───────────────────────────────────

function QuickAction({ icon: Icon, labelEn, labelAr, descEn, descAr, ar, onClick }: {
  icon: React.ElementType; labelEn: string; labelAr: string; descEn: string; descAr: string; ar: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group text-start flex items-start gap-3.5 px-4 py-4 bg-background border border-border/40 rounded-xl hover:border-primary/30 hover:bg-primary/3 hover:shadow-sm transition-all duration-150 cursor-pointer">
      <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/12 transition-colors">
        <Icon size={13} className="text-primary" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground leading-snug mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? labelAr : labelEn}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug">{ar ? descAr : descEn}</p>
      </div>
      <Zap size={11} className="shrink-0 text-primary/40 group-hover:text-primary/70 transition-colors mt-1" />
    </button>
  );
}

// ─── Welcome / Empty Dashboard ──────────────────────────

function WelcomeDashboard({ companyName, ar, navigate }: { companyName: string; ar: boolean; navigate: (p: string) => void }) {
  return (
    <>
      <Section en="Get Started" ar="يلا نبدأ" lang={ar ? "ar" : "en"}>
        <div className="bg-background border border-border/40 rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "مساحة عملك جاهزة" : "Your workspace is ready"}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {ar ? "ابدأ ببناء بيانات شركتك" : "Start building your company data"}
              </p>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[520px]">
            {ar
              ? "ثوث جاهز لإدارة شغلك. ضيف أول عميل أو صفقة أو فاتورة وابدأ."
              : "THOTH is ready to run your business. Add your first customer, deal, or invoice to get started."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickAction icon={Building2}
            labelEn="Add your first customer" labelAr="ضيف أول عميل"
            descEn="Start building your customer database" descAr="ابدأ ببناء قاعدة بيانات العملاء"
            ar={ar} onClick={() => navigate("/organizations")} />
          <QuickAction icon={Users}
            labelEn="Add a contact" labelAr="ضيف شخص"
            descEn="Import your key people" descAr="ضيف الأشخاص المهمين"
            ar={ar} onClick={() => navigate("/people")} />
          <QuickAction icon={ShoppingBag}
            labelEn="Create a deal" labelAr="سجّل صفقة"
            descEn="Track your first sales opportunity" descAr="تابع أول فرصة مبيعات"
            ar={ar} onClick={() => navigate("/sales")} />
          <QuickAction icon={Briefcase}
            labelEn="Create a work item" labelAr="أنشئ مهمة"
            descEn="Track tasks, orders, and projects" descAr="تتبع المهام والطلبات والمشاريع"
            ar={ar} onClick={() => navigate("/work")} />
          <QuickAction icon={FileText}
            labelEn="Create an invoice" labelAr="أنشئ فاتورة"
            descEn="Start managing your receivables" descAr="ابدأ بإدارة المستحقات"
            ar={ar} onClick={() => navigate("/finance")} />
          <QuickAction icon={Package}
            labelEn="Track a resource" labelAr="تتبع أصل أو مورد"
            descEn="Monitor equipment, vehicles, and assets" descAr="راقب المعدات والمركبات والأصول"
            ar={ar} onClick={() => navigate("/resources")} />
        </div>
      </Section>
    </>
  );
}

// ─── Live Metrics Row ────────────────────────────────────

interface MetricData {
  labelEn: string; labelAr: string;
  value: string;
  subEn: string; subAr: string;
}

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

export default function Dashboard() {
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
  const [workItems, setWorkItems] = useState<Tables["work_items"]["Row"][]>([]);
  const [people, setPeople] = useState<Tables["people"]["Row"][]>([]);
  const [orgs, setOrgs] = useState<Tables["organizations"]["Row"][]>([]);

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    const ds = getDataSource();
    const wsId = workspace.id;
    Promise.all([
      ds.deals.list(wsId),
      ds.invoices.list(wsId),
      ds.work_items.list(wsId),
      ds.people.list(wsId),
      ds.organizations.list(wsId),
    ]).then(([d, i, w, p, o]) => {
      setDeals(d as Tables["deals"]["Row"][]);
      setInvoices(i as Tables["invoices"]["Row"][]);
      setWorkItems(w as Tables["work_items"]["Row"][]);
      setPeople(p as Tables["people"]["Row"][]);
      setOrgs(o as Tables["organizations"]["Row"][]);
    }).finally(() => setLoading(false));
  }, [workspace?.id]);

  const hasData = deals.length > 0 || invoices.length > 0 || workItems.length > 0 || people.length > 0 || orgs.length > 0;

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

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[960px] mx-auto">

      {/* Page header */}
      <div className="mb-10">
        <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-3">{dateStr}</p>
        <h1 className="text-[30px] font-medium text-foreground leading-tight mb-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
          {greeting}, {companyName}
        </h1>
        <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[480px]">
          {ar ? "كل اللي يهمك في شغلك النهاردة، في لمحة واحدة." : "Everything that matters in your business today, at a glance."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
        </div>
      ) : !hasData ? (
        <WelcomeDashboard companyName={companyName} ar={ar} navigate={navigate} />
      ) : (
        <>
          <Section en="Business Health" ar="صحة الأعمال" lang={lang}>
            <MetricsRow metrics={metrics} ar={ar} />
          </Section>

          {activeWork.length > 0 && (
            <Section en="Work In Motion" ar="الشغل الجاري" lang={lang}>
              <WorkItemsList items={activeWork} ar={ar} />
            </Section>
          )}

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

          <Section en="Quick Actions" ar="إجراءات سريعة" lang={lang}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <QuickAction icon={ShoppingBag}
                labelEn="Add a new deal" labelAr="سجّل صفقة جديدة"
                descEn="Track a sales opportunity" descAr="تابع فرصة مبيعات"
                ar={ar} onClick={() => navigate("/sales")} />
              <QuickAction icon={Briefcase}
                labelEn="Create a work item" labelAr="أنشئ مهمة جديدة"
                descEn="Add a task or work order" descAr="ضيف مهمة أو أمر شغل"
                ar={ar} onClick={() => navigate("/work")} />
              <QuickAction icon={FileText}
                labelEn="Create an invoice" labelAr="أنشئ فاتورة"
                descEn="Bill a client" descAr="فاتور عميل"
                ar={ar} onClick={() => navigate("/finance")} />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
