# Dataverse RAG Explorer

Contoso sandbox is the **data path** until live Dataverse is unparked. Architecture parks the Power Platform env URL (`cc72ef22-bdee-e93a-a41f-db16e6d3fe0c` maker home). WhoAmI and Entra secrets stay parked. The operator dashboard lives **inside D365**, not in this explorer.

**Primary API:** [https://www.microsoft.com/releasecommunications/api/v2/m365](https://www.microsoft.com/releasecommunications/api/v2/m365)

## Run the app

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43145](http://127.0.0.1:43145)

Offline Retrieval Eval golden suite (citation handoff, no live org):

```bash
npm run eval:golden
```

Routes:

- `/architecture` **Architecture** — Contoso RAG bands + Release Watch. Env id and maker URL are parked labels. Digest → Retrieval Eval or Send to Copilot Studio
- `/copilot-studio` **Copilot Studio handoff** — empty until `?digest=1`. Then sample Case/incident preview (no Dataverse call)
- `/query` **Query** · `/graph` **Graph** · `/records` **Records** — Contoso demo corpus
- `/eval` **Eval** — empty until Architecture hands off a digest (`/eval?digest=1`)
- `/` **Pipeline** — Indexing / Query canvas; dashed D365 dashboard is spec-only (inside Dynamics, not here)
- `/compare` **Compare** — Dataverse vs M365
- `/impact` **Impact** — `TicketAnalysis` rows (Critical–Low, Feature vs Deprecated)
- `/ask` **Ask** — orchestrator agent, max five MCP tool steps

## Copilot Studio (admin publish)

The explorer does **not** publish the agent. Spec: `src/data/copilot-studio-agent.json`.

1. Open [maker home](https://make.powerapps.com/environments/cc72ef22-bdee-e93a-a41f-db16e6d3fe0c/home) for environment `cc72ef22-bdee-e93a-a41f-db16e6d3fe0c`.
2. Copilot Studio → new agent **Release Watch Ticket Admin**.
3. Add the three topics (ingest digest, emit TicketAnalysis, create admin cases) and the Dataverse **Create incident** tool bound to **Case**.
4. Map TicketAnalysis `dataverseValue` to the severity choice **211460000–211460003**. Assign owner/queue to **System Administrator**.
5. Ingest only in use / referenced digest rows. Skip unused (ENT-17 and unused-product flags).
6. Publish in that environment. This repo never stores client secrets and never calls Dataverse.

Handoff payload shape: Architecture digest → **Send to Copilot Studio** → `/copilot-studio?digest=1`.

## D365 dashboard (inside Dynamics, spec only)

Do not build a web dashboard here. Spec: `src/data/d365-admin-dashboard-spec.json`.

In Customer Service Hub (or the model-driven app that owns Case) in the same environment, add a **model-driven / interactive dashboard** with:

- Open admin cases created by the Copilot Studio agent (Case / `incident`, System Administrator queue)
- Release Watch **in use** count
- Release Watch **referenced** count

No Power BI datasets and no dashboard XML in this repo.

## Ollama (optional)

The diagram, MCP roadmap tool, Compare, and Impact work without a model. Ask and the LLM jobs (router, summarize, rerank, explainer, impact rater) fall back to heuristics when Ollama is down.

```bash
# install from https://ollama.com
ollama pull llama3.1:latest
ollama pull nomic-embed-text   # optional, for local embeddings
```

Default endpoint: `http://127.0.0.1:11434`

| Variable | Default |
| --- | --- |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | `llama3.1:latest` |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` |

Copy `.env.example` to `.env.local` if you want to override those.

Health check: `GET /api/ollama/health`

## MCP server

```bash
npm run mcp
```

Stdio server implemented in this repo (`mcp/server.ts`). Tools:

- `get_pipeline` / `get_pipeline_stage`
- `get_m365_roadmap` — proxies the v2 OData API (`filter`, `orderby`, `top`, `skip`)
- `compare_sources`
- `rate_roadmap_impact`
- `ask_ollama`
- `route_question` / `explain_stage` (also used by the Ask orchestrator)

Cursor config (`~/.cursor/mcp.json` or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "d365-rag-explorer": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/absolute/path/to/this-repo"
    }
  }
}
```

## Key paths

| Path | Role |
| --- | --- |
| `src/lib/pipeline.ts` | Typed pipeline stages |
| `src/lib/architecture.ts` | Contoso RAG architecture nodes |
| `src/lib/release-watch.ts` | Release Watch strip + 32-flag FLAG_PACK |
| `src/lib/copilot-studio.ts` | Digest → TicketAnalysis → sample Case payload |
| `src/data/copilot-studio-agent.json` | Copilot Studio topics/tools spec |
| `src/data/d365-admin-dashboard-spec.json` | In-D365 dashboard spec |
| `src/lib/eval-handoff.ts` | Digest handoff + golden eval scoring |
| `src/lib/live-org.ts` | Parked env id + maker URL labels |
| `src/lib/contoso.ts` | Contoso sandbox demo corpus |
| `src/lib/impact.ts` | TicketAnalysis + Severity `211460000`–`211460003` |
| `mcp/server.ts` | stdio MCP server (explorer tools only — not Copilot Studio) |

## Out of scope

No Entra app, no Dataverse credentials, no live Copilot Studio publish, no Power BI datasets, no explorer web dashboard. The D365 dashboard is built in the Dynamics app.
