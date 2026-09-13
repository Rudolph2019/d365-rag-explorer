import { applyTicketGates, type TicketAnalysis } from "@/lib/impact";
import {
  getOllamaHealth,
  ollamaGenerate,
  parseJsonFromModel,
} from "@/lib/ollama";
import { getPipelineStage, type PipelineStage } from "@/lib/pipeline";
import { keywordScore, stripHtml, tokenize, truncate } from "@/lib/text";

export type RouteTarget = "dataverse" | "m365_roadmap" | "architecture";

export type RouteResult = {
  target: RouteTarget;
  reason: string;
  method: "ollama" | "heuristic";
};

const ROUTE_SYSTEM =
  'Classify the user question. Reply with JSON only: {"target":"dataverse"|"m365_roadmap"|"architecture","reason":"..."}. dataverse = CRM records/tables/cases/accounts (we have no tenant). m365_roadmap = public Microsoft 365 / Dynamics roadmap features. architecture = pipeline, MCP, ingest, retrieve, Ollama.';

export function routeQuestionHeuristic(question: string): RouteResult {
  const q = question.toLowerCase();
  if (
    /\b(how does|pipeline|ingest|chunk|embed|mcp|orchestrat|index|retriev|rerank)\b/.test(
      q,
    )
  ) {
    return {
      target: "architecture",
      reason: "Question talks about the pipeline or MCP.",
      method: "heuristic",
    };
  }
  if (
    /\b(roadmap|copilot|teams|outlook|sharepoint|purview|feature|rolling out|launched|m365|microsoft 365)\b/.test(
      q,
    )
  ) {
    return {
      target: "m365_roadmap",
      reason: "Question mentions roadmap or M365 products.",
      method: "heuristic",
    };
  }
  if (/\b(dataverse|case|account|contact|table|entity|privilege|tenant)\b/.test(q)) {
    return {
      target: "dataverse",
      reason: "Question mentions Dataverse or CRM entities.",
      method: "heuristic",
    };
  }
  if (/\b(impact|deprecat|solution|field service|customer service)\b/.test(q)) {
    return {
      target: "m365_roadmap",
      reason: "Question asks about impact or first-party Dynamics areas.",
      method: "heuristic",
    };
  }
  return {
    target: "architecture",
    reason: "No strong product cue — default to architecture.",
    method: "heuristic",
  };
}

export async function routeQuestion(question: string): Promise<RouteResult> {
  const health = await getOllamaHealth();
  if (!health.online) return routeQuestionHeuristic(question);
  try {
    const raw = await ollamaGenerate(question, { system: ROUTE_SYSTEM });
    const parsed = parseJsonFromModel<{ target?: string; reason?: string }>(raw);
    const target = parsed?.target;
    if (
      target === "dataverse" ||
      target === "m365_roadmap" ||
      target === "architecture"
    ) {
      return {
        target,
        reason: parsed?.reason ?? "Ollama classified the question.",
        method: "ollama",
      };
    }
  } catch {
    // fall through
  }
  return routeQuestionHeuristic(question);
}

export function summarizeFallback(html: string): string {
  return truncate(stripHtml(html), 280);
}

export async function summarizeIngest(html: string): Promise<{
  summary: string;
  method: "ollama" | "heuristic";
}> {
  const fallback = summarizeFallback(html);
  const health = await getOllamaHealth();
  if (!health.online) return { summary: fallback, method: "heuristic" };
  try {
    const summary = await ollamaGenerate(
      `Rewrite this Microsoft 365 roadmap description as a plain 1-2 sentence summary. No HTML.\n\n${fallback}`,
    );
    return { summary: summary || fallback, method: "ollama" };
  } catch {
    return { summary: fallback, method: "heuristic" };
  }
}

export type RankedItem<T> = T & { score: number };

export function rerankFallback<T extends { title: string; description?: string }>(
  items: T[],
  question: string,
): RankedItem<T>[] {
  return [...items]
    .map((item) => ({
      ...item,
      score: keywordScore(`${item.title} ${item.description ?? ""}`, question),
    }))
    .sort((a, b) => b.score - a.score);
}

export async function rerankItems<
  T extends { title: string; description?: string; id?: number | string },
>(
  items: T[],
  question: string,
): Promise<{ items: RankedItem<T>[]; method: "ollama" | "heuristic" }> {
  const fallback = rerankFallback(items, question);
  const health = await getOllamaHealth();
  if (!health.online || items.length === 0) {
    return { items: fallback, method: "heuristic" };
  }
  try {
    const raw = await ollamaGenerate(
      `Score each item 0-1 for relevance to the question. Return JSON {"scores":[{"id":"...","score":0.0}]}.\nQuestion: ${question}\nItems:\n${items
        .map(
          (item, index) =>
            `${item.id ?? index}: ${item.title} — ${truncate(stripHtml(item.description ?? ""), 160)}`,
        )
        .join("\n")}`,
    );
    const parsed = parseJsonFromModel<{
      scores?: { id?: string | number; score?: number }[];
    }>(raw);
    if (!parsed?.scores?.length) return { items: fallback, method: "heuristic" };
    const map = new Map(
      parsed.scores.map((row) => [String(row.id), Number(row.score) || 0]),
    );
    const ranked = [...items]
      .map((item, index) => ({
        ...item,
        score: map.get(String(item.id ?? index)) ?? 0,
      }))
      .sort((a, b) => b.score - a.score);
    return { items: ranked, method: "ollama" };
  } catch {
    return { items: fallback, method: "heuristic" };
  }
}

export async function explainStage(
  stageId: string,
  question?: string,
): Promise<{ text: string; method: "ollama" | "heuristic"; stage?: PipelineStage }> {
  const stage = getPipelineStage(stageId);
  if (!stage) {
    return { text: `Unknown stage: ${stageId}`, method: "heuristic" };
  }
  const fallback = question
    ? `${stage.title}: ${stage.detail}\n\n(Ollama is offline — static stage copy.)`
    : stage.detail;
  const health = await getOllamaHealth();
  if (!health.online) return { text: fallback, method: "heuristic", stage };
  try {
    const text = await ollamaGenerate(
      question || "Explain this pipeline stage for a Dynamics maker.",
      { system: `You explain one Dataverse RAG stage.\nTitle: ${stage.title}\n${stage.detail}` },
    );
    return { text: text || fallback, method: "ollama", stage };
  } catch {
    return { text: fallback, method: "heuristic", stage };
  }
}

export async function rateTicketsWithOllama(
  tickets: TicketAnalysis[],
): Promise<TicketAnalysis[]> {
  if (tickets.length === 0) return tickets;
  const health = await getOllamaHealth();
  if (!health.online) return tickets;
  try {
    const raw = await ollamaGenerate(
      `For each item return severity (Critical|High|Medium|Low), change_type (Feature|Deprecated), reasoning, is_deferable, should_create_ticket. JSON {"items":[...]}.\n${JSON.stringify(
        tickets.map((ticket) => ({
          title: ticket.title,
          description: truncate(ticket.description, 240),
          area: ticket.area,
          change_type: ticket.change_type,
          effective_date: ticket.effective_date,
        })),
      )}`,
    );
    const parsed = parseJsonFromModel<{
      items?: Partial<TicketAnalysis>[];
    }>(raw);
    if (!parsed?.items?.length) return tickets;
    return tickets.map((ticket, index) => {
      const update = parsed.items?.[index];
      if (!update) return ticket;
      return applyTicketGates({
        ...ticket,
        severity: (update.severity as TicketAnalysis["severity"]) ?? ticket.severity,
        change_type:
          (update.change_type as TicketAnalysis["change_type"]) ?? ticket.change_type,
        reasoning: update.reasoning ?? ticket.reasoning,
        is_deferable: update.is_deferable ?? ticket.is_deferable,
        should_create_ticket:
          update.should_create_ticket ?? ticket.should_create_ticket,
        ratedBy: "ollama",
      });
    });
  } catch {
    return tickets;
  }
}

export function keywordRetrieve<T extends { title: string; description?: string }>(
  items: T[],
  question: string,
  limit = 8,
): RankedItem<T>[] {
  const tokens = tokenize(question);
  if (tokens.length === 0) {
    return items.slice(0, limit).map((item) => ({ ...item, score: 0 }));
  }
  return rerankFallback(items, question).slice(0, limit);
}
