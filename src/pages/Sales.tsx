import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  loadDeals, saveDeals, formatCurrency, formatCurrencyAr,
  STAGE_META, DEAL_PRIORITY_META, STAGE_ORDER, PIPELINE_STAGES,
  type Deal, type DealStage, type DealPriority,
} from "../data/sales";
import {
  Search, Plus, X, Columns3, List,
  ChevronRight, User, Building2, Calendar,
  Check, AlertCircle, GripVertical, TrendingUp,
  DollarSign, Target, Percent, BarChart3,
} from "lucide-react";
import { isDemoMode } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { SalesLive } from "../lib/liveViews";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Create Deal Modal ────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  description: "",
  stage: "lead" as DealStage,
  priority: "medium" as DealPriority,
  value: "",
  probability: "25",
  owner: "",
  contactName: "",
  orgName: "",
  expectedCloseDate: "",
};

function CreateDealModal({ open, onClose, onAdd, lang }: {
  open: boolean; onClose: () => void; onAdd: (d: Deal) => void; lang: "en" | "ar";
}) {
  const ar = lang === "ar";
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitted, setSubmitted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}); setSubmitted(false); setTimeout(() => titleRef.current?.focus(), 80); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.title.trim()) e.title = ar ? "اسم الصفقة مطلوب" : "Deal name is required";
    if (!form.owner.trim()) e.owner = ar ? "المسؤول مطلوب" : "Owner is required";
    if (!form.value || isNaN(Number(form.value))) e.value = ar ? "القيمة مطلوبة" : "Valid value is required";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const deal: Deal = {
      id: `d-${Date.now()}`,
      titleEn: form.title.trim(),
      titleAr: form.title.trim(),
      descEn: form.description.trim(),
      descAr: form.description.trim(),
      stage: form.stage,
      priority: form.priority,
      value: Number(form.value),
      currency: "SAR",
      probability: Number(form.probability) || 25,
      ownerEn: form.owner.trim(),
      ownerAr: form.owner.trim(),
      contactNameEn: form.contactName.trim() || "TBD",
      contactNameAr: form.contactName.trim() || "لم يحدد",
      orgNameEn: form.orgName.trim() || undefined,
      orgNameAr: form.orgName.trim() || undefined,
      expectedCloseDateEn: form.expectedCloseDate || "Not set",
      expectedCloseDateAr: form.expectedCloseDate || "غير محدد",
      expectedCloseDateISO: form.expectedCloseDate || undefined,
      createdEn: "Just now",
      createdAr: "الآن",
    };

    setSubmitted(true);
    setTimeout(() => { onAdd(deal); onClose(); }, 500);
  }

  function field(key: keyof typeof EMPTY_FORM, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[540px] overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 className="text-[17px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {ar ? "إنشاء صفقة" : "Create Deal"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {ar ? "اسم الصفقة" : "Deal Name"} <span className="text-rose-400">*</span>
              </label>
              <input ref={titleRef} type="text" value={form.title} onChange={(e) => field("title", e.target.value)}
                placeholder={ar ? "مثال: أثاث مكتبي لشركة…" : "e.g. Office furniture for..."}
                className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.title ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
              />
              {errors.title && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.title}</p>}
            </div>

            {/* Stage + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "المرحلة" : "Stage"}</label>
                <select value={form.stage} onChange={(e) => field("stage", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  {STAGE_ORDER.map((s) => (
                    <option key={s} value={s}>{ar ? STAGE_META[s].ar : STAGE_META[s].en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الأولوية" : "Priority"}</label>
                <select value={form.priority} onChange={(e) => field("priority", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  {(Object.keys(DEAL_PRIORITY_META) as DealPriority[]).map((p) => (
                    <option key={p} value={p}>{ar ? DEAL_PRIORITY_META[p].ar : DEAL_PRIORITY_META[p].en}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Value + Probability */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                  {ar ? "القيمة (ر.س)" : "Value (SAR)"} <span className="text-rose-400">*</span>
                </label>
                <input type="number" value={form.value} onChange={(e) => field("value", e.target.value)}
                  placeholder="250000"
                  className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.value ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
                />
                {errors.value && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.value}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الاحتمالية %" : "Probability %"}</label>
                <input type="number" min="0" max="100" value={form.probability} onChange={(e) => field("probability", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            {/* Owner + Expected Close */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                  {ar ? "المسؤول" : "Owner"} <span className="text-rose-400">*</span>
                </label>
                <input type="text" value={form.owner} onChange={(e) => field("owner", e.target.value)}
                  placeholder={ar ? "اسم المسؤول" : "Owner name"}
                  className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.owner ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
                />
                {errors.owner && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.owner}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الإغلاق المتوقع" : "Expected Close"}</label>
                <input type="date" value={form.expectedCloseDate} onChange={(e) => field("expectedCloseDate", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            {/* Contact + Org */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "جهة الاتصال" : "Contact"}</label>
                <input type="text" value={form.contactName} onChange={(e) => field("contactName", e.target.value)}
                  placeholder={ar ? "اختياري" : "Optional"}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "المنظمة" : "Organization"}</label>
                <input type="text" value={form.orgName} onChange={(e) => field("orgName", e.target.value)}
                  placeholder={ar ? "اختياري" : "Optional"}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الوصف" : "Description"}</label>
              <textarea value={form.description} onChange={(e) => field("description", e.target.value)}
                placeholder={ar ? "تفاصيل إضافية…" : "Additional details…"} rows={2}
                className="w-full px-3 py-2 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none transition-colors"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button type="submit" disabled={submitted} className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
              {submitted
                ? <><Check size={14} strokeWidth={2.5} />{ar ? "تم الإنشاء" : "Created"}</>
                : <><Plus size={14} strokeWidth={2} />{ar ? "إنشاء" : "Create"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deal card (Kanban) ───────────────────────────────────

function DealCard({ deal, lang, onClick, onDragStart }: {
  deal: Deal; lang: "en" | "ar"; onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const ar = lang === "ar";
  const priorityMeta = DEAL_PRIORITY_META[deal.priority];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal.id)}
      onClick={onClick}
      className="bg-background border border-border/40 rounded-xl p-4 hover:shadow-md hover:border-border/60 hover:scale-[1.01] transition-all duration-200 cursor-pointer group active:shadow-lg active:scale-[0.99]"
    >
      {/* Value + priority */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[14px] font-semibold text-foreground tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
          {ar ? formatCurrencyAr(deal.value, deal.currency) : formatCurrency(deal.value, deal.currency)}
        </span>
        <GripVertical size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
      </div>

      {/* Title */}
      <h4
        className="text-[13px] font-medium text-foreground leading-snug mb-2.5 line-clamp-2 group-hover:text-primary transition-colors"
        style={{ letterSpacing: "-0.01em" }}
      >
        {ar ? deal.titleAr : deal.titleEn}
      </h4>

      {/* Org */}
      {deal.orgNameEn && (
        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground/60">
          <Building2 size={10} strokeWidth={1.75} className="shrink-0" />
          <span className="text-[11px] truncate">{ar ? deal.orgNameAr : deal.orgNameEn}</span>
        </div>
      )}

      {/* Contact + owner */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-primary/8 flex items-center justify-center text-[8px] font-semibold text-primary shrink-0">
            {initials(ar ? deal.ownerAr : deal.ownerEn)}
          </div>
          <span className="text-[11px] text-muted-foreground truncate">{ar ? deal.ownerAr : deal.ownerEn}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
        </div>
      </div>

      {/* Footer: probability + close date */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/30">
        <span className="text-[11px] text-muted-foreground tabular-nums">{deal.probability}%</span>
        {deal.expectedCloseDateISO && (
          <div className="flex items-center gap-1 text-muted-foreground/50">
            <Calendar size={9} strokeWidth={1.75} />
            <span className="text-[10px]">{ar ? deal.expectedCloseDateAr : deal.expectedCloseDateEn}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban view ──────────────────────────────────────────

const COL_COLORS: Record<DealStage, string> = {
  lead:        "bg-stone-100/60",
  qualified:   "bg-primary/[0.04]",
  proposal:    "bg-amber-50/50",
  negotiation: "bg-violet-50/40",
  won:         "bg-emerald-50/40",
  lost:        "bg-rose-50/30",
};

const COL_ACCENT: Record<DealStage, string> = {
  lead:        "bg-stone-400",
  qualified:   "bg-primary",
  proposal:    "bg-amber-500",
  negotiation: "bg-violet-500",
  won:         "bg-emerald-500",
  lost:        "bg-rose-500",
};

function PipelineBoard({ deals, lang, onNavigate, onMoveDeal }: {
  deals: Deal[]; lang: "en" | "ar";
  onNavigate: (id: string) => void;
  onMoveDeal: (id: string, newStage: DealStage) => void;
}) {
  const ar = lang === "ar";
  const [dragOverCol, setDragOverCol] = useState<DealStage | null>(null);
  const fmtVal = ar ? formatCurrencyAr : formatCurrency;

  const columns = useMemo(() => {
    const map: Record<DealStage, Deal[]> = { lead: [], qualified: [], proposal: [], negotiation: [], won: [], lost: [] };
    deals.forEach((d) => { if (map[d.stage]) map[d.stage].push(d); });
    return map;
  }, [deals]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: "400px" }}>
      {STAGE_ORDER.map((stage) => {
        const meta = STAGE_META[stage];
        const colDeals = columns[stage];
        const isDragOver = dragOverCol === stage;
        const colValue = colDeals.reduce((s, d) => s + d.value, 0);

        return (
          <div
            key={stage}
            className={`flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-2xl ${COL_COLORS[stage]} ${isDragOver ? "ring-2 ring-primary/30 scale-[1.01]" : ""} transition-all duration-200`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(stage); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData("text/plain"); if (id) onMoveDeal(id, stage); }}
          >
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-2.5 mb-1">
                <div className={`w-2 h-2 rounded-full ${COL_ACCENT[stage]}`} />
                <span className="text-[12px] font-semibold text-foreground/80 tracking-wide">{ar ? meta.ar : meta.en}</span>
                <span className="text-[11px] text-muted-foreground/60 tabular-nums ms-auto">{colDeals.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground/50 tabular-nums ps-4.5" style={{ paddingInlineStart: "1.125rem" }}>
                {fmtVal(colValue, "SAR")}
              </p>
            </div>

            <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
              {colDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} lang={lang} onClick={() => onNavigate(deal.id)} onDragStart={handleDragStart} />
              ))}
              {colDeals.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[11px] text-muted-foreground/40">{ar ? "لا توجد صفقات" : "No deals"}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────

function DealListView({ deals, lang, onNavigate }: {
  deals: Deal[]; lang: "en" | "ar"; onNavigate: (id: string) => void;
}) {
  const ar = lang === "ar";
  const fmtVal = ar ? formatCurrencyAr : formatCurrency;

  const grouped = useMemo(() => {
    const map: Partial<Record<DealStage, Deal[]>> = {};
    deals.forEach((d) => { if (!map[d.stage]) map[d.stage] = []; map[d.stage]!.push(d); });
    return STAGE_ORDER.filter((s) => map[s]).map((s) => ({ stage: s, items: map[s]! }));
  }, [deals]);

  return (
    <div className="space-y-6">
      {grouped.map(({ stage, items }) => {
        const meta = STAGE_META[stage];
        return (
          <div key={stage}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.07em] uppercase">{ar ? meta.ar : meta.en}</span>
              <span className="text-[11px] text-muted-foreground/50 tabular-nums">{items.length}</span>
              <div className="flex-1 h-px bg-border/30" />
            </div>
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/25">
              {items.map((deal) => {
                const pm = DEAL_PRIORITY_META[deal.priority];
                return (
                  <div key={deal.id} onClick={() => onNavigate(deal.id)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors mb-0.5" style={{ letterSpacing: "-0.01em" }}>
                        {ar ? deal.titleAr : deal.titleEn}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {deal.orgNameEn && (
                          <span className="flex items-center gap-1">
                            <Building2 size={10} strokeWidth={1.75} className="text-muted-foreground/50" />
                            {ar ? deal.orgNameAr : deal.orgNameEn}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <User size={10} strokeWidth={1.75} className="text-muted-foreground/50" />
                          {ar ? deal.ownerAr : deal.ownerEn}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 shrink-0">
                      <span className="text-[13px] font-semibold text-foreground tabular-nums hidden sm:block" style={{ fontFamily: "var(--app-font-serif)" }}>
                        {fmtVal(deal.value, deal.currency)}
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums hidden md:block">{deal.probability}%</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${pm.dot}`} />
                      </div>
                      <ChevronRight size={14} strokeWidth={1.75} className="text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

function SalesDemo() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const fmtVal = ar ? formatCurrencyAr : formatCurrency;

  const [deals, setDeals] = useState<Deal[]>(loadDeals);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | "all">("all");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { saveDeals(deals); }, [deals]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return deals.filter((d) => {
      const matchSearch = !q
        || d.titleEn.toLowerCase().includes(q) || d.titleAr.includes(q)
        || d.ownerEn.toLowerCase().includes(q) || d.contactNameEn.toLowerCase().includes(q)
        || (d.orgNameEn && d.orgNameEn.toLowerCase().includes(q));
      const matchStage    = stageFilter    === "all" || d.stage    === stageFilter;
      const matchPriority = priorityFilter === "all" || d.priority === priorityFilter;
      return matchSearch && matchStage && matchPriority;
    });
  }, [deals, search, stageFilter, priorityFilter]);

  const hasActiveFilters = search !== "" || stageFilter !== "all" || priorityFilter !== "all";
  function clearFilters() { setSearch(""); setStageFilter("all"); setPriorityFilter("all"); }

  function handleAdd(d: Deal) { setDeals((prev) => [d, ...prev]); }

  const handleMoveDeal = useCallback((id: string, newStage: DealStage) => {
    setDeals((prev) => prev.map((d) => {
      if (d.id !== id || d.stage === newStage) return d;
      const probability = newStage === "won" ? 100 : newStage === "lost" ? 0 : d.probability;
      return { ...d, stage: newStage, probability };
    }));
  }, []);

  // ── Dashboard metrics ──
  const metrics = useMemo(() => {
    const active = deals.filter((d) => !["won", "lost"].includes(d.stage));
    const won    = deals.filter((d) => d.stage === "won");
    const closed = deals.filter((d) => ["won", "lost"].includes(d.stage));
    const pipelineValue = active.reduce((s, d) => s + d.value, 0);
    const wonValue      = won.reduce((s, d) => s + d.value, 0);
    const convRate      = closed.length > 0 ? Math.round((won.length / closed.length) * 100) : 0;
    const forecast      = active.reduce((s, d) => s + d.value * (d.probability / 100), 0);
    return { pipelineValue, activeCount: active.length, wonValue, wonCount: won.length, convRate, forecast };
  }, [deals]);

  return (
    <>
      <div className="min-h-full py-8 px-7 md:px-10 max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">
              {ar ? "إدارة المبيعات" : "Sales CRM"}
            </p>
            <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "خط المبيعات" : "Sales Pipeline"}
            </h1>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium shadow-sm hover:opacity-90 active:opacity-80 transition-opacity shrink-0 mt-1">
            <Plus size={14} strokeWidth={2.5} />
            {ar ? "صفقة جديدة" : "New Deal"}
          </button>
        </div>

        {/* ── Dashboard metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-7">
          {[
            { icon: DollarSign, value: fmtVal(metrics.pipelineValue, "SAR"), label: ar ? "قيمة الخط" : "Pipeline Value", color: "text-primary" },
            { icon: Target,     value: String(metrics.activeCount), label: ar ? "فرص نشطة" : "Active Deals", color: "text-amber-500" },
            { icon: TrendingUp, value: fmtVal(metrics.wonValue, "SAR"), label: ar ? "صفقات فائزة" : "Won Deals", color: "text-emerald-500" },
            { icon: Percent,    value: `${metrics.convRate}%`, label: ar ? "معدل التحويل" : "Conversion", color: "text-violet-500" },
            { icon: BarChart3,  value: fmtVal(Math.round(metrics.forecast), "SAR"), label: ar ? "التوقع الشهري" : "Forecast", color: "text-cyan-600" },
          ].map((m, i) => (
            <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
              <div className="flex items-center gap-2 mb-2">
                <m.icon size={14} strokeWidth={1.75} className={m.color} />
                <p className="text-[11px] text-muted-foreground">{m.label}</p>
              </div>
              <p className="text-[18px] md:text-[20px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <div className="relative min-w-[220px] flex-1 max-w-[280px]">
            <Search size={13} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث…" : "Search deals…"}
              className="w-full h-9 ps-8 pe-4 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" />

          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as DealStage | "all")}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
            <option value="all">{ar ? "كل المراحل" : "All Stages"}</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{ar ? STAGE_META[s].ar : STAGE_META[s].en}</option>
            ))}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as DealPriority | "all")}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
            <option value="all">{ar ? "كل الأولويات" : "All Priority"}</option>
            {(Object.keys(DEAL_PRIORITY_META) as DealPriority[]).map((p) => (
              <option key={p} value={p}>{ar ? DEAL_PRIORITY_META[p].ar : DEAL_PRIORITY_META[p].en}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all">
              <X size={11} strokeWidth={2} />{ar ? "مسح" : "Clear"}
            </button>
          )}

          <div className="flex-1" />

          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-card">
            <button onClick={() => setView("pipeline")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "pipeline" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Columns3 size={14} strokeWidth={1.75} />
            </button>
            <div className="w-px h-4 bg-border/60" />
            <button onClick={() => setView("list")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <List size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* ── Count ── */}
        <p className="text-[12px] text-muted-foreground mb-4">
          {ar ? `${filtered.length} صفقة` : `${filtered.length} ${filtered.length === 1 ? "deal" : "deals"}`}
        </p>

        {/* ── Content ── */}
        {filtered.length === 0 ? (
          <div className="border border-border/40 rounded-xl py-20 text-center bg-background">
            <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Search size={16} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">{ar ? "لا توجد نتائج" : "No deals found"}</p>
            <p className="text-[12px] text-muted-foreground">{ar ? "جرب تغيير البحث أو الفلاتر" : "Try adjusting your search or filters"}</p>
          </div>
        ) : view === "pipeline" ? (
          <PipelineBoard deals={filtered} lang={lang} onNavigate={(id) => navigate(`/sales/${id}`)} onMoveDeal={handleMoveDeal} />
        ) : (
          <DealListView deals={filtered} lang={lang} onNavigate={(id) => navigate(`/sales/${id}`)} />
        )}
      </div>

      <CreateDealModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} lang={lang} />
    </>
  );
}

export default function Sales() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  if (!isDemoMode) return <SalesLive workspaceId={workspace?.id ?? ""} lang={lang} />;
  return <SalesDemo />;
}
