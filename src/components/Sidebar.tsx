import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Activity,
  Users,
  Building2,
  Briefcase,
  ShoppingBag,
  Wrench,
  Archive,
  Landmark,
  BookOpen,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Brain,
  Target,
  TrendingUp,
  Shield,
  Calendar,
  Star,
  Radio,
  Map,
  Database,
  UserPlus,
  ShoppingCart,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useOnboarding } from "../context/OnboardingContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

// ─── Nav structure ────────────────────────────────────────

const EXEC_NAV = [
  { id: "dashboard", icon: Radio,       labelEn: "Dashboard",  labelAr: "لوحة التحكم", path: "/" },
  { id: "queue",     icon: Target,      labelEn: "Work Queue", labelAr: "قائمة الشغل", path: "/queue" },
  { id: "forecast",  icon: TrendingUp,  labelEn: "Forecast",   labelAr: "التوقعات",    path: "/forecast" },
  { id: "risk",      icon: Shield,      labelEn: "Risk Radar", labelAr: "رادار المخاطر", path: "/risk" },
  { id: "rhythms",   icon: Calendar,    labelEn: "Rhythms",    labelAr: "الإيقاعات",   path: "/rhythms" },
  { id: "exec",      icon: Star,        labelEn: "Executive",  labelAr: "التنفيذي",    path: "/exec" },
] as const;

const CORE_NAV = [
  { id: "today",         icon: LayoutDashboard, labelEn: "Today",        labelAr: "اليوم",        path: "/today" },
  { id: "activity",      icon: Activity,        labelEn: "Activity",     labelAr: "النشاط",       path: "/activity" },
  { id: "people",        icon: Users,           labelEn: "People",       labelAr: "الأشخاص",      path: "/people" },
  { id: "organizations", icon: Building2,       labelEn: "Organizations",labelAr: "الشركات",      path: "/organizations" },
  { id: "work",          icon: Briefcase,       labelEn: "Work",         labelAr: "الشغل",         path: "/work" },
  { id: "sales",         icon: ShoppingBag,     labelEn: "Sales",        labelAr: "المبيعات",     path: "/sales" },
  { id: "operations",    icon: Wrench,          labelEn: "Operations",   labelAr: "العمليات",     path: "/operations" },
  { id: "team",          icon: UserPlus,        labelEn: "Team",         labelAr: "الفريق",       path: "/team" },
  { id: "inventory",     icon: Archive,         labelEn: "Inventory",    labelAr: "المخزون",      path: "/inventory" },
  { id: "finance",       icon: Landmark,        labelEn: "Finance",      labelAr: "الحسابات",     path: "/finance" },
  { id: "purchasing",    icon: ShoppingCart,    labelEn: "Purchasing",   labelAr: "المشتريات",   path: "/purchasing" },
  { id: "knowledge",     icon: BookOpen,        labelEn: "Knowledge",    labelAr: "المعرفة",      path: "/knowledge" },
] as const;

const INTEL_NAV = [
  { id: "intelligence", icon: Sparkles, labelEn: "Intelligence", labelAr: "الذكاء",    path: "/intelligence" },
  { id: "memory",       icon: Brain,    labelEn: "Memory",       labelAr: "الذاكرة",   path: "/memory" },
  { id: "decisions",    icon: Target,   labelEn: "Decisions",    labelAr: "القرارات",  path: "/decisions" },
] as const;

// ─── THOTH symbol ─────────────────────────────────────────

function ThothMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-primary"
      aria-hidden="true"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.75" />
    </svg>
  );
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ─── Props ────────────────────────────────────────────────

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

// ─── Nav item ─────────────────────────────────────────────

interface NavItemProps {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, path, isActive, collapsed, onClick }: NavItemProps) {
  return (
    <Link
      href={path}
      onClick={onClick}
      className={`
        group relative flex items-center gap-2.5 px-3 py-2 rounded-lg
        transition-all duration-150 select-none
        ${collapsed ? "justify-center" : ""}
        ${isActive
          ? "thoth-primary-selected text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
        }
      `}
    >
      <Icon
        size={15}
        strokeWidth={isActive ? 2 : 1.75}
        className="shrink-0"
      />
      {!collapsed && (
        <span className="text-[13px] leading-none truncate">{label}</span>
      )}
      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="
          pointer-events-none absolute start-full ms-2.5 z-50
          px-2.5 py-1.5 rounded-lg
          bg-popover border border-border text-foreground shadow-md
          text-[12px] whitespace-nowrap
          opacity-0 group-hover:opacity-100
          translate-x-0 transition-opacity duration-150
        ">
          {label}
        </div>
      )}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-1 border-t border-border/30 mx-1" />;
  }
  return (
    <p className="px-3 pt-3 pb-1 text-[9px] text-muted-foreground/40 tracking-[0.1em] uppercase font-medium">
      {label}
    </p>
  );
}

// ─── Sidebar content ──────────────────────────────────────

function SidebarContent({
  collapsed,
  setCollapsed,
  onNavClick,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onNavClick?: () => void;
}) {
  const { lang, isRtl } = useLanguage();
  const { onboardingData } = useOnboarding();
  const { workspace } = useAuth();
  const [location] = useLocation();

  const wsSettings = workspace?.settings as Record<string, unknown> | undefined;
  const companyName = (wsSettings?.company_name as string) || onboardingData?.companyName || workspace?.name || "THOTH";
  const industry = (wsSettings?.industry as string) || onboardingData?.industry || "";
  const country = (wsSettings?.country as string) || "";
  const city = (wsSettings?.city as string) || "";
  const locationLabel = [city, country].filter(Boolean).join(", ") || industry;
  const initials = getInitials(companyName);

  function isActive(path: string) {
    return path === "/" ? location === "/" : location.startsWith(path);
  }

  return (
    <div className="flex flex-col h-full bg-sidebar relative">

      {/* Logo row */}
      <div className="h-[56px] flex items-center px-4 shrink-0 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <ThothMark size={20} />
          {!collapsed && (
            <span
              className="text-[15px] font-medium text-foreground tracking-wide leading-none"
              style={{ fontFamily: "var(--app-font-serif)" }}
            >
              THOTH
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="
              hidden md:flex w-6 h-6 rounded-md shrink-0
              items-center justify-center
              text-muted-foreground hover:text-foreground hover:bg-sidebar-accent
              transition-colors duration-150
            "
          >
            {isRtl ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">

        {/* Executive OS */}
        <SectionLabel label={lang === "ar" ? "لوحة التحكم" : "Executive OS"} collapsed={collapsed} />
        {EXEC_NAV.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            icon={item.icon}
            label={lang === "ar" ? item.labelAr : item.labelEn}
            path={item.path}
            isActive={isActive(item.path)}
            collapsed={collapsed}
            onClick={onNavClick}
          />
        ))}

        {/* Core */}
        <SectionLabel label={lang === "ar" ? "الأساسي" : "Core"} collapsed={collapsed} />
        {CORE_NAV.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            icon={item.icon}
            label={lang === "ar" ? item.labelAr : item.labelEn}
            path={item.path}
            isActive={isActive(item.path)}
            collapsed={collapsed}
            onClick={onNavClick}
          />
        ))}

        {/* Intelligence */}
        <SectionLabel label={lang === "ar" ? "الذكاء" : "Intelligence"} collapsed={collapsed} />
        {INTEL_NAV.map((item) => (
          <NavItem
            key={item.id}
            id={item.id}
            icon={item.icon}
            label={lang === "ar" ? item.labelAr : item.labelEn}
            path={item.path}
            isActive={isActive(item.path)}
            collapsed={collapsed}
            onClick={onNavClick}
          />
        ))}

        <div className="my-2 border-t border-border/40 mx-1" />

        <NavItem
          id="data"
          icon={Database}
          label={lang === "ar" ? "إدارة البيانات" : "Data"}
          path="/data"
          isActive={location === "/data"}
          collapsed={collapsed}
          onClick={onNavClick}
        />
        <NavItem
          id="roadmap"
          icon={Map}
          label={lang === "ar" ? "خارطة الطريق" : "Roadmap"}
          path="/roadmap"
          isActive={location === "/roadmap"}
          collapsed={collapsed}
          onClick={onNavClick}
        />
        <NavItem
          id="settings"
          icon={Settings}
          label={lang === "ar" ? "الإعدادات" : "Settings"}
          path="/settings"
          isActive={location === "/settings"}
          collapsed={collapsed}
          onClick={onNavClick}
        />
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="
            hidden md:flex mx-auto mb-2 w-7 h-7 rounded-lg
            items-center justify-center
            text-muted-foreground hover:text-foreground hover:bg-sidebar-accent
            transition-colors duration-150
          "
        >
          {isRtl ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      )}

      {/* User / company area */}
      <div className="p-3 border-t border-border/40 shrink-0 flex items-center gap-2.5 overflow-hidden">
        <div
          className="
            w-8 h-8 rounded-lg shrink-0
            bg-primary/10 text-primary
            flex items-center justify-center
            text-[10px] font-semibold tracking-wide select-none
          "
          aria-label={companyName}
        >
          {initials}
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[12.5px] font-medium text-foreground truncate leading-tight">
              {companyName}
            </span>
            {locationLabel && (
              <span className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                {locationLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar (always visible, collapsible) ── */}
      <aside
        className={`
          hidden md:block h-full shrink-0
          border-e border-sidebar-border/60
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-[60px]" : "w-[220px]"}
        `}
      >
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>

      {/* ── Mobile sidebar (drawer overlay) ── */}
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]
          md:hidden
          transition-opacity duration-200
          ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`
          fixed top-0 start-0 bottom-0 z-50
          w-[260px]
          md:hidden
          transition-transform duration-300 ease-in-out
          border-e border-sidebar-border/60
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ direction: "inherit" }}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="
            absolute top-4 end-4 z-10
            w-7 h-7 rounded-lg
            flex items-center justify-center
            text-muted-foreground hover:text-foreground hover:bg-sidebar-accent
            transition-colors
          "
        >
          <X size={15} />
        </button>

        <SidebarContent
          collapsed={false}
          setCollapsed={() => {}}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
