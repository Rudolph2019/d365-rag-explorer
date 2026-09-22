import { AppShell } from "@/components/app-shell";
import { EvalView } from "@/components/contoso-views";

export default async function EvalPage({
  searchParams,
}: {
  searchParams: Promise<{ digest?: string }>;
}) {
  const params = await searchParams;
  const search =
    params.digest != null ? `digest=${params.digest}` : "";
  return (
    <AppShell current="eval">
      <EvalView search={search} />
    </AppShell>
  );
}
