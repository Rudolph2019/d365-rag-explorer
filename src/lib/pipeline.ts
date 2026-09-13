export type PipelinePath = "indexing" | "query" | "both";
export type StageKind =
  | "source"
  | "process"
  | "model"
  | "connector"
  | "agent"
  | "security"
  | "future";
export type LlmJob =
  | "router"
  | "summarize"
  | "rerank"
  | "explainer"
  | "impact"
  | "generate"
  | "embed";

export type PipelineStage = {
  id: string;
  title: string;
  path: PipelinePath;
  kind: StageKind;
  dashed?: boolean;
  summary: string;
  detail: string;
  mcpTools?: string[];
  llmJob?: LlmJob;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "dataverse",
    title: "Dataverse",
    path: "both",
    kind: "source",
    summary: "Private CRM source of record — tables, annotations, and files.",
    detail:
      "Dataverse holds tenant CRM rows (accounts, cases, emails, annotations, file attachments). Change tracking and Entra + Dataverse RBAC apply. This explorer is architecture-only for Dataverse: there is no tenant connector in this slice. Retrieval would chunk rows and files, embed them, and store citations back to record IDs in Azure AI Search.",
    mcpTools: ["get_pipeline_stage"],
  },
  {
    id: "m365",
    title: "M365 Roadmap API",
    path: "both",
    kind: "source",
    summary: "Public OData v2 feed that powers the Microsoft 365 Roadmap.",
    detail:
      "Live, unauthenticated OData at https://www.microsoft.com/releasecommunications/api/v2/m365. Supports $filter, $orderby, $top, $skip, and $count. Typical fields: id, title, description, products, platforms, status, cloudInstances, releaseRings, generalAvailabilityDate, created, modified. Compare and Impact call this URL through the Next.js proxy so the browser never hits CORS. The active set is the public roadmap (features in development, rolling out, or recently launched).",
    mcpTools: ["get_m365_roadmap"],
  },
  {
    id: "inventory",
    title: "Solution inventory",
    path: "both",
    kind: "source",
    summary: "Sample Dynamics customizations used to rate roadmap impact.",
    detail:
      "Shaped like the analyzer test_environment_state: solution unique names, current version, deployment type, region, custom entities, and a short component list. Callers can paste unique names. There is no Dataverse API — inventory is local sample data plus optional pasted names.",
    mcpTools: ["rate_roadmap_impact"],
  },
  {
    id: "extract-chunk",
    title: "Extract and chunk",
    path: "indexing",
    kind: "process",
    summary: "Azure Functions / Document Intelligence for Dataverse files.",
    detail:
      "Indexing path for private content. Azure Functions would pull changed rows and files; Document Intelligence extracts text from annotations and attachments; chunking keeps citations aligned to source rows. Not executed here — Dataverse stays diagram-only.",
  },
  {
    id: "summarize",
    title: "Summarize (LLM)",
    path: "indexing",
    kind: "model",
    summary: "Ingest-time shorten and normalize before embed.",
    detail:
      "Live demo on M365 description HTML → plain summary via Ollama. If Ollama is down, the fallback strips HTML and truncates. Dataverse notes and emails stay architecture copy in this slice.",
    llmJob: "summarize",
  },
  {
    id: "embeddings",
    title: "Embeddings",
    path: "both",
    kind: "model",
    summary: "Azure OpenAI in the cloud, or Ollama nomic-embed-text locally.",
    detail:
      "Toggle Azure OpenAI vs Ollama on the canvas. Local embeddings use Ollama at http://127.0.0.1:11434 (nomic-embed-text when present). If the embed model is missing, retrieve falls back to keyword scoring over the pulled M365 slice.",
    llmJob: "embed",
  },
  {
    id: "azure-search",
    title: "Azure AI Search",
    path: "both",
    kind: "process",
    summary: "Hybrid index for Dataverse (diagram only in this slice).",
    detail:
      "Would store chunk embeddings plus security-trim metadata (object IDs, table privileges). M365 items are not indexed here — they are pulled live via OData, then optionally keyword- or embed-retrieved in process.",
  },
  {
    id: "mcp",
    title: "MCP connection",
    path: "both",
    kind: "connector",
    summary: "Tool surface for Cursor, Copilot, and this app.",
    detail:
      "In-repo stdio MCP server (npm run mcp). Tools: get_pipeline, get_pipeline_stage, get_m365_roadmap, compare_sources, rate_roadmap_impact, ask_ollama. Dataverse tools would be tenant-bound and are shown, not implemented. Do not wrap a third-party roadmap MCP — this server owns both pipeline lookup and the live M365 tool.",
    mcpTools: [
      "get_pipeline",
      "get_pipeline_stage",
      "get_m365_roadmap",
      "compare_sources",
      "rate_roadmap_impact",
      "ask_ollama",
    ],
  },
  {
    id: "orchestrator",
    title: "Orchestrator agent",
    path: "query",
    kind: "agent",
    summary: "One tool-using loop over MCP — not a multi-agent swarm.",
    detail:
      "Query path: user question → Ollama orchestrator → MCP tools in a bounded loop (cap 5 steps) → final answer. Tools: route_question, get_m365_roadmap, rate_roadmap_impact, get_pipeline / get_pipeline_stage, explain_stage, compare_sources. Ask shows a tool-call trace. If Ollama is down there is no loop — keyword router plus a single retrieve or static explainer. Copilot Studio and Dynamics 365 Copilot stay future Microsoft consumers.",
    mcpTools: [
      "route_question",
      "get_m365_roadmap",
      "rate_roadmap_impact",
      "get_pipeline",
      "get_pipeline_stage",
      "explain_stage",
      "compare_sources",
    ],
    llmJob: "explainer",
  },
  {
    id: "impact-rater",
    title: "Impact rater",
    path: "both",
    kind: "process",
    summary: "TicketAnalysis: Critical–Low, Feature vs Deprecated.",
    detail:
      "Matches live Roadmap items (and a bounded Learn wave) to the solution inventory. Fills TicketAnalysis: title, description, url, area, severity, effective_date, change_type, is_deferable, system_impact, reasoning, should_create_ticket. Severity option-set ints 211460000–211460003 are kept as dataverseValue for a future D365 ticket. Ollama fills severity and reasoning when online; otherwise unique-name/area map + deprecation-phrase scan, default Medium. Past effective dates are not actionable.",
    llmJob: "impact",
    mcpTools: ["rate_roadmap_impact"],
  },
  {
    id: "router",
    title: "Router (LLM)",
    path: "query",
    kind: "model",
    summary: "Classify the question as Dataverse, M365, or architecture.",
    detail:
      "dataverse → architecture-only answer (no tenant). m365_roadmap → hit the public API. architecture → explain the pipeline. Fallback if Ollama is down: keyword heuristics (roadmap / Copilot / Teams vs Dataverse / case / account vs “how does ingest work”).",
    llmJob: "router",
    mcpTools: ["route_question"],
  },
  {
    id: "retrieve",
    title: "Retrieve",
    path: "query",
    kind: "process",
    summary: "Hybrid + security filters vs OData + local retrieve.",
    detail:
      "Dataverse path (diagram): hybrid search with security trimming. M365 path (live): OData filter, then keyword or simple embed over the pulled slice. Citations stay as roadmap item ids.",
    mcpTools: ["get_m365_roadmap"],
  },
  {
    id: "rerank",
    title: "Rerank (LLM)",
    path: "query",
    kind: "model",
    summary: "Ollama scores retrieved items against the question.",
    detail:
      "After OData/keyword retrieve, Ollama reorders the top items before generate. Fallback: keep API or keyword order. This is a pipeline job, not a separate agent.",
    llmJob: "rerank",
  },
  {
    id: "generate",
    title: "Generate",
    path: "query",
    kind: "model",
    summary: "Azure OpenAI or Ollama, with citations to source ids.",
    detail:
      "Cloud Azure OpenAI is the labeled alternative on the diagram — no key required for this explorer. Local generate uses Ollama llama3.2 (or OLLAMA_MODEL). Answers that used the roadmap must cite item ids. If Ollama is down, Ask still returns retrieved titles plus a start-Ollama empty state.",
    llmJob: "generate",
  },
  {
    id: "security",
    title: "Security",
    path: "both",
    kind: "security",
    summary: "Entra / Dataverse RBAC vs a public, unauthenticated roadmap.",
    detail:
      "Dataverse needs Entra plus table privileges and security trimming at retrieve time. The M365 Roadmap API is anonymous public data — no trimming. MCP Dataverse tools would inherit the caller’s tenant token; M365 tools in this repo do not.",
  },
  {
    id: "power-bi",
    title: "Power BI",
    path: "both",
    kind: "future",
    dashed: true,
    summary: "Future semantic model and reports — not built in this slice.",
    detail:
      "Dashed future consumer. A later Microsoft-only slice would add an impact report (Update vs Deprecation vs Monitor counts) and optional embed in Dynamics 365. This explorer only shows the node and detail copy.",
  },
  {
    id: "d365-dashboard",
    title: "D365 dashboard",
    path: "both",
    kind: "future",
    dashed: true,
    summary: "Future model-driven dashboard inside Dynamics 365.",
    detail:
      "Dashed future consumer. Target is a personal or system dashboard in the Dynamics 365 app for makers and agents — cases, knowledge gaps, grounded-answer volume, impact counts — not a standalone web chart. Not built here.",
  },
];

export function getPipeline(): PipelineStage[] {
  return PIPELINE_STAGES;
}

export function getPipelineStage(id: string): PipelineStage | undefined {
  return PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function stagesForPath(path: PipelinePath): PipelineStage[] {
  return PIPELINE_STAGES.filter(
    (stage) => stage.path === "both" || stage.path === path,
  );
}

export type CanvasNode = {
  id: string;
  col: number;
  row: number;
};

export const INDEXING_LAYOUT: CanvasNode[] = [
  { id: "dataverse", col: 1, row: 1 },
  { id: "extract-chunk", col: 2, row: 1 },
  { id: "summarize", col: 3, row: 1 },
  { id: "embeddings", col: 4, row: 1 },
  { id: "azure-search", col: 5, row: 1 },
  { id: "m365", col: 1, row: 2 },
  { id: "mcp", col: 3, row: 2 },
  { id: "power-bi", col: 5, row: 2 },
  { id: "inventory", col: 1, row: 3 },
  { id: "impact-rater", col: 2, row: 3 },
  { id: "security", col: 3, row: 3 },
  { id: "d365-dashboard", col: 5, row: 3 },
];

export const QUERY_LAYOUT: CanvasNode[] = [
  { id: "router", col: 1, row: 1 },
  { id: "orchestrator", col: 2, row: 1 },
  { id: "retrieve", col: 3, row: 1 },
  { id: "rerank", col: 4, row: 1 },
  { id: "generate", col: 5, row: 1 },
  { id: "mcp", col: 1, row: 2 },
  { id: "m365", col: 3, row: 2 },
  { id: "impact-rater", col: 4, row: 2 },
  { id: "power-bi", col: 5, row: 2 },
  { id: "security", col: 1, row: 3 },
  { id: "inventory", col: 2, row: 3 },
  { id: "dataverse", col: 3, row: 3 },
  { id: "embeddings", col: 4, row: 3 },
  { id: "d365-dashboard", col: 5, row: 3 },
];

export const INDEXING_EDGES: [string, string][] = [
  ["dataverse", "extract-chunk"],
  ["extract-chunk", "summarize"],
  ["summarize", "embeddings"],
  ["embeddings", "azure-search"],
  ["m365", "summarize"],
  ["m365", "mcp"],
  ["inventory", "impact-rater"],
  ["mcp", "impact-rater"],
  ["azure-search", "power-bi"],
  ["dataverse", "d365-dashboard"],
];

export const QUERY_EDGES: [string, string][] = [
  ["router", "orchestrator"],
  ["orchestrator", "retrieve"],
  ["retrieve", "rerank"],
  ["rerank", "generate"],
  ["mcp", "orchestrator"],
  ["m365", "retrieve"],
  ["dataverse", "retrieve"],
  ["inventory", "impact-rater"],
  ["impact-rater", "rerank"],
  ["generate", "power-bi"],
  ["inventory", "d365-dashboard"],
];
