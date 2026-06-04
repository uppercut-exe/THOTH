/**
 * THOTH Sprint 22 — Autonomous Intelligence & Operating System Layer
 *
 * All engines are deterministic pure functions derived from real system data.
 * No placeholder intelligence. No AI API calls.
 */

import { loadDeals, formatCurrency, STAGE_META, type Deal } from "./sales";
import { loadWorkItems, STATUS_META, PRIORITY_META, type WorkItem } from "./work";
import { loadInvoices, loadExpenses, type Invoice } from "./finance";
import { loadResources, type Resource } from "./resources";
import { ORGANIZATIONS, type Organization } from "./organizations";
import { PEOPLE, type Person } from "./people";
import { loadRelationships, type Relationship } from "../memory/relationshipStore";
import { detectAutoRelationships, mergeAutoIntoStore } from "../memory/autoRelate";
import { computeBusinessHealth } from "./intelligence";

// ─── Shared helpers ───────────────────────────────────────

function allRels(): Relationship[] {
  const stored = loadRelationships();
  const auto = detectAutoRelationships();
  return mergeAutoIntoStore(stored, auto);
}

function fmt(v: number) { return formatCurrency(v, "SAR"); }

// Parse ISO date safely, returning null if invalid
function parseISO(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysFromNow(iso?: string): number | null {
  const d = parseISO(iso);
  if (!d) return null;
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

function daysAgo(iso?: string): number {
  const d = parseISO(iso);
  if (!d) return 14; // default 2 weeks
  return Math.max(1, Math.round((Date.now() - d.getTime()) / 86400000));
}

function addDays(days: number): string {
  const d = new Date(Date.now() + days * 86400000);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── 1. Strategic Prioritization Engine ──────────────────

export interface PrioritizedItem {
  id: string;
  titleEn: string;
  titleAr: string;
  impactScore: number;
  urgencyScore: number;
  effortScore: number;
  priorityScore: number;
  entityType: string;
  entityId: string;
  module: string;
  contextEn: string;
  contextAr: string;
  effortLabelEn: string;
  effortLabelAr: string;
  category: "revenue" | "operations" | "relationships" | "risk";
}

export function prioritizeItems(): PrioritizedItem[] {
  const work = loadWorkItems().filter((w) => w.status !== "done");
  const deals = loadDeals().filter((d) => !["won", "lost"].includes(d.stage));
  const invoices = loadInvoices().filter((i) => ["overdue", "sent"].includes(i.status));
  const resources = loadResources().filter((r) => r.maintenance.some((m) => m.status === "overdue"));

  const items: PrioritizedItem[] = [];

  // Overdue invoices — highest revenue impact
  invoices.filter((i) => i.status === "overdue").forEach((inv) => {
    const impact = Math.min(100, 40 + Math.round((inv.amount / 50000) * 30));
    const urgency = 95;
    const effort = 20;
    items.push({
      id: `pri-inv-${inv.id}`, entityType: "invoice", entityId: inv.id, module: "finance",
      titleEn: `Collect ${inv.number}`, titleAr: `حصّل ${inv.number}`,
      contextEn: `${fmt(inv.amount)} overdue from ${inv.orgNameEn}`,
      contextAr: `${fmt(inv.amount)} متأخرة من ${inv.orgNameAr}`,
      impactScore: impact, urgencyScore: urgency, effortScore: effort,
      priorityScore: Math.round(impact * 0.35 + urgency * 0.45 + (100 - effort) * 0.20),
      effortLabelEn: "Quick Call", effortLabelAr: "مكالمة سريعة",
      category: "revenue",
    });
  });

  // Negotiation deals — high revenue close
  deals.filter((d) => d.stage === "negotiation").forEach((deal) => {
    const impact = Math.min(100, 50 + Math.round((deal.value / 500000) * 40));
    const urgency = Math.round(40 + deal.probability * 0.5);
    const effort = 40;
    items.push({
      id: `pri-deal-${deal.id}`, entityType: "deal", entityId: deal.id, module: "sales",
      titleEn: `Close ${deal.titleEn}`, titleAr: `أغلق ${deal.titleAr}`,
      contextEn: `${fmt(deal.value)} at ${deal.probability}% probability`,
      contextAr: `${fmt(deal.value)} باحتمالية ${deal.probability}%`,
      impactScore: impact, urgencyScore: urgency, effortScore: effort,
      priorityScore: Math.round(impact * 0.35 + urgency * 0.45 + (100 - effort) * 0.20),
      effortLabelEn: "Half Day", effortLabelAr: "نصف يوم",
      category: "revenue",
    });
  });

  // Urgent work items
  work.filter((w) => w.priority === "urgent").forEach((w) => {
    const impact = 80;
    const urgency = 90;
    const effort = w.progress > 60 ? 25 : w.progress > 30 ? 50 : 70;
    items.push({
      id: `pri-work-${w.id}`, entityType: "work", entityId: w.id, module: "work",
      titleEn: w.titleEn, titleAr: w.titleAr,
      contextEn: `${w.progress}% complete — ${w.assigneeEn}`,
      contextAr: `${w.progress}% مكتمل — ${w.assigneeAr}`,
      impactScore: impact, urgencyScore: urgency, effortScore: effort,
      priorityScore: Math.round(impact * 0.35 + urgency * 0.45 + (100 - effort) * 0.20),
      effortLabelEn: effort < 40 ? "Quick Win" : "Full Day",
      effortLabelAr: effort < 40 ? "فوز سريع" : "يوم كامل",
      category: "operations",
    });
  });

  // High-progress work — easy wins
  work.filter((w) => w.progress >= 75 && w.priority !== "urgent").forEach((w) => {
    const impact = 55;
    const urgency = 60;
    const effort = 20;
    items.push({
      id: `pri-finish-${w.id}`, entityType: "work", entityId: w.id, module: "work",
      titleEn: `Complete: ${w.titleEn}`, titleAr: `أنهِ: ${w.titleAr}`,
      contextEn: `${w.progress}% done — momentum opportunity`,
      contextAr: `${w.progress}% منجز — فرصة بناء الزخم`,
      impactScore: impact, urgencyScore: urgency, effortScore: effort,
      priorityScore: Math.round(impact * 0.35 + urgency * 0.45 + (100 - effort) * 0.20),
      effortLabelEn: "Quick Win", effortLabelAr: "فوز سريع",
      category: "operations",
    });
  });

  // Overdue maintenance
  resources.forEach((r) => {
    items.push({
      id: `pri-maint-${r.id}`, entityType: "resource", entityId: r.id, module: "resources",
      titleEn: `Maintain ${r.nameEn}`, titleAr: `صيانة ${r.nameAr}`,
      contextEn: `Overdue at ${r.locationEn} — failure risk`,
      contextAr: `متأخرة في ${r.locationAr} — خطر عطل`,
      impactScore: 65, urgencyScore: 80, effortScore: 35,
      priorityScore: Math.round(65 * 0.35 + 80 * 0.45 + 65 * 0.20),
      effortLabelEn: "Schedule", effortLabelAr: "جدول",
      category: "risk",
    });
  });

  // At-risk accounts
  ORGANIZATIONS.filter((o) => o.healthScore < 55).forEach((o) => {
    items.push({
      id: `pri-org-${o.id}`, entityType: "organization", entityId: o.id, module: "organizations",
      titleEn: `Re-engage ${o.nameEn}`, titleAr: `أعد تواصل ${o.nameAr}`,
      contextEn: `Health ${o.healthScore}/100 — churn risk`,
      contextAr: `صحة ${o.healthScore}/100 — خطر انقطاع`,
      impactScore: 60, urgencyScore: 65, effortScore: 30,
      priorityScore: Math.round(60 * 0.35 + 65 * 0.45 + 70 * 0.20),
      effortLabelEn: "Call", effortLabelAr: "مكالمة",
      category: "relationships",
    });
  });

  return items.sort((a, b) => b.priorityScore - a.priorityScore);
}

// ─── 2. Autonomous Work Queue ─────────────────────────────

export interface QueueItem {
  id: string;
  titleEn: string;
  titleAr: string;
  priorityScore: number;
  impactScore: number;
  urgencyScore: number;
  effortScore: number;
  effortLabelEn: string;
  effortLabelAr: string;
  actionEn: string;
  actionAr: string;
  contextEn: string;
  contextAr: string;
  module: string;
  entityId?: string;
  category: "revenue" | "operations" | "relationships" | "risk";
}

export function generateWorkQueue(): QueueItem[] {
  return prioritizeItems().map((item) => ({
    id: `q-${item.id}`,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    priorityScore: item.priorityScore,
    impactScore: item.impactScore,
    urgencyScore: item.urgencyScore,
    effortScore: item.effortScore,
    effortLabelEn: item.effortLabelEn,
    effortLabelAr: item.effortLabelAr,
    actionEn: item.contextEn,
    actionAr: item.contextAr,
    contextEn: `${item.module} · ${item.effortLabelEn}`,
    contextAr: `${item.module} · ${item.effortLabelAr}`,
    module: item.module,
    entityId: item.entityId,
    category: item.category,
  }));
}

// ─── 3. Forecast Engine ───────────────────────────────────

export interface ForecastItem {
  id: string;
  titleEn: string;
  titleAr: string;
  currentProgress: number;
  velocityPerDay: number;
  predictedDaysRemaining: number;
  predictedCompletionEn: string;
  scheduledDateEn: string;
  daysOverSchedule: number;
  confidenceScore: number;
  trend: "ahead" | "on_track" | "delayed" | "at_risk";
  trendLabelEn: string;
  trendLabelAr: string;
  statusEn: string;
  statusAr: string;
  assigneeEn: string;
}

export function generateForecasts(): ForecastItem[] {
  const work = loadWorkItems().filter((w) => w.status !== "done");

  return work.map((w) => {
    const createdDaysAgo = daysAgo(undefined); // ~14 days default
    const velocity = w.progress > 0 ? w.progress / createdDaysAgo : 0;
    const remaining = velocity > 0 ? Math.ceil((100 - w.progress) / velocity) : 60;
    const predicted = addDays(remaining);

    const dueDate = parseISO(w.dueDateISO);
    const dueInDays = dueDate ? Math.round((dueDate.getTime() - Date.now()) / 86400000) : null;
    const daysOver = dueInDays !== null ? remaining - dueInDays : 0;

    // Confidence: high if velocity > 2%/day and on track
    const confidence = w.status === "in_progress" && velocity > 1
      ? Math.min(90, 50 + Math.round(velocity * 15))
      : w.status === "review"
      ? 75
      : w.status === "planned"
      ? 45
      : 25;

    const trend: ForecastItem["trend"] =
      w.status === "done" ? "ahead"
      : daysOver < -7 ? "ahead"
      : daysOver < 3 ? "on_track"
      : daysOver < 14 ? "delayed"
      : "at_risk";

    const trendMeta: Record<ForecastItem["trend"], { en: string; ar: string }> = {
      ahead:    { en: "Ahead of Schedule", ar: "قبل الموعد" },
      on_track: { en: "On Track",          ar: "على المسار" },
      delayed:  { en: "Delayed",           ar: "متأخر" },
      at_risk:  { en: "At Risk",           ar: "في خطر" },
    };

    return {
      id: w.id,
      titleEn: w.titleEn,
      titleAr: w.titleAr,
      currentProgress: w.progress,
      velocityPerDay: Math.round(velocity * 10) / 10,
      predictedDaysRemaining: remaining,
      predictedCompletionEn: predicted,
      scheduledDateEn: w.dueDateEn,
      daysOverSchedule: Math.max(0, daysOver),
      confidenceScore: confidence,
      trend,
      trendLabelEn: trendMeta[trend].en,
      trendLabelAr: trendMeta[trend].ar,
      statusEn: STATUS_META[w.status].en,
      statusAr: STATUS_META[w.status].ar,
      assigneeEn: w.assigneeEn,
    };
  }).sort((a, b) => b.daysOverSchedule - a.daysOverSchedule);
}

// ─── 4. Dependency Intelligence ───────────────────────────

export interface DependencyNode {
  id: string;
  titleEn: string;
  titleAr: string;
  entityType: string;
  status: string;
  statusEn: string;
  statusAr: string;
  progress: number;
  isBlocking: Array<{ id: string; titleEn: string; titleAr: string }>;
  blockedBy: Array<{ id: string; titleEn: string; titleAr: string }>;
  criticalPath: boolean;
  depth: number;
}

export function analyzeDependencies(): DependencyNode[] {
  const rels = allRels();
  const work = loadWorkItems();
  const deals = loadDeals();
  const resources = loadResources();

  // Build adjacency: what blocks what
  const blockingMap = new Map<string, string[]>(); // item → items it blocks
  const blockedByMap = new Map<string, string[]>(); // item → items blocking it

  rels.filter((r) => ["references", "uses", "belongs_to", "created_from"].includes(r.kind)).forEach((r) => {
    const srcKey = `${r.sourceType}:${r.sourceId}`;
    const tgtKey = `${r.targetType}:${r.targetId}`;
    if (!blockingMap.has(srcKey)) blockingMap.set(srcKey, []);
    if (!blockedByMap.has(tgtKey)) blockedByMap.set(tgtKey, []);
    blockingMap.get(srcKey)!.push(tgtKey);
    blockedByMap.get(tgtKey)!.push(srcKey);
  });

  function getEntity(type: string, id: string): { titleEn: string; titleAr: string; status: string; progress: number } | null {
    if (type === "work") {
      const w = work.find((x) => x.id === id);
      return w ? { titleEn: w.titleEn, titleAr: w.titleAr, status: w.status, progress: w.progress } : null;
    }
    if (type === "deal") {
      const d = deals.find((x) => x.id === id);
      return d ? { titleEn: d.titleEn, titleAr: d.titleAr, status: d.stage, progress: d.probability } : null;
    }
    if (type === "resource") {
      const r = resources.find((x) => x.id === id);
      return r ? { titleEn: r.nameEn, titleAr: r.nameAr, status: r.status, progress: r.utilization } : null;
    }
    return null;
  }

  const nodes: DependencyNode[] = [];
  const seen = new Set<string>();

  rels.forEach((r) => {
    ["source", "target"].forEach((side) => {
      const type = side === "source" ? r.sourceType : r.targetType;
      const id = side === "source" ? r.sourceId : r.targetId;
      if (["work", "deal", "resource"].includes(type)) {
        const key = `${type}:${id}`;
        if (seen.has(key)) return;
        seen.add(key);

        const entity = getEntity(type, id);
        if (!entity) return;

        const isBlockingKeys = blockingMap.get(key) || [];
        const blockedByKeys = blockedByMap.get(key) || [];

        const isBlockingItems = isBlockingKeys.map((k) => {
          const [t, i] = k.split(":");
          const e = getEntity(t, i);
          return e ? { id: k, titleEn: e.titleEn, titleAr: e.titleAr } : null;
        }).filter(Boolean) as Array<{ id: string; titleEn: string; titleAr: string }>;

        const blockedByItems = blockedByKeys.map((k) => {
          const [t, i] = k.split(":");
          const e = getEntity(t, i);
          return e ? { id: k, titleEn: e.titleEn, titleAr: e.titleAr } : null;
        }).filter(Boolean) as Array<{ id: string; titleEn: string; titleAr: string }>;

        const statusMeta = type === "work" ? STATUS_META[entity.status as keyof typeof STATUS_META] : null;

        nodes.push({
          id: key, entityType: type,
          titleEn: entity.titleEn, titleAr: entity.titleAr,
          status: entity.status,
          statusEn: statusMeta?.en || entity.status,
          statusAr: statusMeta?.ar || entity.status,
          progress: entity.progress,
          isBlocking: isBlockingItems,
          blockedBy: blockedByItems,
          criticalPath: isBlockingItems.length > 0 && blockedByItems.length > 0,
          depth: blockedByItems.length,
        });
      }
    });
  });

  return nodes.sort((a, b) => b.isBlocking.length - a.isBlocking.length);
}

// ─── 5. Risk Radar ────────────────────────────────────────

export type RiskType = "stalled" | "missing_owner" | "delayed" | "dependency_failure" | "overdue_invoice" | "at_risk_account";

export interface RiskItem {
  id: string;
  type: RiskType;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  severityScore: number;
  impactEn: string;
  impactAr: string;
  mitigationEn: string;
  mitigationAr: string;
  entityId?: string;
  module: string;
}

const TEAM_NAMES = ["ops team", "it department", "facilities", "warehouse team", "production line", "hr", "finance team"];

export function detectAllRisks(): RiskItem[] {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();
  const risks: RiskItem[] = [];

  // Stalled: in_progress < 20% or backlog 0%
  work.filter((w) => w.status !== "done" && (
    (w.status === "in_progress" && w.progress < 20) ||
    (w.status === "backlog" && w.progress === 0)
  )).forEach((w) => {
    risks.push({
      id: `risk-stalled-${w.id}`, type: "stalled", module: "work", entityId: w.id,
      titleEn: `Stalled: ${w.titleEn}`, titleAr: `متوقف: ${w.titleAr}`,
      descEn: `${STATUS_META[w.status].en} — ${w.progress}% complete. No observable movement.`,
      descAr: `${STATUS_META[w.status].ar} — ${w.progress}% مكتمل. لا حركة واضحة.`,
      severityScore: w.priority === "urgent" ? 90 : w.priority === "high" ? 70 : 50,
      impactEn: `Delivery risk for ${w.assigneeEn}. Downstream dependencies may slip.`,
      impactAr: `خطر التسليم على ${w.assigneeAr}. التبعيات اللاحقة قد تتأخر.`,
      mitigationEn: "Assign dedicated owner and set a 48-hour checkpoint.",
      mitigationAr: "عيّن مسؤولاً محدداً وضع نقطة تفتيش خلال ٤٨ ساعة.",
    });
  });

  // Missing owner: team/generic assignee on high-priority work
  work.filter((w) => w.status !== "done" && ["urgent", "high"].includes(w.priority)).filter((w) =>
    TEAM_NAMES.some((t) => w.assigneeEn.toLowerCase().includes(t))
  ).forEach((w) => {
    risks.push({
      id: `risk-owner-${w.id}`, type: "missing_owner", module: "work", entityId: w.id,
      titleEn: `No Owner: ${w.titleEn}`, titleAr: `بلا مالك: ${w.titleAr}`,
      descEn: `High-priority item assigned to "${w.assigneeEn}" — no individual accountable.`,
      descAr: `عنصر عالي الأولوية مُعيّن لـ "${w.assigneeAr}" — لا فرد مسؤول.`,
      severityScore: w.priority === "urgent" ? 85 : 65,
      impactEn: "Team ownership diffuses accountability and slows resolution.",
      impactAr: "ملكية الفريق تُضعف المساءلة وتبطئ الحل.",
      mitigationEn: "Assign a named individual as the accountable owner within 24h.",
      mitigationAr: "عيّن فرداً محدداً مسؤولاً خلال ٢٤ ساعة.",
    });
  });

  // Delayed milestones: items past due date
  work.filter((w) => w.status !== "done" && w.dueDateISO).forEach((w) => {
    const days = daysFromNow(w.dueDateISO);
    if (days !== null && days < 0) {
      risks.push({
        id: `risk-delayed-${w.id}`, type: "delayed", module: "work", entityId: w.id,
        titleEn: `Overdue: ${w.titleEn}`, titleAr: `متأخر: ${w.titleAr}`,
        descEn: `Was due ${w.dueDateEn}. Currently ${w.progress}% complete.`,
        descAr: `كان مستحقاً ${w.dueDateAr}. حالياً ${w.progress}% مكتمل.`,
        severityScore: Math.min(95, 60 + Math.abs(days) * 2),
        impactEn: `${Math.abs(days)} days past deadline — client commitments at risk.`,
        impactAr: `${Math.abs(days)} أيام بعد الموعد — التزامات العملاء في خطر.`,
        mitigationEn: "Escalate to stakeholders and negotiate revised delivery date.",
        mitigationAr: "صعّد للمعنيين وتفاوض على موعد تسليم منقّح.",
      });
    }
  });

  // Overdue invoices
  invoices.filter((i) => i.status === "overdue").forEach((inv) => {
    risks.push({
      id: `risk-inv-${inv.id}`, type: "overdue_invoice", module: "finance", entityId: inv.id,
      titleEn: `Unpaid: ${inv.number}`, titleAr: `غير مدفوع: ${inv.number}`,
      descEn: `${fmt(inv.amount)} overdue from ${inv.orgNameEn}. Cash flow impact.`,
      descAr: `${fmt(inv.amount)} متأخرة من ${inv.orgNameAr}. تأثير على التدفق النقدي.`,
      severityScore: Math.min(95, 60 + Math.round(inv.amount / 30000) * 5),
      impactEn: "Uncollected revenue compresses working capital.",
      impactAr: "الإيرادات غير المحصّلة تضغط على رأس المال العامل.",
      mitigationEn: "Call the contact, send a formal demand notice, escalate to management.",
      mitigationAr: "اتصل بجهة الاتصال وأرسل إشعار مطالبة رسمي وصعّد للإدارة.",
    });
  });

  // At-risk accounts
  ORGANIZATIONS.filter((o) => o.healthScore < 55).forEach((o) => {
    risks.push({
      id: `risk-org-${o.id}`, type: "at_risk_account", module: "organizations", entityId: o.id,
      titleEn: `At Risk: ${o.nameEn}`, titleAr: `في خطر: ${o.nameAr}`,
      descEn: `Health score ${o.healthScore}/100. Lifecycle: ${o.lifecycle}.`,
      descAr: `مؤشر الصحة ${o.healthScore}/100. دورة الحياة: ${o.lifecycle}.`,
      severityScore: Math.max(40, 90 - o.healthScore),
      impactEn: "Deteriorating accounts lead to revenue loss and referral damage.",
      impactAr: "الحسابات المتدهورة تؤدي إلى خسارة إيرادات وضرر بالسمعة.",
      mitigationEn: "Schedule executive review meeting and address top 3 pain points.",
      mitigationAr: "جدول اجتماع مراجعة تنفيذي وعالج أهم ٣ نقاط ألم.",
    });
  });

  // Dependency failures: items with blockers that are themselves stalled
  const deps = analyzeDependencies();
  deps.filter((d) => d.blockedBy.length > 0).forEach((d) => {
    const stuckBlockers = d.blockedBy.filter((b) => {
      const [type, id] = b.id.split(":");
      if (type === "work") {
        const w = loadWorkItems().find((x) => x.id === id);
        return w && w.status !== "done" && w.progress < 20;
      }
      return false;
    });
    if (stuckBlockers.length > 0) {
      risks.push({
        id: `risk-dep-${d.id}`, type: "dependency_failure", module: d.entityType,
        titleEn: `Dependency Blocked: ${d.titleEn}`, titleAr: `تبعية محجوبة: ${d.titleAr}`,
        descEn: `${stuckBlockers.length} prerequisite(s) are stalled. This cannot proceed.`,
        descAr: `${stuckBlockers.length} متطلب مسبق متوقف. لا يمكن المتابعة.`,
        severityScore: 75,
        impactEn: "Cascading delay risk across the dependency chain.",
        impactAr: "خطر تأخير متتالٍ عبر سلسلة التبعيات.",
        mitigationEn: "Unblock the prerequisites first, then proceed with this item.",
        mitigationAr: "أزل الحظر عن المتطلبات المسبقة أولاً ثم تابع هذا العنصر.",
      });
    }
  });

  return risks.sort((a, b) => b.severityScore - a.severityScore);
}

// ─── 6. Intelligence Feed ─────────────────────────────────

export type FeedItemType = "alert" | "win" | "opportunity" | "insight" | "risk" | "action";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  module: string;
  urgency: "high" | "medium" | "low";
  entityId?: string;
  timeAgoEn: string;
  timeAgoAr: string;
}

export function generateIntelligenceFeed(): FeedItem[] {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();
  const feed: FeedItem[] = [];

  // Alerts from overdue invoices
  invoices.filter((i) => i.status === "overdue").forEach((inv, idx) => {
    feed.push({
      id: `feed-inv-${inv.id}`, type: "alert", module: "finance", urgency: "high",
      entityId: inv.id,
      titleEn: `Invoice ${inv.number} overdue`,
      titleAr: `الفاتورة ${inv.number} متأخرة`,
      descEn: `${fmt(inv.amount)} uncollected from ${inv.orgNameEn}`,
      descAr: `${fmt(inv.amount)} غير محصّلة من ${inv.orgNameAr}`,
      timeAgoEn: `${idx + 1}d ago`, timeAgoAr: `منذ ${idx + 1} أيام`,
    });
  });

  // Wins from completed work
  work.filter((w) => w.status === "done").slice(0, 3).forEach((w, idx) => {
    feed.push({
      id: `feed-done-${w.id}`, type: "win", module: "work", urgency: "low",
      entityId: w.id,
      titleEn: `Completed: ${w.titleEn}`,
      titleAr: `مكتمل: ${w.titleAr}`,
      descEn: `100% done — assigned to ${w.assigneeEn}`,
      descAr: `١٠٠% منجز — مُعيّن إلى ${w.assigneeAr}`,
      timeAgoEn: `${idx + 2}d ago`, timeAgoAr: `منذ ${idx + 2} أيام`,
    });
  });

  // Opportunities from negotiation deals
  deals.filter((d) => d.stage === "negotiation").forEach((d, idx) => {
    feed.push({
      id: `feed-neg-${d.id}`, type: "opportunity", module: "sales", urgency: "high",
      entityId: d.id,
      titleEn: `${d.titleEn} ready to close`,
      titleAr: `${d.titleAr} جاهز للإغلاق`,
      descEn: `${fmt(d.value)} at ${d.probability}% — push for signature`,
      descAr: `${fmt(d.value)} باحتمالية ${d.probability}% — اضغط للتوقيع`,
      timeAgoEn: `${idx}h ago`, timeAgoAr: `منذ ${idx} ساعات`,
    });
  });

  // Risks from urgent/stalled work
  work.filter((w) => w.priority === "urgent" && w.status !== "done").forEach((w, idx) => {
    feed.push({
      id: `feed-urg-${w.id}`, type: "risk", module: "work", urgency: "high",
      entityId: w.id,
      titleEn: `Urgent unresolved: ${w.titleEn}`,
      titleAr: `عاجل غير محلول: ${w.titleAr}`,
      descEn: `${w.progress}% complete — ${w.assigneeEn}`,
      descAr: `${w.progress}% مكتمل — ${w.assigneeAr}`,
      timeAgoEn: `${idx + 3}h ago`, timeAgoAr: `منذ ${idx + 3} ساعات`,
    });
  });

  // Insights from patterns
  const doneCount = work.filter((w) => w.status === "done").length;
  const total = work.length;
  if (total > 0) {
    feed.push({
      id: "feed-rate", type: "insight", module: "work", urgency: "low",
      titleEn: `Work completion rate: ${Math.round(doneCount / total * 100)}%`,
      titleAr: `معدل إنجاز العمل: ${Math.round(doneCount / total * 100)}%`,
      descEn: `${doneCount} of ${total} items completed this cycle`,
      descAr: `${doneCount} من ${total} عنصر مكتمل في هذه الدورة`,
      timeAgoEn: "Today", timeAgoAr: "اليوم",
    });
  }

  // Action prompts from at-risk accounts
  ORGANIZATIONS.filter((o) => o.healthScore < 55).slice(0, 2).forEach((o, idx) => {
    feed.push({
      id: `feed-org-${o.id}`, type: "action", module: "organizations", urgency: "medium",
      entityId: o.id,
      titleEn: `${o.nameEn} needs attention`,
      titleAr: `${o.nameAr} تحتاج اهتماماً`,
      descEn: `Health score ${o.healthScore}/100 — re-engage before churn`,
      descAr: `مؤشر الصحة ${o.healthScore}/100 — أعد التواصل قبل الانقطاع`,
      timeAgoEn: `${idx + 1}d ago`, timeAgoAr: `منذ ${idx + 1} أيام`,
    });
  });

  // Pipeline insight
  const pipeline = deals.filter((d) => !["won", "lost"].includes(d.stage));
  if (pipeline.length > 0) {
    const pipelineValue = pipeline.reduce((s, d) => s + d.value * d.probability / 100, 0);
    feed.push({
      id: "feed-pipeline", type: "insight", module: "sales", urgency: "medium",
      titleEn: `Pipeline: ${fmt(pipelineValue)} weighted value`,
      titleAr: `خط الأنابيب: ${fmt(pipelineValue)} قيمة مرجّحة`,
      descEn: `${pipeline.length} active opportunities across all stages`,
      descAr: `${pipeline.length} فرص نشطة عبر جميع المراحل`,
      timeAgoEn: "Today", timeAgoAr: "اليوم",
    });
  }

  return feed.sort((a, b) =>
    (a.urgency === "high" ? 0 : a.urgency === "medium" ? 1 : 2) -
    (b.urgency === "high" ? 0 : b.urgency === "medium" ? 1 : 2)
  );
}

// ─── 7. Executive Briefing ────────────────────────────────

export interface ExecutiveBriefing {
  dateEn: string;
  overallScore: number;
  overallLabelEn: string;
  overallLabelAr: string;
  summaryEn: string;
  summaryAr: string;
  topPriorities: Array<{ en: string; ar: string }>;
  keyRisks: Array<{ en: string; ar: string }>;
  opportunities: Array<{ en: string; ar: string }>;
}

export function generateExecutiveBriefing(): ExecutiveBriefing {
  const health = computeBusinessHealth();
  const deals = loadDeals();
  const work = loadWorkItems();
  const invoices = loadInvoices();
  const risks = detectAllRisks();
  const queue = prioritizeItems();

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const overdueCash = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const pipeline = deals.filter((d) => !["won", "lost"].includes(d.stage)).reduce((s, d) => s + d.value * d.probability / 100, 0);
  const doneRate = work.length > 0 ? Math.round(work.filter((w) => w.status === "done").length / work.length * 100) : 0;
  const negotiating = deals.filter((d) => d.stage === "negotiation");

  const summaryEn = `Business health is ${health.score}/100 (${health.level.replace("_", " ")}). ` +
    `Weighted pipeline is ${fmt(pipeline)} with ${negotiating.length} deal(s) in negotiation. ` +
    `Work completion rate stands at ${doneRate}%. ` +
    (overdueCash > 0 ? `${fmt(overdueCash)} in overdue invoices requires immediate action.` : `Cash collection is on track.`);

  const summaryAr = `صحة الأعمال ${health.score}/100. ` +
    `خط الأنابيب المرجّح ${fmt(pipeline)} مع ${negotiating.length} صفقة في التفاوض. ` +
    `معدل إنجاز العمل ${doneRate}%. ` +
    (overdueCash > 0 ? `${fmt(overdueCash)} في فواتير متأخرة تتطلب إجراءً فورياً.` : `تحصيل النقد على المسار الصحيح.`);

  const topPriorities = queue.slice(0, 4).map((q) => ({
    en: `${q.titleEn} — ${q.contextEn}`,
    ar: `${q.titleAr} — ${q.contextAr}`,
  }));

  const keyRisks = risks.slice(0, 3).map((r) => ({
    en: `${r.titleEn}: ${r.impactEn}`,
    ar: `${r.titleAr}: ${r.impactAr}`,
  }));

  const opportunities: Array<{ en: string; ar: string }> = [];
  if (negotiating.length > 0) {
    opportunities.push({
      en: `${negotiating.length} deal(s) ready to close (${fmt(negotiating.reduce((s, d) => s + d.value, 0))})`,
      ar: `${negotiating.length} صفقة جاهزة للإغلاق (${fmt(negotiating.reduce((s, d) => s + d.value, 0))})`,
    });
  }
  const highProgress = work.filter((w) => w.progress >= 80 && w.status !== "done");
  if (highProgress.length > 0) {
    opportunities.push({
      en: `${highProgress.length} item(s) near completion — close for momentum`,
      ar: `${highProgress.length} عنصر قرب الاكتمال — أغلق لبناء الزخم`,
    });
  }
  const underutil = loadResources().filter((r) => r.utilization < 30 && r.status === "active");
  if (underutil.length > 0) {
    opportunities.push({
      en: `${underutil.length} underutilized asset(s) — potential for sublease or redeployment`,
      ar: `${underutil.length} أصول قليلة الاستخدام — إمكانية تأجير أو إعادة نشر`,
    });
  }

  const overallLabel = health.score >= 75 ? { en: "Strong", ar: "قوي" }
    : health.score >= 55 ? { en: "Moderate", ar: "معتدل" }
    : { en: "Needs Attention", ar: "يحتاج اهتماماً" };

  return {
    dateEn: today,
    overallScore: health.score,
    overallLabelEn: overallLabel.en,
    overallLabelAr: overallLabel.ar,
    summaryEn,
    summaryAr,
    topPriorities,
    keyRisks,
    opportunities,
  };
}

// ─── 8. Operating Rhythms ─────────────────────────────────

export interface RhythmItem {
  id: string;
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  status: "green" | "amber" | "red";
  actionEn?: string;
  actionAr?: string;
}

export interface RhythmSection {
  titleEn: string;
  titleAr: string;
  icon: string;
  items: RhythmItem[];
}

export interface RhythmReview {
  type: "daily" | "weekly" | "monthly" | "quarterly";
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  overallScore: number;
  sections: RhythmSection[];
}

export function getDailyReview(): RhythmReview {
  const work = loadWorkItems();
  const invoices = loadInvoices();
  const deals = loadDeals();

  const urgent = work.filter((w) => w.priority === "urgent" && w.status !== "done");
  const overdue = invoices.filter((i) => i.status === "overdue");
  const inFlight = work.filter((w) => w.status === "in_progress");
  const nearDone = work.filter((w) => w.progress >= 80 && w.status !== "done");
  const negotiating = deals.filter((d) => d.stage === "negotiation");

  const sections: RhythmSection[] = [
    {
      titleEn: "Morning Check", titleAr: "مراجعة الصباح", icon: "sun",
      items: [
        { id: "d1", labelEn: "Urgent items today", labelAr: "عناصر عاجلة اليوم",
          valueEn: `${urgent.length} item(s)`, valueAr: `${urgent.length} عنصر`,
          status: urgent.length === 0 ? "green" : urgent.length <= 2 ? "amber" : "red",
          actionEn: urgent.length > 0 ? "Review and assign" : undefined,
          actionAr: urgent.length > 0 ? "راجع وعيّن" : undefined },
        { id: "d2", labelEn: "Overdue invoices", labelAr: "فواتير متأخرة",
          valueEn: `${overdue.length} invoice(s)`, valueAr: `${overdue.length} فاتورة`,
          status: overdue.length === 0 ? "green" : overdue.length <= 1 ? "amber" : "red",
          actionEn: overdue.length > 0 ? "Make collection calls" : undefined,
          actionAr: overdue.length > 0 ? "أجرِ مكالمات التحصيل" : undefined },
        { id: "d3", labelEn: "Active work items", labelAr: "عناصر عمل نشطة",
          valueEn: `${inFlight.length} in progress`, valueAr: `${inFlight.length} قيد التنفيذ`,
          status: inFlight.length <= 5 ? "green" : inFlight.length <= 8 ? "amber" : "red" },
      ],
    },
    {
      titleEn: "Focus Actions", titleAr: "إجراءات التركيز", icon: "zap",
      items: [
        { id: "d4", labelEn: "Near-completion items", labelAr: "عناصر قرب الاكتمال",
          valueEn: `${nearDone.length} item(s) at 80%+`, valueAr: `${nearDone.length} عنصر عند ٨٠%+`,
          status: nearDone.length > 0 ? "green" : "amber",
          actionEn: nearDone.length > 0 ? "Push to done today" : undefined,
          actionAr: nearDone.length > 0 ? "أنهِ اليوم" : undefined },
        { id: "d5", labelEn: "Deals to advance", labelAr: "صفقات للتقدم",
          valueEn: `${negotiating.length} in negotiation`, valueAr: `${negotiating.length} في التفاوض`,
          status: negotiating.length > 0 ? "green" : "amber",
          actionEn: negotiating.length > 0 ? "Follow up for close" : undefined,
          actionAr: negotiating.length > 0 ? "تابع للإغلاق" : undefined },
      ],
    },
  ];

  const score = Math.round(
    (urgent.length === 0 ? 30 : urgent.length <= 2 ? 20 : 10) +
    (overdue.length === 0 ? 40 : overdue.length <= 1 ? 25 : 10) +
    (nearDone.length > 0 ? 30 : 15)
  );

  return {
    type: "daily", overallScore: score,
    titleEn: "Daily Operating Review", titleAr: "المراجعة التشغيلية اليومية",
    subtitleEn: "Start your day with clarity", subtitleAr: "ابدأ يومك بوضوح",
    sections,
  };
}

export function getWeeklyReview(): RhythmReview {
  const work = loadWorkItems();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();

  const done = work.filter((w) => w.status === "done");
  const wonDeals = deals.filter((d) => d.stage === "won");
  const paidInv = invoices.filter((i) => i.status === "paid");
  const stalled = work.filter((w) => w.status !== "done" && w.progress === 0);
  const pipeline = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const avgUtil = resources.filter((r) => r.status === "active").length > 0
    ? Math.round(resources.filter((r) => r.status === "active").reduce((s, r) => s + r.utilization, 0) / resources.filter((r) => r.status === "active").length)
    : 0;

  const sections: RhythmSection[] = [
    {
      titleEn: "Work Performance", titleAr: "أداء العمل", icon: "briefcase",
      items: [
        { id: "w1", labelEn: "Items completed", labelAr: "عناصر مكتملة",
          valueEn: `${done.length} of ${work.length}`, valueAr: `${done.length} من ${work.length}`,
          status: done.length / work.length >= 0.5 ? "green" : done.length / work.length >= 0.25 ? "amber" : "red" },
        { id: "w2", labelEn: "Stalled items", labelAr: "عناصر متوقفة",
          valueEn: `${stalled.length} with no progress`, valueAr: `${stalled.length} بلا تقدم`,
          status: stalled.length === 0 ? "green" : stalled.length <= 2 ? "amber" : "red",
          actionEn: stalled.length > 0 ? "Address blockers" : undefined,
          actionAr: stalled.length > 0 ? "عالج العوائق" : undefined },
      ],
    },
    {
      titleEn: "Revenue Performance", titleAr: "أداء الإيرادات", icon: "dollar",
      items: [
        { id: "w3", labelEn: "Won deals this cycle", labelAr: "صفقات مربوحة في هذه الدورة",
          valueEn: `${wonDeals.length} deal(s)`, valueAr: `${wonDeals.length} صفقة`,
          status: wonDeals.length >= 2 ? "green" : wonDeals.length >= 1 ? "amber" : "red" },
        { id: "w4", labelEn: "Active pipeline", labelAr: "خط الأنابيب النشط",
          valueEn: `${pipeline.length} opportunities`, valueAr: `${pipeline.length} فرصة`,
          status: pipeline.length >= 4 ? "green" : pipeline.length >= 2 ? "amber" : "red" },
        { id: "w5", labelEn: "Invoices paid", labelAr: "فواتير مدفوعة",
          valueEn: `${paidInv.length} of ${invoices.length}`, valueAr: `${paidInv.length} من ${invoices.length}`,
          status: paidInv.length / Math.max(invoices.length, 1) >= 0.6 ? "green" : "amber" },
      ],
    },
    {
      titleEn: "Resource Health", titleAr: "صحة الموارد", icon: "package",
      items: [
        { id: "w6", labelEn: "Average utilization", labelAr: "متوسط الاستخدام",
          valueEn: `${avgUtil}%`, valueAr: `${avgUtil}%`,
          status: avgUtil >= 65 ? "green" : avgUtil >= 40 ? "amber" : "red" },
        { id: "w7", labelEn: "Overdue maintenance", labelAr: "صيانة متأخرة",
          valueEn: `${resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length} assets`,
          valueAr: `${resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length} أصول`,
          status: resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length === 0 ? "green" : "red" },
      ],
    },
  ];

  const score = Math.round(
    Math.min(100,
      (done.length / Math.max(work.length, 1)) * 40 +
      (wonDeals.length > 0 ? 30 : 10) +
      (avgUtil / 100) * 30
    )
  );

  return {
    type: "weekly", overallScore: score,
    titleEn: "Weekly Business Review", titleAr: "المراجعة التجارية الأسبوعية",
    subtitleEn: "Review the week's performance across all pillars", subtitleAr: "راجع أداء الأسبوع عبر جميع الركائز",
    sections,
  };
}

export function getMonthlyReview(): RhythmReview {
  const health = computeBusinessHealth();
  const deals = loadDeals();
  const people = PEOPLE;
  const orgs = ORGANIZATIONS;

  const activeContacts = people.filter((p) => p.status === "active");
  const atRiskOrgs = orgs.filter((o) => o.healthScore < 60);
  const wonDeals = deals.filter((d) => d.stage === "won");
  const winRate = deals.filter((d) => ["won", "lost"].includes(d.stage)).length > 0
    ? Math.round(wonDeals.length / deals.filter((d) => ["won", "lost"].includes(d.stage)).length * 100)
    : 0;

  const sections: RhythmSection[] = [
    {
      titleEn: "Business Health", titleAr: "صحة الأعمال", icon: "heart",
      items: [
        { id: "m1", labelEn: "Overall health score", labelAr: "مؤشر الصحة الكلي",
          valueEn: `${health.score}/100`, valueAr: `${health.score}/100`,
          status: health.score >= 70 ? "green" : health.score >= 50 ? "amber" : "red" },
        { id: "m2", labelEn: "Sales health", labelAr: "صحة المبيعات",
          valueEn: `${health.salesScore}/100`, valueAr: `${health.salesScore}/100`,
          status: health.salesScore >= 70 ? "green" : health.salesScore >= 50 ? "amber" : "red" },
        { id: "m3", labelEn: "Work health", labelAr: "صحة العمل",
          valueEn: `${health.workScore}/100`, valueAr: `${health.workScore}/100`,
          status: health.workScore >= 70 ? "green" : health.workScore >= 50 ? "amber" : "red" },
        { id: "m4", labelEn: "Finance health", labelAr: "الصحة المالية",
          valueEn: `${health.financeScore}/100`, valueAr: `${health.financeScore}/100`,
          status: health.financeScore >= 70 ? "green" : health.financeScore >= 50 ? "amber" : "red" },
      ],
    },
    {
      titleEn: "Sales & Relationships", titleAr: "المبيعات والعلاقات", icon: "users",
      items: [
        { id: "m5", labelEn: "Win rate", labelAr: "معدل الفوز",
          valueEn: `${winRate}%`, valueAr: `${winRate}%`,
          status: winRate >= 60 ? "green" : winRate >= 40 ? "amber" : "red" },
        { id: "m6", labelEn: "Active contacts", labelAr: "جهات اتصال نشطة",
          valueEn: `${activeContacts.length} of ${people.length}`, valueAr: `${activeContacts.length} من ${people.length}`,
          status: activeContacts.length / Math.max(people.length, 1) >= 0.6 ? "green" : "amber" },
        { id: "m7", labelEn: "At-risk accounts", labelAr: "حسابات في خطر",
          valueEn: `${atRiskOrgs.length} orgs`, valueAr: `${atRiskOrgs.length} منظمة`,
          status: atRiskOrgs.length === 0 ? "green" : atRiskOrgs.length <= 1 ? "amber" : "red",
          actionEn: atRiskOrgs.length > 0 ? "Review and re-engage" : undefined,
          actionAr: atRiskOrgs.length > 0 ? "راجع وأعد التواصل" : undefined },
      ],
    },
  ];

  return {
    type: "monthly", overallScore: health.score,
    titleEn: "Monthly Business Review", titleAr: "المراجعة التجارية الشهرية",
    subtitleEn: "Assess health, patterns, and trajectory", subtitleAr: "قيّم الصحة والأنماط والمسار",
    sections,
  };
}

export function getQuarterlyReview(): RhythmReview {
  const health = computeBusinessHealth();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const resources = loadResources();
  const work = loadWorkItems();

  const collectedRev = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0);
  const expenses = loadExpenses().reduce((s, e) => s + e.amount, 0);
  const margin = collectedRev > 0 ? Math.round((collectedRev - expenses) / collectedRev * 100) : 0;
  const activeRes = resources.filter((r) => r.status === "active");
  const avgUtil = activeRes.length > 0 ? Math.round(activeRes.reduce((s, r) => s + r.utilization, 0) / activeRes.length) : 0;
  const completionRate = work.length > 0 ? Math.round(work.filter((w) => w.status === "done").length / work.length * 100) : 0;
  const wonValue = deals.filter((d) => d.stage === "won").reduce((s, d) => s + d.value, 0);

  const sections: RhythmSection[] = [
    {
      titleEn: "Financial Performance", titleAr: "الأداء المالي", icon: "landmark",
      items: [
        { id: "q1", labelEn: "Revenue collected", labelAr: "الإيرادات المحصّلة",
          valueEn: fmt(collectedRev), valueAr: fmt(collectedRev),
          status: collectedRev > 0 ? "green" : "red" },
        { id: "q2", labelEn: "Profit margin", labelAr: "هامش الربح",
          valueEn: `${margin}%`, valueAr: `${margin}%`,
          status: margin >= 20 ? "green" : margin >= 10 ? "amber" : "red" },
        { id: "q3", labelEn: "Deals won (value)", labelAr: "قيمة الصفقات الرابحة",
          valueEn: fmt(wonValue), valueAr: fmt(wonValue),
          status: wonValue > 0 ? "green" : "amber" },
      ],
    },
    {
      titleEn: "Strategic Progress", titleAr: "التقدم الاستراتيجي", icon: "target",
      items: [
        { id: "q4", labelEn: "Overall health", labelAr: "الصحة الكلية",
          valueEn: `${health.score}/100`, valueAr: `${health.score}/100`,
          status: health.score >= 70 ? "green" : health.score >= 50 ? "amber" : "red" },
        { id: "q5", labelEn: "Work completion rate", labelAr: "معدل إنجاز العمل",
          valueEn: `${completionRate}%`, valueAr: `${completionRate}%`,
          status: completionRate >= 60 ? "green" : completionRate >= 35 ? "amber" : "red" },
        { id: "q6", labelEn: "Asset utilization", labelAr: "استخدام الأصول",
          valueEn: `${avgUtil}%`, valueAr: `${avgUtil}%`,
          status: avgUtil >= 65 ? "green" : avgUtil >= 40 ? "amber" : "red" },
        { id: "q7", labelEn: "Active pipeline deals", labelAr: "صفقات خط الأنابيب النشط",
          valueEn: `${deals.filter((d) => !["won", "lost"].includes(d.stage)).length}`, valueAr: `${deals.filter((d) => !["won", "lost"].includes(d.stage)).length}`,
          status: deals.filter((d) => !["won", "lost"].includes(d.stage)).length >= 3 ? "green" : "amber" },
      ],
    },
  ];

  return {
    type: "quarterly", overallScore: health.score,
    titleEn: "Quarterly Business Review", titleAr: "المراجعة التجارية الربع سنوية",
    subtitleEn: "Strategic assessment and forward planning", subtitleAr: "التقييم الاستراتيجي والتخطيط المستقبلي",
    sections,
  };
}

// ─── 9. Organization Graph ────────────────────────────────

export interface OrgGraphNode {
  id: string;
  label: string;
  labelAr: string;
  type: "org" | "person" | "deal" | "work";
  color: string;
  bgColor: string;
  size: number;
  x: number;
  y: number;
  meta: string;
  metaAr: string;
}

export interface OrgGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  strokeColor: string;
}

export function buildOrgGraph(): { nodes: OrgGraphNode[]; edges: OrgGraphEdge[] } {
  const rels = allRels();
  const orgs = ORGANIZATIONS.slice(0, 5);
  const people = PEOPLE.slice(0, 6);
  const deals = loadDeals().filter((d) => !["won", "lost"].includes(d.stage)).slice(0, 4);
  const work = loadWorkItems().filter((w) => w.status !== "done").slice(0, 4);

  const CX = 500, CY = 340;
  const nodes: OrgGraphNode[] = [];

  // Orgs on outer ring
  orgs.forEach((org, i) => {
    const angle = (i / orgs.length) * Math.PI * 2 - Math.PI / 2;
    const r = 240;
    nodes.push({
      id: `org:${org.id}`,
      label: org.nameEn.length > 16 ? org.nameEn.slice(0, 14) + "…" : org.nameEn,
      labelAr: org.nameAr.length > 16 ? org.nameAr.slice(0, 14) + "…" : org.nameAr,
      type: "org",
      color: "#0ea5e9",
      bgColor: "#e0f2fe",
      size: 14,
      x: Math.round(CX + Math.cos(angle) * r),
      y: Math.round(CY + Math.sin(angle) * r),
      meta: org.relationship,
      metaAr: org.relationship === "customer" ? "عميل" : org.relationship === "supplier" ? "مورد" : org.relationship === "prospect" ? "محتمل" : "شريك",
    });
  });

  // People on inner ring
  people.forEach((person, i) => {
    const angle = (i / people.length) * Math.PI * 2 - Math.PI / 2;
    const r = 140;
    nodes.push({
      id: `person:${person.id}`,
      label: person.nameEn.split(" ")[0],
      labelAr: person.nameAr.split(" ")[0],
      type: "person",
      color: "#a855f7",
      bgColor: "#f3e8ff",
      size: 10,
      x: Math.round(CX + Math.cos(angle) * r),
      y: Math.round(CY + Math.sin(angle) * r),
      meta: person.status,
      metaAr: person.status === "active" ? "نشط" : "خامل",
    });
  });

  // Deals scattered
  deals.forEach((deal, i) => {
    const angle = (i / deals.length) * Math.PI * 2 + Math.PI / 4;
    const r = 185;
    nodes.push({
      id: `deal:${deal.id}`,
      label: deal.titleEn.split("—")[0].trim().slice(0, 14) + "…",
      labelAr: deal.titleAr.split("—")[0].trim().slice(0, 14) + "…",
      type: "deal",
      color: "#f59e0b",
      bgColor: "#fef3c7",
      size: 9,
      x: Math.round(CX + Math.cos(angle) * r),
      y: Math.round(CY + Math.sin(angle) * r),
      meta: deal.stage,
      metaAr: STAGE_META[deal.stage].ar,
    });
  });

  // Work items close to center
  work.forEach((w, i) => {
    const angle = (i / work.length) * Math.PI * 2 + Math.PI;
    const r = 90;
    nodes.push({
      id: `work:${w.id}`,
      label: w.titleEn.split("—")[0].trim().slice(0, 14) + "…",
      labelAr: w.titleAr.split("—")[0].trim().slice(0, 14) + "…",
      type: "work",
      color: "#22c55e",
      bgColor: "#dcfce7",
      size: 8,
      x: Math.round(CX + Math.cos(angle) * r),
      y: Math.round(CY + Math.sin(angle) * r),
      meta: w.status,
      metaAr: STATUS_META[w.status].ar,
    });
  });

  // Build edges from relationships
  const edges: OrgGraphEdge[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  rels.slice(0, 25).forEach((r) => {
    const srcId = `${r.sourceType}:${r.sourceId}`;
    const tgtId = `${r.targetType}:${r.targetId}`;
    if (nodeIds.has(srcId) && nodeIds.has(tgtId)) {
      edges.push({
        id: `edge-${r.id}`,
        source: srcId,
        target: tgtId,
        label: r.kind.replace("_", " "),
        strokeColor: r.kind === "assigned_to" ? "#a855f7" : r.kind === "belongs_to" ? "#0ea5e9" : r.kind === "references" ? "#f59e0b" : "#94a3b8",
      });
    }
  });

  return { nodes, edges };
}

// ─── 10. Executive Mode summary ───────────────────────────

export interface ExecutiveOutcome {
  id: string;
  dimensionEn: string;
  dimensionAr: string;
  valueEn: string;
  valueAr: string;
  trend: "up" | "stable" | "down";
  score: number;
  contextEn: string;
  contextAr: string;
  color: string;
}

export function getExecutiveOutcomes(): ExecutiveOutcome[] {
  const health = computeBusinessHealth();
  const deals = loadDeals();
  const invoices = loadInvoices();
  const work = loadWorkItems();
  const resources = loadResources();
  const people = PEOPLE;

  const pipelineValue = deals.filter((d) => !["won", "lost"].includes(d.stage))
    .reduce((s, d) => s + d.value * d.probability / 100, 0);
  const collected = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.paidAmount, 0);
  const doneRate = work.length > 0 ? Math.round(work.filter((w) => w.status === "done").length / work.length * 100) : 0;
  const avgUtil = resources.filter((r) => r.status === "active").length > 0
    ? Math.round(resources.filter((r) => r.status === "active").reduce((s, r) => s + r.utilization, 0) / resources.filter((r) => r.status === "active").length)
    : 0;
  const activeContacts = people.filter((p) => p.status === "active").length;
  const negotiating = deals.filter((d) => d.stage === "negotiation");

  return [
    {
      id: "eo-revenue",
      dimensionEn: "Revenue Pipeline",
      dimensionAr: "خط أنابيب الإيرادات",
      valueEn: fmt(pipelineValue),
      valueAr: fmt(pipelineValue),
      trend: pipelineValue > 1000000 ? "up" : pipelineValue > 300000 ? "stable" : "down",
      score: health.salesScore,
      contextEn: `${negotiating.length} deals in negotiation. ${fmt(collected)} collected.`,
      contextAr: `${negotiating.length} صفقات في التفاوض. ${fmt(collected)} محصّل.`,
      color: "#f59e0b",
    },
    {
      id: "eo-ops",
      dimensionEn: "Operational Velocity",
      dimensionAr: "السرعة التشغيلية",
      valueEn: `${doneRate}% complete`,
      valueAr: `${doneRate}% مكتمل`,
      trend: doneRate >= 60 ? "up" : doneRate >= 30 ? "stable" : "down",
      score: health.workScore,
      contextEn: `${work.filter((w) => w.status === "in_progress").length} items in flight. ${work.filter((w) => w.status === "done").length} done.`,
      contextAr: `${work.filter((w) => w.status === "in_progress").length} عناصر جارية. ${work.filter((w) => w.status === "done").length} مكتملة.`,
      color: "#3b82f6",
    },
    {
      id: "eo-finance",
      dimensionEn: "Cash & Finance",
      dimensionAr: "النقد والمالية",
      valueEn: fmt(collected),
      valueAr: fmt(collected),
      trend: invoices.filter((i) => i.status === "overdue").length === 0 ? "up" : "down",
      score: health.financeScore,
      contextEn: `${invoices.filter((i) => i.status === "overdue").length} overdue. ${invoices.filter((i) => i.status === "sent").length} pending.`,
      contextAr: `${invoices.filter((i) => i.status === "overdue").length} متأخرة. ${invoices.filter((i) => i.status === "sent").length} معلقة.`,
      color: "#10b981",
    },
    {
      id: "eo-assets",
      dimensionEn: "Asset Performance",
      dimensionAr: "أداء الأصول",
      valueEn: `${avgUtil}% utilized`,
      valueAr: `${avgUtil}% مستخدم`,
      trend: avgUtil >= 65 ? "up" : avgUtil >= 40 ? "stable" : "down",
      score: health.resourceScore,
      contextEn: `${resources.filter((r) => r.status === "active").length} active assets. ${resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length} overdue maintenance.`,
      contextAr: `${resources.filter((r) => r.status === "active").length} أصول نشطة. ${resources.filter((r) => r.maintenance.some((m) => m.status === "overdue")).length} صيانة متأخرة.`,
      color: "#8b5cf6",
    },
    {
      id: "eo-network",
      dimensionEn: "Relationship Network",
      dimensionAr: "شبكة العلاقات",
      valueEn: `${activeContacts} active contacts`,
      valueAr: `${activeContacts} جهة اتصال نشطة`,
      trend: activeContacts / Math.max(people.length, 1) >= 0.6 ? "up" : "stable",
      score: Math.round(activeContacts / Math.max(people.length, 1) * 100),
      contextEn: `${ORGANIZATIONS.filter((o) => o.healthScore >= 70).length} healthy orgs. ${people.filter((p) => p.status === "inactive").length} dormant contacts.`,
      contextAr: `${ORGANIZATIONS.filter((o) => o.healthScore >= 70).length} منظمات صحية. ${people.filter((p) => p.status === "inactive").length} جهات اتصال خاملة.`,
      color: "#06b6d4",
    },
    {
      id: "eo-health",
      dimensionEn: "Overall Health",
      dimensionAr: "الصحة الكلية",
      valueEn: `${health.score}/100`,
      valueAr: `${health.score}/100`,
      trend: health.score >= 70 ? "up" : health.score >= 50 ? "stable" : "down",
      score: health.score,
      contextEn: `${health.level.replace("_", " ")} status. All dimensions measured.`,
      contextAr: `مستوى ${health.level === "excellent" ? "ممتاز" : health.level === "healthy" ? "صحي" : health.level === "attention" ? "يحتاج اهتماماً" : "في خطر"}. جميع الأبعاد مقاسة.`,
      color: "#f43f5e",
    },
  ];
}
