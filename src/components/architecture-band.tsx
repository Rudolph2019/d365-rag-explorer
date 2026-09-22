"use client";

import { Badge } from "@/components/ui/badge";
import {
  ARCHITECTURE_EDGES,
  ARCHITECTURE_NODES,
  type ArchitectureKind,
  type ArchitectureNode,
} from "@/lib/architecture";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<ArchitectureKind, string> = {
  source: "border-sky-400/80 bg-sky-50 text-sky-950",
  retrieve: "border-slate-300 bg-white text-slate-900",
  agent: "border-emerald-400/80 bg-emerald-50 text-emerald-950",
  citation: "border-violet-400/80 bg-violet-50 text-violet-950",
  future: "border-zinc-400 border-dashed bg-zinc-50/80 text-zinc-600",
};

export function ArchitectureBand({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const byId = new Map(ARCHITECTURE_NODES.map((node) => [node.id, node]));

  return (
    <div className="relative overflow-hidden rounded-xl border bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:24px_24px] p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">
          Sources → Retrieve → Agent loop → Citations
        </span>
        <span className="hidden sm:inline">·</span>
        <span>Planner / tools / critic · dashed nodes are parked live-org labels</span>
      </div>

      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        aria-hidden
      >
        {ARCHITECTURE_EDGES.map(([from, to]) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          const dashed = a.dashed || b.dashed;
          return (
            <line
              key={`${from}-${to}`}
              x1={`${(a.col - 0.45) * 20}%`}
              y1={`${(a.row - 0.35) * 28}%`}
              x2={`${(b.col - 0.45) * 20}%`}
              y2={`${(b.row - 0.35) * 28}%`}
              stroke={dashed ? "#a1a1aa" : "#64748b"}
              strokeWidth="1.25"
              strokeDasharray={dashed ? "5 4" : undefined}
              opacity={0.5}
            />
          );
        })}
      </svg>

      <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
        {ARCHITECTURE_NODES.map((node) => (
          <ArchNode
            key={`m-${node.id}`}
            node={node}
            selected={selectedId === node.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="relative hidden min-h-[320px] grid-cols-5 grid-rows-3 gap-3 md:grid">
        {ARCHITECTURE_NODES.map((node) => (
          <ArchNode
            key={`d-${node.id}`}
            node={node}
            selected={selectedId === node.id}
            onSelect={onSelect}
            placed
          />
        ))}
      </div>
    </div>
  );
}

function ArchNode({
  node,
  selected,
  onSelect,
  placed,
}: {
  node: ArchitectureNode;
  selected: boolean;
  onSelect: (id: string) => void;
  placed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      style={
        placed
          ? { gridColumn: node.col, gridRow: node.row }
          : undefined
      }
      className={cn(
        "relative z-10 flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        KIND_STYLES[node.kind],
        selected && "ring-2 ring-foreground/70",
        node.dashed && "opacity-90",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-[13px] font-semibold leading-tight">{node.title}</span>
        {node.badge ? (
          <Badge
            variant="outline"
            className={cn(
              "h-4 px-1.5 text-[10px]",
              node.badge === "in use" && "border-emerald-600 text-emerald-800",
            )}
          >
            {node.badge}
          </Badge>
        ) : null}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-current/80">
        {node.summary}
      </span>
    </button>
  );
}
