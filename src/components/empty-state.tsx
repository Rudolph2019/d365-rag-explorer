import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-6">
      <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      {actions ? (
        <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function EmptyAction({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      {children}
    </Button>
  );
}
