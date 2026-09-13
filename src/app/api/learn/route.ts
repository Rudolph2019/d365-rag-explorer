import { VALID_WAVES, fetchLearnWave, type ReleaseWave } from "@/lib/learn";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("wave") ?? "2026wave1";
  const wave = VALID_WAVES.includes(raw as ReleaseWave)
    ? (raw as ReleaseWave)
    : "2026wave1";
  const result = await fetchLearnWave(wave);
  return Response.json(result);
}
