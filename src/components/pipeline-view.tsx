"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PipelineCanvas } from "@/components/pipeline-canvas";
import { StageDetail } from "@/components/stage-detail";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getPipelineStage, type PipelinePath } from "@/lib/pipeline";

export function PipelineView() {
  const [path, setPath] = useState<PipelinePath>("indexing");
  const [model, setModel] = useState<"azure" | "ollama">("ollama");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const stage = selectedId ? getPipelineStage(selectedId) ?? null : null;

  function selectStage(id: string) {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSheetOpen(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border bg-white p-1">
          <ToggleChip
            active={path === "indexing"}
            onClick={() => setPath("indexing")}
          >
            Indexing
          </ToggleChip>
          <ToggleChip active={path === "query"} onClick={() => setPath("query")}>
            Query
          </ToggleChip>
        </div>
        <div className="flex rounded-lg border bg-white p-1">
          <ToggleChip
            active={model === "azure"}
            onClick={() => setModel("azure")}
          >
            Azure OpenAI
          </ToggleChip>
          <ToggleChip
            active={model === "ollama"}
            onClick={() => setModel("ollama")}
          >
            Ollama
          </ToggleChip>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {path === "query"
          ? "Query path: Router → Orchestrator agent → Retrieve → Rerank → Generate. MCP sits on the left; dashed Power BI and D365 dashboard are future consumers."
          : "Indexing path: Dataverse / M365 / inventory → extract, summarize, embed, search. MCP in the center; dashed Power BI and D365 dashboard are future consumers."}{" "}
        Contoso RAG + Release Watch live on{" "}
        <Link href="/architecture" className="underline-offset-2 hover:underline">
          Architecture
        </Link>
        .
      </p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
        <PipelineCanvas
          path={path}
          selectedId={selectedId}
          model={model}
          onSelect={selectStage}
        />
        <div className="hidden lg:block">
          <StageDetail
            stage={stage}
            model={model}
            onPick={() => selectStage("mcp")}
          />
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{stage?.title ?? "Stage"}</SheetTitle>
            <SheetDescription>{stage?.summary}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <StageDetail
              stage={stage}
              model={model}
              onPick={() => selectStage("mcp")}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      className="px-3"
    >
      {children}
    </Button>
  );
}
