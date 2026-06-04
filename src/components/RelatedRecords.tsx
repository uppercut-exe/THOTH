import { useLocation } from "wouter";
import { Briefcase, TrendingUp, Users, Building2, DollarSign, Package, Link2, ArrowUpRight } from "lucide-react";
import { useMemory } from "../context/MemoryContext";
import { useLanguage } from "../context/LanguageContext";
import { TYPE_LABELS, type EntityMeta } from "../memory/memoryGraph";
import type { EntityType } from "../memory/relationshipStore";

const TYPE_ICONS: Record<EntityType, React.ElementType> = {
  work:         Briefcase,
  deal:         TrendingUp,
  person:       Users,
  organization: Building2,
  invoice:      DollarSign,
  resource:     Package,
};

const TYPE_NODE_COLORS: Record<EntityType, string> = {
  work:         "bg-amber-100 text-amber-700",
  deal:         "bg-emerald-100 text-emerald-700",
  person:       "bg-blue-100 text-blue-700",
  organization: "bg-violet-100 text-violet-700",
  invoice:      "bg-rose-100 text-rose-700",
  resource:     "bg-cyan-100 text-cyan-700",
};

const KIND_LABELS: Record<string, { en: string; ar: string }> = {
  related_to:   { en: "Related",       ar: "مرتبط" },
  assigned_to:  { en: "Assigned to",   ar: "مسند إلى" },
  belongs_to:   { en: "Belongs to",    ar: "ينتمي إلى" },
  involved_in:  { en: "Involved in",   ar: "متورط في" },
  references:   { en: "References",    ar: "يشير إلى" },
  created_from: { en: "Created from",  ar: "أُنشئ من" },
  uses:         { en: "Uses",          ar: "يستخدم" },
  mentioned_in: { en: "Mentioned in",  ar: "مذكور في" },
};

interface RelatedRecordsProps {
  entityType: EntityType;
  entityId: string;
  compact?: boolean;
}

function EntityChip({ meta, kindLabel, onNavigate }: {
  meta: EntityMeta;
  kindLabel: string;
  onNavigate: () => void;
}) {
  const Icon = TYPE_ICONS[meta.type];
  const colorClass = TYPE_NODE_COLORS[meta.type];

  return (
    <button
      onClick={onNavigate}
      className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors duration-100 text-start"
    >
      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${colorClass}`}>
        <Icon size={13} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate leading-tight">{meta.titleEn}</p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          <span className="capitalize">{kindLabel}</span>
          {meta.subtitleEn ? ` · ${meta.subtitleEn}` : ""}
        </p>
      </div>
      <ArrowUpRight size={13} strokeWidth={1.75} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
    </button>
  );
}

export function RelatedRecords({ entityType, entityId, compact = false }: RelatedRecordsProps) {
  const { getRelatedFor } = useMemory();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const related = getRelatedFor(entityType, entityId);

  if (!related.length) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="w-10 h-10 rounded-xl bg-muted mx-auto mb-3 flex items-center justify-center">
          <Link2 size={15} className="text-muted-foreground/40" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] text-muted-foreground/60">
          {ar ? "لا توجد سجلات مرتبطة" : "No related records"}
        </p>
      </div>
    );
  }

  const grouped = related.reduce<Record<string, typeof related>>((acc, r) => {
    const key = r.meta.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const typeOrder: EntityType[] = ["work", "deal", "person", "organization", "invoice", "resource"];

  return (
    <div>
      {typeOrder.map((type) => {
        const group = grouped[type];
        if (!group?.length) return null;
        const typeMeta = TYPE_LABELS[type];
        return (
          <div key={type}>
            {!compact && (
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {ar ? typeMeta.ar : typeMeta.en}
                </span>
              </div>
            )}
            {group.map((r) => {
              const kindMeta = KIND_LABELS[r.relationship.kind] ?? KIND_LABELS.related_to;
              return (
                <EntityChip
                  key={r.meta.id}
                  meta={r.meta}
                  kindLabel={ar ? kindMeta.ar : kindMeta.en}
                  onNavigate={() => navigate(r.meta.route)}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Backlinks panel ─────────────────────────────────────

export function BacklinksSection({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { getBacklinksFor } = useMemory();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const backlinks = getBacklinksFor(entityType, entityId);

  return (
    <div className="border border-border/40 rounded-xl bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <h3 className="text-[11px] font-semibold text-muted-foreground tracking-[0.08em] uppercase">
          {ar ? "مُشار إليه في" : "Referenced In"}
        </h3>
        {backlinks.length > 0 && (
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">{backlinks.length}</span>
        )}
      </div>
      {backlinks.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-[13px] text-muted-foreground/50">
            {ar ? "لم يُشر إليه في أي سجل" : "Not referenced anywhere yet"}
          </p>
        </div>
      ) : (
        backlinks.map((r) => {
          const Icon = TYPE_ICONS[r.meta.type];
          const colorClass = TYPE_NODE_COLORS[r.meta.type];
          const kindMeta = KIND_LABELS[r.relationship.kind] ?? KIND_LABELS.related_to;
          return (
            <button
              key={r.meta.id}
              onClick={() => navigate(r.meta.route)}
              className="group w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors text-start border-b border-border/20 last:border-0"
            >
              <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${colorClass}`}>
                <Icon size={13} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{ar ? r.meta.titleAr : r.meta.titleEn}</p>
                <p className="text-[11px] text-muted-foreground truncate capitalize">
                  {ar ? kindMeta.ar : kindMeta.en} · {ar ? TYPE_LABELS[r.meta.type].ar : TYPE_LABELS[r.meta.type].en}
                </p>
              </div>
              <ArrowUpRight size={13} strokeWidth={1.75} className="shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
            </button>
          );
        })
      )}
    </div>
  );
}
