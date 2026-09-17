"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EVAL_HANDOFF_HREF } from "@/lib/eval-handoff";
import {
  FLAG_PACK,
  FLAG_PACK_PRIORITY_FIRST,
  IMPACT_COMPARE,
  PRIORITY_SEED_IDS,
  RELEASE_WATCH_STEPS,
  UNUSED_FLAG_IDS,
  type WatchStep,
} from "@/lib/release-watch";
import { cn } from "@/lib/utils";

export function ReleaseWatchStrip({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Release Watch
          </p>
          <h3 className="font-heading text-sm font-semibold">
            Signals → flags → Contoso inventory → LLM impact → digest → eval
          </h3>
        </div>
        <Badge variant="outline" className="border-amber-500 text-amber-900">
          Contoso-only until unparked
        </Badge>
      </div>

      <ol className="grid gap-2 md:grid-cols-7">
        {RELEASE_WATCH_STEPS.map((step, index) => (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className={cn(
                "flex h-full w-full flex-col items-start gap-1 rounded-lg border bg-muted/40 px-2.5 py-2 text-left transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                selectedId === step.id && "ring-2 ring-foreground/70",
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-[12px] font-semibold leading-tight">
                {step.title}
              </span>
              <span className="line-clamp-2 text-[11px] text-muted-foreground">
                {step.summary}
              </span>
              {step.badge ? (
                <Badge variant="secondary" className="mt-auto h-4 px-1.5 text-[10px]">
                  {step.badge}
                </Badge>
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-1.5">
        {FLAG_PACK_PRIORITY_FIRST.map((chip) => (
          <Badge
            key={chip.id}
            variant="outline"
            title={`${chip.title} · ${chip.product} · ${chip.sourceUrl}`}
            className="h-6 cursor-default px-2 font-mono text-[11px]"
          >
            {chip.id}
            {chip.prioritySeed ? (
              <span className="ml-1 font-sans text-amber-800">seed</span>
            ) : null}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ReleaseWatchDetail({
  step,
  onPick,
}: {
  step: WatchStep | undefined;
  onPick?: () => void;
}) {
  if (!step) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-6">
        <h3 className="font-heading text-sm font-semibold">No Release Watch step</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a step on the strip. Env Swap inventory stays Contoso-only until
          unparked. LLM impact compare emits in use / referenced only.
        </p>
        {onPick ? (
          <button
            type="button"
            onClick={onPick}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}
          >
            Pick LLM impact compare
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Release Watch
        {step.badge ? ` · ${step.badge}` : ""}
      </p>
      <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed">{step.detail}</p>

      {step.id === "flag-pack" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {FLAG_PACK.length} handoff ids, {PRIORITY_SEED_IDS.length} priority
          seeds. Digest skips {UNUSED_FLAG_IDS.length} unused-product flags
          (Power Pages, Data Lake, USD, …) the same way it skips ENT-17.
        </p>
      ) : null}

      {step.id === "llm-compare" || step.id === "digest" ? (
        <ul className="mt-4 space-y-3">
          {IMPACT_COMPARE.map((row) => (
            <li key={row.flagId} className="rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {row.flagId}
                </span>
                <span className="text-sm font-semibold">{row.flag}</span>
                <Badge
                  variant="outline"
                  className={
                    row.usage === "in use"
                      ? "border-emerald-600 text-emerald-800"
                      : "border-sky-600 text-sky-800"
                  }
                >
                  {row.usage}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{row.inventory}</p>
              <p className="mt-1 text-sm">{row.whatBreaks}</p>
              <a
                href={row.sourceUrl}
                className="mt-1 inline-block text-xs text-sky-800 underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {row.sourceLabel}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {step.id === "eval" || step.id === "digest" ? (
        <Link
          href={EVAL_HANDOFF_HREF}
          className={cn(buttonVariants({ size: "sm" }), "mt-4")}
        >
          Hand off to Retrieval Eval
        </Link>
      ) : null}

      {step.id === "severity" ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Unused example parked out of the digest: ENT-17 legacy entitlement
          template.
        </p>
      ) : null}
    </div>
  );
}
