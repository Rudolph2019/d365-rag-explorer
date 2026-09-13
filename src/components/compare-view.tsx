"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPARE_ROWS } from "@/lib/compare";
import { M365_ROADMAP_API, type M365RoadmapItem } from "@/lib/m365";
import { stripHtml, truncate } from "@/lib/text";

type FeedState = {
  loading: boolean;
  error?: string;
  items: M365RoadmapItem[];
  count: number | null;
  source?: string;
};

export function CompareView() {
  const [feed, setFeed] = useState<FeedState>({ loading: true, items: [], count: null });

  const load = useCallback(async (markLoading = false) => {
    if (markLoading) {
      setFeed((prev) => ({ ...prev, loading: true, error: undefined }));
    }
    try {
      const res = await fetch(
        "/api/m365?top=20&orderby=modified desc&count=true",
        { cache: "no-store" },
      );
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Roadmap proxy failed");
      setFeed({
        loading: false,
        items: payload.items ?? [],
        count: payload.count ?? null,
        source: payload.source,
      });
    } catch (error) {
      setFeed({
        loading: false,
        items: [],
        count: null,
        error: error instanceof Error ? error.message : "Roadmap proxy failed",
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/m365?top=20&orderby=modified desc&count=true", { cache: "no-store" })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error ?? "Roadmap proxy failed");
        if (!cancelled) {
          setFeed({
            loading: false,
            items: payload.items ?? [],
            count: payload.count ?? null,
            source: payload.source,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFeed({
            loading: false,
            items: [],
            count: null,
            error: error instanceof Error ? error.message : "Roadmap proxy failed",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <SourceColumn
          title="Dataverse RAG"
          eyebrow="Private · tenant-bound · diagram only"
          points={[
            "Tables, annotations, and files are the source of record.",
            "Entra + Dataverse RBAC, then security-trimmed hybrid retrieve.",
            "MCP tools would carry a tenant token. Not implemented here.",
            "Azure OpenAI + Azure AI Search in the Microsoft cloud path.",
          ]}
        />
        <SourceColumn
          title="M365 Roadmap API"
          eyebrow="Public · unauthenticated · live in this tab"
          points={[
            "One OData entity set of feature items.",
            "No security trimming — the roadmap is public.",
            "This tab proxies the v2 API so the browser avoids CORS.",
            "Optional local embed/generate with Ollama; keyword fallback if offline.",
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Dimension</th>
              <th className="px-3 py-2 font-medium">Dataverse</th>
              <th className="px-3 py-2 font-medium">M365 Roadmap</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.dimension} className="border-t align-top">
                <td className="px-3 py-2.5 font-medium">{row.dimension}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.dataverse}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{row.m365}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-semibold">
              Live sample from the public feed
            </h2>
            <p className="text-xs text-muted-foreground">
              Proxied from{" "}
              <code className="rounded bg-muted px-1">{M365_ROADMAP_API}</code>
              {feed.count != null ? ` · ${feed.count} items in the active set` : ""}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void load(true)} disabled={feed.loading}>
            {feed.loading ? "Refreshing…" : "Refresh live feed"}
          </Button>
        </div>

        {feed.error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Could not load the Roadmap API: {feed.error}
          </div>
        ) : null}

        {!feed.error && !feed.loading && feed.items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            The proxy returned no items. The public feed may be empty or filtered
            out — retry refresh.
          </div>
        ) : null}

        {feed.loading && feed.items.length === 0 ? (
          <div className="rounded-lg border p-6 text-sm text-muted-foreground">
            Loading the live M365 Roadmap…
          </div>
        ) : null}

        <ul className="divide-y rounded-xl border bg-card">
          {feed.items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 px-3 py-3 md:flex-row md:items-start md:gap-4">
              <div className="flex shrink-0 flex-wrap gap-1 md:w-44">
                <Badge variant="secondary">{item.status || "Unknown"}</Badge>
                {(item.products ?? []).slice(0, 2).map((product) => (
                  <Badge key={product} variant="outline">
                    {product}
                  </Badge>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">
                  <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                    #{item.id}
                  </span>
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {truncate(stripHtml(item.description), 200)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SourceColumn({
  title,
  eyebrow,
  points,
}: {
  title: string;
  eyebrow: string;
  points: string[];
}) {
  return (
    <article className="rounded-xl border bg-card p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 font-heading text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-foreground/90">
        {points.map((point) => (
          <li key={point} className="leading-relaxed">
            {point}
          </li>
        ))}
      </ul>
    </article>
  );
}
