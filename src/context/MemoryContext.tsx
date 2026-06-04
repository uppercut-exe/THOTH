import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  loadRelationships, saveRelationships, addRelationship, removeRelationship,
  type Relationship, type EntityType, type RelationshipKind,
} from "../memory/relationshipStore";
import { getRelatedEntities, type RelatedEntity } from "../memory/memoryGraph";
import { detectAutoRelationships, mergeAutoIntoStore } from "../memory/autoRelate";

interface MemoryContextType {
  relationships: Relationship[];
  addRel: (rel: Omit<Relationship, "id" | "createdAt">) => void;
  removeRel: (id: string) => void;
  getRelatedFor: (type: EntityType, id: string) => RelatedEntity[];
  getBacklinksFor: (type: EntityType, id: string) => RelatedEntity[];
  relCount: (type: EntityType, id: string) => number;
  ready: boolean;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored = loadRelationships();
    const autoRels = detectAutoRelationships();
    const merged = mergeAutoIntoStore(stored, autoRels);
    if (merged.length !== stored.length) {
      saveRelationships(merged);
    }
    setRelationships(merged);
    setReady(true);
  }, []);

  const addRel = useCallback((rel: Omit<Relationship, "id" | "createdAt">) => {
    setRelationships((prev) => {
      const updated = addRelationship(rel, prev);
      return updated;
    });
  }, []);

  const removeRel = useCallback((id: string) => {
    setRelationships((prev) => removeRelationship(id, prev));
  }, []);

  const getRelatedFor = useCallback(
    (type: EntityType, id: string): RelatedEntity[] => {
      return getRelatedEntities(type, id, relationships);
    },
    [relationships]
  );

  const getBacklinksFor = useCallback(
    (type: EntityType, id: string): RelatedEntity[] => {
      return getRelatedEntities(type, id, relationships).filter(
        (r) => r.direction === "incoming"
      );
    },
    [relationships]
  );

  const relCount = useCallback(
    (type: EntityType, id: string): number => {
      return relationships.filter(
        (r) =>
          (r.sourceType === type && r.sourceId === id) ||
          (r.targetType === type && r.targetId === id)
      ).length;
    },
    [relationships]
  );

  return (
    <MemoryContext.Provider value={{ relationships, addRel, removeRel, getRelatedFor, getBacklinksFor, relCount, ready }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}
