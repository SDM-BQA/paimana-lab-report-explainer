// Turns a printed result ("14.2", "7,200", "Positive", "< 0.5") into a number, or null.
// Code, not the LLM, does this conversion (docs/DECISIONS.md D7): the model only copies text.

const NUMBER = /^-?\d+(?:\.\d+)?$/;

export function parseNumericValue(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  // Same thousands-separator rule as the range parser: "7,200" -> "7200"; "13,5" stays invalid.
  const text = raw.trim().replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
  if (!NUMBER.test(text)) return null; // words, qualifiers like "<0.5", or anything ambiguous
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
