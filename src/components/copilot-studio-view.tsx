import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  COPILOT_STUDIO_AGENT,
  COPILOT_STUDIO_MAKER_HOME,
  RELEASE_TICKET_LOGICAL_NAME,
  getCopilotStudioHandoff,
} from "@/lib/copilot-studio";
import { CONTOSO_SANDBOX } from "@/lib/contoso";
import { SEVERITY } from "@/lib/impact";
import { cn } from "@/lib/utils";

export function CopilotStudioView({ search = "" }: { search?: string }) {
  const { handedOff, payload } = getCopilotStudioHandoff(search);
  const emptyDigest = Boolean(handedOff && payload && payload.tickets.length === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-700 text-white">
          Contoso sandbox · {CONTOSO_SANDBOX.status}
        </Badge>
        <Badge variant="outline" className="border-amber-500 text-amber-900">
          No tenant credentials
        </Badge>
        <Badge variant="outline">Dataverse not called</Badge>
        <Badge variant="outline" className="font-mono">
          {RELEASE_TICKET_LOGICAL_NAME}
        </Badge>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Copilot Studio · spec only
        </p>
        <h2 className="font-heading text-base font-semibold">
          {COPILOT_STUDIO_AGENT.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent topics ingest the Release Watch digest (in use / referenced),
          emit TicketAnalysis rows, and create{" "}
          <span className="font-mono text-foreground">cr_releaseticket</span>{" "}
          rows owned by System Administrator. Publish happens in Copilot Studio
          in this environment — this explorer never calls Dataverse.
        </p>
        <a
          href={COPILOT_STUDIO_MAKER_HOME}
          className="mt-2 inline-block text-xs text-sky-800 break-all underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          {COPILOT_STUDIO_MAKER_HOME}
        </a>
      </section>

      {!handedOff ? (
        <EmptyState
          title="No digest handed off"
          actions={
            <Link href="/architecture" className={cn(buttonVariants({ size: "sm" }))}>
              Pick digest on Architecture
            </Link>
          }
        >
          Open Architecture → Digest / what-breaks, then Send to Copilot Studio.
          Unused inventory stays out of the payload.
        </EmptyState>
      ) : null}

      {emptyDigest ? (
        <EmptyState
          title="Digest has no in-use or referenced rows"
          actions={
            <Link href="/architecture" className={cn(buttonVariants({ size: "sm" }))}>
              Open Architecture digest
            </Link>
          }
        >
          Copilot Studio will not create Release Ticket rows from unused flags.
          No Dataverse call was made.
        </EmptyState>
      ) : null}

      {handedOff && payload && payload.tickets.length > 0 ? (
        <>
          <EmptyState
            title="No tenant credentials"
            actions={
              <Link href="/query" className={cn(buttonVariants({ size: "sm" }))}>
                Stay on Contoso Query
              </Link>
            }
          >
            {payload.message} Sample tickets below are the payload shape the
            published agent would write to {RELEASE_TICKET_LOGICAL_NAME}.
          </EmptyState>

          <section className="rounded-xl border bg-card p-5">
            <h3 className="font-heading text-sm font-semibold">
              Sample Release Ticket preview · System Administrator owner
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Maker Severity {SEVERITY.Critical.dataverseValue}–
              {SEVERITY.Low.dataverseValue}. {payload.releaseTickets.length}{" "}
              preview rows from {payload.tickets.length} TicketAnalysis records.
              Confirm logical name from table properties. Explorer does not call
              Dataverse.
            </p>
            <ul className="mt-3 space-y-3">
              {payload.releaseTickets.map((row) => (
                <li
                  key={row.flagId}
                  className="rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {row.flagId}
                    </span>
                    <span className="text-sm font-semibold">{row.title}</span>
                    <Badge variant="outline">
                      {row.severityName} · {row.ticketAnalysisSeverity}
                    </Badge>
                    <Badge variant="outline">
                      {row.changeType} · {row.changeTypeValue}
                    </Badge>
                    <Badge variant="secondary">{row.assignedToOwner}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.logicalName} ({row.displayName}) · {row.area} · preview
                    only
                  </p>
                  <a
                    href={row.sourceUrl}
                    className="mt-1 inline-block text-xs text-sky-800 break-all underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {row.sourceUrl}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h3 className="font-heading text-sm font-semibold">Handoff payload</h3>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] text-zinc-100">
              {JSON.stringify(
                {
                  schema: payload.schema,
                  environmentId: payload.environmentId,
                  filter: payload.filter,
                  unusedOmitted: payload.unusedOmitted,
                  dataverseCalled: payload.dataverseCalled,
                  credentials: payload.credentials,
                  tableLogicalName: payload.tableLogicalName,
                  createdViaWebApi: payload.createdViaWebApi,
                  auth: payload.auth,
                  tickets: payload.tickets,
                },
                null,
                2,
              )}
            </pre>
          </section>
        </>
      ) : null}
    </div>
  );
}
