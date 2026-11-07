import {
  RephraseOutputSchema,
  type AnalyzeRequest,
  type AnalyzeResponse,
  type AnalyzeResult,
  type Explanation,
} from "../schemas.js";
import type { ExplanationIndex } from "./explanations.js";
import type { LlmClient, RephraseItem } from "./llm.js";
import { evaluate } from "./rangeEngine.js";
import type { LintResult, Language } from "./safetyLint.js";
import { parseNumericValue } from "./values.js";

// Added by code to every analyze response, never by the model (CLAUDE.md hard rule 7).
export const DISCLAIMER =
  "Paimana is not medical advice. It does not diagnose conditions or suggest treatment. " +
  "Each value is compared only with the range printed on your report, and a value outside that " +
  "range is not always a problem. Please talk to a doctor about your results.";

export const HINDI_FALLBACK_WARNING =
  "A Hindi version was not available for some explanations, so they are shown in English.";

export interface ExplainDeps {
  llm: LlmClient;
  explanations: ExplanationIndex;
  lint: (text: string, language: Language) => LintResult;
}

/** Flags every row with code, attaches reviewed explanations to low/high rows, optionally in Hindi. */
export async function analyzeRows(request: AnalyzeRequest, deps: ExplainDeps): Promise<AnalyzeResponse> {
  const results: AnalyzeResult[] = request.rows.map((row) => {
    // D10: always derive the number from the text the user reviewed; never trust a sent `value`.
    const value = parseNumericValue(row.rawValue);
    const verdict = evaluate({ value, unit: row.unit, printedRange: row.printedRange }); // the only place a flag comes from
    return {
      id: row.id,
      testName: row.testName,
      canonicalKey: deps.explanations.keyFor(row.testName),
      value,
      unit: row.unit,
      status: verdict.status,
      range: verdict.range,
      reason: verdict.reason,
      explanation: curatedExplanation(row.testName, verdict.status, deps.explanations),
    };
  });

  const warnings: string[] = [];
  if (request.language === "hi") {
    const usedFallback = await translateToHindi(results, deps);
    if (usedFallback) warnings.push(HINDI_FALLBACK_WARNING);
  }
  return { results, warnings, disclaimer: DISCLAIMER };
}

/** Reviewed English text for a flagged row, or null. Normal and unchecked rows get none. */
function curatedExplanation(testName: string, status: AnalyzeResult["status"], index: ExplanationIndex): Explanation | null {
  if (status !== "low" && status !== "high") return null;
  const entry = index.find(testName); // returns reviewed entries only
  const direction = entry?.interpretation[status];
  if (!entry || !direction) return null;
  return { text: `${entry.measures} ${direction}`, language: "en", origin: "curated" };
}

/**
 * Replaces curated English explanations with linted Hindi rewrites, in place.
 * Any failure (model error, bad JSON, missing item, lint rejection) keeps the curated English text.
 * Returns true if at least one explanation fell back to English.
 */
async function translateToHindi(results: AnalyzeResult[], deps: ExplainDeps): Promise<boolean> {
  const items: RephraseItem[] = results.flatMap((r) => (r.explanation ? [{ id: r.id, text: r.explanation.text }] : []));
  if (items.length === 0) return false;

  let rewritten = new Map<string, string>();
  try {
    const parsed = RephraseOutputSchema.safeParse(JSON.parse(await deps.llm.rephraseJson(items, "hi")));
    if (parsed.success) rewritten = new Map(parsed.data.items.map((i) => [i.id, i.text.trim()]));
  } catch {
    // Model down, quota, or non-JSON: every item keeps its curated English text.
  }

  let fellBack = false;
  for (const result of results) {
    if (!result.explanation) continue;
    const text = rewritten.get(result.id);
    if (text !== undefined && deps.lint(text, "hi").ok) {
      result.explanation = { text, language: "hi", origin: "rephrased" };
    } else {
      fellBack = true;
    }
  }
  return fellBack;
}
