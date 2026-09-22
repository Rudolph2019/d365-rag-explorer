import { UNUSED_INVENTORY_ID } from "@/lib/eval-handoff";
import { FLAG_PACK, IMPACT_COMPARE, UNUSED_FLAG_IDS } from "@/lib/release-watch";

export const LIVE_ORG = {
  environmentId: "cc72ef22-bdee-e93a-a41f-db16e6d3fe0c",
  makerHome:
    "https://make.powerapps.com/environments/cc72ef22-bdee-e93a-a41f-db16e6d3fe0c/home",
} as const;

const ENV_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LiveOrgConnection =
  | {
      status: "url-configured";
      whoami: "parked";
      environmentId: string;
      makerHome: string;
    }
  | {
      status: "empty";
      whoami: "parked";
      environmentId: "";
      makerHome: "";
      message: string;
    }
  | {
      status: "error";
      whoami: "parked";
      environmentId: string;
      makerHome: string;
      message: string;
    };

export function getLiveOrgConnection(
  env: { environmentId: string; makerHome: string } = LIVE_ORG,
): LiveOrgConnection {
  const environmentId = env.environmentId.trim();
  const makerHome = env.makerHome.trim();
  if (!environmentId || !makerHome) {
    return {
      status: "empty",
      whoami: "parked",
      environmentId: "",
      makerHome: "",
      message:
        "No Power Platform environment URL is configured. Architecture still shows the Contoso data path.",
    };
  }
  if (!ENV_ID.test(environmentId) || !makerHome.includes(environmentId)) {
    return {
      status: "error",
      whoami: "parked",
      environmentId,
      makerHome,
      message:
        "Environment id and maker URL do not match. Fix the live-org labels on Architecture. No live Dataverse call was made.",
    };
  }
  return {
    status: "url-configured",
    whoami: "parked",
    environmentId,
    makerHome,
  };
}

export function getDigestCounts() {
  const inUse = IMPACT_COMPARE.filter((row) => row.usage === "in use").length;
  const referenced = IMPACT_COMPARE.filter((row) => row.usage === "referenced").length;
  return {
    pack: FLAG_PACK.length,
    digestRows: IMPACT_COMPARE.length,
    inUse,
    referenced,
    unusedSkipped: UNUSED_FLAG_IDS.length,
    unusedInventoryId: UNUSED_INVENTORY_ID,
  };
}

export const LIVE_ORG_LABELS = [
  {
    id: "env-url",
    label: "env URL",
    value: LIVE_ORG.makerHome,
    meta: LIVE_ORG.environmentId,
    note: "Maker home for the connected environment. Query / Graph / Records stay on Contoso until live Dataverse is unparked.",
    parked: false,
    caption: "URL configured",
  },
  {
    id: "entra",
    label: "Entra app / client credentials",
    value: "not stored",
    meta: null,
    note: "No Azure secrets in this explorer. Do not paste client secrets here.",
    parked: true,
    caption: "parked",
  },
  {
    id: "whoami",
    label: "WhoAmI health check",
    value: "WhoAmI parked",
    meta: null,
    note: "Labeled future check until credentials exist. Contoso remains the data path.",
    parked: true,
    caption: "parked",
  },
] as const;
