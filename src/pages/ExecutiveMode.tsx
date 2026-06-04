import { useState, useMemo, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import { getExecutiveOutcomes, buildOrgGraph, type OrgGraphNode, type OrgGraphEdge } from "../data/executiveIntelligence";
import { generateExecutiveBriefing } from "../data/executiveIntelligence";
import { TrendingUp, TrendingDown, Minus, Star, Network, Users, Building2, Briefcase, ShoppingBag, Download } from "lucide-react";

type ExecTab = "overview" | "graph";

// ─── Trend icon ───────────────────────────────────────────

function TrendIcon({ trend }: { trend: "up" | "stable" | "down" }) {
  if (trend === "up") return <TrendingUp size={14} strokeWidth={2} className="text-emerald-500" />;
  if (trend === "down") return <TrendingDown size={14} strokeWidth={2} className="text-rose-500" />;
  return <Minus size={14} strokeWidth={2} className="text-muted-foreground/40" />;
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700`} style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Org Graph component ──────────────────────────────────

const NODE_TYPE_META: Record<string, { label: string; labelAr: string }> = {
  org:    { label: "Organization", labelAr: "منظمة" },
  person: { label: "Person",       labelAr: "شخص" },
  deal:   { label: "Deal",         labelAr: "صفقة" },
  work:   { label: "Work",         labelAr: "عمل" },
};

function OrgGraphView({ ar }: { ar: boolean }) {
  const { nodes, edges } = useMemo(buildOrgGraph, []);
  const [selected, setSelected] = useState<OrgGraphNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 1000, H = 680;

  // Build adjacency for highlight
  const adjacentIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const adj = new Set<string>([hoveredId]);
    edges.forEach((e) => {
      if (e.source === hoveredId) adj.add(e.target);
      if (e.target === hoveredId) adj.add(e.source);
    });
    return adj;
  }, [hoveredId, edges]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap">
        {[
          { type: "org",    color: "#0ea5e9", labelEn: "Organization", labelAr: "منظمة" },
          { type: "person", color: "#a855f7", labelEn: "Person",       labelAr: "شخص" },
          { type: "deal",   color: "#f59e0b", labelEn: "Deal",         labelAr: "صفقة" },
          { type: "work",   color: "#22c55e", labelEn: "Work",         labelAr: "عمل" },
        ].map((l) => (
          <div key={l.type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[11px] text-muted-foreground">{ar ? l.labelAr : l.labelEn}</span>
          </div>
        ))}
        <span className="text-[10px] text-muted-foreground/40 ml-2">{ar ? "انقر على عقدة للتفاصيل" : "Click a node for details"}</span>
      </div>

      {/* SVG canvas */}
      <div className="border border-border/40 rounded-2xl overflow-hidden bg-background relative" style={{ height: 540 }}>
        <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="select-none">
          {/* Edges */}
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;
            const isHighlighted = hoveredId ? (adjacentIds.has(edge.source) && adjacentIds.has(edge.target)) : true;
            return (
              <g key={edge.id}>
                <line
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={edge.strokeColor}
                  strokeWidth={isHighlighted ? 1.5 : 0.5}
                  strokeOpacity={isHighlighted ? 0.5 : 0.12}
                  strokeDasharray={edge.label === "references" ? "4 3" : undefined}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selected?.id === node.id;
            const isHovered = hoveredId === node.id;
            const isDimmed = hoveredId && !adjacentIds.has(node.id);
            const opacity = isDimmed ? 0.25 : 1;
            const r = node.size + (isSelected || isHovered ? 4 : 0);

            return (
              <g key={node.id} style={{ cursor: "pointer", opacity }}
                onMouseEnter={() => setHoveredId(node.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelected(selected?.id === node.id ? null : node)}>
                {/* Selection ring */}
                {(isSelected || isHovered) && (
                  <circle cx={node.x} cy={node.y} r={r + 5} fill="none"
                    stroke={node.color} strokeWidth={1.5} strokeOpacity={0.4} />
                )}
                {/* Node circle */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={node.bgColor} stroke={node.color} strokeWidth={isSelected ? 2.5 : 1.5} />
                {/* Label */}
                <text x={node.x} y={node.y + r + 13}
                  textAnchor="middle" fontSize={9} fill="hsl(var(--foreground))" fillOpacity={0.6}
                  style={{ fontFamily: "var(--app-font-sans)", pointerEvents: "none" }}>
                  {ar ? node.labelAr : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Detail panel */}
        {selected && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 bg-background border border-border/60 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selected.color }} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{ar ? NODE_TYPE_META[selected.type]?.labelAr : NODE_TYPE_META[selected.type]?.label}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[10px] text-muted-foreground/50 hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors">
                ✕
              </button>
            </div>
            <p className="text-[14px] font-medium text-foreground mb-1" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.01em" }}>
              {ar ? selected.labelAr : selected.label}
            </p>
            <p className="text-[11px] text-muted-foreground/60 capitalize">{ar ? selected.metaAr : selected.meta}</p>
            <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground/50">
              {edges.filter((e) => e.source === selected.id || e.target === selected.id).length} {ar ? "اتصال" : "connection(s)"}
            </div>
          </div>
        )}
      </div>

      {/* Node count summary */}
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60">
        {[
          { type: "org", labelEn: "orgs", labelAr: "منظمة" },
          { type: "person", labelEn: "people", labelAr: "شخص" },
          { type: "deal", labelEn: "deals", labelAr: "صفقة" },
          { type: "work", labelEn: "work items", labelAr: "عمل" },
        ].map((t) => {
          const count = nodes.filter((n) => n.type === t.type).length;
          return count > 0 ? (
            <span key={t.type}>{count} {ar ? t.labelAr : t.labelEn}</span>
          ) : null;
        })}
        <span>· {edges.length} {ar ? "علاقة" : "relationships"}</span>
      </div>
    </div>
  );
}

// ─── Executive overview ───────────────────────────────────

function OverviewPanel({ ar }: { ar: boolean }) {
  const outcomes = useMemo(getExecutiveOutcomes, []);
  const briefing = useMemo(generateExecutiveBriefing, []);

  const overallScore = Math.round(outcomes.reduce((s, o) => s + o.score, 0) / outcomes.length);

  return (
    <div className="space-y-7">
      {/* Summary banner */}
      <div className="border border-primary/20 rounded-xl bg-primary/5 px-6 py-5">
        <div className="flex items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Star size={13} strokeWidth={1.75} className="text-primary" />
              <p className="text-[10px] text-muted-foreground/60 tracking-wide uppercase">{ar ? "الوضع التنفيذي" : "Executive Position"}</p>
              <span className="text-[10px] text-muted-foreground/40">{briefing.dateEn}</span>
            </div>
            <p className="text-[13px] text-foreground/80 leading-relaxed mb-3">
              {ar ? briefing.summaryAr : briefing.summaryEn}
            </p>
            {briefing.topPriorities.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground/60 mb-2">{ar ? "الأولويات القصوى:" : "Top priorities:"}</p>
                <div className="space-y-1">
                  {briefing.topPriorities.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/70">
                      <span className="text-muted-foreground/40 shrink-0">{i + 1}.</span>
                      <span>{ar ? p.ar : p.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 text-center">
            <p className="text-[44px] font-medium text-foreground tabular-nums leading-none" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.04em" }}>
              {overallScore}
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">{ar ? "مؤشر التنفيذي" : "Exec Index"}</p>
            <p className={`text-[11px] font-semibold mt-1 ${briefing.overallScore >= 70 ? "text-emerald-600" : briefing.overallScore >= 50 ? "text-amber-600" : "text-rose-600"}`}>
              {ar ? briefing.overallLabelAr : briefing.overallLabelEn}
            </p>
          </div>
        </div>
      </div>

      {/* Outcome cards */}
      <div>
        <h3 className="text-[13px] font-medium text-foreground mb-4">{ar ? "نتائج الأعمال" : "Business Outcomes"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outcomes.map((o) => (
            <div key={o.id} className="border border-border/40 rounded-xl px-5 py-4 bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground/60 mb-1">{ar ? o.dimensionAr : o.dimensionEn}</p>
                  <p className="text-[22px] font-medium text-foreground leading-none tabular-nums" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.02em", color: o.color }}>
                    {ar ? o.valueAr : o.valueEn}
                  </p>
                </div>
                <TrendIcon trend={o.trend} />
              </div>
              <div className="mb-2">
                <ScoreBar score={o.score} color={o.color} />
              </div>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{ar ? o.contextAr : o.contextEn}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key risks & opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-[12px] font-medium text-foreground mb-3">{ar ? "المخاطر الرئيسية" : "Key Risks"}</p>
          <div className="space-y-2">
            {briefing.keyRisks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/70 border border-rose-200/40 bg-rose-50/20 rounded-lg px-3 py-2.5">
                <span className="text-rose-400 shrink-0 mt-0.5">▸</span>
                <span>{ar ? r.ar : r.en}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[12px] font-medium text-foreground mb-3">{ar ? "الفرص" : "Opportunities"}</p>
          <div className="space-y-2">
            {briefing.opportunities.map((o, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-foreground/70 border border-emerald-200/40 bg-emerald-50/20 rounded-lg px-3 py-2.5">
                <span className="text-emerald-500 shrink-0 mt-0.5">▸</span>
                <span>{ar ? o.ar : o.en}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function ExecutiveMode() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<ExecTab>("overview");
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><div className="w-4 h-4 rounded bg-border" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "الوضع التنفيذي" : "Executive Mode"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "هتظهر البيانات التنفيذية هنا لما بيانات شغلك تكبر." : "Executive insights will appear here as your workspace data grows."}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="border-b border-border/40 px-8 md:px-10 py-8"
        style={{ background: "linear-gradient(160deg, hsl(var(--muted)/0.3) 0%, hsl(var(--background)) 60%)" }}>
        <div className="max-w-[1100px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Star size={14} strokeWidth={1.75} className="text-amber-500" />
            <p className="text-[11px] text-muted-foreground/60 tracking-[0.08em] uppercase">{ar ? "الوضع التنفيذي" : "Executive Mode"}</p>
            <span className="text-[10px] text-muted-foreground/40 px-2 py-0.5 rounded-full bg-muted border border-border/40">{ar ? "نتائج وليس سجلات" : "Outcomes, not records"}</span>
          </div>
          <h1 className="text-[26px] font-medium text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)", letterSpacing: "-0.025em" }}>
            {ar ? "المنظور التنفيذي" : "Executive Perspective"}
          </h1>
          <p className="text-[12px] text-muted-foreground/60 mt-1">
            {ar ? "ارتفع فوق السجلات — ركّز على النتائج الاستراتيجية" : "Rise above the records — focus on strategic outcomes"}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="px-8 md:px-10 max-w-[1100px] flex gap-0 -mb-px">
          {[
            { id: "overview" as const, labelEn: "Executive Overview", labelAr: "النظرة التنفيذية", icon: Star },
            { id: "graph" as const, labelEn: "Organization Graph", labelAr: "مخطط المنظمات", icon: Network },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-[12px] border-b-2 transition-all shrink-0 ${tab === t.id ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon size={13} strokeWidth={tab === t.id ? 2 : 1.75} />
                {ar ? t.labelAr : t.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-8 md:px-10 py-7 max-w-[1100px]">
        {tab === "overview" && <OverviewPanel ar={ar} />}
        {tab === "graph" && <OrgGraphView ar={ar} />}
      </div>
    </div>
  );
}
