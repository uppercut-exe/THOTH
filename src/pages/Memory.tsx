import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Filter, ArrowUpRight, X, Briefcase, TrendingUp, Users, Building2, DollarSign, Package, RefreshCw, GitBranch } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { isDemoMode } from "../lib/supabase";
import { useMemory } from "../context/MemoryContext";
import {
  buildGraph, getEntityMeta, TYPE_DOT_COLORS, TYPE_LABELS,
  type GraphNode, type GraphEdge,
} from "../memory/memoryGraph";
import type { EntityType } from "../memory/relationshipStore";

// ─── Type icons ───────────────────────────────────────────

const TYPE_ICONS: Record<EntityType, React.ElementType> = {
  work:         Briefcase,
  deal:         TrendingUp,
  person:       Users,
  organization: Building2,
  invoice:      DollarSign,
  resource:     Package,
};

const ALL_TYPES: EntityType[] = ["person", "organization", "work", "deal", "invoice", "resource"];

// ─── Force simulation ─────────────────────────────────────

const SPRING_K  = 0.04;
const REPULSE_K = 3200;
const CENTER_K  = 0.008;
const DAMPING   = 0.78;
const MIN_DIST  = 60;

function tickSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): GraphNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const forces = new Map<string, { fx: number; fy: number }>();
  for (const n of nodes) forces.set(n.id, { fx: 0, fy: 0 });

  // Spring forces along edges
  for (const e of edges) {
    const a = nodeMap.get(e.source);
    const b = nodeMap.get(e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const idealLen = 140;
    const force = (dist - idealLen) * SPRING_K;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    forces.get(e.source)!.fx += fx;
    forces.get(e.source)!.fy += fy;
    forces.get(e.target)!.fx -= fx;
    forces.get(e.target)!.fy -= fy;
  }

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
      const force = REPULSE_K / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      forces.get(a.id)!.fx -= fx;
      forces.get(a.id)!.fy -= fy;
      forces.get(b.id)!.fx += fx;
      forces.get(b.id)!.fy += fy;
    }
  }

  // Center force
  for (const n of nodes) {
    const f = forces.get(n.id)!;
    f.fx += (cx - n.x) * CENTER_K;
    f.fy += (cy - n.y) * CENTER_K;
  }

  // Update velocities + positions
  return nodes.map((n) => {
    if (n.pinned) return n;
    const f = forces.get(n.id)!;
    const vx = (n.vx + f.fx) * DAMPING;
    const vy = (n.vy + f.fy) * DAMPING;
    const x = Math.max(40, Math.min(width - 40, n.x + vx));
    const y = Math.max(40, Math.min(height - 40, n.y + vy));
    return { ...n, vx, vy, x, y };
  });
}

// ─── Knowledge Graph ──────────────────────────────────────

function KnowledgeGraph({
  nodes, edges, selected, onSelectNode, width, height,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selected: string | null;
  onSelectNode: (id: string | null) => void;
  width: number;
  height: number;
}) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const [dragging, setDragging] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function onNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    e.stopPropagation();
    const n = nodeMap.get(nodeId);
    if (!n) return;
    const pos = getPos(e);
    setDragging(nodeId);
    setOffset({ x: pos.x - n.x, y: pos.y - n.y });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const pos = getPos(e);
    const n = nodeMap.get(dragging);
    if (!n) return;
    n.x = pos.x - offset.x;
    n.y = pos.y - offset.y;
    n.pinned = true;
  }

  function onMouseUp() { setDragging(null); }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full h-full cursor-default"
      onClick={() => onSelectNode(null)}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <defs>
        {ALL_TYPES.map((t) => (
          <filter key={t} id={`glow-${t}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        ))}
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" fillOpacity="0.4" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e) => {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) return null;
        const isSelected = selected && (selected === e.source || selected === e.target);
        return (
          <line
            key={e.id}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isSelected ? "#8b5cf6" : "#cbd5e1"}
            strokeWidth={isSelected ? 1.5 : 1}
            strokeOpacity={isSelected ? 0.7 : 0.35}
            markerEnd="url(#arrow)"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const color = TYPE_DOT_COLORS[n.type];
        const isSelected = selected === n.id;
        const r = isSelected ? 14 : 10;
        const label = n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label;
        return (
          <g
            key={n.id}
            transform={`translate(${n.x},${n.y})`}
            onClick={(e) => { e.stopPropagation(); onSelectNode(n.id); }}
            onMouseDown={(e) => onNodeMouseDown(e, n.id)}
            className="cursor-pointer"
          >
            {isSelected && (
              <circle r={r + 6} fill={color} fillOpacity={0.15} />
            )}
            <circle
              r={r}
              fill={color}
              fillOpacity={isSelected ? 1 : 0.85}
              stroke={isSelected ? "white" : color}
              strokeWidth={isSelected ? 2.5 : 0}
            />
            <text
              y={r + 13}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
              className="select-none pointer-events-none"
              style={{ fontFamily: "var(--app-font-sans)" }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Detail panel ─────────────────────────────────────────

function DetailPanel({
  nodeId, onClose, lang,
}: { nodeId: string; onClose: () => void; lang: "en" | "ar" }) {
  const [, navigate] = useLocation();
  const { getRelatedFor } = useMemory();
  const ar = lang === "ar";

  const [type, entityId] = nodeId.split(":") as [EntityType, string];
  const meta = getEntityMeta(type, entityId);
  if (!meta) return null;

  const related = getRelatedFor(type, entityId);
  const Icon = TYPE_ICONS[type];
  const typeLabel = TYPE_LABELS[type];

  return (
    <motion.div
      key={nodeId}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-[280px] shrink-0 border-s border-border/40 flex flex-col bg-background overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border/30 shrink-0">
        <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
          style={{ backgroundColor: TYPE_DOT_COLORS[type] + "22" }}>
          <Icon size={15} strokeWidth={1.75} style={{ color: TYPE_DOT_COLORS[type] }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
            {ar ? meta.titleAr : meta.titleEn}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {ar ? typeLabel.ar : typeLabel.en}
          </p>
        </div>
        <button onClick={onClose} className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Subtitle */}
      {meta.subtitleEn && (
        <div className="px-4 py-3 border-b border-border/20">
          <p className="text-[12px] text-muted-foreground">{ar ? meta.subtitleAr : meta.subtitleEn}</p>
        </div>
      )}

      {/* Connections */}
      <div className="flex-1 overflow-y-auto">
        {related.length > 0 ? (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {ar ? `${related.length} اتصال` : `${related.length} Connection${related.length !== 1 ? "s" : ""}`}
              </span>
            </div>
            {related.map((r) => {
              const RIcon = TYPE_ICONS[r.meta.type];
              return (
                <button
                  key={r.meta.id}
                  onClick={() => navigate(r.meta.route)}
                  className="group w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors text-start"
                >
                  <div className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: TYPE_DOT_COLORS[r.meta.type] + "22" }}>
                    <RIcon size={12} strokeWidth={1.75} style={{ color: TYPE_DOT_COLORS[r.meta.type] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground truncate">{ar ? r.meta.titleAr : r.meta.titleEn}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{r.relationship.kind.replace("_", " ")}</p>
                  </div>
                  <ArrowUpRight size={11} className="shrink-0 text-muted-foreground/20 group-hover:text-primary/50 transition-colors" />
                </button>
              );
            })}
          </>
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-[12px] text-muted-foreground/50">{ar ? "لا توجد اتصالات" : "No connections"}</p>
          </div>
        )}
      </div>

      {/* Open button */}
      <div className="px-4 py-3 border-t border-border/30 shrink-0">
        <button
          onClick={() => navigate(meta.route)}
          className="w-full flex items-center justify-center gap-2 h-8 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowUpRight size={13} strokeWidth={2} />
          {ar ? "فتح السجل" : "Open Record"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────

export default function Memory() {
  const { lang } = useLanguage();
  const { relationships } = useMemory();
  const ar = lang === "ar";

  if (!isDemoMode) return (
    <div className="min-h-full flex items-center justify-center py-24">
      <div className="text-center max-w-[400px]">
        <div className="w-12 h-12 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><Brain size={20} className="text-muted-foreground/40" /></div>
        <h2 className="text-[16px] font-medium mb-2" style={{ fontFamily: "var(--app-font-serif)" }}>{ar ? "ذاكرة المنظمة" : "Organization Memory"}</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? "ضيف أشخاص وشركات وصفقات ومهام عشان تبني شبكة العلاقات." : "Add people, organizations, deals, and work items to build the relationship network."}</p>
      </div>
    </div>
  );

  const [activeFilters, setActiveFilters] = useState<Set<EntityType>>(new Set(ALL_TYPES));
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [tick, setTick] = useState(0);

  // Build graph data
  const graphData = useMemo(() => {
    return buildGraph(relationships, activeFilters.size === ALL_TYPES.length ? undefined : activeFilters);
  }, [relationships, activeFilters]);

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  // Re-initialize when graph data changes
  useEffect(() => {
    nodesRef.current = graphData.nodes.map((n) => ({
      ...n,
      x: dims.w / 2 + (Math.random() - 0.5) * dims.w * 0.7,
      y: dims.h / 2 + (Math.random() - 0.5) * dims.h * 0.7,
      vx: 0, vy: 0,
    }));
    edgesRef.current = graphData.edges;
    setRunning(true);
    setSelected(null);
    setTick(0);
  }, [graphData]);

  // Measure container
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.max(width, 300), h: Math.max(height, 300) });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Simulation loop
  useEffect(() => {
    if (!running) return;
    let frame: number;
    let steps = 0;
    const MAX_STEPS = 200;

    function loop() {
      steps++;
      nodesRef.current = tickSimulation(nodesRef.current, edgesRef.current, dims.w, dims.h);
      setTick((t) => t + 1);
      if (steps < MAX_STEPS) {
        frame = requestAnimationFrame(loop);
      } else {
        setRunning(false);
      }
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running, dims]);

  function toggleFilter(type: EntityType) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const totalNodes = nodesRef.current.length;
  const totalEdges = edgesRef.current.length;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-8 py-5 border-b border-border/40 shrink-0 flex items-center gap-4 flex-wrap bg-background">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
            <Brain size={16} strokeWidth={1.75} className="text-primary" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-foreground leading-tight" style={{ fontFamily: "var(--app-font-serif)" }}>
              {ar ? "رسم المعرفة" : "Knowledge Graph"}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {ar
                ? `${totalNodes} عقدة · ${totalEdges} اتصال`
                : `${totalNodes} nodes · ${totalEdges} connections`}
            </p>
          </div>
        </div>

        {/* Type filters */}
        <div className="flex items-center gap-1.5 flex-wrap ms-auto">
          {ALL_TYPES.map((type) => {
            const active = activeFilters.has(type);
            const label = TYPE_LABELS[type];
            const Icon = TYPE_ICONS[type];
            const dot = TYPE_DOT_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all
                  ${active
                    ? "border-transparent text-foreground"
                    : "border-border/40 text-muted-foreground/50 bg-transparent"
                  }
                `}
                style={active ? { backgroundColor: dot + "18", borderColor: dot + "40", color: dot } : {}}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? dot : "#94a3b8" }} />
                {ar ? label.ar : label.en}
              </button>
            );
          })}
          <button
            onClick={() => { setRunning(true); setTick(0); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/40 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ms-1"
          >
            <RefreshCw size={11} strokeWidth={1.75} />
            {ar ? "إعادة" : "Reset"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">

        {/* Graph area */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-muted/20">
          {totalNodes === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <GitBranch size={22} strokeWidth={1.5} className="text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-[15px] font-medium text-foreground mb-1" style={{ fontFamily: "var(--app-font-serif)" }}>
                  {ar ? "لا توجد بيانات للعرض" : "No data to display"}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {ar ? "حاول تغيير الفلاتر أو إضافة سجلات" : "Try changing filters or adding records"}
                </p>
              </div>
            </div>
          ) : (
            <KnowledgeGraph
              key={tick > 0 ? "graph" : "init"}
              nodes={nodesRef.current}
              edges={edgesRef.current}
              selected={selected}
              onSelectNode={setSelected}
              width={dims.w}
              height={dims.h}
            />
          )}

          {/* Legend */}
          {totalNodes > 0 && (
            <div className="absolute bottom-4 start-4 flex flex-col gap-1.5 bg-background/90 backdrop-blur-sm border border-border/40 rounded-xl px-3 py-2.5">
              {ALL_TYPES.filter((t) => activeFilters.has(t)).map((t) => {
                const cnt = nodesRef.current.filter((n) => n.type === t).length;
                if (!cnt) return null;
                return (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_DOT_COLORS[t] }} />
                    <span className="text-[11px] text-muted-foreground">{ar ? TYPE_LABELS[t].ar : TYPE_LABELS[t].en}</span>
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums ms-auto">{cnt}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Running indicator */}
          {running && (
            <div className="absolute top-4 end-4 flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
              {ar ? "جارٍ الحساب..." : "Simulating…"}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <DetailPanel
              nodeId={selected}
              onClose={() => setSelected(null)}
              lang={lang}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
