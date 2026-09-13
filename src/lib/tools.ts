import { COMPARE_ROWS } from "@/lib/compare";
import {
  applyTicketGates,
  rateCandidateHeuristic,
  toLearnCandidate,
  toRoadmapCandidate,
  type TicketAnalysis,
} from "@/lib/impact";
import { SAMPLE_INVENTORY, parseUniqueNames, type SolutionInventory } from "@/lib/inventory";
import { rateTicketsWithOllama } from "@/lib/jobs";
import { fetchLearnWave, type ReleaseWave } from "@/lib/learn";
import {
  DYNAMICS_RELEVANT_FILTER,
  fetchM365Roadmap,
  type M365Query,
} from "@/lib/m365";
import { getOllamaHealth, ollamaGenerate } from "@/lib/ollama";
import { getPipeline, getPipelineStage } from "@/lib/pipeline";

export type ToolResult = {
  ok: boolean;
  tool: string;
  data: unknown;
  error?: string;
};

function ok(tool: string, data: unknown): ToolResult {
  return { ok: true, tool, data };
}

function fail(tool: string, error: string): ToolResult {
  return { ok: false, tool, data: null, error };
}

export async function toolGetPipeline() {
  return ok(
    "get_pipeline",
    getPipeline().map((stage) => ({
      id: stage.id,
      title: stage.title,
      path: stage.path,
      kind: stage.kind,
      dashed: Boolean(stage.dashed),
      summary: stage.summary,
    })),
  );
}

export async function toolGetPipelineStage(id: string) {
  const stage = getPipelineStage(id);
  if (!stage) return fail("get_pipeline_stage", `Unknown stage: ${id}`);
  return ok("get_pipeline_stage", stage);
}

export async function toolGetM365Roadmap(query: M365Query = {}) {
  try {
    const result = await fetchM365Roadmap({
      top: query.top ?? 12,
      orderby: query.orderby ?? "modified desc",
      filter: query.filter,
      skip: query.skip,
      count: query.count ?? true,
    });
    return ok("get_m365_roadmap", result);
  } catch (error) {
    return fail(
      "get_m365_roadmap",
      error instanceof Error ? error.message : "Roadmap fetch failed",
    );
  }
}

export async function toolCompareSources() {
  return ok("compare_sources", {
    rows: COMPARE_ROWS,
    liveApi: "https://www.microsoft.com/releasecommunications/api/v2/m365",
  });
}

export async function toolRateRoadmapImpact(input?: {
  uniqueNames?: string[];
  uniqueNameText?: string;
  includeRoadmap?: boolean;
  includeLearn?: boolean;
  wave?: ReleaseWave;
  top?: number;
}): Promise<ToolResult> {
  const uniqueNames =
    input?.uniqueNames?.length
      ? input.uniqueNames
      : input?.uniqueNameText
        ? parseUniqueNames(input.uniqueNameText)
        : SAMPLE_INVENTORY.solutions;
  const inventory: SolutionInventory = {
    ...SAMPLE_INVENTORY,
    solutions: uniqueNames.length ? uniqueNames : SAMPLE_INVENTORY.solutions,
  };
  const includeRoadmap = input?.includeRoadmap !== false;
  const includeLearn = Boolean(input?.includeLearn);
  const tickets: TicketAnalysis[] = [];
  const errors: string[] = [];

  if (includeRoadmap) {
    try {
      const relevant = await fetchM365Roadmap({
        filter: DYNAMICS_RELEVANT_FILTER,
        top: input?.top ?? 40,
        orderby: "modified desc",
        count: true,
      });
      const recent =
        relevant.items.length > 0
          ? relevant
          : await fetchM365Roadmap({
              top: input?.top ?? 40,
              orderby: "modified desc",
              count: true,
            });
      for (const item of recent.items) {
        const rated = rateCandidateHeuristic(toRoadmapCandidate(item), inventory);
        if (rated) tickets.push(rated);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Roadmap fetch failed");
    }
  }

  if (includeLearn) {
    try {
      const wave = await fetchLearnWave(input?.wave ?? "2026wave1");
      errors.push(...wave.errors);
      for (const feature of wave.features) {
        const rated = rateCandidateHeuristic(toLearnCandidate(feature), inventory);
        if (rated) tickets.push(applyTicketGates(rated));
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Learn fetch failed");
    }
  }

  const rated = await rateTicketsWithOllama(tickets);
  return ok("rate_roadmap_impact", {
    inventory,
    tickets: rated,
    errors,
    count: rated.length,
  });
}

export async function toolAskOllama(prompt: string, context?: string) {
  const health = await getOllamaHealth();
  if (!health.online) {
    return fail(
      "ask_ollama",
      health.error ?? "Ollama is not running at http://127.0.0.1:11434",
    );
  }
  try {
    const text = await ollamaGenerate(
      context ? `${prompt}\n\nContext:\n${context}` : prompt,
    );
    return ok("ask_ollama", { text, model: health.model });
  } catch (error) {
    return fail(
      "ask_ollama",
      error instanceof Error ? error.message : "Ollama generate failed",
    );
  }
}

export const TOOL_DEFINITIONS = [
  {
    name: "get_pipeline",
    description: "List Dataverse RAG pipeline stages for the diagram.",
  },
  {
    name: "get_pipeline_stage",
    description: "Get one pipeline stage record by id.",
  },
  {
    name: "get_m365_roadmap",
    description:
      "Proxy OData to https://www.microsoft.com/releasecommunications/api/v2/m365",
  },
  {
    name: "compare_sources",
    description: "Structured Dataverse vs M365 Roadmap contrast.",
  },
  {
    name: "rate_roadmap_impact",
    description:
      "Match live roadmap/Learn items to the solution inventory and return TicketAnalysis[].",
  },
  {
    name: "ask_ollama",
    description: "Send a prompt to local Ollama. Errors if Ollama is down.",
  },
  {
    name: "route_question",
    description: "Classify a question as dataverse, m365_roadmap, or architecture.",
  },
  {
    name: "explain_stage",
    description: "Explain a pipeline stage (Ollama or static copy).",
  },
] as const;
