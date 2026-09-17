import { AppShell } from "@/components/app-shell";
import { EvalView } from "@/components/contoso-views";

export default function EvalPage() {
  return (
    <AppShell current="eval">
      <EvalView />
    </AppShell>
  );
}
