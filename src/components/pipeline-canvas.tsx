"use client";

import { Badge } from "@/components/ui/badge";
import {
  INDEXING_EDGES,
  INDEXING_LAYOUT,
  QUERY_EDGES,
  QUERY_LAYOUT,
  getPipelineStage,
  type PipelinePath,
  type StageKind,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";

const KIND_STYLES: Record<StageKind, string> = {
  source: "border-sky-400/80 bg-sky-50 text-sky-950",
  process: "border-slate-300 bg-white text-slate-900",
  model: "border-violet-400/80 bg-violet-50 text-violet-950",
  connector: "border-amber-400/80 bg-amber-50 text-amber-950",
  agent: "border-emerald-400/80 bg-emerald-50 text-emerald-950",
  security: "border-rose-300 bg-rose-50 text-rose-950",
  future: "border-zinc-400 border-dashed bg-zinc-50/80 text-zinc-600",
};

const KIND_DOT: Record<StageKind, string> = {
  source: "bg-sky-500",
  process: "bg-slate-500",
  model: "bg-violet-500",
  connector: "bg-amber-500",
  agent: "bg-emerald-500",
  security: "bg-rose-500",
  future: "bg-zinc-400",
};

export function PipelineCanvas({
  path,
  selectedId,
  model,
  onSelect,
}: {
  path: PipelinePath;
  selectedId: string | null;
  model: "azure" | "ollama";
  onSelect: (id: string) => void;
}) {
  const layout = path === "indexing" ? INDEXING_LAYOUT : QUERY_LAYOUT;
  const edges = path === "indexing" ? INDEXING_EDGES : QUERY_EDGES;
  const byId = new Map(layout.map((node) => [node.id, node]));

  return (
    <div className="relative overflow-hidden rounded-xl border bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:24px_24px] p-3 md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">
          {path === "indexing" ? "Indexing path" : "Query path"}
        </span>
        <span className="hidden sm:inline">·</span>
        <span>MCP on both paths · dashed nodes are future Microsoft consumers</span>
      </div>

      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        aria-hidden
      >
        {edges.map(([from, to]) => {
          const a = byId.get(from);
          const b = byId.get(to);
          if (!a || !b) return null;
          const x1 = (a.col - 0.5) * 20;
          const y1 = (a.row - 0.5) * 33.3;
          const x2 = (b.col - 0.5) * 20;
          const y2 = (b.row - 0.5) * 33.3;
          const dashed =
            getPipelineStage(from)?.dashed || getPipelineStage(to)?.dashed;
          return (
            <line
              key={`${from}-${to}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke={dashed ? "#a1a1aa" : "#64748b"}
              strokeWidth="1.25"
              strokeDasharray={dashed ? "5 4" : undefined}
              opacity={0.55}
            />
          );
        })}
      </svg>

      <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 md:hidden">
        {layout.map((node) => (
          <StageNode
            key={`mobile-${node.id}`}
            id={node.id}
            selectedId={selectedId}
            model={model}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="relative hidden min-h-[340px] grid-cols-5 grid-rows-3 gap-3 md:grid">
        {layout.map((node) => (
          <StageNode
            key={`desk-${node.id}`}
            id={node.id}
            selectedId={selectedId}
            model={model}
            onSelect={onSelect}
            col={node.col}
            row={node.row}
          />
        ))}
      </div>
    </div>
  );
}

function StageNode({
  id,
  selectedId,
  model,
  onSelect,
  col,
  row,
}: {
  id: string;
  selectedId: string | null;
  model: "azure" | "ollama";
  onSelect: (id: string) => void;
  col?: number;
  row?: number;
}) {
  const stage = getPipelineStage(id);
  if (!stage) return null;
  const selected = selectedId === stage.id;
  const title =
    stage.id === "embeddings" || stage.id === "generate"
      ? `${stage.title} · ${model === "ollama" ? "Ollama" : "Azure OpenAI"}`
      : stage.title;
  return (
    <button
      type="button"
      onClick={() => onSelect(stage.id)}
      style={
        col && row
          ? { gridColumn: col, gridRow: row }
          : undefined
      }
      className={cn(
        "relative z-10 flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        KIND_STYLES[stage.kind],
        selected && "ring-2 ring-foreground/70",
        stage.dashed && "opacity-90",
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight">
          <span className={cn("size-1.5 rounded-full", KIND_DOT[stage.kind])} />
          {title}
        </span>
        {stage.dashed ? (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
            Future
          </Badge>
        ) : null}
      </span>
      <span className="line-clamp-2 text-[11px] leading-snug text-current/80">
        {stage.summary}
      </span>
    </button>
  );
}
