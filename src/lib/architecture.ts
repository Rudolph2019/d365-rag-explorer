import { LIVE_ORG } from "@/lib/live-org";

export type ArchitectureKind =
  | "source"
  | "retrieve"
  | "agent"
  | "citation"
  | "future";

export type ArchitectureNode = {
  id: string;
  title: string;
  kind: ArchitectureKind;
  col: number;
  row: number;
  summary: string;
  detail: string;
  badge?: string;
  dashed?: boolean;
};

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: "contoso-source",
    title: "Contoso sandbox",
    kind: "source",
    col: 1,
    row: 1,
    badge: "in use",
    summary: "Demo CRM corpus for Field Service and Customer Service.",
    detail:
      "Sources start here. Contoso is the sandbox in use: local work orders, cases, accounts, and knowledge articles. There is no live Dataverse call. The Power Platform env URL is labeled on Architecture and Dashboard; Entra secrets and WhoAmI stay parked.",
  },
  {
    id: "m365-source",
    title: "M365 Roadmap",
    kind: "source",
    col: 1,
    row: 2,
    badge: "live public",
    summary: "Public OData feed already wired in Compare / Impact / Ask.",
    detail:
      "Microsoft signals for Release Watch. Same v2 API as the rest of this explorer. Not a Contoso tenant source.",
  },
  {
    id: "retrieve",
    title: "Retrieve",
    kind: "retrieve",
    col: 2,
    row: 1,
    summary: "Pull Contoso chunks plus optional live Roadmap rows.",
    detail:
      "Happy-path retrieve is Contoso demo corpus (keyword over local records). Azure AI Search stays architecture copy. Live-org retrieve stays parked until WhoAmI has credentials — env URL is labeled only.",
  },
  {
    id: "planner",
    title: "Planner",
    kind: "agent",
    col: 3,
    row: 1,
    summary: "Decide retrieve vs tools vs stop.",
    detail:
      "First hop of the agent loop. Classifies the question (Contoso record, architecture, or M365 signal) and picks the next tool. Same idea as route_question on Ask — not a second swarm.",
  },
  {
    id: "tools",
    title: "Tools",
    kind: "agent",
    col: 3,
    row: 2,
    summary: "MCP + local corpus lookup, bounded steps.",
    detail:
      "Tool hop: get Contoso records, optional get_m365_roadmap, rate impact. Cap matches Ask (five steps). No client-credential Dataverse tools until the live org is unparked.",
  },
  {
    id: "critic",
    title: "Critic",
    kind: "agent",
    col: 3,
    row: 3,
    summary: "Refuse uncited or unused-inventory claims.",
    detail:
      "Last hop of the agent loop. Drops unused inventory hits, requires source_url or record id on in-use/referenced rows, and refuses invented deprecation language.",
  },
  {
    id: "citations",
    title: "Citations",
    kind: "citation",
    col: 4,
    row: 2,
    summary: "Grounded answer with Contoso ids and Roadmap #ids.",
    detail:
      "Answers must cite Contoso record ids (WO-1042, CAS-4481, KA-881) and, when Release Watch contributed, a Microsoft source_url. Unused inventory never ships in the answer.",
  },
  {
    id: "swap-env",
    title: "env URL",
    kind: "source",
    col: 5,
    row: 1,
    badge: "URL configured",
    summary: LIVE_ORG.makerHome.replace("https://", ""),
    detail:
      `Maker home for environment ${LIVE_ORG.environmentId}. This is a URL label only — Contoso remains the retrieve corpus. Open Dashboard for the live link.`,
  },
  {
    id: "swap-entra",
    title: "Entra app / client credentials",
    kind: "future",
    col: 5,
    row: 2,
    dashed: true,
    badge: "parked",
    summary: "No secrets stored in this explorer.",
    detail:
      "Do not paste client secrets. Entra credentials stay parked. Contoso remains the data path.",
  },
  {
    id: "swap-whoami",
    title: "WhoAmI health check",
    kind: "future",
    col: 5,
    row: 3,
    dashed: true,
    badge: "parked",
    summary: "Labeled future check until credentials exist.",
    detail:
      "WhoAmI is not called against the live org. When credentials exist, this check would confirm the env before Query / Graph / Records leave Contoso.",
  },
];

export const ARCHITECTURE_EDGES: [string, string][] = [
  ["contoso-source", "retrieve"],
  ["m365-source", "retrieve"],
  ["retrieve", "planner"],
  ["planner", "tools"],
  ["tools", "critic"],
  ["critic", "citations"],
  ["swap-env", "contoso-source"],
  ["swap-entra", "contoso-source"],
  ["swap-whoami", "contoso-source"],
];

export function getArchitectureNode(id: string) {
  return ARCHITECTURE_NODES.find((node) => node.id === id);
}
