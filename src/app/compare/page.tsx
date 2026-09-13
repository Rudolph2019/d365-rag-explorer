import { AppShell } from "@/components/app-shell";
import { CompareView } from "@/components/compare-view";

export default function ComparePage() {
  return (
    <AppShell current="compare">
      <CompareView />
    </AppShell>
  );
}
