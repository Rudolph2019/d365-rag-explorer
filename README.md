# Dataverse RAG Explorer

Interactive architecture for a **Dataverse RAG** pipeline on the **Contoso sandbox** (in use until a live org is unparked): indexing vs query, Architecture + Release Watch, an in-repo **MCP** server, a live **M365 Roadmap** compare, and an **Impact** tab that rates public release items against a sample Dynamics solution inventory.

Dataverse stays architecture-only (no tenant). Compare and Impact live-feed the public Microsoft 365 Roadmap API through a Next.js proxy.

**Primary API:** [https://www.microsoft.com/releasecommunications/api/v2/m365](https://www.microsoft.com/releasecommunications/api/v2/m365)

## Run the app

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43145](http://127.0.0.1:43145)

Routes:

- `/architecture` **Architecture** — same nav row as Pipeline (active tab is filled). Contoso RAG bands + Release Watch. Empty: pre-load, no band selected, no Release Watch step (each with a pick CTA)
- `/query` **Query** · `/graph` **Graph** · `/records` **Records** — Contoso demo corpus. Empty: no query yet, no-match, parked live-org error, no graph node, no record filter match
- `/knowledge/galxity` **Knowledge** — Galxity AI topic (Enterprise Horizon, constellation, quantum fabric, governance). `/knowledge` redirects here. Includes **Power Apps handoff** for env `cc72ef22-bdee-e93a-a41f-db16e6d3fe0c` (CSV / markdown pack / Copilot Studio instructions). Explorer never calls Dataverse.
- `/eval` **Eval** — empty until Architecture hands off a digest

## Galxity Knowledge → Power Apps

Same environment as Release Ticket (`cc72ef22-bdee-e93a-a41f-db16e6d3fe0c` / `org0da602b3`).

1. Open [maker home](https://make.powerapps.com/environments/cc72ef22-bdee-e93a-a41f-db16e6d3fe0c/home).
2. Create table **Galxity Knowledge** (`cr458_GalxityKnowledge`) from `src/data/cr458_galxityknowledge.schema.json`.
3. Import CSV from `GET /api/galxity/export?format=csv` (or the Download CSV button on `/knowledge/galxity`).
4. Optional model-driven app with **Active Galxity Knowledge** view.
5. Copilot Studio → Knowledge → add the Dataverse table and/or upload the markdown zip (`?format=zip`).
6. Paste agent instructions from `src/data/galxity-copilot-studio-knowledge.json` (also shown on the Knowledge page). Remove Contoso Coffee sample wording.
7. Preview: ask *What is Enterprise Horizon?* — expect a grounded answer citing `KA-GX-01`.

Release Ticket (`cr458_releaseticket`) tools stay for ticket create. Galxity Knowledge is read-only grounding.

- `/` **Pipeline** — Indexing / Query canvas; empty detail until a node is picked
- `/compare` **Compare** — Dataverse vs M365, plus a live sample list from the v2 API
- `/impact` **Impact** — `TicketAnalysis` rows (Critical–Low, Feature vs Deprecated) against the sample inventory; optional bounded Learn wave pages
- `/ask` **Ask** — one orchestrator agent, max five MCP tool steps, visible tool-call trace. Invalid Roadmap OData (`orderby: rollout`, `filter: rollout`) is rewritten from stored lessons; a 400 auto-retries with `modified desc` and the loop stops after the first good retrieve.

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
      "cwd": "/absolute/path/to/this/repo"
    }
  }
}
```

## Key paths

| Path | Role |
| --- | --- |
| `src/lib/pipeline.ts` | Typed pipeline stages |
| `src/lib/architecture.ts` | Contoso RAG architecture nodes |
| `src/lib/release-watch.ts` | Release Watch strip + placeholder flags |
| `src/lib/contoso.ts` | Contoso sandbox, demo corpus, future swap labels |
| `src/lib/galxity.ts` | Galxity AI knowledge topic articles |
| `src/lib/galxity-powerapps.ts` | Power Apps / Copilot Studio handoff + CSV/MD export helpers |
| `src/lib/live-org.ts` | Parked Maker env id + maker home URL |
| `src/data/cr458_galxityknowledge.schema.json` | Dataverse **Galxity Knowledge** table (`cr458_`) |
| `src/data/galxity-copilot-studio-knowledge.json` | Copilot Studio Knowledge setup + agent instructions |
| `src/app/api/galxity/export/route.ts` | `?format=csv\|json\|md\|zip` downloads |
| `src/lib/m365.ts` | Live Roadmap client |
| `src/lib/impact.ts` | TicketAnalysis + Severity |
| `src/lib/inventory.ts` | Sample Dynamics inventory |
| `src/lib/orchestrator.ts` | Ask tool loop (self-heal + finalize) |
| `src/lib/tool-memory.ts` | Persisted Ask lessons (`.data/tool-lessons.json`) |
| `src/app/api/m365/route.ts` | Server proxy for the public API |
| `src/app/api/impact/route.ts` | Impact rating |
| `src/app/api/ask/route.ts` | Orchestrator |
| `mcp/server.ts` | stdio MCP server |

## Out of scope

No Entra app, no Dataverse credentials, no Copilot Studio / D365 Copilot implementation, no Power BI datasets. Those stay dashed future consumers on the canvas.
