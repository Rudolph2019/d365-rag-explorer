"use client";

import { useState } from "react";
import { ArchitectureBand } from "@/components/architecture-band";
import { ReleaseWatchDetail, ReleaseWatchStrip } from "@/components/release-watch-strip";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getArchitectureNode } from "@/lib/architecture";
import { CONTOSO_SANDBOX, LIVE_ORG_SWAP } from "@/lib/contoso";
import { getWatchStep } from "@/lib/release-watch";

export function ArchitectureView() {
  const [archId, setArchId] = useState("contoso-source");
  const [watchId, setWatchId] = useState("llm-compare");
  const [sheet, setSheet] = useState<"arch" | "watch" | null>(null);
  const arch = getArchitectureNode(archId);
  const watch = getWatchStep(watchId);

  function selectArch(id: string) {
    setArchId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSheet("arch");
    }
  }

  function selectWatch(id: string) {
    setWatchId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSheet("watch");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-700 text-white">
          Contoso sandbox · {CONTOSO_SANDBOX.status}
        </Badge>
        <Badge variant="outline" className="border-amber-500 text-amber-900">
          {CONTOSO_SANDBOX.untilUnparked}
        </Badge>
        <Badge variant="secondary">LLM impact</Badge>
        <Badge variant="outline">No Azure secrets</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {CONTOSO_SANDBOX.environment}. {CONTOSO_SANDBOX.demoCorpus}. Query, Graph,
        and Records stay on this corpus until a live org is unparked.
      </p>

      <div className="grid gap-2 md:grid-cols-3">
        {LIVE_ORG_SWAP.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-dashed bg-zinc-50 px-3 py-2"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Future live-org swap
            </p>
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {item.placeholder}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </div>

      <ArchitectureBand selectedId={archId} onSelect={selectArch} />
      <ReleaseWatchStrip selectedId={watchId} onSelect={selectWatch} />

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <ArchDetail node={arch} />
        <ReleaseWatchDetail step={watch} />
      </div>

      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {sheet === "watch" ? watch?.title : arch?.title}
            </SheetTitle>
            <SheetDescription>
              {sheet === "watch" ? watch?.summary : arch?.summary}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {sheet === "watch" ? (
              <ReleaseWatchDetail step={watch} />
            ) : (
              <ArchDetail node={arch} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ArchDetail({
  node,
}: {
  node: ReturnType<typeof getArchitectureNode>;
}) {
  if (!node) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        Select a node. Contoso sandbox is in use. Dashed env URL, Entra app /
        client credentials, and WhoAmI are future swap labels only.
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {node.kind}
        {node.dashed ? " · future swap" : ""}
        {node.badge ? ` · ${node.badge}` : ""}
      </p>
      <h3 className="font-heading text-lg font-semibold">{node.title}</h3>
      <p className="mt-2 text-sm leading-relaxed">{node.detail}</p>
    </div>
  );
}
