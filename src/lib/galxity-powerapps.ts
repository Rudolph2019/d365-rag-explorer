import galxitySchema from "@/data/cr458_galxityknowledge.schema.json";
import knowledgeSpec from "@/data/galxity-copilot-studio-knowledge.json";
import { GALXITY, GALXITY_ARTICLES, type GalxityArticle } from "@/lib/galxity";
import { LIVE_ORG } from "@/lib/live-org";

export const GALXITY_KNOWLEDGE_SCHEMA = galxitySchema;
export const GALXITY_COPILOT_STUDIO_KNOWLEDGE = knowledgeSpec;
export const GALXITY_TABLE_LOGICAL_NAME = galxitySchema.logicalName;
export const GALXITY_MAKER_HOME = LIVE_ORG.makerHome;

export type GalxityDataverseRow = {
  cr458_articleid: string;
  cr458_title: string;
  cr458_slug: string;
  cr458_summary: string;
  cr458_body: string;
  cr458_area: string;
  cr458_tags: string;
  cr458_related: string;
  cr458_topic: "Galxity";
};

export type GalxityPowerAppsHandoff = {
  schema: "d365-rag-explorer.galxity.powerapps.v1";
  environmentId: string;
  makerHome: string;
  makerTables: string;
  orgHost: string;
  dataverseCalled: false;
  credentials: "none";
  tableLogicalName: typeof GALXITY_TABLE_LOGICAL_NAME;
  displayName: string;
  product: string;
  articleCount: number;
  rows: GalxityDataverseRow[];
  makerChecklist: string[];
  agentInstructions: string;
  exports: {
    csv: string;
    json: string;
    markdownIndex: string;
    zip: string;
  };
  message: string;
};

function bodyText(article: GalxityArticle) {
  return article.body.join("\n\n");
}

export function articleToDataverseRow(article: GalxityArticle): GalxityDataverseRow {
  return {
    cr458_articleid: article.id,
    cr458_title: article.title,
    cr458_slug: article.slug,
    cr458_summary: article.summary,
    cr458_body: bodyText(article),
    cr458_area: article.area,
    cr458_tags: article.tags.join(", "),
    cr458_related: article.related.join(", "),
    cr458_topic: "Galxity",
  };
}

export function galxityDataverseRows(
  articles: GalxityArticle[] = GALXITY_ARTICLES,
): GalxityDataverseRow[] {
  return articles.map(articleToDataverseRow);
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function galxityCsv(articles: GalxityArticle[] = GALXITY_ARTICLES) {
  const header = [
    "cr458_articleid",
    "cr458_title",
    "cr458_slug",
    "cr458_summary",
    "cr458_body",
    "cr458_area",
    "cr458_tags",
    "cr458_related",
    "cr458_topic",
  ];
  const lines = [header.join(",")];
  for (const row of galxityDataverseRows(articles)) {
    lines.push(
      [
        row.cr458_articleid,
        row.cr458_title,
        row.cr458_slug,
        row.cr458_summary,
        row.cr458_body,
        row.cr458_area,
        row.cr458_tags,
        row.cr458_related,
        row.cr458_topic,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function articleToMarkdown(article: GalxityArticle) {
  const tags = article.tags.map((tag) => `\`${tag}\``).join(", ");
  const related = article.related.join(", ");
  return [
    `# ${article.title}`,
    "",
    `**Id:** ${article.id}  `,
    `**Area:** ${article.area}  `,
    `**Topic:** ${GALXITY.org}  `,
    `**Tags:** ${tags}`,
    "",
    article.summary,
    "",
    ...article.body.flatMap((para) => [para, ""]),
    `**Related:** ${related}`,
    "",
  ].join("\n");
}

export function galxityMarkdownPack(
  articles: GalxityArticle[] = GALXITY_ARTICLES,
): Record<string, string> {
  const index = [
    `# ${GALXITY.product} Knowledge`,
    "",
    GALXITY.tagline,
    "",
    ...articles.map(
      (article) =>
        `- **${article.id}** · [${article.title}](./${article.slug}.md) · ${article.area}`,
    ),
    "",
  ].join("\n");

  const files: Record<string, string> = { "README.md": index };
  for (const article of articles) {
    files[`${article.slug}.md`] = articleToMarkdown(article);
  }
  return files;
}

export function buildGalxityPowerAppsHandoff(): GalxityPowerAppsHandoff {
  const rows = galxityDataverseRows();
  return {
    schema: "d365-rag-explorer.galxity.powerapps.v1",
    environmentId: LIVE_ORG.environmentId,
    makerHome: LIVE_ORG.makerHome,
    makerTables: LIVE_ORG.makerTables,
    orgHost: LIVE_ORG.orgHost,
    dataverseCalled: false,
    credentials: "none",
    tableLogicalName: GALXITY_TABLE_LOGICAL_NAME,
    displayName: galxitySchema.displayName,
    product: GALXITY.product,
    articleCount: rows.length,
    rows,
    makerChecklist: [...knowledgeSpec.makerChecklist],
    agentInstructions: knowledgeSpec.agentInstructions.system,
    exports: {
      csv: "/api/galxity/export?format=csv",
      json: "/api/galxity/export?format=json",
      markdownIndex: "/api/galxity/export?format=md",
      zip: "/api/galxity/export?format=zip",
    },
    message:
      "Spec-only Power Apps handoff. Create cr458_galxityknowledge in Maker, import the CSV, add Knowledge in Copilot Studio. This explorer does not call Dataverse.",
  };
}
