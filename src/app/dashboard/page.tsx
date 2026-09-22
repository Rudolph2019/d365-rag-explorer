import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { getLiveOrgConnection } from "@/lib/live-org";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const connection =
    params.state === "empty"
      ? getLiveOrgConnection({ environmentId: "", makerHome: "" })
      : params.state === "error"
        ? getLiveOrgConnection({
            environmentId: "invalid",
            makerHome: "https://make.powerapps.com/environments/invalid/home",
          })
        : getLiveOrgConnection();

  return (
    <AppShell current="dashboard">
      <DashboardView connection={connection} />
    </AppShell>
  );
}
