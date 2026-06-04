import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  loadResources, fmtVal, RESOURCE_TYPE_META, RESOURCE_STATUS_META,
  type Resource, type ResourceType, type ResourceStatus,
} from "../data/resources";
import {
  Search, X, Package, Truck, Building2, FileCheck, Wrench, Box,
  ChevronRight, MapPin, User, Gauge, DollarSign, AlertTriangle,
  CheckCircle2, LayoutGrid, List,
} from "lucide-react";
import { isDemoMode } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { ResourcesLive } from "../lib/liveViews";

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  equipment: Wrench, inventory: Box, vehicle: Truck, facility: Building2, license: FileCheck, other: Package,
};

const TYPE_FILTERS: { value: ResourceType | "all"; en: string; ar: string }[] = [
  { value: "all",       en: "All",       ar: "الكل" },
  { value: "equipment", en: "Equipment", ar: "معدات" },
  { value: "inventory", en: "Inventory", ar: "مخزون" },
  { value: "vehicle",   en: "Vehicles",  ar: "مركبات" },
  { value: "facility",  en: "Facilities",ar: "منشآت" },
  { value: "license",   en: "Licenses",  ar: "تراخيص" },
];

const STATUS_FILTERS: { value: ResourceStatus | "all"; en: string; ar: string }[] = [
  { value: "all",         en: "All Status",   ar: "كل الحالات" },
  { value: "active",      en: "Active",       ar: "نشط" },
  { value: "idle",        en: "Idle",         ar: "خامل" },
  { value: "maintenance", en: "Maintenance",  ar: "صيانة" },
  { value: "retired",     en: "Retired",      ar: "متقاعد" },
];

// ─── Resource card ────────────────────────────────────────

function ResourceCard({ res, lang, onClick }: { res: Resource; lang: "en" | "ar"; onClick: () => void }) {
  const ar = lang === "ar";
  const tm = RESOURCE_TYPE_META[res.type];
  const sm = RESOURCE_STATUS_META[res.status];
  const Icon = TYPE_ICONS[res.type];

  return (
    <div onClick={onClick} className="bg-background border border-border/40 rounded-xl p-5 flex flex-col gap-3.5 hover:shadow-sm hover:border-border/70 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
          <Icon size={16} strokeWidth={1.75} className="text-primary" />
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tm.pill}`}>{ar ? tm.ar : tm.en}</span>
      </div>

      <div className="min-w-0">
        <h3 className="text-[14px] font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
          {ar ? res.nameAr : res.nameEn}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <MapPin size={9.5} strokeWidth={1.75} className="shrink-0" />{ar ? res.locationAr : res.locationEn}
        </p>
      </div>

      {/* Utilization bar */}
      {res.status !== "retired" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">{ar ? "الاستخدام" : "Utilization"}</span>
            <span className="text-foreground tabular-nums font-medium">{res.utilization}%</span>
          </div>
          <div className="h-[3px] rounded-full bg-border/50 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${res.utilization >= 70 ? "bg-emerald-500" : res.utilization >= 40 ? "bg-amber-500" : "bg-rose-400"}`} style={{ width: `${res.utilization}%` }} />
          </div>
        </div>
      )}

      {/* Inventory extras */}
      {res.sku && (
        <p className="text-[10px] text-muted-foreground font-mono">{res.sku} · {res.quantity} {ar ? "وحدة" : "units"}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
          <span className="text-[11px] text-muted-foreground">{ar ? sm.ar : sm.en}</span>
        </div>
        <span className="text-[12px] font-medium text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>
          {fmtVal(res.value, res.currency, ar ? "ar-SA" : "en-SA")}
        </span>
      </div>
    </div>
  );
}

// ─── Resource list row ────────────────────────────────────

function ResourceListView({ items, lang, onNavigate }: { items: Resource[]; lang: "en" | "ar"; onNavigate: (id: string) => void }) {
  const ar = lang === "ar";
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/25">
      {items.map((res) => {
        const tm = RESOURCE_TYPE_META[res.type];
        const sm = RESOURCE_STATUS_META[res.status];
        const Icon = TYPE_ICONS[res.type];
        return (
          <div key={res.id} onClick={() => onNavigate(res.id)} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
              <Icon size={15} strokeWidth={1.75} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-0.5">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tm.pill}`}>{ar ? tm.ar : tm.en}</span>
                <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{ar ? res.nameAr : res.nameEn}</h4>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin size={9} strokeWidth={1.75} />{ar ? res.locationAr : res.locationEn}</span>
                {res.assignedToEn && <span className="flex items-center gap-1"><User size={9} strokeWidth={1.75} />{ar ? res.assignedToAr : res.assignedToEn}</span>}
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[11px] text-muted-foreground tabular-nums hidden sm:block">{res.utilization}%</span>
              <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} /><span className="text-[11px] text-muted-foreground hidden md:inline">{ar ? sm.ar : sm.en}</span></div>
              <span className="text-[12px] font-medium text-foreground tabular-nums hidden lg:block" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(res.value, res.currency, ar ? "ar-SA" : "en-SA")}</span>
              <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
            </div>
          </div>
        );
      })}
      {items.length === 0 && <div className="px-6 py-14 text-center"><p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد موارد" : "No resources found"}</p></div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════

function ResourcesDemo() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmt = (v: number) => fmtVal(v, "SAR", ar ? "ar-SA" : "en-SA");

  const [resources] = useState(loadResources);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | "all">("all");
  const [view, setView] = useState<"card" | "list">("card");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return resources.filter((r) => {
      const ms = !q || r.nameEn.toLowerCase().includes(q) || r.nameAr.includes(q) || r.locationEn.toLowerCase().includes(q) || (r.sku && r.sku.toLowerCase().includes(q));
      const mt = typeFilter === "all" || r.type === typeFilter;
      const mst = statusFilter === "all" || r.status === statusFilter;
      return ms && mt && mst;
    });
  }, [resources, search, typeFilter, statusFilter]);

  const hasFilters = search !== "" || typeFilter !== "all" || statusFilter !== "all";

  // Metrics
  const totalAssets = resources.length;
  const activeAssets = resources.filter((r) => r.status === "active").length;
  const invValue = resources.filter((r) => r.type === "inventory").reduce((s, r) => s + r.value, 0);
  const assigned = resources.filter((r) => r.assignedToEn).length;
  const maintDue = resources.flatMap((r) => r.maintenance).filter((m) => m.status === "upcoming" || m.status === "overdue").length;
  const avgUtil = Math.round(resources.filter((r) => r.status !== "retired").reduce((s, r) => s + r.utilization, 0) / Math.max(1, resources.filter((r) => r.status !== "retired").length));

  return (
    <div className="min-h-full">
      {/* Dashboard */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{ar ? "الموارد" : "Resources"}</p>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-6" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "إدارة الموارد" : "Resource Management"}
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Package,       value: String(totalAssets),  label: ar ? "إجمالي الأصول" : "Total Assets", color: "text-primary" },
              { icon: CheckCircle2,  value: String(activeAssets), label: ar ? "أصول نشطة" : "Active",          color: "text-emerald-600" },
              { icon: DollarSign,    value: fmt(invValue),        label: ar ? "قيمة المخزون" : "Inventory Value",color: "text-amber-500" },
              { icon: User,          value: String(assigned),     label: ar ? "موارد مُعيّنة" : "Assigned",     color: "text-violet-500" },
              { icon: AlertTriangle, value: String(maintDue),     label: ar ? "صيانة مستحقة" : "Maint. Due",    color: "text-rose-500" },
              { icon: Gauge,         value: `${avgUtil}%`,        label: ar ? "الاستخدام" : "Utilization",      color: "text-cyan-600" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2 mb-2"><m.icon size={14} strokeWidth={1.75} className={m.color} /><p className="text-[10px] text-muted-foreground">{m.label}</p></div>
                <p className="text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar + content */}
      <div className="px-8 md:px-10 py-6 max-w-[1100px]">
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <div className="relative min-w-[200px] flex-1 max-w-[280px]">
            <Search size={13} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث…" : "Search resources…"}
              className="w-full h-9 ps-8 pe-4 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="h-5 w-px bg-border/60 hidden sm:block" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setTypeFilter(f.value as ResourceType | "all")}
                className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-all ${typeFilter === f.value ? "bg-primary/8 text-primary border-primary/25" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {ar ? f.ar : f.en}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-border/60 hidden sm:block" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ResourceStatus | "all")}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none appearance-none cursor-pointer">
            {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{ar ? f.ar : f.en}</option>)}
          </select>
          {hasFilters && <button onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all"><X size={11} strokeWidth={2} />{ar ? "مسح" : "Clear"}</button>}
          <div className="flex-1" />
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-card">
            <button onClick={() => setView("card")} className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "card" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}><LayoutGrid size={14} strokeWidth={1.75} /></button>
            <div className="w-px h-4 bg-border/60" />
            <button onClick={() => setView("list")} className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}><List size={14} strokeWidth={1.75} /></button>
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground mb-4">{ar ? `${filtered.length} مورد` : `${filtered.length} resource${filtered.length !== 1 ? "s" : ""}`}</p>

        {view === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => <ResourceCard key={r.id} res={r} lang={lang} onClick={() => navigate(`/resources/${r.id}`)} />)}
          </div>
        ) : (
          <ResourceListView items={filtered} lang={lang} onNavigate={(id) => navigate(`/resources/${id}`)} />
        )}
      </div>
    </div>
  );
}

export default function Resources() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  if (!isDemoMode) return <ResourcesLive workspaceId={workspace?.id ?? ""} lang={lang} />;
  return <ResourcesDemo />;
}
