import { AppShell } from "@/components/app-shell";
import { QueryView } from "@/components/contoso-views";

export default function QueryPage() {
  return (
    <AppShell current="query">
      <QueryView />
    </AppShell>
  );
}
