# Dataverse RAG Explorer

Interactive architecture for a **Dataverse RAG** pipeline: indexing vs query, an in-repo **MCP** server, a live **M365 Roadmap** compare, and an **Impact** tab that rates public release items against a sample Dynamics solution inventory.

Dataverse stays architecture-only (no tenant). Compare and Impact live-feed the public Microsoft 365 Roadmap API through a Next.js proxy.

**Primary API:** [https://www.microsoft.com/releasecommunications/api/v2/m365](https://www.microsoft.com/releasecommunications/api/v2/m365)

## Run the app

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:43145](http://127.0.0.1:43145)

Routes:

- `/` **Pipeline** — Indexing / Query canvas, MCP + orchestrator nodes, Azure OpenAI vs Ollama toggle, dashed Power BI and D365 dashboard (future)
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
