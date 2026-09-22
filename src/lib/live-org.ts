import { FLAG_PACK, IMPACT_COMPARE, UNUSED_FLAG_IDS } from "@/lib/release-watch";

export const LIVE_ORG = {
  environmentId: "cc72ef22-bdee-e93a-a41f-db16e6d3fe0c",
  makerHome:
    "https://make.powerapps.com/environments/cc72ef22-bdee-e93a-a41f-db16e6d3fe0c/home",
} as const;

export function getDigestCounts() {
  const inUse = IMPACT_COMPARE.filter((row) => row.usage === "in use").length;
  const referenced = IMPACT_COMPARE.filter((row) => row.usage === "referenced").length;
  return {
    pack: FLAG_PACK.length,
    digestRows: IMPACT_COMPARE.length,
    inUse,
    referenced,
    unusedSkipped: UNUSED_FLAG_IDS.length,
  };
}

export const LIVE_ORG_LABELS = [
  {
    id: "env-url",
    label: "env URL",
    value: LIVE_ORG.makerHome,
    meta: LIVE_ORG.environmentId,
    note: "Parked label only. Query / Graph / Records stay on Contoso. No MCP and no secrets.",
    parked: true,
    caption: "parked",
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
