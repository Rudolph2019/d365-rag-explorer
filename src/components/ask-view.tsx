"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrchestratorAnswer, ToolTrace } from "@/lib/orchestrator";

const EXAMPLES = [
  "What is rolling out on the Microsoft 365 Roadmap?",
  "How does the orchestrator use MCP on the query path?",
  "Which Field Service or Copilot items should we rate against the sample inventory?",
];

export function AskView({ initialQuestion }: { initialQuestion?: string }) {
  const [question, setQuestion] = useState(
    initialQuestion ?? EXAMPLES[0],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestratorAnswer | null>(null);

  async function ask(next = question) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: next }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Ask failed");
      setResult(payload as OrchestratorAnswer);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">
          Orchestrator loop
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One agent, cap of five MCP tool steps. Failed OData is rewritten from
          stored lessons, then the loop retrieves once and writes the answer. If
          Ollama is down there is no loop — a keyword router plus a single
          retrieve or static explainer.
        </p>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void ask()} disabled={loading || !question.trim()}>
            {loading ? "Running tools…" : "Ask"}
          </Button>
          {EXAMPLES.map((example) => (
            <Button
              key={example}
              size="sm"
              variant="outline"
              onClick={() => {
                setQuestion(example);
                void ask(example);
              }}
            >
              {example}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && !result ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Orchestrator is choosing tools…
        </div>
      ) : null}

      {result ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold">Tool-call trace</h3>
              <Badge variant="outline">{result.method}</Badge>
              <Badge variant={result.ollamaOnline ? "secondary" : "destructive"}>
                {result.ollamaOnline ? "Ollama loop" : "Offline fallback"}
              </Badge>
            </div>
            {result.traces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The model answered without a tool call.
              </p>
            ) : (
              <ol className="space-y-2">
                {result.traces.map((trace) => (
                  <TraceRow key={`${trace.step}-${trace.tool}`} trace={trace} />
                ))}
              </ol>
            )}
            {result.lessons?.length ? (
              <div className="mt-4 border-t pt-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lessons the loop remembered
                </h4>
                <ul className="space-y-1.5">
                  {result.lessons.map((lesson) => (
                    <li
                      key={`${lesson.tool}-${lesson.field ?? "args"}-${lesson.bad}`}
                      className="font-mono text-[11px] leading-snug text-muted-foreground"
                    >
                      {lesson.field ? `${lesson.tool}.${lesson.field}` : lesson.tool}{" "}
                      rejected <span className="text-foreground">{lesson.bad}</span>
                      {" → "}
                      {lesson.fix || "(omit)"}{" "}
                      <span className="text-muted-foreground/80">×{lesson.seen}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          <section className="rounded-xl border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Answer</h3>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {result.answer}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function TraceRow({ trace }: { trace: ToolTrace }) {
  return (
    <li className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-muted-foreground">#{trace.step}</span>
        <span className="font-semibold">{trace.tool}</span>
        <Badge variant={trace.ok ? "secondary" : "destructive"}>
          {trace.ok ? "ok" : "error"}
        </Badge>
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {JSON.stringify(trace.args)}
      </p>
      <p className="mt-1 leading-snug">{trace.result}</p>
    </li>
  );
}
