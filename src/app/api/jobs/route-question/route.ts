import { routeQuestion } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { question?: string };
  if (!body.question?.trim()) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }
  const result = await routeQuestion(body.question);
  return Response.json(result);
}
