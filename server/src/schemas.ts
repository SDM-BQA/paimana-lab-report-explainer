import { z } from "zod";

// Shared shapes. Types come from z.infer so validation and types cannot drift.

export const MAX_ROWS = 60;
const SHORT = 120;

/** What the model must return. Unknown keys (for example a patient name) are stripped by zod. */
export const LlmRowSchema = z.object({
  testName: z.string(),
  rawValue: z.string().nullable(),
  unit: z.string().nullable(),
  printedRange: z.string().nullable(),
});
export const LlmOutputSchema = z.object({ rows: z.array(LlmRowSchema) });

/** A row as the API returns it from /api/extract and accepts in /api/analyze. */
export const RowSchema = z.strictObject({
  id: z.string().min(1).max(20),
  testName: z.string().trim().min(1).max(SHORT),
  rawValue: z.string().max(SHORT).nullable(),
  value: z.number().finite().nullable(),
  unit: z.string().max(40).nullable(),
  printedRange: z.string().max(SHORT).nullable(),
});
export type Row = z.infer<typeof RowSchema>;

export interface ExtractResponse {
  rows: Row[];
  warnings: string[];
}

export const LanguageSchema = z.enum(["en", "hi"]);

export const AnalyzeRequestSchema = z.strictObject({
  language: LanguageSchema,
  rows: z.array(RowSchema).min(1).max(MAX_ROWS),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/** What the model must return when rewriting explanations. */
export const RephraseOutputSchema = z.object({
  items: z.array(z.object({ id: z.string(), text: z.string() })),
});

export interface Explanation {
  text: string;
  language: "en" | "hi";
  origin: "curated" | "rephrased";
}

export interface AnalyzeResult {
  id: string;
  testName: string;
  canonicalKey: string | null;
  value: number | null;
  unit: string | null;
  status: "low" | "normal" | "high" | "unchecked";
  range: { low: number | null; high: number | null } | null;
  reason: string;
  explanation: Explanation | null;
}

export interface AnalyzeResponse {
  results: AnalyzeResult[];
  warnings: string[];
  disclaimer: string;
}
