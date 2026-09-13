import { fetchM365Roadmap, parseM365SearchParams } from "@/lib/m365";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const result = await fetchM365Roadmap(parseM365SearchParams(searchParams));
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        source: "https://www.microsoft.com/releasecommunications/api/v2/m365",
        items: [],
        count: 0,
        error: error instanceof Error ? error.message : "Roadmap fetch failed",
      },
      { status: 502 },
    );
  }
}
