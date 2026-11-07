import { z } from "zod";
import rawDenylist from "../data/denylist.json" with { type: "json" };

// Checks AI-rewritten explanation text before any user sees it. On any failure the caller falls
// back to the reviewed English text. Crude by design: it may reject a fine sentence, and that is
// the safe direction to be wrong in.

const DenylistSchema = z.object({
  _about: z.string(),
  en: z.array(z.string().min(1)),
  hi: z.array(z.string().min(1)),
});

export type Language = "en" | "hi";

export interface LintResult {
  ok: boolean;
  problems: string[];
}

const MAX_WORDS = 80;
const MAX_CHARS = 600;

export function createSafetyLint(raw: unknown) {
  const list = DenylistSchema.parse(raw);
  const english = list.en.map((p) => new RegExp(`\\b(?:${p})\\b`, "iu"));
  const hindi = list.hi;

  return function safetyLint(text: string, language: Language): LintResult {
    const problems: string[] = [];
    const trimmed = text.trim();
    if (trimmed === "") problems.push("empty");
    if (trimmed.length > MAX_CHARS || trimmed.split(/\s+/).length > MAX_WORDS) problems.push("too long");
    // Curated text never contains numbers; a number in rewritten text could be a dose or a range.
    if (/[\d०-९]/u.test(trimmed)) problems.push("contains a number");
    for (const re of english) if (re.test(trimmed)) problems.push(`denied: ${re.source}`);
    // English patterns run on Hindi output too, in case the model mixes languages.
    if (language === "hi") {
      for (const word of hindi) if (trimmed.includes(word)) problems.push(`denied: ${word}`);
      if (!mostlyDevanagari(trimmed)) problems.push("not in Hindi");
    }
    return { ok: problems.length === 0, problems };
  };
}

/** At least 60% of letters are Devanagari, so an untranslated English answer is rejected. */
function mostlyDevanagari(text: string): boolean {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return false;
  const devanagari = letters.filter((c) => /[ऀ-ॿ]/u.test(c)).length;
  return devanagari / letters.length >= 0.6;
}

export const safetyLint = createSafetyLint(rawDenylist);
