// Turns a printed reference range ("13.0 - 17.0 g/dL", "< 200", "> 40") into numeric limits.
// Principle: never guess. Anything that does not match a known shape exactly is "unparseable",
// and the engine then reports the row as unchecked instead of inventing a flag.

// Literal rule (D4): "<" and ">" are strict; "<=", "≤", "up to", ">=", "≥", and both ends of a
// two-sided range ("13 - 17") include the limit. The flags are true when a side has no limit.
export type ParsedRange =
  | {
      ok: true;
      low: number | null;
      high: number | null;
      lowInclusive: boolean;
      highInclusive: boolean;
      unit: string | null;
    }
  | { ok: false; kind: "missing" | "unparseable"; reason: string };

const MAX_LENGTH = 100;
const NUM = String.raw`-?\d+(?:\.\d+)?`;

// `(.*)` captures whatever follows the numbers; it must then pass the unit check below.
const TWO_SIDED = new RegExp(String.raw`^(${NUM})\s*(?:-|to)\s*(${NUM})(.*)$`, "i");
// Group 1 is the operator, so strict "<" / ">" can be told apart from the inclusive forms.
const UPPER_ONLY = new RegExp(String.raw`^(<=|<|≤|up\s*to)\s*(${NUM})(.*)$`, "i");
const LOWER_ONLY = new RegExp(String.raw`^(>=|>|≥)\s*(${NUM})(.*)$`, "i");

// A unit is a single token of letters, digits, and unit symbols (g/dL, /µL, x10^3/uL, %).
const UNIT_CHARS = /^[\p{L}\d%/^.*·×-]+$/u;
const HAS_UNIT_SYMBOL = /[\p{L}%]/u;

export function parseRange(text: string | null | undefined): ParsedRange {
  if (text === null || text === undefined || text.trim() === "") {
    return { ok: false, kind: "missing", reason: "No printed range" };
  }
  if (text.length > MAX_LENGTH) return unparseable("Range text is too long");

  const s = normalize(text);

  let match = TWO_SIDED.exec(s);
  if (match) {
    const low = Number(match[1]);
    const high = Number(match[2]);
    if (low > high) return unparseable("Low limit is greater than high limit");
    return withUnit({ low, high, lowInclusive: true, highInclusive: true }, match[3]);
  }

  match = UPPER_ONLY.exec(s);
  if (match) {
    const inclusive = match[1] !== "<";
    return withUnit({ low: null, high: Number(match[2]), lowInclusive: true, highInclusive: inclusive }, match[3]);
  }

  match = LOWER_ONLY.exec(s);
  if (match) {
    const inclusive = match[1] !== ">";
    return withUnit({ low: Number(match[2]), high: null, lowInclusive: inclusive, highInclusive: true }, match[3]);
  }

  return unparseable("Range text is not in a recognised format");
}

function normalize(text: string): string {
  return (
    text
      .trim()
      // en dash, em dash, and minus sign all act as a hyphen on printed reports
      .replace(/[–—−]/g, "-")
      // thousands separators: "11,000" -> "11000". A decimal comma ("13,5") is left alone and
      // therefore fails to parse, because it is ambiguous.
      .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
  );
}

type Limits = { low: number | null; high: number | null; lowInclusive: boolean; highInclusive: boolean };

function withUnit(limits: Limits, rest: string | undefined): ParsedRange {
  const unit = parseUnit(rest ?? "");
  if (unit === undefined) return unparseable("Unexpected text after the range");
  return { ok: true, ...limits, unit };
}

/** Returns the unit, null when there is none, or undefined when the trailing text is not a unit. */
function parseUnit(rest: string): string | null | undefined {
  const compact = rest.trim().replace(/\s*\/\s*/g, "/");
  if (compact === "") return null;
  if (!UNIT_CHARS.test(compact) || !HAS_UNIT_SYMBOL.test(compact)) return undefined;
  return compact;
}

function unparseable(reason: string): ParsedRange {
  return { ok: false, kind: "unparseable", reason };
}
