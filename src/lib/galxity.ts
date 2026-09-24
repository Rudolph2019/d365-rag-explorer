export type GalxityArticle = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  area: string;
  tags: string[];
  body: string[];
  related: string[];
};

export const GALXITY = {
  org: "Galxity",
  product: "Galxity AI",
  tagline: "Intelligence inside enterprise, across earth and orbit",
  platform: "Q-SaaS orchestration layer for Youniverse1",
  source: "Demo knowledge topic — local corpus, no tenant connector",
};

/** Knowledge topic: Galxity AI / Youniverse1 operating model. */
export const GALXITY_ARTICLES: GalxityArticle[] = [
  {
    id: "KA-GX-01",
    slug: "enterprise-horizon",
    title: "Enterprise Horizon — assess before you orchestrate",
    summary:
      "Entry path into Galxity AI: exposure, readiness, and a governed migration sequence.",
    area: "Enterprise Intelligence",
    tags: ["assess", "roadmap", "governance"],
    body: [
      "Enterprise Horizon is the primary path into Galxity AI and Youniverse1. It evaluates infrastructure, data, security, AI readiness, and quantum exposure.",
      "The output is not a slide deck — it is a prioritized, measurable migration roadmap: assess → prioritize → orchestrate.",
      "Use this article when grounding answers about where an enterprise should start with Galxity, or when Release Watch asks what breaks if readiness gates are skipped.",
    ],
    related: ["KA-GX-04", "KA-GX-06"],
  },
  {
    id: "KA-GX-02",
    slug: "constellation-command",
    title: "Constellation Command — health, tasking, and links",
    summary:
      "Coordinate spacecraft health, payload tasking, link scheduling, and bounded autonomous response.",
    area: "Operations",
    tags: ["constellation", "telemetry", "autonomy"],
    body: [
      "Constellation Command treats the fleet as one operational picture: health, payload schedules, optical links, and operator workflow.",
      "Governed agents may optimize and respond within policy bounds; human approval stays on mission-critical command paths.",
      "Cite this article for Field-style work orders that map to constellation ops (payload tasking, link acquisition, anomaly response).",
    ],
    related: ["KA-GX-03", "KA-GX-05"],
  },
  {
    id: "KA-GX-03",
    slug: "quantum-network-fabric",
    title: "Quantum Network Fabric — fiber to orbit as one trust plane",
    summary:
      "Terrestrial, ground-to-space, and inter-satellite optical links under one observable fabric.",
    area: "Quantum Network",
    tags: ["qkd", "optical", "trust"],
    body: [
      "Galxity AI orchestrates terrestrial quantum-ready networks, optical ground-to-space links, and inter-satellite crosslinks as one fabric.",
      "Post-quantum cryptography on fiber and edge comes first where risk demands it; QKD and optical links are placed where mission physics justifies them.",
      "Operators get one view of topology, keys, link health, risk, and service-level performance — not separate satellite and enterprise silos.",
    ],
    related: ["KA-GX-04", "KA-GX-02"],
  },
  {
    id: "KA-GX-04",
    slug: "q-cyber-defense",
    title: "Q-Cyber Defense — exposure map to continuous assurance",
    summary:
      "Map cryptographic exposure, prioritize post-quantum migration, and govern keys and trust boundaries.",
    area: "Security",
    tags: ["post-quantum", "keys", "assurance"],
    body: [
      "Q-Cyber Defense starts with an exposure map: algorithms, trust boundaries, and key lifecycle across enterprise and mission systems.",
      "Migration is sequenced — not a single cutover — so continuity holds from fiber to orbit while assurance stays continuous.",
      "Ground Customer Service–style priority cases here when the topic is crypto inventory, key escrow, or policy-blocked agent actions.",
    ],
    related: ["KA-GX-01", "KA-GX-03"],
  },
  {
    id: "KA-GX-05",
    slug: "blockchain-integrity",
    title: "Blockchain Integrity — provenance without token theater",
    summary:
      "Permissioned ledgers for identity, access, settlement, and audit — not speculative tokens.",
    area: "Integrity",
    tags: ["ledger", "provenance", "audit"],
    body: [
      "Galxity uses permissioned ledgers for provenance, identity, access, settlement, and auditability.",
      "The point is measurable integrity across value-chain handoffs, not speculative token economics.",
      "Reference this article when Ask or Impact needs a citation for audit trails tying enterprise demand to celestial fulfillment.",
    ],
    related: ["KA-GX-06", "KA-GX-02"],
  },
  {
    id: "KA-GX-06",
    slug: "data-agent-governance",
    title: "Data & Agent Governance — authority with human approval",
    summary:
      "Control models, data access, agent authority, policy enforcement, and human approval gates.",
    area: "Governance",
    tags: ["agents", "policy", "approval"],
    body: [
      "Governed agents connect strategy, infrastructure, operations, and executive decisions through one controlled intelligence layer.",
      "Policy defines what agents may read, propose, and execute; human approval remains on high-impact actions.",
      "Use this as the grounding article for orchestrator tool loops — same spirit as Ask’s five-step cap and visible tool trace.",
    ],
    related: ["KA-GX-01", "KA-GX-05"],
  },
];

export function getGalxityArticle(idOrSlug: string): GalxityArticle | undefined {
  const key = idOrSlug.toLowerCase();
  return GALXITY_ARTICLES.find(
    (row) => row.id.toLowerCase() === key || row.slug === key,
  );
}

export function searchGalxity(query: string): GalxityArticle[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return GALXITY_ARTICLES;
  return GALXITY_ARTICLES.filter((row) => {
    const hay =
      `${row.id} ${row.title} ${row.summary} ${row.area} ${row.tags.join(" ")} ${row.body.join(" ")}`.toLowerCase();
    return tokens.every((token) => hay.includes(token));
  });
}
