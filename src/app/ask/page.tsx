import { AppShell } from "@/components/app-shell";
import { AskView } from "@/components/ask-view";

export default function AskPage() {
  return (
    <AppShell current="ask">
      <AskView />
    </AppShell>
  );
}
