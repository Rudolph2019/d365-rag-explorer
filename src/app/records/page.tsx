import { AppShell } from "@/components/app-shell";
import { RecordsView } from "@/components/contoso-views";

export default function RecordsPage() {
  return (
    <AppShell current="records">
      <RecordsView />
    </AppShell>
  );
}
