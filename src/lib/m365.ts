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

const VALID_ORDERBY = new Set([
  "modified",
  "created",
  "title",
  "status",
  "generalAvailabilityDate",
]);

const STATUS_EQ: Record<string, string> = {
  status: "status eq 'Rolling out'",
  rollout: "status eq 'Rolling out'",
  "rolling out": "status eq 'Rolling out'",
  rollingout: "status eq 'Rolling out'",
  launched: "status eq 'Launched'",
  "in development": "status eq 'In development'",
  development: "status eq 'In development'",
};

function looksLikeOdata(filter: string): boolean {
  return /\b(eq|ne|contains|any|and|or)\b/i.test(filter);
}

function rewriteLooseFilter(filter: string): string | undefined {
  const statusAssign = filter.match(/^status\s*=\s*(.+)$/i);
  if (statusAssign) {
    const values = statusAssign[1]
      .split(/[,|/]+/)
      .map((value) => value.replace(/^['"]|['"]$/g, "").trim())
      .filter(Boolean);
    if (values.length) {
      return values
        .map((value) => `status eq '${value.replace(/'/g, "")}'`)
        .join(" or ");
    }
  }
  const mapped = STATUS_EQ[filter.toLowerCase()];
  if (mapped) return mapped;
  if (filter.length > 2) return `contains(title,'${filter.replace(/'/g, "")}')`;
  return undefined;
}

export function inferRoadmapQuery(question: string): M365Query {
  const q = question.toLowerCase();
  if (/\broll(ing)?\s*out\b/.test(q) || /\bcurrently rolling\b/.test(q)) {
    return {
      top: 10,
      orderby: "modified desc",
      filter: "status eq 'Rolling out'",
    };
  }
  if (/\bin development\b/.test(q)) {
    return {
      top: 10,
      orderby: "modified desc",
      filter: "status eq 'In development'",
    };
  }
  if (/\blaunched\b/.test(q)) {
    return {
      top: 10,
      orderby: "modified desc",
      filter: "status eq 'Launched'",
    };
  }
  return { top: 10, orderby: "modified desc" };
}

export function sanitizeM365Query(query: M365Query = {}): M365Query {
  let filter = query.filter?.trim() || undefined;
  if (filter && !looksLikeOdata(filter)) {
    filter = rewriteLooseFilter(filter);
  }

  let orderby = query.orderby?.trim() || undefined;
  if (orderby) {
    const [field, direction] = orderby.split(/\s+/);
    if (!VALID_ORDERBY.has(field)) {
      orderby = "modified desc";
    } else if (direction && !/^(asc|desc)$/i.test(direction)) {
      orderby = `${field} desc`;
    }
  }

  return {
    ...query,
    filter,
    orderby: orderby ?? "modified desc",
  };
}

export function buildM365Url(query: M365Query = {}): string {
  const safe = sanitizeM365Query(query);
  const params = new URLSearchParams();
  if (safe.filter) params.set("$filter", safe.filter);
  if (safe.orderby) params.set("$orderby", safe.orderby);
  if (safe.top != null) params.set("$top", String(safe.top));
  if (safe.skip != null) params.set("$skip", String(safe.skip));
  if (safe.count) params.set("$count", "true");
  const qs = params.toString();
  return qs ? `${M365_ROADMAP_API}?${qs}` : M365_ROADMAP_API;
}

async function readRoadmap(url: string): Promise<M365RoadmapResult> {
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

export async function fetchM365Roadmap(
  query: M365Query = {},
): Promise<M365RoadmapResult> {
  try {
    return await readRoadmap(buildM365Url(query));
  } catch (error) {
    if (!query.filter) throw error;
    return readRoadmap(
      buildM365Url({
        ...query,
        filter: undefined,
        orderby: "modified desc",
      }),
    );
  }
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
