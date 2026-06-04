import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import { RelatedRecords, BacklinksSection } from "../components/RelatedRecords";
import { ContextPanel } from "../components/ContextPanel";
import {
  loadWorkItems, saveWorkItems,
  STATUS_META, PRIORITY_META, KIND_META, STATUS_ORDER,
  type WorkItem, type WorkStatus,
} from "../data/work";
import {
  ArrowLeft, ChevronRight, User, Building2, Calendar,
  Clock, Users, Briefcase, FileText, StickyNote,
  CheckCircle2, Circle, Timer, Eye, Inbox,
  Plus, Paperclip, MessageSquare, ArrowRightCircle,
  UserPlus, Upload, Tag, AlertTriangle,
  Image, FolderArchive, Sheet, Download,
  Link2, X, Check, Brain,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Status icons ─────────────────────────────────────────

const STATUS_ICONS: Record<WorkStatus, React.ElementType> = {
  backlog:     Inbox,
  planned:     Circle,
  in_progress: Timer,
  review:      Eye,
  done:        CheckCircle2,
};

// ─── Tab types ────────────────────────────────────────────

type StoryTab = "overview" | "timeline" | "people" | "organizations" | "notes" | "files" | "activity" | "related";

const TABS: { id: StoryTab; en: string; ar: string }[] = [
  { id: "overview",      en: "Overview",      ar: "نظرة عامة" },
  { id: "timeline",      en: "Timeline",      ar: "الجدول الزمني" },
  { id: "people",        en: "People",        ar: "الأشخاص" },
  { id: "organizations", en: "Organizations", ar: "المنظمات" },
  { id: "notes",         en: "Notes",         ar: "الملاحظات" },
  { id: "files",         en: "Files",         ar: "الملفات" },
  { id: "activity",      en: "Activity",      ar: "النشاط" },
  { id: "related",       en: "Related",       ar: "مرتبط" },
];

// ─── Sample timeline data ─────────────────────────────────

interface TimelineEvent {
  id: string;
  kind: "created" | "assigned" | "status_changed" | "comment" | "file_uploaded" | "completed" | "priority_changed";
  titleEn: string;
  titleAr: string;
  descEn?: string;
  descAr?: string;
  dateEn: string;
  dateAr: string;
  actorEn: string;
  actorAr: string;
}

function getTimelineEvents(item: WorkItem): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "tl-1",
      kind: "created",
      titleEn: "Work item created",
      titleAr: "تم إنشاء عنصر العمل",
      descEn: `"${item.titleEn}" was created and added to the backlog.`,
      descAr: `تم إنشاء "${item.titleAr}" وإضافته إلى قائمة الانتظار.`,
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      actorEn: "System",
      actorAr: "النظام",
    },
    {
      id: "tl-2",
      kind: "assigned",
      titleEn: `Assigned to ${item.assigneeEn}`,
      titleAr: `تم التعيين إلى ${item.assigneeAr}`,
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      actorEn: "Admin",
      actorAr: "المدير",
    },
  ];

  if (item.status !== "backlog") {
    events.push({
      id: "tl-3",
      kind: "status_changed",
      titleEn: "Status changed to Planned",
      titleAr: "تم تغيير الحالة إلى مخطط",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      actorEn: item.assigneeEn,
      actorAr: item.assigneeAr,
    });
  }

  if (item.status === "in_progress" || item.status === "review" || item.status === "done") {
    events.push({
      id: "tl-4",
      kind: "comment",
      titleEn: "Comment added",
      titleAr: "تم إضافة تعليق",
      descEn: "Work is progressing well. Initial phase completed on schedule.",
      descAr: "العمل يتقدم بشكل جيد. تم إنجاز المرحلة الأولية في الموعد المحدد.",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      actorEn: item.assigneeEn,
      actorAr: item.assigneeAr,
    });
    events.push({
      id: "tl-5",
      kind: "file_uploaded",
      titleEn: "File uploaded",
      titleAr: "تم رفع ملف",
      descEn: "progress-report.pdf",
      descAr: "تقرير-التقدم.pdf",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      actorEn: item.assigneeEn,
      actorAr: item.assigneeAr,
    });
  }

  if (item.status === "review" || item.status === "done") {
    events.push({
      id: "tl-6",
      kind: "status_changed",
      titleEn: "Moved to Review",
      titleAr: "تم النقل إلى المراجعة",
      dateEn: item.dueDateEn,
      dateAr: item.dueDateAr,
      actorEn: item.assigneeEn,
      actorAr: item.assigneeAr,
    });
  }

  if (item.status === "done") {
    events.push({
      id: "tl-7",
      kind: "completed",
      titleEn: "Work completed",
      titleAr: "تم إكمال العمل",
      descEn: "All deliverables signed off and verified.",
      descAr: "تم التوقيع على جميع المخرجات والتحقق منها.",
      dateEn: item.dueDateEn,
      dateAr: item.dueDateAr,
      actorEn: item.assigneeEn,
      actorAr: item.assigneeAr,
    });
  }

  return events;
}

const TIMELINE_ICON_MAP: Record<TimelineEvent["kind"], { Icon: React.ElementType; color: string; bg: string }> = {
  created:          { Icon: Plus,             color: "text-primary",        bg: "bg-primary/8" },
  assigned:         { Icon: UserPlus,         color: "text-violet-500",     bg: "bg-violet-50" },
  status_changed:   { Icon: ArrowRightCircle, color: "text-amber-500",      bg: "bg-amber-50" },
  comment:          { Icon: MessageSquare,    color: "text-blue-500",       bg: "bg-blue-50" },
  file_uploaded:    { Icon: Upload,           color: "text-cyan-600",       bg: "bg-cyan-50" },
  completed:        { Icon: CheckCircle2,     color: "text-emerald-500",    bg: "bg-emerald-50" },
  priority_changed: { Icon: AlertTriangle,    color: "text-rose-500",       bg: "bg-rose-50" },
};

// ─── Sample notes ─────────────────────────────────────────

interface NoteItem {
  id: string;
  authorEn: string;
  authorAr: string;
  contentEn: string;
  contentAr: string;
  dateEn: string;
  dateAr: string;
}

function getSampleNotes(item: WorkItem): NoteItem[] {
  return [
    {
      id: "n-1",
      authorEn: item.assigneeEn,
      authorAr: item.assigneeAr,
      contentEn: "Initial assessment completed. Requirements are clear and materials/resources have been identified. Ready to proceed with the next phase.",
      contentAr: "اكتمل التقييم الأولي. المتطلبات واضحة وتم تحديد المواد والموارد. جاهز للمتابعة في المرحلة التالية.",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
    },
    {
      id: "n-2",
      authorEn: "Admin",
      authorAr: "المدير",
      contentEn: "Please ensure all stakeholders are notified of the timeline. Budget has been approved for the full scope.",
      contentAr: "يرجى التأكد من إبلاغ جميع أصحاب المصلحة بالجدول الزمني. تمت الموافقة على الميزانية للنطاق الكامل.",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
    },
  ];
}

// ─── Sample files ─────────────────────────────────────────

interface FileItem {
  id: string;
  nameEn: string;
  nameAr: string;
  kind: "pdf" | "doc" | "xls" | "img" | "zip";
  sizeEn: string;
  sizeAr: string;
  dateEn: string;
  dateAr: string;
  uploaderEn: string;
  uploaderAr: string;
}

function getSampleFiles(item: WorkItem): FileItem[] {
  return [
    {
      id: "f-1",
      nameEn: "Requirements Document.pdf",
      nameAr: "مستند المتطلبات.pdf",
      kind: "pdf",
      sizeEn: "2.4 MB",
      sizeAr: "٢.٤ م.ب",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      uploaderEn: item.assigneeEn,
      uploaderAr: item.assigneeAr,
    },
    {
      id: "f-2",
      nameEn: "Budget Breakdown.xlsx",
      nameAr: "تفصيل الميزانية.xlsx",
      kind: "xls",
      sizeEn: "890 KB",
      sizeAr: "٨٩٠ ك.ب",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      uploaderEn: "Finance Team",
      uploaderAr: "فريق المالية",
    },
    {
      id: "f-3",
      nameEn: "Site Photos.zip",
      nameAr: "صور الموقع.zip",
      kind: "zip",
      sizeEn: "15.7 MB",
      sizeAr: "١٥.٧ م.ب",
      dateEn: item.createdEn,
      dateAr: item.createdAr,
      uploaderEn: item.assigneeEn,
      uploaderAr: item.assigneeAr,
    },
    {
      id: "f-4",
      nameEn: "Progress Report.docx",
      nameAr: "تقرير التقدم.docx",
      kind: "doc",
      sizeEn: "1.1 MB",
      sizeAr: "١.١ م.ب",
      dateEn: item.dueDateEn,
      dateAr: item.dueDateAr,
      uploaderEn: item.assigneeEn,
      uploaderAr: item.assigneeAr,
    },
  ];
}

const FILE_ICON_MAP: Record<FileItem["kind"], { Icon: React.ElementType; color: string; bg: string; label: string }> = {
  pdf: { Icon: FileText,      color: "text-rose-500",    bg: "bg-rose-50",    label: "PDF" },
  doc: { Icon: FileText,      color: "text-blue-500",    bg: "bg-blue-50",    label: "DOC" },
  xls: { Icon: Sheet,         color: "text-emerald-600", bg: "bg-emerald-50", label: "XLS" },
  img: { Icon: Image,         color: "text-violet-500",  bg: "bg-violet-50",  label: "IMG" },
  zip: { Icon: FolderArchive, color: "text-amber-500",   bg: "bg-amber-50",   label: "ZIP" },
};

// ─── Sample activity events ───────────────────────────────

interface ActivityEvent {
  id: string;
  kind: "email" | "call" | "meeting" | "update" | "note";
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  dateEn: string;
  dateAr: string;
}

function getSampleActivity(item: WorkItem): ActivityEvent[] {
  return [
    {
      id: "a-1", kind: "email",
      titleEn: "Email sent to stakeholders",
      titleAr: "تم إرسال بريد إلكتروني لأصحاب المصلحة",
      descEn: `Progress update shared with all parties regarding "${item.titleEn}".`,
      descAr: `تم مشاركة تحديث التقدم مع جميع الأطراف بخصوص "${item.titleAr}".`,
      dateEn: item.createdEn, dateAr: item.createdAr,
    },
    {
      id: "a-2", kind: "meeting",
      titleEn: "Status review meeting",
      titleAr: "اجتماع مراجعة الحالة",
      descEn: `Weekly sync with ${item.assigneeEn} to review milestones and blockers.`,
      descAr: `اجتماع أسبوعي مع ${item.assigneeAr} لمراجعة المعالم والعوائق.`,
      dateEn: item.createdEn, dateAr: item.createdAr,
    },
    {
      id: "a-3", kind: "update",
      titleEn: "Progress updated to " + item.progress + "%",
      titleAr: "تم تحديث التقدم إلى " + item.progress + "%",
      descEn: "Milestone checkpoint reached. All deliverables on track.",
      descAr: "تم الوصول إلى نقطة فحص المعلم. جميع المخرجات في المسار الصحيح.",
      dateEn: item.dueDateEn, dateAr: item.dueDateAr,
    },
    {
      id: "a-4", kind: "call",
      titleEn: "Follow-up call with client",
      titleAr: "مكالمة متابعة مع العميل",
      descEn: "Confirmed expectations and delivery timeline. No scope changes.",
      descAr: "تم تأكيد التوقعات والجدول الزمني للتسليم. لا تغييرات في النطاق.",
      dateEn: item.dueDateEn, dateAr: item.dueDateAr,
    },
  ];
}

const ACTIVITY_ICON_MAP: Record<ActivityEvent["kind"], { Icon: React.ElementType; color: string; bg: string }> = {
  email:   { Icon: MessageSquare, color: "text-primary",    bg: "bg-primary/8" },
  call:    { Icon: Users,         color: "text-violet-500", bg: "bg-violet-50" },
  meeting: { Icon: Calendar,      color: "text-cyan-600",   bg: "bg-cyan-50" },
  update:  { Icon: ArrowRightCircle, color: "text-amber-500", bg: "bg-amber-50" },
  note:    { Icon: StickyNote,    color: "text-muted-foreground", bg: "bg-muted" },
};

// ─── Status stepper ───────────────────────────────────────

function StatusStepper({ current, lang }: { current: WorkStatus; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const currentIdx = STATUS_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-0 flex-wrap">
      {STATUS_ORDER.map((status, i) => {
        const meta = STATUS_META[status];
        const isActive = i === currentIdx;
        const isPast   = i < currentIdx;
        const Icon = STATUS_ICONS[status];

        return (
          <div key={status} className="flex items-center">
            {i > 0 && (
              <div className={`w-6 md:w-8 h-px ${isPast ? "bg-primary/40" : "bg-border/50"}`} />
            )}
            <div className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all
              ${isActive ? "bg-primary/8 border border-primary/20" : ""}
              ${isPast ? "opacity-60" : !isActive ? "opacity-40" : ""}
            `}>
              <Icon
                size={12}
                strokeWidth={isActive ? 2 : 1.75}
                className={isActive ? "text-primary" : isPast ? "text-emerald-500" : "text-muted-foreground"}
              />
              <span className={`text-[11px] font-medium whitespace-nowrap ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {ar ? meta.ar : meta.en}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="border border-border/40 rounded-xl bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Person card ──────────────────────────────────────────

function PersonCard({ nameEn, nameAr, roleEn, roleAr, ar }: {
  nameEn: string; nameAr: string; roleEn: string; roleAr: string; ar: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 px-6 py-4 hover:bg-muted/15 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
        {initials(ar ? nameAr : nameEn)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{ar ? nameAr : nameEn}</p>
        <p className="text-[11px] text-muted-foreground">{ar ? roleAr : roleEn}</p>
      </div>
    </div>
  );
}

// ─── Org card ─────────────────────────────────────────────

function OrgCard({ nameEn, nameAr, roleEn, roleAr, ar }: {
  nameEn: string; nameAr: string; roleEn: string; roleAr: string; ar: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 px-6 py-4 hover:bg-muted/15 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
        <Building2 size={15} strokeWidth={1.75} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{ar ? nameAr : nameEn}</p>
        <p className="text-[11px] text-muted-foreground">{ar ? roleAr : roleEn}</p>
      </div>
    </div>
  );
}

// ─── Add Note Modal ───────────────────────────────────────

function AddNoteModal({ open, onClose, onAdd, lang }: {
  open: boolean; onClose: () => void; onAdd: (text: string) => void; lang: "en" | "ar";
}) {
  const ar = lang === "ar";
  const [text, setText] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
            {ar ? "إضافة ملاحظة" : "Add Note"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="px-6 py-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ar ? "اكتب ملاحظتك…" : "Write your note…"}
            rows={4}
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 resize-none"
          />
        </div>
        <div className="px-6 py-3 border-t border-border/40 flex justify-end gap-3">
          <button onClick={onClose} className="h-8 px-4 rounded-xl border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {ar ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={() => { if (text.trim()) { onAdd(text.trim()); setText(""); onClose(); } }}
            disabled={!text.trim()}
            className="h-8 px-4 rounded-xl bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {ar ? "إضافة" : "Add Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function WorkDetail() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const [allItems, setAllItems] = useState<WorkItem[]>(loadWorkItems);
  const item: WorkItem | undefined = allItems.find((w) => w.id === id);

  const [activeTab, setActiveTab] = useState<StoryTab>("overview");
  const [localNotes, setLocalNotes] = useState<NoteItem[]>([]);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);

  // ── toast helper ──
  function showToast(msg: string) {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 2200);
  }

  // ── status change ──
  function changeStatus(newStatus: WorkStatus) {
    setAllItems((prev) => {
      const updated = prev.map((w) => {
        if (w.id !== id) return w;
        const progress = newStatus === "done" ? 100 : newStatus === "backlog" ? 0 : w.progress;
        return { ...w, status: newStatus, progress };
      });
      saveWorkItems(updated);
      return updated;
    });
    setStatusMenuOpen(false);
    showToast(ar ? "تم تغيير الحالة" : "Status updated");
  }

  // ── mark done ──
  function markDone() {
    changeStatus("done");
  }

  // ── add note ──
  function handleAddNote(text: string) {
    const note: NoteItem = {
      id: `n-local-${Date.now()}`,
      authorEn: "You",
      authorAr: "أنت",
      contentEn: text,
      contentAr: text,
      dateEn: "Just now",
      dateAr: "الآن",
    };
    setLocalNotes((prev) => [note, ...prev]);
    showToast(ar ? "تمت إضافة الملاحظة" : "Note added");
  }

  // ── Not found ──
  if (!item) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <Briefcase size={20} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? "لم يُعثر على العمل" : "Work item not found"}
        </p>
        <button onClick={() => navigate("/work")} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline">
          <ArrowLeft size={12} strokeWidth={2} />
          {ar ? "العودة إلى العمل" : "Back to Work"}
        </button>
      </div>
    );
  }

  const statusMeta   = STATUS_META[item.status];
  const priorityMeta = PRIORITY_META[item.priority];
  const kindMeta     = KIND_META[item.kind];

  const timelineEvents = getTimelineEvents(item);
  const sampleNotes    = getSampleNotes(item);
  const allNotes       = [...localNotes, ...sampleNotes];
  const sampleFiles    = getSampleFiles(item);
  const sampleActivity = getSampleActivity(item);

  // Related work: pick 2–3 other items from the same org or assignee
  const relatedWork = allItems.filter((w) =>
    w.id !== item.id && (
      (item.relatedOrgId && w.relatedOrgId === item.relatedOrgId) ||
      w.assigneeEn === item.assigneeEn
    )
  ).slice(0, 3);

  return (
    <div className="min-h-full">

      {/* ── Action toast ── */}
      {actionToast && (
        <div className="fixed top-4 start-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-foreground text-background text-[13px] font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check size={14} strokeWidth={2.5} />
          {actionToast}
        </div>
      )}

      {/* ═══ HERO HEADER ═══════════════════════════════════ */}
      <div
        className="relative border-b border-border/40"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.35) 0%, hsl(var(--background)) 65%)" }}
      >
        {/* Breadcrumb */}
        <div className="px-8 md:px-10 pt-6">
          <button
            onClick={() => navigate("/work")}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            {ar ? "العمل" : "Work"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70 truncate max-w-[200px]">{ar ? item.titleAr : item.titleEn}</span>
          </button>
        </div>

        {/* Hero content */}
        <div className="px-8 md:px-10 pt-5 pb-6 max-w-[960px]">
          {/* Pills */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${kindMeta.pill}`}>
              {ar ? kindMeta.ar : kindMeta.en}
            </span>
            <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${priorityMeta.pill}`}>
              {ar ? priorityMeta.ar : priorityMeta.en}
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${statusMeta.pill}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
              {ar ? statusMeta.ar : statusMeta.en}
            </div>
          </div>

          {/* Title */}
          <h1
            className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight mb-3"
            style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}
          >
            {ar ? item.titleAr : item.titleEn}
          </h1>

          {/* Meta line */}
          <p className="text-[13px] text-muted-foreground leading-snug">
            {ar ? item.assigneeAr : item.assigneeEn}
            {(item.relatedOrgNameEn || item.relatedPersonNameEn) && (
              <>
                <span className="mx-2 text-border">·</span>
                {ar
                  ? (item.relatedOrgNameAr || item.relatedPersonNameAr)
                  : (item.relatedOrgNameEn || item.relatedPersonNameEn)
                }
              </>
            )}
            <span className="mx-2 text-border">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar size={10} strokeWidth={1.75} className="text-muted-foreground/60" />
              {ar ? item.dueDateAr : item.dueDateEn}
            </span>
          </p>

          {/* Progress bar */}
          {item.status !== "done" && (
            <div className="mt-5 flex items-center gap-4">
              <div className="flex-1 h-[5px] rounded-full bg-border/40 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${item.progress >= 100 ? "bg-emerald-500" : "bg-primary/60"}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-[15px] font-medium text-foreground shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>
                {item.progress}%
              </span>
            </div>
          )}

          {/* Stepper */}
          <div className="mt-5">
            <StatusStepper current={item.status} lang={lang} />
          </div>

          {/* ── Action buttons ── */}
          <div className="flex items-center gap-2.5 mt-6 flex-wrap">
            {/* Change status */}
            <div className="relative">
              <button
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
              >
                <ArrowRightCircle size={13} strokeWidth={1.75} />
                {ar ? "تغيير الحالة" : "Change Status"}
              </button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute top-full mt-1.5 start-0 z-50 bg-background border border-border/60 rounded-xl shadow-lg py-1.5 min-w-[180px]">
                    {STATUS_ORDER.map((s) => {
                      const m = STATUS_META[s];
                      const isCurrent = s === item.status;
                      return (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          disabled={isCurrent}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-start transition-colors ${isCurrent ? "text-primary bg-primary/5 font-medium" : "text-foreground hover:bg-muted"}`}
                        >
                          <div className={`w-2 h-2 rounded-full ${m.dot}`} />
                          {ar ? m.ar : m.en}
                          {isCurrent && <Check size={12} strokeWidth={2.5} className="ms-auto text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setNoteModalOpen(true)}
              className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <StickyNote size={13} strokeWidth={1.75} />
              {ar ? "إضافة ملاحظة" : "Add Note"}
            </button>

            <button
              onClick={() => showToast(ar ? "جارٍ فتح منتقي الملفات…" : "Opening file picker…")}
              className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <Paperclip size={13} strokeWidth={1.75} />
              {ar ? "إرفاق ملف" : "Attach File"}
            </button>

            {item.status !== "done" && (
              <button
                onClick={markDone}
                className="h-8 px-3.5 rounded-xl bg-emerald-500 text-white text-[12px] font-medium hover:bg-emerald-600 flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 size={13} strokeWidth={2} />
                {ar ? "تم الإنجاز" : "Mark Done"}
              </button>
            )}

            <button
              onClick={() => setContextPanelOpen(true)}
              className="h-8 px-3.5 rounded-xl border border-border text-[12px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors ms-auto"
            >
              <Brain size={13} strokeWidth={1.75} />
              {ar ? "الاتصالات" : "Connections"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TAB BAR ═══════════════════════════════════════ */}
      <div className="border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="px-8 md:px-10 flex items-center gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-all
                ${activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                }
              `}
            >
              {ar ? tab.ar : tab.en}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ TAB CONTENT ═══════════════════════════════════ */}
      <div className="px-8 md:px-10 py-7 max-w-[960px]">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Description */}
            <Section title={ar ? "الوصف" : "Description"}>
              <div className="px-6 py-5">
                <p
                  className="text-[14px] text-foreground/85 leading-[1.8] max-w-[680px]"
                  style={{ fontFamily: "var(--app-font-serif)" }}
                >
                  {ar ? item.descAr : item.descEn}
                </p>
              </div>
            </Section>

            {/* Details grid */}
            <Section title={ar ? "التفاصيل" : "Details"}>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/25">
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Briefcase} label={ar ? "النوع" : "Type"} value={
                    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${kindMeta.pill}`}>{ar ? kindMeta.ar : kindMeta.en}</span>
                  } />
                  <DetailRow icon={User} label={ar ? "المسؤول" : "Assignee"} value={
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[8px] font-semibold text-primary">{initials(ar ? item.assigneeAr : item.assigneeEn)}</div>
                      <span>{ar ? item.assigneeAr : item.assigneeEn}</span>
                    </div>
                  } />
                  <DetailRow icon={Tag} label={ar ? "الأولوية" : "Priority"} value={
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${priorityMeta.dot}`} />
                      {ar ? priorityMeta.ar : priorityMeta.en}
                    </div>
                  } />
                </div>
                <div className="divide-y divide-border/25">
                  <DetailRow icon={Calendar} label={ar ? "تاريخ الاستحقاق" : "Due Date"} value={ar ? item.dueDateAr : item.dueDateEn} />
                  <DetailRow icon={Clock} label={ar ? "تاريخ الإنشاء" : "Created"} value={ar ? item.createdAr : item.createdEn} />
                  {(item.relatedOrgNameEn || item.relatedPersonNameEn) && (
                    <DetailRow
                      icon={item.relatedOrgNameEn ? Building2 : Users}
                      label={ar ? (item.relatedOrgNameEn ? "المنظمة" : "الشخص المرتبط") : (item.relatedOrgNameEn ? "Organization" : "Related Person")}
                      value={ar
                        ? (item.relatedOrgNameAr || item.relatedPersonNameAr || "")
                        : (item.relatedOrgNameEn || item.relatedPersonNameEn || "")
                      }
                    />
                  )}
                </div>
              </div>
            </Section>

            {/* Summary metrics */}
            <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
                {[
                  { value: ar ? statusMeta.ar : statusMeta.en, label: ar ? "الحالة" : "Status" },
                  { value: ar ? priorityMeta.ar : priorityMeta.en, label: ar ? "الأولوية" : "Priority" },
                  { value: `${item.progress}%`, label: ar ? "التقدم" : "Progress" },
                  { value: ar ? item.dueDateAr : item.dueDateEn, label: ar ? "الاستحقاق" : "Due" },
                ].map((s, i) => (
                  <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
                    <p className="text-[20px] font-medium text-foreground leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
                      {s.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {activeTab === "timeline" && (
          <Section title={ar ? "الجدول الزمني" : "Timeline"}>
            <div className="px-6 py-2">
              {timelineEvents.map((event, i) => {
                const { Icon, color, bg } = TIMELINE_ICON_MAP[event.kind];
                const isLast = i === timelineEvents.length - 1;

                return (
                  <div key={event.id} className="flex gap-4">
                    {/* Vertical line + icon */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} strokeWidth={1.75} className={color} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground leading-snug">
                        {ar ? event.titleAr : event.titleEn}
                      </p>
                      {event.descEn && (
                        <p className="text-[12px] text-muted-foreground/80 mt-1 leading-relaxed">
                          {ar ? event.descAr : event.descEn}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/60">
                        <span>{ar ? event.actorAr : event.actorEn}</span>
                        <span>·</span>
                        <span>{ar ? event.dateAr : event.dateEn}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── PEOPLE TAB ── */}
        {activeTab === "people" && (
          <Section title={ar ? "الأشخاص" : "People"}>
            <div className="divide-y divide-border/25">
              <PersonCard
                nameEn={item.assigneeEn} nameAr={item.assigneeAr}
                roleEn="Assignee" roleAr="المسؤول" ar={ar}
              />
              {item.relatedPersonNameEn && (
                <PersonCard
                  nameEn={item.relatedPersonNameEn} nameAr={item.relatedPersonNameAr || ""}
                  roleEn="Contact / Requester" roleAr="جهة الاتصال / مقدم الطلب" ar={ar}
                />
              )}
              {/* Extra sample person: manager who created it */}
              <PersonCard
                nameEn="Admin" nameAr="المدير"
                roleEn="Created by" roleAr="أنشأه" ar={ar}
              />
            </div>
            {!item.relatedPersonNameEn && (
              <div className="px-6 py-8 text-center border-t border-border/25">
                <p className="text-[12px] text-muted-foreground/50">{ar ? "لا توجد جهات اتصال إضافية" : "No additional contacts linked"}</p>
              </div>
            )}
          </Section>
        )}

        {/* ── ORGANIZATIONS TAB ── */}
        {activeTab === "organizations" && (
          <Section title={ar ? "المنظمات" : "Organizations"}>
            {item.relatedOrgNameEn ? (
              <div className="divide-y divide-border/25">
                <OrgCard
                  nameEn={item.relatedOrgNameEn} nameAr={item.relatedOrgNameAr || ""}
                  roleEn="Client / Related Organization" roleAr="العميل / المنظمة المرتبطة" ar={ar}
                />
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
                  <Building2 size={16} className="text-muted-foreground/40" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] text-muted-foreground/60">{ar ? "لا توجد منظمات مرتبطة" : "No organizations linked"}</p>
              </div>
            )}
          </Section>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === "notes" && (
          <Section
            title={ar ? "الملاحظات" : "Notes"}
            action={
              <button
                onClick={() => setNoteModalOpen(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus size={12} strokeWidth={2.5} />
                {ar ? "إضافة" : "Add"}
              </button>
            }
          >
            <div className="divide-y divide-border/25">
              {allNotes.map((note) => (
                <div key={note.id} className="px-6 py-4">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-6 h-6 rounded-md bg-primary/8 flex items-center justify-center text-[8px] font-semibold text-primary">
                      {initials(ar ? note.authorAr : note.authorEn)}
                    </div>
                    <span className="text-[12px] font-medium text-foreground">{ar ? note.authorAr : note.authorEn}</span>
                    <span className="text-[10px] text-muted-foreground/50 ms-auto">{ar ? note.dateAr : note.dateEn}</span>
                  </div>
                  <p className="text-[13px] text-foreground/80 leading-[1.7] ps-8.5" style={{ paddingInlineStart: "2.125rem" }}>
                    {ar ? note.contentAr : note.contentEn}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── FILES TAB ── */}
        {activeTab === "files" && (
          <Section
            title={ar ? "الملفات" : "Files"}
            action={
              <button
                onClick={() => showToast(ar ? "جارٍ فتح منتقي الملفات…" : "Opening file picker…")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Upload size={12} strokeWidth={2.5} />
                {ar ? "رفع" : "Upload"}
              </button>
            }
          >
            <div className="divide-y divide-border/25">
              {sampleFiles.map((file) => {
                const fm = FILE_ICON_MAP[file.kind];
                return (
                  <div key={file.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/15 transition-colors">
                    <div className={`w-9 h-9 rounded-xl ${fm.bg} flex items-center justify-center shrink-0`}>
                      <fm.Icon size={15} strokeWidth={1.75} className={fm.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{ar ? file.nameAr : file.nameEn}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ar ? file.sizeAr : file.sizeEn} · {ar ? file.uploaderAr : file.uploaderEn} · {ar ? file.dateAr : file.dateEn}
                      </p>
                    </div>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors shrink-0">
                      <Download size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === "activity" && (
          <Section title={ar ? "النشاط" : "Activity"}>
            <div className="px-6 py-2">
              {sampleActivity.map((event, i) => {
                const { Icon, color, bg } = ACTIVITY_ICON_MAP[event.kind];
                const isLast = i === sampleActivity.length - 1;
                return (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} strokeWidth={1.75} className={color} />
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-border/40 my-1" />}
                    </div>
                    <div className={`flex-1 min-w-0 ${isLast ? "pb-4" : "pb-6"}`}>
                      <p className="text-[13px] font-medium text-foreground">{ar ? event.titleAr : event.titleEn}</p>
                      <p className="text-[12px] text-muted-foreground/70 mt-0.5 leading-relaxed">{ar ? event.descAr : event.descEn}</p>
                      <p className="text-[11px] text-muted-foreground/50 mt-1">{ar ? event.dateAr : event.dateEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── RELATED WORK TAB ── */}
        {activeTab === "related" && (
          <div className="space-y-4">
            <Section title={ar ? "السجلات المرتبطة" : "Related Records"}>
              <RelatedRecords entityType="work" entityId={item.id} />
            </Section>
            <BacklinksSection entityType="work" entityId={item.id} />
          </div>
        )}
      </div>

      {/* ── Add Note Modal ── */}
      <AddNoteModal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} onAdd={handleAddNote} lang={lang} />

      {/* ── Context Panel ── */}
      <ContextPanel
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        entityType="work"
        entityId={item.id}
        titleEn={item.titleEn}
        titleAr={item.titleAr}
      />
    </div>
  );
}

// ─── Detail row (redesigned for overview grid) ────────────

function DetailRow({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 px-6 py-3.5">
      <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
        <Icon size={13} strokeWidth={1.75} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground/70 mb-0.5">{label}</p>
        <div className="text-[13px] text-foreground">{value}</div>
      </div>
    </div>
  );
}
