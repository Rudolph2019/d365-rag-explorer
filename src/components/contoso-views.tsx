"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyAction, EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CONTOSO_RECORDS,
  CONTOSO_SANDBOX,
  searchContoso,
  type ContosoRecord,
} from "@/lib/contoso";
import { getEvalHandoff } from "@/lib/eval-handoff";
import { cn } from "@/lib/utils";

const PARKED_ERROR =
  "Live Dataverse retrieve is parked. Env URL, Entra app / client credentials, and WhoAmI are labels only.";

export function QueryView() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hits = useMemo(() => (q.trim() ? searchContoso(q) : []), [q]);
  const searchable = CONTOSO_RECORDS.filter((row) => row.usage !== "unused");

  return (
    <div className="space-y-4">
      <ContosoBanner />
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Query</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask against the Contoso demo corpus. Retrieve is local keyword — no
          live org, no Entra. Unused inventory is not searchable.
        </p>
        <input
          value={q}
          onChange={(event) => {
            setError(null);
            setQ(event.target.value);
          }}
          placeholder="Work order leak, loyalty outage, Contoso Coffee…"
          className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setQ("group head leak");
            }}
          >
            Run sample query
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setError(null);
              setQ("");
            }}
            disabled={!q && !error}
          >
            Clear filter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setError(PARKED_ERROR)}
          >
            Try live org
          </Button>
          <Link href="/architecture" className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}>
            Architecture
          </Link>
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Live Dataverse swap is parked"
          actions={
            <>
              <EmptyAction
                onClick={() => {
                  setError(null);
                  setQ("group head leak");
                }}
              >
                Use Contoso sample
              </EmptyAction>
              <EmptyAction onClick={() => setError(null)}>Dismiss</EmptyAction>
            </>
          }
        >
          {error}
        </EmptyState>
      ) : !q.trim() ? (
        <EmptyState
          title="No query yet"
          actions={
            <>
              <EmptyAction onClick={() => setQ("group head leak")}>
                Run sample query
              </EmptyAction>
              <Link href="/records" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Open Records
              </Link>
            </>
          }
        >
          Pre-load is the Contoso demo corpus, not a tenant. Run a sample or
          browse Records.
        </EmptyState>
      ) : hits.length === 0 ? (
        <EmptyState
          title="No Contoso matches"
          actions={
            <>
              <EmptyAction onClick={() => setQ("")}>Clear filter</EmptyAction>
              <EmptyAction onClick={() => setQ("loyalty")}>
                Try “loyalty”
              </EmptyAction>
            </>
          }
        >
          Nothing in the demo corpus for “{q}”. Unused ENT-17 is never
          searchable. Live-org retrieve stays parked.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {hits.map((row) => (
            <RecordCard key={row.id} row={row} />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {searchable.length} in use / referenced rows in the corpus. ENT-17 is
        unused and omitted from Query.
      </p>
    </div>
  );
}

export function GraphView() {
  const nodes = CONTOSO_RECORDS.filter((row) => row.usage !== "unused");
  const [selected, setSelected] = useState<string | null>(null);
  const current = nodes.find((row) => row.id === selected);

  return (
    <div className="space-y-4">
      <ContosoBanner />
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Graph</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Citations between Contoso records. Unused inventory is hidden. Live-org
          graph is parked.
        </p>
      </div>
      {nodes.length === 0 ? (
        <EmptyState
          title="No Contoso graph"
          actions={
            <Link href="/architecture" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Open Architecture
            </Link>
          }
        >
          Demo corpus has no in-use records. Architecture still shows the
          retrieve → agent loop.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="flex flex-wrap gap-2 rounded-xl border bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:24px_24px] p-4">
            {nodes.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelected(row.id)}
                className={`rounded-lg border bg-white px-3 py-2 text-left shadow-sm ${
                  selected === row.id ? "ring-2 ring-foreground/70" : ""
                }`}
              >
                <span className="block font-mono text-[10px] text-muted-foreground">
                  {row.id}
                </span>
                <span className="block max-w-[14rem] text-sm font-semibold leading-tight">
                  {row.title}
                </span>
                <UsageBadge usage={row.usage} />
              </button>
            ))}
          </div>
          {current ? (
            <div className="rounded-xl border bg-card p-5">
              <p className="font-mono text-xs text-muted-foreground">{current.id}</p>
              <h3 className="font-heading text-lg font-semibold">{current.title}</h3>
              <p className="mt-2 text-sm">{current.summary}</p>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Related</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {current.related.length ? (
                  current.related.map((id) => (
                    <Button
                      key={id}
                      size="sm"
                      variant="outline"
                      onClick={() => setSelected(id)}
                    >
                      {id}
                    </Button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No edges.</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No node selected"
              actions={
                <EmptyAction onClick={() => setSelected("WO-1042")}>
                  Pick WO-1042
                </EmptyAction>
              }
            >
              Choose a Contoso record on the graph. Live-org edges stay parked.
            </EmptyState>
          )}
        </div>
      )}
    </div>
  );
}

export function RecordsView() {
  const [filter, setFilter] = useState("");
  const rows = CONTOSO_RECORDS;
  const visible = rows.filter((row) => {
    if (row.usage === "unused") return false;
    if (!filter.trim()) return true;
    const hay = `${row.id} ${row.title} ${row.area}`.toLowerCase();
    return hay.includes(filter.trim().toLowerCase());
  });
  const unused = rows.filter((row) => row.usage === "unused");

  return (
    <div className="space-y-4">
      <ContosoBanner />
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Records</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contoso demo corpus. LLM impact compare reads in use / referenced
          rows only.
        </p>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter by id, title, or area"
          className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title={filter.trim() ? "No records match" : "Demo corpus is empty"}
          actions={
            <>
              {filter.trim() ? (
                <EmptyAction onClick={() => setFilter("")}>Clear filter</EmptyAction>
              ) : null}
              <Link href="/query" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Run sample query
              </Link>
            </>
          }
        >
          {filter.trim()
            ? `Nothing in use or referenced for “${filter}”. Unused ENT-17 stays skipped.`
            : "Architecture still labels Contoso as in use."}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {visible.map((row) => (
            <RecordCard key={row.id} row={row} />
          ))}
        </ul>
      )}
      {unused.length ? (
        <div className="rounded-xl border border-dashed p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Unused — skipped by LLM impact compare
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {unused.map((row) => (
              <li key={row.id}>
                {row.id} · {row.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function EvalView({ search = "" }: { search?: string }) {
  const { handedOff, citations } = getEvalHandoff(search);

  return (
    <div className="space-y-4">
      <ContosoBanner />
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Retrieval Eval</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Handoff from Release Watch. Eval stays empty until Architecture emits
          a digest with citations. Contoso-only — no WhoAmI, no live inventory.
        </p>
      </div>
      {!handedOff || citations.length === 0 ? (
        <EmptyState
          title="No eval run yet"
          actions={
            <>
              <Link href="/architecture" className={cn(buttonVariants({ size: "sm" }))}>
                Pick digest on Architecture
              </Link>
              <Link href="/query" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                Run sample query
              </Link>
            </>
          }
        >
          Open Architecture, select Digest / what-breaks, then hand off cited
          Contoso ids (WO-1042, CAS-4481, KA-881). Live-org eval is parked.
        </EmptyState>
      ) : (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold">
              Digest handoff · citation coverage
            </h3>
            <Badge variant="outline" className="border-amber-500 text-amber-900">
              Contoso-only until unparked
            </Badge>
          </div>
          <ul className="space-y-3">
            {citations.map((row) => (
              <li key={row.flag} className="rounded-lg border bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
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
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {row.contosoIds.map((id) => (
                    <Badge key={id} variant="secondary" className="font-mono">
                      {id}
                    </Badge>
                  ))}
                </div>
                <a
                  href={row.sourceUrl}
                  className="mt-2 inline-block text-xs text-sky-800 underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.sourceLabel}
                </a>
                <p className="mt-1 font-mono text-[11px] break-all text-muted-foreground">
                  {row.sourceUrl}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Flag pack chips stay placeholders — not deprecation claims. Live-org
            eval is parked.
          </p>
          <Link href="/eval" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
            Clear digest
          </Link>
        </section>
      )}
    </div>
  );
}

function ContosoBanner() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge className="bg-emerald-700 text-white">
        Contoso sandbox · {CONTOSO_SANDBOX.status}
      </Badge>
      <Badge variant="outline" className="border-amber-500 text-amber-900">
        {CONTOSO_SANDBOX.untilUnparked}
      </Badge>
    </div>
  );
}

function RecordCard({ row }: { row: ContosoRecord }) {
  return (
    <li className="rounded-xl border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{row.id}</span>
        <span className="text-sm font-semibold">{row.title}</span>
        <UsageBadge usage={row.usage} />
        <Badge variant="secondary">{row.area}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{row.summary}</p>
    </li>
  );
}

function UsageBadge({ usage }: { usage: ContosoRecord["usage"] }) {
  return (
    <Badge
      variant="outline"
      className={
        usage === "in use"
          ? "border-emerald-600 text-emerald-800"
          : usage === "referenced"
            ? "border-sky-600 text-sky-800"
            : "border-zinc-400 text-zinc-600"
      }
    >
      {usage}
    </Badge>
  );
}
