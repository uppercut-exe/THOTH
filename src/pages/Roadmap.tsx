import { useLanguage } from "../context/LanguageContext";
import {
  Users, Building2, Landmark, Briefcase, Package, ShoppingBag,
  Truck, ShoppingCart, Wrench, BarChart3, Brain, CheckCircle2,
  Clock, Sparkles, Map,
} from "lucide-react";

interface Phase {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  icon: React.ElementType;
  color: string;
  status: "live" | "building" | "planned";
}

const PHASES: Phase[] = [
  {
    titleEn: "CRM", titleAr: "إدارة العملاء",
    descEn: "Customer database, contacts, organizations, relationship tracking, health scoring, and activity timelines.",
    descAr: "قاعدة بيانات العملاء، جهات الاتصال، الشركات، تتبع العلاقات، ومؤشرات الصحة.",
    icon: Users, color: "text-violet-600 bg-violet-50", status: "live",
  },
  {
    titleEn: "Sales & Deals", titleAr: "المبيعات والصفقات",
    descEn: "Deal pipeline, opportunity tracking, stage management, win/loss analysis, and revenue forecasting.",
    descAr: "خط أنابيب الصفقات، تتبع الفرص، إدارة المراحل، وتوقعات الإيرادات.",
    icon: ShoppingBag, color: "text-amber-600 bg-amber-50", status: "live",
  },
  {
    titleEn: "Finance & Invoicing", titleAr: "الحسابات والفواتير",
    descEn: "Invoice management, expense tracking, payment recording, revenue reports, and multi-currency support.",
    descAr: "إدارة الفواتير، تتبع المصاريف، تسجيل المدفوعات، وتقارير الإيرادات.",
    icon: Landmark, color: "text-emerald-600 bg-emerald-50", status: "live",
  },
  {
    titleEn: "Work Management", titleAr: "إدارة الشغل",
    descEn: "Tasks, projects, work orders, progress tracking, priorities, and team assignment.",
    descAr: "المهام، المشاريع، أوامر العمل، تتبع التقدم، والأولويات.",
    icon: Briefcase, color: "text-blue-600 bg-blue-50", status: "live",
  },
  {
    titleEn: "Resources & Assets", titleAr: "الموارد والأصول",
    descEn: "Equipment tracking, vehicle management, facility records, license management, and utilization monitoring.",
    descAr: "تتبع المعدات، إدارة المركبات، سجلات المنشآت، ومراقبة الاستخدام.",
    icon: Package, color: "text-cyan-600 bg-cyan-50", status: "live",
  },
  {
    titleEn: "HR & People", titleAr: "الموارد البشرية",
    descEn: "Employee directory, departments, attendance, leave management, and onboarding checklists.",
    descAr: "دليل الموظفين، الأقسام، إدارة الفريق، الأدوار والصلاحيات.",
    icon: Users, color: "text-rose-600 bg-rose-50", status: "live",
  },
  {
    titleEn: "Operations", titleAr: "العمليات",
    descEn: "Operations dashboard, Kanban board, work tracking, overdue monitoring, and team workload.",
    descAr: "لوحة العمليات، كانبان، تتبع الشغل، متابعة المتأخرات، وحجم شغل الفريق.",
    icon: Wrench, color: "text-orange-600 bg-orange-50", status: "live",
  },
  {
    titleEn: "Inventory & Assets", titleAr: "المخزون والأصول",
    descEn: "Stock management, asset tracking, maintenance scheduling, stock movements, and low-stock alerts.",
    descAr: "إدارة المخزون، تتبع الأصول، جدولة الصيانة، حركات المخزون، وتنبيهات الكمية القليلة.",
    icon: Package, color: "text-teal-600 bg-teal-50", status: "live",
  },
  {
    titleEn: "Purchasing & Vendors", titleAr: "المشتريات والموردين",
    descEn: "Vendor directory, purchase requests with approval flow, purchase orders, and procurement tracking.",
    descAr: "دليل الموردين، طلبات الشراء مع الموافقات، أوامر الشراء، ومتابعة المشتريات.",
    icon: ShoppingCart, color: "text-indigo-600 bg-indigo-50", status: "live",
  },
  {
    titleEn: "Logistics & Delivery", titleAr: "اللوجستيات والتوصيل",
    descEn: "Shipment tracking, delivery scheduling, fleet management, and route optimization.",
    descAr: "تتبع الشحنات، جدولة التوصيل، وإدارة الأسطول.",
    icon: Truck, color: "text-sky-600 bg-sky-50", status: "planned",
  },
  {
    titleEn: "Reports & Analytics", titleAr: "التقارير والتحليلات",
    descEn: "Executive dashboards, custom reports, data visualization, and business KPIs.",
    descAr: "لوحات تحكم تنفيذية، تقارير مخصصة، وعرض البيانات.",
    icon: BarChart3, color: "text-purple-600 bg-purple-50", status: "planned",
  },
  {
    titleEn: "Executive Intelligence", titleAr: "الذكاء التنفيذي",
    descEn: "AI-powered insights, risk detection, forecasting, decision support, and natural language search.",
    descAr: "رؤى ذكية، رصد المخاطر، التوقعات، ودعم القرارات بالذكاء الاصطناعي.",
    icon: Brain, color: "text-primary bg-primary/8", status: "planned",
  },
];

const STATUS_STYLE: Record<string, { labelEn: string; labelAr: string; cls: string; icon: React.ElementType }> = {
  live:     { labelEn: "Live",     labelAr: "متاح", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  building: { labelEn: "Building", labelAr: "قيد البناء", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: Wrench },
  planned:  { labelEn: "Planned",  labelAr: "مخطط", cls: "bg-muted text-muted-foreground border-border", icon: Clock },
};

export default function Roadmap() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const liveCount = PHASES.filter((p) => p.status === "live").length;
  const plannedCount = PHASES.filter((p) => p.status === "planned").length;

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-3">
          <Map size={14} strokeWidth={1.75} className="text-primary" />
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">
            {ar ? "خارطة الطريق" : "Product Roadmap"}
          </p>
        </div>
        <h1 className="text-[28px] font-medium text-foreground leading-tight mb-3" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
          {ar ? "خارطة طريق ثوث ERP" : "THOTH ERP Roadmap"}
        </h1>
        <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[560px]">
          {ar
            ? "ثوث بيتبني خطوة بخطوة ليكون نظام إدارة أعمال متكامل. هنا هتلاقي الأقسام اللي شغالة دلوقتي واللي جاية."
            : "THOTH is being built step by step into a complete business operating system. Here you'll find what's live today and what's coming next."}
        </p>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
            {liveCount} {ar ? "متاح" : "live"}
          </span>
          <span className="text-[12px] text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full font-medium">
            {plannedCount} {ar ? "مخطط" : "planned"}
          </span>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-3">
        {PHASES.map((phase, i) => {
          const Icon = phase.icon;
          const [iconCl, bgCl] = phase.color.split(" ");
          const st = STATUS_STYLE[phase.status];
          const StIcon = st.icon;

          return (
            <div key={i} className="flex items-start gap-4 p-5 bg-background border border-border/40 rounded-xl hover:border-border/70 hover:shadow-sm transition-all duration-150">
              <div className={`w-10 h-10 rounded-xl ${bgCl} flex items-center justify-center shrink-0`}>
                <Icon size={18} strokeWidth={1.75} className={iconCl} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <h3 className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
                    {ar ? phase.titleAr : phase.titleEn}
                  </h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>
                    <StIcon size={10} strokeWidth={2} />
                    {ar ? st.labelAr : st.labelEn}
                  </span>
                </div>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  {ar ? phase.descAr : phase.descEn}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="mt-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/15 rounded-xl">
          <Sparkles size={14} className="text-primary" />
          <p className="text-[12px] text-foreground/70">
            {ar
              ? "ثوث بيتطور باستمرار. رأيك يساعدنا نبني اللي يفيدك."
              : "THOTH is evolving continuously. Your feedback helps us build what matters to you."}
          </p>
        </div>
      </div>
    </div>
  );
}
