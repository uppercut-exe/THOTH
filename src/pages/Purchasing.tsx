/**
 * Purchasing & Vendors Foundation
 *
 * Vendor directory, purchase requests, purchase orders, approval flow.
 * Uses organizations (tagged "vendor") + work_items (type purchase_request/purchase_order).
 */

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { exportCSV, downloadTemplate } from "../lib/csv-export";
import type { Database } from "../lib/database.types";
import {
  Truck, Building2, FileText, Plus, Search, X, Loader2, AlertCircle, Download,
  CheckCircle2, Clock, XCircle, Package, ShoppingCart, ClipboardList,
  DollarSign, Users, ChevronRight, Upload,
} from "lucide-react";

type Org = Database["public"]["Tables"]["organizations"]["Row"];
type WorkItem = Database["public"]["Tables"]["work_items"]["Row"];

// ─── Metadata shapes ─────────────────────────────────────

interface VendorMeta {
  org_type?: string;
  payment_terms?: string;
  vendor_category?: string;
  country?: string;
  city?: string;
  notes?: string;
}

interface PRMeta {
  po_number?: string;
  vendor_id?: string;
  vendor_name?: string;
  items_description?: string;
  estimated_amount?: number;
  department?: string;
  currency?: string;
  delivery_date?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

function getVendorMeta(org: Org): VendorMeta {
  const m = (org.metadata ?? {}) as Record<string, unknown>;
  return { org_type: m.org_type as string, payment_terms: m.payment_terms as string, vendor_category: m.vendor_category as string, country: m.country as string, city: m.city as string, notes: m.notes as string };
}

function getPRMeta(item: WorkItem): PRMeta {
  const m = (item.metadata ?? {}) as Record<string, unknown>;
  return { po_number: m.po_number as string, vendor_id: m.vendor_id as string, vendor_name: m.vendor_name as string, items_description: m.items_description as string, estimated_amount: m.estimated_amount as number, department: m.department as string, currency: m.currency as string, delivery_date: m.delivery_date as string, approved_by: m.approved_by as string, approved_at: m.approved_at as string, rejection_reason: m.rejection_reason as string };
}

// ─── Constants ───────────────────────────────────────────

const PR_STATUSES: { value: string; en: string; ar: string; pill: string }[] = [
  { value: "draft",     en: "Draft",     ar: "مسودة",           pill: "bg-slate-100 text-slate-600" },
  { value: "submitted", en: "Submitted", ar: "تم التقديم",      pill: "bg-blue-100 text-blue-600" },
  { value: "approved",  en: "Approved",  ar: "تمت الموافقة",    pill: "bg-emerald-100 text-emerald-700" },
  { value: "rejected",  en: "Rejected",  ar: "مرفوض",           pill: "bg-rose-100 text-rose-600" },
  { value: "ordered",   en: "Ordered",   ar: "تم الطلب",        pill: "bg-violet-100 text-violet-600" },
  { value: "cancelled", en: "Cancelled", ar: "ملغي",            pill: "bg-muted text-muted-foreground" },
];

const PO_STATUSES: { value: string; en: string; ar: string; pill: string }[] = [
  { value: "draft",              en: "Draft",              ar: "مسودة",         pill: "bg-slate-100 text-slate-600" },
  { value: "sent",               en: "Sent",               ar: "مُرسل",         pill: "bg-blue-100 text-blue-600" },
  { value: "partially_received", en: "Partially Received", ar: "استلام جزئي",  pill: "bg-amber-100 text-amber-700" },
  { value: "received",           en: "Received",           ar: "تم الاستلام",  pill: "bg-emerald-100 text-emerald-700" },
  { value: "cancelled",          en: "Cancelled",          ar: "ملغي",          pill: "bg-muted text-muted-foreground" },
];

const VENDOR_CATEGORIES = [
  { en: "Materials", ar: "مواد" }, { en: "Equipment", ar: "معدات" }, { en: "Services", ar: "خدمات" },
  { en: "Technology", ar: "تكنولوجيا" }, { en: "Office Supplies", ar: "مستلزمات مكتبية" },
  { en: "Logistics", ar: "لوجستيات" }, { en: "Consulting", ar: "استشارات" }, { en: "Other", ar: "أخرى" },
];

// ─── Shared UI ───────────────────────────────────────────

const inputCls = "w-full h-10 rounded-xl border border-border/60 bg-background px-3.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition placeholder:text-muted-foreground/50";
const selectCls = inputCls + " appearance-none cursor-pointer";
const labelCls = "text-[11px] font-medium text-muted-foreground mb-1 block";
const btnPrimary = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50";

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative bg-background border border-border/60 rounded-2xl shadow-xl w-full max-w-[500px] max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/40 sticky top-0 bg-background z-10">
          <h2 className="text-[16px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"><X size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Add Vendor Modal ────────────────────────────────────

function AddVendorModal({ onClose, onAdd, ar }: { onClose: () => void; onAdd: (o: Org) => void; ar: boolean }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ name: "", sector: "", website: "", category: "", paymentTerms: "", country: "", city: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      const created = await getDataSource().organizations.create(workspace.id, {
        name_en: form.name.trim(), name_ar: form.name.trim(),
        sector: form.sector || null, website: form.website.trim() || null,
        health_score: 70, tags: ["vendor"],
        metadata: {
          org_type: "vendor",
          vendor_category: form.category || null,
          payment_terms: form.paymentTerms || null,
          country: form.country || null,
          city: form.city || null,
          notes: form.notes.trim() || null,
        },
      });
      if (created) onAdd(created as Org);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "ضيف مورد" : "Add Vendor"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "اسم المورد" : "Vendor Name"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus className={inputCls} placeholder={ar ? "مثال: شركة التوريدات العامة" : "e.g. General Supplies Co."} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "التصنيف" : "Category"}</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={selectCls}>
              <option value="">{ar ? "اختار..." : "Select..."}</option>
              {VENDOR_CATEGORIES.map((c) => <option key={c.en} value={c.en}>{ar ? c.ar : c.en}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "القطاع" : "Sector"}</label>
            <input type="text" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} className={inputCls} placeholder={ar ? "اختياري" : "Optional"} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "البلد" : "Country"}</label>
            <input type="text" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{ar ? "المدينة" : "City"}</label>
            <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "شروط الدفع" : "Payment Terms"}</label>
          <input type="text" value={form.paymentTerms} onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))} className={inputCls} placeholder={ar ? "مثال: 30 يوم" : "e.g. Net 30"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "الموقع الإلكتروني" : "Website"}</label>
          <input type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className={inputCls} placeholder="https://" />
        </div>
        <div>
          <label className={labelCls}>{ar ? "ملاحظات" : "Notes"}</label>
          <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls + " h-16 py-2.5 resize-none"} placeholder={ar ? "اختياري" : "Optional"} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.name.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />} {ar ? "ضيف" : "Add Vendor"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Purchase Request Modal ──────────────────────────

function AddPRModal({ onClose, onAdd, ar, vendors, currency }: { onClose: () => void; onAdd: (w: WorkItem) => void; ar: boolean; vendors: Org[]; currency: string }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ title: "", vendor: "", amount: "", priority: "medium", department: "", items: "", neededBy: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.title.trim()) return;
    setLoading(true); setError(null);
    const vendor = vendors.find((v) => v.id === form.vendor);
    try {
      const created = await getDataSource().work_items.create(workspace.id, {
        title_en: form.title.trim(), title_ar: form.title.trim(),
        type: "purchase_request" as WorkItem["type"],
        status: "draft" as WorkItem["status"],
        priority: form.priority as WorkItem["priority"],
        due_date: form.neededBy || null,
        organization_id: form.vendor || null,
        progress: 0, tags: ["purchasing"],
        metadata: {
          vendor_id: form.vendor || null,
          vendor_name: vendor?.name_en || null,
          items_description: form.items.trim() || null,
          estimated_amount: parseFloat(form.amount) || 0,
          department: form.department || null,
          currency,
        },
      });
      if (created) onAdd(created as WorkItem);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "طلب شراء جديد" : "New Purchase Request"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "عنوان الطلب" : "Request Title"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required autoFocus className={inputCls} placeholder={ar ? "مثال: شراء أجهزة كمبيوتر" : "e.g. Purchase laptops for team"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "المورد" : "Vendor"}</label>
          <select value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className={selectCls}>
            <option value="">{ar ? "اختار مورد..." : "Select vendor..."}</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name_en}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{ar ? "المواد/الخدمات المطلوبة" : "Items / Services"}</label>
          <textarea value={form.items} onChange={(e) => setForm((f) => ({ ...f, items: e.target.value }))} className={inputCls + " h-16 py-2.5 resize-none"} placeholder={ar ? "وصف ما تحتاجه..." : "Describe what you need..."} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>{ar ? `المبلغ (${currency})` : `Amount (${currency})`}</label>
            <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} min="0" className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>{ar ? "الأولوية" : "Priority"}</label>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className={selectCls}>
              {["low", "medium", "high", "urgent", "critical"].map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "مطلوب بحلول" : "Needed By"}</label>
            <input type="date" value={form.neededBy} onChange={(e) => setForm((f) => ({ ...f, neededBy: e.target.value }))} className={inputCls} />
          </div>
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.title.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />} {ar ? "أنشئ طلب" : "Create Request"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Purchase Order Modal ────────────────────────────

function AddPOModal({ onClose, onAdd, ar, vendors, currency }: { onClose: () => void; onAdd: (w: WorkItem) => void; ar: boolean; vendors: Org[]; currency: string }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ poNumber: "", title: "", vendor: "", amount: "", deliveryDate: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.poNumber.trim() || !form.title.trim()) return;
    setLoading(true); setError(null);
    const vendor = vendors.find((v) => v.id === form.vendor);
    try {
      const created = await getDataSource().work_items.create(workspace.id, {
        title_en: form.title.trim(), title_ar: form.title.trim(),
        type: "purchase_order" as WorkItem["type"],
        status: "draft" as WorkItem["status"],
        priority: "medium" as WorkItem["priority"],
        due_date: form.deliveryDate || null,
        organization_id: form.vendor || null,
        progress: 0, tags: ["purchasing"],
        metadata: {
          po_number: form.poNumber.trim(),
          vendor_id: form.vendor || null,
          vendor_name: vendor?.name_en || null,
          estimated_amount: parseFloat(form.amount) || 0,
          currency,
          delivery_date: form.deliveryDate || null,
        },
      });
      if (created) onAdd(created as WorkItem);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "أمر شراء جديد" : "New Purchase Order"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "رقم أمر الشراء" : "PO Number"} <span className="text-rose-400">*</span></label>
            <input type="text" value={form.poNumber} onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))} required className={inputCls} placeholder="PO-001" />
          </div>
          <div>
            <label className={labelCls}>{ar ? `المبلغ (${currency})` : `Amount (${currency})`}</label>
            <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} min="0" className={inputCls} placeholder="0" />
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "وصف الأمر" : "Description"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className={inputCls} placeholder={ar ? "مثال: توريد مواد بناء" : "e.g. Building materials delivery"} />
        </div>
        <div>
          <label className={labelCls}>{ar ? "المورد" : "Vendor"}</label>
          <select value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className={selectCls}>
            <option value="">{ar ? "اختار مورد..." : "Select vendor..."}</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name_en}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{ar ? "تاريخ التسليم المتوقع" : "Expected Delivery"}</label>
          <input type="date" value={form.deliveryDate} onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))} className={inputCls} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.poNumber.trim() || !form.title.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />} {ar ? "أنشئ أمر" : "Create PO"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Main page ───────────────────────────────────────────

type PurchTab = "dashboard" | "vendors" | "requests" | "orders";

export default function Purchasing() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  const ar = lang === "ar";
  const settings = workspace?.settings as Record<string, unknown> | undefined;
  const currency = (settings?.currency as string) || "SAR";

  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [tab, setTab] = useState<PurchTab>("dashboard");
  const [search, setSearch] = useState("");
  const [vendorModal, setVendorModal] = useState(false);
  const [prModal, setPrModal] = useState(false);
  const [poModal, setPoModal] = useState(false);

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    const ds = getDataSource();
    Promise.all([
      ds.organizations.list(workspace.id),
      ds.work_items.list(workspace.id),
    ]).then(([o, w]) => {
      setOrgs(o as Org[]);
      setWorkItems(w as WorkItem[]);
    }).finally(() => setLoading(false));
  }, [workspace?.id]);

  const vendors = useMemo(() => orgs.filter((o) => (o.tags ?? []).includes("vendor") || (getVendorMeta(o).org_type === "vendor")), [orgs]);
  const purchaseRequests = useMemo(() => workItems.filter((w) => w.type === "purchase_request"), [workItems]);
  const purchaseOrders = useMemo(() => workItems.filter((w) => w.type === "purchase_order"), [workItems]);

  const openPRs = purchaseRequests.filter((p) => ["draft", "submitted"].includes(p.status));
  const approvedPRs = purchaseRequests.filter((p) => p.status === "approved");
  const pendingApproval = purchaseRequests.filter((p) => p.status === "submitted");
  const openPOs = purchaseOrders.filter((p) => ["draft", "sent"].includes(p.status));
  const totalPRValue = purchaseRequests.reduce((s, p) => s + (getPRMeta(p).estimated_amount || 0), 0);
  const totalPOValue = purchaseOrders.reduce((s, p) => s + (getPRMeta(p).estimated_amount || 0), 0);

  const fmtVal = (v: number) => new Intl.NumberFormat(ar ? "ar-SA" : "en-SA", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  // Filtered items per tab
  const filteredVendors = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? vendors : vendors.filter((v) => v.name_en.toLowerCase().includes(q) || (v.sector ?? "").toLowerCase().includes(q));
  }, [vendors, search]);

  const filteredPRs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? purchaseRequests : purchaseRequests.filter((p) => p.title_en.toLowerCase().includes(q) || (getPRMeta(p).vendor_name ?? "").toLowerCase().includes(q));
  }, [purchaseRequests, search]);

  const filteredPOs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return !q ? purchaseOrders : purchaseOrders.filter((p) => p.title_en.toLowerCase().includes(q) || (getPRMeta(p).po_number ?? "").toLowerCase().includes(q));
  }, [purchaseOrders, search]);

  // Approval action
  async function updateStatus(id: string, newStatus: string) {
    await getDataSource().work_items.update(workspace?.id ?? "", id, { status: newStatus });
    setWorkItems((prev) => prev.map((w) => w.id === id ? { ...w, status: newStatus as WorkItem["status"] } : w));
  }

  const hasData = vendors.length > 0 || purchaseRequests.length > 0 || purchaseOrders.length > 0;

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-muted-foreground/40" /></div>;

  return (
    <div className="min-h-full">
      {/* ── Header with metrics ── */}
      <div className="border-b border-border/40 px-7 md:px-10 py-7" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <ShoppingCart size={14} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "المشتريات" : "Purchasing"}</p>
          </div>
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "المشتريات والموردين" : "Purchasing & Vendors"}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setVendorModal(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium hover:bg-muted/50 transition-colors">
                <Building2 size={13} /> {ar ? "ضيف مورد" : "Add Vendor"}
              </button>
              <button onClick={() => setPrModal(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium hover:bg-muted/50 transition-colors">
                <ClipboardList size={13} /> {ar ? "طلب شراء" : "New PR"}
              </button>
              <button onClick={() => setPoModal(true)} className={btnPrimary + " h-9"}>
                <FileText size={14} /> {ar ? "أمر شراء" : "New PO"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Building2, value: vendors.length, label: ar ? "الموردين" : "Vendors", color: "text-violet-600" },
              { icon: ClipboardList, value: openPRs.length, label: ar ? "طلبات مفتوحة" : "Open PRs", color: "text-blue-600" },
              { icon: Clock, value: pendingApproval.length, label: ar ? "مستني موافقة" : "Pending Approval", color: "text-amber-600" },
              { icon: CheckCircle2, value: approvedPRs.length, label: ar ? "تمت الموافقة" : "Approved", color: "text-emerald-600" },
              { icon: FileText, value: openPOs.length, label: ar ? "أوامر مفتوحة" : "Open POs", color: "text-primary" },
              { icon: DollarSign, value: fmtVal(totalPOValue), label: ar ? "قيمة الأوامر" : "PO Value", color: "text-foreground", isText: true },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <m.icon size={14} strokeWidth={1.75} className={m.color + " mb-2"} />
                <p className="text-[17px] font-medium text-foreground leading-none tabular-nums mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                  {typeof m.value === "number" ? m.value : m.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-7 md:px-10 flex items-center gap-0">
          {([
            { id: "dashboard" as const, en: "Overview", ar: "نظرة عامة" },
            { id: "vendors" as const, en: `Vendors (${vendors.length})`, ar: `الموردين (${vendors.length})` },
            { id: "requests" as const, en: `Requests (${purchaseRequests.length})`, ar: `الطلبات (${purchaseRequests.length})` },
            { id: "orders" as const, en: `Orders (${purchaseOrders.length})`, ar: `الأوامر (${purchaseOrders.length})` },
          ]).map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
              className={`px-4 py-3 text-[12px] font-medium border-b-2 transition-all ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {ar ? t.ar : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-7 md:px-10 py-6 max-w-[1100px]">
        {!hasData && tab === "dashboard" ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <ShoppingCart size={24} className="text-muted-foreground/40" />
            </div>
            <div className="text-center max-w-[400px]">
              <p className="text-[15px] font-medium mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "مفيش بيانات مشتريات لسه" : "No purchasing data yet"}
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {ar ? "ضيف أول مورد أو أنشئ طلب شراء عشان تبدأ." : "Add your first vendor or create a purchase request to get started."}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setVendorModal(true)} className={btnPrimary + " h-10"}>
                <Building2 size={14} /> {ar ? "ضيف مورد" : "Add Vendor"}
              </button>
              <button onClick={() => setPrModal(true)} className="flex items-center gap-2 h-10 px-5 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">
                <ClipboardList size={14} /> {ar ? "طلب شراء" : "New PR"}
              </button>
            </div>
          </div>
        ) : tab === "dashboard" ? (
          /* Dashboard overview — show recent items */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending approvals */}
            <div>
              <h3 className="text-[13px] font-medium mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "مستني موافقة" : "Pending Approval"} <span className="text-amber-500 ml-1">{pendingApproval.length}</span>
              </h3>
              {pendingApproval.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/50 py-8 text-center">{ar ? "مفيش طلبات معلقة" : "No pending requests"}</p>
              ) : (
                <div className="space-y-2">
                  {pendingApproval.slice(0, 5).map((pr) => {
                    const meta = getPRMeta(pr);
                    return (
                      <div key={pr.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-200/40 bg-amber-50/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{pr.title_en}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{meta.vendor_name || (ar ? "بدون مورد" : "No vendor")} · {meta.estimated_amount ? fmtVal(meta.estimated_amount) : ""}</p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => updateStatus(pr.id, "approved")} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors" title={ar ? "موافقة" : "Approve"}>
                            <CheckCircle2 size={15} />
                          </button>
                          <button onClick={() => updateStatus(pr.id, "rejected")} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors" title={ar ? "رفض" : "Reject"}>
                            <XCircle size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent POs */}
            <div>
              <h3 className="text-[13px] font-medium mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "أوامر شراء حديثة" : "Recent Purchase Orders"} <span className="text-primary ml-1">{purchaseOrders.length}</span>
              </h3>
              {purchaseOrders.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/50 py-8 text-center">{ar ? "مفيش أوامر شراء" : "No purchase orders"}</p>
              ) : (
                <div className="space-y-2">
                  {purchaseOrders.slice(0, 5).map((po) => {
                    const meta = getPRMeta(po);
                    const st = PO_STATUSES.find((s) => s.value === po.status) ?? PO_STATUSES[0];
                    return (
                      <div key={po.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-background hover:shadow-sm transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10.5px] font-mono text-muted-foreground">{meta.po_number}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.pill}`}>{ar ? st.ar : st.en}</span>
                          </div>
                          <p className="text-[13px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{po.title_en}</p>
                        </div>
                        {meta.estimated_amount ? <p className="text-[13px] font-semibold tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(meta.estimated_amount)}</p> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : tab === "vendors" ? (
          /* Vendors list */
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-[300px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث في الموردين..." : "Search vendors..."} className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="flex-1" />
              {vendors.length > 0 && (
                <button onClick={() => exportCSV(vendors, `thoth-vendors-${new Date().toISOString().slice(0,10)}.csv`)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Download size={13} /> {ar ? "صدّر" : "Export"}
                </button>
              )}
            </div>
            {filteredVendors.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{search ? (ar ? "مفيش نتائج" : "No results") : (ar ? "مفيش موردين لسه" : "No vendors yet")}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVendors.map((v) => {
                  const meta = getVendorMeta(v);
                  return (
                    <div key={v.id} className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-semibold shrink-0">
                          {v.name_en.split(" ").slice(0,2).map((w) => w[0]).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{v.name_en}</p>
                          {v.sector && <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{v.sector}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {meta.vendor_category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">{meta.vendor_category}</span>}
                        {meta.payment_terms && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{meta.payment_terms}</span>}
                        {meta.country && <span className="text-[10px] text-muted-foreground">{[meta.city, meta.country].filter(Boolean).join(", ")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === "requests" ? (
          /* Purchase requests */
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-[300px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث..." : "Search..."} className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="flex-1" />
              <button onClick={() => setPrModal(true)} className={btnPrimary + " h-9"}><Plus size={14} /> {ar ? "طلب جديد" : "New Request"}</button>
            </div>
            {filteredPRs.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{ar ? "مفيش طلبات شراء" : "No purchase requests"}</div>
            ) : (
              <div className="space-y-2">
                {filteredPRs.map((pr) => {
                  const meta = getPRMeta(pr);
                  const st = PR_STATUSES.find((s) => s.value === pr.status) ?? PR_STATUSES[0];
                  return (
                    <div key={pr.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background hover:shadow-sm transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.pill}`}>{ar ? st.ar : st.en}</span>
                          <span className="text-[10.5px] text-muted-foreground">{meta.vendor_name || ""}</span>
                        </div>
                        <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? (pr.title_ar ?? pr.title_en) : pr.title_en}</p>
                        {pr.due_date && <p className="text-[11px] text-muted-foreground mt-0.5">{ar ? "مطلوب بحلول" : "Needed by"} {pr.due_date.slice(0,10)}</p>}
                      </div>
                      {meta.estimated_amount ? <p className="text-[14px] font-semibold tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(meta.estimated_amount)}</p> : null}
                      {pr.status === "submitted" && (
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => updateStatus(pr.id, "approved")} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"><CheckCircle2 size={14} /></button>
                          <button onClick={() => updateStatus(pr.id, "rejected")} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"><XCircle size={14} /></button>
                        </div>
                      )}
                      {pr.status === "draft" && (
                        <button onClick={() => updateStatus(pr.id, "submitted")} className="text-[11px] text-primary font-medium hover:opacity-70">{ar ? "قدّم" : "Submit"}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Purchase orders */
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-[300px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث..." : "Search..."} className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="flex-1" />
              {purchaseOrders.length > 0 && (
                <button onClick={() => { const rows = purchaseOrders.map((p) => { const m = getPRMeta(p); return { po_number: m.po_number, title: p.title_en, vendor: m.vendor_name, amount: m.estimated_amount, status: p.status, delivery_date: m.delivery_date, created_at: p.created_at }; }); exportCSV(rows, `thoth-purchase-orders-${new Date().toISOString().slice(0,10)}.csv`); }}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Download size={13} /> {ar ? "صدّر" : "Export"}
                </button>
              )}
              <button onClick={() => setPoModal(true)} className={btnPrimary + " h-9"}><Plus size={14} /> {ar ? "أمر جديد" : "New PO"}</button>
            </div>
            {filteredPOs.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{ar ? "مفيش أوامر شراء" : "No purchase orders"}</div>
            ) : (
              <div className="space-y-2">
                {filteredPOs.map((po) => {
                  const meta = getPRMeta(po);
                  const st = PO_STATUSES.find((s) => s.value === po.status) ?? PO_STATUSES[0];
                  return (
                    <div key={po.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background hover:shadow-sm transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10.5px] font-mono text-muted-foreground">{meta.po_number}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.pill}`}>{ar ? st.ar : st.en}</span>
                        </div>
                        <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{po.title_en}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.vendor_name || ""}{meta.delivery_date ? ` · ${ar ? "تسليم" : "Delivery"} ${meta.delivery_date}` : ""}</p>
                      </div>
                      {meta.estimated_amount ? <p className="text-[14px] font-semibold tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(meta.estimated_amount)}</p> : null}
                      {po.status === "draft" && (
                        <button onClick={() => updateStatus(po.id, "sent")} className="text-[11px] text-primary font-medium hover:opacity-70">{ar ? "أرسل" : "Send"}</button>
                      )}
                      {po.status === "sent" && (
                        <button onClick={() => updateStatus(po.id, "received")} className="text-[11px] text-emerald-600 font-medium hover:opacity-70">{ar ? "تم الاستلام" : "Received"}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {vendorModal && <AddVendorModal ar={ar} onClose={() => setVendorModal(false)} onAdd={(o) => setOrgs((prev) => [o, ...prev])} />}
      {prModal && <AddPRModal ar={ar} vendors={vendors} currency={currency} onClose={() => setPrModal(false)} onAdd={(w) => setWorkItems((prev) => [w, ...prev])} />}
      {poModal && <AddPOModal ar={ar} vendors={vendors} currency={currency} onClose={() => setPoModal(false)} onAdd={(w) => setWorkItems((prev) => [w, ...prev])} />}
    </div>
  );
}
