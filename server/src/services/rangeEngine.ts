import { parseRange } from "./rangeParser.js";

// The only place that decides a flag. Pure and deterministic: no I/O, no LLM, same input ->
// same output. See docs/DECISIONS.md D4 for the rules.

export type Status = "low" | "normal" | "high" | "unchecked";

export interface EngineInput {
  value: number | null;
  unit: string | null;
  printedRange: string | null;
}

export interface EngineResult {
  status: Status;
  range: { low: number | null; high: number | null } | null;
  reason: string;
}

export const REASONS = {
  normal: "Within printed range",
  low: "Below printed range",
  high: "Above printed range",
  noValue: "No numeric value to check",
  missingRange: "No printed range on the report",
  unparseableRange: "Could not read the printed range",
  unitMismatch: "Unit mismatch between result and printed range",
} as const;

export function evaluate(input: EngineInput): EngineResult {
  const { value } = input;
  if (value === null || !Number.isFinite(value)) return unchecked(REASONS.noValue);

  const parsed = parseRange(input.printedRange);
  if (!parsed.ok) {
    return unchecked(parsed.kind === "missing" ? REASONS.missingRange : REASONS.unparseableRange);
  }

  // Only a real contradiction blocks the check. No unit on either side is not a contradiction.
  if (parsed.unit !== null && input.unit !== null && !sameUnit(parsed.unit, input.unit)) {
    return unchecked(REASONS.unitMismatch);
  }

  const range = { low: parsed.low, high: parsed.high };
  // Limits are inclusive: a value equal to a printed limit is normal.
  if (range.low !== null && value < range.low) return { status: "low", range, reason: REASONS.low };
  if (range.high !== null && value > range.high) return { status: "high", range, reason: REASONS.high };
  return { status: "normal", range, reason: REASONS.normal };
}

function sameUnit(a: string, b: string): boolean {
  return normalizeUnit(a) === normalizeUnit(b);
}

// Spelling differences only (case, spaces, micro sign vs Greek mu vs "u"). No conversion:
// mg/dL and mmol/L stay different on purpose.
function normalizeUnit(unit: string): string {
  return unit.toLowerCase().replace(/\s+/g, "").replace(/[µμ]/g, "u");
}

function unchecked(reason: string): EngineResult {
  return { status: "unchecked", range: null, reason };
}
