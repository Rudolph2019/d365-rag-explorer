import type { ReactNode } from "react";
import Link from "next/link";
import { OllamaStatus } from "@/components/ollama-status";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/architecture", id: "architecture", label: "Architecture" },
  { href: "/", id: "pipeline", label: "Pipeline" },
  { href: "/compare", id: "compare", label: "Compare" },
  { href: "/impact", id: "impact", label: "Impact" },
  { href: "/ask", id: "ask", label: "Ask" },
  { href: "/query", id: "query", label: "Query" },
  { href: "/graph", id: "graph", label: "Graph" },
  { href: "/records", id: "records", label: "Records" },
  { href: "/knowledge/galxity", id: "knowledge", label: "Knowledge" },
  { href: "/eval", id: "eval", label: "Eval" },
] as const;

export type AppTab = (typeof TABS)[number]["id"];

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
              Contoso is in use. Architecture and Pipeline are siblings in the
              same nav. Live Dataverse swap stays parked (env URL, Entra, WhoAmI
              labels only).
            </p>
          </div>
          <OllamaStatus />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-5">
        <div className="flex flex-col gap-4">
          <nav
            aria-label="Explorer"
            className="flex w-full flex-wrap gap-1 rounded-lg bg-muted p-1"
          >
            {TABS.map((tab) => {
              const active = current === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    buttonVariants({
                      variant: active ? "default" : "ghost",
                      size: "lg",
                    }),
                    active && "shadow-sm",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </div>
      </main>
    </div>
  );
}
