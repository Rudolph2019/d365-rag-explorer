"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TicketAnalysis, SeverityName } from "@/lib/impact";
import { SAMPLE_INVENTORY } from "@/lib/inventory";
import { VALID_WAVES, type ReleaseWave } from "@/lib/learn";
import { M365_ROADMAP_API } from "@/lib/m365";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<SeverityName, string> = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-amber-200 text-amber-950",
  Low: "bg-slate-200 text-slate-800",
};

type ImpactResponse = {
  inventory?: typeof SAMPLE_INVENTORY;
  tickets?: TicketAnalysis[];
  errors?: string[];
  count?: number;
  error?: string;
};

export function ImpactView() {
  const [uniqueNameText, setUniqueNameText] = useState(
    SAMPLE_INVENTORY.solutions.join("\n"),
  );
  const [includeRoadmap, setIncludeRoadmap] = useState(true);
  const [includeLearn, setIncludeLearn] = useState(true);
  const [wave, setWave] = useState<ReleaseWave>("2026wave1");
  const [hidePast, setHidePast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketAnalysis[]>([]);
  const [feedErrors, setFeedErrors] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          uniqueNameText,
          includeRoadmap,
          includeLearn,
          wave,
          top: 40,
        }),
      });
      const payload = (await res.json()) as ImpactResponse;
      if (!res.ok) throw new Error(payload.error ?? "Impact rating failed");
      setTickets(payload.tickets ?? []);
      setFeedErrors(payload.errors ?? []);
    } catch (err) {
      setTickets([]);
      setError(err instanceof Error ? err.message : "Impact rating failed");
    } finally {
      setLoading(false);
    }
  }, [includeLearn, includeRoadmap, uniqueNameText, wave]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        uniqueNameText: SAMPLE_INVENTORY.solutions.join("\n"),
        includeRoadmap: true,
        includeLearn: true,
        wave: "2026wave1",
        top: 40,
      }),
    })
      .then(async (res) => {
        const payload = (await res.json()) as ImpactResponse;
        if (!res.ok) throw new Error(payload.error ?? "Impact rating failed");
        if (!cancelled) {
          setTickets(payload.tickets ?? []);
          setFeedErrors(payload.errors ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTickets([]);
          setError(err instanceof Error ? err.message : "Impact rating failed");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    return tickets.filter((ticket) => (hidePast ? ticket.should_create_ticket : true));
  }, [hidePast, tickets]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <article className="rounded-xl border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">Sample inventory</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {SAMPLE_INVENTORY.deployment_type} · {SAMPLE_INVENTORY.region} · v
            {SAMPLE_INVENTORY.current_version}
          </p>
          <label className="mt-3 block text-xs font-medium">
            Solution unique names
            <textarea
              value={uniqueNameText}
              onChange={(event) => setUniqueNameText(event.target.value)}
              rows={6}
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs"
            />
          </label>
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {SAMPLE_INVENTORY.components.map((component) => (
              <li key={component.name}>
                <span className="font-mono text-foreground">{component.name}</span>{" "}
                · {component.type} · {component.area}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border bg-card p-5">
          <h2 className="font-heading text-base font-semibold">Live sources</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Primary:{" "}
            <code className="rounded bg-muted px-1">{M365_ROADMAP_API}</code>
            . Secondary: bounded Learn planned-features tables for Customer
            Service, Contact Center, and Field Service.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeRoadmap}
                onChange={(event) => setIncludeRoadmap(event.target.checked)}
              />
              Roadmap API
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeLearn}
                onChange={(event) => setIncludeLearn(event.target.checked)}
              />
              Learn release plans
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hidePast}
                onChange={(event) => setHidePast(event.target.checked)}
              />
              Hide past-dated
            </label>
            <label className="flex items-center gap-2">
              Wave
              <select
                value={wave}
                onChange={(event) => setWave(event.target.value as ReleaseWave)}
                className="rounded-md border bg-background px-2 py-1 text-sm"
              >
                {VALID_WAVES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4">
            <Button onClick={() => void load()} disabled={loading}>
              {loading ? "Rating live items…" : "Rate against inventory"}
            </Button>
          </div>
          {feedErrors.length > 0 ? (
            <p className="mt-3 text-xs text-amber-700">
              Partial feed: {feedErrors.join(" · ")}
            </p>
          ) : null}
        </article>
      </section>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && tickets.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Pulling the live Roadmap (and Learn wave if enabled), then matching to
          inventory…
        </div>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No matching TicketAnalysis rows. The public M365 feed is mostly
          Microsoft 365 products — enable Learn wave pages, paste unique names
          that map to CS/FS/Sales, or turn off “Hide past-dated”.
        </div>
      ) : null}

      <ul className="space-y-3">
        {visible.map((ticket) => (
          <li key={`${ticket.source}-${ticket.url}`} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium",
                  SEVERITY_STYLES[ticket.severity],
                )}
              >
                {ticket.severity}
              </span>
              <Badge
                variant={ticket.change_type === "Deprecated" ? "destructive" : "secondary"}
              >
                {ticket.change_type}
              </Badge>
              <Badge variant="outline">{ticket.area}</Badge>
              <Badge variant="outline">{ticket.source === "m365_roadmap" ? "Roadmap" : "Learn"}</Badge>
              <Badge variant="ghost">{ticket.ratedBy}</Badge>
            </div>
            <a
              href={ticket.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block font-medium leading-snug hover:underline"
            >
              {ticket.title}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              Effective {ticket.effective_date || "n/a"} · option-set{" "}
              {ticket.dataverseValue}
              {ticket.matched_solutions.length
                ? ` · ${ticket.matched_solutions.join(", ")}`
                : ""}
            </p>
            <p className="mt-2 text-sm">{ticket.reasoning}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
