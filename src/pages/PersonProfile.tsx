import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  PEOPLE, STATUS_META, TYPE_META,
  type Person, type ActivityItem, type NoteItem, type FileItem, type RelatedRecord,
} from "../data/people";
import {
  ArrowLeft, Mail, Phone, Globe, Linkedin, MapPin, Building2,
  Package, FileText, Video, UserPlus, CircleDollarSign,
  StickyNote, PhoneCall, FolderArchive, Sheet, Image,
  Plus, Download, Copy, Check, ExternalLink, ChevronRight,
  Clock, Paperclip,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return { copied, copy };
}

// ─── Tab definition ───────────────────────────────────────

type Tab = "overview" | "contact" | "roles" | "activity" | "notes" | "files" | "related";

const TABS: { id: Tab; en: string; ar: string }[] = [
  { id: "overview",  en: "Overview",  ar: "نظرة عامة" },
  { id: "contact",   en: "Contact",   ar: "جهة الاتصال" },
  { id: "roles",     en: "Roles",     ar: "الأدوار" },
  { id: "activity",  en: "Activity",  ar: "النشاط" },
  { id: "notes",     en: "Notes",     ar: "الملاحظات" },
  { id: "files",     en: "Files",     ar: "الملفات" },
  { id: "related",   en: "Related",   ar: "السجلات" },
];

// ─── Activity icons ───────────────────────────────────────

function activityMeta(kind: ActivityItem["kind"]) {
  switch (kind) {
    case "email":    return { Icon: Mail,             color: "text-primary",    bg: "bg-primary/8" };
    case "call":     return { Icon: PhoneCall,        color: "text-violet-500", bg: "bg-violet-50" };
    case "payment":  return { Icon: CircleDollarSign, color: "text-emerald-600",bg: "bg-emerald-50" };
    case "order":    return { Icon: Package,           color: "text-amber-600",  bg: "bg-amber-50" };
    case "note":     return { Icon: StickyNote,        color: "text-muted-foreground", bg: "bg-muted" };
    case "contract": return { Icon: FileText,          color: "text-blue-600",   bg: "bg-blue-50" };
    case "meeting":  return { Icon: Video,             color: "text-cyan-600",   bg: "bg-cyan-50" };
    case "added":    return { Icon: UserPlus,          color: "text-muted-foreground", bg: "bg-muted" };
    default:         return { Icon: Clock,             color: "text-muted-foreground", bg: "bg-muted" };
  }
}

function fileMeta(kind: FileItem["kind"]) {
  switch (kind) {
    case "pdf": return { Icon: FileText,      color: "text-rose-500",   bg: "bg-rose-50",   label: "PDF" };
    case "doc": return { Icon: FileText,      color: "text-blue-500",   bg: "bg-blue-50",   label: "DOC" };
    case "zip": return { Icon: FolderArchive, color: "text-amber-500",  bg: "bg-amber-50",  label: "ZIP" };
    case "xls": return { Icon: Sheet,         color: "text-emerald-600",bg: "bg-emerald-50",label: "XLS" };
    case "img": return { Icon: Image,         color: "text-violet-500", bg: "bg-violet-50", label: "IMG" };
    default:    return { Icon: Paperclip,     color: "text-muted-foreground", bg: "bg-muted", label: "FILE" };
  }
}

function relatedMeta(kind: RelatedRecord["kind"]) {
  switch (kind) {
    case "invoice":  return { en: "Invoice",  ar: "فاتورة",    pill: "bg-primary/8 text-primary border border-primary/20" };
    case "order":    return { en: "Order",    ar: "طلب",       pill: "bg-amber-50 text-amber-700 border border-amber-200" };
    case "contract": return { en: "Contract", ar: "عقد",       pill: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "quote":    return { en: "Quote",    ar: "عرض سعر",   pill: "bg-violet-50 text-violet-700 border border-violet-200" };
  }
}

const RELATED_STATUS_TONES = {
  active:  "text-primary",
  warning: "text-amber-600",
  neutral: "text-muted-foreground",
  success: "text-emerald-600",
};

// ─── Copy field ───────────────────────────────────────────

function CopyField({ value }: { value: string }) {
  const { copied, copy } = useCopy(value);
  return (
    <button
      onClick={copy}
      className="ml-2 w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors shrink-0"
      aria-label="Copy"
    >
      {copied ? <Check size={11} strokeWidth={2.5} className="text-emerald-500" /> : <Copy size={11} strokeWidth={1.75} />}
    </button>
  );
}

// ─── Stat item ────────────────────────────────────────────

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-4 first:ps-0 last:pe-0">
      <p
        className="text-[20px] font-medium text-foreground leading-none mb-1"
        style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────

function OverviewTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const bio = ar ? person.bioAr : person.bioEn;
  const m = person.metrics;

  return (
    <div className="space-y-5">

      {/* Bio */}
      {bio && (
        <div className="bg-muted/25 border border-border/40 rounded-xl px-6 py-5">
          <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-3">
            {ar ? "نبذة" : "About"}
          </h3>
          <p
            className="text-[14px] text-foreground/85 leading-[1.75] max-w-[660px]"
            style={{ fontFamily: "var(--app-font-serif)" }}
          >
            {bio}
          </p>
        </div>
      )}

      {/* Relationship metrics */}
      {m && (
        <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
          <div className="px-6 py-4 border-b border-border/40">
            <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">
              {ar ? "ملخص العلاقة" : "Relationship Summary"}
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border/20">
            {[
              { value: ar ? m.totalValueAr : m.totalValue, label: ar ? "إجمالي القيمة" : "Total Value" },
              { value: String(m.transactionCount), label: ar ? "المعاملات" : "Transactions" },
              { value: ar ? m.sinceAr : m.sinceEn, label: ar ? "العلاقة منذ" : "Relationship Since" },
              { value: String(m.openItems), label: ar ? "بنود مفتوحة" : "Open Items" },
            ].map((s, i) => (
              <div key={i} className="bg-background px-6 py-5 flex flex-col gap-1.5">
                <p
                  className="text-[22px] font-medium text-foreground leading-none"
                  style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}
                >
                  {s.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Contact tab ──────────────────────────────────────────

function ContactTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";

  const fields: { icon: React.ElementType; label: string; value: string; href?: string }[] = [
    ...(person.email    ? [{ icon: Mail,      label: ar ? "البريد الإلكتروني" : "Email",     value: person.email,    href: `mailto:${person.email}` }] : []),
    ...(person.phone    ? [{ icon: Phone,     label: ar ? "الهاتف"           : "Phone",     value: person.phone,    href: `tel:${person.phone}` }] : []),
    ...(person.website  ? [{ icon: Globe,     label: ar ? "الموقع الإلكتروني" : "Website",  value: person.website,  href: `https://${person.website}` }] : []),
    ...(person.linkedin ? [{ icon: Linkedin,  label: "LinkedIn",                             value: person.linkedin, href: `https://${person.linkedin}` }] : []),
  ];

  const hasLocation = person.city || person.country;

  return (
    <div className="space-y-4">
      {/* Contact details */}
      <div className="border border-border/40 rounded-xl overflow-hidden bg-background divide-y divide-border/30">
        {fields.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="flex items-center gap-4 px-6 py-4 group">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Icon size={14} strokeWidth={1.75} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5">{f.label}</p>
                {f.href ? (
                  <a
                    href={f.href}
                    target={f.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="text-[13.5px] text-foreground hover:text-primary transition-colors flex items-center gap-1 w-fit"
                  >
                    {f.value}
                    {f.href.startsWith("http") && <ExternalLink size={10} strokeWidth={1.75} className="text-muted-foreground/50" />}
                  </a>
                ) : (
                  <p className="text-[13.5px] text-foreground">{f.value}</p>
                )}
              </div>
              <CopyField value={f.value} />
            </div>
          );
        })}

        {/* Location */}
        {hasLocation && (
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
              <MapPin size={14} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground mb-0.5">{ar ? "الموقع" : "Location"}</p>
              <p className="text-[13.5px] text-foreground">
                {[
                  person.address && (ar ? person.addressAr : person.address),
                  person.city && (ar ? person.cityAr : person.city),
                  person.country && (ar ? person.countryAr : person.country),
                ].filter(Boolean).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Company */}
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            <Building2 size={14} strokeWidth={1.75} className="text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground mb-0.5">{ar ? "الشركة" : "Company"}</p>
            <p className="text-[13.5px] text-foreground">{ar ? person.companyAr : person.company}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Roles tab ────────────────────────────────────────────

function RolesTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";

  return (
    <div className="space-y-4">
      {person.roles.map((r, i) => {
        const meta = TYPE_META[r.type];
        return (
          <div key={i} className="border border-border/40 rounded-xl overflow-hidden bg-background">
            {/* Role header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${meta.pill}`}>
                {ar ? meta.ar : meta.en}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {ar ? "منذ" : "Since"} {ar ? r.sinceAr : r.sinceEn}
              </span>
            </div>
            {/* Role body */}
            <div className="px-6 py-5">
              <p
                className="text-[14px] text-foreground/85 leading-[1.75]"
                style={{ fontFamily: "var(--app-font-serif)" }}
              >
                {ar ? r.descAr : r.descEn}
              </p>
            </div>
          </div>
        );
      })}

      {person.roles.length === 0 && (
        <EmptyState icon={UserPlus} messageEn="No roles defined yet." messageAr="لا توجد أدوار محددة بعد." lang={lang} />
      )}
    </div>
  );
}

// ─── Activity tab ─────────────────────────────────────────

function ActivityTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const items = person.activity ?? [];

  if (items.length === 0) {
    return <EmptyState icon={Clock} messageEn="No activity recorded yet." messageAr="لا يوجد نشاط مسجل بعد." lang={lang} />;
  }

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
      {items.map((item, i) => {
        const { Icon, color, bg } = activityMeta(item.kind);
        const isLast = i === items.length - 1;

        return (
          <div
            key={item.id}
            className={`flex items-start gap-4 px-5 py-4 ${!isLast ? "border-b border-border/30" : ""} hover:bg-muted/15 transition-colors`}
          >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon size={14} strokeWidth={1.75} className={color} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] text-foreground leading-snug">
                {ar ? item.textAr : item.textEn}
                {(item.valueEn || item.valueAr) && (
                  <span className="font-medium text-foreground ms-1.5">
                    {ar ? item.valueAr : item.valueEn}
                  </span>
                )}
              </p>
              {(item.authorEn || item.authorAr) && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {ar ? item.authorAr : item.authorEn}
                </p>
              )}
            </div>

            {/* Date */}
            <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap mt-0.5">
              {ar ? item.dateAr : item.dateEn}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Notes tab ────────────────────────────────────────────

function NotesTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [notes, setNotes] = useState(person.notes ?? []);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState("");
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (drafting) setTimeout(() => draftRef.current?.focus(), 60);
  }, [drafting]);

  function saveNote() {
    if (!draft.trim()) { setDrafting(false); return; }
    const newNote = {
      id: `n-${Date.now()}`,
      textEn: draft.trim(),
      textAr: draft.trim(),
      authorEn: "You",
      authorAr: "أنت",
      dateEn: "Just now",
      dateAr: "الآن",
    };
    setNotes((n) => [newNote, ...n]);
    setDraft("");
    setDrafting(false);
  }

  return (
    <div className="space-y-4">
      {/* Add note button / draft area */}
      {!drafting ? (
        <button
          onClick={() => setDrafting(true)}
          className="w-full flex items-center gap-3 px-5 py-4 border border-dashed border-border/60 rounded-xl text-[13px] text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/3 transition-all duration-150"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
            <Plus size={13} className="text-primary" strokeWidth={2} />
          </div>
          {ar ? "إضافة ملاحظة…" : "Add a note…"}
        </button>
      ) : (
        <div className="border border-primary/30 rounded-xl overflow-hidden bg-background shadow-sm">
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={ar ? "اكتب ملاحظتك هنا…" : "Write your note here…"}
            rows={4}
            className="w-full px-5 pt-4 pb-2 text-[13.5px] text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
            style={{ fontFamily: "var(--app-font-serif)" }}
          />
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border/30 bg-muted/10">
            <button
              onClick={() => { setDrafting(false); setDraft(""); }}
              className="h-8 px-3.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button
              onClick={saveNote}
              className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              {ar ? "حفظ" : "Save Note"}
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !drafting && (
        <EmptyState icon={StickyNote} messageEn="No notes yet. Add the first one." messageAr="لا توجد ملاحظات. أضف الأولى." lang={lang} />
      )}
      {notes.map((note) => (
        <div
          key={note.id}
          className="border border-border/40 rounded-xl overflow-hidden bg-background"
        >
          {/* Note header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border/30 bg-muted/15">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary select-none">
              {initials(ar ? note.authorAr : note.authorEn)}
            </div>
            <span className="text-[12px] font-medium text-foreground">
              {ar ? note.authorAr : note.authorEn}
            </span>
            <span className="text-[11px] text-muted-foreground ms-auto">
              {ar ? note.dateAr : note.dateEn}
            </span>
          </div>
          {/* Note body */}
          <div className="px-5 py-4">
            <p
              className="text-[13.5px] text-foreground/85 leading-[1.75]"
              style={{ fontFamily: "var(--app-font-serif)" }}
            >
              {ar ? note.textAr : note.textEn}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Files tab ────────────────────────────────────────────

function FilesTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const files = person.files ?? [];

  if (files.length === 0) {
    return <EmptyState icon={Paperclip} messageEn="No files attached yet." messageAr="لا توجد ملفات مرفقة بعد." lang={lang} />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {files.map((file) => {
        const { Icon, color, bg, label } = fileMeta(file.kind);
        return (
          <div
            key={file.id}
            className="group border border-border/40 rounded-xl p-4 flex items-start gap-4 bg-background hover:shadow-sm hover:border-border/70 transition-all duration-150"
          >
            {/* File type icon */}
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon size={18} strokeWidth={1.5} className={color} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium text-foreground truncate leading-snug"
                style={{ letterSpacing: "-0.01em" }}
              >
                {ar ? file.nameAr : file.nameEn}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                <span className="font-medium text-muted-foreground/80">{label}</span>
                <span className="mx-1.5 text-border">·</span>
                {file.size}
                <span className="mx-1.5 text-border">·</span>
                {ar ? file.dateAr : file.dateEn}
              </p>
            </div>

            {/* Download icon (hover) */}
            <button className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/30 group-hover:text-muted-foreground group-hover:bg-muted transition-colors">
              <Download size={13} strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Related records tab ──────────────────────────────────

function RelatedTab({ person, lang }: { person: Person; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const records = person.related ?? [];

  if (records.length === 0) {
    return <EmptyState icon={FileText} messageEn="No related records found." messageAr="لا توجد سجلات مرتبطة." lang={lang} />;
  }

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-background">
      {/* Table head */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 border-b border-border/40 bg-muted/20">
        {["Type / Ref", "Description", "Value", "Status"].map((h, i) => (
          <p key={i} className="text-[10.5px] font-semibold text-muted-foreground tracking-[0.07em] uppercase">
            {ar
              ? ["النوع / المرجع", "الوصف", "القيمة", "الحالة"][i]
              : h
            }
          </p>
        ))}
      </div>

      {/* Rows */}
      {records.map((r, i) => {
        const kindMeta = relatedMeta(r.kind);
        const isLast = i === records.length - 1;

        return (
          <div
            key={r.id}
            className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-5 py-4 hover:bg-muted/15 transition-colors ${!isLast ? "border-b border-border/30" : ""}`}
          >
            {/* Type + Ref */}
            <div className="flex flex-col gap-1.5 min-w-[90px]">
              <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full w-fit ${kindMeta.pill}`}>
                {ar ? kindMeta.ar : kindMeta.en}
              </span>
              <span className="text-[12px] font-medium text-foreground font-mono">
                {ar ? r.refAr : r.refEn}
              </span>
            </div>

            {/* Description */}
            <p className="text-[12.5px] text-muted-foreground truncate">
              {ar ? r.descAr : r.descEn}
            </p>

            {/* Value */}
            <p className="text-[13px] font-medium text-foreground whitespace-nowrap" style={{ fontFamily: "var(--app-font-serif)" }}>
              {ar ? r.valueAr : r.valueEn}
            </p>

            {/* Status */}
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                r.statusTone === "success" ? "bg-emerald-500" :
                r.statusTone === "active"  ? "bg-primary" :
                r.statusTone === "warning" ? "bg-amber-500" :
                "bg-muted-foreground/40"
              }`} />
              <span className={`text-[12px] ${RELATED_STATUS_TONES[r.statusTone]}`}>
                {ar ? r.statusAr : r.statusEn}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────

function EmptyState({
  icon: Icon,
  messageEn,
  messageAr,
  lang,
}: {
  icon: React.ElementType;
  messageEn: string;
  messageAr: string;
  lang: "en" | "ar";
}) {
  return (
    <div className="border border-border/40 rounded-xl py-14 text-center bg-background">
      <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-4 flex items-center justify-center">
        <Icon size={16} className="text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-muted-foreground">
        {lang === "ar" ? messageAr : messageEn}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────

export default function PersonProfile() {
  const { lang } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const ar = lang === "ar";

  const person: Person | undefined = PEOPLE.find((p) => p.id === id);

  // ── Person not found ──
  if (!person) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <UserPlus size={20} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? "لم يُعثر على الشخص" : "Person not found"}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {ar ? "قد تكون صفحة الملف الشخصي مرئية فقط للأشخاص الموجودين في قاعدة البيانات." : "Profile pages are available for people in the main directory."}
        </p>
        <button
          onClick={() => navigate("/people")}
          className="mt-1 flex items-center gap-1.5 text-[12px] text-primary hover:underline"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          {ar ? "العودة إلى الأشخاص" : "Back to People"}
        </button>
      </div>
    );
  }

  const statusMeta = STATUS_META[person.status];

  return (
    <div className="min-h-full">

      {/* ── Hero header ─────────────────────────────────── */}
      <div className="relative border-b border-border/40" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.4) 0%, hsl(var(--background)) 70%)" }}>

        {/* Back link */}
        <div className="px-8 md:px-10 pt-6 pb-0">
          <button
            onClick={() => navigate("/people")}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={12} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            {ar ? "الأشخاص" : "People"}
            <ChevronRight size={11} strokeWidth={1.75} className="text-muted-foreground/50" />
            <span className="text-foreground/70">{ar ? person.nameAr : person.name}</span>
          </button>
        </div>

        {/* Main header content */}
        <div className="px-8 md:px-10 pt-6 pb-7 max-w-[900px]">
          <div className="flex items-start gap-5">

            {/* Avatar */}
            <div
              className={`
                w-[72px] h-[72px] rounded-2xl shrink-0
                flex items-center justify-center
                text-[22px] font-semibold select-none tracking-tight
                shadow-sm ring-4 ring-background/80
                ${person.avatarColor}
              `}
              aria-label={person.name}
            >
              {initials(person.name)}
            </div>

            {/* Name block */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h1
                    className="text-[26px] md:text-[30px] font-medium text-foreground leading-tight tracking-tight"
                    style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.03em" }}
                  >
                    {ar ? person.nameAr : person.name}
                  </h1>
                  <p className="text-[13.5px] text-muted-foreground mt-1 leading-snug">
                    {ar ? person.roleAr : person.role}
                    <span className="mx-2 text-border">·</span>
                    {ar ? person.companyAr : person.company}
                    {(person.city || person.country) && (
                      <>
                        <span className="mx-2 text-border">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={10} strokeWidth={1.75} className="text-muted-foreground/60" />
                          {[ar ? person.cityAr : person.city, ar ? person.countryAr : person.country].filter(Boolean).join(", ")}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                {/* Status badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium shrink-0 ${statusMeta.pill}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                  {ar ? statusMeta.ar : statusMeta.en}
                </div>
              </div>

              {/* Role pills */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {person.roles.map((r, i) => {
                  const meta = TYPE_META[r.type];
                  return (
                    <span key={i} className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${meta.pill}`}>
                      {ar ? meta.ar : meta.en}
                    </span>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 flex-wrap mt-4">
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-border/70 bg-background/80 text-[12px] text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/3 transition-all duration-150"
                  >
                    <Mail size={12} strokeWidth={1.75} />
                    {ar ? "مراسلة" : "Email"}
                  </a>
                )}
                {person.phone && (
                  <a
                    href={`tel:${person.phone}`}
                    className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-border/70 bg-background/80 text-[12px] text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/3 transition-all duration-150"
                  >
                    <Phone size={12} strokeWidth={1.75} />
                    {ar ? "اتصال" : "Call"}
                  </a>
                )}
                {person.linkedin && (
                  <a
                    href={`https://${person.linkedin}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-border/70 bg-background/80 text-[12px] text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/3 transition-all duration-150"
                  >
                    <Linkedin size={12} strokeWidth={1.75} />
                    LinkedIn
                  </a>
                )}
                <button
                  onClick={() => setActiveTab("notes")}
                  className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-border/70 bg-background/80 text-[12px] text-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/3 transition-all duration-150"
                >
                  <Plus size={12} strokeWidth={2} />
                  {ar ? "ملاحظة" : "Add Note"}
                </button>
              </div>
            </div>
          </div>

          {/* Metrics strip */}
          {person.metrics && (
            <div className="mt-7 pt-5 border-t border-border/40 flex items-center gap-6 flex-wrap">
              {[
                { value: ar ? person.metrics.totalValueAr : person.metrics.totalValue, label: ar ? "إجمالي القيمة" : "Total Value" },
                { value: String(person.metrics.transactionCount), label: ar ? "المعاملات" : "Transactions" },
                { value: ar ? person.metrics.sinceAr : person.metrics.sinceEn, label: ar ? "منذ" : "Since" },
                { value: String(person.metrics.openItems), label: ar ? "مفتوحة" : "Open" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col gap-0.5 min-w-[70px]">
                  <p
                    className="text-[18px] font-medium text-foreground leading-none"
                    style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}
                  >
                    {s.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab navigation ───────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 overflow-x-auto">
          <div className="flex items-center gap-0 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-4 py-3.5 text-[12.5px] font-medium whitespace-nowrap
                  transition-colors duration-150
                  ${activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {ar ? tab.ar : tab.en}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="px-8 md:px-10 py-7 max-w-[900px]">
        {activeTab === "overview"  && <OverviewTab  person={person} lang={lang} />}
        {activeTab === "contact"   && <ContactTab   person={person} lang={lang} />}
        {activeTab === "roles"     && <RolesTab     person={person} lang={lang} />}
        {activeTab === "activity"  && <ActivityTab  person={person} lang={lang} />}
        {activeTab === "notes"     && <NotesTab     person={person} lang={lang} />}
        {activeTab === "files"     && <FilesTab     person={person} lang={lang} />}
        {activeTab === "related"   && <RelatedTab   person={person} lang={lang} />}
      </div>

    </div>
  );
}
