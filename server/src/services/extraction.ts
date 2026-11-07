import { LlmOutputSchema, MAX_ROWS, type ExtractResponse, type Row } from "../schemas.js";
import type { LlmClient, UploadedFile } from "./llm.js";
import { parseNumericValue } from "./values.js";

/** The model answered, but not with valid JSON in the expected shape. Maps to HTTP 502. */
export class LlmOutputError extends Error {
  override name = "LlmOutputError";
}

const clip = (text: string | null, max: number) => (text === null ? null : text.trim().slice(0, max) || null);

/** Asks the LLM to read the file, then validates and normalizes its answer. Never trusts it. */
export async function extractRows(llm: LlmClient, file: UploadedFile): Promise<ExtractResponse> {
  const raw = await llm.extractRowsJson(file);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new LlmOutputError("Model output was not JSON");
  }
  const parsed = LlmOutputSchema.safeParse(json);
  if (!parsed.success) throw new LlmOutputError("Model output did not match the schema");

  const warnings: string[] = [];
  let modelRows = parsed.data.rows.filter((r) => r.testName.trim() !== "");
  if (modelRows.length < parsed.data.rows.length) warnings.push("Some rows had no test name and were skipped.");
  if (modelRows.length > MAX_ROWS) {
    modelRows = modelRows.slice(0, MAX_ROWS);
    warnings.push(`Only the first ${MAX_ROWS} rows were kept.`);
  }
  if (modelRows.length === 0) warnings.push("No test results were found. You can enter values by hand.");

  const rows: Row[] = modelRows.map((r, i) => {
    const rawValue = clip(r.rawValue, 120);
    return {
      id: `r${i + 1}`,
      testName: r.testName.trim().slice(0, 120),
      rawValue,
      value: parseNumericValue(rawValue),
      unit: clip(r.unit, 40),
      printedRange: clip(r.printedRange, 120),
    };
  });
  return { rows, warnings };
}
