import { AppShell } from "@/components/app-shell";
import { ImpactView } from "@/components/impact-view";

export default function ImpactPage() {
  return (
    <AppShell current="impact">
      <ImpactView />
    </AppShell>
  );
}
