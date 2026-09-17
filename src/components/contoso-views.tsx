"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CONTOSO_RECORDS,
  CONTOSO_SANDBOX,
  searchContoso,
  type ContosoRecord,
} from "@/lib/contoso";

export function QueryView() {
  const [q, setQ] = useState("");
  const hits = useMemo(() => searchContoso(q), [q]);
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
          onChange={(event) => setQ(event.target.value)}
          placeholder="Work order leak, loyalty outage, Contoso Coffee…"
          className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQ("group head leak")}
          >
            Field ticket
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQ("loyalty")}
          >
            Priority case
          </Button>
          <Link href="/architecture">
            <Button size="sm" variant="ghost">
              Architecture
            </Button>
          </Link>
        </div>
      </div>

      {hits.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-sm text-muted-foreground">
          No Contoso demo hits for “{q}”. Live-org retrieve is parked until
          unparked. Try a Field Service or Customer Service term, or open
          Records.
        </div>
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
  const [selected, setSelected] = useState<string | null>("WO-1042");
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
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-sm text-muted-foreground">
          No Contoso graph yet. Architecture still shows the retrieve → agent
          loop.
        </div>
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
          <div className="rounded-xl border bg-card p-5">
            {current ? (
              <>
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
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a node. Graph is Contoso-only until unparked.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecordsView() {
  const rows = CONTOSO_RECORDS;
  const visible = rows.filter((row) => row.usage !== "unused");
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
      </div>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-sm text-muted-foreground">
          Demo corpus is empty. Architecture still labels Contoso as in use.
        </div>
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

export function EvalView() {
  return (
    <div className="space-y-4">
      <ContosoBanner />
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Retrieval Eval</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Handoff from Release Watch. Eval stays empty until Architecture emits
          a digest with citations.
        </p>
      </div>
      <div className="rounded-xl border border-dashed bg-muted/30 p-8">
        <p className="text-sm text-muted-foreground">
          No eval run yet. Open Architecture, select Digest / what-breaks or
          Retrieval Eval, then return here with cited Contoso ids (WO-1042,
          CAS-4481, KA-881). Live-org eval is parked.
        </p>
        <Link href="/architecture" className="mt-4 inline-block">
          <Button size="sm">Back to Architecture</Button>
        </Link>
      </div>
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
