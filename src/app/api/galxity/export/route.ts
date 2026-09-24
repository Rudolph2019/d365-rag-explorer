import { NextRequest, NextResponse } from "next/server";
import {
  articleToMarkdown,
  buildGalxityPowerAppsHandoff,
  galxityCsv,
  galxityMarkdownPack,
} from "@/lib/galxity-powerapps";
import { GALXITY_ARTICLES, getGalxityArticle } from "@/lib/galxity";

export const runtime = "nodejs";

function crc32(buf: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i]!;
    for (let j = 0; j < 8; j += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Minimal store-only ZIP (no compression) for markdown pack download. */
function buildZip(files: Record<string, string>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, "utf8");
    const data = Buffer.from(text, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    localParts.push(local, data);
    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, end]);
}

export async function GET(request: NextRequest) {
  const format = (request.nextUrl.searchParams.get("format") ?? "json").toLowerCase();
  const id = request.nextUrl.searchParams.get("id") ?? undefined;

  if (format === "csv") {
    return new NextResponse(galxityCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="cr458_galxityknowledge.csv"',
      },
    });
  }

  if (format === "json") {
    return NextResponse.json(buildGalxityPowerAppsHandoff(), {
      headers: {
        "Content-Disposition":
          'attachment; filename="galxity-powerapps-handoff.json"',
      },
    });
  }

  if (format === "md") {
    if (id) {
      const article = getGalxityArticle(id);
      if (!article) {
        return NextResponse.json({ error: "Unknown article id" }, { status: 404 });
      }
      return new NextResponse(articleToMarkdown(article), {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${article.slug}.md"`,
        },
      });
    }
    const pack = galxityMarkdownPack();
    const combined = [
      pack["README.md"],
      "",
      ...GALXITY_ARTICLES.map(
        (article) => `---\n\n${pack[`${article.slug}.md`] ?? ""}`,
      ),
    ].join("\n");
    return new NextResponse(combined, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="galxity-knowledge.md"',
      },
    });
  }

  if (format === "zip" || format === "pack") {
    const files = galxityMarkdownPack();
    if (format === "pack") {
      return NextResponse.json(files);
    }
    const zip = buildZip(files);
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          'attachment; filename="galxity-knowledge.md.zip"',
      },
    });
  }

  return NextResponse.json(
    {
      error: "Unsupported format",
      formats: ["csv", "json", "md", "zip", "pack"],
    },
    { status: 400 },
  );
}
