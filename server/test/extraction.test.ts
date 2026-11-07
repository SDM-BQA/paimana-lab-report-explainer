import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { extractRows, LlmOutputError } from "../src/services/extraction.js";
import type { LlmClient } from "../src/services/llm.js";

const file = { buffer: Buffer.from("%PDF-1.7"), mimeType: "application/pdf" as const };
const llmReturning = (text: string): LlmClient => ({ extractRowsJson: async () => text, rephraseJson: async () => "{}" });
const row = (testName: string, rawValue: string | null, unit: string | null = null, printedRange: string | null = null) => ({
  testName,
  rawValue,
  unit,
  printedRange,
});

describe("extractRows", () => {
  test("adds ids and computes numeric values in code", async () => {
    const out = await extractRows(
      llmReturning(JSON.stringify({ rows: [row("Hemoglobin", "14.2", "g/dL", "13.0 - 17.0"), row("Urine Protein", "Positive")] })),
      file,
    );
    assert.deepEqual(out.rows, [
      { id: "r1", testName: "Hemoglobin", rawValue: "14.2", value: 14.2, unit: "g/dL", printedRange: "13.0 - 17.0" },
      { id: "r2", testName: "Urine Protein", rawValue: "Positive", value: null, unit: null, printedRange: null },
    ]);
    assert.deepEqual(out.warnings, []);
  });

  test("drops unknown keys such as patient details", async () => {
    const out = await extractRows(
      llmReturning(JSON.stringify({ patientName: "Test Person", rows: [{ ...row("TSH", "2.1"), age: 40, sex: "F" }] })),
      file,
    );
    assert.equal(JSON.stringify(out).includes("Test Person"), false);
    assert.deepEqual(Object.keys(out.rows[0]!).sort(), ["id", "printedRange", "rawValue", "testName", "unit", "value"]);
  });

  test("ignores a numeric value the model invents; code computes it from rawValue", async () => {
    const out = await extractRows(llmReturning(JSON.stringify({ rows: [{ ...row("Hb", "14.2"), value: 99 }] })), file);
    assert.equal(out.rows[0]!.value, 14.2);
  });

  test("empty strings become null and whitespace is trimmed", async () => {
    const out = await extractRows(llmReturning(JSON.stringify({ rows: [row("  Hb  ", " 14 ", "", "  ")] })), file);
    assert.deepEqual(out.rows[0], { id: "r1", testName: "Hb", rawValue: "14", value: 14, unit: null, printedRange: null });
  });

  test("rows without a test name are skipped with a warning", async () => {
    const out = await extractRows(llmReturning(JSON.stringify({ rows: [row("", "1"), row("Hb", "14")] })), file);
    assert.equal(out.rows.length, 1);
    assert.equal(out.rows[0]!.id, "r1");
    assert.equal(out.warnings.length, 1);
  });

  test("no rows gives a helpful warning", async () => {
    const out = await extractRows(llmReturning('{"rows":[]}'), file);
    assert.deepEqual(out.rows, []);
    assert.match(out.warnings[0]!, /enter values by hand/);
  });

  test("more than 60 rows are cut to 60 with a warning", async () => {
    const many = Array.from({ length: 75 }, (_, i) => row(`Test ${i}`, "1"));
    const out = await extractRows(llmReturning(JSON.stringify({ rows: many })), file);
    assert.equal(out.rows.length, 60);
    assert.match(out.warnings.join(" "), /first 60/);
  });

  test("non-JSON output is rejected", async () => {
    await assert.rejects(extractRows(llmReturning("Sure! Here are the rows:"), file), LlmOutputError);
  });

  test("JSON in the wrong shape is rejected", async () => {
    await assert.rejects(extractRows(llmReturning('{"results":[]}'), file), LlmOutputError);
    await assert.rejects(extractRows(llmReturning('{"rows":[{"testName":5}]}'), file), LlmOutputError);
  });
});
