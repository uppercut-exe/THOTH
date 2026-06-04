/**
 * THOTH Intelligence Engine v1
 *
 * Pure functions that derive insights from the business graph.
 * No AI API calls — all logic is deterministic.
 * Designed as a reusable data layer for future AI integration.
 */

import { loadDeals, formatCurrency, STAGE_META, type Deal } from "./sales";
import { loadWorkItems, STATUS_META as W_SM, type WorkItem } from "./work";
import { loadInvoices, loadExpenses, type Invoice } from "./finance";
import { loadResources, type Resource } from "./resources";
import { ORGANIZATIONS, type Organization } from "./organizations";
import { PEOPLE, type Person } from "./people";

// ─── Types ────────────────────────────────────────────────

export type HealthLevel = "excellent" | "healthy" | "attention" | "at_risk";

export interface InsightCard {
  id: string;
  titleEn: string;
  titleAr: string;
  valueEn: string;
  valueAr: string;
  descEn: string;
  descAr: string;
  severity: "positive" | "neutral" | "warning" | "critical";
  module: "sales" | "work" | "finance" | "resources" | "organizations" | "people" | "system";
  entityId?: string;
  entityType?: string;
}

export interface RecommendedAction {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  priority: "high" | "medium" | "low";
  module: string;
  entityId?: string;
}

export interface BusinessHealth {
  score: number;
  level: HealthLevel;
  salesScore: number;
  workScore: number;
  financeScore: number;
  resourceScore: number;
}

export interface DashboardMetrics {
  revenueForecast: number;
  openOpportunities: number;
  workRiskScore: number;
  resourceUtilization: number;
  cashHealth: number;
  businessHealth: number;
}

// ─── Health level helpers ─────────────────────────────────

export function healthLevel(score: number): HealthLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "healthy";
  if (score >= 40) return "attention";
  return "at_risk";
}

export const HEALTH_META: Record<HealthLevel, { en: string; ar: string; color: string; bg: string }> = {
  excellent: { en: "Excellent",        ar: "ممتاز",       color: "text-emerald-600", bg: "bg-emerald-50" },
  healthy:   { en: "Healthy",          ar: "صحي",        color: "text-primary",     bg: "bg-primary/8" },
  attention: { en: "Attention Needed", ar: "يحتاج اهتمام", color: "text-amber-600",  bg: "bg-amber-50" },
  at_risk:   { en: "At Risk",          ar: "في خطر",     color: "text-rose-600",    bg: "bg-rose-50" },
};

// ─── Business Health Engine ───────────────────────────────

export function computeBusinessHealth(): BusinessHealth {
  const deals = loadDeals();
  const work = loadWorkItems();
  const invoices = loadInvoices();
  const resources = loadResources();

  // Sales score (0-100)
  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === "won");
  const lostDeals = deals.filter((d) => d.stage === "lost");
  const winRate = (wonDeals.length + lostDeals.length) > 0 ? wonDeals.length / (wonDeals.length + lostDeals.length) : 0.5;
  const pipelineHealth = Math.min(1, activeDeals.length / 5);
  const salesScore = Math.round((winRate * 50 + pipelineHealth * 50));

  // Work score (0-100)
  const totalWork = work.length;
  const doneWork = work.filter((w) => w.status === "done").length;
  const stuckWork = work.filter((w) => w.status === "backlog" && w.progress === 0).length;
  const completionRate = totalWork > 0 ? doneWork / totalWork : 0.5;
  const stuckPenalty = Math.min(0.3, stuckWork * 0.1);
  const workScore = Math.round(Math.max(0, (completionRate * 60 + 40 - stuckPenalty * 100)));

  // Finance score (0-100)
  const paidInv = invoices.filter((i) => i.status === "paid");
  const overdueInv = invoices.filter((i) => i.status === "overdue");
  const revenue = paidInv.reduce((s, i) => s + i.paidAmount, 0);
  const expenses = loadExpenses().reduce((s, e) => s + e.amount, 0);
  const profitMargin = revenue > 0 ? Math.max(0, (revenue - expenses) / revenue) : 0;
  const overduePenalty = Math.min(0.4, overdueInv.length * 0.15);
  const financeScore = Math.round(Math.max(0, (profitMargin * 60 + 40 - overduePenalty * 100)));

  // Resource score (0-100)
  const activeRes = resources.filter((r) => r.status !== "retired");
  const avgUtil = activeRes.length > 0 ? activeRes.reduce((s, r) => s + r.utilization, 0) / activeRes.length : 50;
  const overdueMaint = resources.flatMap((r) => r.maintenance).filter((m) => m.status === "overdue").length;
  const maintPenalty = Math.min(0.3, overdueMaint * 0.1);
  const resourceScore = Math.round(Math.max(0, (avgUtil * 0.7 + 30 - maintPenalty * 100)));

  const score = Math.round((salesScore * 0.3 + workScore * 0.25 + financeScore * 0.25 + resourceScore * 0.2));

  return { score, level: healthLevel(score), salesScore, workScore, financeScore, resourceScore };
}

// ─── Dashboard Metrics ────────────────────────────────────

export function computeDashboardMetrics(): DashboardMetrics {
  const health = computeBusinessHealth();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const expenses = loadExpenses();
  const resources = loadResources();

  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const forecast = activeDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const revenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const activeRes = resources.filter((r) => r.status !== "retired");
  const avgUtil = activeRes.length > 0 ? Math.round(activeRes.reduce((s, r) => s + r.utilization, 0) / activeRes.length) : 0;

  return {
    revenueForecast: Math.round(forecast),
    openOpportunities: activeDeals.length,
    workRiskScore: 100 - health.workScore,
    resourceUtilization: avgUtil,
    cashHealth: revenue > totalExpenses ? Math.round(((revenue - totalExpenses) / revenue) * 100) : 0,
    businessHealth: health.score,
  };
}

// ─── Sales Intelligence ───────────────────────────────────

export function getSalesInsights(): InsightCard[] {
  const deals = loadDeals();
  const active = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const stalled = active.filter((d) => d.stage === "lead");
  const negotiating = active.filter((d) => d.stage === "negotiation");
  const largest = [...active].sort((a, b) => b.value - a.value);
  const fmt = (v: number) => formatCurrency(v, "SAR");

  const insights: InsightCard[] = [];

  if (stalled.length > 0) insights.push({
    id: "si-stalled", titleEn: "Stalled Opportunities", titleAr: "فرص متوقفة",
    valueEn: `${stalled.length} deal${stalled.length > 1 ? "s" : ""} stuck in Lead stage`, valueAr: `${stalled.length} صفقة متوقفة في مرحلة العميل المحتمل`,
    descEn: `Total value: ${fmt(stalled.reduce((s, d) => s + d.value, 0))}. Consider qualifying or disqualifying.`, descAr: `القيمة الإجمالية: ${fmt(stalled.reduce((s, d) => s + d.value, 0))}. فكر في التأهيل أو الاستبعاد.`,
    severity: "warning", module: "sales",
  });

  if (negotiating.length > 0) insights.push({
    id: "si-closing", titleEn: "Likely Closures", titleAr: "إغلاقات محتملة",
    valueEn: `${negotiating.length} deal${negotiating.length > 1 ? "s" : ""} in negotiation (${fmt(negotiating.reduce((s, d) => s + d.value, 0))})`, valueAr: `${negotiating.length} صفقة في التفاوض (${fmt(negotiating.reduce((s, d) => s + d.value, 0))})`,
    descEn: "High probability of closing this month. Push for signed contracts.", descAr: "احتمال مرتفع للإغلاق هذا الشهر. ادفع نحو توقيع العقود.",
    severity: "positive", module: "sales",
  });

  if (largest.length > 0) insights.push({
    id: "si-largest", titleEn: "Largest Opportunity", titleAr: "أكبر فرصة",
    valueEn: `${largest[0].titleEn} — ${fmt(largest[0].value)}`, valueAr: `${largest[0].titleAr} — ${fmt(largest[0].value)}`,
    descEn: `Stage: ${STAGE_META[largest[0].stage].en}. Probability: ${largest[0].probability}%.`, descAr: `المرحلة: ${STAGE_META[largest[0].stage].ar}. الاحتمالية: ${largest[0].probability}%.`,
    severity: "neutral", module: "sales", entityId: largest[0].id, entityType: "deal",
  });

  return insights;
}

// ─── Work Intelligence ────────────────────────────────────

export function getWorkInsights(): InsightCard[] {
  const work = loadWorkItems();
  const backlog = work.filter((w) => w.status === "backlog");
  const inProgress = work.filter((w) => w.status === "in_progress");
  const urgent = work.filter((w) => w.priority === "urgent" && w.status !== "done");
  const highLoad = inProgress.filter((w) => w.progress < 30);

  const insights: InsightCard[] = [];

  if (backlog.length > 2) insights.push({
    id: "wi-backlog", titleEn: "Growing Backlog", titleAr: "تراكم متزايد",
    valueEn: `${backlog.length} items in backlog`, valueAr: `${backlog.length} عنصر في قائمة الانتظار`,
    descEn: "Consider prioritizing or delegating backlog items to maintain velocity.", descAr: "فكر في ترتيب الأولويات أو تفويض عناصر قائمة الانتظار للحفاظ على السرعة.",
    severity: "warning", module: "work",
  });

  if (urgent.length > 0) insights.push({
    id: "wi-urgent", titleEn: "Urgent Work Items", titleAr: "عمل عاجل",
    valueEn: `${urgent.length} urgent item${urgent.length > 1 ? "s" : ""} not yet completed`, valueAr: `${urgent.length} عنصر عاجل لم يكتمل بعد`,
    descEn: "These require immediate attention from assigned teams.", descAr: "تتطلب اهتماماً فورياً من الفرق المُعيّنة.",
    severity: "critical", module: "work",
  });

  if (highLoad.length > 0) insights.push({
    id: "wi-slow", titleEn: "Slow Progress Items", titleAr: "عناصر بطيئة التقدم",
    valueEn: `${highLoad.length} in-progress items under 30%`, valueAr: `${highLoad.length} عنصر قيد التنفيذ أقل من ٣٠%`,
    descEn: "Review blockers and consider reassigning resources.", descAr: "راجع العوائق وفكر في إعادة تخصيص الموارد.",
    severity: "warning", module: "work",
  });

  return insights;
}

// ─── Finance Intelligence ─────────────────────────────────

export function getFinanceInsights(): InsightCard[] {
  const invoices = loadInvoices();
  const overdue = invoices.filter((i) => i.status === "overdue");
  const revenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = invoices.filter((i) => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.amount - i.paidAmount, 0);
  const fmt = (v: number) => formatCurrency(v, "SAR");

  const insights: InsightCard[] = [];

  if (overdue.length > 0) insights.push({
    id: "fi-overdue", titleEn: "Overdue Invoices", titleAr: "فواتير متأخرة",
    valueEn: `${overdue.length} invoice${overdue.length > 1 ? "s" : ""} overdue (${fmt(overdue.reduce((s, i) => s + i.amount, 0))})`, valueAr: `${overdue.length} فاتورة متأخرة (${fmt(overdue.reduce((s, i) => s + i.amount, 0))})`,
    descEn: "Escalate collection immediately. Contact account managers.", descAr: "صعّد التحصيل فوراً. تواصل مع مديري الحسابات.",
    severity: "critical", module: "finance",
  });

  insights.push({
    id: "fi-revenue", titleEn: "Revenue Collected", titleAr: "الإيرادات المحصّلة",
    valueEn: fmt(revenue), valueAr: fmt(revenue),
    descEn: `Outstanding: ${fmt(outstanding)}. Collection rate: ${outstanding + revenue > 0 ? Math.round(revenue / (outstanding + revenue) * 100) : 100}%.`, descAr: `مستحق: ${fmt(outstanding)}. معدل التحصيل: ${outstanding + revenue > 0 ? Math.round(revenue / (outstanding + revenue) * 100) : 100}%.`,
    severity: revenue > outstanding ? "positive" : "warning", module: "finance",
  });

  return insights;
}

// ─── Resource Intelligence ────────────────────────────────

export function getResourceInsights(): InsightCard[] {
  const resources = loadResources();
  const underutil = resources.filter((r) => r.status === "active" && r.utilization < 30);
  const overdueMaint = resources.filter((r) => r.maintenance.some((m) => m.status === "overdue"));
  const highValue = [...resources].sort((a, b) => b.value - a.value).slice(0, 3);
  const fmt = (v: number) => formatCurrency(v, "SAR");

  const insights: InsightCard[] = [];

  if (underutil.length > 0) insights.push({
    id: "ri-underutil", titleEn: "Underutilized Assets", titleAr: "أصول منخفضة الاستخدام",
    valueEn: `${underutil.length} asset${underutil.length > 1 ? "s" : ""} below 30% utilization`, valueAr: `${underutil.length} أصل أقل من ٣٠% استخدام`,
    descEn: "Consider reassignment, subleasing, or retirement.", descAr: "فكر في إعادة التعيين أو التأجير الفرعي أو الإيقاف.",
    severity: "warning", module: "resources",
  });

  if (overdueMaint.length > 0) insights.push({
    id: "ri-maint", titleEn: "Maintenance Overdue", titleAr: "صيانة متأخرة",
    valueEn: `${overdueMaint.length} asset${overdueMaint.length > 1 ? "s" : ""} with overdue maintenance`, valueAr: `${overdueMaint.length} أصل بصيانة متأخرة`,
    descEn: "Schedule immediately to prevent equipment failure and safety risks.", descAr: "جدول فوراً لتجنب أعطال المعدات ومخاطر السلامة.",
    severity: "critical", module: "resources",
  });

  if (highValue.length > 0) insights.push({
    id: "ri-highval", titleEn: "Highest Value Assets", titleAr: "أعلى الأصول قيمة",
    valueEn: `${highValue[0].nameEn} — ${fmt(highValue[0].value)}`, valueAr: `${highValue[0].nameAr} — ${fmt(highValue[0].value)}`,
    descEn: `Top 3 assets represent ${fmt(highValue.reduce((s, r) => s + r.value, 0))} in total value.`, descAr: `أعلى ٣ أصول تمثل ${fmt(highValue.reduce((s, r) => s + r.value, 0))} في القيمة الإجمالية.`,
    severity: "neutral", module: "resources",
  });

  return insights;
}

// ─── Organization Intelligence ────────────────────────────

export function getOrgInsights(): InsightCard[] {
  const orgs = ORGANIZATIONS;
  const customers = orgs.filter((o) => o.relationship === "customer");
  const atRisk = orgs.filter((o) => o.healthScore < 60);
  const largest = [...customers].sort((a, b) => b.headcount - a.headcount);

  const insights: InsightCard[] = [];

  if (largest.length > 0) insights.push({
    id: "oi-largest", titleEn: "Largest Customer", titleAr: "أكبر عميل",
    valueEn: `${largest[0].nameEn} — ${largest[0].headcount} people`, valueAr: `${largest[0].nameAr} — ${largest[0].headcount} شخص`,
    descEn: "Key account. Maintain strong executive relationship.", descAr: "حساب رئيسي. حافظ على علاقة تنفيذية قوية.",
    severity: "positive", module: "organizations", entityId: largest[0].id, entityType: "organization",
  });

  if (atRisk.length > 0) insights.push({
    id: "oi-risk", titleEn: "At-Risk Accounts", titleAr: "حسابات في خطر",
    valueEn: `${atRisk.length} organization${atRisk.length > 1 ? "s" : ""} with health below 60`, valueAr: `${atRisk.length} منظمة بصحة أقل من ٦٠`,
    descEn: "Schedule executive reviews and address concerns proactively.", descAr: "جدول مراجعات تنفيذية ومعالجة المخاوف استباقياً.",
    severity: "warning", module: "organizations",
  });

  return insights;
}

// ─── People Intelligence ──────────────────────────────────

export function getPeopleInsights(): InsightCard[] {
  const people = PEOPLE;
  const active = people.filter((p) => p.status === "active");
  const inactive = people.filter((p) => p.status === "inactive");
  const leads = people.filter((p) => p.status === "lead");

  const insights: InsightCard[] = [];

  insights.push({
    id: "pi-active", titleEn: "Active Contacts", titleAr: "جهات اتصال نشطة",
    valueEn: `${active.length} active out of ${people.length} total`, valueAr: `${active.length} نشط من أصل ${people.length}`,
    descEn: "Engagement rate: " + Math.round(active.length / people.length * 100) + "%.", descAr: "معدل المشاركة: " + Math.round(active.length / people.length * 100) + "%.",
    severity: active.length > people.length * 0.5 ? "positive" : "warning", module: "people",
  });

  if (inactive.length > 0) insights.push({
    id: "pi-dormant", titleEn: "Dormant Contacts", titleAr: "جهات اتصال خاملة",
    valueEn: `${inactive.length} contact${inactive.length > 1 ? "s" : ""} inactive`, valueAr: `${inactive.length} جهة اتصال خاملة`,
    descEn: "Consider re-engagement campaigns or cleanup.", descAr: "فكر في حملات إعادة التواصل أو التنظيف.",
    severity: "warning", module: "people",
  });

  if (leads.length > 0) insights.push({
    id: "pi-leads", titleEn: "Unqualified Leads", titleAr: "عملاء محتملون غير مؤهلين",
    valueEn: `${leads.length} lead${leads.length > 1 ? "s" : ""} need qualification`, valueAr: `${leads.length} عميل محتمل يحتاج تأهيل`,
    descEn: "Schedule discovery calls to qualify or disqualify.", descAr: "جدول مكالمات استكشافية للتأهيل أو الاستبعاد.",
    severity: "neutral", module: "people",
  });

  return insights;
}

// ─── Recommended Actions ──────────────────────────────────

export function getRecommendedActions(): RecommendedAction[] {
  const deals = loadDeals();
  const work = loadWorkItems();
  const invoices = loadInvoices();
  const resources = loadResources();
  const actions: RecommendedAction[] = [];

  // Overdue invoices
  invoices.filter((i) => i.status === "overdue").forEach((i) => {
    actions.push({
      id: `ra-inv-${i.id}`, priority: "high", module: "finance", entityId: i.id,
      titleEn: `Collect overdue invoice ${i.number}`, titleAr: `حصّل الفاتورة المتأخرة ${i.number}`,
      descEn: `${formatCurrency(i.amount, i.currency)} from ${i.orgNameEn}. Contact ${i.contactNameEn}.`, descAr: `${formatCurrency(i.amount, i.currency)} من ${i.orgNameAr}. تواصل مع ${i.contactNameAr}.`,
    });
  });

  // Stalled deals
  deals.filter((d) => d.stage === "lead").forEach((d) => {
    actions.push({
      id: `ra-deal-${d.id}`, priority: "medium", module: "sales", entityId: d.id,
      titleEn: `Qualify lead: ${d.titleEn}`, titleAr: `أهّل العميل: ${d.titleAr}`,
      descEn: `${formatCurrency(d.value, d.currency)} potential. Schedule discovery call.`, descAr: `${formatCurrency(d.value, d.currency)} محتمل. جدول مكالمة استكشافية.`,
    });
  });

  // Overdue maintenance
  resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).forEach((r) => {
    actions.push({
      id: `ra-res-${r.id}`, priority: "high", module: "resources", entityId: r.id,
      titleEn: `Schedule maintenance for ${r.nameEn}`, titleAr: `جدول صيانة لـ ${r.nameAr}`,
      descEn: `Overdue at ${r.locationEn}. Avoid equipment failure.`, descAr: `متأخرة في ${r.locationAr}. تجنب أعطال المعدات.`,
    });
  });

  // Urgent work
  work.filter((w) => w.priority === "urgent" && w.status !== "done").forEach((w) => {
    actions.push({
      id: `ra-work-${w.id}`, priority: "high", module: "work", entityId: w.id,
      titleEn: `Complete urgent: ${w.titleEn}`, titleAr: `أكمل العاجل: ${w.titleAr}`,
      descEn: `Assigned to ${w.assigneeEn}. Progress: ${w.progress}%.`, descAr: `مُعيّن إلى ${w.assigneeAr}. التقدم: ${w.progress}%.`,
    });
  });

  // Negotiation deals — push to close
  deals.filter((d) => d.stage === "negotiation").forEach((d) => {
    actions.push({
      id: `ra-close-${d.id}`, priority: "medium", module: "sales", entityId: d.id,
      titleEn: `Push to close: ${d.titleEn}`, titleAr: `ادفع للإغلاق: ${d.titleAr}`,
      descEn: `${formatCurrency(d.value, d.currency)} at ${d.probability}% probability.`, descAr: `${formatCurrency(d.value, d.currency)} باحتمالية ${d.probability}%.`,
    });
  });

  return actions.sort((a, b) => (a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2) - (b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2));
}
