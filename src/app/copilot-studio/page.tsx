import { AppShell } from "@/components/app-shell";
import { CopilotStudioView } from "@/components/copilot-studio-view";

export default async function CopilotStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ digest?: string }>;
}) {
  const params = await searchParams;
  const search = params.digest != null ? `digest=${params.digest}` : "";
  return (
    <AppShell current="copilot-studio">
      <CopilotStudioView search={search} />
    </AppShell>
  );
}
