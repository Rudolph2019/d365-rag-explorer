# Dataverse RAG Explorer

Contoso sandbox is the **data path** until live Dataverse is unparked. Architecture and Dashboard label the Power Platform environment URL. WhoAmI and Entra secrets stay parked.

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

- `/architecture` **Architecture** — Contoso RAG bands + Release Watch. Env URL labeled from maker home; WhoAmI parked
- `/dashboard` **Dashboard** — environment id, maker home link, URL configured / WhoAmI parked, Release Watch digest counts. Empty: `?state=empty`. Error: `?state=error`
- `/query` **Query** · `/graph` **Graph** · `/records` **Records** — Contoso demo corpus. Empty: no query yet, no-match, parked live-org error, no graph node, no record filter match
- `/eval` **Eval** — empty until Architecture hands off a digest (`/eval?digest=1` shows FLAG_PACK ids, Contoso ids, and handoff `source_url`)
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
| `src/lib/release-watch.ts` | Release Watch strip + 32-flag FLAG_PACK (handoff ids + source_url) |
| `src/data/flags-handoff-retrieval-eval.json` | Release Watch flag pack handoff (citation_key = source_url) |
| `src/data/first-snapshot-2026-09-15.json` | Snapshot notes/dates used for digest copy (no invented claims) |
| `src/lib/eval-handoff.ts` | Digest handoff + golden eval scoring |
| `src/lib/live-org.ts` | Power Platform env id + maker URL labels (no secrets, no WhoAmI call) |
| `src/lib/contoso.ts` | Contoso sandbox demo corpus |
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
