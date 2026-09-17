import { AppShell } from "@/components/app-shell";
import { ArchitectureView } from "@/components/architecture-view";

export default function ArchitecturePage() {
  return (
    <AppShell current="architecture">
      <ArchitectureView />
    </AppShell>
  );
}
