import { runOrchestrator } from "@/lib/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: string };
  const question = body.question?.trim();
  if (!question) {
    return Response.json({ error: "Question is required." }, { status: 400 });
  }
  const result = await runOrchestrator(question);
  return Response.json(result);
}
