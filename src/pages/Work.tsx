import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  loadWorkItems, saveWorkItems,
  STATUS_META, PRIORITY_META, KIND_META, STATUS_ORDER,
  type WorkItem, type WorkStatus, type WorkPriority, type WorkKind,
} from "../data/work";
import {
  Search, Plus, X, Columns3, List, CalendarDays,
  ChevronLeft, ChevronRight, User, Building2, Calendar,
  Check, AlertCircle, GripVertical,
} from "lucide-react";
import { isDemoMode } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { WorkLive } from "../lib/liveViews";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Filter options ───────────────────────────────────────

const STATUS_FILTERS: { value: WorkStatus | "all"; en: string; ar: string }[] = [
  { value: "all",         en: "All",         ar: "الكل" },
  { value: "backlog",     en: "Backlog",     ar: "قائمة الانتظار" },
  { value: "planned",     en: "Planned",     ar: "مخطط" },
  { value: "in_progress", en: "In Progress", ar: "قيد التنفيذ" },
  { value: "review",      en: "Review",      ar: "مراجعة" },
  { value: "done",        en: "Done",        ar: "مكتمل" },
];

const KIND_FILTERS: { value: WorkKind | "all"; en: string; ar: string }[] = [
  { value: "all",              en: "All Types",         ar: "كل الأنواع" },
  { value: "task",             en: "Task",              ar: "مهمة" },
  { value: "ticket",           en: "Ticket",            ar: "تذكرة" },
  { value: "work_order",       en: "Work Order",        ar: "أمر عمل" },
  { value: "request",          en: "Request",           ar: "طلب" },
  { value: "production_order", en: "Production Order",  ar: "أمر إنتاج" },
  { value: "service_order",    en: "Service Order",     ar: "أمر خدمة" },
];

const PRIORITY_FILTERS: { value: WorkPriority | "all"; en: string; ar: string }[] = [
  { value: "all",    en: "All Priority", ar: "كل الأولويات" },
  { value: "urgent", en: "Urgent",       ar: "عاجل" },
  { value: "high",   en: "High",         ar: "مرتفع" },
  { value: "medium", en: "Medium",       ar: "متوسط" },
  { value: "low",    en: "Low",          ar: "منخفض" },
];

// ─── Add Work Modal ───────────────────────────────────────

interface AddWorkModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (w: WorkItem) => void;
  lang: "en" | "ar";
}

const EMPTY_FORM = {
  title: "",
  description: "",
  kind: "task" as WorkKind,
  status: "backlog" as WorkStatus,
  priority: "medium" as WorkPriority,
  assignee: "",
  relatedPerson: "",
  relatedOrg: "",
  dueDate: "",
};

function AddWorkModal({ open, onClose, onAdd, lang }: AddWorkModalProps) {
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
    if (!form.title.trim()) e.title = ar ? "العنوان مطلوب" : "Title is required";
    if (!form.assignee.trim()) e.assignee = ar ? "المسؤول مطلوب" : "Assignee is required";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const dueDateDisplay = form.dueDate
      ? new Date(form.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Not set";

    const item: WorkItem = {
      id: `w-${Date.now()}`,
      titleEn: form.title.trim(),
      titleAr: form.title.trim(),
      descEn: form.description.trim(),
      descAr: form.description.trim(),
      status: form.status,
      priority: form.priority,
      kind: form.kind,
      assigneeEn: form.assignee.trim(),
      assigneeAr: form.assignee.trim(),
      relatedPersonNameEn: form.relatedPerson.trim() || undefined,
      relatedPersonNameAr: form.relatedPerson.trim() || undefined,
      relatedOrgNameEn: form.relatedOrg.trim() || undefined,
      relatedOrgNameAr: form.relatedOrg.trim() || undefined,
      dueDateEn: form.dueDate ? dueDateDisplay : "Not set",
      dueDateAr: form.dueDate ? dueDateDisplay : "غير محدد",
      dueDateISO: form.dueDate || undefined,
      createdEn: "Just now",
      createdAr: "الآن",
      progress: 0,
    };

    setSubmitted(true);
    setTimeout(() => { onAdd(item); onClose(); }, 600);
  }

  function field(key: keyof typeof EMPTY_FORM, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[520px] overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 className="text-[17px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {ar ? "إنشاء عمل جديد" : "Create Work"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "النوع" : "Type"}</label>
                <select value={form.kind} onChange={(e) => field("kind", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  {(Object.keys(KIND_META) as WorkKind[]).map((k) => (
                    <option key={k} value={k}>{ar ? KIND_META[k].ar : KIND_META[k].en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الأولوية" : "Priority"}</label>
                <select value={form.priority} onChange={(e) => field("priority", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  {(Object.keys(PRIORITY_META) as WorkPriority[]).map((p) => (
                    <option key={p} value={p}>{ar ? PRIORITY_META[p].ar : PRIORITY_META[p].en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الحالة" : "Status"}</label>
                <select value={form.status} onChange={(e) => field("status", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  {(Object.keys(STATUS_META) as WorkStatus[]).map((s) => (
                    <option key={s} value={s}>{ar ? STATUS_META[s].ar : STATUS_META[s].en}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {ar ? "العنوان" : "Title"} <span className="text-rose-400">*</span>
              </label>
              <input ref={titleRef} type="text" value={form.title} onChange={(e) => field("title", e.target.value)}
                placeholder={ar ? "مثال: تجهيز طلب المكاتب" : "e.g. Prepare office desk order"}
                className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.title ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
              />
              {errors.title && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.title}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الوصف" : "Description"}</label>
              <textarea value={form.description} onChange={(e) => field("description", e.target.value)}
                placeholder={ar ? "تفاصيل إضافية…" : "Additional details…"}
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                  {ar ? "المسؤول" : "Assignee"} <span className="text-rose-400">*</span>
                </label>
                <input type="text" value={form.assignee} onChange={(e) => field("assignee", e.target.value)}
                  placeholder={ar ? "اسم الشخص أو الفريق" : "Person or team name"}
                  className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.assignee ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
                />
                {errors.assignee && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.assignee}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "تاريخ الاستحقاق" : "Due Date"}</label>
                <input type="date" value={form.dueDate} onChange={(e) => field("dueDate", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "شخص مرتبط" : "Related Person"}</label>
                <input type="text" value={form.relatedPerson} onChange={(e) => field("relatedPerson", e.target.value)}
                  placeholder={ar ? "اختياري" : "Optional"}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "منظمة مرتبطة" : "Related Organization"}</label>
                <input type="text" value={form.relatedOrg} onChange={(e) => field("relatedOrg", e.target.value)}
                  placeholder={ar ? "اختياري" : "Optional"}
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
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

// ─── Kanban card ──────────────────────────────────────────

function KanbanCard({
  item, lang, onClick, onDragStart,
}: {
  item: WorkItem; lang: "en" | "ar";
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const ar = lang === "ar";
  const priorityMeta = PRIORITY_META[item.priority];
  const kindMeta     = KIND_META[item.kind];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={onClick}
      className="
        bg-background border border-border/40 rounded-xl p-4
        hover:shadow-md hover:border-border/60 hover:scale-[1.01]
        transition-all duration-200 cursor-pointer group
        active:shadow-lg active:scale-[0.99]
      "
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${kindMeta.pill}`}>
          {ar ? kindMeta.ar : kindMeta.en}
        </span>
        <GripVertical size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
      </div>

      <h4
        className="text-[13px] font-medium text-foreground leading-snug mb-3 line-clamp-2 group-hover:text-primary transition-colors"
        style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}
      >
        {ar ? item.titleAr : item.titleEn}
      </h4>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-primary/8 flex items-center justify-center text-[8px] font-semibold text-primary shrink-0">
            {initials(ar ? item.assigneeAr : item.assigneeEn)}
          </div>
          <span className="text-[11px] text-muted-foreground truncate">
            {ar ? item.assigneeAr : item.assigneeEn}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
        </div>
      </div>

      {(item.relatedOrgNameEn || item.relatedPersonNameEn) && (
        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground/50">
          <Building2 size={9} strokeWidth={1.75} className="shrink-0" />
          <span className="text-[10px] truncate">
            {ar
              ? (item.relatedOrgNameAr || item.relatedPersonNameAr)
              : (item.relatedOrgNameEn || item.relatedPersonNameEn)
            }
          </span>
        </div>
      )}

      {item.dueDateISO && (
        <div className="flex items-center gap-1 mt-1.5 text-muted-foreground/50">
          <Calendar size={9} strokeWidth={1.75} />
          <span className="text-[10px]">{ar ? item.dueDateAr : item.dueDateEn}</span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban view ──────────────────────────────────────────

const COLUMN_COLORS: Record<WorkStatus, string> = {
  backlog:     "bg-stone-100/60",
  planned:     "bg-primary/[0.04]",
  in_progress: "bg-amber-50/50",
  review:      "bg-violet-50/40",
  done:        "bg-emerald-50/40",
};

const COLUMN_ACCENT: Record<WorkStatus, string> = {
  backlog:     "bg-stone-400",
  planned:     "bg-primary",
  in_progress: "bg-amber-500",
  review:      "bg-violet-500",
  done:        "bg-emerald-500",
};

function KanbanView({
  items, lang, onNavigate, onMoveItem,
}: {
  items: WorkItem[];
  lang: "en" | "ar";
  onNavigate: (id: string) => void;
  onMoveItem: (id: string, newStatus: WorkStatus) => void;
}) {
  const ar = lang === "ar";
  const [dragOverCol, setDragOverCol] = useState<WorkStatus | null>(null);

  const columns = useMemo(() => {
    const map: Record<WorkStatus, WorkItem[]> = {
      backlog: [], planned: [], in_progress: [], review: [], done: [],
    };
    items.forEach((item) => { if (map[item.status]) map[item.status].push(item); });
    return map;
  }, [items]);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: WorkStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: WorkStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData("text/plain");
    if (id) onMoveItem(id, status);
  }, [onMoveItem]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2" style={{ minHeight: "400px" }}>
      {STATUS_ORDER.map((status) => {
        const meta = STATUS_META[status];
        const colItems = columns[status];
        const isDragOver = dragOverCol === status;

        return (
          <div
            key={status}
            className={`
              flex flex-col min-w-[260px] w-[260px] shrink-0 rounded-2xl
              ${COLUMN_COLORS[status]}
              ${isDragOver ? "ring-2 ring-primary/30 scale-[1.01]" : ""}
              transition-all duration-200
            `}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${COLUMN_ACCENT[status]}`} />
              <span className="text-[12px] font-semibold text-foreground/80 tracking-wide">
                {ar ? meta.ar : meta.en}
              </span>
              <span className="text-[11px] text-muted-foreground/60 tabular-nums ms-auto">
                {colItems.length}
              </span>
            </div>

            <div className="flex-1 px-3 pb-3 space-y-2.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
              {colItems.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  lang={lang}
                  onClick={() => onNavigate(item.id)}
                  onDragStart={handleDragStart}
                />
              ))}

              {colItems.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[11px] text-muted-foreground/40">
                    {ar ? "لا يوجد عمل" : "No items"}
                  </p>
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

function ListView({
  items, lang, onNavigate,
}: {
  items: WorkItem[];
  lang: "en" | "ar";
  onNavigate: (id: string) => void;
}) {
  const ar = lang === "ar";

  const grouped = useMemo(() => {
    const map: Partial<Record<WorkStatus, WorkItem[]>> = {};
    items.forEach((item) => {
      if (!map[item.status]) map[item.status] = [];
      map[item.status]!.push(item);
    });
    return STATUS_ORDER.filter((s) => map[s]).map((s) => ({ status: s, items: map[s]! }));
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      {grouped.map(({ status, items: groupItems }) => {
        const meta = STATUS_META[status];
        return (
          <div key={status}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-[11px] font-semibold text-muted-foreground tracking-[0.07em] uppercase">
                {ar ? meta.ar : meta.en}
              </span>
              <span className="text-[11px] text-muted-foreground/50 tabular-nums">{groupItems.length}</span>
              <div className="flex-1 h-px bg-border/30" />
            </div>

            <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/25">
              {groupItems.map((item) => {
                const priorityMeta = PRIORITY_META[item.priority];
                const kindMeta     = KIND_META[item.kind];
                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${kindMeta.pill}`}>
                          {ar ? kindMeta.ar : kindMeta.en}
                        </span>
                        <h4
                          className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors"
                          style={{ letterSpacing: "-0.01em" }}
                        >
                          {ar ? item.titleAr : item.titleEn}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User size={10} strokeWidth={1.75} className="text-muted-foreground/50" />
                          {ar ? item.assigneeAr : item.assigneeEn}
                        </span>
                        {(item.relatedOrgNameEn || item.relatedPersonNameEn) && (
                          <span className="flex items-center gap-1">
                            <Building2 size={10} strokeWidth={1.75} className="text-muted-foreground/50" />
                            {ar
                              ? (item.relatedOrgNameAr || item.relatedPersonNameAr)
                              : (item.relatedOrgNameEn || item.relatedPersonNameEn)
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`} />
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          {ar ? priorityMeta.ar : priorityMeta.en}
                        </span>
                      </div>

                      {item.dueDateISO && (
                        <span className="text-[11px] text-muted-foreground/60 hidden md:flex items-center gap-1">
                          <Calendar size={10} strokeWidth={1.75} />
                          {ar ? item.dueDateAr : item.dueDateEn}
                        </span>
                      )}

                      {item.status === "done" ? (
                        <Check size={14} strokeWidth={2} className="text-emerald-500" />
                      ) : item.progress > 0 ? (
                        <div className="flex items-center gap-1.5 min-w-[60px]">
                          <div className="flex-1 h-[3px] rounded-full bg-border/50 overflow-hidden">
                            <div className="h-full rounded-full bg-primary/50" style={{ width: `${item.progress}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{item.progress}%</span>
                        </div>
                      ) : null}

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

// ─── Calendar view ────────────────────────────────────────

function CalendarView({
  items, lang, onNavigate,
}: {
  items: WorkItem[];
  lang: "en" | "ar";
  onNavigate: (id: string) => void;
}) {
  const ar = lang === "ar";
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthLabel = currentDate.toLocaleDateString(ar ? "ar-SA" : "en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const dayNames = ar
    ? ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const itemsByDay = useMemo(() => {
    const map: Record<number, WorkItem[]> = {};
    items.forEach((item) => {
      if (!item.dueDateISO) return;
      const d = new Date(item.dueDateISO + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(item);
      }
    });
    return map;
  }, [items, year, month]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <h3
          className="text-[16px] font-medium text-foreground"
          style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
        >
          {monthLabel}
        </h3>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
        <div className="grid grid-cols-7 border-b border-border/40">
          {dayNames.map((d) => (
            <div key={d} className="px-2 py-2.5 text-center text-[10px] font-semibold text-muted-foreground tracking-[0.08em] uppercase bg-muted/20">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const dayItems = day ? (itemsByDay[day] || []) : [];
            const isToday = isCurrentMonth && day === todayDate;
            const isWeekend = i % 7 === 5 || i % 7 === 6;
            const rowIdx = Math.floor(i / 7);
            const totalRows = cells.length / 7;
            const isLastRow = rowIdx === totalRows - 1;

            return (
              <div
                key={i}
                className={`
                  min-h-[90px] md:min-h-[110px] p-1.5
                  ${day ? "" : "bg-muted/10"}
                  ${isWeekend && day ? "bg-muted/5" : ""}
                  ${i % 7 < 6 ? "border-e border-border/25" : ""}
                  ${!isLastRow ? "border-b border-border/25" : ""}
                `}
              >
                {day && (
                  <>
                    <div className={`
                      w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-medium mb-1
                      ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}
                    `}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item) => {
                        const meta = STATUS_META[item.status];
                        return (
                          <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className="
                              w-full text-start px-1.5 py-1 rounded-md
                              hover:bg-accent transition-colors
                              flex items-center gap-1.5
                            "
                          >
                            <div className={`w-1 h-1 rounded-full shrink-0 ${meta.dot}`} />
                            <span className="text-[10px] text-foreground/80 truncate leading-tight">
                              {ar ? item.titleAr : item.titleEn}
                            </span>
                          </button>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <p className="text-[9px] text-muted-foreground/50 px-1.5">
                          +{dayItems.length - 3} {ar ? "أكثر" : "more"}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

function WorkDemo() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const [items, setItems] = useState<WorkItem[]>(loadWorkItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<WorkKind | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<WorkPriority | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [view, setView] = useState<"kanban" | "list" | "calendar">("kanban");
  const [modalOpen, setModalOpen] = useState(false);

  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((w) => set.add(w.assigneeEn));
    return Array.from(set).sort();
  }, [items]);

  useEffect(() => { saveWorkItems(items); }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((w) => {
      const matchSearch = !q
        || w.titleEn.toLowerCase().includes(q) || w.titleAr.includes(q)
        || w.assigneeEn.toLowerCase().includes(q) || w.assigneeAr.includes(q)
        || (w.relatedOrgNameEn && w.relatedOrgNameEn.toLowerCase().includes(q))
        || (w.relatedPersonNameEn && w.relatedPersonNameEn.toLowerCase().includes(q))
        || w.descEn.toLowerCase().includes(q);
      const matchStatus   = statusFilter   === "all" || w.status   === statusFilter;
      const matchKind     = kindFilter     === "all" || w.kind     === kindFilter;
      const matchPriority = priorityFilter === "all" || w.priority === priorityFilter;
      const matchAssignee = assigneeFilter === "all" || w.assigneeEn === assigneeFilter;
      return matchSearch && matchStatus && matchKind && matchPriority && matchAssignee;
    });
  }, [items, search, statusFilter, kindFilter, priorityFilter, assigneeFilter]);

  const hasActiveFilters = search !== "" || statusFilter !== "all" || kindFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all";
  function clearFilters() { setSearch(""); setStatusFilter("all"); setKindFilter("all"); setPriorityFilter("all"); setAssigneeFilter("all"); }

  function handleAdd(w: WorkItem) { setItems((prev) => [w, ...prev]); }

  const handleMoveItem = useCallback((id: string, newStatus: WorkStatus) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id || item.status === newStatus) return item;
      const progress = newStatus === "done" ? 100 : newStatus === "backlog" ? 0 : item.progress;
      return { ...item, status: newStatus, progress };
    }));
  }, []);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => { c[s] = items.filter((w) => w.status === s).length; });
    return c;
  }, [items]);

  return (
    <>
      <div className="min-h-full py-8 px-7 md:px-10 max-w-[1200px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">
              {ar ? "محرك العمل" : "Work Engine"}
            </p>
            <h1
              className="text-[26px] font-medium text-foreground leading-tight"
              style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}
            >
              {ar ? "لوحة العمل" : "Work Board"}
            </h1>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium shadow-sm hover:opacity-90 active:opacity-80 transition-opacity shrink-0 mt-1"
          >
            <Plus size={14} strokeWidth={2.5} />
            {ar ? "إنشاء عمل" : "Create Work"}
          </button>
        </div>

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-5 gap-3 mb-7">
          {STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            return (
              <div key={status} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  <p className="text-[11px] text-muted-foreground">{ar ? meta.ar : meta.en}</p>
                </div>
                <p
                  className="text-[22px] font-medium text-foreground leading-none"
                  style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
                >
                  {statusCounts[status] || 0}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <div className="relative min-w-[220px] flex-1 max-w-[280px]">
            <Search size={13} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث…" : "Search work…"}
              className="w-full h-9 ps-8 pe-4 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" aria-hidden="true" />

          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value as WorkStatus | "all")}
                className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-all duration-150 ${statusFilter === f.value ? "bg-primary/8 text-primary border-primary/25" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {ar ? f.ar : f.en}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" aria-hidden="true" />

          <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as WorkKind | "all")}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
            {KIND_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{ar ? f.ar : f.en}</option>
            ))}
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as WorkPriority | "all")}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
            {PRIORITY_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{ar ? f.ar : f.en}</option>
            ))}
          </select>

          <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
            <option value="all">{ar ? "كل المسؤولين" : "All Assignees"}</option>
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all">
              <X size={11} strokeWidth={2} />
              {ar ? "مسح" : "Clear"}
            </button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-card">
            <button onClick={() => setView("kanban")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={ar ? "عرض كانبان" : "Kanban view"}>
              <Columns3 size={14} strokeWidth={1.75} />
            </button>
            <div className="w-px h-4 bg-border/60" aria-hidden="true" />
            <button onClick={() => setView("list")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={ar ? "عرض القائمة" : "List view"}>
              <List size={14} strokeWidth={1.75} />
            </button>
            <div className="w-px h-4 bg-border/60" aria-hidden="true" />
            <button onClick={() => setView("calendar")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "calendar" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={ar ? "عرض التقويم" : "Calendar view"}>
              <CalendarDays size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* ── Count ── */}
        <p className="text-[12px] text-muted-foreground mb-4">
          {ar ? `${filtered.length} عمل` : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}`}
        </p>

        {/* ── Empty state ── */}
        {filtered.length === 0 ? (
          <div className="border border-border/40 rounded-xl py-20 text-center bg-background">
            <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Search size={16} className="text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-foreground mb-1">{ar ? "لا توجد نتائج" : "No results found"}</p>
            <p className="text-[12px] text-muted-foreground">{ar ? "جرب تغيير البحث أو الفلاتر" : "Try adjusting your search or filters"}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-4 text-[12px] text-primary hover:underline">
                {ar ? "مسح الفلاتر" : "Clear filters"}
              </button>
            )}
          </div>
        ) : view === "kanban" ? (
          <KanbanView
            items={filtered}
            lang={lang}
            onNavigate={(id) => navigate(`/work/${id}`)}
            onMoveItem={handleMoveItem}
          />
        ) : view === "list" ? (
          <ListView
            items={filtered}
            lang={lang}
            onNavigate={(id) => navigate(`/work/${id}`)}
          />
        ) : (
          <CalendarView
            items={filtered}
            lang={lang}
            onNavigate={(id) => navigate(`/work/${id}`)}
          />
        )}
      </div>

      <AddWorkModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} lang={lang} />
    </>
  );
}

export default function Work() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  if (!isDemoMode) return <WorkLive workspaceId={workspace?.id ?? ""} lang={lang} />;
  return <WorkDemo />;
}
