import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../context/LanguageContext";
import {
  PEOPLE, STATUS_META, TYPE_META,
  type Person, type PersonType, type Status,
} from "../data/people";
import {
  Search, Plus, X, LayoutGrid, List,
  ChevronLeft, ChevronRight, Mail, Phone, Building2,
  Check, AlertCircle, ChevronRight as ChevRight,
} from "lucide-react";
import { isDemoMode } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { PeopleLive } from "../lib/liveViews";

// ─── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const CARD_PAGE  = 9;
const TABLE_PAGE = 10;

// ─── Add Person Modal ─────────────────────────────────────

interface AddPersonModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (p: Person) => void;
  lang: "en" | "ar";
}

const EMPTY_FORM = {
  name: "", company: "", role: "", email: "", phone: "",
  type: "customer" as PersonType,
  status: "active" as Status,
};

function AddPersonModal({ open, onClose, onAdd, lang }: AddPersonModalProps) {
  const ar = lang === "ar";
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}); setSubmitted(false); setTimeout(() => nameRef.current?.focus(), 80); }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function validate() {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim())    e.name    = ar ? "الاسم مطلوب"   : "Name is required";
    if (!form.company.trim()) e.company = ar ? "الشركة مطلوبة" : "Company is required";
    if (!form.role.trim())    e.role    = ar ? "المنصب مطلوب"  : "Role is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = ar ? "البريد غير صالح" : "Invalid email";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const COLORS: Record<PersonType, string> = {
      customer:   "bg-violet-100 text-violet-700",
      employee:   "bg-emerald-100 text-emerald-700",
      supplier:   "bg-amber-100 text-amber-700",
      contractor: "bg-blue-100 text-blue-700",
      partner:    "bg-cyan-100 text-cyan-700",
    };

    const person: Person = {
      id: `p-${Date.now()}`,
      name: form.name.trim(),         nameAr: form.name.trim(),
      company: form.company.trim(),   companyAr: form.company.trim(),
      role: form.role.trim(),         roleAr: form.role.trim(),
      email: form.email.trim(),       phone: form.phone.trim(),
      status: form.status,            type: form.type,
      roles: [{ type: form.type, sinceEn: "Just now", sinceAr: "الآن", descEn: "", descAr: "" }],
      lastContactEn: "Just now",      lastContactAr: "للتو",
      avatarColor: COLORS[form.type],
      activity: [], notes: [], files: [], related: [],
    };

    setSubmitted(true);
    setTimeout(() => { onAdd(person); onClose(); }, 600);
  }

  function field(key: keyof typeof EMPTY_FORM, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 className="text-[17px] font-medium text-foreground" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
            {ar ? "إضافة شخص جديد" : "Add Person"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "النوع" : "Type"}</label>
                <select value={form.type} onChange={(e) => field("type", e.target.value)} className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  {(["customer","employee","supplier","contractor","partner"] as PersonType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_META[t].en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الحالة" : "Status"}</label>
                <select value={form.status} onChange={(e) => field("status", e.target.value)} className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
                  <option value="active">{ar ? "نشط" : "Active"}</option>
                  <option value="lead">{ar ? "محتمل" : "Lead"}</option>
                  <option value="inactive">{ar ? "غير نشط" : "Inactive"}</option>
                </select>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {ar ? "الاسم" : "Full Name"} <span className="text-rose-400">*</span>
              </label>
              <input ref={nameRef} type="text" value={form.name} onChange={(e) => field("name", e.target.value)}
                placeholder={ar ? "مثال: عمر الراشدي" : "e.g. Omar Al-Rashidi"}
                className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.name ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
              />
              {errors.name && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.name}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {ar ? "الشركة" : "Company"} <span className="text-rose-400">*</span>
              </label>
              <input type="text" value={form.company} onChange={(e) => field("company", e.target.value)}
                placeholder={ar ? "مثال: شركة الخليج" : "e.g. Gulf Traders LLC"}
                className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.company ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
              />
              {errors.company && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.company}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                {ar ? "المنصب" : "Role"} <span className="text-rose-400">*</span>
              </label>
              <input type="text" value={form.role} onChange={(e) => field("role", e.target.value)}
                placeholder={ar ? "مثال: مدير المشتريات" : "e.g. Procurement Manager"}
                className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.role ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
              />
              {errors.role && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.role}</p>}
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "البريد الإلكتروني" : "Email"}</label>
                <input type="email" value={form.email} onChange={(e) => field("email", e.target.value)} placeholder="name@company.com"
                  className={`w-full h-9 px-3 rounded-xl border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none transition-colors ${errors.email ? "border-rose-400" : "border-border/80 focus:border-primary/40"}`}
                />
                {errors.email && <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><AlertCircle size={10} />{errors.email}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">{ar ? "الهاتف" : "Phone"}</label>
                <input type="tel" value={form.phone} onChange={(e) => field("phone", e.target.value)} placeholder="+971 50 000 0000"
                  className="w-full h-9 px-3 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/40 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-xl border border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button type="submit" disabled={submitted} className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
              {submitted
                ? <><Check size={14} strokeWidth={2.5} />{ar ? "تمت الإضافة" : "Added"}</>
                : <><Plus size={14} strokeWidth={2} />{ar ? "إضافة" : "Add Person"}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Card view ────────────────────────────────────────────

type ViewMode = "card" | "table";

function PersonCard({ person, lang, onClick }: { person: Person; lang: "en" | "ar"; onClick: () => void }) {
  const ar = lang === "ar";
  const typeMeta   = TYPE_META[person.type];
  const statusMeta = STATUS_META[person.status];

  return (
    <div
      onClick={onClick}
      className="bg-background border border-border/40 rounded-xl p-5 flex flex-col gap-4 hover:shadow-sm hover:border-border/70 transition-all duration-150 cursor-pointer group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-semibold tracking-wide select-none ${person.avatarColor}`}>
          {initials(person.name)}
        </div>
        <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${typeMeta.pill}`}>
          {ar ? typeMeta.ar : typeMeta.en}
        </span>
      </div>

      {/* Name / company */}
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-medium text-foreground truncate leading-snug mb-0.5 group-hover:text-primary transition-colors" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
          {ar ? person.nameAr : person.name}
        </h3>
        <p className="text-[11.5px] text-muted-foreground truncate flex items-center gap-1">
          <Building2 size={10} strokeWidth={1.75} className="shrink-0" />
          {ar ? person.companyAr : person.company}
        </p>
        <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{ar ? person.roleAr : person.role}</p>
      </div>

      {/* Contact */}
      <div className="flex flex-col gap-1 min-w-0">
        {person.email && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Mail size={10} strokeWidth={1.75} className="shrink-0 text-muted-foreground/60" />
            <span className="truncate">{person.email}</span>
          </span>
        )}
        {person.phone && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Phone size={10} strokeWidth={1.75} className="shrink-0 text-muted-foreground/60" />
            <span className="font-mono tracking-tight">{person.phone}</span>
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
          <span className="text-[11px] text-muted-foreground">{ar ? statusMeta.ar : statusMeta.en}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground/40 group-hover:text-primary/60 transition-colors">
          <span className="text-[10.5px]">{ar ? person.lastContactAr : person.lastContactEn}</span>
          <ChevRight size={11} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────

function PeopleTable({ people, lang, onRowClick }: { people: Person[]; lang: "en" | "ar"; onRowClick: (id: string) => void }) {
  const ar = lang === "ar";
  const COLS = [
    { en: "Name",   ar: "الاسم",   w: "w-[27%]" },
    { en: "Type",   ar: "النوع",   w: "w-[11%]" },
    { en: "Status", ar: "الحالة",  w: "w-[10%]" },
    { en: "Role",   ar: "المنصب",  w: "w-[18%]" },
    { en: "Email",  ar: "البريد",  w: "w-[20%]" },
    { en: "Phone",  ar: "الهاتف",  w: "w-[14%]" },
  ];

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <table className="w-full" role="grid">
        <thead>
          <tr className="border-b border-border/50 bg-muted/20">
            {COLS.map((c) => (
              <th key={c.en} className={`${c.w} px-4 py-3 text-start text-[10.5px] font-semibold text-muted-foreground tracking-[0.07em] uppercase`}>
                {ar ? c.ar : c.en}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-background">
          {people.map((person, i) => {
            const typeMeta   = TYPE_META[person.type];
            const statusMeta = STATUS_META[person.status];
            const isLast = i === people.length - 1;
            return (
              <tr
                key={person.id}
                onClick={() => onRowClick(person.id)}
                className={`group cursor-pointer hover:bg-muted/20 transition-colors duration-100 ${!isLast ? "border-b border-border/30" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[9.5px] font-semibold select-none ${person.avatarColor}`}>
                      {initials(person.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors" style={{ letterSpacing: "-0.01em" }}>
                        {ar ? person.nameAr : person.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{ar ? person.companyAr : person.company}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${typeMeta.pill}`}>
                    {ar ? typeMeta.ar : typeMeta.en}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                    <span className="text-[12px] text-foreground/80">{ar ? statusMeta.ar : statusMeta.en}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-muted-foreground truncate block max-w-[200px]">
                    {ar ? person.roleAr : person.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {person.email
                    ? <span className="text-[12px] text-muted-foreground truncate block max-w-[200px]">{person.email}</span>
                    : <span className="text-[12px] text-muted-foreground/40">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-[12px] text-muted-foreground font-mono tracking-tight">{person.phone || "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────

function Pagination({ page, total, pageSize, onPage, lang }: { page: number; total: number; pageSize: number; onPage: (p: number) => void; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-[12px] text-muted-foreground">
        {ar ? `${from}–${to} من ${total}` : `${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-[12px] font-medium border transition-all duration-150 ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {p}
          </button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === Math.ceil(total / pageSize)}
          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// ─── Filter definitions ───────────────────────────────────

const TYPE_FILTER_OPTIONS: { value: PersonType | "all"; en: string; ar: string }[] = [
  { value: "all",        en: "All",         ar: "الكل" },
  { value: "customer",   en: "Customers",   ar: "العملاء" },
  { value: "employee",   en: "Employees",   ar: "الموظفون" },
  { value: "supplier",   en: "Suppliers",   ar: "الموردون" },
  { value: "contractor", en: "Contractors", ar: "المتعاقدون" },
  { value: "partner",    en: "Partners",    ar: "الشركاء" },
];

const STATUS_FILTER_OPTIONS: { value: Status | "all"; en: string; ar: string }[] = [
  { value: "all",      en: "All Status", ar: "كل الحالات" },
  { value: "active",   en: "Active",     ar: "نشط" },
  { value: "lead",     en: "Lead",       ar: "محتمل" },
  { value: "inactive", en: "Inactive",   ar: "غير نشط" },
];

// ─── Main page ────────────────────────────────────────────

function PeopleDemo() {
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const [people, setPeople] = useState<Person[]>(PEOPLE);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PersonType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [view, setView] = useState<ViewMode>("card");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return people.filter((p) => {
      const matchSearch = !q
        || p.name.toLowerCase().includes(q) || p.nameAr.includes(q)
        || p.company.toLowerCase().includes(q) || p.companyAr.includes(q)
        || p.role.toLowerCase().includes(q)
        || (p.email && p.email.toLowerCase().includes(q));
      const matchType   = typeFilter   === "all" || p.type   === typeFilter;
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [people, search, typeFilter, statusFilter]);

  const pageSize = view === "card" ? CARD_PAGE : TABLE_PAGE;
  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, view]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const hasActiveFilters = search !== "" || typeFilter !== "all" || statusFilter !== "all";

  function clearFilters() { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }
  function handleAdd(p: Person) { setPeople((prev) => [p, ...prev]); }
  function goToProfile(id: string) { navigate(`/people/${id}`); }

  return (
    <>
      <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">
              {ar ? "المؤسسة" : "Organization"}
            </p>
            <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "الأشخاص" : "People"}
            </h1>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium shadow-sm hover:opacity-90 active:opacity-80 transition-opacity shrink-0 mt-1"
          >
            <Plus size={14} strokeWidth={2.5} />
            {ar ? "إضافة شخص" : "Add Person"}
          </button>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 max-w-[300px]">
            <Search size={13} strokeWidth={1.75} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث…" : "Search people…"}
              className="w-full h-9 ps-8 pe-4 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" aria-hidden="true" />

          {/* Type pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {TYPE_FILTER_OPTIONS.map((f) => (
              <button key={f.value} onClick={() => setTypeFilter(f.value as PersonType | "all")}
                className={`h-7 px-3 rounded-lg text-[12px] font-medium border transition-all duration-150 ${typeFilter === f.value ? "bg-primary/8 text-primary border-primary/25" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
                {ar ? f.ar : f.en}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-border/60 hidden sm:block" aria-hidden="true" />

          {/* Status */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "all")}
            className="h-7 ps-2.5 pe-6 rounded-lg border border-border bg-card text-[12px] text-muted-foreground focus:outline-none focus:border-primary/40 appearance-none cursor-pointer">
            {STATUS_FILTER_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{ar ? f.ar : f.en}</option>
            ))}
          </select>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-all">
              <X size={11} strokeWidth={2} />
              {ar ? "مسح" : "Clear"}
            </button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-xl overflow-hidden bg-card">
            <button onClick={() => setView("card")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "card" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={ar ? "عرض البطاقات" : "Card view"}>
              <LayoutGrid size={14} strokeWidth={1.75} />
            </button>
            <div className="w-px h-4 bg-border/60" aria-hidden="true" />
            <button onClick={() => setView("table")}
              className={`w-8 h-8 flex items-center justify-center transition-colors ${view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={ar ? "عرض القائمة" : "Table view"}>
              <List size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* ── Count ── */}
        <p className="text-[12px] text-muted-foreground mb-4">
          {ar ? `${filtered.length} شخص` : `${filtered.length} ${filtered.length === 1 ? "person" : "people"}`}
        </p>

        {/* ── Empty ── */}
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
        ) : view === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((p) => (
              <PersonCard key={p.id} person={p} lang={lang} onClick={() => goToProfile(p.id)} />
            ))}
          </div>
        ) : (
          <PeopleTable people={paginated} lang={lang} onRowClick={goToProfile} />
        )}

        {/* ── Pagination ── */}
        {filtered.length > pageSize && (
          <Pagination page={page} total={filtered.length} pageSize={pageSize} onPage={setPage} lang={lang} />
        )}

      </div>

      <AddPersonModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} lang={lang} />
    </>
  );
}

export default function People() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  if (!isDemoMode) return <PeopleLive workspaceId={workspace?.id ?? ""} lang={lang} />;
  return <PeopleDemo />;
}
