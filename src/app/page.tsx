import { AppShell } from "@/components/app-shell";
import { PipelineView } from "@/components/pipeline-view";

export default function Home() {
  return (
    <AppShell current="pipeline">
      <PipelineView />
    </AppShell>
  );
}
