"use client";

import { useEffect, useState } from "react";
import { ArchitectureBand } from "@/components/architecture-band";
import { EmptyAction, EmptyState } from "@/components/empty-state";
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
  const [ready, setReady] = useState(false);
  const [archId, setArchId] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"arch" | "watch" | null>(null);
  const arch = archId ? getArchitectureNode(archId) : undefined;
  const watch = watchId ? getWatchStep(watchId) : undefined;

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(timer);
  }, []);

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
          Env URL parked
        </Badge>
        <Badge variant="outline" className="border-amber-500 text-amber-900">
          WhoAmI parked
        </Badge>
        <Badge variant="secondary">LLM impact</Badge>
        <Badge variant="outline">No Azure secrets</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {CONTOSO_SANDBOX.environment}. {CONTOSO_SANDBOX.demoCorpus}. Query, Graph,
        and Records stay on this corpus. Env URL is labeled; WhoAmI stays parked.
      </p>

      <div className="grid gap-2 md:grid-cols-3">
        {LIVE_ORG_SWAP.map((item) => (
          <div
            key={item.id}
            className={
              item.parked
                ? "rounded-lg border border-dashed bg-zinc-50 px-3 py-2"
                : "rounded-lg border bg-card px-3 py-2"
            }
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {item.caption}
            </p>
            <p className="text-sm font-semibold">{item.label}</p>
            {item.id === "env-url" ? (
              <a
                href={item.value}
                className="mt-1 block font-mono text-[11px] text-sky-800 break-all underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {item.value}
              </a>
            ) : (
              <p className="font-mono text-[11px] text-muted-foreground">
                {item.value}
              </p>
            )}
            {item.meta ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                {item.meta}
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </div>

      {!ready ? (
        <EmptyState
          title="Loading Contoso architecture"
          actions={
            <EmptyAction onClick={() => setReady(true)}>Show bands</EmptyAction>
          }
        >
          Pre-loading the Sources → Citations band and Release Watch strip. Live
          Dataverse is not contacted. WhoAmI stays parked.
        </EmptyState>
      ) : (
        <>
          <ArchitectureBand selectedId={archId} onSelect={selectArch} />
          <ReleaseWatchStrip selectedId={watchId} onSelect={selectWatch} />
        </>
      )}

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <ArchDetail
          node={arch}
          onPick={() => selectArch("contoso-source")}
        />
        <ReleaseWatchDetail
          step={watch}
          onPick={() => selectWatch("llm-compare")}
        />
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
              <ReleaseWatchDetail
                step={watch}
                onPick={() => selectWatch("llm-compare")}
              />
            ) : (
              <ArchDetail
                node={arch}
                onPick={() => selectArch("contoso-source")}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ArchDetail({
  node,
  onPick,
}: {
  node: ReturnType<typeof getArchitectureNode>;
  onPick: () => void;
}) {
  if (!node) {
    return (
      <EmptyState
        title="No band selected"
        actions={<EmptyAction onClick={onPick}>Pick Contoso sandbox</EmptyAction>}
      >
        Choose a node on the Sources → Retrieve → Agent loop → Citations band.
        Env URL, Entra secrets, and WhoAmI stay parked labels.
      </EmptyState>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {node.kind}
        {node.dashed ? " · parked" : ""}
        {node.badge ? ` · ${node.badge}` : ""}
      </p>
      <h3 className="font-heading text-lg font-semibold">{node.title}</h3>
      <p className="mt-2 text-sm leading-relaxed">{node.detail}</p>
    </div>
  );
}
