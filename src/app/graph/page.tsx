import { AppShell } from "@/components/app-shell";
import { GraphView } from "@/components/contoso-views";

export default function GraphPage() {
  return (
    <AppShell current="graph">
      <GraphView />
    </AppShell>
  );
}
