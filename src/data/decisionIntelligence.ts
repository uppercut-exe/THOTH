/**
 * THOTH Sprint 21 — Decision Intelligence Layer
 *
 * Ten deterministic engines built on top of the Memory Graph.
 * No AI API calls — all insights derived from user data.
 */

import { loadDeals, formatCurrency, STAGE_META, type Deal } from "./sales";
import { loadWorkItems, STATUS_META, PRIORITY_META, type WorkItem } from "./work";
import { loadInvoices, loadExpenses, type Invoice } from "./finance";
import { loadResources, type Resource } from "./resources";
import { ORGANIZATIONS, type Organization } from "./organizations";
import { PEOPLE, type Person } from "./people";
import { loadRelationships, type Relationship } from "../memory/relationshipStore";
import { detectAutoRelationships, mergeAutoIntoStore } from "../memory/autoRelate";

// ─── Shared helpers ───────────────────────────────────────

function getAllRelationships(): Relationship[] {
  const stored = loadRelationships();
  const auto = detectAutoRelationships();
  return mergeAutoIntoStore(stored, auto);
}

function fmt(v: number) { return formatCurrency(v, "SAR"); }

// ─── 1. Decision Center ───────────────────────────────────

export interface StalledItem {
  id: string;
  type: "work" | "deal";
  titleEn: string;
  titleAr: string;
  statusEn: string;
  statusAr: string;
  stalledSince: string;
  progress?: number;
  severityReason: string;
  severityReasonAr: string;
  entityId: string;
}

export interface UnresolvedDecision {
  id: string;
  titleEn: string;
  titleAr: string;
  waitingOnEn: string;
  waitingOnAr: string;
  ageEn: string;
  ageAr: string;
  module: string;
  entityId: string;
}

export interface BlockerItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  severity: "high" | "medium";
  module: string;
  entityId?: string;
}

export interface DecisionCenterData {
  stalled: StalledItem[];
  unresolved: UnresolvedDecision[];
  blockers: BlockerItem[];
}

export function getDecisionCenterData(): DecisionCenterData {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();

  // Stalled work: backlog with 0 progress OR in_progress with progress < 15
  const stalled: StalledItem[] = [];

  work
    .filter((w) => w.status === "backlog" && w.progress === 0)
    .forEach((w) => {
      stalled.push({
        id: `stalled-${w.id}`,
        type: "work",
        titleEn: w.titleEn,
        titleAr: w.titleAr,
        statusEn: STATUS_META[w.status].en,
        statusAr: STATUS_META[w.status].ar,
        stalledSince: w.createdEn,
        progress: w.progress,
        severityReason: "Zero progress — no movement since creation",
        severityReasonAr: "لا تقدم — لم يتحرك منذ الإنشاء",
        entityId: w.id,
      });
    });

  work
    .filter((w) => w.status === "in_progress" && w.progress < 15)
    .forEach((w) => {
      stalled.push({
        id: `slow-${w.id}`,
        type: "work",
        titleEn: w.titleEn,
        titleAr: w.titleAr,
        statusEn: STATUS_META[w.status].en,
        statusAr: STATUS_META[w.status].ar,
        stalledSince: w.createdEn,
        progress: w.progress,
        severityReason: `Only ${w.progress}% complete — likely blocked`,
        severityReasonAr: `${w.progress}% فقط — من المحتمل أنه محظور`,
        entityId: w.id,
      });
    });

  // Stalled deals: stuck in lead stage
  deals
    .filter((d) => d.stage === "lead")
    .forEach((d) => {
      stalled.push({
        id: `deal-stalled-${d.id}`,
        type: "deal",
        titleEn: d.titleEn,
        titleAr: d.titleAr,
        statusEn: STAGE_META[d.stage].en,
        statusAr: STAGE_META[d.stage].ar,
        stalledSince: d.createdEn,
        severityReason: "Stuck in Lead — not progressing",
        severityReasonAr: "عالق في مرحلة العميل — لا تقدم",
        entityId: d.id,
      });
    });

  // Unresolved decisions: items in review status
  const unresolved: UnresolvedDecision[] = work
    .filter((w) => w.status === "review")
    .map((w) => ({
      id: `unresolved-${w.id}`,
      titleEn: w.titleEn,
      titleAr: w.titleAr,
      waitingOnEn: `Awaiting sign-off from ${w.assigneeEn}`,
      waitingOnAr: `بانتظار موافقة ${w.assigneeAr}`,
      ageEn: `Created ${w.createdEn}`,
      ageAr: `أُنشئ ${w.createdAr}`,
      module: "work",
      entityId: w.id,
    }));

  // Blockers
  const blockers: BlockerItem[] = [];

  work
    .filter((w) => w.priority === "urgent" && w.status !== "done")
    .forEach((w) => {
      blockers.push({
        id: `blocker-urg-${w.id}`,
        titleEn: `Urgent: ${w.titleEn}`,
        titleAr: `عاجل: ${w.titleAr}`,
        descEn: `${w.progress}% complete. Assigned to ${w.assigneeEn}. Due ${w.dueDateEn}.`,
        descAr: `${w.progress}% مكتمل. مُعيّن إلى ${w.assigneeAr}. موعد التسليم ${w.dueDateAr}.`,
        severity: "high",
        module: "work",
        entityId: w.id,
      });
    });

  invoices
    .filter((i) => i.status === "overdue")
    .forEach((i) => {
      blockers.push({
        id: `blocker-inv-${i.id}`,
        titleEn: `Overdue Invoice ${i.number}`,
        titleAr: `فاتورة متأخرة ${i.number}`,
        descEn: `${fmt(i.amount)} from ${i.orgNameEn} — blocks cash flow.`,
        descAr: `${fmt(i.amount)} من ${i.orgNameAr} — تعيق التدفق النقدي.`,
        severity: "high",
        module: "finance",
        entityId: i.id,
      });
    });

  resources
    .filter((r) => r.maintenance.some((m) => m.status === "overdue"))
    .forEach((r) => {
      blockers.push({
        id: `blocker-maint-${r.id}`,
        titleEn: `Maintenance Overdue: ${r.nameEn}`,
        titleAr: `صيانة متأخرة: ${r.nameAr}`,
        descEn: `Overdue maintenance at ${r.locationEn}. Risk of failure.`,
        descAr: `صيانة متأخرة في ${r.locationAr}. خطر العطل.`,
        severity: "high",
        module: "resources",
        entityId: r.id,
      });
    });

  deals
    .filter((d) => d.stage === "negotiation" && d.probability < 50)
    .forEach((d) => {
      blockers.push({
        id: `blocker-deal-${d.id}`,
        titleEn: `Low Confidence Negotiation: ${d.titleEn}`,
        titleAr: `تفاوض منخفض الثقة: ${d.titleAr}`,
        descEn: `${d.probability}% probability on ${fmt(d.value)} deal. Needs intervention.`,
        descAr: `احتمالية ${d.probability}% على صفقة ${fmt(d.value)}. تحتاج تدخلاً.`,
        severity: "medium",
        module: "sales",
        entityId: d.id,
      });
    });

  return { stalled, unresolved, blockers };
}

// ─── 2. Opportunity Engine ────────────────────────────────

export interface OpportunityCluster {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  items: Array<{ type: string; nameEn: string; nameAr: string }>;
  actionEn: string;
  actionAr: string;
  scoreLabel: string;
}

export function detectOpportunityClusters(): OpportunityCluster[] {
  const deals = loadDeals();
  const work = loadWorkItems();
  const invoices = loadInvoices();
  const rels = getAllRelationships();
  const clusters: OpportunityCluster[] = [];

  // Cluster: Organizations with active deals + pending work + no invoice → invoice gap
  const orgInvoiceIds = new Set(invoices.map((i) => i.orgId).filter(Boolean));
  const orgDealIds = new Set(deals.filter((d) => !["won", "lost"].includes(d.stage)).map((d) => d.orgId).filter(Boolean));

  ORGANIZATIONS.forEach((org) => {
    const hasActiveDeal = orgDealIds.has(org.id);
    const hasNoInvoice = !orgInvoiceIds.has(org.id);
    if (hasActiveDeal && hasNoInvoice) {
      const orgDeal = deals.find((d) => d.orgId === org.id && !["won", "lost"].includes(d.stage));
      clusters.push({
        id: `cluster-invoice-${org.id}`,
        titleEn: "Invoice Gap Detected",
        titleAr: "فجوة فواتير مكتشفة",
        descEn: `${org.nameEn} has an active deal (${orgDeal ? fmt(orgDeal.value) : ""}) but no invoice raised. Consider billing now.`,
        descAr: `${org.nameAr} لديها صفقة نشطة (${orgDeal ? fmt(orgDeal.value) : ""}) لكن لا توجد فاتورة. فكر في الفوترة الآن.`,
        items: [
          { type: "Organization", nameEn: org.nameEn, nameAr: org.nameAr },
          ...(orgDeal ? [{ type: "Deal", nameEn: orgDeal.titleEn, nameAr: orgDeal.titleAr }] : []),
        ],
        actionEn: "Raise Invoice",
        actionAr: "إصدار فاتورة",
        scoreLabel: "Revenue",
      });
    }
  });

  // Cluster: High-progress work near completion → potential upsell opportunity
  const nearDone = work.filter((w) => w.progress >= 80 && w.status !== "done");
  nearDone.forEach((w) => {
    clusters.push({
      id: `cluster-upsell-${w.id}`,
      titleEn: "Near-Completion Upsell Window",
      titleAr: "نافذة بيع إضافي قرب الاكتمال",
      descEn: `"${w.titleEn}" is ${w.progress}% complete. Client delivery soon — ideal moment to propose next engagement.`,
      descAr: `"${w.titleAr}" اكتمل ${w.progress}%. التسليم قريب — لحظة مثالية لاقتراح الخطوة التالية.`,
      items: [{ type: "Work", nameEn: w.titleEn, nameAr: w.titleAr }],
      actionEn: "Propose Follow-on",
      actionAr: "اقتراح متابعة",
      scoreLabel: "Growth",
    });
  });

  // Cluster: People connected to multiple orgs but no active deal
  const personOrgRels = rels.filter((r) => r.targetType === "organization" || r.sourceType === "organization");
  const personWorkRels = rels.filter((r) => r.targetType === "person" || r.sourceType === "person");
  const connectedPersonIds = new Set(personWorkRels.map((r) => r.sourceType === "person" ? r.sourceId : r.targetId));

  PEOPLE.filter((p) => p.status === "active" && connectedPersonIds.has(p.id)).forEach((p) => {
    const orgConnections = personOrgRels.filter(
      (r) =>
        (r.sourceType === "person" && r.sourceId === p.id) ||
        (r.targetType === "person" && r.targetId === p.id)
    );
    if (orgConnections.length >= 1) {
      clusters.push({
        id: `cluster-person-${p.id}`,
        titleEn: "Untapped Contact Network",
        titleAr: "شبكة اتصالات غير مستغلة",
        descEn: `${p.nameEn} is active with ${orgConnections.length} org connection(s) but has no open deal. Strong outreach candidate.`,
        descAr: `${p.nameEn} نشط مع ${orgConnections.length} اتصال بمنظمة لكن لا توجد صفقة مفتوحة. مرشح قوي للتواصل.`,
        items: [{ type: "Person", nameEn: p.nameEn, nameAr: p.nameAr }],
        actionEn: "Open Opportunity",
        actionAr: "فتح فرصة",
        scoreLabel: "Pipeline",
      });
    }
  });

  // Cluster: Won deals with no follow-up invoice
  const wonDealIds = new Set(deals.filter((d) => d.stage === "won").map((d) => d.id));
  const invoicedDealIds = new Set(invoices.map((i) => i.relatedDealId).filter(Boolean));
  deals
    .filter((d) => d.stage === "won" && !invoicedDealIds.has(d.id))
    .forEach((d) => {
      clusters.push({
        id: `cluster-won-${d.id}`,
        titleEn: "Won Deal — No Invoice",
        titleAr: "صفقة رابحة — بلا فاتورة",
        descEn: `"${d.titleEn}" (${fmt(d.value)}) was won but no invoice exists. Revenue is not captured.`,
        descAr: `"${d.titleAr}" (${fmt(d.value)}) تم ربحها لكن لا توجد فاتورة. الإيرادات غير محصّلة.`,
        items: [{ type: "Deal", nameEn: d.titleEn, nameAr: d.titleAr }],
        actionEn: "Issue Invoice",
        actionAr: "إصدار فاتورة",
        scoreLabel: "Revenue",
      });
    });

  return clusters.slice(0, 8);
}

// ─── 3. Pattern Detection ─────────────────────────────────

export interface ProductivityPattern {
  id: string;
  type: "success" | "failure" | "neutral";
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  metric: string;
  metricAr: string;
}

export interface AssigneePattern {
  name: string;
  nameAr: string;
  assigned: number;
  completed: number;
  completionRate: number;
  avgProgress: number;
}

export interface PatternData {
  patterns: ProductivityPattern[];
  assignees: AssigneePattern[];
  successRate: number;
  velocityTrend: "improving" | "stable" | "declining";
}

export function analyzePatterns(): PatternData {
  const work = loadWorkItems();
  const deals = loadDeals();

  const done = work.filter((w) => w.status === "done");
  const stuck = work.filter((w) => w.status === "backlog" && w.progress === 0);
  const inFlight = work.filter((w) => ["in_progress", "review"].includes(w.status));
  const urgent = work.filter((w) => w.priority === "urgent");
  const urgentDone = urgent.filter((w) => w.status === "done");

  const successRate = work.length > 0 ? Math.round((done.length / work.length) * 100) : 0;

  // Assignee breakdown
  const assigneeMap = new Map<string, { nameAr: string; items: WorkItem[] }>();
  work.forEach((w) => {
    if (!assigneeMap.has(w.assigneeEn)) {
      assigneeMap.set(w.assigneeEn, { nameAr: w.assigneeAr, items: [] });
    }
    assigneeMap.get(w.assigneeEn)!.items.push(w);
  });

  const assignees: AssigneePattern[] = Array.from(assigneeMap.entries())
    .map(([name, { nameAr, items }]) => {
      const completed = items.filter((i) => i.status === "done").length;
      const avgProgress = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0;
      return {
        name,
        nameAr,
        assigned: items.length,
        completed,
        completionRate: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
        avgProgress,
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate);

  const patterns: ProductivityPattern[] = [];

  // Success patterns
  if (done.length > 0) {
    const highPriorityDone = done.filter((w) => ["urgent", "high"].includes(w.priority)).length;
    patterns.push({
      id: "p-high-done",
      type: "success",
      titleEn: "High-Priority Execution",
      titleAr: "تنفيذ عالي الأولوية",
      descEn: `${highPriorityDone} of ${done.length} completed items were high or urgent priority. Team responds well to critical work.`,
      descAr: `${highPriorityDone} من أصل ${done.length} عنصر مكتمل كان ذا أولوية عالية أو عاجلة. الفريق يستجيب جيداً للعمل الحرج.`,
      metric: `${Math.round((highPriorityDone / Math.max(done.length, 1)) * 100)}% high-priority completion`,
      metricAr: `${Math.round((highPriorityDone / Math.max(done.length, 1)) * 100)}% إنجاز عالي الأولوية`,
    });
  }

  if (urgentDone.length > 0 && urgent.length > 0) {
    patterns.push({
      id: "p-urgent-resp",
      type: "success",
      titleEn: "Urgent Response Rate",
      titleAr: "معدل الاستجابة للعاجل",
      descEn: `${urgentDone.length} of ${urgent.length} urgent items resolved. Strong crisis handling.`,
      descAr: `${urgentDone.length} من أصل ${urgent.length} عنصر عاجل تم حله. إدارة أزمات قوية.`,
      metric: `${Math.round((urgentDone.length / urgent.length) * 100)}% urgent completion`,
      metricAr: `${Math.round((urgentDone.length / urgent.length) * 100)}% إنجاز عاجل`,
    });
  }

  // Won deals pattern
  const wonDeals = deals.filter((d) => d.stage === "won");
  const totalClosedDeals = deals.filter((d) => ["won", "lost"].includes(d.stage));
  if (totalClosedDeals.length > 0) {
    const winRate = Math.round((wonDeals.length / totalClosedDeals.length) * 100);
    patterns.push({
      id: "p-win-rate",
      type: winRate >= 50 ? "success" : "failure",
      titleEn: "Sales Win Rate",
      titleAr: "معدل الفوز في المبيعات",
      descEn: `${winRate}% of closed deals were won. ${winRate >= 60 ? "Above average performance." : "Below target — review qualification process."}`,
      descAr: `${winRate}% من الصفقات المغلقة تم الفوز بها. ${winRate >= 60 ? "أداء فوق المتوسط." : "أقل من الهدف — راجع عملية التأهيل."}`,
      metric: `${winRate}% win rate`,
      metricAr: `${winRate}% معدل الفوز`,
    });
  }

  // Failure patterns
  if (stuck.length > 2) {
    patterns.push({
      id: "p-backlog-bloat",
      type: "failure",
      titleEn: "Backlog Accumulation",
      titleAr: "تراكم قائمة الانتظار",
      descEn: `${stuck.length} items stuck at 0% with no movement. Indicates insufficient triage and planning cadence.`,
      descAr: `${stuck.length} عنصر عالق عند 0% بلا حركة. يشير إلى قصور في الفرز وإيقاع التخطيط.`,
      metric: `${stuck.length} items stagnant`,
      metricAr: `${stuck.length} عنصر راكد`,
    });
  }

  const highLoadAssignees = assignees.filter((a) => a.assigned >= 3 && a.completionRate < 30);
  if (highLoadAssignees.length > 0) {
    patterns.push({
      id: "p-overload",
      type: "failure",
      titleEn: "Team Overload Pattern",
      titleAr: "نمط زيادة الحمل على الفريق",
      descEn: `${highLoadAssignees.length} team member(s) have 3+ items with <30% completion. Risk of burnout or hidden blockers.`,
      descAr: `${highLoadAssignees.length} من أعضاء الفريق لديهم 3+ عناصر بنسبة إنجاز أقل من 30%. خطر الإرهاق أو عوائق مخفية.`,
      metric: `${highLoadAssignees.length} overloaded assignees`,
      metricAr: `${highLoadAssignees.length} معيّن مرهق`,
    });
  }

  const avgProgress = inFlight.length > 0 ? inFlight.reduce((s, w) => s + w.progress, 0) / inFlight.length : 0;
  const velocityTrend: "improving" | "stable" | "declining" =
    avgProgress > 50 ? "improving" : avgProgress > 25 ? "stable" : "declining";

  return { patterns, assignees, successRate, velocityTrend };
}

// ─── 4. Goal Drift Detection ──────────────────────────────

export interface GoalDriftItem {
  id: string;
  goalEn: string;
  goalAr: string;
  currentStateEn: string;
  currentStateAr: string;
  driftLevel: "on_track" | "drifting" | "neglected";
  evidenceEn: string;
  evidenceAr: string;
  actionEn: string;
  actionAr: string;
}

export function detectGoalDrift(industry?: string): GoalDriftItem[] {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const people = PEOPLE;
  const orgs = ORGANIZATIONS;

  const items: GoalDriftItem[] = [];

  // Goal: Revenue Growth
  const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === "won");
  const pipelineValue = openDeals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const revenueGoalDrift: GoalDriftItem = {
    id: "gd-revenue",
    goalEn: "Revenue Growth",
    goalAr: "نمو الإيرادات",
    currentStateEn: `${openDeals.length} active opportunities (${fmt(pipelineValue)} weighted pipeline)`,
    currentStateAr: `${openDeals.length} فرص نشطة (${fmt(pipelineValue)} خط أنابيب مرجّح)`,
    driftLevel: openDeals.length >= 3 ? "on_track" : openDeals.length >= 1 ? "drifting" : "neglected",
    evidenceEn: openDeals.length >= 3
      ? `${wonDeals.length} deals won. Strong pipeline activity.`
      : openDeals.length >= 1
      ? "Pipeline is thin. Less than 3 active opportunities."
      : "No active deals. Revenue growth has stalled.",
    evidenceAr: openDeals.length >= 3
      ? `${wonDeals.length} صفقات مربوحة. نشاط قوي في خط الأنابيب.`
      : openDeals.length >= 1
      ? "خط الأنابيب نحيل. أقل من 3 فرص نشطة."
      : "لا صفقات نشطة. توقف نمو الإيرادات.",
    actionEn: "Add 3 new qualified leads to pipeline",
    actionAr: "أضف 3 عملاء محتملين مؤهلين إلى خط الأنابيب",
  };
  items.push(revenueGoalDrift);

  // Goal: Operational Excellence
  const doneWork = work.filter((w) => w.status === "done");
  const completionRate = work.length > 0 ? Math.round((doneWork.length / work.length) * 100) : 0;
  items.push({
    id: "gd-ops",
    goalEn: "Operational Excellence",
    goalAr: "التميز التشغيلي",
    currentStateEn: `${completionRate}% work completion rate (${doneWork.length}/${work.length} items)`,
    currentStateAr: `${completionRate}% معدل إنجاز العمل (${doneWork.length}/${work.length} عناصر)`,
    driftLevel: completionRate >= 60 ? "on_track" : completionRate >= 30 ? "drifting" : "neglected",
    evidenceEn: completionRate >= 60
      ? "Strong execution cadence. Team is shipping."
      : completionRate >= 30
      ? "Work is in flight but completion lags. Review blockers."
      : "Low completion rate signals execution breakdown.",
    evidenceAr: completionRate >= 60
      ? "إيقاع تنفيذ قوي. الفريق يُنجز."
      : completionRate >= 30
      ? "العمل جارٍ لكن الإنجاز يتأخر. راجع العوائق."
      : "معدل إنجاز منخفض يشير إلى انهيار التنفيذ.",
    actionEn: "Clear backlog — close or prioritize 3 items this week",
    actionAr: "نظّف قائمة الانتظار — أغلق أو رتّب أولويات 3 عناصر هذا الأسبوع",
  });

  // Goal: Cash Flow Health
  const overdueInv = invoices.filter((i) => i.status === "overdue");
  const collectedInv = invoices.filter((i) => i.status === "paid");
  const collectionRate =
    invoices.length > 0 ? Math.round((collectedInv.length / invoices.length) * 100) : 100;
  items.push({
    id: "gd-cash",
    goalEn: "Cash Flow Health",
    goalAr: "صحة التدفق النقدي",
    currentStateEn: `${collectionRate}% invoice collection rate. ${overdueInv.length} overdue.`,
    currentStateAr: `${collectionRate}% معدل تحصيل الفواتير. ${overdueInv.length} متأخرة.`,
    driftLevel: overdueInv.length === 0 ? "on_track" : overdueInv.length <= 2 ? "drifting" : "neglected",
    evidenceEn: overdueInv.length === 0
      ? "All invoices collected on time. Excellent cash position."
      : `${overdueInv.length} overdue invoice(s) worth ${fmt(overdueInv.reduce((s, i) => s + i.amount, 0))}.`,
    evidenceAr: overdueInv.length === 0
      ? "جميع الفواتير محصّلة في الوقت. وضع نقدي ممتاز."
      : `${overdueInv.length} فاتورة متأخرة بقيمة ${fmt(overdueInv.reduce((s, i) => s + i.amount, 0))}.`,
    actionEn: "Escalate overdue collections immediately",
    actionAr: "صعّد التحصيلات المتأخرة فوراً",
  });

  // Goal: Relationship Depth
  const activeContacts = people.filter((p) => p.status === "active");
  const contactEngagement = Math.round((activeContacts.length / Math.max(people.length, 1)) * 100);
  items.push({
    id: "gd-relationships",
    goalEn: "Relationship Depth",
    goalAr: "عمق العلاقات",
    currentStateEn: `${activeContacts.length} active contacts (${contactEngagement}% engagement)`,
    currentStateAr: `${activeContacts.length} جهة اتصال نشطة (${contactEngagement}% مشاركة)`,
    driftLevel: contactEngagement >= 60 ? "on_track" : contactEngagement >= 35 ? "drifting" : "neglected",
    evidenceEn: contactEngagement >= 60
      ? "Network is healthy and active."
      : `${people.filter((p) => p.status === "inactive").length} dormant contacts need re-engagement.`,
    evidenceAr: contactEngagement >= 60
      ? "الشبكة صحية ونشطة."
      : `${people.filter((p) => p.status === "inactive").length} جهة اتصال خاملة تحتاج إعادة تواصل.`,
    actionEn: "Schedule 3 re-engagement calls with dormant contacts",
    actionAr: "جدول 3 مكالمات إعادة تواصل مع الجهات الخاملة",
  });

  // Goal: Asset Utilization
  const resources = loadResources();
  const activeRes = resources.filter((r) => r.status === "active");
  const avgUtil = activeRes.length > 0
    ? Math.round(activeRes.reduce((s, r) => s + r.utilization, 0) / activeRes.length)
    : 0;
  items.push({
    id: "gd-assets",
    goalEn: "Asset Utilization",
    goalAr: "استخدام الأصول",
    currentStateEn: `${avgUtil}% average resource utilization across ${activeRes.length} active assets`,
    currentStateAr: `${avgUtil}% متوسط استخدام الموارد عبر ${activeRes.length} أصل نشط`,
    driftLevel: avgUtil >= 65 ? "on_track" : avgUtil >= 40 ? "drifting" : "neglected",
    evidenceEn: avgUtil >= 65
      ? "Resources are well deployed."
      : `${resources.filter((r) => r.utilization < 30).length} assets below 30% utilization — idle capital.`,
    evidenceAr: avgUtil >= 65
      ? "الموارد موزعة جيداً."
      : `${resources.filter((r) => r.utilization < 30).length} أصول أقل من 30% استخداماً — رأس مال عاطل.`,
    actionEn: "Reassign or sublease underutilized assets",
    actionAr: "أعد تعيين أو أجّر الأصول منخفضة الاستخدام",
  });

  return items;
}

// ─── 5. Project Health System ─────────────────────────────

export interface ProjectHealth {
  id: string;
  titleEn: string;
  titleAr: string;
  score: number;
  level: "healthy" | "at_risk" | "critical";
  momentum: number;
  activity: number;
  blockerCount: number;
  statusEn: string;
  statusAr: string;
  assigneeEn: string;
  dueDateEn: string;
  progress: number;
}

export function computeProjectHealthScores(): ProjectHealth[] {
  const work = loadWorkItems();

  return work
    .filter((w) => w.status !== "done")
    .map((w) => {
      // Momentum: based on progress and status
      const statusMomentum: Record<string, number> = {
        in_progress: 60,
        review: 75,
        planned: 45,
        backlog: 10,
      };
      const baseMomentum = statusMomentum[w.status] || 20;
      const momentum = Math.min(100, baseMomentum + w.progress * 0.4);

      // Activity: simulated from priority and kind
      const priorityBonus: Record<string, number> = { urgent: 40, high: 25, medium: 15, low: 5 };
      const activity = Math.min(100, priorityBonus[w.priority] + (w.progress > 0 ? 30 : 0));

      // Blockers: urgent items not moving, or 0 progress in_progress
      const blockerCount =
        (w.priority === "urgent" && w.progress < 20 ? 1 : 0) +
        (w.status === "in_progress" && w.progress < 10 ? 1 : 0);

      const rawScore = momentum * 0.4 + activity * 0.3 + Math.max(0, 100 - blockerCount * 30) * 0.3;
      const score = Math.round(Math.min(100, Math.max(0, rawScore)));

      const level: ProjectHealth["level"] =
        score >= 65 ? "healthy" : score >= 35 ? "at_risk" : "critical";

      return {
        id: w.id,
        titleEn: w.titleEn,
        titleAr: w.titleAr,
        score,
        level,
        momentum: Math.round(momentum),
        activity: Math.round(activity),
        blockerCount,
        statusEn: STATUS_META[w.status].en,
        statusAr: STATUS_META[w.status].ar,
        assigneeEn: w.assigneeEn,
        dueDateEn: w.dueDateEn,
        progress: w.progress,
      };
    })
    .sort((a, b) => a.score - b.score);
}

// ─── 6. Focus Recommendation Engine ──────────────────────

export interface FocusItem {
  id: string;
  titleEn: string;
  titleAr: string;
  whyEn: string;
  whyAr: string;
  leverageEn: string;
  leverageAr: string;
  leverageScore: number;
  module: string;
  entityId?: string;
  timeEst: string;
}

export function getDailyFocusItems(): FocusItem[] {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();
  const items: FocusItem[] = [];

  // 1. Collect overdue invoices — highest financial leverage
  invoices.filter((i) => i.status === "overdue").forEach((i) => {
    items.push({
      id: `focus-inv-${i.id}`,
      titleEn: `Collect ${i.number} from ${i.orgNameEn}`,
      titleAr: `حصّل ${i.number} من ${i.orgNameAr}`,
      whyEn: `${fmt(i.amount)} is locked in an overdue invoice. Every day costs cash flow.`,
      whyAr: `${fmt(i.amount)} محجوزة في فاتورة متأخرة. كل يوم يكلف التدفق النقدي.`,
      leverageEn: "Cash Flow",
      leverageAr: "التدفق النقدي",
      leverageScore: 95,
      module: "finance",
      entityId: i.id,
      timeEst: "15 min",
    });
  });

  // 2. High-progress work — easy wins
  work
    .filter((w) => w.progress >= 80 && w.status !== "done")
    .forEach((w) => {
      items.push({
        id: `focus-close-${w.id}`,
        titleEn: `Close out: ${w.titleEn}`,
        titleAr: `أنهِ: ${w.titleAr}`,
        whyEn: `At ${w.progress}% — finishing this today builds momentum and frees the team.`,
        whyAr: `عند ${w.progress}% — إنهاؤه اليوم يبني الزخم ويُحرر الفريق.`,
        leverageEn: "Momentum",
        leverageAr: "الزخم",
        leverageScore: 88,
        module: "work",
        entityId: w.id,
        timeEst: "1-2 hrs",
      });
    });

  // 3. Negotiation deals — close to revenue
  deals
    .filter((d) => d.stage === "negotiation")
    .forEach((d) => {
      items.push({
        id: `focus-deal-${d.id}`,
        titleEn: `Push to close: ${d.titleEn}`,
        titleAr: `ادفع للإغلاق: ${d.titleAr}`,
        whyEn: `${fmt(d.value)} at ${d.probability}% — one conversation could seal this.`,
        whyAr: `${fmt(d.value)} بنسبة ${d.probability}% — محادثة واحدة قد تختم الصفقة.`,
        leverageEn: "Revenue",
        leverageAr: "الإيرادات",
        leverageScore: 90,
        module: "sales",
        entityId: d.id,
        timeEst: "30 min",
      });
    });

  // 4. Urgent work
  work
    .filter((w) => w.priority === "urgent" && w.status !== "done")
    .forEach((w) => {
      items.push({
        id: `focus-urg-${w.id}`,
        titleEn: `Unblock urgent: ${w.titleEn}`,
        titleAr: `رفع الحظر عن: ${w.titleAr}`,
        whyEn: `Urgent priority with ${w.progress}% done. Delay compounds risk for ${w.assigneeEn}.`,
        whyAr: `أولوية عاجلة وإنجاز ${w.progress}%. التأخير يزيد المخاطر على ${w.assigneeAr}.`,
        leverageEn: "Risk Reduction",
        leverageAr: "تقليل المخاطر",
        leverageScore: 92,
        module: "work",
        entityId: w.id,
        timeEst: "Varies",
      });
    });

  // 5. At-risk organizations
  ORGANIZATIONS.filter((o) => o.healthScore < 55).forEach((o) => {
    items.push({
      id: `focus-org-${o.id}`,
      titleEn: `Re-engage ${o.nameEn}`,
      titleAr: `أعد التواصل مع ${o.nameAr}`,
      whyEn: `Health score ${o.healthScore}/100. Neglected accounts churn faster.`,
      whyAr: `مؤشر صحة ${o.healthScore}/100. الحسابات المهملة تنفجر أسرع.`,
      leverageEn: "Retention",
      leverageAr: "الاحتفاظ",
      leverageScore: 75,
      module: "organizations",
      entityId: o.id,
      timeEst: "20 min",
    });
  });

  // 6. Overdue maintenance
  resources
    .filter((r) => r.maintenance.some((m) => m.status === "overdue"))
    .forEach((r) => {
      items.push({
        id: `focus-maint-${r.id}`,
        titleEn: `Schedule maintenance: ${r.nameEn}`,
        titleAr: `جدول صيانة: ${r.nameAr}`,
        whyEn: `Overdue maintenance at ${r.locationEn}. Failure risk increases daily.`,
        whyAr: `صيانة متأخرة في ${r.locationAr}. خطر العطل يتزايد يومياً.`,
        leverageEn: "Operations",
        leverageAr: "العمليات",
        leverageScore: 82,
        module: "resources",
        entityId: r.id,
        timeEst: "10 min",
      });
    });

  return items.sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 8);
}

// ─── 7. Relationship Intelligence ────────────────────────

export interface EntityHub {
  id: string;
  type: string;
  nameEn: string;
  nameAr: string;
  connectionCount: number;
  types: string[];
}

export interface RelationshipSummary {
  totalRelationships: number;
  hubs: EntityHub[];
  isolatedCount: number;
  mostConnectedType: string;
  networkDensity: number;
  keyBridges: Array<{ titleEn: string; titleAr: string; descEn: string; descAr: string }>;
}

export function analyzeRelationships(): RelationshipSummary {
  const rels = getAllRelationships();

  // Count connections per entity
  const entityConnections = new Map<string, { type: string; count: number; connectedTypes: Set<string> }>();

  rels.forEach((r) => {
    const srcKey = `${r.sourceType}:${r.sourceId}`;
    const tgtKey = `${r.targetType}:${r.targetId}`;

    if (!entityConnections.has(srcKey)) {
      entityConnections.set(srcKey, { type: r.sourceType, count: 0, connectedTypes: new Set() });
    }
    if (!entityConnections.has(tgtKey)) {
      entityConnections.set(tgtKey, { type: r.targetType, count: 0, connectedTypes: new Set() });
    }

    entityConnections.get(srcKey)!.count++;
    entityConnections.get(srcKey)!.connectedTypes.add(r.targetType);
    entityConnections.get(tgtKey)!.count++;
    entityConnections.get(tgtKey)!.connectedTypes.add(r.sourceType);
  });

  // Build hubs (top connected entities)
  const allPeople = PEOPLE;
  const allOrgs = ORGANIZATIONS;
  const allWork = loadWorkItems();
  const allDeals = loadDeals();

  function getName(type: string, id: string): { en: string; ar: string } {
    if (type === "person") {
      const p = allPeople.find((x) => x.id === id);
      return p ? { en: p.nameEn, ar: p.nameAr } : { en: id, ar: id };
    }
    if (type === "organization") {
      const o = allOrgs.find((x) => x.id === id);
      return o ? { en: o.nameEn, ar: o.nameAr } : { en: id, ar: id };
    }
    if (type === "work") {
      const w = allWork.find((x) => x.id === id);
      return w ? { en: w.titleEn, ar: w.titleAr } : { en: id, ar: id };
    }
    if (type === "deal") {
      const d = allDeals.find((x) => x.id === id);
      return d ? { en: d.titleEn, ar: d.titleAr } : { en: id, ar: id };
    }
    return { en: id, ar: id };
  }

  const hubs: EntityHub[] = Array.from(entityConnections.entries())
    .map(([key, { type, count, connectedTypes }]) => {
      const [entityType, entityId] = key.split(":");
      const name = getName(entityType, entityId);
      return {
        id: key,
        type: entityType,
        nameEn: name.en,
        nameAr: name.ar,
        connectionCount: count,
        types: Array.from(connectedTypes),
      };
    })
    .filter((h) => h.connectionCount >= 2)
    .sort((a, b) => b.connectionCount - a.connectionCount)
    .slice(0, 6);

  // Type distribution
  const typeCounts = new Map<string, number>();
  rels.forEach((r) => {
    typeCounts.set(r.sourceType, (typeCounts.get(r.sourceType) || 0) + 1);
    typeCounts.set(r.targetType, (typeCounts.get(r.targetType) || 0) + 1);
  });
  const mostConnectedType = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "work";

  // Isolated entities
  const totalEntities = allPeople.length + allOrgs.length + allWork.length + allDeals.length;
  const connectedEntityCount = entityConnections.size;
  const isolatedCount = Math.max(0, totalEntities - connectedEntityCount);

  // Network density (0–100)
  const maxPossibleRels = totalEntities * (totalEntities - 1) / 2;
  const networkDensity = maxPossibleRels > 0 ? Math.min(100, Math.round((rels.length / maxPossibleRels) * 100 * 10)) : 0;

  // Key bridge insights
  const keyBridges = [
    {
      titleEn: "Cross-Module Links",
      titleAr: "روابط عبر الوحدات",
      descEn: `${rels.filter((r) => r.sourceType !== r.targetType).length} connections span multiple modules — strong integration.`,
      descAr: `${rels.filter((r) => r.sourceType !== r.targetType).length} اتصال يمتد عبر وحدات متعددة — تكامل قوي.`,
    },
    {
      titleEn: "Auto-Detected Relationships",
      titleAr: "علاقات مكتشفة تلقائياً",
      descEn: `${rels.filter((r) => r.auto).length} of ${rels.length} relationships were auto-detected from existing data.`,
      descAr: `${rels.filter((r) => r.auto).length} من أصل ${rels.length} علاقة تم اكتشافها تلقائياً من البيانات الموجودة.`,
    },
    {
      titleEn: "Manual Connections",
      titleAr: "اتصالات يدوية",
      descEn: `${rels.filter((r) => !r.auto).length} manually created relationships show intentional knowledge linking.`,
      descAr: `${rels.filter((r) => !r.auto).length} علاقة أُنشئت يدوياً تُظهر ربطاً معرفياً مقصوداً.`,
    },
  ];

  return {
    totalRelationships: rels.length,
    hubs,
    isolatedCount,
    mostConnectedType,
    networkDensity,
    keyBridges,
  };
}

// ─── 8. Friction Detection ────────────────────────────────

export interface FrictionPoint {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  frictionType: "bottleneck" | "inactive" | "overload" | "gap";
  severity: "high" | "medium" | "low";
  affectedCount: number;
  module: string;
}

export function detectFrictionPoints(): FrictionPoint[] {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();
  const friction: FrictionPoint[] = [];

  // Bottleneck: many items in review
  const reviewItems = work.filter((w) => w.status === "review");
  if (reviewItems.length >= 2) {
    friction.push({
      id: "fr-review-queue",
      titleEn: "Review Queue Bottleneck",
      titleAr: "عنق زجاجة في طابور المراجعة",
      descEn: `${reviewItems.length} items waiting in review. Decision velocity is the constraint.`,
      descAr: `${reviewItems.length} عنصر في انتظار المراجعة. سرعة القرار هي العائق.`,
      frictionType: "bottleneck",
      severity: reviewItems.length >= 3 ? "high" : "medium",
      affectedCount: reviewItems.length,
      module: "work",
    });
  }

  // Inactive area: deals with no qualification movement
  const stalledLeads = deals.filter((d) => d.stage === "lead");
  if (stalledLeads.length >= 2) {
    friction.push({
      id: "fr-lead-stall",
      titleEn: "Lead Qualification Inertia",
      titleAr: "خمول تأهيل العملاء المحتملين",
      descEn: `${stalledLeads.length} leads stuck without qualification. Top of funnel is broken.`,
      descAr: `${stalledLeads.length} عميل محتمل عالق بلا تأهيل. أعلى مسار المبيعات معطّل.`,
      frictionType: "inactive",
      severity: "high",
      affectedCount: stalledLeads.length,
      module: "sales",
    });
  }

  // Overload: same assignee on multiple urgent items
  const urgentByAssignee = new Map<string, number>();
  work.filter((w) => w.priority === "urgent" && w.status !== "done").forEach((w) => {
    urgentByAssignee.set(w.assigneeEn, (urgentByAssignee.get(w.assigneeEn) || 0) + 1);
  });
  urgentByAssignee.forEach((count, name) => {
    if (count >= 2) {
      friction.push({
        id: `fr-overload-${name}`,
        titleEn: `${name} — Urgent Overload`,
        titleAr: `${name} — حمل عاجل زائد`,
        descEn: `${count} urgent items assigned to one person. Risk of failure on all fronts.`,
        descAr: `${count} عناصر عاجلة مُعيّنة لشخص واحد. خطر الفشل على جميع الجبهات.`,
        frictionType: "overload",
        severity: "high",
        affectedCount: count,
        module: "work",
      });
    }
  });

  // Gap: zero-progress backlog growing
  const zeroProgress = work.filter((w) => w.status === "backlog" && w.progress === 0);
  if (zeroProgress.length >= 3) {
    friction.push({
      id: "fr-backlog-gap",
      titleEn: "Untouched Backlog Growth",
      titleAr: "نمو قائمة الانتظار غير المُعالجة",
      descEn: `${zeroProgress.length} items have never been started. Sprint planning is ineffective.`,
      descAr: `${zeroProgress.length} عنصر لم يُبدأ قط. تخطيط السباق غير فعّال.`,
      frictionType: "gap",
      severity: zeroProgress.length >= 5 ? "high" : "medium",
      affectedCount: zeroProgress.length,
      module: "work",
    });
  }

  // Inactive area: no recent invoice activity
  const sentInvoices = invoices.filter((i) => i.status === "sent");
  if (sentInvoices.length >= 3) {
    friction.push({
      id: "fr-invoice-idle",
      titleEn: "Stagnant Invoice Pipeline",
      titleAr: "خط أنابيب فواتير راكد",
      descEn: `${sentInvoices.length} invoices sent but not followed up. Cash is leaving the business.`,
      descAr: `${sentInvoices.length} فاتورة أُرسلت دون متابعة. النقد يغادر الشركة.`,
      frictionType: "inactive",
      severity: "medium",
      affectedCount: sentInvoices.length,
      module: "finance",
    });
  }

  // Underutilized resources
  const idleRes = resources.filter((r) => r.status === "active" && r.utilization < 20);
  if (idleRes.length >= 2) {
    friction.push({
      id: "fr-idle-assets",
      titleEn: "Idle Asset Capital",
      titleAr: "رأس مال أصول عاطل",
      descEn: `${idleRes.length} active resources below 20% utilization. Capital is trapped.`,
      descAr: `${idleRes.length} مورد نشط أقل من 20% استخداماً. رأس المال محجوز.`,
      frictionType: "gap",
      severity: "medium",
      affectedCount: idleRes.length,
      module: "resources",
    });
  }

  return friction.sort((a, b) => (a.severity === "high" ? 0 : a.severity === "medium" ? 1 : 2) - (b.severity === "high" ? 0 : b.severity === "medium" ? 1 : 2));
}

// ─── 9. Weekly Intelligence Report ───────────────────────

export interface WeeklyReportItem {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  value?: string;
}

export interface WeeklyReport {
  wins: WeeklyReportItem[];
  risks: WeeklyReportItem[];
  opportunities: WeeklyReportItem[];
  bottlenecks: WeeklyReportItem[];
  overallScore: number;
  overallLabelEn: string;
  overallLabelAr: string;
}

export function generateWeeklyReport(): WeeklyReport {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();

  const wins: WeeklyReportItem[] = [];
  const risks: WeeklyReportItem[] = [];
  const opportunities: WeeklyReportItem[] = [];
  const bottlenecks: WeeklyReportItem[] = [];

  // Wins
  const doneWork = work.filter((w) => w.status === "done");
  if (doneWork.length > 0) {
    wins.push({
      id: "w-completed",
      titleEn: `${doneWork.length} Work Items Completed`,
      titleAr: `${doneWork.length} عنصر عمل مكتمل`,
      descEn: doneWork.slice(0, 2).map((w) => w.titleEn).join("; ") + (doneWork.length > 2 ? ` +${doneWork.length - 2} more` : ""),
      descAr: doneWork.slice(0, 2).map((w) => w.titleAr).join("؛ ") + (doneWork.length > 2 ? ` +${doneWork.length - 2} أخرى` : ""),
      value: `${doneWork.length} items`,
    });
  }

  const wonDeals = deals.filter((d) => d.stage === "won");
  if (wonDeals.length > 0) {
    wins.push({
      id: "w-deals",
      titleEn: `${wonDeals.length} Deals Won`,
      titleAr: `${wonDeals.length} صفقات مربوحة`,
      descEn: `Total value: ${fmt(wonDeals.reduce((s, d) => s + d.value, 0))}`,
      descAr: `القيمة الإجمالية: ${fmt(wonDeals.reduce((s, d) => s + d.value, 0))}`,
      value: fmt(wonDeals.reduce((s, d) => s + d.value, 0)),
    });
  }

  const paidInv = invoices.filter((i) => i.status === "paid");
  if (paidInv.length > 0) {
    wins.push({
      id: "w-collected",
      titleEn: `${fmt(paidInv.reduce((s, i) => s + i.paidAmount, 0))} Collected`,
      titleAr: `${fmt(paidInv.reduce((s, i) => s + i.paidAmount, 0))} محصّل`,
      descEn: `${paidInv.length} invoice(s) paid in full`,
      descAr: `${paidInv.length} فاتورة مدفوعة بالكامل`,
      value: fmt(paidInv.reduce((s, i) => s + i.paidAmount, 0)),
    });
  }

  const highProgressWork = work.filter((w) => w.progress >= 75 && w.status !== "done");
  if (highProgressWork.length > 0) {
    wins.push({
      id: "w-momentum",
      titleEn: `${highProgressWork.length} Items Near Completion`,
      titleAr: `${highProgressWork.length} عناصر قرب الاكتمال`,
      descEn: `Strong execution momentum on ${highProgressWork.map((w) => w.titleEn.split(" ")[0]).join(", ")}`,
      descAr: `زخم تنفيذ قوي على ${highProgressWork.map((w) => w.titleAr.split(" ")[0]).join("، ")}`,
      value: `${highProgressWork.length} items`,
    });
  }

  // Risks
  const overdueInv = invoices.filter((i) => i.status === "overdue");
  if (overdueInv.length > 0) {
    risks.push({
      id: "r-overdue",
      titleEn: `${overdueInv.length} Overdue Invoice(s)`,
      titleAr: `${overdueInv.length} فاتورة متأخرة`,
      descEn: `${fmt(overdueInv.reduce((s, i) => s + i.amount, 0))} at risk of collection failure`,
      descAr: `${fmt(overdueInv.reduce((s, i) => s + i.amount, 0))} في خطر فشل التحصيل`,
      value: fmt(overdueInv.reduce((s, i) => s + i.amount, 0)),
    });
  }

  const urgentWork = work.filter((w) => w.priority === "urgent" && w.status !== "done");
  if (urgentWork.length > 0) {
    risks.push({
      id: "r-urgent",
      titleEn: `${urgentWork.length} Urgent Items Unresolved`,
      titleAr: `${urgentWork.length} عناصر عاجلة غير محلولة`,
      descEn: `These carry high operational risk if they miss their deadlines`,
      descAr: `تحمل هذه مخاطر تشغيلية عالية إذا فاتت مواعيدها`,
    });
  }

  const atRiskOrgs = ORGANIZATIONS.filter((o) => o.healthScore < 55);
  if (atRiskOrgs.length > 0) {
    risks.push({
      id: "r-orgs",
      titleEn: `${atRiskOrgs.length} At-Risk Account(s)`,
      titleAr: `${atRiskOrgs.length} حساب في خطر`,
      descEn: `${atRiskOrgs.map((o) => o.nameEn).join(", ")} need immediate attention`,
      descAr: `${atRiskOrgs.map((o) => o.nameAr).join("، ")} تحتاج اهتماماً فورياً`,
    });
  }

  const overdueMaint = resources.filter((r) => r.maintenance.some((m) => m.status === "overdue"));
  if (overdueMaint.length > 0) {
    risks.push({
      id: "r-maint",
      titleEn: `${overdueMaint.length} Maintenance Overdue`,
      titleAr: `${overdueMaint.length} صيانة متأخرة`,
      descEn: `Equipment failure risk increases without immediate scheduling`,
      descAr: `خطر عطل المعدات يزيد بدون جدولة فورية`,
    });
  }

  // Opportunities
  const negotiatingDeals = deals.filter((d) => d.stage === "negotiation");
  if (negotiatingDeals.length > 0) {
    opportunities.push({
      id: "o-negotiation",
      titleEn: `${negotiatingDeals.length} Deal(s) Ready to Close`,
      titleAr: `${negotiatingDeals.length} صفقة جاهزة للإغلاق`,
      descEn: `${fmt(negotiatingDeals.reduce((s, d) => s + d.value, 0))} within reach. Push for signatures.`,
      descAr: `${fmt(negotiatingDeals.reduce((s, d) => s + d.value, 0))} في متناول اليد. اضغط للحصول على توقيعات.`,
      value: fmt(negotiatingDeals.reduce((s, d) => s + d.value, 0)),
    });
  }

  const proposalDeals = deals.filter((d) => d.stage === "proposal");
  if (proposalDeals.length > 0) {
    opportunities.push({
      id: "o-proposals",
      titleEn: `${proposalDeals.length} Active Proposals`,
      titleAr: `${proposalDeals.length} عروض نشطة`,
      descEn: `Follow up to accelerate to negotiation phase`,
      descAr: `تابع للتسريع نحو مرحلة التفاوض`,
    });
  }

  const underutilRes = resources.filter((r) => r.utilization < 30 && r.status === "active");
  if (underutilRes.length > 0) {
    opportunities.push({
      id: "o-assets",
      titleEn: `${underutilRes.length} Asset(s) Can Be Monetized`,
      titleAr: `${underutilRes.length} أصول يمكن تحقيق الدخل منها`,
      descEn: `Underutilized assets can be subleased or redeployed for revenue`,
      descAr: `الأصول قليلة الاستخدام يمكن تأجيرها أو إعادة نشرها لتحقيق إيرادات`,
    });
  }

  // Bottlenecks
  const reviewItems = work.filter((w) => w.status === "review");
  if (reviewItems.length > 0) {
    bottlenecks.push({
      id: "bn-review",
      titleEn: `${reviewItems.length} Items Awaiting Review`,
      titleAr: `${reviewItems.length} عناصر في انتظار المراجعة`,
      descEn: `Decision backlog is slowing delivery velocity`,
      descAr: `تراكم القرارات يبطئ سرعة التسليم`,
    });
  }

  const stalledLeads = deals.filter((d) => d.stage === "lead");
  if (stalledLeads.length > 0) {
    bottlenecks.push({
      id: "bn-leads",
      titleEn: `${stalledLeads.length} Leads Not Advancing`,
      titleAr: `${stalledLeads.length} عملاء محتملون لا يتقدمون`,
      descEn: `Top-of-funnel inertia blocking revenue growth`,
      descAr: `خمول أعلى مسار المبيعات يعيق نمو الإيرادات`,
    });
  }

  const zeroProgressWork = work.filter((w) => w.progress === 0 && w.status !== "done");
  if (zeroProgressWork.length > 0) {
    bottlenecks.push({
      id: "bn-zero",
      titleEn: `${zeroProgressWork.length} Items Never Started`,
      titleAr: `${zeroProgressWork.length} عنصر لم يُبدأ قط`,
      descEn: `Capacity or prioritization issue preventing execution`,
      descAr: `مشكلة في الطاقة أو الأولويات تمنع التنفيذ`,
    });
  }

  // Overall score
  const positiveSignals = wins.length;
  const negativeSignals = risks.length + bottlenecks.length;
  const totalSignals = positiveSignals + negativeSignals + opportunities.length;
  const overallScore = totalSignals > 0
    ? Math.min(100, Math.round(((positiveSignals + opportunities.length * 0.5) / totalSignals) * 100))
    : 50;

  const overallLabelEn = overallScore >= 70 ? "Strong Week" : overallScore >= 50 ? "Mixed Performance" : "Challenging Week";
  const overallLabelAr = overallScore >= 70 ? "أسبوع قوي" : overallScore >= 50 ? "أداء متذبذب" : "أسبوع صعب";

  return { wins, risks, opportunities, bottlenecks, overallScore, overallLabelEn, overallLabelAr };
}

// ─── 10. Life Alignment Engine ────────────────────────────

export interface AlignmentDimension {
  id: string;
  dimensionEn: string;
  dimensionAr: string;
  score: number;
  trend: "up" | "stable" | "down";
  insightEn: string;
  insightAr: string;
  becomingGoalEn: string;
  becomingGoalAr: string;
  actionEn: string;
  actionAr: string;
}

export interface LifeAlignmentData {
  dimensions: AlignmentDimension[];
  overallScore: number;
  summaryEn: string;
  summaryAr: string;
}

export function computeLifeAlignment(industry?: string, companySize?: string): LifeAlignmentData {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();
  const people = PEOPLE;

  const dimensions: AlignmentDimension[] = [];

  // 1. Financial Becoming
  const pipelineValue = deals.filter((d) => !["won", "lost"].includes(d.stage))
    .reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const collectedRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0);
  const finScore = Math.min(100, Math.round(
    (deals.filter((d) => !["won", "lost"].includes(d.stage)).length >= 3 ? 30 : 15) +
    (collectedRevenue > 0 ? 35 : 10) +
    (invoices.filter((i) => i.status === "overdue").length === 0 ? 35 : 15)
  ));
  dimensions.push({
    id: "la-financial",
    dimensionEn: "Financial Strength",
    dimensionAr: "القوة المالية",
    score: finScore,
    trend: finScore >= 65 ? "up" : finScore >= 40 ? "stable" : "down",
    insightEn: `Revenue collected: ${fmt(collectedRevenue)}. Weighted pipeline: ${fmt(pipelineValue)}.`,
    insightAr: `الإيرادات المحصّلة: ${fmt(collectedRevenue)}. خط الأنابيب المرجّح: ${fmt(pipelineValue)}.`,
    becomingGoalEn: "Becoming a consistently profitable operation",
    becomingGoalAr: "أن تصبح عملية مربحة باستمرار",
    actionEn: finScore < 65 ? "Close 1 negotiation deal and collect 1 overdue invoice" : "Maintain collection velocity and grow pipeline",
    actionAr: finScore < 65 ? "أغلق صفقة تفاوض واحدة وحصّل فاتورة متأخرة واحدة" : "حافظ على سرعة التحصيل وقم بتنمية خط الأنابيب",
  });

  // 2. Operational Mastery
  const doneRate = work.length > 0 ? Math.round((work.filter((w) => w.status === "done").length / work.length) * 100) : 50;
  const avgProgress = work.filter((w) => w.status !== "done").length > 0
    ? Math.round(work.filter((w) => w.status !== "done").reduce((s, w) => s + w.progress, 0) / work.filter((w) => w.status !== "done").length)
    : 50;
  const opsScore = Math.round(doneRate * 0.6 + avgProgress * 0.4);
  dimensions.push({
    id: "la-ops",
    dimensionEn: "Operational Mastery",
    dimensionAr: "الإتقان التشغيلي",
    score: opsScore,
    trend: opsScore >= 60 ? "up" : opsScore >= 35 ? "stable" : "down",
    insightEn: `${doneRate}% work complete. ${avgProgress}% avg progress on active items.`,
    insightAr: `${doneRate}% من العمل مكتمل. ${avgProgress}% متوسط التقدم على العناصر النشطة.`,
    becomingGoalEn: "Becoming an organization that executes with precision",
    becomingGoalAr: "أن تصبح منظمة تنفّذ بدقة",
    actionEn: opsScore < 60 ? "Clear 3 backlog items and close 1 in-progress item" : "Accelerate 2 near-complete items to done",
    actionAr: opsScore < 60 ? "نظّف 3 عناصر من قائمة الانتظار وأغلق عنصراً جارياً واحداً" : "سرّع عنصرين قرب الاكتمال إلى الإنجاز",
  });

  // 3. Network & Relationship Capital
  const activeContacts = people.filter((p) => p.status === "active").length;
  const networkScore = Math.min(100, Math.round(
    (activeContacts / Math.max(people.length, 1)) * 60 +
    (ORGANIZATIONS.filter((o) => o.healthScore >= 70).length / Math.max(ORGANIZATIONS.length, 1)) * 40
  ));
  dimensions.push({
    id: "la-network",
    dimensionEn: "Relationship Capital",
    dimensionAr: "رأس مال العلاقات",
    score: networkScore,
    trend: networkScore >= 55 ? "up" : networkScore >= 30 ? "stable" : "down",
    insightEn: `${activeContacts}/${people.length} contacts active. ${ORGANIZATIONS.filter((o) => o.healthScore >= 70).length} healthy partner orgs.`,
    insightAr: `${activeContacts}/${people.length} جهات اتصال نشطة. ${ORGANIZATIONS.filter((o) => o.healthScore >= 70).length} منظمات شريكة صحية.`,
    becomingGoalEn: "Becoming known for deep, trusted relationships",
    becomingGoalAr: "أن تُعرف بالعلاقات العميقة والموثوقة",
    actionEn: networkScore < 55 ? "Re-engage 3 dormant contacts this week" : "Deepen 2 key account relationships",
    actionAr: networkScore < 55 ? "أعد التواصل مع 3 جهات اتصال خاملة هذا الأسبوع" : "عمّق علاقتين في الحسابات الرئيسية",
  });

  // 4. Asset & Resource Leadership
  const activeRes = resources.filter((r) => r.status === "active");
  const avgUtil = activeRes.length > 0 ? Math.round(activeRes.reduce((s, r) => s + r.utilization, 0) / activeRes.length) : 50;
  const maintHealth = Math.max(0, 100 - resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length * 25);
  const assetScore = Math.round(avgUtil * 0.6 + maintHealth * 0.4);
  dimensions.push({
    id: "la-assets",
    dimensionEn: "Resource Leadership",
    dimensionAr: "قيادة الموارد",
    score: assetScore,
    trend: assetScore >= 60 ? "up" : assetScore >= 35 ? "stable" : "down",
    insightEn: `${avgUtil}% average utilization. ${resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length} assets with overdue maintenance.`,
    insightAr: `${avgUtil}% متوسط الاستخدام. ${resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length} أصول بصيانة متأخرة.`,
    becomingGoalEn: "Becoming a lean, well-maintained operation",
    becomingGoalAr: "أن تصبح عملية رشيقة ومصانة جيداً",
    actionEn: assetScore < 60 ? "Schedule overdue maintenance and reassign idle assets" : "Optimize asset allocation for next quarter",
    actionAr: assetScore < 60 ? "جدول الصيانة المتأخرة وأعد تخصيص الأصول العاطلة" : "حسّن تخصيص الأصول للربع القادم",
  });

  // 5. Strategic Growth
  const leadCount = deals.filter((d) => d.stage === "lead").length;
  const proposalCount = deals.filter((d) => ["proposal", "negotiation"].includes(d.stage)).length;
  const growthScore = Math.min(100, Math.round(
    proposalCount * 20 +
    (deals.filter((d) => d.stage === "won").length * 15) +
    Math.max(0, 40 - leadCount * 5)
  ));
  dimensions.push({
    id: "la-growth",
    dimensionEn: "Strategic Growth",
    dimensionAr: "النمو الاستراتيجي",
    score: growthScore,
    trend: growthScore >= 55 ? "up" : growthScore >= 30 ? "stable" : "down",
    insightEn: `${proposalCount} deals in proposal/negotiation. ${leadCount} unqualified leads stalling growth.`,
    insightAr: `${proposalCount} صفقات في العرض/التفاوض. ${leadCount} عملاء محتملون غير مؤهلين يعرقلون النمو.`,
    becomingGoalEn: "Becoming a market-leading business in your industry",
    becomingGoalAr: "أن تصبح عملاً رائداً في سوقك",
    actionEn: growthScore < 55 ? "Qualify or disqualify all lead-stage deals by end of week" : "Identify and pursue 2 new strategic accounts",
    actionAr: growthScore < 55 ? "أهّل أو استبعد جميع صفقات مرحلة العميل بحلول نهاية الأسبوع" : "حدّد واسعَ لاستهداف حسابين استراتيجيين جديدين",
  });

  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length);
  const summaryEn = overallScore >= 70
    ? "Your business is aligned with its becoming goals. Keep executing at this level."
    : overallScore >= 50
    ? "Partial alignment. Financial and operational areas need focused attention."
    : "Significant drift from becoming goals. Prioritize the highest-leverage dimensions first.";
  const summaryAr = overallScore >= 70
    ? "عملك متوافق مع أهداف التطور. استمر في التنفيذ بهذا المستوى."
    : overallScore >= 50
    ? "توافق جزئي. تحتاج المجالات المالية والتشغيلية اهتماماً مركّزاً."
    : "انحراف كبير عن أهداف التطور. رتّب أولوية الأبعاد الأعلى تأثيراً أولاً.";

  return { dimensions, overallScore, summaryEn, summaryAr };
}
