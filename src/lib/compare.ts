export type CompareRow = {
  dimension: string;
  dataverse: string;
  m365: string;
};

export const COMPARE_ROWS: CompareRow[] = [
  {
    dimension: "Auth",
    dataverse:
      "Entra ID plus table privileges. Every retrieve is security-trimmed to the caller.",
    m365: "Anonymous public OData. No token, no tenant, no trimming.",
  },
  {
    dimension: "Shape",
    dataverse:
      "Many tables, annotations, and files. Citations point back to row IDs.",
    m365: "One OData entity set of feature items (id, title, products, status, dates).",
  },
  {
    dimension: "Security trimming",
    dataverse: "Required. Privileges and sharing decide what can be grounded.",
    m365: "Not applicable — the roadmap is public.",
  },
  {
    dimension: "Retrieval",
    dataverse: "Chunk, embed, hybrid search in Azure AI Search.",
    m365: "OData $filter / $orderby / $top, then optional keyword or embed over the pulled slice.",
  },
  {
    dimension: "MCP",
    dataverse: "Tenant-bound tools (shown on the canvas, not implemented here).",
    m365: "Implemented in this repo: get_m365_roadmap proxies the live v2 API.",
  },
  {
    dimension: "Model",
    dataverse: "Azure OpenAI in Azure for embed and generate.",
    m365: "Same cloud path, or Ollama on localhost:11434 for local generate/embed.",
  },
  {
    dimension: "Live in this app",
    dataverse: "Architecture only — no Dataverse credentials.",
    m365: "Compare and Impact live-feed the public API through a server proxy.",
  },
];
