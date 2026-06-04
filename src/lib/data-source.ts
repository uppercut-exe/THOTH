/**
 * Data Adapter Layer
 *
 * Unified interface that switches transparently between demo data
 * (static arrays) and live Supabase data based on env vars.
 *
 * Table mapping (schema → adapter key):
 *   work_items      → ds.work_items
 *   activity_events → ds.activity_events
 *   (all others match their Supabase table names exactly)
 */

import { supabase, isDemoMode } from "./supabase";
import { loadDeals } from "../data/sales";
import { loadWorkItems } from "../data/work";
import { loadInvoices, loadPayments, loadExpenses } from "../data/finance";
import { PEOPLE } from "../data/people";
import { ORGANIZATIONS } from "../data/organizations";
import { loadResources } from "../data/resources";
import type { Database } from "./database.types";

// ─── Generic CRUD shape ────────────────────────────────────

export interface EntityAdapter<T> {
  list(workspaceId: string, filters?: Record<string, unknown>): Promise<T[]>;
  get(workspaceId: string, id: string): Promise<T | null>;
  create(workspaceId: string, data: Partial<T>): Promise<T | null>;
  update(workspaceId: string, id: string, data: Partial<T>): Promise<T | null>;
  remove(workspaceId: string, id: string): Promise<boolean>;
}

type Tables = Database["public"]["Tables"];

// ─── Supabase adapter factory ──────────────────────────────

function makeSupabaseAdapter<T extends { id: string; workspace_id: string }>(
  table: keyof Tables
): EntityAdapter<T> {
  return {
    async list(workspaceId, filters) {
      if (!supabase) return [];
      let query = supabase.from(table as string).select("*").eq("workspace_id", workspaceId);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          query = query.eq(k, v as string);
        }
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) { console.error(`[DS] ${table} list error`, error); return []; }
      return (data ?? []) as T[];
    },

    async get(workspaceId, id) {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from(table as string)
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .single();
      if (error) { console.error(`[DS] ${table} get error`, error); return null; }
      return data as T;
    },

    async create(workspaceId, payload) {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from(table as string)
        .insert({ ...payload, workspace_id: workspaceId })
        .select()
        .single();
      if (error) { console.error(`[DS] ${table} create error`, error); return null; }
      return data as T;
    },

    async update(workspaceId, id, payload) {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from(table as string)
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .select()
        .single();
      if (error) { console.error(`[DS] ${table} update error`, error); return null; }
      return data as T;
    },

    async remove(workspaceId, id) {
      if (!supabase) return false;
      const { error } = await supabase
        .from(table as string)
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id);
      if (error) { console.error(`[DS] ${table} delete error`, error); return false; }
      return true;
    },
  };
}

// ─── Demo adapters (wrap static data as async) ────────────

function makeDemoAdapter<T>(loader: () => T[]): EntityAdapter<T> {
  return {
    async list() { return loader(); },
    async get(_ws, id) { return loader().find((r: unknown) => (r as { id: string }).id === id) ?? null; },
    async create(_ws, data) {
      console.warn("[DS] Demo mode — create is ephemeral");
      return { ...data, id: `demo-${Date.now()}` } as T;
    },
    async update(_ws, _id, data) {
      console.warn("[DS] Demo mode — update is ephemeral");
      return data as T;
    },
    async remove() {
      console.warn("[DS] Demo mode — delete is ephemeral");
      return true;
    },
  };
}

// ─── DataSource interface ──────────────────────────────────

export interface DataSource {
  mode: "demo" | "live";
  deals:           EntityAdapter<Tables["deals"]["Row"]>;
  invoices:        EntityAdapter<Tables["invoices"]["Row"]>;
  payments:        EntityAdapter<Tables["payments"]["Row"]>;
  expenses:        EntityAdapter<Tables["expenses"]["Row"]>;
  people:          EntityAdapter<Tables["people"]["Row"]>;
  organizations:   EntityAdapter<Tables["organizations"]["Row"]>;
  work_items:      EntityAdapter<Tables["work_items"]["Row"]>;
  resources:       EntityAdapter<Tables["resources"]["Row"]>;
  activity_events: EntityAdapter<Tables["activity_events"]["Row"]>;
}

// ─── Demo DataSource ───────────────────────────────────────

const demoDataSource: DataSource = {
  mode: "demo",
  deals:           makeDemoAdapter(loadDeals as () => Tables["deals"]["Row"][]),
  invoices:        makeDemoAdapter(loadInvoices as () => Tables["invoices"]["Row"][]),
  payments:        makeDemoAdapter(loadPayments as () => Tables["payments"]["Row"][]),
  expenses:        makeDemoAdapter(loadExpenses as () => Tables["expenses"]["Row"][]),
  people:          makeDemoAdapter(() => PEOPLE as unknown as Tables["people"]["Row"][]),
  organizations:   makeDemoAdapter(() => ORGANIZATIONS as unknown as Tables["organizations"]["Row"][]),
  resources:       makeDemoAdapter(loadResources as () => Tables["resources"]["Row"][]),
  work_items:      makeDemoAdapter(loadWorkItems as () => Tables["work_items"]["Row"][]),
  activity_events: makeDemoAdapter(() => []),
};

// ─── Live DataSource ───────────────────────────────────────

const liveDataSource: DataSource = {
  mode: "live",
  deals:           makeSupabaseAdapter("deals"),
  invoices:        makeSupabaseAdapter("invoices"),
  payments:        makeSupabaseAdapter("payments"),
  expenses:        makeSupabaseAdapter("expenses"),
  people:          makeSupabaseAdapter("people"),
  organizations:   makeSupabaseAdapter("organizations"),
  work_items:      makeSupabaseAdapter("work_items"),
  resources:       makeSupabaseAdapter("resources"),
  activity_events: makeSupabaseAdapter("activity_events"),
};

// ─── Public API ────────────────────────────────────────────

export function getDataSource(): DataSource {
  return isDemoMode ? demoDataSource : liveDataSource;
}

export { isDemoMode };
