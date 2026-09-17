export const VALID_WAVES = ["2025wave1", "2025wave2", "2026wave1"] as const;
export type ReleaseWave = (typeof VALID_WAVES)[number];

export const LEARN_SERVICE_SLUGS = [
  {
    slug: "dynamics365-customer-service",
    area: "Customer Service",
  },
  {
    slug: "dynamics365-contact-center",
    area: "Omnichannel",
  },
  {
    slug: "dynamics365-field-service",
    area: "Field Service",
  },
] as const;

export type LearnFeature = {
  id: string;
  title: string;
  url: string;
  area: string;
  wave: ReleaseWave;
  source: "learn_release_plan";
};

const LEARN_HEADERS = {
  Accept: "text/html",
  "User-Agent":
    "Mozilla/5.0 (compatible; d365-rag-explorer/1.0; +https://learn.microsoft.com)",
};

export function plannedFeaturesUrl(wave: ReleaseWave, slug: string): string {
  return `https://learn.microsoft.com/en-us/dynamics365/release-plan/${wave}/service/${slug}/planned-features`;
}

function resolveHref(href: string, pageUrl: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("#")) return pageUrl;
  return new URL(href, pageUrl).toString();
}

function parseFeatureLinks(html: string, pageUrl: string, area: string, wave: ReleaseWave) {
  const features: LearnFeature[] = [];
  const seen = new Set<string>();
  const rowRe =
    /<td[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(html))) {
    const href = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!title || href.includes("planned-features")) continue;
    const url = resolveHref(href, pageUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    const id = url.split("/").filter(Boolean).at(-1) ?? title;
    features.push({
      id: `${wave}:${id}`,
      title,
      url,
      area,
      wave,
      source: "learn_release_plan",
    });
  }
  return features;
}

export async function fetchLearnWave(
  wave: ReleaseWave = "2026wave1",
): Promise<{ wave: ReleaseWave; features: LearnFeature[]; errors: string[] }> {
  const features: LearnFeature[] = [];
  const errors: string[] = [];
  await Promise.all(
    LEARN_SERVICE_SLUGS.map(async ({ slug, area }) => {
      const url = plannedFeaturesUrl(wave, slug);
      try {
        const response = await fetch(url, {
          headers: LEARN_HEADERS,
          cache: "no-store",
        });
        if (!response.ok) {
          errors.push(`${slug}: HTTP ${response.status}`);
          return;
        }
        const html = await response.text();
        features.push(...parseFeatureLinks(html, url, area, wave));
      } catch (error) {
        errors.push(
          `${slug}: ${error instanceof Error ? error.message : "fetch failed"}`,
        );
      }
    }),
  );
  return { wave, features, errors };
}
