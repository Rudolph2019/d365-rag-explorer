import type { ReactNode } from "react";
import Link from "next/link";
import { OllamaStatus } from "@/components/ollama-status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTOSO_TABS = [
  { href: "/architecture", id: "architecture", label: "Architecture" },
  { href: "/query", id: "query", label: "Query" },
  { href: "/graph", id: "graph", label: "Graph" },
  { href: "/records", id: "records", label: "Records" },
] as const;

const EXPLORER_TABS = [
  { href: "/", id: "pipeline", label: "Pipeline" },
  { href: "/compare", id: "compare", label: "Compare" },
  { href: "/impact", id: "impact", label: "Impact" },
  { href: "/ask", id: "ask", label: "Ask" },
] as const;

export type AppTab =
  | (typeof CONTOSO_TABS)[number]["id"]
  | (typeof EXPLORER_TABS)[number]["id"]
  | "eval";

export function AppShell({
  current,
  children,
}: {
  current: AppTab;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-700">
              Contoso sandbox · Dataverse · M365 Roadmap
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Dataverse RAG Explorer
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Contoso is in use. Architecture, Query, Graph, and Records stay on
              the demo corpus until a live org is unparked. Pipeline, Compare,
              Impact, and Ask still hit the public Roadmap API.
            </p>
          </div>
          <OllamaStatus />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <NavGroup
              label="Contoso QA"
              tabs={CONTOSO_TABS}
              current={current}
            />
            <NavGroup label="Explorer" tabs={EXPLORER_TABS} current={current} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

function NavGroup({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: readonly { href: string; id: string; label: string }[];
  current: AppTab;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <nav
        aria-label={label}
        className="flex w-full flex-wrap gap-1 rounded-lg bg-muted p-1 md:w-fit"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={current === tab.id ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: current === tab.id ? "default" : "ghost",
                size: "lg",
              }),
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
