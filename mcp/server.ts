import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { explainStage, routeQuestion } from "../src/lib/jobs.ts";
import {
  toolAskOllama,
  toolCompareSources,
  toolGetM365Roadmap,
  toolGetPipeline,
  toolGetPipelineStage,
  toolRateRoadmapImpact,
} from "../src/lib/tools.ts";

const server = new McpServer({
  name: "d365-rag-explorer",
  version: "1.0.0",
});

function asText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

server.tool(
  "get_pipeline",
  "List Dataverse RAG pipeline stages for the diagram.",
  async () => asText((await toolGetPipeline()).data),
);

server.tool(
  "get_pipeline_stage",
  "Get one pipeline stage record by id.",
  { id: z.string() },
  async ({ id }) => asText(await toolGetPipelineStage(id)),
);

server.tool(
  "get_m365_roadmap",
  "Proxy OData to https://www.microsoft.com/releasecommunications/api/v2/m365",
  {
    filter: z.string().optional(),
    orderby: z.string().optional(),
    top: z.number().int().positive().max(100).optional(),
    skip: z.number().int().min(0).optional(),
  },
  async ({ filter, orderby, top, skip }) =>
    asText(await toolGetM365Roadmap({ filter, orderby, top, skip, count: true })),
);

server.tool(
  "compare_sources",
  "Structured Dataverse vs M365 Roadmap contrast (same copy as the Compare tab).",
  async () => asText((await toolCompareSources()).data),
);

server.tool(
  "rate_roadmap_impact",
  "Match live Roadmap/Learn items to the solution inventory and return TicketAnalysis[].",
  {
    uniqueNameText: z.string().optional(),
    includeLearn: z.boolean().optional(),
    wave: z.enum(["2025wave1", "2025wave2", "2026wave1"]).optional(),
    top: z.number().int().positive().max(80).optional(),
  },
  async (args) => asText(await toolRateRoadmapImpact(args)),
);

server.tool(
  "ask_ollama",
  "Send a prompt (and optional roadmap context) to localhost:11434. Errors if Ollama is down.",
  {
    prompt: z.string(),
    context: z.string().optional(),
  },
  async ({ prompt, context }) => asText(await toolAskOllama(prompt, context)),
);

server.tool(
  "route_question",
  "Classify a question as dataverse, m365_roadmap, or architecture.",
  { question: z.string() },
  async ({ question }) => asText(await routeQuestion(question)),
);

server.tool(
  "explain_stage",
  "Explain a pipeline stage. Uses Ollama when online, otherwise static copy.",
  { id: z.string(), question: z.string().optional() },
  async ({ id, question }) => asText(await explainStage(id, question)),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

void main();
