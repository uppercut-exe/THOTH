/**
 * Inventory & Assets Foundation
 *
 * Inventory items, assets, stock movements, maintenance tracking.
 * Uses `resources` table with metadata for inventory/asset fields,
 * and `work_items` with type stock_movement/maintenance.
 */

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { exportCSV } from "../lib/csv-export";
import type { Database } from "../lib/database.types";
import {
  Package, Box, Truck, Wrench, MapPin, Plus, Search, X, Loader2,
  AlertCircle, Download, AlertTriangle, CheckCircle2, ArrowDownUp,
  DollarSign, BarChart3, Monitor, Car, Hammer, Building2, Key, Armchair,
} from "lucide-react";

type Resource = Database["public"]["Tables"]["resources"]["Row"];
type WorkItem = Database["public"]["Tables"]["work_items"]["Row"];

// ─── Metadata shapes ─────────────────────────────────────

interface InvMeta {
  category?: string;
  sku?: string;
  quantity?: number;
  reorder_level?: number;
  unit_cost?: number;
  vendor_name?: string;
  location?: string;
  inv_status?: string;
  asset_tag?: string;
  assigned_to?: string;
  assigned_dept?: string;
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  condition?: string;
  warranty_expiry?: string;
  asset_status?: string;
}

function getMeta(r: Resource): InvMeta {
  const m = (r.metadata ?? {}) as Record<string, unknown>;
  return {
    category: m.category as string, sku: m.sku as string,
    quantity: m.quantity as number, reorder_level: m.reorder_level as number,
    unit_cost: m.unit_cost as number, vendor_name: m.vendor_name as string,
    location: m.location as string, inv_status: m.inv_status as string,
    asset_tag: m.asset_tag as string, assigned_to: m.assigned_to as string,
    assigned_dept: m.assigned_dept as string, purchase_date: m.purchase_date as string,
    purchase_cost: m.purchase_cost as number, current_value: m.current_value as number,
    condition: m.condition as string, warranty_expiry: m.warranty_expiry as string,
    asset_status: m.asset_status as string,
  };
}

interface MoveMeta {
  resource_id?: string; resource_name?: string; move_qty?: number;
  move_type?: string; from_location?: string; to_location?: string; reason?: string;
}
function getMoveMeta(w: WorkItem): MoveMeta {
  const m = (w.metadata ?? {}) as Record<string, unknown>;
  return { resource_id: m.resource_id as string, resource_name: m.resource_name as string, move_qty: m.move_qty as number, move_type: m.move_type as string, from_location: m.from_location as string, to_location: m.to_location as string, reason: m.reason as string };
}

interface MaintMeta {
  resource_id?: string; resource_name?: string; maint_type?: string;
  cost?: number; vendor_name?: string; notes?: string; completed_date?: string;
}
function getMaintMeta(w: WorkItem): MaintMeta {
  const m = (w.metadata ?? {}) as Record<string, unknown>;
  return { resource_id: m.resource_id as string, resource_name: m.resource_name as string, maint_type: m.maint_type as string, cost: m.cost as number, vendor_name: m.vendor_name as string, notes: m.notes as string, completed_date: m.completed_date as string };
}

// ─── Constants ───────────────────────────────────────────

const RESOURCE_CATEGORIES: { value: string; en: string; ar: string; icon: React.ElementType; color: string }[] = [
  { value: "inventory", en: "Inventory", ar: "مخزون", icon: Box, color: "bg-violet-100 text-violet-600" },
  { value: "equipment", en: "Equipment", ar: "معدات", icon: Monitor, color: "bg-amber-100 text-amber-700" },
  { value: "vehicle", en: "Vehicle", ar: "مركبة", icon: Car, color: "bg-blue-100 text-blue-600" },
  { value: "tool", en: "Tool", ar: "أداة", icon: Hammer, color: "bg-orange-100 text-orange-600" },
  { value: "furniture", en: "Furniture", ar: "أثاث", icon: Armchair, color: "bg-emerald-100 text-emerald-700" },
  { value: "license", en: "Software License", ar: "رخصة برمجية", icon: Key, color: "bg-cyan-100 text-cyan-700" },
  { value: "facility", en: "Facility", ar: "منشأة", icon: Building2, color: "bg-rose-100 text-rose-600" },
  { value: "other", en: "Other", ar: "أخرى", icon: Package, color: "bg-slate-100 text-slate-600" },
];

const INV_STATUSES = [
  { value: "in_stock", en: "In Stock", ar: "متوفر", pill: "bg-emerald-100 text-emerald-700" },
  { value: "low_stock", en: "Low Stock", ar: "الكمية قليلة", pill: "bg-amber-100 text-amber-700" },
  { value: "out_of_stock", en: "Out of Stock", ar: "خلص من المخزون", pill: "bg-rose-100 text-rose-600" },
  { value: "discontinued", en: "Discontinued", ar: "متوقف", pill: "bg-muted text-muted-foreground" },
];

const ASSET_STATUSES = [
  { value: "active", en: "Active", ar: "نشط", pill: "bg-emerald-100 text-emerald-700" },
  { value: "assigned", en: "Assigned", ar: "مخصص", pill: "bg-blue-100 text-blue-600" },
  { value: "maintenance", en: "In Maintenance", ar: "صيانة", pill: "bg-amber-100 text-amber-700" },
  { value: "retired", en: "Retired", ar: "متقاعد", pill: "bg-slate-100 text-slate-500" },
  { value: "lost", en: "Lost", ar: "مفقود", pill: "bg-rose-100 text-rose-600" },
];

const MOVE_TYPES = [
  { value: "stock_in", en: "Stock In", ar: "إضافة للمخزون" },
  { value: "stock_out", en: "Stock Out", ar: "صرف من المخزون" },
  { value: "adjustment", en: "Adjustment", ar: "تعديل" },
  { value: "transfer", en: "Transfer", ar: "نقل" },
];

const MAINT_STATUSES = [
  { value: "planned", en: "Scheduled", ar: "مجدولة", pill: "bg-blue-100 text-blue-600" },
  { value: "in_progress", en: "In Progress", ar: "جارية", pill: "bg-amber-100 text-amber-700" },
  { value: "done", en: "Completed", ar: "مكتملة", pill: "bg-emerald-100 text-emerald-700" },
  { value: "blocked", en: "Overdue", ar: "متأخرة", pill: "bg-rose-100 text-rose-600" },
  { value: "cancelled", en: "Cancelled", ar: "ملغية", pill: "bg-muted text-muted-foreground" },
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

// ─── Add Item Modal ──────────────────────────────────────

function AddItemModal({ onClose, onAdd, ar, currency, mode }: { onClose: () => void; onAdd: (r: Resource) => void; ar: boolean; currency: string; mode: "inventory" | "asset" }) {
  const { workspace } = useAuth();
  const isInv = mode === "inventory";
  const [form, setForm] = useState({ name: "", type: isInv ? "inventory" : "equipment", sku: "", quantity: "", reorderLevel: "", unitCost: "", location: "", department: "", vendor: "", assetTag: "", assignedTo: "", condition: "good", purchaseDate: "", purchaseCost: "", warrantyExpiry: "", status: isInv ? "in_stock" : "active" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.name.trim()) return;
    setLoading(true); setError(null);
    try {
      const qty = parseInt(form.quantity) || 0;
      const unitCost = parseFloat(form.unitCost) || 0;
      const meta: Record<string, unknown> = {
        category: form.type, location: form.location || null,
        vendor_name: form.vendor || null,
      };
      if (isInv) {
        meta.sku = form.sku || null;
        meta.quantity = qty;
        meta.reorder_level = parseInt(form.reorderLevel) || 0;
        meta.unit_cost = unitCost;
        meta.inv_status = form.status;
      } else {
        meta.asset_tag = form.assetTag || null;
        meta.assigned_to = form.assignedTo || null;
        meta.assigned_dept = form.department || null;
        meta.purchase_date = form.purchaseDate || null;
        meta.purchase_cost = parseFloat(form.purchaseCost) || 0;
        meta.current_value = parseFloat(form.purchaseCost) || 0;
        meta.condition = form.condition;
        meta.warranty_expiry = form.warrantyExpiry || null;
        meta.asset_status = form.status;
      }

      const created = await getDataSource().resources.create(workspace.id, {
        name_en: form.name.trim(), name_ar: form.name.trim(),
        type: form.type,
        utilization: isInv ? (qty > 0 ? Math.min(100, Math.round((qty / Math.max(qty, parseInt(form.reorderLevel) || qty)) * 100)) : 0) : 0,
        department: form.department || null,
        skills: isInv ? ["inventory"] : ["asset"],
        metadata: meta,
      });
      if (created) onAdd(created as Resource);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={isInv ? (ar ? "ضيف صنف مخزون" : "Add Inventory Item") : (ar ? "ضيف أصل" : "Add Asset")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "الاسم" : "Name"} <span className="text-rose-400">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus className={inputCls} placeholder={isInv ? (ar ? "مثال: ورق A4" : "e.g. A4 Paper") : (ar ? "مثال: لابتوب Dell" : "e.g. Dell Laptop")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "التصنيف" : "Category"}</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
              {RESOURCE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{ar ? c.ar : c.en}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{isInv ? (ar ? "SKU" : "SKU") : (ar ? "رقم الأصل" : "Asset Tag")}</label>
            <input type="text" value={isInv ? form.sku : form.assetTag} onChange={(e) => setForm((f) => isInv ? ({ ...f, sku: e.target.value }) : ({ ...f, assetTag: e.target.value }))} className={inputCls} placeholder={isInv ? "SKU-001" : "AST-001"} />
          </div>
        </div>
        {isInv ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>{ar ? "الكمية" : "Quantity"}</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} min="0" className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{ar ? "حد إعادة الطلب" : "Reorder Level"}</label>
              <input type="number" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))} min="0" className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{ar ? `سعر الوحدة (${currency})` : `Unit Cost (${currency})`}</label>
              <input type="number" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))} min="0" className={inputCls} placeholder="0" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "مخصص لـ" : "Assigned To"}</label>
              <input type="text" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputCls} placeholder={ar ? "اسم الشخص" : "Person name"} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "تاريخ الشراء" : "Purchase Date"}</label>
              <input type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} className={inputCls} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "الموقع" : "Location"}</label>
            <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inputCls} placeholder={ar ? "مثال: المخزن الرئيسي" : "e.g. Main Warehouse"} />
          </div>
          <div>
            <label className={labelCls}>{ar ? "الحالة" : "Status"}</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={selectCls}>
              {(isInv ? INV_STATUSES : ASSET_STATUSES).map((s) => <option key={s.value} value={s.value}>{ar ? s.ar : s.en}</option>)}
            </select>
          </div>
        </div>
        {!isInv && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? `تكلفة الشراء (${currency})` : `Purchase Cost (${currency})`}</label>
              <input type="number" value={form.purchaseCost} onChange={(e) => setForm((f) => ({ ...f, purchaseCost: e.target.value }))} min="0" className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>{ar ? "انتهاء الضمان" : "Warranty Expiry"}</label>
              <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))} className={inputCls} />
            </div>
          </div>
        )}
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.name.trim()} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />} {ar ? "ضيف" : "Add"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Stock Movement Modal ────────────────────────────────

function AddMovementModal({ onClose, onAdd, ar, resources }: { onClose: () => void; onAdd: (w: WorkItem) => void; ar: boolean; resources: Resource[] }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ resource: "", moveType: "stock_in", quantity: "", from: "", to: "", reason: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.resource || !form.quantity) return;
    setLoading(true); setError(null);
    const res = resources.find((r) => r.id === form.resource);
    const moveLabel = MOVE_TYPES.find((m) => m.value === form.moveType);
    try {
      const created = await getDataSource().work_items.create(workspace.id, {
        title_en: `${moveLabel?.en || form.moveType}: ${res?.name_en || "Item"} (${form.quantity})`,
        title_ar: `${moveLabel?.ar || form.moveType}: ${res?.name_en || "Item"} (${form.quantity})`,
        type: "stock_movement" as WorkItem["type"],
        status: "done" as WorkItem["status"],
        priority: "medium" as WorkItem["priority"],
        progress: 100, tags: ["inventory"],
        metadata: {
          resource_id: form.resource, resource_name: res?.name_en,
          move_qty: parseInt(form.quantity) || 0, move_type: form.moveType,
          from_location: form.from || null, to_location: form.to || null,
          reason: form.reason || null,
        },
      });
      if (created) onAdd(created as WorkItem);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "حركة مخزون" : "Stock Movement"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "الصنف" : "Item"} <span className="text-rose-400">*</span></label>
          <select value={form.resource} onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))} className={selectCls} required>
            <option value="">{ar ? "اختار..." : "Select..."}</option>
            {resources.map((r) => <option key={r.id} value={r.id}>{r.name_en}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "نوع الحركة" : "Movement Type"} <span className="text-rose-400">*</span></label>
            <select value={form.moveType} onChange={(e) => setForm((f) => ({ ...f, moveType: e.target.value }))} className={selectCls}>
              {MOVE_TYPES.map((m) => <option key={m.value} value={m.value}>{ar ? m.ar : m.en}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "الكمية" : "Quantity"} <span className="text-rose-400">*</span></label>
            <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} min="1" required className={inputCls} />
          </div>
        </div>
        {(form.moveType === "transfer") && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{ar ? "من" : "From"}</label>
              <input type="text" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "إلى" : "To"}</label>
              <input type="text" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} className={inputCls} />
            </div>
          </div>
        )}
        <div>
          <label className={labelCls}>{ar ? "السبب" : "Reason"}</label>
          <input type="text" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} placeholder={ar ? "اختياري" : "Optional"} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.resource || !form.quantity} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />} {ar ? "سجّل" : "Record"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Maintenance Modal ───────────────────────────────────

function AddMaintenanceModal({ onClose, onAdd, ar, resources, currency }: { onClose: () => void; onAdd: (w: WorkItem) => void; ar: boolean; resources: Resource[]; currency: string }) {
  const { workspace } = useAuth();
  const [form, setForm] = useState({ resource: "", maintType: "preventive", dueDate: "", cost: "", vendor: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace || !form.resource) return;
    setLoading(true); setError(null);
    const res = resources.find((r) => r.id === form.resource);
    try {
      const created = await getDataSource().work_items.create(workspace.id, {
        title_en: `Maintenance: ${res?.name_en || "Asset"}`,
        title_ar: `صيانة: ${res?.name_en || "أصل"}`,
        type: "maintenance" as WorkItem["type"],
        status: "planned" as WorkItem["status"],
        priority: "medium" as WorkItem["priority"],
        due_date: form.dueDate || null,
        progress: 0, tags: ["maintenance"],
        metadata: {
          resource_id: form.resource, resource_name: res?.name_en,
          maint_type: form.maintType, cost: parseFloat(form.cost) || 0,
          vendor_name: form.vendor || null, notes: form.notes || null,
          currency,
        },
      });
      if (created) onAdd(created as WorkItem);
      onClose();
    } catch { setError(ar ? "فشل الحفظ" : "Failed to save."); }
    finally { setLoading(false); }
  }

  return (
    <ModalShell title={ar ? "سجّل صيانة" : "Schedule Maintenance"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className={labelCls}>{ar ? "الأصل / المعدة" : "Asset"} <span className="text-rose-400">*</span></label>
          <select value={form.resource} onChange={(e) => setForm((f) => ({ ...f, resource: e.target.value }))} className={selectCls} required>
            <option value="">{ar ? "اختار..." : "Select..."}</option>
            {resources.filter((r) => !(r.skills ?? []).includes("inventory")).map((r) => <option key={r.id} value={r.id}>{r.name_en}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? "نوع الصيانة" : "Type"}</label>
            <select value={form.maintType} onChange={(e) => setForm((f) => ({ ...f, maintType: e.target.value }))} className={selectCls}>
              <option value="preventive">{ar ? "وقائية" : "Preventive"}</option>
              <option value="corrective">{ar ? "تصحيحية" : "Corrective"}</option>
              <option value="inspection">{ar ? "فحص" : "Inspection"}</option>
              <option value="emergency">{ar ? "طارئة" : "Emergency"}</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>{ar ? "التاريخ المجدول" : "Scheduled Date"}</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{ar ? `التكلفة (${currency})` : `Cost (${currency})`}</label>
            <input type="number" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} min="0" className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className={labelCls}>{ar ? "المورد" : "Vendor"}</label>
            <input type="text" value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} className={inputCls} placeholder={ar ? "اختياري" : "Optional"} />
          </div>
        </div>
        <div>
          <label className={labelCls}>{ar ? "ملاحظات" : "Notes"}</label>
          <input type="text" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
        </div>
        {error && <p className="text-[12px] text-rose-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">{ar ? "إلغاء" : "Cancel"}</button>
          <button type="submit" disabled={loading || !form.resource} className={btnPrimary + " flex-1 h-10"}>
            {loading && <Loader2 size={12} className="animate-spin" />} {ar ? "سجّل" : "Schedule"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Main Page ───────────────────────────────────────────

type InvTab = "dashboard" | "inventory" | "assets" | "movements" | "maintenance";

export default function Inventory() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  const ar = lang === "ar";
  const settings = workspace?.settings as Record<string, unknown> | undefined;
  const currency = (settings?.currency as string) || "SAR";

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [tab, setTab] = useState<InvTab>("dashboard");
  const [search, setSearch] = useState("");
  const [invModal, setInvModal] = useState(false);
  const [assetModal, setAssetModal] = useState(false);
  const [moveModal, setMoveModal] = useState(false);
  const [maintModal, setMaintModal] = useState(false);

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    const ds = getDataSource();
    Promise.all([ds.resources.list(workspace.id), ds.work_items.list(workspace.id)])
      .then(([r, w]) => { setResources(r as Resource[]); setWorkItems(w as WorkItem[]); })
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  const invItems = useMemo(() => resources.filter((r) => (r.skills ?? []).includes("inventory") || r.type === "inventory"), [resources]);
  const assets = useMemo(() => resources.filter((r) => !(r.skills ?? []).includes("inventory") && r.type !== "inventory"), [resources]);
  const movements = useMemo(() => workItems.filter((w) => w.type === "stock_movement"), [workItems]);
  const maintenance = useMemo(() => workItems.filter((w) => w.type === "maintenance"), [workItems]);

  const fmtVal = (v: number) => new Intl.NumberFormat(ar ? "ar-SA" : "en-SA", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

  // Metrics
  const totalStockValue = invItems.reduce((s, r) => { const m = getMeta(r); return s + ((m.quantity || 0) * (m.unit_cost || 0)); }, 0);
  const lowStock = invItems.filter((r) => { const m = getMeta(r); return m.inv_status === "low_stock" || ((m.quantity || 0) > 0 && (m.quantity || 0) <= (m.reorder_level || 0)); });
  const outOfStock = invItems.filter((r) => getMeta(r).inv_status === "out_of_stock" || getMeta(r).quantity === 0);
  const inMaintenance = maintenance.filter((m) => ["planned", "in_progress"].includes(m.status));
  const assignedAssets = assets.filter((r) => getMeta(r).asset_status === "assigned" || getMeta(r).assigned_to);
  const totalAssetValue = assets.reduce((s, r) => s + (getMeta(r).purchase_cost || 0), 0);

  const hasData = resources.length > 0 || movements.length > 0 || maintenance.length > 0;

  // Filtered
  const filteredInv = useMemo(() => { const q = search.toLowerCase().trim(); return !q ? invItems : invItems.filter((r) => r.name_en.toLowerCase().includes(q) || (getMeta(r).sku ?? "").toLowerCase().includes(q)); }, [invItems, search]);
  const filteredAssets = useMemo(() => { const q = search.toLowerCase().trim(); return !q ? assets : assets.filter((r) => r.name_en.toLowerCase().includes(q) || (getMeta(r).asset_tag ?? "").toLowerCase().includes(q)); }, [assets, search]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={20} className="animate-spin text-muted-foreground/40" /></div>;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border/40 px-7 md:px-10 py-7" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Package size={14} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "المخزون والأصول" : "Inventory & Assets"}</p>
          </div>
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
              {ar ? "المخزون والأصول" : "Inventory & Assets"}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setMoveModal(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium hover:bg-muted/50 transition-colors">
                <ArrowDownUp size={13} /> {ar ? "حركة مخزون" : "Movement"}
              </button>
              <button onClick={() => setMaintModal(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium hover:bg-muted/50 transition-colors">
                <Wrench size={13} /> {ar ? "صيانة" : "Maintenance"}
              </button>
              <button onClick={() => setInvModal(true)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium hover:bg-muted/50 transition-colors">
                <Box size={13} /> {ar ? "صنف مخزون" : "Inventory"}
              </button>
              <button onClick={() => setAssetModal(true)} className={btnPrimary + " h-9"}>
                <Plus size={14} /> {ar ? "أصل جديد" : "New Asset"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { icon: Box, value: invItems.length, label: ar ? "أصناف المخزون" : "Inventory Items", color: "text-violet-600" },
              { icon: DollarSign, value: fmtVal(totalStockValue), label: ar ? "قيمة المخزون" : "Stock Value", color: "text-primary", isText: true },
              { icon: AlertTriangle, value: lowStock.length, label: ar ? "كمية قليلة" : "Low Stock", color: lowStock.length > 0 ? "text-amber-600" : "text-slate-400" },
              { icon: Package, value: assets.length, label: ar ? "الأصول" : "Assets", color: "text-blue-600" },
              { icon: DollarSign, value: fmtVal(totalAssetValue), label: ar ? "قيمة الأصول" : "Asset Value", color: "text-foreground", isText: true },
              { icon: Wrench, value: inMaintenance.length, label: ar ? "في الصيانة" : "In Maintenance", color: inMaintenance.length > 0 ? "text-amber-600" : "text-slate-400" },
              { icon: CheckCircle2, value: assignedAssets.length, label: ar ? "مخصصة" : "Assigned", color: "text-emerald-600" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-3.5 py-3">
                <m.icon size={13} strokeWidth={1.75} className={m.color + " mb-1.5"} />
                <p className="text-[16px] font-medium text-foreground leading-none tabular-nums mb-0.5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                  {m.value}
                </p>
                <p className="text-[9px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-7 md:px-10 flex items-center gap-0 overflow-x-auto">
          {([
            { id: "dashboard" as const, en: "Overview", ar: "نظرة عامة" },
            { id: "inventory" as const, en: `Inventory (${invItems.length})`, ar: `المخزون (${invItems.length})` },
            { id: "assets" as const, en: `Assets (${assets.length})`, ar: `الأصول (${assets.length})` },
            { id: "movements" as const, en: `Movements (${movements.length})`, ar: `الحركات (${movements.length})` },
            { id: "maintenance" as const, en: `Maintenance (${maintenance.length})`, ar: `الصيانة (${maintenance.length})` },
          ]).map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
              className={`px-4 py-3 text-[12px] font-medium border-b-2 whitespace-nowrap transition-all ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {ar ? t.ar : t.en}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-7 md:px-10 py-6 max-w-[1100px]">
        {!hasData && tab === "dashboard" ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center"><Package size={24} className="text-muted-foreground/40" /></div>
            <div className="text-center max-w-[400px]">
              <p className="text-[15px] font-medium mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "مفيش بيانات مخزون أو أصول لسه" : "No inventory or assets yet"}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف أول صنف مخزون أو أصل عشان تبدأ." : "Add your first inventory item or asset to get started."}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setInvModal(true)} className={btnPrimary + " h-10"}><Box size={14} /> {ar ? "صنف مخزون" : "Add Inventory"}</button>
              <button onClick={() => setAssetModal(true)} className="flex items-center gap-2 h-10 px-5 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors"><Package size={14} /> {ar ? "أصل جديد" : "Add Asset"}</button>
            </div>
          </div>
        ) : tab === "dashboard" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low stock alerts */}
            <div>
              <h3 className="text-[13px] font-medium mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "تنبيهات المخزون" : "Stock Alerts"} {(lowStock.length + outOfStock.length) > 0 && <span className="text-amber-500 ml-1">{lowStock.length + outOfStock.length}</span>}
              </h3>
              {lowStock.length === 0 && outOfStock.length === 0 ? (
                <div className="p-4 rounded-xl border border-emerald-200/40 bg-emerald-50/20 text-center">
                  <CheckCircle2 size={20} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-[12px] text-emerald-700">{ar ? "المخزون كويس" : "Stock levels are healthy"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...outOfStock, ...lowStock].slice(0, 5).map((r) => {
                    const m = getMeta(r);
                    const isOut = m.inv_status === "out_of_stock" || m.quantity === 0;
                    return (
                      <div key={r.id} className={`flex items-center gap-3 p-3.5 rounded-xl border ${isOut ? "border-rose-200/40 bg-rose-50/20" : "border-amber-200/40 bg-amber-50/20"}`}>
                        <AlertTriangle size={14} className={isOut ? "text-rose-500" : "text-amber-500"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{r.name_en}</p>
                          <p className="text-[11px] text-muted-foreground">{ar ? "الكمية" : "Qty"}: {m.quantity ?? 0} {m.reorder_level ? `/ ${ar ? "حد الطلب" : "Reorder"}: ${m.reorder_level}` : ""}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isOut ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>
                          {isOut ? (ar ? "خلص" : "Out") : (ar ? "قليل" : "Low")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming maintenance */}
            <div>
              <h3 className="text-[13px] font-medium mb-3" style={{ fontFamily: "var(--app-font-serif)" }}>
                {ar ? "صيانة قادمة" : "Upcoming Maintenance"} {inMaintenance.length > 0 && <span className="text-amber-500 ml-1">{inMaintenance.length}</span>}
              </h3>
              {inMaintenance.length === 0 ? (
                <p className="text-[12px] text-muted-foreground/50 py-8 text-center">{ar ? "مفيش صيانة مجدولة" : "No scheduled maintenance"}</p>
              ) : (
                <div className="space-y-2">
                  {inMaintenance.slice(0, 5).map((m) => {
                    const meta = getMaintMeta(m);
                    const st = MAINT_STATUSES.find((s) => s.value === m.status) ?? MAINT_STATUSES[0];
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-background">
                        <Wrench size={14} className="text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">{meta.resource_name || m.title_en}</p>
                          <p className="text-[11px] text-muted-foreground">{meta.maint_type}{m.due_date ? ` · ${m.due_date.slice(0, 10)}` : ""}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.pill}`}>{ar ? st.ar : st.en}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : tab === "inventory" ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-[300px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث..." : "Search..."} className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="flex-1" />
              {invItems.length > 0 && <button onClick={() => exportCSV(invItems, `thoth-inventory-${new Date().toISOString().slice(0,10)}.csv`)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"><Download size={13} /> {ar ? "صدّر" : "Export"}</button>}
              <button onClick={() => setInvModal(true)} className={btnPrimary + " h-9"}><Plus size={14} /> {ar ? "ضيف" : "Add"}</button>
            </div>
            {filteredInv.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{search ? (ar ? "مفيش نتائج" : "No results") : (ar ? "مفيش أصناف مخزون" : "No inventory items")}</div>
            ) : (
              <div className="space-y-2">
                {filteredInv.map((r) => {
                  const m = getMeta(r);
                  const qty = m.quantity ?? 0;
                  const isLow = qty > 0 && qty <= (m.reorder_level || 0);
                  const isOut = qty === 0;
                  return (
                    <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background hover:shadow-sm transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {m.sku && <span className="text-[10.5px] font-mono text-muted-foreground">{m.sku}</span>}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isOut ? "bg-rose-100 text-rose-600" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {isOut ? (ar ? "خلص" : "Out of Stock") : isLow ? (ar ? "قليل" : "Low Stock") : (ar ? "متوفر" : "In Stock")}
                          </span>
                        </div>
                        <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{r.name_en}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{m.location || ""}{m.vendor_name ? ` · ${m.vendor_name}` : ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[16px] font-semibold tabular-nums" style={{ fontFamily: "var(--app-font-serif)" }}>{qty}</p>
                        <p className="text-[10px] text-muted-foreground">{ar ? "كمية" : "qty"}</p>
                      </div>
                      {m.unit_cost ? <p className="text-[13px] font-medium tabular-nums text-muted-foreground shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>{fmtVal(m.unit_cost)}</p> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === "assets" ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-[300px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث..." : "Search..."} className="w-full h-9 pl-9 pr-4 rounded-xl border border-border/60 bg-background text-[13px] focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
              <div className="flex-1" />
              {assets.length > 0 && <button onClick={() => exportCSV(assets, `thoth-assets-${new Date().toISOString().slice(0,10)}.csv`)} className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border/60 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"><Download size={13} /> {ar ? "صدّر" : "Export"}</button>}
              <button onClick={() => setAssetModal(true)} className={btnPrimary + " h-9"}><Plus size={14} /> {ar ? "ضيف" : "Add"}</button>
            </div>
            {filteredAssets.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{search ? (ar ? "مفيش نتائج" : "No results") : (ar ? "مفيش أصول" : "No assets")}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAssets.map((r) => {
                  const m = getMeta(r);
                  const cat = RESOURCE_CATEGORIES.find((c) => c.value === r.type) ?? RESOURCE_CATEGORIES[RESOURCE_CATEGORIES.length - 1];
                  const st = ASSET_STATUSES.find((s) => s.value === m.asset_status) ?? ASSET_STATUSES[0];
                  const CatIcon = cat.icon;
                  return (
                    <div key={r.id} className="bg-background border border-border/40 rounded-xl p-5 hover:shadow-sm hover:border-border/70 transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                          <CatIcon size={17} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium truncate" style={{ fontFamily: "var(--app-font-serif)" }}>{r.name_en}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {m.asset_tag && <span className="text-[10px] font-mono text-muted-foreground">{m.asset_tag}</span>}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.pill}`}>{ar ? st.ar : st.en}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                        {m.assigned_to && <span>{ar ? "متسلمها" : "Assigned to"}: {m.assigned_to}</span>}
                        {m.location && <span><MapPin size={10} className="inline mr-1" />{m.location}</span>}
                        {m.purchase_cost ? <span>{fmtVal(m.purchase_cost)}{m.purchase_date ? ` · ${m.purchase_date}` : ""}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === "movements" ? (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1" />
              <button onClick={() => setMoveModal(true)} className={btnPrimary + " h-9"}><Plus size={14} /> {ar ? "حركة جديدة" : "New Movement"}</button>
            </div>
            {movements.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{ar ? "مفيش حركات مخزون" : "No stock movements"}</div>
            ) : (
              <div className="space-y-2">
                {movements.map((w) => {
                  const m = getMoveMeta(w);
                  const mt = MOVE_TYPES.find((t) => t.value === m.move_type);
                  return (
                    <div key={w.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background">
                      <ArrowDownUp size={14} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium">{mt ? (ar ? mt.ar : mt.en) : m.move_type}</span>
                        </div>
                        <p className="text-[13px] font-medium truncate">{m.resource_name || w.title_en}</p>
                        <p className="text-[11px] text-muted-foreground">{m.reason || ""} · {w.created_at.slice(0, 10)}</p>
                      </div>
                      <p className="text-[16px] font-semibold tabular-nums shrink-0" style={{ fontFamily: "var(--app-font-serif)" }}>
                        {m.move_type === "stock_out" ? "-" : "+"}{m.move_qty}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Maintenance tab */
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1" />
              <button onClick={() => setMaintModal(true)} className={btnPrimary + " h-9"}><Plus size={14} /> {ar ? "سجّل صيانة" : "Schedule"}</button>
            </div>
            {maintenance.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-muted-foreground/50">{ar ? "مفيش سجلات صيانة" : "No maintenance records"}</div>
            ) : (
              <div className="space-y-2">
                {maintenance.map((w) => {
                  const m = getMaintMeta(w);
                  const st = MAINT_STATUSES.find((s) => s.value === w.status) ?? MAINT_STATUSES[0];
                  return (
                    <div key={w.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background hover:shadow-sm transition-all">
                      <Wrench size={14} className="text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.pill}`}>{ar ? st.ar : st.en}</span>
                          <span className="text-[10px] text-muted-foreground">{m.maint_type}</span>
                        </div>
                        <p className="text-[13px] font-medium truncate">{m.resource_name || w.title_en}</p>
                        <p className="text-[11px] text-muted-foreground">{m.vendor_name || ""}{w.due_date ? ` · ${w.due_date.slice(0, 10)}` : ""}</p>
                      </div>
                      {m.cost ? <p className="text-[13px] font-medium tabular-nums shrink-0">{fmtVal(m.cost)}</p> : null}
                      {w.status === "planned" && (
                        <button onClick={async () => { await getDataSource().work_items.update(workspace?.id ?? "", w.id, { status: "done", progress: 100 }); setWorkItems((prev) => prev.map((i) => i.id === w.id ? { ...i, status: "done" as WorkItem["status"], progress: 100 } : i)); }}
                          className="text-[11px] text-emerald-600 font-medium hover:opacity-70 shrink-0">{ar ? "اكتمل" : "Complete"}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {invModal && <AddItemModal mode="inventory" ar={ar} currency={currency} onClose={() => setInvModal(false)} onAdd={(r) => setResources((prev) => [r, ...prev])} />}
      {assetModal && <AddItemModal mode="asset" ar={ar} currency={currency} onClose={() => setAssetModal(false)} onAdd={(r) => setResources((prev) => [r, ...prev])} />}
      {moveModal && <AddMovementModal ar={ar} resources={invItems} onClose={() => setMoveModal(false)} onAdd={(w) => setWorkItems((prev) => [w, ...prev])} />}
      {maintModal && <AddMaintenanceModal ar={ar} resources={resources} currency={currency} onClose={() => setMaintModal(false)} onAdd={(w) => setWorkItems((prev) => [w, ...prev])} />}
    </div>
  );
}
