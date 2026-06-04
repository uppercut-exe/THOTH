/**
 * Production Mode Live Views
 *
 * Supabase-connected components shown when THOTH is running in production mode
 * (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured).
 *
 * Demo mode uses existing static data views. These views handle:
 *   - Data fetching from Supabase (workspace-isolated)
 *   - Loading states
 *   - Empty states with Add prompts
 *   - Add modals that persist to Supabase
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { getDataSource } from "./data-source";
import { useAuth } from "../context/AuthContext";
import type { Database } from "./database.types";
import {
  Loader2, Plus, Search, X, AlertCircle, Download, Upload,
  Users, Building2, TrendingUp, FileText, Briefcase, Package,
  DollarSign, CreditCard, Receipt, Wallet, Landmark,
} from "lucide-react";
import { exportCSV } from "./csv-export";

type Tables = Database["public"]["Tables"];
type LivePerson    = Tables["people"]["Row"];
type LiveOrg       = Tables["organizations"]["Row"];
type LiveDeal      = Tables["deals"]["Row"];
type LiveInvoice   = Tables["invoices"]["Row"];
type LiveWorkItem  = Tables["work_items"]["Row"];
type LiveResource  = Tables["resources"]["Row"];
type LiveExpense   = Tables["expenses"]["Row"];
type LivePayment   = Tables["payments"]["Row"];

// ─── Shared helpers ────────────────────────────────────────

function inits(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const inputCls =
  "w-full h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground/50";
const labelCls = "text-[11px] font-medium text-muted-foreground mb-1 block";
const btnPrimary =
  "flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50";
const btnSecondary =
  "flex items-center justify-center gap-2 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[440px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
          <h2 className="text-[16px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
    </div>
  );
}

function ErrorState({ msg }: { msg: string }) {
  return <div className="flex items-center justify-center py-24 text-rose-500 text-[13px]">{msg}</div>;
}

function NoResults({ ar }: { ar: boolean }) {
  return <div className="flex items-center justify-center py-24 text-muted-foreground text-[13px]">{ar ? "مفيش نتائج" : "No results found"}</div>;
}

function EmptyState({ icon: Icon, title, subtitle, addLabel, onAdd }: {
  icon: React.ElementType; title: string; subtitle: string; addLabel: string; onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
        <Icon size={20} className="text-muted-foreground/40" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-medium">{title}</p>
        <p className="text-[12px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <button onClick={onAdd} className={btnPrimary}>
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

function PageHeader({ breadcrumb, title, count, countLabel, addLabel, onAdd, ar, onExport }: {
  breadcrumb: string; title: string; count: number; countLabel: string;
  addLabel: string; onAdd: () => void; ar: boolean; onExport?: () => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-8 ${ar ? "flex-row-reverse" : ""}`}>
      <div>
        <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{breadcrumb}</p>
        <h1 className="text-[26px] font-medium" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>{title}</h1>
        <p className="text-[13px] text-muted-foreground mt-1">{count} {countLabel}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onExport && count > 0 && (
          <button onClick={onExport} title={ar ? "صدّر CSV" : "Export CSV"}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Download size={13} strokeWidth={1.75} />
            {ar ? "صدّر" : "Export"}
          </button>
        )}
        <button onClick={onAdd} className={btnPrimary + " h-9"}>
          <Plus size={14} /> {addLabel}
        </button>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder, ar }: { value: string; onChange: (v: string) => void; placeholder: string; ar: boolean }) {
  return (
    <div className={`relative mb-6 ${ar ? "direction-rtl" : ""}`}>
      <Search size={14} className={`absolute ${ar ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 text-muted-foreground/50`} />
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-10 ${ar ? "pr-9 pl-4" : "pl-9 pr-4"} rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30`}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 1. PEOPLE
// ═══════════════════════════════════════════════════════════

function AddPersonModal({ onClose, onAdd, ar }: { onClose: () => void; onAdd: (p: LivePerson) => void; ar: boolean }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ name: "", role: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().people.create(workspace.id, {
        name_en: form.name.trim(), name_ar: form.name.trim(),
        role_en: form.role.trim() || null, role_ar: form.role.trim() || null,
        email: form.email.trim() || null, phone: form.phone.trim() || null,
        tags: [], metadata: {},
      });
      if (created) onAdd(created as LivePerson);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "ضيف شخص" : "Add Person"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "الاسم الكامل" : "Full Name"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
            className={inputCls} placeholder={ar ? "مثال: سارة العمري" : "e.g. Sarah Al-Omari"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "المسمى الوظيفي" : "Role / Title"}</label>
          <input type="text" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            className={inputCls} placeholder={ar ? "مثال: مدير مشاريع" : "e.g. Project Manager"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "البريد الإلكتروني" : "Email"}</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputCls} placeholder="name@co.com" />
          </div>
          <div>
            <label className={labelCls}>{ar ? "الهاتف" : "Phone"}</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputCls} placeholder="+966 5x" />
          </div>
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.name.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "إضافة" : "Add Person"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function PeopleLive({ workspaceId, lang }: { workspaceId: string; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const [people, setPeople] = useState<LivePerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    getDataSource().people.list(workspaceId)
      .then((d) => { setPeople(d as LivePerson[]); setLoading(false); })
      .catch(() => { setError(ar ? "فشل التحميل" : "Failed to load"); setLoading(false); });
  }, [workspaceId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? people : people.filter((p) =>
      p.name_en.toLowerCase().includes(q) || (p.name_ar ?? "").includes(q) || (p.email ?? "").toLowerCase().includes(q)
    );
  }, [people, search]);

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">
      <PageHeader
        breadcrumb={ar ? "الشركة" : "Organization"}
        title={ar ? "الأشخاص" : "People"}
        count={people.length} countLabel={ar ? "شخص" : "contacts"}
        addLabel={ar ? "ضيف شخص" : "Add Person"}
        onAdd={() => setModal(true)} ar={ar}
        onExport={() => exportCSV(people, `thoth-people-${new Date().toISOString().slice(0,10)}.csv`)}
      />
      <SearchBar value={search} onChange={setSearch} placeholder={ar ? "ابحث في الأشخاص..." : "Search people..."} ar={ar} />

      {loading ? <Loading /> : error ? <ErrorState msg={error} /> : filtered.length === 0 && search ? <NoResults ar={ar} /> :
        filtered.length === 0 ? (
          <EmptyState icon={Users}
            title={ar ? "مفيش أشخاص لسه" : "No people yet"}
            subtitle={ar ? "ضيف أول شخص أو استورد ملف CSV." : "Add your first contact or import a CSV file."}
            addLabel={ar ? "ضيف شخص" : "Add Person"}
            onAdd={() => setModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => navigate(`/people/${p.id}`)}
                className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all cursor-pointer group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
                    {inits(ar ? (p.name_ar ?? p.name_en) : p.name_en)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate group-hover:text-primary transition-colors" style={{ fontFamily: "var(--app-font-serif)" }}>
                      {ar ? (p.name_ar ?? p.name_en) : p.name_en}
                    </p>
                    {p.role_en && <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{ar ? (p.role_ar ?? p.role_en) : p.role_en}</p>}
                    {p.email && <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{p.email}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
      {modal && <AddPersonModal ar={ar} onClose={() => setModal(false)} onAdd={(p) => setPeople((prev) => [p, ...prev])} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 2. ORGANIZATIONS
// ═══════════════════════════════════════════════════════════

function AddOrgModal({ onClose, onAdd, ar }: { onClose: () => void; onAdd: (o: LiveOrg) => void; ar: boolean }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ name: "", sector: "", website: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().organizations.create(workspace.id, {
        name_en: form.name.trim(), name_ar: form.name.trim(),
        sector: form.sector.trim() || null, website: form.website.trim() || null,
        health_score: 70, tags: [], metadata: {},
      });
      if (created) onAdd(created as LiveOrg);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "ضيف شركة" : "Add Organization"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "اسم الشركة" : "Organization Name"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
            className={inputCls} placeholder={ar ? "مثال: شركة الخليج التجارية" : "e.g. Gulf Trading LLC"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "القطاع" : "Sector / Industry"}</label>
          <input type="text" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
            className={inputCls} placeholder={ar ? "مثال: التكنولوجيا" : "e.g. Technology"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "الموقع الإلكتروني" : "Website"}</label>
          <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className={inputCls} placeholder="https://company.com" />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.name.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "إضافة" : "Add Organization"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function OrgsLive({ workspaceId, lang }: { workspaceId: string; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const [orgs, setOrgs] = useState<LiveOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    getDataSource().organizations.list(workspaceId)
      .then((d) => { setOrgs(d as LiveOrg[]); setLoading(false); })
      .catch(() => { setError(ar ? "فشل التحميل" : "Failed to load"); setLoading(false); });
  }, [workspaceId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? orgs : orgs.filter((o) =>
      o.name_en.toLowerCase().includes(q) || (o.name_ar ?? "").includes(q) || (o.sector ?? "").toLowerCase().includes(q)
    );
  }, [orgs, search]);

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">
      <PageHeader
        breadcrumb={ar ? "النظام" : "System"}
        title={ar ? "الشركات" : "Organizations"}
        count={orgs.length} countLabel={ar ? "شركة" : "organizations"}
        addLabel={ar ? "ضيف شركة" : "Add Organization"}
        onAdd={() => setModal(true)} ar={ar}
        onExport={() => exportCSV(orgs, `thoth-organizations-${new Date().toISOString().slice(0,10)}.csv`)}
      />
      <SearchBar value={search} onChange={setSearch} placeholder={ar ? "ابحث في الشركات..." : "Search organizations..."} ar={ar} />

      {loading ? <Loading /> : error ? <ErrorState msg={error} /> : filtered.length === 0 && search ? <NoResults ar={ar} /> :
        filtered.length === 0 ? (
          <EmptyState icon={Building2}
            title={ar ? "مفيش شركات لسه" : "No organizations yet"}
            subtitle={ar ? "ضيف أول شركة أو استورد ملف CSV." : "Add your first company or import a CSV file."}
            addLabel={ar ? "ضيف شركة" : "Add Organization"}
            onAdd={() => setModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((o) => (
              <div key={o.id} onClick={() => navigate(`/organizations/${o.id}`)}
                className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all cursor-pointer group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {inits(ar ? (o.name_ar ?? o.name_en) : o.name_en)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate group-hover:text-primary transition-colors" style={{ fontFamily: "var(--app-font-serif)" }}>
                      {ar ? (o.name_ar ?? o.name_en) : o.name_en}
                    </p>
                    {o.sector && <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{o.sector}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${o.health_score >= 70 ? "bg-emerald-100 text-emerald-700" : o.health_score >= 40 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                    {ar ? "الصحة" : "Health"} {o.health_score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      }
      {modal && <AddOrgModal ar={ar} onClose={() => setModal(false)} onAdd={(o) => setOrgs((prev) => [o, ...prev])} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 3. SALES (DEALS)
// ═══════════════════════════════════════════════════════════

const DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"] as const;

function AddDealModal({ onClose, onAdd, ar }: { onClose: () => void; onAdd: (d: LiveDeal) => void; ar: boolean }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ title: "", value: "", stage: "lead", org: "", contact: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.title.trim()) return;
    setLoading(true); setError(null);
    try {
      const currency = (workspace.settings?.currency as string) ?? "SAR";
      const created = await getDataSource().deals.create(workspace.id, {
        title_en: form.title.trim(), title_ar: form.title.trim(),
        value: parseFloat(form.value) || 0, currency,
        stage: form.stage, probability: form.stage === "won" ? 100 : form.stage === "lost" ? 0 : 25,
        org_name_en: form.org.trim() || null, org_name_ar: form.org.trim() || null,
        contact_name_en: form.contact.trim() || null, contact_name_ar: form.contact.trim() || null,
        tags: [], metadata: {},
      });
      if (created) onAdd(created as LiveDeal);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "سجّل صفقة" : "Add Deal"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "عنوان الصفقة" : "Deal Title"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required
            className={inputCls} placeholder={ar ? "مثال: عقد توريد أجهزة" : "e.g. Hardware Supply Contract"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "القيمة" : "Value"}</label>
            <input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} min="0"
              className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>{ar ? "المرحلة" : "Stage"}</label>
            <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
              className={inputCls + " appearance-none cursor-pointer"}>
              {DEAL_STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "اسم الشركة" : "Organization"}</label>
          <input type="text" value={form.org} onChange={(e) => setForm((f) => ({ ...f, org: e.target.value }))}
            className={inputCls} placeholder={ar ? "اختياري" : "Optional"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "جهة الاتصال" : "Contact Person"}</label>
          <input type="text" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
            className={inputCls} placeholder={ar ? "اختياري" : "Optional"} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.title.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "إضافة" : "Add Deal"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function SalesLive({ workspaceId, lang }: { workspaceId: string; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [, navigate] = useLocation();
  const [deals, setDeals] = useState<LiveDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    getDataSource().deals.list(workspaceId)
      .then((d) => { setDeals(d as LiveDeal[]); setLoading(false); })
      .catch(() => { setError(ar ? "فشل التحميل" : "Failed to load"); setLoading(false); });
  }, [workspaceId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? deals : deals.filter((d) =>
      d.title_en.toLowerCase().includes(q) || (d.title_ar ?? "").includes(q) ||
      (d.org_name_en ?? "").toLowerCase().includes(q) || (d.contact_name_en ?? "").toLowerCase().includes(q)
    );
  }, [deals, search]);

  const stagePill: Record<string, string> = {
    lead: "bg-slate-100 text-slate-600", qualified: "bg-blue-100 text-blue-600",
    proposal: "bg-violet-100 text-violet-600", negotiation: "bg-amber-100 text-amber-700",
    won: "bg-emerald-100 text-emerald-700", lost: "bg-rose-100 text-rose-600",
  };

  const fmtVal = (v: number, cur: string) =>
    new Intl.NumberFormat(ar ? "ar-SA" : "en-SA", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">
      <PageHeader
        breadcrumb={ar ? "المبيعات" : "Sales"}
        title={ar ? "الصفقات" : "Deals"}
        count={deals.length} countLabel={ar ? "صفقة" : "deals"}
        addLabel={ar ? "سجّل صفقة" : "Add Deal"}
        onAdd={() => setModal(true)} ar={ar}
        onExport={() => exportCSV(deals, `thoth-deals-${new Date().toISOString().slice(0,10)}.csv`)}
      />
      <SearchBar value={search} onChange={setSearch} placeholder={ar ? "ابحث في الصفقات..." : "Search deals..."} ar={ar} />

      {loading ? <Loading /> : error ? <ErrorState msg={error} /> : filtered.length === 0 && search ? <NoResults ar={ar} /> :
        filtered.length === 0 ? (
          <EmptyState icon={TrendingUp}
            title={ar ? "مفيش صفقات لسه" : "No deals yet"}
            subtitle={ar ? "سجّل أول فرصة مبيعات أو استورد بياناتك." : "Create your first opportunity or import your data."}
            addLabel={ar ? "سجّل صفقة" : "Add Deal"}
            onAdd={() => setModal(true)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((d) => (
              <div key={d.id} onClick={() => navigate(`/sales/${d.id}`)}
                className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all cursor-pointer group flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${stagePill[d.stage] ?? "bg-muted text-muted-foreground"}`}>
                      {d.stage}
                    </span>
                  </div>
                  <p className="text-[14px] font-medium truncate group-hover:text-primary transition-colors" style={{ fontFamily: "var(--app-font-serif)" }}>
                    {ar ? (d.title_ar ?? d.title_en) : d.title_en}
                  </p>
                  {(d.org_name_en || d.contact_name_en) && (
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      {d.org_name_en ?? ""}{d.org_name_en && d.contact_name_en ? " · " : ""}{d.contact_name_en ?? ""}
                    </p>
                  )}
                </div>
                {d.value > 0 && (
                  <p className="text-[14px] font-semibold tabular-nums text-foreground shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>
                    {fmtVal(d.value, d.currency)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      }
      {modal && <AddDealModal ar={ar} onClose={() => setModal(false)} onAdd={(d) => setDeals((prev) => [d, ...prev])} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 4. FINANCE (INVOICES)
// ═══════════════════════════════════════════════════════════

const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;

function AddInvoiceModal({ onClose, onAdd, ar, currency }: { onClose: () => void; onAdd: (i: LiveInvoice) => void; ar: boolean; currency: string }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ number: "", orgName: "", amount: "" , status: "draft" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.number.trim() || !form.orgName.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().invoices.create(workspace.id, {
        number: form.number.trim(),
        org_name_en: form.orgName.trim(), org_name_ar: form.orgName.trim(),
        amount: parseFloat(form.amount) || 0, currency,
        status: form.status, metadata: {},
      });
      if (created) onAdd(created as LiveInvoice);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "أنشئ فاتورة" : "Add Invoice"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "رقم الفاتورة" : "Invoice #"} <span className="text-rose-400">*</span></label>
            <input type="text" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} required
              className={inputCls} placeholder="INV-001" />
          </div>
          <div>
            <label className={labelCls}>{ar ? "الحالة" : "Status"}</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputCls + " appearance-none cursor-pointer"}>
              {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "اسم العميل / المنظمة" : "Client / Organization"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.orgName} onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))} required
            className={inputCls} placeholder={ar ? "مثال: شركة الخليج" : "e.g. Gulf Trading LLC"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? `المبلغ (${currency})` : `Amount (${currency})`}</label>
          <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} min="0"
            className={inputCls} placeholder="0" />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.number.trim() || !form.orgName.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "إضافة" : "Add Invoice"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddExpenseModal({ onClose, onAdd, ar, currency }: { onClose: () => void; onAdd: (e: LiveExpense) => void; ar: boolean; currency: string }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ description: "", amount: "", category: "", date: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.description.trim() || !form.amount) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().expenses.create(workspace.id, {
        description_en: form.description.trim(), description_ar: form.description.trim(),
        amount: parseFloat(form.amount) || 0, currency,
        category: form.category.trim() || null,
        date: form.date || null, metadata: {},
      });
      if (created) onAdd(created as LiveExpense);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "سجّل مصروف" : "Add Expense"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "الوصف" : "Description"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required
            className={inputCls} placeholder={ar ? "مثال: إيجار المكتب" : "e.g. Office Rent"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? `المبلغ (${currency})` : `Amount (${currency})`} <span className="text-rose-400">*</span></label>
            <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} min="0" required
              className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>{ar ? "التصنيف" : "Category"}</label>
            <input type="text" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={inputCls} placeholder={ar ? "مثال: إيجار" : "e.g. Rent"} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "التاريخ" : "Date"}</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.description.trim() || !form.amount} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "سجّل" : "Add Expense"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function FinanceLive({ workspaceId, lang }: { workspaceId: string; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const { workspace } = useAuth();
  const currency = (workspace?.settings?.currency as string) ?? "SAR";
  const [invoices, setInvoices] = useState<LiveInvoice[]>([]);
  const [expenses, setExpenses] = useState<LiveExpense[]>([]);
  const [payments, setPayments] = useState<LivePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invModal, setInvModal] = useState(false);
  const [expModal, setExpModal] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"invoices" | "expenses">("invoices");

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    const ds = getDataSource();
    Promise.all([
      ds.invoices.list(workspaceId),
      ds.expenses.list(workspaceId),
      ds.payments.list(workspaceId),
    ]).then(([inv, exp, pay]) => {
      setInvoices(inv as LiveInvoice[]);
      setExpenses(exp as LiveExpense[]);
      setPayments(pay as LivePayment[]);
    }).catch(() => { setError(ar ? "فشل التحميل" : "Failed to load"); })
    .finally(() => setLoading(false));
  }, [workspaceId]);

  const fmtVal = (v: number) =>
    new Intl.NumberFormat(ar ? "ar-SA" : "en-SA", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  // Metrics
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);
  const outstanding = invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netPosition = totalPaid - totalExpenses;

  const hasAnyData = invoices.length > 0 || expenses.length > 0 || payments.length > 0;

  const filteredInv = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? invoices : invoices.filter((i) =>
      i.number.toLowerCase().includes(q) || i.org_name_en.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const filteredExp = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? expenses : expenses.filter((e) =>
      e.description_en.toLowerCase().includes(q) || (e.category ?? "").toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const statusPill: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600", sent: "bg-blue-100 text-blue-600",
    paid: "bg-emerald-100 text-emerald-700", overdue: "bg-rose-100 text-rose-600",
    cancelled: "bg-muted text-muted-foreground",
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState msg={error} />;

  if (!hasAnyData) {
    return (
      <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">
        <div className="mb-8">
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{ar ? "الحسابات" : "Finance"}</p>
          <h1 className="text-[26px] font-medium" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "الحسابات والمالية" : "Finance"}
          </h1>
        </div>
        <EmptyState icon={Landmark}
          title={ar ? "مفيش بيانات مالية لسه" : "No financial data yet"}
          subtitle={ar ? "أنشئ أول فاتورة أو سجّل أول مصروف عشان تبدأ." : "Create your first invoice or record an expense to get started."}
          addLabel={ar ? "أنشئ فاتورة" : "Add Invoice"}
          onAdd={() => setInvModal(true)}
        />
        {invModal && <AddInvoiceModal ar={ar} currency={currency} onClose={() => setInvModal(false)} onAdd={(i) => setInvoices((prev) => [i, ...prev])} />}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* ── Finance Overview Header ── */}
      <div className="border-b border-border/40 px-7 md:px-10 py-7" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{ar ? "الحسابات" : "Finance"}</p>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "نظرة مالية" : "Financial Overview"}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: FileText, value: fmtVal(totalInvoiced), label: ar ? "إجمالي الفواتير" : "Total Invoiced", color: "text-primary" },
              { icon: DollarSign, value: fmtVal(totalPaid), label: ar ? "المحصّل" : "Collected", color: "text-emerald-600" },
              { icon: CreditCard, value: fmtVal(outstanding), label: ar ? "المستحقات" : "Outstanding", color: "text-amber-600" },
              { icon: Receipt, value: fmtVal(totalExpenses), label: ar ? "المصاريف" : "Expenses", color: "text-rose-500" },
              { icon: Wallet, value: fmtVal(netPosition), label: ar ? "صافي الموقف" : "Net Position", color: netPosition >= 0 ? "text-emerald-600" : "text-rose-500" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <m.icon size={14} strokeWidth={1.75} className={m.color + " mb-2"} />
                <p className="text-[17px] font-medium text-foreground leading-none tabular-nums mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>{m.value}</p>
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
            { id: "invoices" as const, en: "Invoices", ar: "الفواتير", count: invoices.length },
            { id: "expenses" as const, en: "Expenses", ar: "المصاريف", count: expenses.length },
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
        {/* Search + add */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-[300px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "invoices" ? (ar ? "ابحث..." : "Search invoices...") : (ar ? "ابحث..." : "Search expenses...")}
              className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
          </div>
          <div className="flex-1" />
          {tab === "invoices" && invoices.length > 0 && (
            <button onClick={() => exportCSV(invoices, `thoth-invoices-${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Download size={13} /> {ar ? "صدّر" : "Export"}
            </button>
          )}
          {tab === "expenses" && expenses.length > 0 && (
            <button onClick={() => exportCSV(expenses, `thoth-expenses-${new Date().toISOString().slice(0,10)}.csv`)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Download size={13} /> {ar ? "صدّر" : "Export"}
            </button>
          )}
          <button onClick={() => tab === "invoices" ? setInvModal(true) : setExpModal(true)} className={btnPrimary + " h-9"}>
            <Plus size={14} /> {tab === "invoices" ? (ar ? "أنشئ فاتورة" : "Add Invoice") : (ar ? "سجّل مصروف" : "Add Expense")}
          </button>
        </div>

        {/* Invoices tab */}
        {tab === "invoices" && (
          filteredInv.length === 0 ? (
            <EmptyState icon={FileText}
              title={ar ? "مفيش فواتير لسه" : "No invoices yet"}
              subtitle={ar ? "أنشئ أول فاتورة أو استورد بياناتك." : "Create your first invoice or import your data."}
              addLabel={ar ? "أنشئ فاتورة" : "Add Invoice"}
              onAdd={() => setInvModal(true)} />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredInv.map((i) => (
                <div key={i.id} className="bg-background border border-border/40 rounded-xl px-5 py-4 hover:shadow-sm hover:border-border/70 transition-all flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10.5px] font-mono text-muted-foreground">{i.number}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusPill[i.status] ?? "bg-muted text-muted-foreground"}`}>
                        {i.status}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>
                      {ar ? (i.org_name_ar ?? i.org_name_en) : i.org_name_en}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(i.amount)}</p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Expenses tab */}
        {tab === "expenses" && (
          filteredExp.length === 0 ? (
            <EmptyState icon={Receipt}
              title={ar ? "مفيش مصاريف لسه" : "No expenses yet"}
              subtitle={ar ? "سجّل أول مصروف أو استورد بياناتك." : "Record your first expense or import your data."}
              addLabel={ar ? "سجّل مصروف" : "Add Expense"}
              onAdd={() => setExpModal(true)} />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredExp.map((e) => (
                <div key={e.id} className="bg-background border border-border/40 rounded-xl px-5 py-4 hover:shadow-sm hover:border-border/70 transition-all flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {e.category && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-600">{e.category}</span>}
                      {e.date && <span className="text-[10.5px] text-muted-foreground">{e.date}</span>}
                    </div>
                    <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>
                      {ar ? (e.description_ar ?? e.description_en) : e.description_en}
                    </p>
                  </div>
                  <p className="text-[14px] font-semibold tabular-nums text-rose-500 shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>-{fmtVal(e.amount)}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {invModal && <AddInvoiceModal ar={ar} currency={currency} onClose={() => setInvModal(false)} onAdd={(i) => setInvoices((prev) => [i, ...prev])} />}
      {expModal && <AddExpenseModal ar={ar} currency={currency} onClose={() => setExpModal(false)} onAdd={(e) => setExpenses((prev) => [e, ...prev])} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 5. WORK (TASKS)
// ═══════════════════════════════════════════════════════════

const WORK_STATUSES = ["backlog", "planned", "todo", "in_progress", "review", "done", "blocked"] as const;
const WORK_PRIORITIES = ["critical", "urgent", "high", "medium", "low"] as const;
const WORK_TYPES = ["task", "project", "initiative", "ticket", "request"] as const;

const WORK_STATUS_META: Record<string, { en: string; ar: string; pill: string }> = {
  backlog:     { en: "Backlog",     ar: "قائمة الانتظار", pill: "bg-slate-100 text-slate-500" },
  planned:     { en: "Planned",     ar: "مخطط",         pill: "bg-indigo-100 text-indigo-600" },
  todo:        { en: "To Do",       ar: "للتنفيذ",      pill: "bg-slate-100 text-slate-600" },
  in_progress: { en: "In Progress", ar: "شغال عليها",   pill: "bg-blue-100 text-blue-600" },
  review:      { en: "Review",      ar: "مراجعة",       pill: "bg-violet-100 text-violet-600" },
  done:        { en: "Done",        ar: "خلصت",         pill: "bg-emerald-100 text-emerald-700" },
  blocked:     { en: "Blocked",     ar: "متوقفة",       pill: "bg-rose-100 text-rose-600" },
  cancelled:   { en: "Cancelled",   ar: "ملغية",        pill: "bg-muted text-muted-foreground" },
};

const WORK_PRIORITY_META: Record<string, { en: string; ar: string; pill: string }> = {
  critical: { en: "Critical", ar: "حرجة",   pill: "bg-red-100 text-red-700" },
  urgent:   { en: "Urgent",   ar: "عاجلة",  pill: "bg-rose-100 text-rose-600" },
  high:     { en: "High",     ar: "عالية",  pill: "bg-orange-100 text-orange-600" },
  medium:   { en: "Medium",   ar: "متوسطة", pill: "bg-amber-100 text-amber-700" },
  low:      { en: "Low",      ar: "منخفضة", pill: "bg-slate-100 text-slate-500" },
};

const WORK_TYPE_META: Record<string, { en: string; ar: string }> = {
  task:       { en: "Task",       ar: "مهمة" },
  project:    { en: "Project",    ar: "مشروع" },
  initiative: { en: "Initiative", ar: "مبادرة" },
  ticket:     { en: "Ticket",     ar: "تذكرة" },
  request:    { en: "Request",    ar: "طلب" },
  milestone:  { en: "Milestone",  ar: "إنجاز" },
  action:     { en: "Action",     ar: "إجراء" },
};

// Kanban columns
const KANBAN_COLS: { id: string; en: string; ar: string; color: string }[] = [
  { id: "backlog",     en: "Backlog",     ar: "الانتظار",     color: "border-t-slate-400" },
  { id: "planned",     en: "Planned",     ar: "مخطط",         color: "border-t-indigo-400" },
  { id: "in_progress", en: "In Progress", ar: "شغال عليها",   color: "border-t-blue-500" },
  { id: "review",      en: "Review",      ar: "مراجعة",       color: "border-t-violet-500" },
  { id: "done",        en: "Done",        ar: "خلصت",         color: "border-t-emerald-500" },
];

function AddWorkItemModal({ onClose, onAdd, ar, parentId }: { onClose: () => void; onAdd: (t: LiveWorkItem) => void; ar: boolean; parentId?: string }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ title: "", type: "task", status: "todo", priority: "medium", dueDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.title.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().work_items.create(workspace.id, {
        title_en: form.title.trim(), title_ar: form.title.trim(),
        type: form.type as LiveWorkItem["type"],
        status: form.status as LiveWorkItem["status"],
        priority: form.priority as LiveWorkItem["priority"],
        due_date: form.dueDate || null,
        parent_id: parentId || null,
        progress: 0, tags: [], metadata: {},
      });
      if (created) onAdd(created as LiveWorkItem);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={parentId ? (ar ? "أنشئ مهمة فرعية" : "Add Sub-task") : (ar ? "أنشئ عنصر شغل" : "Create Work Item")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "العنوان" : "Title"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus
            className={inputCls} placeholder={ar ? "مثال: إعداد تقرير ربع السنة" : "e.g. Q3 Report Preparation"} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{ar ? "النوع" : "Type"}</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className={inputCls + " appearance-none cursor-pointer"}>
              {WORK_TYPES.map((t) => {
                const m = WORK_TYPE_META[t];
                return <option key={t} value={t}>{ar ? m.ar : m.en}</option>;
              })}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "الحالة" : "Status"}</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputCls + " appearance-none cursor-pointer"}>
              {WORK_STATUSES.map((s) => {
                const m = WORK_STATUS_META[s];
                return <option key={s} value={s}>{ar ? m.ar : m.en}</option>;
              })}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "الأولوية" : "Priority"}</label>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className={inputCls + " appearance-none cursor-pointer"}>
              {WORK_PRIORITIES.map((p) => {
                const m = WORK_PRIORITY_META[p];
                return <option key={p} value={p}>{ar ? m.ar : m.en}</option>;
              })}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "تاريخ الاستحقاق" : "Due Date"}</label>
          <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.title.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "أنشئ" : "Create"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function WorkLive({ workspaceId, lang }: { workspaceId: string; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [workItems, setWorkItems] = useState<LiveWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    getDataSource().work_items.list(workspaceId)
      .then((d) => { setWorkItems(d as LiveWorkItem[]); setLoading(false); })
      .catch(() => { setError(ar ? "فشل التحميل" : "Failed to load"); setLoading(false); });
  }, [workspaceId]);

  // Kanban drag: update status
  async function moveItem(id: string, newStatus: string) {
    const item = workItems.find((w) => w.id === id);
    if (!item || item.status === newStatus) return;
    // Optimistic update
    setWorkItems((prev) => prev.map((w) => w.id === id ? { ...w, status: newStatus as LiveWorkItem["status"] } : w));
    // Persist
    await getDataSource().work_items.update(workspaceId, id, { status: newStatus });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return workItems.filter((t) => {
      const ms = !q || t.title_en.toLowerCase().includes(q) || (t.title_ar ?? "").includes(q);
      const mst = filterStatus === "all" || t.status === filterStatus;
      const mpr = filterPriority === "all" || t.priority === filterPriority;
      const mty = filterType === "all" || t.type === filterType;
      return ms && mst && mpr && mty;
    });
  }, [workItems, search, filterStatus, filterPriority, filterType]);

  // Group for Kanban
  const kanbanGroups = useMemo(() => {
    const map: Record<string, LiveWorkItem[]> = {};
    KANBAN_COLS.forEach((c) => { map[c.id] = []; });
    // Map "todo" → "backlog" for kanban display, or keep as-is
    filtered.forEach((item) => {
      const col = item.status === "todo" ? "backlog" : item.status;
      if (map[col]) map[col].push(item);
      else if (map["backlog"]) map["backlog"].push(item); // cancelled/blocked → backlog
    });
    return map;
  }, [filtered]);

  const hasFilters = filterStatus !== "all" || filterPriority !== "all" || filterType !== "all" || search !== "";

  if (loading) return <Loading />;
  if (error) return <ErrorState msg={error} />;

  if (workItems.length === 0) {
    return (
      <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">
        <PageHeader
          breadcrumb={ar ? "الشغل" : "Work"} title={ar ? "المهام" : "Work Items"}
          count={0} countLabel={ar ? "مهمة" : "items"}
          addLabel={ar ? "أنشئ مهمة" : "Create Work Item"}
          onAdd={() => setModal(true)} ar={ar}
        />
        <EmptyState icon={Briefcase}
          title={ar ? "مفيش شغل لسه" : "No work yet"}
          subtitle={ar ? "أنشئ أول مهمة أو مشروع أو استورد بياناتك." : "Create your first task, project, or import your data."}
          addLabel={ar ? "أنشئ مهمة" : "Create Work Item"}
          onAdd={() => setModal(true)}
        />
        {modal && <AddWorkItemModal ar={ar} onClose={() => setModal(false)} onAdd={(t) => setWorkItems((prev) => [t, ...prev])} />}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="px-7 md:px-10 py-6 border-b border-border/40">
        <div className="max-w-[1100px] flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase mb-2">{ar ? "الشغل" : "Work"}</p>
            <h1 className="text-[26px] font-medium" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "المهام" : "Work Items"}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">{workItems.length} {ar ? "عنصر" : "items"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {workItems.length > 0 && (
              <button onClick={() => exportCSV(workItems, `thoth-work-items-${new Date().toISOString().slice(0,10)}.csv`)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <Download size={13} /> {ar ? "صدّر" : "Export"}
              </button>
            )}
            <button onClick={() => setModal(true)} className={btnPrimary + " h-9"}>
              <Plus size={14} /> {ar ? "أنشئ" : "Create"}
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-7 md:px-10 py-3 border-b border-border/30 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-[1100px] flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1 max-w-[260px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "ابحث..." : "Search..."} className="w-full h-8 pl-8 pr-3 rounded-lg border border-border/60 bg-background text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
          </div>

          <div className="h-4 w-px bg-border/40 hidden sm:block" />

          {/* Status filter */}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-[11.5px] text-muted-foreground focus:outline-none appearance-none cursor-pointer">
            <option value="all">{ar ? "كل الحالات" : "All Status"}</option>
            {WORK_STATUSES.map((s) => <option key={s} value={s}>{ar ? WORK_STATUS_META[s].ar : WORK_STATUS_META[s].en}</option>)}
          </select>

          {/* Priority filter */}
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-[11.5px] text-muted-foreground focus:outline-none appearance-none cursor-pointer">
            <option value="all">{ar ? "كل الأولويات" : "All Priority"}</option>
            {WORK_PRIORITIES.map((p) => <option key={p} value={p}>{ar ? WORK_PRIORITY_META[p].ar : WORK_PRIORITY_META[p].en}</option>)}
          </select>

          {/* Type filter */}
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-[11.5px] text-muted-foreground focus:outline-none appearance-none cursor-pointer">
            <option value="all">{ar ? "كل الأنواع" : "All Types"}</option>
            {WORK_TYPES.map((t) => <option key={t} value={t}>{ar ? WORK_TYPE_META[t].ar : WORK_TYPE_META[t].en}</option>)}
          </select>

          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); setFilterType("all"); }}
              className="flex items-center gap-1 h-8 px-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={10} /> {ar ? "مسح" : "Clear"}
            </button>
          )}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card text-[11px]">
            <button onClick={() => setView("list")}
              className={`px-3 h-8 transition-colors ${view === "list" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {ar ? "قائمة" : "List"}
            </button>
            <div className="w-px h-4 bg-border/60" />
            <button onClick={() => setView("board")}
              className={`px-3 h-8 transition-colors ${view === "board" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {ar ? "كانبان" : "Board"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-7 md:px-10 py-6">
        {filtered.length === 0 && hasFilters ? (
          <NoResults ar={ar} />
        ) : view === "list" ? (
          /* ── List View ── */
          <div className="max-w-[1100px] flex flex-col gap-2">
            {filtered.map((t) => {
              const sm = WORK_STATUS_META[t.status] ?? { en: t.status, ar: t.status, pill: "bg-muted text-muted-foreground" };
              const pm = WORK_PRIORITY_META[t.priority] ?? { en: t.priority, ar: t.priority, pill: "bg-muted text-muted-foreground" };
              const tm = WORK_TYPE_META[t.type] ?? { en: t.type, ar: t.type };
              const isOverdue = t.due_date && t.status !== "done" && t.status !== "cancelled" && new Date(t.due_date) < new Date(new Date().toDateString());
              const children = workItems.filter((w) => w.parent_id === t.id);

              return (
                <div key={t.id} className="bg-background border border-border/40 rounded-xl px-5 py-4 hover:shadow-sm hover:border-border/70 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                          {ar ? tm.ar : tm.en}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sm.pill}`}>
                          {ar ? sm.ar : sm.en}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pm.pill}`}>
                          {ar ? pm.ar : pm.en}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-600">
                            {ar ? "متأخرة" : "Overdue"}
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>
                        {ar ? (t.title_ar ?? t.title_en) : t.title_en}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10.5px] text-muted-foreground">
                        {t.due_date && <span className={isOverdue ? "text-rose-500 font-medium" : ""}>{t.due_date.slice(0, 10)}</span>}
                        {children.length > 0 && <span>{children.length} {ar ? "فرعية" : "sub-items"}</span>}
                      </div>
                    </div>
                    {t.progress > 0 && (
                      <div className="shrink-0 w-16 text-right">
                        <p className="text-[11px] text-muted-foreground tabular-nums">{t.progress}%</p>
                        <div className="h-1 bg-muted rounded-full mt-1">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${t.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Kanban Board ── */
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
            {KANBAN_COLS.map((col) => {
              const items = kanbanGroups[col.id] || [];
              return (
                <div key={col.id} className={`flex-shrink-0 w-[260px] flex flex-col rounded-xl border border-border/40 bg-muted/20 border-t-[3px] ${col.color}`}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("bg-primary/5"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("bg-primary/5"); }}
                  onDrop={(e) => { e.currentTarget.classList.remove("bg-primary/5"); const id = e.dataTransfer.getData("text/plain"); if (id) moveItem(id, col.id === "backlog" ? "todo" : col.id); }}>
                  {/* Column header */}
                  <div className="px-3.5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[12px] font-medium text-foreground">{ar ? col.ar : col.en}</h3>
                      <span className="text-[10px] text-muted-foreground/50 tabular-nums">{items.length}</span>
                    </div>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 px-2 pb-2 space-y-2 overflow-auto">
                    {items.map((item) => {
                      const pm = WORK_PRIORITY_META[item.priority];
                      const tm = WORK_TYPE_META[item.type] ?? { en: item.type, ar: item.type };
                      const isOd = item.due_date && item.status !== "done" && new Date(item.due_date) < new Date(new Date().toDateString());
                      return (
                        <div key={item.id} draggable
                          onDragStart={(e) => { e.dataTransfer.setData("text/plain", item.id); e.dataTransfer.effectAllowed = "move"; }}
                          className="bg-background border border-border/40 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm hover:border-border/70 transition-all">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">{ar ? tm.ar : tm.en}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${pm?.pill ?? "bg-muted text-muted-foreground"}`}>{ar ? pm?.ar : pm?.en}</span>
                          </div>
                          <p className="text-[12.5px] font-medium text-foreground leading-snug mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
                            {ar ? (item.title_ar ?? item.title_en) : item.title_en}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {item.due_date && <span className={isOd ? "text-rose-500 font-medium" : ""}>{item.due_date.slice(0, 10)}</span>}
                            {item.progress > 0 && <span>{item.progress}%</span>}
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="py-8 text-center text-[11px] text-muted-foreground/40">
                        {ar ? "اسحب هنا" : "Drop here"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && <AddWorkItemModal ar={ar} onClose={() => setModal(false)} onAdd={(t) => setWorkItems((prev) => [t, ...prev])} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 6. RESOURCES
// ═══════════════════════════════════════════════════════════

const RESOURCE_TYPES = ["equipment", "inventory", "vehicle", "facility", "license", "other"] as const;

function AddResourceModal({ onClose, onAdd, ar }: { onClose: () => void; onAdd: (r: LiveResource) => void; ar: boolean }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ name: "", type: "equipment", department: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().resources.create(workspace.id, {
        name_en: form.name.trim(), name_ar: form.name.trim(),
        type: form.type, utilization: 0,
        department: form.department.trim() || null, skills: [], metadata: {},
      });
      if (created) onAdd(created as LiveResource);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "ضيف مورد" : "Add Resource"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "اسم المورد" : "Resource Name"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
            className={inputCls} placeholder={ar ? "مثال: حفار كاتربيلر" : "e.g. Caterpillar Excavator"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "النوع" : "Type"}</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className={inputCls + " appearance-none cursor-pointer"}>
              {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "القسم" : "Department"}</label>
            <input type="text" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className={inputCls} placeholder={ar ? "اختياري" : "Optional"} />
          </div>
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={btnSecondary + " flex-1"}>{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.name.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {ar ? "إضافة" : "Add Resource"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ResourcesLive({ workspaceId, lang }: { workspaceId: string; lang: "en" | "ar" }) {
  const ar = lang === "ar";
  const [resources, setResources] = useState<LiveResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    getDataSource().resources.list(workspaceId)
      .then((d) => { setResources(d as LiveResource[]); setLoading(false); })
      .catch(() => { setError(ar ? "فشل التحميل" : "Failed to load"); setLoading(false); });
  }, [workspaceId]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? resources : resources.filter((r) =>
      r.name_en.toLowerCase().includes(q) || (r.name_ar ?? "").includes(q) || r.type.toLowerCase().includes(q)
    );
  }, [resources, search]);

  const typeColors: Record<string, string> = {
    equipment: "bg-amber-100 text-amber-700", inventory: "bg-violet-100 text-violet-600",
    vehicle: "bg-blue-100 text-blue-600", facility: "bg-emerald-100 text-emerald-700",
    license: "bg-cyan-100 text-cyan-700", other: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[1100px] mx-auto">
      <PageHeader
        breadcrumb={ar ? "الموارد" : "Resources"}
        title={ar ? "إدارة الموارد" : "Resource Management"}
        count={resources.length} countLabel={ar ? "مورد" : "resources"}
        addLabel={ar ? "ضيف مورد" : "Add Resource"}
        onAdd={() => setModal(true)} ar={ar}
        onExport={() => exportCSV(resources, `thoth-resources-${new Date().toISOString().slice(0,10)}.csv`)}
      />
      <SearchBar value={search} onChange={setSearch} placeholder={ar ? "ابحث في الموارد..." : "Search resources..."} ar={ar} />

      {loading ? <Loading /> : error ? <ErrorState msg={error} /> : filtered.length === 0 && search ? <NoResults ar={ar} /> :
        filtered.length === 0 ? (
          <EmptyState icon={Package}
            title={ar ? "مفيش موارد لسه" : "No resources yet"}
            subtitle={ar ? "ضيف أول أصل أو معدة." : "Add your first asset."}
            addLabel={ar ? "ضيف مورد" : "Add Resource"}
            onAdd={() => setModal(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <div key={r.id}
                className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-semibold shrink-0 ${typeColors[r.type] ?? "bg-muted text-muted-foreground"}`}>
                    {inits(ar ? (r.name_ar ?? r.name_en) : r.name_en)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>
                      {ar ? (r.name_ar ?? r.name_en) : r.name_en}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${typeColors[r.type] ?? "bg-muted text-muted-foreground"}`}>
                        {r.type}
                      </span>
                    </div>
                  </div>
                </div>
                {r.utilization > 0 && (
                  <div>
                    <div className="flex justify-between text-[10.5px] text-muted-foreground mb-1">
                      <span>{ar ? "الاستخدام" : "Utilization"}</span>
                      <span>{r.utilization}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${r.utilization}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
      {modal && <AddResourceModal ar={ar} onClose={() => setModal(false)} onAdd={(r) => setResources((prev) => [r, ...prev])} />}
    </div>
  );
}
