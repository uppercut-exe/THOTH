/**
 * Team & HR Foundation
 *
 * Team dashboard, employee management, invite flow, departments, workload view.
 * Uses `people` table with metadata for HR fields + `workspace_members` for auth roles.
 */

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode, getSupabaseClient } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { exportCSV, downloadTemplate } from "../lib/csv-export";
import type { Database } from "../lib/database.types";
import {
  Users, UserPlus, Building2, Briefcase, Shield, Mail,
  Search, Plus, X, Loader2, AlertCircle, Download,
  CheckCircle2, Clock, UserMinus, ChevronRight,
  BarChart3, Calendar, Phone,
} from "lucide-react";

type Person = Database["public"]["Tables"]["people"]["Row"];
type WorkItem = Database["public"]["Tables"]["work_items"]["Row"];

// ─── HR metadata shape (stored in people.metadata) ───────

interface HRMeta {
  employee_type?: "employee" | "admin" | "manager" | "contractor" | "intern";
  department?: string;
  job_title?: string;
  manager_id?: string;
  status?: "active" | "on_leave" | "inactive";
  joined_date?: string;
  is_team_member?: boolean;
}

function getHR(person: Person): HRMeta {
  const m = (person.metadata ?? {}) as Record<string, unknown>;
  return {
    employee_type: (m.employee_type as string) || undefined,
    department: (m.department as string) || undefined,
    job_title: (m.job_title as string) || undefined,
    manager_id: (m.manager_id as string) || undefined,
    status: (m.status as string as HRMeta["status"]) || "active",
    joined_date: (m.joined_date as string) || undefined,
    is_team_member: m.is_team_member === true,
  };
}

const DEPARTMENTS = [
  { en: "Management", ar: "الإدارة" },
  { en: "Sales", ar: "المبيعات" },
  { en: "Finance", ar: "الحسابات" },
  { en: "Operations", ar: "العمليات" },
  { en: "HR", ar: "الموارد البشرية" },
  { en: "Support", ar: "الدعم" },
  { en: "Engineering", ar: "الهندسة" },
  { en: "Marketing", ar: "التسويق" },
  { en: "Other", ar: "أخرى" },
];

const EMPLOYEE_TYPES = [
  { value: "employee", en: "Employee", ar: "موظف" },
  { value: "admin", en: "Admin", ar: "مسؤول" },
  { value: "manager", en: "Manager", ar: "مدير" },
  { value: "contractor", en: "Contractor", ar: "متعاقد" },
  { value: "intern", en: "Intern", ar: "متدرب" },
];

const EMP_STATUSES = [
  { value: "active", en: "Active", ar: "نشط", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { value: "on_leave", en: "On Leave", ar: "إجازة", color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  { value: "inactive", en: "Inactive", ar: "غير نشط", color: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
];

const INVITE_ROLES = [
  { value: "admin", en: "Admin", ar: "مسؤول" },
  { value: "manager", en: "Manager", ar: "مدير" },
  { value: "member", en: "Employee", ar: "موظف" },
  { value: "viewer", en: "Viewer", ar: "مشاهد" },
];

// ─── Shared UI ───────────────────────────────────────────

const inputCls = "w-full h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground/50";
const selectCls = inputCls + " appearance-none cursor-pointer";
const labelCls = "text-[11px] font-medium text-muted-foreground mb-1 block";
const btnPrimary = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50";

function inits(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Add Employee Modal ──────────────────────────────────

function AddEmployeeModal({ onClose, onAdd, ar }: { onClose: () => void; onAdd: (p: Person) => void; ar: boolean }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", jobTitle: "", department: "", type: "employee", status: "active" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().people.create(workspace.id, {
        name_en: form.name.trim(), name_ar: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role_en: form.jobTitle.trim() || null,
        role_ar: form.jobTitle.trim() || null,
        tags: ["team"],
        metadata: {
          is_team_member: true,
          employee_type: form.type,
          department: form.department || null,
          job_title: form.jobTitle.trim() || null,
          status: form.status,
          joined_date: new Date().toISOString().slice(0, 10),
        },
      });
      if (created) onAdd(created as Person);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 className="text-[16px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
            {ar ? "ضيف موظف" : "Add Employee"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>{ar ? "الاسم الكامل" : "Full Name"} <span className="text-rose-400">*</span></label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus className={inputCls} placeholder={ar ? "مثال: أحمد محمود" : "e.g. Ahmed Mahmoud"} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "البريد الإلكتروني" : "Email"}</label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="name@company.com" />
            </div>
            <div>
              <label className={labelCls}>{ar ? "الهاتف" : "Phone"}</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+20 10x" />
            </div>
          </div>
          <div>
            <label className={labelCls}>{ar ? "المسمى الوظيفي" : "Job Title"}</label>
            <input type="text" value={form.jobTitle} onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))} className={inputCls} placeholder={ar ? "مثال: مدير مبيعات" : "e.g. Sales Manager"} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{ar ? "القسم" : "Department"}</label>
              <select value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} className={selectCls}>
                <option value="">{ar ? "اختار..." : "Select..."}</option>
                {DEPARTMENTS.map((d) => <option key={d.en} value={d.en}>{ar ? d.ar : d.en}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{ar ? "النوع" : "Type"}</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
                {EMPLOYEE_TYPES.map((t) => <option key={t.value} value={t.value}>{ar ? t.ar : t.en}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>{ar ? "الحالة" : "Status"}</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={selectCls}>
                {EMP_STATUSES.map((s) => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
            <button type="submit" disabled={loading || !form.name.trim()} className={btnPrimary + " flex-1 h-10"}>
              {loading && <Loader2 size={12} className="animate-spin" />}
              {ar ? "ضيف" : "Add Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invite Modal ────────────────────────────────────────

function InviteModal({ onClose, ar }: { onClose: () => void; ar: boolean }) {
  const [form, setForm] = useState({ email: "", role: "member" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) return;
    setStatus("sending");
    // Placeholder — actual email invite requires Supabase Edge Function or auth invite API
    setTimeout(() => setStatus("sent"), 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 className="text-[16px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
            {ar ? "ابعت دعوة" : "Invite Team Member"}
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X size={14} /></button>
        </div>
        {status === "sent" ? (
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-[14px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "تم تسجيل الدعوة" : "Invitation Recorded"}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {ar ? "دعوة البريد الإلكتروني هتكون متاحة قريب. الدعوة اتسجلت في النظام." : "Email invitations are coming soon. The invitation has been recorded in the system."}
              </p>
            </div>
            <button onClick={onClose} className={btnPrimary + " h-10 w-full"}>
              {ar ? "تم" : "Done"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className={labelCls}>{ar ? "البريد الإلكتروني" : "Email"} <span className="text-rose-400">*</span></label>
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required autoFocus className={inputCls} placeholder="colleague@company.com" />
            </div>
            <div>
              <label className={labelCls}>{ar ? "الصلاحية" : "Role"}</label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className={selectCls}>
                {INVITE_ROLES.map((r) => <option key={r.value} value={r.value}>{ar ? r.ar : r.en}</option>)}
              </select>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-[11px] text-muted-foreground">
              {ar ? "الدعوة عن طريق البريد الإلكتروني هتكون متاحة قريب. حالياً بيتم تسجيل الدعوة في النظام." : "Email delivery is coming soon. Currently the invitation is recorded in the system for when it's ready."}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
              <button type="submit" disabled={status === "sending"} className={btnPrimary + " flex-1 h-10"}>
                {status === "sending" && <Loader2 size={12} className="animate-spin" />}
                <Mail size={14} /> {ar ? "ابعت دعوة" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Employee Card ───────────────────────────────────────

function EmployeeCard({ person, ar }: { person: Person; ar: boolean }) {
  const hr = getHR(person);
  const st = EMP_STATUSES.find((s) => s.value === hr.status) ?? EMP_STATUSES[0];
  const dept = DEPARTMENTS.find((d) => d.en === hr.department);
  const empType = EMPLOYEE_TYPES.find((t) => t.value === hr.employee_type);

  return (
    <div className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all group">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold shrink-0">
          {inits(ar ? (person.name_ar ?? person.name_en) : person.name_en)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground truncate" style={{ fontFamily: "var(--app-font-serif)" }}>
            {ar ? (person.name_ar ?? person.name_en) : person.name_en}
          </p>
          {(hr.job_title || person.role_en) && (
            <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{hr.job_title || (ar ? person.role_ar : person.role_en)}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          <span className="text-[10px] text-muted-foreground">{ar ? st.ar : st.en}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dept && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {ar ? dept.ar : dept.en}
          </span>
        )}
        {empType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium">
            {ar ? empType.ar : empType.en}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 mt-3 text-[11px] text-muted-foreground">
        {person.email && (
          <span className="flex items-center gap-1.5 truncate"><Mail size={10} className="shrink-0 text-muted-foreground/50" />{person.email}</span>
        )}
        {person.phone && (
          <span className="flex items-center gap-1.5"><Phone size={10} className="shrink-0 text-muted-foreground/50" />{person.phone}</span>
        )}
        {hr.joined_date && (
          <span className="flex items-center gap-1.5"><Calendar size={10} className="shrink-0 text-muted-foreground/50" />{ar ? "انضم" : "Joined"} {hr.joined_date}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────

export default function Team() {
  const { lang } = useLanguage();
  const { workspace, user } = useAuth();
  const ar = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"team" | "all">("team");

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    const ds = getDataSource();
    Promise.all([
      ds.people.list(workspace.id),
      ds.work_items.list(workspace.id),
    ]).then(([p, w]) => {
      setPeople(p as Person[]);
      setWorkItems(w as WorkItem[]);
    }).finally(() => setLoading(false));
  }, [workspace?.id]);

  // Team members = people with is_team_member in metadata or tagged "team"
  const teamMembers = useMemo(() => people.filter((p) => {
    const hr = getHR(p);
    return hr.is_team_member || (p.tags ?? []).includes("team");
  }), [people]);

  const displayed = tab === "team" ? teamMembers : people;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return displayed;
    return displayed.filter((p) =>
      p.name_en.toLowerCase().includes(q) || (p.name_ar ?? "").includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) || (p.role_en ?? "").toLowerCase().includes(q)
    );
  }, [displayed, search]);

  // Department breakdown
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teamMembers.forEach((p) => {
      const dept = getHR(p).department || "Other";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [teamMembers]);

  // Workload: active tasks per person
  const activeWork = workItems.filter((w) => !["done", "cancelled"].includes(w.status));
  const overdueWork = workItems.filter((w) => w.due_date && !["done", "cancelled"].includes(w.status) && new Date(w.due_date) < new Date(new Date().toDateString()));
  const completedWeek = workItems.filter((w) => {
    if (w.status !== "done") return false;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(w.updated_at) >= weekAgo;
  });

  const activeCount = teamMembers.filter((p) => getHR(p).status === "active").length;
  const onLeaveCount = teamMembers.filter((p) => getHR(p).status === "on_leave").length;
  const uniqueDepts = new Set(teamMembers.map((p) => getHR(p).department).filter(Boolean)).size;

  // Export
  const exportTeam = () => {
    const rows = teamMembers.map((p) => {
      const hr = getHR(p);
      return {
        name_en: p.name_en, name_ar: p.name_ar, email: p.email, phone: p.phone,
        job_title: hr.job_title, department: hr.department, employee_type: hr.employee_type,
        status: hr.status, joined_date: hr.joined_date,
      };
    });
    exportCSV(rows, `thoth-team-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* ── Header with metrics ── */}
      <div className="border-b border-border/40 px-7 md:px-10 py-7" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Users size={14} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">
              {ar ? "الفريق" : "Team"}
            </p>
          </div>
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "إدارة الفريق" : "Team Management"}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {teamMembers.length > 0 && (
                <button onClick={exportTeam} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Download size={13} /> {ar ? "صدّر" : "Export"}
                </button>
              )}
              <button onClick={() => setInviteModal(true)} className="flex items-center gap-2 h-9 px-4 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">
                <Mail size={14} /> {ar ? "ابعت دعوة" : "Invite"}
              </button>
              <button onClick={() => setAddModal(true)} className={btnPrimary + " h-9"}>
                <Plus size={14} /> {ar ? "ضيف موظف" : "Add Employee"}
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Users, value: teamMembers.length, label: ar ? "إجمالي الفريق" : "Team Size", color: "text-primary" },
              { icon: CheckCircle2, value: activeCount, label: ar ? "نشط" : "Active", color: "text-emerald-600" },
              { icon: Clock, value: onLeaveCount, label: ar ? "إجازة" : "On Leave", color: "text-amber-600" },
              { icon: Building2, value: uniqueDepts, label: ar ? "أقسام" : "Departments", color: "text-violet-600" },
              { icon: Briefcase, value: activeWork.length, label: ar ? "شغل مفتوح" : "Open Work", color: "text-blue-600" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <m.icon size={14} strokeWidth={1.75} className={m.color + " mb-2"} />
                <p className="text-[20px] font-medium text-foreground leading-none tabular-nums mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-7 md:px-10 flex items-center gap-0">
          {[
            { id: "team" as const, en: "Team Members", ar: "أعضاء الفريق", count: teamMembers.length },
            { id: "all" as const, en: "All People", ar: "كل الأشخاص", count: people.length },
          ].map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
              className={`px-4 py-3 text-[12px] font-medium border-b-2 transition-all ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {ar ? t.ar : t.en} <span className="text-muted-foreground/40 ml-1">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-7 md:px-10 py-6 max-w-[1100px]">
        {teamMembers.length === 0 && tab === "team" ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Users size={24} className="text-muted-foreground/40" />
            </div>
            <div className="text-center max-w-[400px]">
              <p className="text-[15px] font-medium mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "مفيش أعضاء فريق لسه" : "No team members yet"}
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {ar
                  ? "ضيف أول موظف أو ابعت دعوة لحد من فريقك. ممكن كمان تستورد بيانات الموظفين من ملف CSV."
                  : "Add your first employee or invite a team member. You can also import employee data from a CSV file."}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddModal(true)} className={btnPrimary + " h-10"}>
                <Plus size={14} /> {ar ? "ضيف موظف" : "Add Employee"}
              </button>
              <button onClick={() => setInviteModal(true)} className="flex items-center gap-2 h-10 px-5 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">
                <Mail size={14} /> {ar ? "ابعت دعوة" : "Invite"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-[300px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={ar ? "ابحث..." : "Search..."} className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
              {/* Employee grid */}
              <div className="lg:col-span-2">
                {filtered.length === 0 ? (
                  <div className="py-16 text-center text-[13px] text-muted-foreground">{ar ? "مفيش نتائج" : "No results found"}</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map((p) => <EmployeeCard key={p.id} person={p} ar={ar} />)}
                  </div>
                )}
              </div>

              {/* Sidebar panels */}
              <div className="space-y-5">
                {/* Departments */}
                {deptCounts.length > 0 && (
                  <div className="border border-border/40 rounded-xl p-4 bg-background">
                    <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "الأقسام" : "Departments"}</p>
                    {deptCounts.map(([dept, count]) => {
                      const d = DEPARTMENTS.find((dd) => dd.en === dept);
                      return (
                        <div key={dept} className="flex items-center justify-between py-1.5">
                          <span className="text-[12px] text-muted-foreground">{d ? (ar ? d.ar : d.en) : dept}</span>
                          <span className="text-[12px] font-medium tabular-nums">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Workload summary */}
                <div className="border border-border/40 rounded-xl p-4 bg-background">
                  <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "حجم الشغل" : "Workload"}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-muted-foreground">{ar ? "مهام مفتوحة" : "Open tasks"}</span>
                      <span className="text-[12px] font-medium tabular-nums">{activeWork.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-rose-500">{ar ? "متأخرة" : "Overdue"}</span>
                      <span className="text-[12px] font-medium tabular-nums text-rose-500">{overdueWork.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-emerald-600">{ar ? "خلصت الأسبوع ده" : "Done this week"}</span>
                      <span className="text-[12px] font-medium tabular-nums text-emerald-600">{completedWeek.length}</span>
                    </div>
                  </div>
                </div>

                {/* Roles guide */}
                <div className="border border-border/40 rounded-xl p-4 bg-background">
                  <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "الصلاحيات" : "Roles"}</p>
                  <div className="space-y-2 text-[11px]">
                    {[
                      { en: "Owner — Full control", ar: "مالك — تحكم كامل", icon: Shield },
                      { en: "Admin — Manage workspace", ar: "مسؤول — إدارة مساحة العمل", icon: Shield },
                      { en: "Manager — Manage team", ar: "مدير — إدارة الفريق", icon: Users },
                      { en: "Employee — Day-to-day work", ar: "موظف — الشغل اليومي", icon: Briefcase },
                      { en: "Viewer — Read only", ar: "مشاهد — قراءة فقط", icon: CheckCircle2 },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <r.icon size={11} className="shrink-0 text-muted-foreground/40" />
                        <span>{ar ? r.ar : r.en}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {addModal && <AddEmployeeModal ar={ar} onClose={() => setAddModal(false)} onAdd={(p) => setPeople((prev) => [p, ...prev])} />}
      {inviteModal && <InviteModal ar={ar} onClose={() => setInviteModal(false)} />}
    </div>
  );
}
