import type { InventoryUse } from "@/lib/contoso";

export type FlagChip = {
  id: string;
  label: string;
  kind: "placeholder" | "signal";
  note: string;
};

export type ImpactCompareRow = {
  flag: string;
  inventory: string;
  usage: Exclude<InventoryUse, "unused">;
  whatBreaks: string;
  sourceUrl: string;
  sourceLabel: string;
};

export type WatchStep = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  badge?: string;
};

export const RELEASE_WATCH_STEPS: WatchStep[] = [
  {
    id: "signals",
    title: "Microsoft signals",
    summary: "M365 Roadmap + bounded Learn wave.",
    detail:
      "Same public feeds as Compare and Impact. No Message Center crawl and no invented retirement dates.",
    badge: "live public",
  },
  {
    id: "flag-pack",
    title: "Flag pack",
    summary: "Placeholder chips until a pack is published.",
    detail:
      "Chips are watch labels only. They are not deprecation claims and they do not change TicketAnalysis until a real pack lands.",
    badge: "placeholder",
  },
  {
    id: "env-swap",
    title: "Env Swap inventory",
    summary: "Contoso sandbox solutions and custom tables.",
    detail:
      "Inventory is the Contoso demo corpus (Field Service, Customer Service, custom cr_* tables). Live-org Env Swap stays parked — Contoso-only until unparked.",
    badge: "Contoso-only until unparked",
  },
  {
    id: "severity",
    title: "Severity",
    summary: "in use · referenced · unused",
    detail:
      "Usage against Contoso inventory, not TicketAnalysis Critical–Low. Unused is skipped or downranked before the LLM compare.",
  },
  {
    id: "llm-compare",
    title: "LLM impact compare",
    summary: "Flags vs inventory; cite source_url.",
    detail:
      "Compare flag pack rows to Contoso inventory. Emit only in use and referenced. Every emitted row must cite a Microsoft source_url. Unused is omitted. No deprecation sentence unless the source page says so.",
    badge: "LLM impact",
  },
  {
    id: "digest",
    title: "Digest / what-breaks",
    summary: "Short list for Contoso QA.",
    detail:
      "Operator-facing digest of what-breaks on the Contoso sandbox only. Empty until compare emits a row.",
  },
  {
    id: "eval",
    title: "Retrieval Eval",
    summary: "Handoff after a digest exists.",
    detail:
      "Pass cited Contoso ids into Retrieval Eval. The eval page stays empty until Architecture hands off a digest.",
    badge: "handoff",
  },
];

export const FLAG_PACK: FlagChip[] = [
  {
    id: "fs-mobile",
    label: "Field Service mobile",
    kind: "placeholder",
    note: "Placeholder watch chip. Not a deprecation claim.",
  },
  {
    id: "cs-copilot",
    label: "Copilot in Customer Service",
    kind: "placeholder",
    note: "Placeholder watch chip. Not a deprecation claim.",
  },
  {
    id: "purview",
    label: "Purview DLP",
    kind: "signal",
    note: "Tied to the public Roadmap feed when Compare/Impact load it.",
  },
  {
    id: "work-order",
    label: "Work order form",
    kind: "placeholder",
    note: "Placeholder watch chip for cr_fieldticket / cr_WorkOrderRibbon.",
  },
];

export const IMPACT_COMPARE: ImpactCompareRow[] = [
  {
    flag: "Field Service mobile",
    inventory: "msdyn_FieldService · cr_fieldticket · WO-1042",
    usage: "in use",
    whatBreaks:
      "Downtown work-order flow still cites KA-881. Watch the mobile client against this sandbox form — no retirement claimed.",
    sourceUrl: "https://www.microsoft.com/microsoft-365/roadmap?filters=&searchterms=Field%20Service",
    sourceLabel: "M365 Roadmap · Field Service",
  },
  {
    flag: "Copilot in Customer Service",
    inventory: "msdynce_CustomerService · cr_prioritycase · CAS-4481",
    usage: "in use",
    whatBreaks:
      "Priority-case summary form is in use. Compare is a watch, not a remove-from-org claim.",
    sourceUrl: "https://www.microsoft.com/microsoft-365/roadmap?filters=&searchterms=Customer%20Service%20Copilot",
    sourceLabel: "M365 Roadmap · Customer Service Copilot",
  },
  {
    flag: "Work order form",
    inventory: "cr_WorkOrderRibbon · KA-881",
    usage: "referenced",
    whatBreaks:
      "Ribbon and knowledge article are referenced by WO-1042. Unused entitlement ENT-17 was skipped.",
    sourceUrl: "https://learn.microsoft.com/en-us/dynamics365/release-plans/",
    sourceLabel: "Learn · Dynamics 365 release plans",
  },
];

export function getWatchStep(id: string) {
  return RELEASE_WATCH_STEPS.find((step) => step.id === id);
}
