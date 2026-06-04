/**
 * Operations Dashboard
 *
 * Real-time operational metrics from Supabase work_items.
 * Shows open work, in-progress, overdue, completed this week.
 */

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { isDemoMode } from "../lib/supabase";
import { getDataSource } from "../lib/data-source";
import { useLocation } from "wouter";
import type { Database } from "../lib/database.types";
import {
  Briefcase, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Loader2, Plus, ArrowRight, Zap, BarChart3,
  Layers, CircleDot, Timer, Target,
} from "lucide-react";

type WorkItem = Database["public"]["Tables"]["work_items"]["Row"];

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  backlog: { en: "Backlog", ar: "قائمة الانتظار" },
  planned: { en: "Planned", ar: "مخطط" },
  todo: { en: "To Do", ar: "للتنفيذ" },
  in_progress: { en: "In Progress", ar: "شغال عليها" },
  review: { en: "Review", ar: "مراجعة" },
  done: { en: "Done", ar: "خلصت" },
  blocked: { en: "Blocked", ar: "متوقفة" },
  cancelled: { en: "Cancelled", ar: "ملغية" },
};

const PRIORITY_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  critical: { en: "Critical", ar: "حرجة", color: "bg-red-100 text-red-700" },
  urgent: { en: "Urgent", ar: "عاجلة", color: "bg-rose-100 text-rose-600" },
  high: { en: "High", ar: "عالية", color: "bg-orange-100 text-orange-600" },
  medium: { en: "Medium", ar: "متوسطة", color: "bg-amber-100 text-amber-700" },
  low: { en: "Low", ar: "منخفضة", color: "bg-slate-100 text-slate-500" },
};

const TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  task: { en: "Task", ar: "مهمة" },
  project: { en: "Project", ar: "مشروع" },
  initiative: { en: "Initiative", ar: "مبادرة" },
  ticket: { en: "Ticket", ar: "تذكرة" },
  request: { en: "Request", ar: "طلب" },
  milestone: { en: "Milestone", ar: "إنجاز" },
  action: { en: "Action", ar: "إجراء" },
};

function isOverdue(item: WorkItem): boolean {
  if (!item.due_date || item.status === "done" || item.status === "cancelled") return false;
  return new Date(item.due_date) < new Date(new Date().toDateString());
}

function isDueToday(item: WorkItem): boolean {
  if (!item.due_date || item.status === "done" || item.status === "cancelled") return false;
  const today = new Date().toISOString().slice(0, 10);
  return item.due_date.slice(0, 10) === today;
}

function isCompletedThisWeek(item: WorkItem): boolean {
  if (item.status !== "done") return false;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return new Date(item.updated_at) >= weekAgo;
}

export default function Operations() {
  const { lang } = useLanguage();
  const { workspace } = useAuth();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WorkItem[]>([]);

  useEffect(() => {
    if (isDemoMode || !workspace?.id) { setLoading(false); return; }
    getDataSource().work_items.list(workspace.id)
      .then((d) => setItems(d as WorkItem[]))
      .finally(() => setLoading(false));
  }, [workspace?.id]);

  const open = items.filter((i) => ["backlog", "planned", "todo"].includes(i.status));
  const inProgress = items.filter((i) => i.status === "in_progress");
  const inReview = items.filter((i) => i.status === "review");
  const overdue = items.filter(isOverdue);
  const dueToday = items.filter(isDueToday);
  const completedWeek = items.filter(isCompletedThisWeek);
  const blocked = items.filter((i) => i.status === "blocked");
  const done = items.filter((i) => i.status === "done");
  const active = items.filter((i) => !["done", "cancelled"].includes(i.status));

  // By type breakdown
  const byType = useMemo(() => {
    const counts: Record<string, number> = {};
    active.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [active]);

  // By priority breakdown
  const byPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    active.forEach((i) => { counts[i.priority] = (counts[i.priority] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => {
      const order = ["critical", "urgent", "high", "medium", "low"];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });
  }, [active]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={20} className="animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-full py-8 px-7 md:px-10 max-w-[960px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <BarChart3 size={14} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">
              {ar ? "العمليات" : "Operations"}
            </p>
          </div>
          <h1 className="text-[28px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "لوحة العمليات" : "Operations Dashboard"}
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Briefcase size={24} className="text-muted-foreground/40" />
          </div>
          <div className="text-center max-w-[400px]">
            <p className="text-[15px] font-medium mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
              {ar ? "مفيش شغل لسه" : "No work items yet"}
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {ar
                ? "أنشئ أول مهمة أو مشروع عشان تبدأ تتابع شغلك. ممكن كمان تستورد بياناتك من ملف CSV."
                : "Create your first task or project to start tracking your operations. You can also import data from a CSV file."}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate("/work")}
              className="flex items-center gap-2 h-10 px-5 rounded-xl bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity">
              <Plus size={14} /> {ar ? "أنشئ مهمة" : "Create Work Item"}
            </button>
            <button onClick={() => navigate("/data")}
              className="flex items-center gap-2 h-10 px-5 rounded-xl border border-border/60 text-[13px] font-medium hover:bg-muted/50 transition-colors">
              {ar ? "استورد بيانات" : "Import Data"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* ── Header with metrics ── */}
      <div className="border-b border-border/40 px-7 md:px-10 py-7" style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <BarChart3 size={14} className="text-primary" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">
              {ar ? "العمليات" : "Operations"}
            </p>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight mb-5" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "نظرة تشغيلية" : "Operations Overview"}
          </h1>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { icon: Layers, value: open.length, label: ar ? "مفتوح" : "Open", color: "text-slate-600" },
              { icon: CircleDot, value: inProgress.length, label: ar ? "شغال عليها" : "In Progress", color: "text-blue-600" },
              { icon: Timer, value: inReview.length, label: ar ? "مراجعة" : "In Review", color: "text-violet-600" },
              { icon: AlertTriangle, value: overdue.length, label: ar ? "متأخرة" : "Overdue", color: overdue.length > 0 ? "text-rose-500" : "text-emerald-600" },
              { icon: CheckCircle2, value: completedWeek.length, label: ar ? "خلصت الأسبوع ده" : "Done This Week", color: "text-emerald-600" },
              { icon: Target, value: blocked.length, label: ar ? "متوقفة" : "Blocked", color: blocked.length > 0 ? "text-amber-600" : "text-slate-400" },
            ].map((m, i) => (
              <div key={i} className="bg-background border border-border/40 rounded-xl px-4 py-3.5">
                <m.icon size={14} strokeWidth={1.75} className={m.color + " mb-2"} />
                <p className="text-[20px] font-medium text-foreground leading-none tabular-nums mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em" }}>
                  {m.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-7 md:px-10 py-7 max-w-[1100px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

          {/* ── Left: Overdue + Due Today ── */}
          <div className="lg:col-span-2 space-y-7">

            {/* Overdue items */}
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-rose-500" />
                  <h2 className="text-[14px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                    {ar ? "متأخرة" : "Overdue"} <span className="text-rose-500 ml-1">{overdue.length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {overdue.slice(0, 5).map((item) => (
                    <WorkRow key={item.id} item={item} ar={ar} highlight="rose" />
                  ))}
                </div>
              </div>
            )}

            {/* Due today */}
            {dueToday.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-amber-500" />
                  <h2 className="text-[14px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                    {ar ? "مستحقة النهاردة" : "Due Today"} <span className="text-amber-500 ml-1">{dueToday.length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {dueToday.map((item) => (
                    <WorkRow key={item.id} item={item} ar={ar} highlight="amber" />
                  ))}
                </div>
              </div>
            )}

            {/* In progress */}
            {inProgress.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CircleDot size={14} className="text-blue-500" />
                    <h2 className="text-[14px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                      {ar ? "شغال عليها" : "In Progress"} <span className="text-blue-500 ml-1">{inProgress.length}</span>
                    </h2>
                  </div>
                  <button onClick={() => navigate("/work")} className="text-[11px] text-primary hover:opacity-70 flex items-center gap-1">
                    {ar ? "شوف الكل" : "View all"} <ArrowRight size={11} />
                  </button>
                </div>
                <div className="space-y-2">
                  {inProgress.slice(0, 5).map((item) => (
                    <WorkRow key={item.id} item={item} ar={ar} />
                  ))}
                </div>
              </div>
            )}

            {/* Recently completed */}
            {completedWeek.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <h2 className="text-[14px] font-medium" style={{ fontFamily: "var(--app-font-serif)" }}>
                    {ar ? "خلصت الأسبوع ده" : "Completed This Week"} <span className="text-emerald-500 ml-1">{completedWeek.length}</span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {completedWeek.slice(0, 5).map((item) => (
                    <WorkRow key={item.id} item={item} ar={ar} highlight="emerald" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Breakdown ── */}
          <div className="space-y-5">

            {/* By type */}
            <div className="border border-border/40 rounded-xl p-4 bg-background">
              <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "حسب النوع" : "By Type"}</p>
              {byType.map(([type, count]) => {
                const lbl = TYPE_LABELS[type] ?? { en: type, ar: type };
                return (
                  <div key={type} className="flex items-center justify-between py-1.5">
                    <span className="text-[12px] text-muted-foreground">{ar ? lbl.ar : lbl.en}</span>
                    <span className="text-[12px] font-medium tabular-nums">{count}</span>
                  </div>
                );
              })}
              {byType.length === 0 && <p className="text-[11px] text-muted-foreground/50">{ar ? "لا توجد بيانات" : "No data"}</p>}
            </div>

            {/* By priority */}
            <div className="border border-border/40 rounded-xl p-4 bg-background">
              <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "حسب الأولوية" : "By Priority"}</p>
              {byPriority.map(([prio, count]) => {
                const lbl = PRIORITY_LABELS[prio] ?? { en: prio, ar: prio, color: "bg-muted text-muted-foreground" };
                return (
                  <div key={prio} className="flex items-center justify-between py-1.5">
                    <span className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${lbl.color}`}>
                      {ar ? lbl.ar : lbl.en}
                    </span>
                    <span className="text-[12px] font-medium tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick nav */}
            <div className="border border-border/40 rounded-xl p-4 bg-background">
              <p className="text-[11px] font-medium text-foreground mb-3">{ar ? "إجراءات سريعة" : "Quick Actions"}</p>
              <div className="space-y-2">
                <button onClick={() => navigate("/work")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors text-left group">
                  <Briefcase size={13} className="text-primary shrink-0" />
                  <span className="text-[11.5px] font-medium text-foreground group-hover:text-primary">{ar ? "كل المهام" : "All Work Items"}</span>
                </button>
                <button onClick={() => navigate("/data")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors text-left group">
                  <TrendingUp size={13} className="text-primary shrink-0" />
                  <span className="text-[11.5px] font-medium text-foreground group-hover:text-primary">{ar ? "إدارة البيانات" : "Data Management"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Work row component ──────────────────────────────────

function WorkRow({ item, ar, highlight }: { item: WorkItem; ar: boolean; highlight?: "rose" | "amber" | "emerald" }) {
  const prio = PRIORITY_LABELS[item.priority] ?? { en: item.priority, ar: item.priority, color: "bg-muted text-muted-foreground" };
  const type = TYPE_LABELS[item.type] ?? { en: item.type, ar: item.type };
  const status = STATUS_LABELS[item.status] ?? { en: item.status, ar: item.status };

  const borderCls = highlight === "rose" ? "border-rose-200/50 bg-rose-50/20"
    : highlight === "amber" ? "border-amber-200/50 bg-amber-50/20"
    : highlight === "emerald" ? "border-emerald-200/50 bg-emerald-50/20"
    : "border-border/40 bg-background";

  return (
    <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border ${borderCls} hover:shadow-sm transition-all`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium capitalize">
            {ar ? type.ar : type.en}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${prio.color}`}>
            {ar ? prio.ar : prio.en}
          </span>
        </div>
        <p className="text-[13px] font-medium text-foreground truncate" style={{ fontFamily: "var(--app-font-serif)" }}>
          {ar ? (item.title_ar ?? item.title_en) : item.title_en}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10.5px] text-muted-foreground">
          <span>{ar ? status.ar : status.en}</span>
          {item.due_date && (
            <>
              <span className="text-border">·</span>
              <span className={isOverdue(item) ? "text-rose-500 font-medium" : ""}>{item.due_date.slice(0, 10)}</span>
            </>
          )}
          {item.progress > 0 && (
            <>
              <span className="text-border">·</span>
              <span>{item.progress}%</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
