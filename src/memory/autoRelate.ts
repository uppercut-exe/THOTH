import { loadWorkItems } from "../data/work";
import { loadDeals } from "../data/sales";
import { loadInvoices } from "../data/finance";
import { loadResources } from "../data/resources";
import { PEOPLE } from "../data/people";
import { ORGANIZATIONS } from "../data/organizations";
import type { Relationship, RelationshipKind, EntityType } from "./relationshipStore";

function makeRel(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  kind: RelationshipKind
): Omit<Relationship, "id" | "createdAt"> {
  return { sourceType, sourceId, targetType, targetId, kind, auto: true };
}

function dedup(rels: Omit<Relationship, "id" | "createdAt">[]): Omit<Relationship, "id" | "createdAt">[] {
  const seen = new Set<string>();
  return rels.filter((r) => {
    const key = `${r.sourceType}:${r.sourceId}→${r.targetType}:${r.targetId}:${r.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectAutoRelationships(): Omit<Relationship, "id" | "createdAt">[] {
  const raw: Omit<Relationship, "id" | "createdAt">[] = [];

  const personIds = new Set(PEOPLE.map((p) => p.id));
  const orgIds = new Set(ORGANIZATIONS.map((o) => o.id));

  // Work items
  for (const w of loadWorkItems()) {
    if (w.relatedPersonId && personIds.has(w.relatedPersonId)) {
      raw.push(makeRel("work", w.id, "person", w.relatedPersonId, "assigned_to"));
    }
    if (w.relatedOrgId && orgIds.has(w.relatedOrgId)) {
      raw.push(makeRel("work", w.id, "organization", w.relatedOrgId, "belongs_to"));
    }
  }

  // Deals
  for (const d of loadDeals()) {
    if (d.orgId && orgIds.has(d.orgId)) {
      raw.push(makeRel("deal", d.id, "organization", d.orgId, "belongs_to"));
    }
    if (d.relatedWorkIds) {
      for (const wId of d.relatedWorkIds) {
        raw.push(makeRel("deal", d.id, "work", wId, "references"));
      }
    }
  }

  // Invoices
  for (const inv of loadInvoices()) {
    if (inv.orgId && orgIds.has(inv.orgId)) {
      raw.push(makeRel("invoice", inv.id, "organization", inv.orgId, "belongs_to"));
    }
    if (inv.relatedDealId) {
      raw.push(makeRel("invoice", inv.id, "deal", inv.relatedDealId, "created_from"));
    }
  }

  // Resources
  for (const r of loadResources()) {
    if (r.relatedWorkId) {
      raw.push(makeRel("resource", r.id, "work", r.relatedWorkId, "uses"));
    }
  }

  return dedup(raw);
}

export function mergeAutoIntoStore(
  stored: Relationship[],
  autoRels: Omit<Relationship, "id" | "createdAt">[]
): Relationship[] {
  const result = [...stored];
  const existingKeys = new Set(
    stored.map((r) => `${r.sourceType}:${r.sourceId}→${r.targetType}:${r.targetId}:${r.kind}`)
  );

  let counter = 0;
  for (const rel of autoRels) {
    const key = `${rel.sourceType}:${rel.sourceId}→${rel.targetType}:${rel.targetId}:${rel.kind}`;
    if (!existingKeys.has(key)) {
      result.push({
        ...rel,
        id: `auto-${Date.now()}-${counter++}`,
        createdAt: new Date().toISOString(),
      });
      existingKeys.add(key);
    }
  }
  return result;
}
