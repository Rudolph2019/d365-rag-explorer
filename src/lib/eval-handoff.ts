import { IMPACT_COMPARE, type ImpactCompareRow } from "./release-watch";

export const EVAL_DIGEST_QUERY = "digest=1";
export const EVAL_HANDOFF_HREF = `/eval?${EVAL_DIGEST_QUERY}`;
export const UNUSED_INVENTORY_ID = "ENT-17";
export const PRIORITY_CITE_IDS = ["WO-1042", "CAS-4481", "KA-881"] as const;

const ALLOWED_HOSTS = new Set([
  "learn.microsoft.com",
  "www.microsoft.com",
  "microsoft.com",
]);

export type EvalCitation = {
  flag: string;
  usage: ImpactCompareRow["usage"];
  contosoIds: string[];
  sourceUrl: string;
  sourceLabel: string;
  whatBreaks: string;
};

export type GoldenCheck = {
  id: "empty-until-handoff" | "citation-coverage" | "unused-filtered" | "priority-smoke";
  pass: boolean;
  detail: string;
};

export function isDigestHandoff(search: string): boolean {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw).get("digest") === "1";
}

export function isLearnOrRoadmapUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.has(host)) return false;
    if (host === "learn.microsoft.com") return true;
    return /microsoft-365\/roadmap|\/roadmap/i.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

export function extractContosoIds(text: string): string[] {
  return [...new Set(text.match(/\b(?:WO|CAS|KA|ACC|ENT)-\d+\b/g) ?? [])];
}

export function buildEvalDigest(
  rows: ImpactCompareRow[] = IMPACT_COMPARE,
): EvalCitation[] {
  return rows.map((row) => ({
    flag: row.flag,
    usage: row.usage,
    contosoIds: extractContosoIds(`${row.inventory} ${row.whatBreaks}`).filter(
      (id) => id !== UNUSED_INVENTORY_ID,
    ),
    sourceUrl: row.sourceUrl,
    sourceLabel: row.sourceLabel,
    whatBreaks: row.whatBreaks,
  }));
}

export function getEvalHandoff(search: string): {
  handedOff: boolean;
  citations: EvalCitation[];
} {
  if (!isDigestHandoff(search)) {
    return { handedOff: false, citations: [] };
  }
  return { handedOff: true, citations: buildEvalDigest() };
}

export function scoreGoldenEval(): GoldenCheck[] {
  const idle = getEvalHandoff("");
  const handed = getEvalHandoff(`?${EVAL_DIGEST_QUERY}`);
  const handedIds = handed.citations.flatMap((row) => row.contosoIds);
  const coverageFail = IMPACT_COMPARE.filter(
    (row) => !isLearnOrRoadmapUrl(row.sourceUrl),
  );

  return [
    {
      id: "empty-until-handoff",
      pass: !idle.handedOff && idle.citations.length === 0,
      detail: idle.handedOff
        ? "Eval is populated before Architecture hands off a digest."
        : "Eval stays empty until ?digest=1 handoff.",
    },
    {
      id: "citation-coverage",
      pass: IMPACT_COMPARE.length > 0 && coverageFail.length === 0,
      detail:
        coverageFail.length === 0
          ? `${IMPACT_COMPARE.length} digest rows cite Learn or M365 Roadmap HTTPS URLs.`
          : `Missing or invalid sourceUrl: ${coverageFail.map((row) => row.flag).join(", ")}`,
    },
    {
      id: "unused-filtered",
      pass: !handedIds.includes(UNUSED_INVENTORY_ID),
      detail: handedIds.includes(UNUSED_INVENTORY_ID)
        ? `${UNUSED_INVENTORY_ID} leaked into eval handoff ids.`
        : `${UNUSED_INVENTORY_ID} is omitted from digest/eval citation ids.`,
    },
    {
      id: "priority-smoke",
      pass: PRIORITY_CITE_IDS.every((id) => handedIds.includes(id)),
      detail: PRIORITY_CITE_IDS.every((id) => handedIds.includes(id))
        ? `${PRIORITY_CITE_IDS.join(" / ")} cited when digest is present.`
        : `Missing priority ids: ${PRIORITY_CITE_IDS.filter((id) => !handedIds.includes(id)).join(", ")}`,
    },
  ];
}
