import { useLocation } from "wouter";
import { useMemory } from "../context/MemoryContext";
import { useLanguage } from "../context/LanguageContext";
import { getEntityMeta, TYPE_DOT_COLORS } from "../memory/memoryGraph";
import type { EntityType } from "../memory/relationshipStore";
import { Briefcase, TrendingUp, Users, Building2, DollarSign, Package, GitBranch } from "lucide-react";

const TYPE_ICONS: Record<EntityType, React.ElementType> = {
  work:         Briefcase,
  deal:         TrendingUp,
  person:       Users,
  organization: Building2,
  invoice:      DollarSign,
  resource:     Package,
};

export interface TimelineEntry {
  id: string;
  titleEn: string;
  titleAr: string;
  descEn?: string;
  descAr?: string;
  dateEn: string;
  dateAr: string;
  kind: string;
  actorEn?: string;
  actorAr?: string;
}

interface SmartTimelineProps {
  entries: TimelineEntry[];
  entityType?: EntityType;
  entityId?: string;
  showConnected?: boolean;
}

export function SmartTimeline({ entries, entityType, entityId, showConnected = false }: SmartTimelineProps) {
  const { getRelatedFor } = useMemory();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const connected = entityType && entityId && showConnected
    ? getRelatedFor(entityType, entityId)
    : [];

  const kindIcon = (kind: string) => {
    const map: Record<string, string> = {
      created: "✦",
      assigned: "→",
      status_changed: "⟳",
      comment: "◎",
      file_uploaded: "↑",
      completed: "✓",
      priority_changed: "▲",
      note: "◉",
      meeting: "⬡",
      email: "✉",
      call: "⌁",
    };
    return map[kind] ?? "·";
  };

  return (
    <div className="relative px-6 py-2">
      {/* Connected entities bar */}
      {connected.length > 0 && showConnected && (
        <div className="mb-4 p-3 rounded-xl bg-muted/30 border border-border/30">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">
            {ar ? "سجلات مرتبطة" : "Connected Records"}
          </p>
          <div className="flex flex-wrap gap-2">
            {connected.slice(0, 6).map((r) => {
              const Icon = TYPE_ICONS[r.meta.type];
              const dot = TYPE_DOT_COLORS[r.meta.type];
              return (
                <button
                  key={r.meta.id}
                  onClick={() => navigate(r.meta.route)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/40 text-[12px] text-foreground hover:border-primary/30 hover:text-primary transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                  <span className="truncate max-w-[120px]">{ar ? r.meta.titleAr : r.meta.titleEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute start-[11px] top-4 bottom-4 w-px bg-border/40" />
        <div className="space-y-0">
          {entries.map((e, i) => (
            <div key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Node */}
              <div className="relative z-10 w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] text-muted-foreground font-bold leading-none">
                  {kindIcon(e.kind)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground leading-snug">
                    {ar ? e.titleAr : e.titleEn}
                  </p>
                  <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap shrink-0">
                    {ar ? e.dateAr : e.dateEn}
                  </span>
                </div>
                {(e.descEn || e.descAr) && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    {ar ? e.descAr : e.descEn}
                  </p>
                )}
                {e.actorEn && (
                  <p className="text-[11px] text-muted-foreground/50 mt-1">
                    {ar ? e.actorAr : e.actorEn}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
