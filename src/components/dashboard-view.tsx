import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CONTOSO_SANDBOX } from "@/lib/contoso";
import { EVAL_HANDOFF_HREF } from "@/lib/eval-handoff";
import {
  getDigestCounts,
  getLiveOrgConnection,
  type LiveOrgConnection,
} from "@/lib/live-org";
import { cn } from "@/lib/utils";

export function DashboardView({
  connection = getLiveOrgConnection(),
}: {
  connection?: LiveOrgConnection;
}) {
  const counts = getDigestCounts();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-700 text-white">
          Contoso sandbox · {CONTOSO_SANDBOX.status}
        </Badge>
        {connection.status === "url-configured" ? (
          <Badge variant="outline" className="border-emerald-600 text-emerald-800">
            URL configured
          </Badge>
        ) : null}
        <Badge variant="outline" className="border-amber-500 text-amber-900">
          WhoAmI parked
        </Badge>
        <Badge variant="outline">No Azure secrets</Badge>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Power Platform
        </p>
        <h2 className="font-heading text-base font-semibold">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Environment URL is labeled from maker home. Live Dataverse retrieve
          is not called. Contoso is still the Query / Graph / Records corpus.
        </p>
      </section>

      {connection.status === "empty" ? (
        <EmptyState
          title="No environment URL configured"
          actions={
            <Link href="/architecture" className={cn(buttonVariants({ size: "sm" }))}>
              Open Architecture
            </Link>
          }
        >
          {connection.message}
        </EmptyState>
      ) : null}

      {connection.status === "error" ? (
        <EmptyState
          title="Environment URL does not match"
          actions={
            <Link href="/architecture" className={cn(buttonVariants({ size: "sm" }))}>
              Fix labels on Architecture
            </Link>
          }
        >
          {connection.message}
        </EmptyState>
      ) : null}

      {connection.status === "url-configured" ? (
        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Environment id
            </p>
            <p className="mt-1 font-mono text-sm break-all">
              {connection.environmentId}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Connection status: URL configured · WhoAmI parked
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Maker home
            </p>
            <a
              href={connection.makerHome}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-sky-800 break-all underline-offset-2 hover:underline"
            >
              {connection.makerHome}
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              Opens make.powerapps.com for this environment. This explorer does
              not send credentials.
            </p>
          </div>
        </section>
      ) : null}

      {counts.digestRows === 0 ? (
        <EmptyState
          title="No Release Watch digest yet"
          actions={
            <Link href="/architecture" className={cn(buttonVariants({ size: "sm" }))}>
              Open Architecture digest
            </Link>
          }
        >
          Impact-grounded rows appear after Architecture compare emits in use /
          referenced flags. Unused inventory stays skipped.
        </EmptyState>
      ) : (
        <section className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading text-sm font-semibold">
              Release Watch digest
            </h3>
            <Link
              href={EVAL_HANDOFF_HREF}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Open Retrieval Eval
            </Link>
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <CountCard
              label="in use"
              value={counts.inUse}
              hint="Contoso-grounded flags"
            />
            <CountCard
              label="referenced"
              value={counts.referenced}
              hint="Cited, not primary"
            />
            <CountCard
              label="unused skipped"
              value={counts.unusedSkipped}
              hint={`${counts.unusedInventoryId} + unused-product flags`}
            />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {counts.digestRows} digest rows from {counts.pack} FLAG_PACK ids.
            Unused products stay in the pack for coverage but are omitted from
            the operator digest.
          </p>
        </section>
      )}

      <EmptyState
        title="WhoAmI parked"
        actions={
          <Link href="/query" className={cn(buttonVariants({ size: "sm" }))}>
            Stay on Contoso Query
          </Link>
        }
      >
        WhoAmI is a labeled future check until credentials exist. No client
        secret is stored. Query, Graph, and Records keep using the Contoso
        sandbox.
      </EmptyState>
    </div>
  );
}

function CountCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-heading text-2xl font-semibold">{value}</dd>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
