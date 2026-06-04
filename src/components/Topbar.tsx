import { useState } from "react";
import { Search, Bell, Menu, LogIn, LogOut, User } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCommandBar } from "../context/CommandBarContext";
import { useLocation } from "wouter";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./auth/AuthModal";

const routeLabels: Record<string, { en: string; ar: string }> = {
  "/":              { en: "Dashboard",     ar: "لوحة التحكم" },
  "/today":         { en: "Today",         ar: "اليوم" },
  "/activity":      { en: "Activity",      ar: "النشاط" },
  "/people":        { en: "People",        ar: "الأشخاص" },
  "/organizations": { en: "Organizations", ar: "الشركات" },
  "/work":          { en: "Work",          ar: "الشغل" },
  "/sales":         { en: "Sales",         ar: "المبيعات" },
  "/operations":    { en: "Operations",    ar: "العمليات" },
  "/inventory":     { en: "Inventory",     ar: "المخزون والأصول" },
  "/resources":     { en: "Resources",     ar: "الموارد" },
  "/finance":       { en: "Finance",       ar: "الحسابات" },
  "/knowledge":     { en: "Knowledge",     ar: "المعرفة" },
  "/intelligence":  { en: "Intelligence",  ar: "الذكاء" },
  "/memory":        { en: "Memory",        ar: "الذاكرة" },
  "/decisions":     { en: "Decisions",     ar: "القرارات" },
  "/queue":         { en: "Work Queue",    ar: "قائمة الشغل" },
  "/forecast":      { en: "Forecast",      ar: "التوقعات" },
  "/risk":          { en: "Risk Radar",    ar: "رادار المخاطر" },
  "/rhythms":       { en: "Rhythms",       ar: "الإيقاعات" },
  "/exec":          { en: "Executive",     ar: "التنفيذي" },
  "/team":          { en: "Team",          ar: "الفريق" },
  "/purchasing":    { en: "Purchasing",    ar: "المشتريات" },
  "/roadmap":       { en: "Roadmap",       ar: "خارطة الطريق" },
  "/data":          { en: "Data",          ar: "إدارة البيانات" },
  "/settings":      { en: "Settings",      ar: "الإعدادات" },
};

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { lang, setLang } = useLanguage();
  const { openBar } = useCommandBar();
  const [location] = useLocation();
  const { user, isAuthenticated, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const pageLabel = routeLabels[location]
    ?? Object.entries(routeLabels).find(([path]) => path !== "/" && location.startsWith(path + "/"))?.[1]
    ?? { en: "THOTH", ar: "ثوث" };
  const ar = lang === "ar";

  return (
    <header className="h-[56px] shrink-0 flex items-center px-4 gap-3 bg-background border-b border-border/50">

      {/* ── Left: Hamburger (mobile) + breadcrumb ── */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          data-testid="button-menu"
          className="
            md:hidden w-8 h-8 rounded-lg shrink-0
            flex items-center justify-center
            text-muted-foreground hover:text-foreground hover:bg-accent
            transition-colors duration-150
          "
        >
          <Menu size={17} strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="thoth-eyebrow hidden sm:inline select-none">THOTH</span>
          <span className="text-border/80 text-xs hidden sm:inline select-none">/</span>
          <h1
            className="text-[13px] font-medium text-foreground truncate"
            style={{ letterSpacing: "-0.01em" }}
          >
            {ar ? pageLabel.ar : pageLabel.en}
          </h1>
        </div>
      </div>

      {/* ── Center: Search trigger → opens Command Bar ── */}
      <button
        onClick={openBar}
        data-testid="input-global-search"
        className="
          hidden md:flex items-center gap-2 flex-1 max-w-[360px]
          h-8 ps-3 pe-3 rounded-xl
          border border-border/70 bg-card/80
          text-[13px] text-muted-foreground/70
          hover:bg-card hover:border-border/90 hover:text-muted-foreground
          transition-all duration-150 cursor-text select-none
        "
      >
        <Search size={13} strokeWidth={1.75} className="shrink-0" />
        <span className="flex-1 text-start truncate">
          {ar ? "ابحث في ثوث..." : "Search THOTH…"}
        </span>
        <kbd className="shrink-0 hidden lg:inline-flex items-center text-[10px] text-muted-foreground/40 border border-border/50 rounded px-1.5 py-0.5 font-sans">
          ⌘K
        </kbd>
      </button>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1 text-muted-foreground">

        {/* Mobile search trigger */}
        <button
          onClick={openBar}
          data-testid="button-search-mobile"
          aria-label="Search"
          className="
            md:hidden w-8 h-8 rounded-lg flex items-center justify-center
            hover:text-foreground hover:bg-accent
            transition-colors duration-150
          "
        >
          <Search size={16} strokeWidth={1.75} />
        </button>

        {/* Notification bell */}
        <button
          data-testid="button-notifications"
          aria-label="Notifications"
          className="
            relative w-8 h-8 rounded-lg flex items-center justify-center
            hover:text-foreground hover:bg-accent
            transition-colors duration-150
          "
        >
          <Bell size={15} strokeWidth={1.75} />
          <span
            className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-primary ring-1 ring-background"
            aria-hidden="true"
          />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-border/60 mx-1.5" aria-hidden="true" />

        {/* Language toggle */}
        <button
          data-testid="button-language-toggle"
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
          className="
            h-7 px-2.5 rounded-md shrink-0
            text-[11px] font-medium tracking-wide
            text-muted-foreground
            border border-border/60 bg-card/60
            hover:text-foreground hover:bg-card hover:border-border
            transition-all duration-150 select-none
          "
        >
          {lang === "en" ? "AR" : "EN"}
        </button>

        {/* Auth */}
        {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={13} strokeWidth={1.75} />
              </div>
              <button
                onClick={() => signOut()}
                title={user?.email ?? "Sign out"}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <LogOut size={13} strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="h-7 px-3 rounded-lg text-[11.5px] font-medium bg-foreground text-background hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <LogIn size={12} strokeWidth={2} />
              {ar ? "دخول" : "Sign in"}
            </button>
          )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
