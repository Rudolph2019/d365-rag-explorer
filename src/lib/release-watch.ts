import type { InventoryUse } from "@/lib/contoso";
import handoff from "../data/flags-handoff-retrieval-eval.json";
import snapshot from "../data/first-snapshot-2026-09-15.json";

export type FlagKind = "wave" | "plan" | "deprecation" | "retirement";

export type FlagChip = {
  id: string;
  label: string;
  title: string;
  kind: FlagKind;
  product: string;
  sourceUrl: string;
  prioritySeed: boolean;
  note: string;
};

export type ImpactCompareRow = {
  flagId: string;
  flag: string;
  inventory: string;
  usage: Exclude<InventoryUse, "unused">;
  whatBreaks: string;
  sourceUrl: string;
  sourceLabel: string;
  prioritySeed: boolean;
};

export type WatchStep = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  badge?: string;
};

type ContosoGrounding = {
  usage: Exclude<InventoryUse, "unused">;
  inventory: string;
};

/**
 * Only flags whose product/feature is in use or referenced on the Contoso
 * sandbox. Unused products (Power Pages, Data Lake, USD, Sales Hub Dialer, …)
 * stay in FLAG_PACK for Retrieval Eval id coverage but are omitted from the
 * digest — same skip as ENT-17.
 */
const CONTOSO_FLAG_GROUNDING: Record<string, ContosoGrounding> = {
  "wave-d365-2026w1": {
    usage: "in use",
    inventory: "msdyn_FieldService · msdynce_CustomerService · WO-1042 · CAS-4481",
  },
  "wave-pp-2026w1": {
    usage: "in use",
    inventory: "Power Platform · Dataverse · WO-1042 · CAS-4481",
  },
  "plan-ai-at-work-transition": {
    usage: "in use",
    inventory: "Dataverse · Dynamics 365 · WO-1042 · CAS-4481",
  },
  "plan-ai-at-work-roadmap": {
    usage: "in use",
    inventory: "Dataverse · Dynamics 365 · WO-1042 · CAS-4481",
  },
  "dep-modern-look-enforced": {
    usage: "in use",
    inventory:
      "cr_CaseSummaryForm · cr_WorkOrderRibbon · WO-1042 · CAS-4481 · KA-881",
  },
  "dep-editable-readonly-grids": {
    usage: "in use",
    inventory: "msdyn_FieldService · msdynce_CustomerService · WO-1042 · CAS-4481",
  },
  "dep-soap-2011-endpoint": {
    usage: "in use",
    inventory: "Dataverse · WO-1042 · CAS-4481",
  },
  "dep-odata-v2": {
    usage: "in use",
    inventory: "Dataverse · WO-1042 · CAS-4481",
  },
  "dep-dataverse-legacy-connector": {
    usage: "referenced",
    inventory: "Power Automate integration · cr_fieldticket · WO-1042",
  },
  "dep-purview-audit-field-values": {
    usage: "in use",
    inventory: "Dataverse · WO-1042 · CAS-4481",
  },
  "ret-routing-diagnostics": {
    usage: "referenced",
    inventory: "msdyn_Omnichannel · cr_OmniChatWidget · CAS-4481",
  },
};

const SNAPSHOT_BY_ID = new Map(
  snapshot.items.map((item) => [item.id, item] as const),
);

export const FLAG_SNAPSHOT_DATE = handoff.snapshot_date;
export const PRIORITY_SEED_IDS = handoff.priority_seed_ids as readonly string[];
export const HANDOFF_FLAG_IDS = handoff.flags.map((flag) => flag.id);

export const FLAG_PACK: FlagChip[] = handoff.flags.map((flag) => ({
  id: flag.id,
  label: flag.title,
  title: flag.title,
  kind: flag.kind as FlagKind,
  product: flag.product,
  sourceUrl: flag.citation_key,
  prioritySeed: flag.priority_seed,
  note: SNAPSHOT_BY_ID.get(flag.id)?.notes ?? flag.product,
}));

export const FLAG_PACK_BY_ID = new Map(FLAG_PACK.map((flag) => [flag.id, flag]));

export const FLAG_PACK_PRIORITY_FIRST = [...FLAG_PACK].sort((a, b) => {
  if (a.prioritySeed !== b.prioritySeed) return a.prioritySeed ? -1 : 1;
  return 0;
});

export function citationLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    if (parsed.hostname === "learn.microsoft.com") {
      const slug = path
        .replace(/^\/en-us\//, "")
        .split("/")
        .filter(Boolean)
        .slice(-2)
        .join(" / ");
      return slug ? `Learn · ${slug}` : "Microsoft Learn";
    }
    if (path.includes("microsoft-365/roadmap")) return "M365 Roadmap";
    if (path.includes("dynamics-365/blog")) return "Dynamics 365 blog";
    return parsed.hostname;
  } catch {
    return url;
  }
}

export const IMPACT_COMPARE: ImpactCompareRow[] = FLAG_PACK.flatMap((flag) => {
  const ground = CONTOSO_FLAG_GROUNDING[flag.id];
  if (!ground) return [];
  const notes = SNAPSHOT_BY_ID.get(flag.id)?.notes;
  return [
    {
      flagId: flag.id,
      flag: flag.title,
      inventory: ground.inventory,
      usage: ground.usage,
      whatBreaks: notes
        ? `${notes} Contoso ${ground.usage}: ${ground.inventory}. Unused ENT-17 omitted.`
        : `Contoso ${ground.usage}: ${ground.inventory}. Unused ENT-17 omitted.`,
      sourceUrl: flag.sourceUrl,
      sourceLabel: citationLabel(flag.sourceUrl),
      prioritySeed: flag.prioritySeed,
    },
  ];
});

export const UNUSED_FLAG_IDS = FLAG_PACK.filter(
  (flag) => !(flag.id in CONTOSO_FLAG_GROUNDING),
).map((flag) => flag.id);

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
    summary: `${FLAG_PACK.length} handoff flags (${FLAG_SNAPSHOT_DATE}). Citation key = source_url.`,
    detail:
      "Pack ids match the Retrieval Eval handoff. Chips are watch labels with Microsoft source_url. Digest only emits in use / referenced against Contoso. Unused products stay in the pack for id coverage but are omitted from the digest. Not a TicketAnalysis change.",
    badge: `${FLAG_PACK.length} flags`,
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
      "Compare flag pack rows to Contoso inventory. Emit only in use and referenced. Every emitted row must cite the handoff source_url. Unused is omitted. No deprecation sentence unless the source page says so.",
    badge: "LLM impact",
  },
  {
    id: "digest",
    title: "Digest / what-breaks",
    summary: "Impact-grounded Contoso list only.",
    detail:
      "Operator-facing digest of what-breaks on the Contoso sandbox only. Unused inventory (ENT-17) and unused products are omitted. Empty until compare emits a row.",
  },
  {
    id: "eval",
    title: "Retrieval Eval",
    summary: "Handoff after a digest exists.",
    detail:
      "Pass cited FLAG_PACK ids and Contoso ids into Retrieval Eval. The eval page stays empty until Architecture hands off a digest. Citation coverage is scored against handoff source_url values.",
    badge: "handoff",
  },
];

export function getWatchStep(id: string) {
  return RELEASE_WATCH_STEPS.find((step) => step.id === id);
}
