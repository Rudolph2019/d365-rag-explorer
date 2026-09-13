import { rerankItems } from "@/lib/jobs";
import { fetchM365Roadmap } from "@/lib/m365";
import { stripHtml } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
  };
  const question = body.question?.trim() || "Copilot and compliance updates";
  const feed = await fetchM365Roadmap({
    top: 12,
    orderby: "modified desc",
  });
  const ranked = await rerankItems(
    feed.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: stripHtml(item.description),
      status: item.status,
    })),
    question,
  );
  return Response.json({ question, source: feed.source, ...ranked });
}
