import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight, Brain, Briefcase, TrendingUp, Users, Building2, DollarSign, Package } from "lucide-react";
import { useLocation } from "wouter";
import { useMemory } from "../context/MemoryContext";
import { useLanguage } from "../context/LanguageContext";
import { TYPE_LABELS, TYPE_DOT_COLORS, type EntityMeta } from "../memory/memoryGraph";
import { TYPE_LABELS as TL } from "../memory/memoryGraph";
import type { EntityType } from "../memory/relationshipStore";

const TYPE_ICONS: Record<EntityType, React.ElementType> = {
  work:         Briefcase,
  deal:         TrendingUp,
  person:       Users,
  organization: Building2,
  invoice:      DollarSign,
  resource:     Package,
};

const TYPE_BG: Record<EntityType, string> = {
  work:         "bg-amber-50 text-amber-700",
  deal:         "bg-emerald-50 text-emerald-700",
  person:       "bg-blue-50 text-blue-700",
  organization: "bg-violet-50 text-violet-700",
  invoice:      "bg-rose-50 text-rose-700",
  resource:     "bg-cyan-50 text-cyan-700",
};

interface ContextPanelProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  entityId: string;
  titleEn: string;
  titleAr: string;
}

export function ContextPanel({ open, onClose, entityType, entityId, titleEn, titleAr }: ContextPanelProps) {
  const { getRelatedFor, relCount } = useMemory();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  const related = getRelatedFor(entityType, entityId);
  const total = relCount(entityType, entityId);

  const grouped = related.reduce<Record<EntityType, EntityMeta[]>>((acc, r) => {
    const t = r.meta.type;
    if (!acc[t]) acc[t] = [];
    acc[t].push(r.meta);
    return acc;
  }, {} as Record<EntityType, EntityMeta[]>);

  const typeOrder: EntityType[] = ["person", "organization", "work", "deal", "invoice", "resource"];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="cp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden="true"
          />
          <motion.aside
            key="cp-panel"
            initial={{ x: ar ? "-100%" : "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: ar ? "-100%" : "100%", opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`
              fixed top-0 bottom-0 z-50 w-[320px] max-w-[90vw]
              ${ar ? "left-0 border-e" : "right-0 border-s"}
              border-border/50 bg-background shadow-2xl
              flex flex-col overflow-hidden
            `}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 shrink-0">
              <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${TYPE_BG[entityType]}`}>
                {(() => { const I = TYPE_ICONS[entityType]; return <I size={14} strokeWidth={1.75} />; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                  {ar ? titleAr : titleEn}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {ar ? TYPE_LABELS[entityType].ar : TYPE_LABELS[entityType].en}
                  {total > 0 && ` · ${total} ${ar ? "اتصال" : total === 1 ? "connection" : "connections"}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {total === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <Brain size={20} strokeWidth={1.5} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-[13px] text-muted-foreground/60">
                    {ar ? "لا توجد اتصالات بعد" : "No connections yet"}
                  </p>
                </div>
              ) : (
                typeOrder.map((type) => {
                  const group = grouped[type];
                  if (!group?.length) return null;
                  const typeLbl = TYPE_LABELS[type];
                  const Icon = TYPE_ICONS[type];
                  const dotColor = TYPE_DOT_COLORS[type];
                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {ar ? typeLbl.ar : typeLbl.en}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40 ms-auto tabular-nums">{group.length}</span>
                      </div>
                      {group.map((meta) => (
                        <button
                          key={meta.id}
                          onClick={() => { onClose(); navigate(meta.route); }}
                          className="group w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/40 transition-colors text-start"
                        >
                          <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center ${TYPE_BG[type]}`}>
                            <Icon size={12} strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] text-foreground truncate">{ar ? meta.titleAr : meta.titleEn}</p>
                            {meta.subtitleEn && (
                              <p className="text-[11px] text-muted-foreground truncate">{ar ? meta.subtitleAr : meta.subtitleEn}</p>
                            )}
                          </div>
                          <ArrowUpRight size={12} className="shrink-0 text-muted-foreground/20 group-hover:text-primary/50 transition-colors" />
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/30 shrink-0">
              <button
                onClick={() => { onClose(); navigate("/memory"); }}
                className="w-full flex items-center justify-center gap-2 h-8 rounded-lg border border-border/60 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Brain size={12} strokeWidth={1.75} />
                {ar ? "فتح رسم المعرفة" : "Open Knowledge Graph"}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
