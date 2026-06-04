/**
 * Data Management Center
 *
 * Export all data, import CSVs, download templates, view record counts.
 */

import { useState, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { exportCSV, downloadTemplate, IMPORT_TEMPLATES, type ImportTemplate } from "../lib/csv-export";
import { CsvImport } from "../components/CsvImport";
import type { Database } from "../lib/database.types";
import {
  Database as DatabaseIcon, Download, Upload, FileText, Loader2,
  Building2, Users, Briefcase, ShoppingBag, Landmark, Package, Receipt, Activity,
  CheckCircle2,
} from "lucide-react";

type Tables = Database["public"]["Tables"];

interface ModuleCount {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: React.ElementType;
  color: string;
  count: number;
  data: Record<string, unknown>[];
  exportName: string;
  importTemplate?: ImportTemplate;
}

export default function DataManagement() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  const ar = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleCount[]>([]);
  const [importModal, setImportModal] = useState<ImportTemplate | null>(null);
  const [importAdapter, setImportAdapter] = useState<any>(null);

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    const ds = getDataSource();
    const wsId = workspace.id;
    Promise.all([
      ds.organizations.list(wsId),
      ds.people.list(wsId),
      ds.work_items.list(wsId),
      ds.deals.list(wsId),
      ds.invoices.list(wsId),
      ds.expenses.list(wsId),
      ds.payments.list(wsId),
      ds.resources.list(wsId),
      ds.activity_events.list(wsId),
    ]).then(([orgs, people, work, deals, invoices, expenses, payments, resources, activity]) => {
      setModules([
        { id: "organizations", labelEn: "Organizations", labelAr: "الشركات", icon: Building2, color: "text-emerald-600 bg-emerald-50", count: orgs.length, data: orgs, exportName: "organizations", importTemplate: IMPORT_TEMPLATES.find((t) => t.id === "organizations") },
        { id: "people", labelEn: "People", labelAr: "الأشخاص", icon: Users, color: "text-violet-600 bg-violet-50", count: people.length, data: people, exportName: "people", importTemplate: IMPORT_TEMPLATES.find((t) => t.id === "people") },
        { id: "work_items", labelEn: "Work Items", labelAr: "المهام", icon: Briefcase, color: "text-blue-600 bg-blue-50", count: work.length, data: work, exportName: "work-items", importTemplate: IMPORT_TEMPLATES.find((t) => t.id === "work_items") },
        { id: "deals", labelEn: "Deals", labelAr: "الصفقات", icon: ShoppingBag, color: "text-amber-600 bg-amber-50", count: deals.length, data: deals, exportName: "deals", importTemplate: IMPORT_TEMPLATES.find((t) => t.id === "deals") },
        { id: "invoices", labelEn: "Invoices", labelAr: "الفواتير", icon: FileText, color: "text-cyan-600 bg-cyan-50", count: invoices.length, data: invoices, exportName: "invoices", importTemplate: IMPORT_TEMPLATES.find((t) => t.id === "invoices") },
        { id: "expenses", labelEn: "Expenses", labelAr: "المصاريف", icon: Receipt, color: "text-rose-600 bg-rose-50", count: expenses.length, data: expenses, exportName: "expenses", importTemplate: IMPORT_TEMPLATES.find((t) => t.id === "expenses") },
        { id: "payments", labelEn: "Payments", labelAr: "المدفوعات", icon: Landmark, color: "text-primary bg-primary/8", count: payments.length, data: payments, exportName: "payments" },
        { id: "resources", labelEn: "Resources", labelAr: "الموارد", icon: Package, color: "text-orange-600 bg-orange-50", count: resources.length, data: resources, exportName: "resources" },
        { id: "activity", labelEn: "Activity Events", labelAr: "أحداث النشاط", icon: Activity, color: "text-slate-600 bg-slate-50", count: activity.length, data: activity, exportName: "activity" },
      ]);
    }).finally(() => setLoading(false));
  }, [workspace?.id]);

  const totalRecords = modules.reduce((s, m) => s + m.count, 0);
  const dateStr = new Date().toISOString().slice(0, 10);

  function exportAll() {
    modules.forEach((m) => {
      if (m.data.length > 0) {
        exportCSV(m.data as Record<string, unknown>[], `thoth-${m.exportName}-${dateStr}.csv`);
      }
    });
  }

  function openImport(tmpl: ImportTemplate) {
    const ds = getDataSource();
    const adapterMap: Record<string, any> = {
      organizations: ds.organizations,
      people: ds.people,
      deals: ds.deals,
      work_items: ds.work_items,
      invoices: ds.invoices,
      expenses: ds.expenses,
    };
    setImportAdapter(adapterMap[tmpl.id]);
    setImportModal(tmpl);
  }

  function handleImportComplete() {
    // Refresh data
    if (workspace?.id) {
      setLoading(true);
      const ds = getDataSource();
      const wsId = workspace.id;
      Promise.all([
        ds.organizations.list(wsId), ds.people.list(wsId), ds.work_items.list(wsId),
        ds.deals.list(wsId), ds.invoices.list(wsId), ds.expenses.list(wsId),
        ds.payments.list(wsId), ds.resources.list(wsId), ds.activity_events.list(wsId),
      ]).then(([orgs, people, work, deals, invoices, expenses, payments, resources, activity]) => {
        setModules((prev) => prev.map((m, i) => {
          const data = [orgs, people, work, deals, invoices, expenses, payments, resources, activity][i] as Record<string, unknown>[];
          return { ...m, count: data.length, data };
        }));
      }).finally(() => setLoading(false));
    }
  }

  return (
    <div className="min-h-full py-8 px-7 md:px-10 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2.5 mb-3">
          <DatabaseIcon size={14} strokeWidth={1.75} className="text-primary" />
          <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">
            {ar ? "إدارة البيانات" : "Data Management"}
          </p>
        </div>
        <h1 className="text-[28px] font-medium text-foreground leading-tight mb-3" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
          {ar ? "بياناتك" : "Your Data"}
        </h1>
        <p className="text-[13.5px] text-muted-foreground leading-relaxed max-w-[500px]">
          {ar
            ? "صدّر بياناتك، استورد ملفات CSV، أو حمّل نماذج جاهزة."
            : "Export your data, import CSV files, or download templates."}
        </p>
        {!loading && (
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/50 border border-emerald-200/40 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-700 font-medium">
                {ar ? `${totalRecords} سجل · بيانات حية` : `${totalRecords} records · Live data`}
              </span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button onClick={exportAll} disabled={totalRecords === 0}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
              <Download size={14} />
              {ar ? "صدّر كل البيانات" : "Export All Data"}
            </button>
          </div>

          {/* Module grid */}
          <div className="space-y-3 mb-10">
            {modules.map((m) => {
              const Icon = m.icon;
              const [iconCl, bgCl] = m.color.split(" ");
              return (
                <div key={m.id} className="flex items-center gap-4 p-4 bg-background border border-border/40 rounded-xl hover:border-border/60 transition-colors">
                  <div className={`w-10 h-10 rounded-xl ${bgCl} flex items-center justify-center shrink-0`}>
                    <Icon size={17} strokeWidth={1.75} className={iconCl} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-foreground">{ar ? m.labelAr : m.labelEn}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {m.count} {ar ? "سجل" : "records"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.count > 0 && (
                      <button onClick={() => exportCSV(m.data as Record<string, unknown>[], `thoth-${m.exportName}-${dateStr}.csv`)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                        <Download size={12} />
                        {ar ? "صدّر" : "Export"}
                      </button>
                    )}
                    {m.importTemplate && (
                      <>
                        <button onClick={() => downloadTemplate(m.importTemplate!.headers, `thoth-${m.id}-template.csv`)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                          <FileText size={12} />
                          {ar ? "نموذج" : "Template"}
                        </button>
                        <button onClick={() => openImport(m.importTemplate!)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/8 text-[11.5px] font-medium text-primary hover:bg-primary/12 transition-colors">
                          <Upload size={12} />
                          {ar ? "استورد" : "Import"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Templates section */}
          <div className="mb-10">
            <h2 className="text-[13px] font-semibold text-muted-foreground tracking-[0.08em] uppercase mb-4">
              {ar ? "نماذج جاهزة للتحميل" : "CSV Templates"}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {IMPORT_TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => downloadTemplate(t.headers, `thoth-${t.id}-template.csv`)}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-background hover:border-primary/30 hover:shadow-sm transition-all text-start">
                  <Download size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground truncate">{ar ? t.labelAr : t.labelEn}</p>
                    <p className="text-[10.5px] text-muted-foreground">{t.headers.length} {ar ? "عمود" : "columns"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Import Modal */}
      {importModal && importAdapter && (
        <CsvImport
          open={!!importModal}
          onClose={() => { setImportModal(null); setImportAdapter(null); }}
          template={importModal}
          adapter={importAdapter}
          ar={ar}
          onComplete={handleImportComplete}
        />
      )}
    </div>
  );
}
