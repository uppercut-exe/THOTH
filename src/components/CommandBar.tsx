import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowRight, Clock, Zap,
  Briefcase, Users, Building2, DollarSign,
  Package, BarChart2, Navigation,
  CheckSquare, TrendingUp, FileText, X,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useCommandBar } from "../context/CommandBarContext";
import { buildSearchIndex, searchIndex, groupByType, SearchResult, SearchResultType } from "../search/searchIndex";
import { useToast } from "@/hooks/use-toast";

// ─── Recent history helpers ────────────────────────────────

const HISTORY_KEY = "thoth_command_history";
const MAX_HISTORY = 8;

function loadHistory(): string[] {
  try {
    const s = localStorage.getItem(HISTORY_KEY);
    if (s) return JSON.parse(s);
  } catch (_) {}
  return [];
}

function pushHistory(query: string) {
  if (!query.trim()) return;
  const h = loadHistory().filter((q) => q !== query);
  h.unshift(query);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY))); } catch (_) {}
}

// ─── Type meta ────────────────────────────────────────────

const TYPE_META: Record<SearchResultType, { labelEn: string; labelAr: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }> = {
  work:         { labelEn: "Work",          labelAr: "العمل",        Icon: Briefcase },
  deal:         { labelEn: "Sales",         labelAr: "المبيعات",     Icon: TrendingUp },
  person:       { labelEn: "People",        labelAr: "الأشخاص",      Icon: Users },
  organization: { labelEn: "Organizations", labelAr: "المنظمات",     Icon: Building2 },
  invoice:      { labelEn: "Finance",       labelAr: "المالية",      Icon: DollarSign },
  resource:     { labelEn: "Resources",     labelAr: "الموارد",      Icon: Package },
};

const TYPE_ORDER: SearchResultType[] = ["work", "deal", "person", "organization", "invoice", "resource"];

// ─── Navigation commands ──────────────────────────────────

interface NavCommand {
  id: string;
  labelEn: string;
  labelAr: string;
  route: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const NAV_COMMANDS: NavCommand[] = [
  { id: "nav-work",    labelEn: "Go to Work",          labelAr: "انتقل إلى العمل",       route: "/work",          Icon: Briefcase },
  { id: "nav-sales",   labelEn: "Go to Sales",         labelAr: "انتقل إلى المبيعات",    route: "/sales",         Icon: TrendingUp },
  { id: "nav-finance", labelEn: "Go to Finance",       labelAr: "انتقل إلى المالية",     route: "/finance",       Icon: DollarSign },
  { id: "nav-people",  labelEn: "Go to People",        labelAr: "انتقل إلى الأشخاص",     route: "/people",        Icon: Users },
  { id: "nav-orgs",    labelEn: "Go to Organizations", labelAr: "انتقل إلى المنظمات",    route: "/organizations", Icon: Building2 },
  { id: "nav-res",     labelEn: "Go to Resources",     labelAr: "انتقل إلى الموارد",     route: "/resources",     Icon: Package },
  { id: "nav-intel",   labelEn: "Go to Intelligence",  labelAr: "انتقل إلى الذكاء",      route: "/intelligence",  Icon: BarChart2 },
];

// ─── Action commands ──────────────────────────────────────

interface ActionCommand {
  id: string;
  labelEn: string;
  labelAr: string;
  route?: string;
  toastEn?: string;
  toastAr?: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

const ACTION_COMMANDS: ActionCommand[] = [
  { id: "act-work",   labelEn: "Create Work Item",   labelAr: "إنشاء مهمة",      route: "/work",          Icon: Briefcase },
  { id: "act-deal",   labelEn: "Create Deal",        labelAr: "إنشاء صفقة",      route: "/sales",         Icon: TrendingUp },
  { id: "act-org",    labelEn: "Create Organization",labelAr: "إنشاء منظمة",     route: "/organizations", Icon: Building2 },
  { id: "act-person", labelEn: "Create Person",      labelAr: "إنشاء شخص",       route: "/people",        Icon: Users },
  { id: "act-inv",    labelEn: "Create Invoice",     labelAr: "إنشاء فاتورة",    route: "/finance",       Icon: FileText },
  { id: "act-res",    labelEn: "Create Resource",    labelAr: "إنشاء مورد",      route: "/resources",     Icon: Package },
];

const QUICK_ACTIONS: ActionCommand[] = [
  { id: "qa-overdue",  labelEn: "Open Overdue Invoices",     labelAr: "عرض الفواتير المتأخرة",        route: "/finance",   Icon: DollarSign },
  { id: "qa-hipri",    labelEn: "Open High Priority Work",   labelAr: "عرض المهام ذات الأولوية العالية", route: "/work",   Icon: Zap },
  { id: "qa-won",      labelEn: "View Won Deals",            labelAr: "عرض الصفقات الفائزة",          route: "/sales",     Icon: CheckSquare },
  { id: "qa-activity", labelEn: "Open Activity Feed",        labelAr: "فتح سجل النشاط",               route: "/activity",  Icon: Navigation },
];

// ─── Flat item list for keyboard nav ─────────────────────

type FlatItem =
  | { kind: "result"; item: SearchResult }
  | { kind: "nav"; item: NavCommand }
  | { kind: "action"; item: ActionCommand }
  | { kind: "quick"; item: ActionCommand }
  | { kind: "history"; query: string };

// ─── Result Row ───────────────────────────────────────────

function ResultRow({
  title, subtitle, Icon, selected, onClick,
}: {
  title: string; subtitle?: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  selected: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (selected) ref.current?.scrollIntoView({ block: "nearest" }); }, [selected]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-start
        transition-colors duration-75 group
        ${selected ? "bg-primary/8 text-foreground" : "text-foreground/80 hover:bg-accent/50"}
      `}
    >
      <span className={`
        shrink-0 w-7 h-7 rounded-md flex items-center justify-center
        ${selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground"}
        transition-colors duration-75
      `}>
        <Icon size={13} strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-medium leading-tight truncate">{title}</span>
        {subtitle && (
          <span className="block text-[11px] text-muted-foreground leading-tight truncate mt-0.5">{subtitle}</span>
        )}
      </span>
      {selected && (
        <span className="shrink-0 text-[10px] text-muted-foreground/60 border border-border rounded px-1 py-0.5">↵</span>
      )}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-3 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
    </div>
  );
}

// ─── Main CommandBar ──────────────────────────────────────

export function CommandBar() {
  const { open, closeBar } = useCommandBar();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const ar = lang === "ar";

  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildSearchIndex(), [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setHistory(loadHistory());
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const results = useMemo(() => searchIndex(query, index), [query, index]);
  const grouped = useMemo(() => groupByType(results), [results]);

  const flatItems = useMemo((): FlatItem[] => {
    if (query.trim()) {
      const items: FlatItem[] = [];
      for (const type of TYPE_ORDER) {
        const group = grouped[type] ?? [];
        for (const item of group.slice(0, 5)) {
          items.push({ kind: "result", item });
        }
      }
      return items;
    }
    const items: FlatItem[] = [];
    history.slice(0, 4).forEach((q) => items.push({ kind: "history", query: q }));
    NAV_COMMANDS.forEach((c) => items.push({ kind: "nav", item: c }));
    ACTION_COMMANDS.forEach((c) => items.push({ kind: "action", item: c }));
    QUICK_ACTIONS.forEach((c) => items.push({ kind: "quick", item: c }));
    return items;
  }, [query, grouped, history]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleSelect = useCallback((fi: FlatItem) => {
    if (fi.kind === "history") {
      setQuery(fi.query);
      return;
    }
    if (fi.kind === "result") {
      pushHistory(query);
      setHistory(loadHistory());
      closeBar();
      navigate(fi.item.route);
      return;
    }
    if (fi.kind === "nav") {
      closeBar();
      navigate(fi.item.route);
      return;
    }
    if (fi.kind === "action" || fi.kind === "quick") {
      const cmd = fi.item;
      closeBar();
      if (cmd.toastEn) {
        toast({ title: ar ? cmd.toastAr : cmd.toastEn });
      } else if (cmd.route) {
        navigate(cmd.route);
      }
    }
  }, [query, ar, closeBar, navigate, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const fi = flatItems[selectedIdx];
      if (fi) handleSelect(fi);
    } else if (e.key === "Escape") {
      closeBar();
    }
  }, [flatItems, selectedIdx, handleSelect, closeBar]);

  const hasResults = results.length > 0;
  const hasQuery = query.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={closeBar}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[14vh] z-50 mx-auto w-full max-w-[580px] px-4"
            role="dialog"
            aria-modal="true"
            aria-label={ar ? "شريط الأوامر" : "Command bar"}
          >
            <div className="rounded-2xl border border-border/60 bg-background shadow-2xl shadow-black/20 overflow-hidden">

              {/* Input */}
              <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-border/50 ${ar ? "flex-row-reverse" : ""}`}>
                <Search size={15} strokeWidth={1.75} className="shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={ar ? "ابحث أو اكتب أمراً..." : "Search or type a command…"}
                  className={`
                    flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/60
                    outline-none border-none min-w-0
                    ${ar ? "text-right" : ""}
                  `}
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                )}
                <kbd className="shrink-0 hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 border border-border/50 rounded px-1.5 py-0.5">
                  Esc
                </kbd>
              </div>

              {/* Body */}
              <div className="max-h-[62vh] overflow-y-auto overscroll-contain p-2">

                {/* No results */}
                {hasQuery && !hasResults && (
                  <div className="py-10 text-center text-[13px] text-muted-foreground">
                    {ar ? "لا توجد نتائج لـ" : "No results for"}{" "}
                    <span className="font-medium text-foreground">"{query}"</span>
                  </div>
                )}

                {/* Search results grouped by type */}
                {hasQuery && hasResults && TYPE_ORDER.map((type) => {
                  const group = grouped[type] ?? [];
                  if (!group.length) return null;
                  const meta = TYPE_META[type];
                  return (
                    <div key={type}>
                      <SectionLabel label={ar ? meta.labelAr : meta.labelEn} />
                      {group.slice(0, 5).map((item) => {
                        const fi: FlatItem = { kind: "result", item };
                        const idx = flatItems.findIndex((f) => f.kind === "result" && f.item.id === item.id);
                        return (
                          <ResultRow
                            key={item.id}
                            title={ar ? item.titleAr : item.titleEn}
                            subtitle={ar ? item.subtitleAr : item.subtitleEn}
                            Icon={meta.Icon}
                            selected={selectedIdx === idx}
                            onClick={() => handleSelect(fi)}
                          />
                        );
                      })}
                    </div>
                  );
                })}

                {/* Default state — Recent, Navigation, Actions, Quick Actions */}
                {!hasQuery && (
                  <>
                    {/* Recent searches */}
                    {history.length > 0 && (
                      <div>
                        <SectionLabel label={ar ? "البحث الأخير" : "Recent"} />
                        {history.slice(0, 4).map((q, i) => {
                          const fi: FlatItem = { kind: "history", query: q };
                          const idx = flatItems.findIndex((f) => f.kind === "history" && f.query === q);
                          return (
                            <ResultRow
                              key={`hist-${i}`}
                              title={q}
                              Icon={Clock}
                              selected={selectedIdx === idx}
                              onClick={() => handleSelect(fi)}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Navigation */}
                    <SectionLabel label={ar ? "التنقل" : "Navigation"} />
                    {NAV_COMMANDS.map((cmd) => {
                      const fi: FlatItem = { kind: "nav", item: cmd };
                      const idx = flatItems.findIndex((f) => f.kind === "nav" && f.item.id === cmd.id);
                      return (
                        <ResultRow
                          key={cmd.id}
                          title={ar ? cmd.labelAr : cmd.labelEn}
                          Icon={cmd.Icon}
                          selected={selectedIdx === idx}
                          onClick={() => handleSelect(fi)}
                        />
                      );
                    })}

                    {/* Actions */}
                    <SectionLabel label={ar ? "إجراءات" : "Actions"} />
                    {ACTION_COMMANDS.map((cmd) => {
                      const fi: FlatItem = { kind: "action", item: cmd };
                      const idx = flatItems.findIndex((f) => f.kind === "action" && f.item.id === cmd.id);
                      return (
                        <ResultRow
                          key={cmd.id}
                          title={ar ? cmd.labelAr : cmd.labelEn}
                          Icon={cmd.Icon}
                          selected={selectedIdx === idx}
                          onClick={() => handleSelect(fi)}
                        />
                      );
                    })}

                    {/* Quick Actions */}
                    <SectionLabel label={ar ? "إجراءات سريعة" : "Quick Actions"} />
                    {QUICK_ACTIONS.map((cmd) => {
                      const fi: FlatItem = { kind: "quick", item: cmd };
                      const idx = flatItems.findIndex((f) => f.kind === "quick" && f.item.id === cmd.id);
                      return (
                        <ResultRow
                          key={cmd.id}
                          title={ar ? cmd.labelAr : cmd.labelEn}
                          Icon={cmd.Icon}
                          selected={selectedIdx === idx}
                          onClick={() => handleSelect(fi)}
                        />
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className={`flex items-center gap-3 px-4 py-2.5 border-t border-border/30 bg-muted/30 ${ar ? "flex-row-reverse" : ""}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <kbd className="border border-border/50 rounded px-1 py-0.5">↑↓</kbd>
                  <span>{ar ? "للتنقل" : "navigate"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <kbd className="border border-border/50 rounded px-1 py-0.5">↵</kbd>
                  <span>{ar ? "للتحديد" : "select"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                  <kbd className="border border-border/50 rounded px-1 py-0.5">Esc</kbd>
                  <span>{ar ? "للإغلاق" : "close"}</span>
                </div>
                <div className={`${ar ? "me-auto" : "ms-auto"} text-[10px] text-muted-foreground/40`}>
                  THOTH Search
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Global keyboard hook ─────────────────────────────────

export function useCommandBarShortcut() {
  const { toggleBar } = useCommandBar();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleBar();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleBar]);
}
