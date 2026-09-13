import { getOllamaHealth } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = await getOllamaHealth();
  return Response.json(health);
}
