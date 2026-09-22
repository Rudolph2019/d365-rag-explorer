import agentSpec from "@/data/copilot-studio-agent.json";
import releaseTicketSchema from "@/data/cr458_releaseticket.schema.json";
import { isDigestHandoff } from "@/lib/eval-handoff";
import {
  applyTicketGates,
  CHANGE_TYPE,
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

export const RELEASE_TICKET_SCHEMA = releaseTicketSchema;
export const RELEASE_TICKET_LOGICAL_NAME = releaseTicketSchema.logicalName;
export const RELEASE_TICKET_DISPLAY_NAME = releaseTicketSchema.displayName;

export const COPILOT_STUDIO_AGENT = agentSpec;

export type SampleReleaseTicket = {
  logicalName: "cr458_releaseticket";
  displayName: "Release Ticket";
  flagId: string;
  title: string;
  description: string;
  url: string;
  area: string;
  severityName: TicketAnalysis["severity"];
  ticketAnalysisSeverity: number;
  changeType: TicketAnalysis["change_type"];
  changeTypeValue: number;
  effectiveDate: string;
  sourceUrl: string;
  assignedToRole: "System Administrator";
  assignedToOwner: "System Administrator";
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
  tableLogicalName: "cr458_releaseticket";
  createdViaWebApi: false;
  auth: "SKIPPED";
  message: string;
  tickets: TicketAnalysis[];
  releaseTickets: SampleReleaseTicket[];
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

export function ticketToSampleReleaseTicket(
  ticket: TicketAnalysis,
  flagId: string,
): SampleReleaseTicket {
  return {
    logicalName: "cr458_releaseticket",
    displayName: "Release Ticket",
    flagId,
    title: ticket.title,
    description: ticket.description,
    url: ticket.url,
    area: ticket.area,
    severityName: ticket.severity,
    ticketAnalysisSeverity: ticket.dataverseValue,
    changeType: ticket.change_type,
    changeTypeValue: CHANGE_TYPE[ticket.change_type].dataverseValue,
    effectiveDate: ticket.effective_date,
    sourceUrl: ticket.url,
    assignedToRole: "System Administrator",
    assignedToOwner: "System Administrator",
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
  const releaseTickets = tickets.map((ticket, index) =>
    ticketToSampleReleaseTicket(ticket, grounded[index]?.flagId ?? ticket.title),
  );
  return {
    schema: "d365-rag-explorer.copilot-studio.digest.v1",
    environmentId: LIVE_ORG.environmentId,
    makerHome: LIVE_ORG.makerHome,
    filter: "in use | referenced",
    unusedOmitted: true,
    dataverseCalled: false,
    credentials: "none",
    tableLogicalName: "cr458_releaseticket",
    createdViaWebApi: false,
    auth: "SKIPPED",
    message:
      "No tenant credentials in this explorer. Sample cr458_releaseticket preview only — Dataverse is not called. Maker table exists; AUTH SKIPPED for this app.",
    tickets,
    releaseTickets,
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

export type ReleaseTicketWiringCheck = {
  id: string;
  pass: boolean;
  detail: string;
};

export function scoreReleaseTicketWiring(): ReleaseTicketWiringCheck[] {
  const logical = releaseTicketSchema.logicalName;
  const agentTable = agentSpec.assignment.entity;
  const tool = agentSpec.tools.find((item) => item.id === "create-releaseticket");
  const severityValues = releaseTicketSchema.choiceSets
    .find((set) => set.columnLogicalName === "cr458_severity")
    ?.options.map((option) => option.value);
  const changeValues = releaseTicketSchema.choiceSets
    .find((set) => set.columnLogicalName === "cr458_change_type")
    ?.options.map((option) => option.value);
  const requiredColumns = [
    "cr458_description",
    "cr458_url",
    "cr458_area",
    "cr458_severity",
    "cr458_effective_date",
    "cr458_change_type",
    "cr458_source_url",
  ];
  const columnNames = releaseTicketSchema.columns.map((column) => column.logicalName);
  const hasPrimaryCandidate =
    columnNames.includes("cr458_title") && columnNames.includes("cr458_name");

  return [
    {
      id: "logical-name",
      pass: logical === "cr458_releaseticket" && agentTable === "cr458_releaseticket",
      detail: `schema ${logical}; agent ${agentTable}`,
    },
    {
      id: "not-incident",
      pass: agentTable !== "incident" && tool?.table === "cr458_releaseticket",
      detail: `create tool table ${tool?.table ?? "missing"}`,
    },
    {
      id: "severity-choice",
      pass:
        JSON.stringify(severityValues) ===
        JSON.stringify([644640000, 644640001, 644640002, 644640003]) &&
        SEVERITY.Critical.dataverseValue === 644640000,
      detail: `severity values ${severityValues?.join(",") ?? "missing"}`,
    },
    {
      id: "change-type-choice",
      pass:
        JSON.stringify(changeValues) === JSON.stringify([644640000, 644640001]) &&
        CHANGE_TYPE.Feature.dataverseValue === 644640000,
      detail: `change type values ${changeValues?.join(",") ?? "missing"}`,
    },
    {
      id: "no-legacy-choice-ints",
      pass: ![
        ...(severityValues ?? []),
        ...(changeValues ?? []),
        SEVERITY.Critical.dataverseValue,
        CHANGE_TYPE.Feature.dataverseValue,
      ].some((value) => value >= 211460000 && value <= 211460011),
      detail: "Maker choice ints 644640000+; 211460000/211460010 unused",
    },
    {
      id: "columns",
      pass:
        requiredColumns.every((name) => columnNames.includes(name)) &&
        hasPrimaryCandidate,
      detail: `columns ${columnNames.join(",")}`,
    },
    {
      id: "auth-skipped",
      pass:
        releaseTicketSchema.createdViaWebApi === false &&
        releaseTicketSchema.auth === "SKIPPED",
      detail: `createdViaWebApi ${String(releaseTicketSchema.createdViaWebApi)}; auth ${releaseTicketSchema.auth}`,
    },
    {
      id: "no-case-queue",
      pass: releaseTicketSchema.assignment.queue === null && agentSpec.assignment.queue === null,
      detail: "Owner is System Administrator; Case queue is unused",
    },
  ];
}
