export type SolutionComponent = {
  name: string;
  type: string;
  area: string;
};

export type SolutionInventory = {
  solutions: string[];
  current_version: string;
  deployment_type: "online" | "onprem" | "ifd";
  region: string;
  custom_entities: string[];
  components: SolutionComponent[];
  active_users?: number;
  integrations?: string[];
  notes?: string;
};

export const SOLUTION_AREA_MAP: Record<string, string> = {
  msdynce_CustomerService: "Customer Service",
  msdyn_CustomerServiceHub: "Customer Service",
  msdyn_IncidentManagement: "Customer Service",
  msdyn_Service: "Customer Service",
  msdyn_Omnichannel: "Omnichannel",
  msdyn_LiveChat: "Omnichannel",
  msdyn_ContactCenter: "Omnichannel",
  msdynce_ContactCenter: "Omnichannel",
  msdyn_FieldService: "Field Service",
  FieldService: "Field Service",
  msdynce_Sales: "Sales",
  msdyn_SalesHub: "Sales",
  msdynce_Marketing: "Marketing",
  msdyn_ProjectOperations: "Project Operations",
};

export const ALWAYS_RELEVANT_AREAS = [
  "Power Platform",
  "Dataverse",
  "Security",
  "Compliance",
  "Licensing",
] as const;

export const SAMPLE_INVENTORY: SolutionInventory = {
  solutions: [
    "msdynce_CustomerService",
    "msdyn_CustomerServiceHub",
    "msdyn_Omnichannel",
    "msdyn_FieldService",
    "msdynce_Sales",
  ],
  current_version: "9.2.26082.0012",
  deployment_type: "online",
  region: "North America",
  custom_entities: ["cr_prioritycase", "cr_fieldticket", "cr_entitlementnote"],
  components: [
    {
      name: "cr_prioritycase",
      type: "entity",
      area: "Customer Service",
    },
    {
      name: "cr_CaseSummaryForm",
      type: "form",
      area: "Customer Service",
    },
    {
      name: "cr_OmniChatWidget",
      type: "webresource",
      area: "Omnichannel",
    },
    {
      name: "cr_fieldticket",
      type: "entity",
      area: "Field Service",
    },
    {
      name: "cr_WorkOrderRibbon",
      type: "ribbon",
      area: "Field Service",
    },
  ],
  active_users: 186,
  integrations: ["Azure AI Search", "Microsoft 365 Copilot", "Power Automate"],
  notes:
    "Customer Service + Omnichannel production, Field Service for a 40-tech dispatch ring. Custom case and work-order entities sit on first-party CS/FS.",
};

export function areasForSolutions(uniqueNames: string[]): string[] {
  const areas = new Set<string>();
  for (const name of uniqueNames) {
    const area = SOLUTION_AREA_MAP[name];
    if (area) areas.add(area);
  }
  for (const area of ALWAYS_RELEVANT_AREAS) areas.add(area);
  return [...areas];
}

export function parseUniqueNames(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}
