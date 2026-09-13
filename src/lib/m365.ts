export const M365_ROADMAP_API =
  "https://www.microsoft.com/releasecommunications/api/v2/m365";

export type M365Availability = {
  ring: string;
  year: number;
  month: string;
};

export type M365RoadmapItem = {
  id: number | string;
  title: string;
  description: string;
  products: string[];
  platforms: string[];
  status: string;
  cloudInstances: string[];
  releaseRings: string[];
  generalAvailabilityDate: string | null;
  previewAvailabilityDate: string | null;
  created?: string;
  modified?: string;
  moreInfoUrls?: string[];
  availabilities?: M365Availability[];
};

export type M365Query = {
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  count?: boolean;
};

export type M365RoadmapResult = {
  source: typeof M365_ROADMAP_API;
  items: M365RoadmapItem[];
  count: number | null;
};

const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "d365-rag-explorer/1.0",
};

export function buildM365Url(query: M365Query = {}): string {
  const params = new URLSearchParams();
  if (query.filter) params.set("$filter", query.filter);
  if (query.orderby) params.set("$orderby", query.orderby);
  if (query.top != null) params.set("$top", String(query.top));
  if (query.skip != null) params.set("$skip", String(query.skip));
  if (query.count) params.set("$count", "true");
  const qs = params.toString();
  return qs ? `${M365_ROADMAP_API}?${qs}` : M365_ROADMAP_API;
}

export async function fetchM365Roadmap(
  query: M365Query = {},
): Promise<M365RoadmapResult> {
  const url = buildM365Url(query);
  const response = await fetch(url, {
    headers: DEFAULT_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `M365 Roadmap API returned ${response.status} ${response.statusText}`,
    );
  }
  const payload = (await response.json()) as {
    value?: M365RoadmapItem[];
    "@odata.count"?: number;
  };
  const items = Array.isArray(payload.value) ? payload.value : [];
  return {
    source: M365_ROADMAP_API,
    items,
    count: payload["@odata.count"] ?? items.length,
  };
}

export function parseM365SearchParams(searchParams: URLSearchParams): M365Query {
  const rawTop = searchParams.get("top") ?? searchParams.get("$top");
  const rawSkip = searchParams.get("skip") ?? searchParams.get("$skip");
  const rawCount = searchParams.get("count") ?? searchParams.get("$count");
  const top = rawTop ? Number.parseInt(rawTop, 10) : undefined;
  const skip = rawSkip ? Number.parseInt(rawSkip, 10) : undefined;
  return {
    filter: searchParams.get("filter") ?? searchParams.get("$filter") ?? undefined,
    orderby:
      searchParams.get("orderby") ?? searchParams.get("$orderby") ?? undefined,
    top: Number.isFinite(top) ? top : undefined,
    skip: Number.isFinite(skip) ? skip : undefined,
    count: rawCount === "true" || rawCount === "1",
  };
}

export const DYNAMICS_RELEVANT_FILTER =
  "contains(title,'Dynamics') or contains(title,'Dataverse') or contains(title,'Power Platform') or contains(title,'Power Apps') or contains(title,'Power Automate') or products/any(p:contains(p,'Dynamics')) or products/any(p:contains(p,'Power Automate')) or products/any(p:contains(p,'Purview')) or products/any(p:contains(p,'Entra')) or products/any(p:contains(p,'Copilot Studio'))";
