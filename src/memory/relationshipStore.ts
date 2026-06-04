// ─── Entity & relationship types ─────────────────────────

export type EntityType =
  | "person"
  | "organization"
  | "work"
  | "deal"
  | "invoice"
  | "resource";

export type RelationshipKind =
  | "related_to"
  | "assigned_to"
  | "belongs_to"
  | "involved_in"
  | "references"
  | "created_from"
  | "uses"
  | "mentioned_in";

export interface Relationship {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  kind: RelationshipKind;
  createdAt: string;
  auto: boolean;
  label?: string;
}

// ─── Persistence ─────────────────────────────────────────

const STORAGE_KEY = "thoth_relationships";

export function loadRelationships(): Relationship[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
    }
  } catch (_) {}
  return [];
}

export function saveRelationships(rels: Relationship[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rels));
  } catch (_) {}
}

// ─── CRUD ────────────────────────────────────────────────

export function addRelationship(
  rel: Omit<Relationship, "id" | "createdAt">,
  existing: Relationship[]
): Relationship[] {
  const duplicate = existing.some(
    (r) =>
      r.sourceType === rel.sourceType &&
      r.sourceId === rel.sourceId &&
      r.targetType === rel.targetType &&
      r.targetId === rel.targetId &&
      r.kind === rel.kind
  );
  if (duplicate) return existing;

  const newRel: Relationship = {
    ...rel,
    id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [...existing, newRel];
  saveRelationships(updated);
  return updated;
}

export function removeRelationship(
  id: string,
  existing: Relationship[]
): Relationship[] {
  const updated = existing.filter((r) => r.id !== id);
  saveRelationships(updated);
  return updated;
}

// ─── Queries ─────────────────────────────────────────────

export function getRelationshipsForEntity(
  type: EntityType,
  id: string,
  rels: Relationship[]
): Relationship[] {
  return rels.filter(
    (r) =>
      (r.sourceType === type && r.sourceId === id) ||
      (r.targetType === type && r.targetId === id)
  );
}

export function getOutgoing(
  type: EntityType,
  id: string,
  rels: Relationship[]
): Relationship[] {
  return rels.filter((r) => r.sourceType === type && r.sourceId === id);
}

export function getIncoming(
  type: EntityType,
  id: string,
  rels: Relationship[]
): Relationship[] {
  return rels.filter((r) => r.targetType === type && r.targetId === id);
}
