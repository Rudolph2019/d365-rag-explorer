import { AppShell } from "@/components/app-shell";
import { GalxityKnowledgeView } from "@/components/galxity-knowledge-view";

export default function GalxityKnowledgePage() {
  return (
    <AppShell current="knowledge">
      <GalxityKnowledgeView />
    </AppShell>
  );
}
