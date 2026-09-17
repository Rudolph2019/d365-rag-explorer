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
      "Sources start here. Contoso is the sandbox in use: local work orders, cases, accounts, and knowledge articles. There is no live Dataverse call. A future live-org swap would replace this node with a tenant env URL, Entra app / client credentials, and a WhoAmI health check — labels only until unparked.",
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
      "Happy-path retrieve is Contoso demo corpus (keyword over local records). Azure AI Search stays architecture copy. Live-org retrieve is parked with the env swap labels.",
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
    kind: "future",
    col: 5,
    row: 1,
    dashed: true,
    badge: "future swap",
    summary: "https://{org}.crm.dynamics.com — label only.",
    detail:
      "Future live-org swap. Not wired. Contoso sandbox remains the source in use.",
  },
  {
    id: "swap-entra",
    title: "Entra app / client credentials",
    kind: "future",
    col: 5,
    row: 2,
    dashed: true,
    badge: "future swap",
    summary: "No secrets stored in this explorer.",
    detail:
      "Future live-org swap. Client credentials would belong to the unparked env, not this repo.",
  },
  {
    id: "swap-whoami",
    title: "WhoAmI health check",
    kind: "future",
    col: 5,
    row: 3,
    dashed: true,
    badge: "future swap",
    summary: "Parked until the live org is unparked.",
    detail:
      "Future live-org swap. WhoAmI would confirm the swapped env before Query / Graph / Records leave Contoso.",
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
