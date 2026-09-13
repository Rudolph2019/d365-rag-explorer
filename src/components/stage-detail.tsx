"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PipelineStage } from "@/lib/pipeline";

type JobState = {
  loading: boolean;
  error?: string;
  payload?: unknown;
};

export function StageDetail({
  stage,
  model,
}: {
  stage: PipelineStage | null;
  model: "azure" | "ollama";
}) {
  if (!stage) {
    return (
      <div className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
        Select a stage on the canvas. Indexing shows ingest; Query shows the
        orchestrator loop. Dashed Power BI and D365 dashboard nodes are future
        Microsoft consumers — copy only.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {stage.kind}
            {stage.dashed ? " · future" : ""}
            {stage.path !== "both" ? ` · ${stage.path}` : ""}
          </p>
          <h2 className="font-heading text-lg font-semibold">{stage.title}</h2>
        </div>
        {stage.llmJob ? <Badge variant="secondary">LLM job</Badge> : null}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{stage.detail}</p>
      {(stage.id === "embeddings" || stage.id === "generate") && (
        <p className="text-xs text-muted-foreground">
          Active model path:{" "}
          <span className="font-medium text-foreground">
            {model === "ollama"
              ? "Ollama at 127.0.0.1:11434"
              : "Azure OpenAI (labeled alternative — no key required here)"}
          </span>
        </p>
      )}
      {stage.mcpTools?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {stage.mcpTools.map((tool) => (
            <Badge key={tool} variant="outline" className="font-mono text-[10px]">
              {tool}
            </Badge>
          ))}
        </div>
      ) : null}
      <Separator />
      <JobPanel stage={stage} />
    </div>
  );
}

function JobPanel({ stage }: { stage: PipelineStage }) {
  if (stage.llmJob === "summarize") return <SummarizeDemo />;
  if (stage.llmJob === "router") return <RouterDemo />;
  if (stage.llmJob === "rerank") return <RerankDemo />;
  if (stage.id === "orchestrator") {
    return (
      <p className="text-xs text-muted-foreground">
        Open the Ask tab to run the orchestrator loop with a visible tool-call
        trace.
      </p>
    );
  }
  if (stage.llmJob === "impact") {
    return (
      <p className="text-xs text-muted-foreground">
        Open the Impact tab to rate live Roadmap items against the sample
        inventory.
      </p>
    );
  }
  return <ExplainerDemo stageId={stage.id} />;
}

function SummarizeDemo() {
  const [html, setHtml] = useState("");
  const [state, setState] = useState<JobState>({ loading: false });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/m365?top=1&orderby=modified desc")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.items?.[0]?.description) {
          setHtml(data.items[0].description);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    setState({ loading: true });
    try {
      const res = await fetch("/api/jobs/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Summarize failed");
      setState({ loading: false, payload });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Summarize failed",
      });
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Ingest summarization</p>
      <textarea
        value={html}
        onChange={(event) => setHtml(event.target.value)}
        rows={4}
        className="w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs"
        placeholder="M365 description HTML"
      />
      <Button size="sm" onClick={run} disabled={!html || state.loading}>
        {state.loading ? "Summarizing…" : "Summarize description"}
      </Button>
      <JobOutput state={state} />
    </div>
  );
}

function RouterDemo() {
  const [question, setQuestion] = useState(
    "Which Copilot features are rolling out this month?",
  );
  const [state, setState] = useState<JobState>({ loading: false });

  async function run() {
    setState({ loading: true });
    try {
      const res = await fetch("/api/jobs/route-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Router failed");
      setState({ loading: false, payload });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Router failed",
      });
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Source router</p>
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
      />
      <Button size="sm" onClick={run} disabled={!question || state.loading}>
        {state.loading ? "Routing…" : "Classify question"}
      </Button>
      <JobOutput state={state} />
    </div>
  );
}

function RerankDemo() {
  const [question, setQuestion] = useState("Purview and Copilot compliance");
  const [state, setState] = useState<JobState>({ loading: false });

  async function run() {
    setState({ loading: true });
    try {
      const res = await fetch("/api/jobs/rerank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Rerank failed");
      setState({ loading: false, payload });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Rerank failed",
      });
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Rerank live Roadmap slice</p>
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
      />
      <Button size="sm" onClick={run} disabled={state.loading}>
        {state.loading ? "Scoring…" : "Rerank from API"}
      </Button>
      <JobOutput state={state} />
    </div>
  );
}

function ExplainerDemo({ stageId }: { stageId: string }) {
  const [question, setQuestion] = useState("Why is this stage on the path?");
  const [state, setState] = useState<JobState>({ loading: false });

  async function run() {
    setState({ loading: true });
    try {
      const res = await fetch("/api/jobs/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: stageId, question }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Explain failed");
      setState({ loading: false, payload });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Explain failed",
      });
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Diagram explainer</p>
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
      />
      <Button size="sm" onClick={run} disabled={state.loading}>
        {state.loading ? "Explaining…" : "Explain this stage"}
      </Button>
      <JobOutput state={state} />
    </div>
  );
}

function JobOutput({ state }: { state: JobState }) {
  if (state.error) {
    return <p className="text-xs text-destructive">{state.error}</p>;
  }
  if (!state.payload) return null;
  return (
    <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 text-[11px] leading-relaxed">
      {JSON.stringify(state.payload, null, 2)}
    </pre>
  );
}
