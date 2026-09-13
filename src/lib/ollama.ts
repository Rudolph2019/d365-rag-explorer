export const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:latest";
export const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export type OllamaHealth = {
  online: boolean;
  baseUrl: string;
  model: string;
  embedModel: string;
  models: string[];
  error?: string;
};

async function ollamaFetch(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(`${OLLAMA_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getOllamaHealth(): Promise<OllamaHealth> {
  try {
    const response = await ollamaFetch("/api/tags");
    if (!response.ok) {
      return {
        online: false,
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
        embedModel: OLLAMA_EMBED_MODEL,
        models: [],
        error: `Ollama returned ${response.status}`,
      };
    }
    const payload = (await response.json()) as {
      models?: { name?: string }[];
    };
    const models = (payload.models ?? [])
      .map((model) => model.name ?? "")
      .filter(Boolean);
    return {
      online: true,
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      embedModel: OLLAMA_EMBED_MODEL,
      models,
    };
  } catch (error) {
    return {
      online: false,
      baseUrl: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      embedModel: OLLAMA_EMBED_MODEL,
      models: [],
      error: error instanceof Error ? error.message : "Ollama unreachable",
    };
  }
}

export async function ollamaGenerate(
  prompt: string,
  options?: { system?: string; model?: string },
): Promise<string> {
  const response = await ollamaFetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options?.model ?? OLLAMA_MODEL,
      prompt,
      system: options?.system,
      stream: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Ollama generate failed (${response.status})`);
  }
  const payload = (await response.json()) as { response?: string };
  return payload.response?.trim() ?? "";
}

export async function ollamaEmbed(text: string): Promise<number[] | null> {
  try {
    const response = await ollamaFetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: text,
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { embedding?: number[] };
    return payload.embedding ?? null;
  } catch {
    return null;
  }
}

export function parseJsonFromModel<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const arrayStart = raw.indexOf("[");
  const begin =
    start === -1
      ? arrayStart
      : arrayStart === -1
        ? start
        : Math.min(start, arrayStart);
  if (begin === -1) return null;
  const endObj = raw.lastIndexOf("}");
  const endArr = raw.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (end <= begin) return null;
  try {
    return JSON.parse(raw.slice(begin, end + 1)) as T;
  } catch {
    return null;
  }
}
