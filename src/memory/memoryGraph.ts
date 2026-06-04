import { PEOPLE } from "../data/people";
import { ORGANIZATIONS } from "../data/organizations";
import { loadWorkItems } from "../data/work";
import { loadDeals } from "../data/sales";
import { loadInvoices } from "../data/finance";
import { loadResources } from "../data/resources";
import type { EntityType, Relationship } from "./relationshipStore";

// ─── Entity label resolution ─────────────────────────────

export interface EntityMeta {
  type: EntityType;
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  route: string;
  colorClass: string;
}

const TYPE_COLORS: Record<EntityType, string> = {
  person:       "bg-blue-100 text-blue-700",
  organization: "bg-violet-100 text-violet-700",
  work:         "bg-amber-100 text-amber-700",
  deal:         "bg-emerald-100 text-emerald-700",
  invoice:      "bg-rose-100 text-rose-700",
  resource:     "bg-cyan-100 text-cyan-700",
};

export const TYPE_DOT_COLORS: Record<EntityType, string> = {
  person:       "#3b82f6",
  organization: "#8b5cf6",
  work:         "#f59e0b",
  deal:         "#10b981",
  invoice:      "#f43f5e",
  resource:     "#06b6d4",
};

export const TYPE_LABELS: Record<EntityType, { en: string; ar: string }> = {
  person:       { en: "People",        ar: "الأشخاص" },
  organization: { en: "Organizations", ar: "المنظمات" },
  work:         { en: "Work",          ar: "العمل" },
  deal:         { en: "Sales",         ar: "المبيعات" },
  invoice:      { en: "Finance",       ar: "المالية" },
  resource:     { en: "Resources",     ar: "الموارد" },
};

// ─── Build entity catalog ─────────────────────────────────

let _catalog: Map<string, EntityMeta> | null = null;

function buildCatalog(): Map<string, EntityMeta> {
  const map = new Map<string, EntityMeta>();

  for (const p of PEOPLE) {
    map.set(`person:${p.id}`, {
      type: "person", id: p.id,
      titleEn: p.name, titleAr: p.nameAr,
      subtitleEn: p.role || p.company || "", subtitleAr: p.roleAr || p.companyAr || "",
      route: `/people/${p.id}`,
      colorClass: TYPE_COLORS.person,
    });
  }

  for (const o of ORGANIZATIONS) {
    map.set(`organization:${o.id}`, {
      type: "organization", id: o.id,
      titleEn: o.nameEn, titleAr: o.nameAr,
      subtitleEn: o.industryEn, subtitleAr: o.industryAr,
      route: `/organizations/${o.id}`,
      colorClass: TYPE_COLORS.organization,
    });
  }

  for (const w of loadWorkItems()) {
    map.set(`work:${w.id}`, {
      type: "work", id: w.id,
      titleEn: w.titleEn, titleAr: w.titleAr,
      subtitleEn: w.status.replace("_", " "), subtitleAr: w.titleAr,
      route: `/work/${w.id}`,
      colorClass: TYPE_COLORS.work,
    });
  }

  for (const d of loadDeals()) {
    map.set(`deal:${d.id}`, {
      type: "deal", id: d.id,
      titleEn: d.titleEn, titleAr: d.titleAr,
      subtitleEn: d.orgNameEn || d.contactNameEn, subtitleAr: d.orgNameAr || d.contactNameAr,
      route: `/sales/${d.id}`,
      colorClass: TYPE_COLORS.deal,
    });
  }

  for (const inv of loadInvoices()) {
    map.set(`invoice:${inv.id}`, {
      type: "invoice", id: inv.id,
      titleEn: `${inv.number} — ${inv.titleEn}`, titleAr: `${inv.number} — ${inv.titleAr}`,
      subtitleEn: inv.orgNameEn, subtitleAr: inv.orgNameAr,
      route: `/finance/${inv.id}`,
      colorClass: TYPE_COLORS.invoice,
    });
  }

  for (const r of loadResources()) {
    map.set(`resource:${r.id}`, {
      type: "resource", id: r.id,
      titleEn: r.nameEn, titleAr: r.nameAr,
      subtitleEn: r.type, subtitleAr: r.nameAr,
      route: `/resources/${r.id}`,
      colorClass: TYPE_COLORS.resource,
    });
  }

  return map;
}

export function getEntityCatalog(): Map<string, EntityMeta> {
  if (!_catalog) _catalog = buildCatalog();
  return _catalog;
}

export function invalidateCatalog() {
  _catalog = null;
}

export function getEntityMeta(type: EntityType, id: string): EntityMeta | undefined {
  return getEntityCatalog().get(`${type}:${id}`);
}

// ─── Graph helpers ────────────────────────────────────────

export interface RelatedEntity {
  meta: EntityMeta;
  relationship: Relationship;
  direction: "outgoing" | "incoming";
}

export function getRelatedEntities(
  type: EntityType,
  id: string,
  rels: Relationship[]
): RelatedEntity[] {
  const catalog = getEntityCatalog();
  const result: RelatedEntity[] = [];
  const seen = new Set<string>();

  for (const r of rels) {
    if (r.sourceType === type && r.sourceId === id) {
      const key = `${r.targetType}:${r.targetId}`;
      if (!seen.has(key)) {
        const meta = catalog.get(key);
        if (meta) {
          result.push({ meta, relationship: r, direction: "outgoing" });
          seen.add(key);
        }
      }
    }
    if (r.targetType === type && r.targetId === id) {
      const key = `${r.sourceType}:${r.sourceId}`;
      if (!seen.has(key)) {
        const meta = catalog.get(key);
        if (meta) {
          result.push({ meta, relationship: r, direction: "incoming" });
          seen.add(key);
        }
      }
    }
  }

  return result;
}

// ─── Graph node/edge builder for visualization ────────────

export interface GraphNode {
  id: string;
  type: EntityType;
  entityId: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
}

export function buildGraph(
  rels: Relationship[],
  filter?: Set<EntityType>
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const catalog = getEntityCatalog();
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const r of rels) {
    const srcKey = `${r.sourceType}:${r.sourceId}`;
    const tgtKey = `${r.targetType}:${r.targetId}`;

    if (filter && (!filter.has(r.sourceType) || !filter.has(r.targetType))) continue;

    const srcMeta = catalog.get(srcKey);
    const tgtMeta = catalog.get(tgtKey);
    if (!srcMeta || !tgtMeta) continue;

    if (!nodeMap.has(srcKey)) {
      nodeMap.set(srcKey, {
        id: srcKey, type: r.sourceType, entityId: r.sourceId,
        label: srcMeta.titleEn,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 300,
        vx: 0, vy: 0,
      });
    }
    if (!nodeMap.has(tgtKey)) {
      nodeMap.set(tgtKey, {
        id: tgtKey, type: r.targetType, entityId: r.targetId,
        label: tgtMeta.titleEn,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 300,
        vx: 0, vy: 0,
      });
    }

    edges.push({ id: r.id, source: srcKey, target: tgtKey, kind: r.kind });
  }

  return { nodes: Array.from(nodeMap.values()), edges };
}
