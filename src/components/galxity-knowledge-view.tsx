"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyAction, EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  GALXITY,
  GALXITY_ARTICLES,
  getGalxityArticle,
  searchGalxity,
  type GalxityArticle,
} from "@/lib/galxity";
import {
  GALXITY_COPILOT_STUDIO_KNOWLEDGE,
  GALXITY_MAKER_HOME,
  GALXITY_TABLE_LOGICAL_NAME,
  buildGalxityPowerAppsHandoff,
} from "@/lib/galxity-powerapps";
import { cn } from "@/lib/utils";

export function GalxityKnowledgeView({
  initialId,
}: {
  initialId?: string;
}) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string>(
    initialId && getGalxityArticle(initialId)
      ? getGalxityArticle(initialId)!.id
      : GALXITY_ARTICLES[0]?.id ?? "",
  );
  const hits = useMemo(() => searchGalxity(q), [q]);
  const current = hits.find((row) => row.id === selected) ?? hits[0];
  const handoff = useMemo(() => buildGalxityPowerAppsHandoff(), []);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-slate-800/20 bg-[radial-gradient(120%_80%_at_0%_0%,#0c4a6e_0%,#0f172a_45%,#020617_100%)] px-5 py-6 text-slate-50">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(125,211,252,0.35)_1px,transparent_0)] [background-size:22px_22px]"
        />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
            Knowledge · {GALXITY.org}
          </p>
          <h2 className="font-heading mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {GALXITY.product}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
            {GALXITY.tagline}. {GALXITY.platform}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/40">
              {GALXITY_ARTICLES.length} articles
            </Badge>
            <Badge
              variant="outline"
              className="border-slate-400/40 text-slate-200"
            >
              {GALXITY.source}
            </Badge>
          </div>
        </div>
      </div>

      <PowerAppsHandoff handoff={handoff} />

      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading text-base font-semibold">
          Search this topic
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Local keyword over Galxity knowledge articles — same shape as Contoso
          Query, separate corpus.
        </p>
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Quantum fabric, constellation, governance…"
          className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
          aria-label="Filter Galxity knowledge"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQ("quantum")}
          >
            Sample: quantum
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setQ("")}
            disabled={!q}
          >
            Clear
          </Button>
          <Link
            href="/records"
            className={cn(buttonVariants({ size: "sm", variant: "ghost" }))}
          >
            Contoso Records
          </Link>
        </div>
      </div>

      {hits.length === 0 ? (
        <EmptyState
          title="No Galxity matches"
          actions={
            <>
              <EmptyAction onClick={() => setQ("")}>Clear filter</EmptyAction>
              <EmptyAction onClick={() => setQ("governance")}>
                Try “governance”
              </EmptyAction>
            </>
          }
        >
          Nothing in the Galxity knowledge topic for “{q}”.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <ul className="space-y-2">
            {hits.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelected(row.id)}
                  className={cn(
                    "w-full rounded-xl border bg-card px-4 py-3 text-left transition-colors",
                    current?.id === row.id
                      ? "border-sky-700/50 ring-2 ring-sky-700/30"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {row.id}
                    </span>
                    <Badge variant="secondary">{row.area}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-semibold leading-snug">
                    {row.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {row.summary}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {current ? <ArticleDetail article={current} onSelect={setSelected} /> : null}
        </div>
      )}
    </div>
  );
}

function PowerAppsHandoff({
  handoff,
}: {
  handoff: ReturnType<typeof buildGalxityPowerAppsHandoff>;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-sky-800 text-white">Power Apps handoff</Badge>
        <Badge variant="outline">Dataverse not called</Badge>
        <Badge variant="outline" className="font-mono">
          {GALXITY_TABLE_LOGICAL_NAME}
        </Badge>
      </div>
      <h3 className="font-heading mt-3 text-base font-semibold">
        {GALXITY_COPILOT_STUDIO_KNOWLEDGE.name} → your environment
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{handoff.message}</p>
      <a
        href={GALXITY_MAKER_HOME}
        className="mt-2 inline-block text-xs text-sky-800 break-all underline-offset-2 hover:underline"
        target="_blank"
        rel="noreferrer"
      >
        {GALXITY_MAKER_HOME}
      </a>

      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm">
        {handoff.makerChecklist.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={handoff.exports.csv}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Download CSV
        </a>
        <a
          href={handoff.exports.zip}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Download markdown pack
        </a>
        <a
          href={handoff.exports.json}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Handoff JSON
        </a>
      </div>

      <div className="mt-4 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Copilot Studio instructions (paste)
        </p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
          {handoff.agentInstructions}
        </pre>
      </div>
    </section>
  );
}

function ArticleDetail({
  article,
  onSelect,
}: {
  article: GalxityArticle;
  onSelect: (id: string) => void;
}) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <p className="font-mono text-xs text-muted-foreground">{article.id}</p>
      <h3 className="font-heading mt-1 text-xl font-semibold tracking-tight">
        {article.title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{article.summary}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{article.area}</Badge>
        {article.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="mt-5 space-y-3 text-sm leading-relaxed">
        {article.body.map((para) => (
          <p key={para.slice(0, 48)}>{para}</p>
        ))}
      </div>
      <div className="mt-6 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Related
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {article.related.map((id) => {
            const related = getGalxityArticle(id);
            return (
              <Button
                key={id}
                size="sm"
                variant="outline"
                onClick={() => onSelect(id)}
              >
                {id}
                {related ? ` · ${related.area}` : null}
              </Button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
