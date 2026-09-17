export type InventoryUse = "in use" | "referenced" | "unused";

export type ContosoRecord = {
  id: string;
  type: string;
  title: string;
  summary: string;
  area: string;
  usage: InventoryUse;
  related: string[];
};

export const CONTOSO_SANDBOX = {
  org: "Contoso",
  environment: "Contoso Customer Service + Field Service sandbox",
  status: "in use" as const,
  untilUnparked: "Contoso-only until unparked",
  demoCorpus: "Local Contoso demo corpus — no tenant connector, no Azure secrets",
};

export const LIVE_ORG_SWAP = [
  {
    id: "env-url",
    label: "env URL",
    placeholder: "https://{org}.crm.dynamics.com",
    note: "Future live-org swap label only. Not wired.",
  },
  {
    id: "entra",
    label: "Entra app / client credentials",
    placeholder: "app id · client secret not stored",
    note: "No Azure secrets in this explorer. Swap stays parked.",
  },
  {
    id: "whoami",
    label: "WhoAmI health check",
    placeholder: "WhoAmI parked",
    note: "Runs after the live org is unparked. Contoso sandbox does not call WhoAmI.",
  },
] as const;

export const CONTOSO_RECORDS: ContosoRecord[] = [
  {
    id: "WO-1042",
    type: "msdyn_workorder",
    title: "Group head leak — Contoso Coffee Downtown",
    summary:
      "Field ticket on cr_fieldticket for a leaking espresso group. Dispatcher and tech notes are in the demo corpus.",
    area: "Field Service",
    usage: "in use",
    related: ["KA-881", "ACC-210"],
  },
  {
    id: "CAS-4481",
    type: "incident",
    title: "Priority case — Contoso loyalty outage",
    summary:
      "Customer Service case on cr_prioritycase. Used to ground Query citations; not a live org row.",
    area: "Customer Service",
    usage: "in use",
    related: ["KA-902", "ACC-210"],
  },
  {
    id: "KA-881",
    type: "knowledgearticle",
    title: "Bleed the group head before swapping the gasket",
    summary: "Demo knowledge article cited by Field Service answers.",
    area: "Field Service",
    usage: "referenced",
    related: ["WO-1042"],
  },
  {
    id: "KA-902",
    type: "knowledgearticle",
    title: "Loyalty cache reset for Contoso Coffee",
    summary: "Demo knowledge article cited by Customer Service answers.",
    area: "Customer Service",
    usage: "referenced",
    related: ["CAS-4481"],
  },
  {
    id: "ACC-210",
    type: "account",
    title: "Contoso Coffee (parent)",
    summary: "Parent account in the sandbox. Query and Graph treat this as in use.",
    area: "Sales",
    usage: "in use",
    related: ["WO-1042", "CAS-4481"],
  },
  {
    id: "ENT-17",
    type: "entitlement",
    title: "Legacy on-prem entitlement template",
    summary:
      "Present in inventory metadata only. LLM impact compare skips unused rows.",
    area: "Customer Service",
    usage: "unused",
    related: [],
  },
];

export function searchContoso(query: string): ContosoRecord[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return CONTOSO_RECORDS.filter((row) => row.usage !== "unused");
  return CONTOSO_RECORDS.filter((row) => {
    const hay = `${row.id} ${row.title} ${row.summary} ${row.area} ${row.type}`.toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}

export function getContosoRecord(id: string): ContosoRecord | undefined {
  return CONTOSO_RECORDS.find((row) => row.id === id);
}
