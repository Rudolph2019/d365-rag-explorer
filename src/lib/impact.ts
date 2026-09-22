import {
  ALWAYS_RELEVANT_AREAS,
  SOLUTION_AREA_MAP,
  areasForSolutions,
  type SolutionInventory,
} from "@/lib/inventory";
import type { LearnFeature } from "@/lib/learn";
import type { M365RoadmapItem } from "@/lib/m365";
import { stripHtml } from "@/lib/text";

export type SeverityName = "Critical" | "High" | "Medium" | "Low";
export type ChangeType = "Feature" | "Deprecated";
export type ImpactSource = "m365_roadmap" | "learn_release_plan";

export const SEVERITY = {
  Critical: { name: "Critical" as const, dataverseValue: 644640000 },
  High: { name: "High" as const, dataverseValue: 644640001 },
  Medium: { name: "Medium" as const, dataverseValue: 644640002 },
  Low: { name: "Low" as const, dataverseValue: 644640003 },
};

export const CHANGE_TYPE = {
  Feature: { name: "Feature" as const, dataverseValue: 644640000 },
  Deprecated: { name: "Deprecated" as const, dataverseValue: 644640001 },
};

export const DEFAULT_SEVERITY = SEVERITY.Medium;

export type TicketAnalysis = {
  title: string;
  description: string;
  url: string;
  area: string;
  severity: SeverityName;
  dataverseValue: number;
  effective_date: string;
  change_type: ChangeType;
  is_deferable: boolean;
  system_impact: string;
  reasoning: string;
  should_create_ticket: boolean;
  matched_solutions: string[];
  source: ImpactSource;
  ratedBy: "ollama" | "heuristic";
};

export type ImpactCandidate = {
  title: string;
  description: string;
  url: string;
  area: string;
  products: string[];
  effective_date: string | null;
  source: ImpactSource;
};

const DEPRECATION_RE =
  /\b(deprecat|retir(e|ing|ed)|end of (support|life)|eol|remov(e|al|ing)|will be removed|no longer supported)\b/i;

const CRITICAL_RE =
  /\b(breaking|mandatory|immediate|security (update|fix|patch)|system-wide|hard removal)\b/i;

const HIGH_RE =
  /\b(major|replacement required|significant (config|training|workflow)|must migrate)\b/i;

export function isDeprecatedLanguage(text: string): boolean {
  return DEPRECATION_RE.test(text);
}

export function parseEffectiveDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      iso[3] ? Number(iso[3]) : 1,
    );
  }
  const us = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (us) {
    return new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]));
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function formatEffectiveDate(raw: string | null | undefined): string {
  const date = parseEffectiveDate(raw);
  if (!date) return raw || "";
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}-${date.getFullYear()}`;
}

export function isPastEffectiveDate(raw: string | null | undefined, now = new Date()) {
  const date = parseEffectiveDate(raw);
  if (!date) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date < today;
}

export function roadmapItemUrl(item: M365RoadmapItem): string {
  return `https://www.microsoft.com/en-us/microsoft-365/roadmap?filters=&searchterms=${encodeURIComponent(String(item.id))}`;
}

export function toRoadmapCandidate(item: M365RoadmapItem): ImpactCandidate {
  return {
    title: item.title,
    description: stripHtml(item.description),
    url: roadmapItemUrl(item),
    area: item.products?.[0] ?? "Microsoft 365",
    products: item.products ?? [],
    effective_date: item.generalAvailabilityDate,
    source: "m365_roadmap",
  };
}

export function toLearnCandidate(feature: LearnFeature): ImpactCandidate {
  return {
    title: feature.title,
    description: feature.title,
    url: feature.url,
    area: feature.area,
    products: [feature.area],
    effective_date: null,
    source: "learn_release_plan",
  };
}

function haystack(candidate: ImpactCandidate): string {
  return `${candidate.title} ${candidate.description} ${candidate.products.join(" ")} ${candidate.area}`.toLowerCase();
}

export function matchInventory(
  candidate: ImpactCandidate,
  inventory: SolutionInventory,
): { matched: boolean; solutions: string[]; area: string } {
  const text = haystack(candidate);
  const matchedSolutions: string[] = [];
  let area = candidate.area;

  for (const name of inventory.solutions) {
    const mapped = SOLUTION_AREA_MAP[name];
    const needles = [name.toLowerCase(), mapped?.toLowerCase()].filter(
      Boolean,
    ) as string[];
    if (needles.some((needle) => text.includes(needle))) {
      matchedSolutions.push(name);
      if (mapped) area = mapped;
    }
  }

  for (const component of inventory.components) {
    if (text.includes(component.area.toLowerCase())) {
      const owner = inventory.solutions.find(
        (name) => SOLUTION_AREA_MAP[name] === component.area,
      );
      if (owner && !matchedSolutions.includes(owner)) matchedSolutions.push(owner);
      area = component.area;
    }
  }

  const alwaysHit = ALWAYS_RELEVANT_AREAS.some((label) => {
    const token = label.toLowerCase();
    return (
      text.includes(token) ||
      (label === "Security" &&
        (text.includes("entra") || text.includes("defender"))) ||
      (label === "Compliance" && text.includes("purview"))
    );
  });

  if (alwaysHit && matchedSolutions.length === 0) {
    matchedSolutions.push(...inventory.solutions.slice(0, 1));
    if (text.includes("purview") || text.includes("compliance")) area = "Compliance";
    else if (text.includes("entra") || text.includes("security")) area = "Security";
    else if (text.includes("dataverse")) area = "Dataverse";
    else if (text.includes("license")) area = "Licensing";
    else if (text.includes("power platform") || text.includes("power automate")) {
      area = "Power Platform";
    }
  }

  const relevantAreas = areasForSolutions(inventory.solutions).map((value) =>
    value.toLowerCase(),
  );
  const areaHit = relevantAreas.some((value) => text.includes(value));

  return {
    matched: matchedSolutions.length > 0 || alwaysHit || areaHit,
    solutions: matchedSolutions,
    area,
  };
}

export function heuristicSeverity(text: string, changeType: ChangeType): SeverityName {
  if (CRITICAL_RE.test(text) || (changeType === "Deprecated" && /security|mandatory/.test(text))) {
    return "Critical";
  }
  if (HIGH_RE.test(text) || changeType === "Deprecated") return "High";
  if (/\b(preview|optional|cosmetic|informational)\b/i.test(text)) return "Low";
  return "Medium";
}

export function rateCandidateHeuristic(
  candidate: ImpactCandidate,
  inventory: SolutionInventory,
): TicketAnalysis | null {
  const match = matchInventory(candidate, inventory);
  if (!match.matched) return null;
  const text = haystack(candidate);
  const change_type: ChangeType = isDeprecatedLanguage(text)
    ? "Deprecated"
    : "Feature";
  const severity = heuristicSeverity(text, change_type);
  const effective = formatEffectiveDate(candidate.effective_date);
  const past = isPastEffectiveDate(candidate.effective_date);
  return {
    title: candidate.title,
    description: candidate.description,
    url: candidate.url,
    area: match.area,
    severity,
    dataverseValue: SEVERITY[severity].dataverseValue,
    effective_date: effective,
    change_type,
    is_deferable: severity === "Low" || severity === "Medium",
    system_impact:
      change_type === "Deprecated"
        ? "Installed solutions may need a replacement path before the effective date."
        : "Evaluate the feature against custom entities and first-party solutions in inventory.",
    reasoning: `Heuristic match on ${match.solutions.join(", ") || match.area}. ${
      change_type === "Deprecated"
        ? "Deprecation/retire/remove language detected."
        : "No deprecation language; treated as a Feature."
    } Default severity is Medium unless stronger cues were present.`,
    should_create_ticket: !past,
    matched_solutions: match.solutions,
    source: candidate.source,
    ratedBy: "heuristic",
  };
}

export function applyTicketGates(row: TicketAnalysis): TicketAnalysis {
  const severity = SEVERITY[row.severity] ? row.severity : DEFAULT_SEVERITY.name;
  const change_type: ChangeType =
    row.change_type === "Deprecated" ? "Deprecated" : "Feature";
  const past = isPastEffectiveDate(row.effective_date);
  return {
    ...row,
    severity,
    dataverseValue: SEVERITY[severity].dataverseValue,
    change_type,
    should_create_ticket: row.should_create_ticket && !past,
  };
}
