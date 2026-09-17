import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ToolLesson = {
  tool: string;
  field?: string;
  bad: string;
  fix: string;
  seen: number;
};

const MEMORY_DIR = join(process.cwd(), ".data");
const MEMORY_FILE = join(MEMORY_DIR, "tool-lessons.json");

/** Failures already seen in Ask traces — applied even before a local 400. */
export const SEED_LESSONS: ToolLesson[] = [
  {
    tool: "get_m365_roadmap",
    field: "orderby",
    bad: "rollout",
    fix: "modified desc",
    seen: 1,
  },
  {
    tool: "get_m365_roadmap",
    field: "filter",
    bad: "rollout",
    fix: "status eq 'Rolling out'",
    seen: 1,
  },
  {
    tool: "get_m365_roadmap",
    field: "filter",
    bad: "status",
    fix: "status eq 'Rolling out'",
    seen: 1,
  },
  {
    tool: "get_m365_roadmap",
    field: "filter",
    bad: "status=In development, Launched",
    fix: "status eq 'In development' or status eq 'Launched'",
    seen: 1,
  },
];

function loadStored(): ToolLesson[] {
  try {
    const raw = readFileSync(MEMORY_FILE, "utf8");
    const parsed = JSON.parse(raw) as ToolLesson[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function lessonKey(lesson: ToolLesson) {
  return `${lesson.tool}|${lesson.field ?? ""}|${lesson.bad.toLowerCase()}`;
}

function mergeLessons(stored: ToolLesson[]): ToolLesson[] {
  const byKey = new Map<string, ToolLesson>();
  for (const lesson of SEED_LESSONS) {
    byKey.set(lessonKey(lesson), { ...lesson });
  }
  for (const lesson of stored) {
    const key = lessonKey(lesson);
    const existing = byKey.get(key);
    if (existing) {
      existing.seen = Math.max(existing.seen, lesson.seen);
      existing.fix = lesson.fix || existing.fix;
    } else {
      byKey.set(key, { ...lesson });
    }
  }
  return [...byKey.values()];
}

function load(): ToolLesson[] {
  return mergeLessons(loadStored());
}

function save(lessons: ToolLesson[]) {
  mkdirSync(MEMORY_DIR, { recursive: true });
  const persisted = lessons.filter(
    (lesson) =>
      !SEED_LESSONS.some(
        (seed) => lessonKey(seed) === lessonKey(lesson) && lesson.seen <= seed.seen,
      ),
  );
  writeFileSync(MEMORY_FILE, JSON.stringify(persisted.slice(-40), null, 2));
}

function upsert(next: ToolLesson) {
  const lessons = load();
  const key = lessonKey(next);
  const existing = lessons.find((lesson) => lessonKey(lesson) === key);
  if (existing) {
    existing.seen += 1;
    existing.fix = next.fix || existing.fix;
  } else {
    lessons.push({ ...next, seen: next.seen || 1 });
  }
  save(lessons);
}

function fieldMatches(field: string, current: unknown, bad: string): boolean {
  if (current == null) return false;
  const value = String(current).trim().toLowerCase();
  const target = bad.trim().toLowerCase();
  if (value === target) return true;
  // "rollout desc" should match a stored orderby=rollout lesson, but a valid
  // OData filter starting with "status eq ..." must not match filter=status.
  if (field === "orderby") {
    return value.split(/\s+/)[0] === target;
  }
  return false;
}

function isSubset(bad: Record<string, unknown>, args: Record<string, unknown>) {
  return Object.entries(bad).every(([key, value]) =>
    JSON.stringify(args[key]) === JSON.stringify(value),
  );
}

export function listLessons(): ToolLesson[] {
  return load();
}

export function rememberFailure(
  tool: string,
  args: Record<string, unknown>,
  fix: string,
) {
  let parsedFix: Record<string, unknown> = {};
  try {
    parsedFix = JSON.parse(fix) as Record<string, unknown>;
  } catch {
    parsedFix = {};
  }

  for (const [field, value] of Object.entries(args)) {
    if (value == null || field.startsWith("_") || field === "repaired") continue;
    if (field === "top" || field === "skip" || field === "count") continue;
    const replacement = parsedFix[field];
    if (replacement !== undefined && String(replacement) !== String(value)) {
      upsert({
        tool,
        field,
        bad: String(value),
        fix: String(replacement),
        seen: 1,
      });
    } else if (field === "orderby") {
      upsert({
        tool,
        field,
        bad: String(value),
        fix: "modified desc",
        seen: 1,
      });
    } else if (field === "filter") {
      upsert({
        tool,
        field,
        bad: String(value),
        fix:
          typeof parsedFix.filter === "string"
            ? parsedFix.filter
            : "status eq 'Rolling out'",
        seen: 1,
      });
    }
  }

  upsert({
    tool,
    bad: JSON.stringify(args),
    fix,
    seen: 1,
  });
}

export function applyLessons(
  tool: string,
  args: Record<string, unknown>,
): { args: Record<string, unknown>; notes: string[] } {
  const next = { ...args };
  const notes: string[] = [];
  const lessons = load();
  let touched = false;

  for (const lesson of lessons) {
    if (lesson.tool !== tool) continue;
    if (lesson.field) {
      if (!fieldMatches(lesson.field, next[lesson.field], lesson.bad)) continue;
      const before = String(next[lesson.field]);
      if (lesson.fix) {
        next[lesson.field] = lesson.fix;
      } else {
        delete next[lesson.field];
      }
      notes.push(`${lesson.field} ${before} → ${lesson.fix || "(omit)"}`);
      lesson.seen += 1;
      touched = true;
      continue;
    }
    try {
      const bad = JSON.parse(lesson.bad) as Record<string, unknown>;
      const fix = JSON.parse(lesson.fix) as Record<string, unknown>;
      if (isSubset(bad, next)) {
        Object.assign(next, fix);
        notes.push(`args ${lesson.bad} → ${lesson.fix}`);
        lesson.seen += 1;
        touched = true;
      }
    } catch {
      // ignore malformed stored lessons
    }
  }

  if (touched) save(lessons);
  return { args: next, notes };
}

export function lessonFor(
  tool: string,
  args: Record<string, unknown>,
): Record<string, unknown> | null {
  const applied = applyLessons(tool, args);
  return applied.notes.length ? applied.args : null;
}

export function lessonSummary(): string {
  const lessons = load();
  if (!lessons.length) return "No stored tool failures yet.";
  return lessons
    .slice(-10)
    .map((lesson) => {
      const where = lesson.field ? `${lesson.tool}.${lesson.field}` : lesson.tool;
      return `${where} rejected ${lesson.bad} → use ${lesson.fix || "(omit)"} (seen ${lesson.seen})`;
    })
    .join("\n");
}
