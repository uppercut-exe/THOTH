export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          plan: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workspaces"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["workspaces"]["Insert"]>;
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "member" | "viewer";
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["workspace_members"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["workspace_members"]["Insert"]>;
      };
      people: {
        Row: {
          id: string;
          workspace_id: string;
          name_en: string;
          name_ar: string | null;
          email: string | null;
          phone: string | null;
          role_en: string | null;
          role_ar: string | null;
          organization_id: string | null;
          avatar_url: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["people"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
      };
      organizations: {
        Row: {
          id: string;
          workspace_id: string;
          name_en: string;
          name_ar: string | null;
          sector: string | null;
          lifecycle: string | null;
          health_score: number;
          headcount: number | null;
          website: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      work_items: {
        Row: {
          id: string;
          workspace_id: string;
          title_en: string;
          title_ar: string | null;
          type: "task" | "project" | "milestone" | "action" | "initiative" | "ticket" | "request" | "purchase_request" | "purchase_order" | "stock_movement" | "maintenance";
          status: "backlog" | "planned" | "todo" | "in_progress" | "review" | "done" | "blocked" | "cancelled" | "draft" | "submitted" | "approved" | "rejected" | "ordered" | "sent" | "partially_received" | "received";
          priority: "critical" | "urgent" | "high" | "medium" | "low";
          assignee_id: string | null;
          parent_id: string | null;
          organization_id: string | null;
          due_date: string | null;
          progress: number;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["work_items"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["work_items"]["Insert"]>;
      };
      deals: {
        Row: {
          id: string;
          workspace_id: string;
          title_en: string;
          title_ar: string | null;
          value: number;
          currency: string;
          stage: string;
          probability: number;
          org_name_en: string | null;
          org_name_ar: string | null;
          contact_name_en: string | null;
          contact_name_ar: string | null;
          organization_id: string | null;
          expected_close_date: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["deals"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["deals"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          number: string;
          org_name_en: string;
          org_name_ar: string | null;
          organization_id: string | null;
          deal_id: string | null;
          amount: number;
          currency: string;
          status: string;
          due_date: string | null;
          paid_date: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string | null;
          amount: number;
          currency: string;
          method: string | null;
          status: string;
          paid_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payments"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string;
          workspace_id: string;
          description_en: string;
          description_ar: string | null;
          amount: number;
          currency: string;
          category: string | null;
          date: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      resources: {
        Row: {
          id: string;
          workspace_id: string;
          name_en: string;
          name_ar: string | null;
          type: string;
          utilization: number;
          department: string | null;
          skills: string[];
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["resources"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["resources"]["Insert"]>;
      };
      activity_events: {
        Row: {
          id: string;
          workspace_id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          description_en: string | null;
          description_ar: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_events"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
