import { explainStage } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    question?: string;
  };
  if (!body.id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }
  const result = await explainStage(body.id, body.question);
  return Response.json(result);
}
