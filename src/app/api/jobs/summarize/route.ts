import { summarizeIngest } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { html?: string };
  if (!body.html) {
    return Response.json({ error: "html is required" }, { status: 400 });
  }
  const result = await summarizeIngest(body.html);
  return Response.json(result);
}
