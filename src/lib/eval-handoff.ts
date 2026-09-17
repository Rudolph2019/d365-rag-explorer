import {
  FLAG_PACK,
  FLAG_PACK_BY_ID,
  HANDOFF_FLAG_IDS,
  IMPACT_COMPARE,
  PRIORITY_SEED_IDS,
  UNUSED_FLAG_IDS,
  type ImpactCompareRow,
} from "./release-watch";

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
  flagId: string;
  flag: string;
  usage: ImpactCompareRow["usage"];
  contosoIds: string[];
  sourceUrl: string;
  sourceLabel: string;
  whatBreaks: string;
  prioritySeed: boolean;
};

export type GoldenCheck = {
  id:
    | "empty-until-handoff"
    | "flag-pack-ids"
    | "priority-seeds"
    | "citation-coverage"
    | "unused-filtered"
    | "priority-smoke";
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
    const path = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return (
      /microsoft-365\/roadmap/i.test(path) ||
      /\/roadmap/i.test(path) ||
      /dynamics-365\/blog/i.test(path)
    );
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
    flagId: row.flagId,
    flag: row.flag,
    usage: row.usage,
    contosoIds: extractContosoIds(`${row.inventory} ${row.whatBreaks}`).filter(
      (id) => id !== UNUSED_INVENTORY_ID,
    ),
    sourceUrl: row.sourceUrl,
    sourceLabel: row.sourceLabel,
    whatBreaks: row.whatBreaks,
    prioritySeed: row.prioritySeed,
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
  const handedFlagIds = handed.citations.map((row) => row.flagId);
  const packIds = FLAG_PACK.map((flag) => flag.id);
  const missingPack = HANDOFF_FLAG_IDS.filter((id) => !packIds.includes(id));
  const extraPack = packIds.filter((id) => !HANDOFF_FLAG_IDS.includes(id));
  const missingSeeds = PRIORITY_SEED_IDS.filter((id) => {
    const flag = FLAG_PACK_BY_ID.get(id);
    return !flag?.prioritySeed;
  });
  const inventedUrls = IMPACT_COMPARE.filter((row) => {
    const pack = FLAG_PACK_BY_ID.get(row.flagId);
    return !pack || pack.sourceUrl !== row.sourceUrl;
  });
  const badHosts = IMPACT_COMPARE.filter(
    (row) => !isLearnOrRoadmapUrl(row.sourceUrl),
  );
  const unusedLeaked = handedFlagIds.filter((id) =>
    UNUSED_FLAG_IDS.includes(id),
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
      id: "flag-pack-ids",
      pass:
        FLAG_PACK.length === HANDOFF_FLAG_IDS.length &&
        missingPack.length === 0 &&
        extraPack.length === 0,
      detail:
        missingPack.length === 0 && extraPack.length === 0
          ? `FLAG_PACK has ${FLAG_PACK.length} handoff ids.`
          : `FLAG_PACK mismatch missing=${missingPack.join(",") || "none"} extra=${extraPack.join(",") || "none"}`,
    },
    {
      id: "priority-seeds",
      pass: missingSeeds.length === 0 && PRIORITY_SEED_IDS.length === 10,
      detail:
        missingSeeds.length === 0
          ? `${PRIORITY_SEED_IDS.length} priority_seed ids present on FLAG_PACK.`
          : `Missing priority seeds: ${missingSeeds.join(", ")}`,
    },
    {
      id: "citation-coverage",
      pass:
        IMPACT_COMPARE.length > 0 &&
        inventedUrls.length === 0 &&
        badHosts.length === 0,
      detail:
        inventedUrls.length === 0 && badHosts.length === 0
          ? `${IMPACT_COMPARE.length} digest rows cite FLAG_PACK source_url (Learn, M365 Roadmap, or Dynamics 365 blog).`
          : `Invalid sourceUrl: ${[...inventedUrls, ...badHosts].map((row) => row.flagId).join(", ")}`,
    },
    {
      id: "unused-filtered",
      pass:
        !handedIds.includes(UNUSED_INVENTORY_ID) && unusedLeaked.length === 0,
      detail:
        handedIds.includes(UNUSED_INVENTORY_ID) || unusedLeaked.length
          ? `Unused leaked: ${[UNUSED_INVENTORY_ID, ...unusedLeaked].join(", ")}`
          : `${UNUSED_INVENTORY_ID} and ${UNUSED_FLAG_IDS.length} unused-product flags omitted from digest.`,
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
