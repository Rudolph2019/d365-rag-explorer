import { SAMPLE_INVENTORY } from "@/lib/inventory";
import type { ReleaseWave } from "@/lib/learn";
import { toolRateRoadmapImpact } from "@/lib/tools";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    uniqueNames?: string[];
    uniqueNameText?: string;
    includeRoadmap?: boolean;
    includeLearn?: boolean;
    wave?: ReleaseWave;
    top?: number;
  };
  const result = await toolRateRoadmapImpact({
    uniqueNames: body.uniqueNames,
    uniqueNameText: body.uniqueNameText,
    includeRoadmap: body.includeRoadmap,
    includeLearn: body.includeLearn,
    wave: body.wave,
    top: body.top,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error, inventory: SAMPLE_INVENTORY, tickets: [] },
      { status: 502 },
    );
  }
  return Response.json(result.data);
}

export async function GET() {
  const result = await toolRateRoadmapImpact({
    includeRoadmap: true,
    includeLearn: false,
  });
  return Response.json(result.data);
}
