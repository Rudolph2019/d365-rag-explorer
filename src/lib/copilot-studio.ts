import agentSpec from "@/data/copilot-studio-agent.json";
import { isDigestHandoff } from "@/lib/eval-handoff";
import {
  applyTicketGates,
  heuristicSeverity,
  isDeprecatedLanguage,
  SEVERITY,
  type TicketAnalysis,
} from "@/lib/impact";
import { LIVE_ORG } from "@/lib/live-org";
import {
  FLAG_PACK_BY_ID,
  IMPACT_COMPARE,
  type FlagKind,
  type ImpactCompareRow,
} from "@/lib/release-watch";

export const COPILOT_STUDIO_DIGEST_QUERY = "digest=1";
export const COPILOT_STUDIO_HANDOFF_HREF = `/copilot-studio?${COPILOT_STUDIO_DIGEST_QUERY}`;
export const COPILOT_STUDIO_MAKER_HOME = LIVE_ORG.makerHome;

export const COPILOT_STUDIO_AGENT = agentSpec;

export type SampleIncident = {
  logicalName: "incident";
  displayName: "Case";
  flagId: string;
  title: string;
  description: string;
  severityName: TicketAnalysis["severity"];
  ticketAnalysisSeverity: number;
  assignedToRole: "System Administrator";
  assignedToQueue: "System Administrator";
  sourceUrl: string;
  preview: true;
};

export type CopilotStudioHandoff = {
  schema: "d365-rag-explorer.copilot-studio.digest.v1";
  environmentId: string;
  makerHome: string;
  filter: "in use | referenced";
  unusedOmitted: true;
  dataverseCalled: false;
  credentials: "none";
  message: string;
  tickets: TicketAnalysis[];
  incidents: SampleIncident[];
};

function changeTypeForKind(kind: FlagKind | undefined, text: string) {
  if (kind === "deprecation" || kind === "retirement") return "Deprecated" as const;
  return isDeprecatedLanguage(text) ? ("Deprecated" as const) : ("Feature" as const);
}

function areaFromInventory(inventory: string) {
  if (/Field Service|cr_fieldticket|cr_WorkOrderRibbon/i.test(inventory)) {
    return "Field Service";
  }
  if (/Customer Service|cr_prioritycase|Omnichannel/i.test(inventory)) {
    return "Customer Service";
  }
  if (/Dataverse/i.test(inventory)) return "Dataverse";
  if (/Power Platform/i.test(inventory)) return "Power Platform";
  return "Dynamics 365";
}

function solutionsFromInventory(inventory: string): string[] {
  return [...inventory.matchAll(/\b(?:msdyn[a-z_]+|cr_[A-Za-z0-9]+|Dataverse|Power Platform)\b/g)].map(
    (match) => match[0],
  );
}

export function digestRowToTicket(row: ImpactCompareRow): TicketAnalysis {
  const flag = FLAG_PACK_BY_ID.get(row.flagId);
  const text = `${row.flag} ${row.whatBreaks} ${flag?.kind ?? ""} ${flag?.note ?? ""}`;
  const change_type = changeTypeForKind(flag?.kind, text);
  const severity = heuristicSeverity(text, change_type);
  const ticket = applyTicketGates({
    title: `[Release Watch] ${row.flag}`,
    description: `${row.whatBreaks}\n\nContoso ${row.usage}: ${row.inventory}\nFlag: ${row.flagId}`,
    url: row.sourceUrl,
    area: areaFromInventory(row.inventory),
    severity,
    dataverseValue: SEVERITY[severity].dataverseValue,
    effective_date: "",
    change_type,
    is_deferable: severity === "Low" || severity === "Medium",
    system_impact:
      change_type === "Deprecated"
        ? "System Administrator should plan a replacement path on the Contoso-grounded solutions before the source effective date."
        : "System Administrator should evaluate the feature against Contoso in-use / referenced inventory.",
    reasoning: `Digest usage ${row.usage}. Flag kind ${flag?.kind ?? "unknown"}. Citation ${row.sourceUrl}. Unused inventory omitted.`,
    should_create_ticket: true,
    matched_solutions: solutionsFromInventory(row.inventory),
    source: /learn\.microsoft\.com/i.test(row.sourceUrl)
      ? "learn_release_plan"
      : "m365_roadmap",
    ratedBy: "heuristic",
  });
  return ticket;
}

export function ticketToSampleIncident(
  ticket: TicketAnalysis,
  flagId: string,
): SampleIncident {
  return {
    logicalName: "incident",
    displayName: "Case",
    flagId,
    title: ticket.title,
    description: `${ticket.description}\n\nSource: ${ticket.url}`,
    severityName: ticket.severity,
    ticketAnalysisSeverity: ticket.dataverseValue,
    assignedToRole: "System Administrator",
    assignedToQueue: "System Administrator",
    sourceUrl: ticket.url,
    preview: true,
  };
}

export function buildCopilotStudioHandoff(
  rows: ImpactCompareRow[] = IMPACT_COMPARE,
): CopilotStudioHandoff {
  const grounded = rows.filter(
    (row) => row.usage === "in use" || row.usage === "referenced",
  );
  const tickets = grounded.map(digestRowToTicket);
  const incidents = tickets.map((ticket, index) =>
    ticketToSampleIncident(ticket, grounded[index]?.flagId ?? ticket.title),
  );
  return {
    schema: "d365-rag-explorer.copilot-studio.digest.v1",
    environmentId: LIVE_ORG.environmentId,
    makerHome: LIVE_ORG.makerHome,
    filter: "in use | referenced",
    unusedOmitted: true,
    dataverseCalled: false,
    credentials: "none",
    message:
      "No tenant credentials in this explorer. Sample Case/incident preview only — Dataverse is not called.",
    tickets,
    incidents,
  };
}

export function getCopilotStudioHandoff(search: string): {
  handedOff: boolean;
  payload: CopilotStudioHandoff | null;
} {
  if (!isDigestHandoff(search)) {
    return { handedOff: false, payload: null };
  }
  return { handedOff: true, payload: buildCopilotStudioHandoff() };
}
