import { explainStage, routeQuestion, routeQuestionHeuristic } from "@/lib/jobs";
import { fetchM365Roadmap } from "@/lib/m365";
import { getOllamaHealth, ollamaGenerate, parseJsonFromModel } from "@/lib/ollama";
import { getPipeline, getPipelineStage } from "@/lib/pipeline";
import { stripHtml, truncate } from "@/lib/text";
import {
  toolCompareSources,
  toolGetM365Roadmap,
  toolGetPipeline,
  toolGetPipelineStage,
  toolRateRoadmapImpact,
} from "@/lib/tools";

export type ToolTrace = {
  step: number;
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  result: string;
};

export type OrchestratorAnswer = {
  answer: string;
  traces: ToolTrace[];
  method: "ollama" | "fallback";
  ollamaOnline: boolean;
};

const MAX_STEPS = 5;

const TOOL_CATALOG = `Tools (call one per step):
- route_question {question}
- get_m365_roadmap {filter?, top?, orderby?}
- rate_roadmap_impact {includeLearn?, wave?}
- get_pipeline {}
- get_pipeline_stage {id}
- explain_stage {id}
- compare_sources {}
Reply with JSON only: {"tool":"name","args":{...}} or {"final":"markdown answer with citations to roadmap ids when used"}.`;

async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; preview: string; payload: unknown }> {
  switch (name) {
    case "route_question": {
      const result = await routeQuestion(String(args.question ?? ""));
      return { ok: true, preview: `${result.target} — ${result.reason}`, payload: result };
    }
    case "get_m365_roadmap": {
      const result = await toolGetM365Roadmap({
        filter: args.filter ? String(args.filter) : undefined,
        top: args.top ? Number(args.top) : 8,
        orderby: args.orderby ? String(args.orderby) : "modified desc",
      });
      const data = result.data as { items?: { id: number; title: string; status: string }[] } | null;
      const titles = data?.items?.slice(0, 4).map((item) => `#${item.id} ${item.title}`) ?? [];
      return {
        ok: result.ok,
        preview: result.ok ? titles.join(" · ") || "0 items" : result.error ?? "failed",
        payload: result,
      };
    }
    case "rate_roadmap_impact": {
      const result = await toolRateRoadmapImpact({
        includeLearn: Boolean(args.includeLearn),
        wave: args.wave as "2025wave1" | "2025wave2" | "2026wave1" | undefined,
      });
      const data = result.data as { count?: number } | null;
      return {
        ok: result.ok,
        preview: result.ok ? `${data?.count ?? 0} TicketAnalysis rows` : result.error ?? "failed",
        payload: result,
      };
    }
    case "get_pipeline": {
      const result = await toolGetPipeline();
      const stages = result.data as { id: string }[];
      return { ok: true, preview: `${stages.length} stages`, payload: result };
    }
    case "get_pipeline_stage": {
      const result = await toolGetPipelineStage(String(args.id ?? ""));
      const stage = result.data as { title?: string } | null;
      return {
        ok: result.ok,
        preview: result.ok ? stage?.title ?? String(args.id) : result.error ?? "failed",
        payload: result,
      };
    }
    case "explain_stage": {
      const result = await explainStage(String(args.id ?? ""), String(args.question ?? ""));
      return { ok: true, preview: truncate(result.text, 160), payload: result };
    }
    case "compare_sources": {
      const result = await toolCompareSources();
      return { ok: true, preview: "Dataverse vs M365 contrast rows", payload: result };
    }
    default:
      return { ok: false, preview: `Unknown tool ${name}`, payload: null };
  }
}

function summarizeForPrompt(payload: unknown): string {
  return truncate(JSON.stringify(payload), 1200);
}

export async function runOrchestrator(question: string): Promise<OrchestratorAnswer> {
  const health = await getOllamaHealth();
  if (!health.online) {
    return runFallback(question);
  }

  const traces: ToolTrace[] = [];
  const history: string[] = [];

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    let raw: string;
    try {
      raw = await ollamaGenerate(
        `Question: ${question}\nPrior tool results:\n${history.join("\n") || "(none)"}\nDecide the next tool or the final answer.`,
        { system: TOOL_CATALOG },
      );
    } catch {
      return traces.length
        ? {
            answer: "Ollama stopped mid-loop. Use the tool trace and try again when the model is responding.",
            traces,
            method: "ollama",
            ollamaOnline: true,
          }
        : runFallback(question);
    }

    const parsed = parseJsonFromModel<{
      tool?: string;
      args?: Record<string, unknown>;
      final?: string;
    }>(raw);

    if (parsed?.final) {
      return {
        answer: parsed.final,
        traces,
        method: "ollama",
        ollamaOnline: true,
      };
    }

    if (!parsed?.tool) {
      return {
        answer: raw || "The orchestrator did not return a tool call or a final answer.",
        traces,
        method: "ollama",
        ollamaOnline: true,
      };
    }

    const args = parsed.args ?? {};
    const executed = await runTool(parsed.tool, args);
    traces.push({
      step,
      tool: parsed.tool,
      args,
      ok: executed.ok,
      result: executed.preview,
    });
    history.push(
      `${parsed.tool}(${JSON.stringify(args)}) => ${summarizeForPrompt(executed.payload)}`,
    );
  }

  return {
    answer:
      "Reached the 5-step cap. The tool-call trace has the evidence collected so far.",
    traces,
    method: "ollama",
    ollamaOnline: true,
  };
}

async function runFallback(question: string): Promise<OrchestratorAnswer> {
  const traces: ToolTrace[] = [];
  const route = routeQuestionHeuristic(question);
  traces.push({
    step: 1,
    tool: "route_question",
    args: { question },
    ok: true,
    result: `${route.target} — ${route.reason} (heuristic; Ollama offline)`,
  });

  if (route.target === "architecture") {
    const stages = getPipeline();
    const hit =
      stages.find((stage) =>
        question.toLowerCase().includes(stage.id.replace("-", " ")),
      ) ?? getPipelineStage("mcp") ?? stages[0];
    const explained = await explainStage(hit.id, question);
    traces.push({
      step: 2,
      tool: "explain_stage",
      args: { id: hit.id },
      ok: true,
      result: truncate(explained.text, 160),
    });
    return {
      answer: explained.text,
      traces,
      method: "fallback",
      ollamaOnline: false,
    };
  }

  if (route.target === "dataverse") {
    traces.push({
      step: 2,
      tool: "get_pipeline_stage",
      args: { id: "dataverse" },
      ok: true,
      result: "Dataverse is architecture-only in this slice.",
    });
    return {
      answer:
        "This explorer has no Dataverse tenant. I can explain the private CRM path (change tracking, Entra + table privileges, Azure AI Search, row citations) but I cannot read cases, accounts, or custom tables. Ask about the pipeline, or switch the question to the public M365 Roadmap.",
      traces,
      method: "fallback",
      ollamaOnline: false,
    };
  }

  try {
    const result = await fetchM365Roadmap({
      top: 8,
      orderby: "modified desc",
      count: true,
    });
    traces.push({
      step: 2,
      tool: "get_m365_roadmap",
      args: { top: 8, orderby: "modified desc" },
      ok: true,
      result: result.items
        .slice(0, 4)
        .map((item) => `#${item.id} ${item.title}`)
        .join(" · "),
    });
    const lines = result.items
      .slice(0, 6)
      .map(
        (item) =>
          `- **#${item.id}** ${item.title} (${item.status}; ${(item.products ?? []).join(", ")}) — ${truncate(stripHtml(item.description), 140)}`,
      );
    return {
      answer: `Ollama is offline, so this is a single-shot retrieve from the live M365 Roadmap API — start Ollama on \`127.0.0.1:11434\` for a generated answer.\n\n${lines.join("\n")}`,
      traces,
      method: "fallback",
      ollamaOnline: false,
    };
  } catch (error) {
    traces.push({
      step: 2,
      tool: "get_m365_roadmap",
      args: {},
      ok: false,
      result: error instanceof Error ? error.message : "Roadmap fetch failed",
    });
    return {
      answer:
        "Ollama is offline and the M365 Roadmap proxy failed. Retry Compare/Impact, or start Ollama for the full orchestrator loop.",
      traces,
      method: "fallback",
      ollamaOnline: false,
    };
  }
}
