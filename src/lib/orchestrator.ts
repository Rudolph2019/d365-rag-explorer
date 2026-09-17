import { explainStage, routeQuestion, routeQuestionHeuristic } from "@/lib/jobs";
import { fetchM365Roadmap, inferRoadmapQuery } from "@/lib/m365";
import { getOllamaHealth, ollamaGenerate, parseJsonFromModel } from "@/lib/ollama";
import { getPipeline, getPipelineStage } from "@/lib/pipeline";
import { stripHtml, truncate } from "@/lib/text";
import {
  applyLessons,
  lessonSummary,
  listLessons,
  rememberFailure,
  type ToolLesson,
} from "@/lib/tool-memory";
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
  lessons: ToolLesson[];
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
get_m365_roadmap filter MUST be OData, never a bare field name.
Valid examples: status eq 'Rolling out' | contains(title,'Copilot') | omit filter.
Valid orderby: modified desc | created desc.
After a successful get_m365_roadmap, do not call it again. Reply {"final":"markdown citing #item ids"}.
If a tool returns 400, do not call route_question. Retry get_m365_roadmap with no filter and orderby modified desc.
Never use orderby rollout. Never use filter rollout or status=...
Reply with JSON only: {"tool":"name","args":{...}} or {"final":"markdown answer with citations to roadmap ids when used"}.`;

const FINAL_SYSTEM =
  'You write the final user-facing answer from the retrieved roadmap items. JSON only: {"final":"markdown citing #ids"}. Do not call tools.';

async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{
  ok: boolean;
  preview: string;
  payload: unknown;
  argsUsed: Record<string, unknown>;
}> {
  const learned = name === "get_m365_roadmap" ? applyLessons(name, args) : { args, notes: [] };
  const nextArgs = learned.args;

  switch (name) {
    case "route_question": {
      const result = await routeQuestion(String(args.question ?? ""));
      return {
        ok: true,
        preview: `${result.target} — ${result.reason}`,
        payload: result,
        argsUsed: args,
      };
    }
    case "get_m365_roadmap": {
      const result = await toolGetM365Roadmap({
        filter: nextArgs.filter ? String(nextArgs.filter) : undefined,
        top: nextArgs.top ? Number(nextArgs.top) : 8,
        orderby: nextArgs.orderby ? String(nextArgs.orderby) : "modified desc",
      });
      const data = result.data as { items?: { id: number; title: string; status: string }[] } | null;
      const titles = data?.items?.slice(0, 4).map((item) => `#${item.id} ${item.title}`) ?? [];
      const rewrite = learned.notes.length
        ? `rewrote ${learned.notes.join("; ")} · `
        : "";
      return {
        ok: result.ok,
        preview: result.ok
          ? `${rewrite}${titles.join(" · ") || "0 items"}`
          : `${rewrite}${result.error ?? "failed"}`,
        payload: result,
        argsUsed: nextArgs,
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
        argsUsed: args,
      };
    }
    case "get_pipeline": {
      const result = await toolGetPipeline();
      const stages = result.data as { id: string }[];
      return { ok: true, preview: `${stages.length} stages`, payload: result, argsUsed: args };
    }
    case "get_pipeline_stage": {
      const result = await toolGetPipelineStage(String(args.id ?? ""));
      const stage = result.data as { title?: string } | null;
      return {
        ok: result.ok,
        preview: result.ok ? stage?.title ?? String(args.id) : result.error ?? "failed",
        payload: result,
        argsUsed: args,
      };
    }
    case "explain_stage": {
      const result = await explainStage(String(args.id ?? ""), String(args.question ?? ""));
      return { ok: true, preview: truncate(result.text, 160), payload: result, argsUsed: args };
    }
    case "compare_sources": {
      const result = await toolCompareSources();
      return { ok: true, preview: "Dataverse vs M365 contrast rows", payload: result, argsUsed: args };
    }
    default:
      return { ok: false, preview: `Unknown tool ${name}`, payload: null, argsUsed: args };
  }
}

function summarizeForPrompt(payload: unknown): string {
  return truncate(JSON.stringify(payload), 1200);
}

function formatRoadmapItems(payload: unknown): string | null {
  const result = payload as {
    data?: { items?: { id: number; title: string; status?: string; products?: string[]; description?: string }[] };
    items?: { id: number; title: string; status?: string; products?: string[]; description?: string }[];
  };
  const items = result?.data?.items ?? result?.items;
  if (!items?.length) return null;
  return items
    .slice(0, 8)
    .map(
      (item) =>
        `- **#${item.id}** ${item.title} (${item.status ?? "n/a"}; ${(item.products ?? []).join(", ")}) — ${truncate(stripHtml(item.description ?? ""), 140)}`,
    )
    .join("\n");
}

function answerWith(
  answer: string,
  traces: ToolTrace[],
  method: "ollama" | "fallback",
  ollamaOnline: boolean,
): OrchestratorAnswer {
  return { answer, traces, method, ollamaOnline, lessons: listLessons() };
}

function pushTrace(
  traces: ToolTrace[],
  tool: string,
  args: Record<string, unknown>,
  ok: boolean,
  result: string,
) {
  traces.push({
    step: traces.length + 1,
    tool,
    args,
    ok,
    result,
  });
}

async function retrieveRoadmap(
  question: string,
  traces: ToolTrace[],
  requested?: Record<string, unknown>,
): Promise<{ ok: boolean; payload: unknown }> {
  const inferred = inferRoadmapQuery(question);
  const args = {
    top: inferred.top ?? 10,
    orderby: inferred.orderby ?? "modified desc",
    ...(inferred.filter ? { filter: inferred.filter } : {}),
    ...requested,
  };
  const executed = await runTool("get_m365_roadmap", args);
  pushTrace(traces, "get_m365_roadmap", executed.argsUsed, executed.ok, executed.preview);
  if (executed.ok) return { ok: true, payload: executed.payload };

  rememberFailure("get_m365_roadmap", args, JSON.stringify({ top: 10, orderby: "modified desc" }));
  const safeArgs = { top: 10, orderby: "modified desc" };
  const repaired = await runTool("get_m365_roadmap", safeArgs);
  pushTrace(traces, "get_m365_roadmap", { ...repaired.argsUsed, repaired: true }, repaired.ok, repaired.preview);
  return { ok: repaired.ok, payload: repaired.payload };
}

async function finalizeRoadmap(
  question: string,
  traces: ToolTrace[],
  payload: unknown,
): Promise<OrchestratorAnswer> {
  const listed = formatRoadmapItems(payload);
  const fallback = listed
    ? `Here is what is currently on the live Microsoft 365 Roadmap:\n\n${listed}`
    : "The roadmap retrieve succeeded, but there were no items to list.";
  try {
    const raw = await ollamaGenerate(
      `Question: ${question}\nRoadmap items:\n${listed ?? summarizeForPrompt(payload)}\nWrite the final answer.`,
      { system: FINAL_SYSTEM },
    );
    const parsed = parseJsonFromModel<{ final?: string }>(raw);
    if (parsed?.final) {
      return answerWith(parsed.final, traces, "ollama", true);
    }
    if (raw.trim() && !/"tool"\s*:/.test(raw)) {
      return answerWith(raw, traces, "ollama", true);
    }
  } catch {
    // Keep the retrieved list if the model drops mid-answer.
  }
  return answerWith(fallback, traces, "ollama", true);
}

export async function runOrchestrator(question: string): Promise<OrchestratorAnswer> {
  const health = await getOllamaHealth();
  if (!health.online) {
    return runFallback(question);
  }

  const traces: ToolTrace[] = [];
  const history: string[] = [];
  let lastRoadmapPayload: unknown = null;
  let routed = false;
  let routeTarget: string | null = null;

  for (let step = 1; step <= MAX_STEPS; step += 1) {
    if (routed && routeTarget === "m365_roadmap" && !lastRoadmapPayload) {
      const retrieved = await retrieveRoadmap(question, traces);
      if (retrieved.ok) {
        return finalizeRoadmap(question, traces, retrieved.payload);
      }
    }

    let raw: string;
    try {
      raw = await ollamaGenerate(
        `Question: ${question}\nLessons from past failures:\n${lessonSummary()}\nPrior tool results:\n${history.join("\n") || "(none)"}\nDecide the next tool or the final answer.`,
        { system: TOOL_CATALOG },
      );
    } catch {
      return traces.length
        ? answerWith(
            "Ollama stopped mid-loop. Use the tool trace and try again when the model is responding.",
            traces,
            "ollama",
            true,
          )
        : runFallback(question);
    }

    const parsed = parseJsonFromModel<{
      tool?: string;
      args?: Record<string, unknown>;
      final?: string;
    }>(raw);

    if (parsed?.final) {
      return answerWith(parsed.final, traces, "ollama", true);
    }

    if (!parsed?.tool) {
      return answerWith(
        raw || "The orchestrator did not return a tool call or a final answer.",
        traces,
        "ollama",
        true,
      );
    }

    if (parsed.tool === "get_m365_roadmap" && lastRoadmapPayload) {
      return finalizeRoadmap(question, traces, lastRoadmapPayload);
    }

    if (parsed.tool === "route_question" && routed) {
      if (routeTarget === "m365_roadmap") {
        const retrieved = await retrieveRoadmap(question, traces);
        if (retrieved.ok) {
          return finalizeRoadmap(question, traces, retrieved.payload);
        }
      }
      parsed.tool = "get_m365_roadmap";
      parsed.args = inferRoadmapQuery(question) as Record<string, unknown>;
    }

    const args = parsed.args ?? {};
    const executed = await runTool(parsed.tool, args);
    pushTrace(traces, parsed.tool, executed.argsUsed, executed.ok, executed.preview);

    if (parsed.tool === "route_question" && executed.ok) {
      routed = true;
      const payload = executed.payload as { target?: string };
      routeTarget = payload.target ?? null;
      if (routeTarget === "m365_roadmap") {
        const retrieved = await retrieveRoadmap(question, traces);
        if (retrieved.ok) {
          return finalizeRoadmap(question, traces, retrieved.payload);
        }
      }
    }

    if (parsed.tool === "get_m365_roadmap" && !executed.ok) {
      rememberFailure(
        "get_m365_roadmap",
        args,
        JSON.stringify({ top: 10, orderby: "modified desc" }),
      );
      const repaired = await runTool("get_m365_roadmap", {
        top: 10,
        orderby: "modified desc",
      });
      pushTrace(
        traces,
        "get_m365_roadmap",
        { ...repaired.argsUsed, repaired: true },
        repaired.ok,
        repaired.preview,
      );
      if (repaired.ok) {
        return finalizeRoadmap(question, traces, repaired.payload);
      }
    }

    if (parsed.tool === "get_m365_roadmap" && executed.ok) {
      lastRoadmapPayload = executed.payload;
      return finalizeRoadmap(question, traces, executed.payload);
    }

    history.push(
      `${parsed.tool}(${JSON.stringify(executed.argsUsed)}) => ${summarizeForPrompt(executed.payload)}`,
    );
  }

  const listed = formatRoadmapItems(lastRoadmapPayload);
  return answerWith(
    listed ?? "Reached the 5-step cap. The tool-call trace has the evidence collected so far.",
    traces,
    "ollama",
    true,
  );
}

async function runFallback(question: string): Promise<OrchestratorAnswer> {
  const traces: ToolTrace[] = [];
  const route = routeQuestionHeuristic(question);
  pushTrace(
    traces,
    "route_question",
    { question },
    true,
    `${route.target} — ${route.reason} (heuristic; Ollama offline)`,
  );

  if (route.target === "architecture") {
    const stages = getPipeline();
    const hit =
      stages.find((stage) =>
        question.toLowerCase().includes(stage.id.replace("-", " ")),
      ) ?? getPipelineStage("mcp") ?? stages[0];
    const explained = await explainStage(hit.id, question);
    pushTrace(traces, "explain_stage", { id: hit.id }, true, truncate(explained.text, 160));
    return answerWith(explained.text, traces, "fallback", false);
  }

  if (route.target === "dataverse") {
    pushTrace(
      traces,
      "get_pipeline_stage",
      { id: "dataverse" },
      true,
      "Dataverse is architecture-only in this slice.",
    );
    return answerWith(
      "This explorer has no Dataverse tenant. I can explain the private CRM path (change tracking, Entra + table privileges, Azure AI Search, row citations) but I cannot read cases, accounts, or custom tables. Ask about the pipeline, or switch the question to the public M365 Roadmap.",
      traces,
      "fallback",
      false,
    );
  }

  try {
    const query = inferRoadmapQuery(question);
    const result = await fetchM365Roadmap({
      ...query,
      count: true,
    });
    pushTrace(
      traces,
      "get_m365_roadmap",
      { ...query },
      true,
      result.items
        .slice(0, 4)
        .map((item) => `#${item.id} ${item.title}`)
        .join(" · "),
    );
    const lines = result.items
      .slice(0, 6)
      .map(
        (item) =>
          `- **#${item.id}** ${item.title} (${item.status}; ${(item.products ?? []).join(", ")}) — ${truncate(stripHtml(item.description), 140)}`,
      );
    return answerWith(
      `Ollama is offline, so this is a single-shot retrieve from the live M365 Roadmap API — start Ollama on \`127.0.0.1:11434\` for a generated answer.\n\n${lines.join("\n")}`,
      traces,
      "fallback",
      false,
    );
  } catch (error) {
    pushTrace(
      traces,
      "get_m365_roadmap",
      {},
      false,
      error instanceof Error ? error.message : "Roadmap fetch failed",
    );
    return answerWith(
      "Ollama is offline and the M365 Roadmap proxy failed. Retry Compare/Impact, or start Ollama for the full orchestrator loop.",
      traces,
      "fallback",
      false,
    );
  }
}
