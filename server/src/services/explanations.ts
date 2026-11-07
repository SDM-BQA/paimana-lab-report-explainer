import { z } from "zod";
import rawExplanations from "../data/explanations.json" with { type: "json" };

// Curated, sourced explanation text. Only the developer sets "reviewed": true after checking an
// entry against its source; unreviewed entries are never returned (CLAUDE.md hard rule 2).

const TextOrNone = z.string().trim().min(1).nullable();

const EntrySchema = z.strictObject({
  displayName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).min(1),
  measures: z.string().trim().min(1),
  // null means the source does not describe this direction, so no text is shown for it.
  low: TextOrNone,
  high: TextOrNone,
  source: z.string().trim().regex(/https:\/\/\S+/, "must include an https:// URL"),
  reviewed: z.boolean(),
});

const FileSchema = z.record(z.string().regex(/^[a-z][a-z0-9_]*$/, "keys are lower_snake_case"), EntrySchema);

export type ExplanationEntry = z.infer<typeof EntrySchema>;
export type ExplanationFile = z.infer<typeof FileSchema>;
export type Explanation = ExplanationEntry & { key: string };

export interface ExplanationIndex {
  /** Returns the reviewed entry for a printed test name, or null. Exact alias match only. */
  find(testName: string): Explanation | null;
  readonly reviewedCount: number;
}

export function parseExplanations(raw: unknown): ExplanationFile {
  return FileSchema.parse(raw);
}

/**
 * Lowercases and turns every run of non-letters/digits into one space, so "HDL-C",
 * "hdl c", and "HDL  C" are the same name. No fuzzy matching: a wrong match would attach
 * the wrong explanation, which is worse than none.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Names to try for one printed test name: as printed, without brackets, then each bracket part. */
function candidateNames(testName: string): string[] {
  const bracketed = [...testName.matchAll(/\(([^)]*)\)/g)].map((m) => m[1] ?? "");
  const withoutBrackets = testName.replace(/\([^)]*\)/g, " ");
  return [testName, withoutBrackets, ...bracketed].map(normalizeName).filter((n) => n !== "");
}

export function createExplanationIndex(file: ExplanationFile): ExplanationIndex {
  const byName = new Map<string, string>();
  let reviewedCount = 0;

  for (const [key, entry] of Object.entries(file)) {
    for (const name of [key.replace(/_/g, " "), entry.displayName, ...entry.aliases]) {
      const normalized = normalizeName(name);
      const existing = byName.get(normalized);
      if (existing !== undefined && existing !== key) {
        throw new Error(`Alias "${normalized}" maps to both "${existing}" and "${key}"`);
      }
      byName.set(normalized, key);
    }
    if (entry.reviewed) reviewedCount += 1;
  }

  return {
    reviewedCount,
    find(testName) {
      for (const name of candidateNames(testName)) {
        const key = byName.get(name);
        if (key === undefined) continue;
        const entry = file[key];
        // Unreviewed entries still resolve the name, but are never returned.
        return entry?.reviewed ? { key, ...entry } : null;
      }
      return null;
    },
  };
}

// Loaded once at startup. An invalid file throws here, so the server fails fast.
export const explanationFile: ExplanationFile = parseExplanations(rawExplanations);
export const explanations: ExplanationIndex = createExplanationIndex(explanationFile);
