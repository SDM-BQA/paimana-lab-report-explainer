import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers.js";
import { createExplanationIndex } from "../src/services/explanations.js";
import { DISCLAIMER } from "../src/services/explain.js";

const explanations = createExplanationIndex({
  hemoglobin: {
    displayName: "Hemoglobin",
    aliases: ["hb"],
    category: "Blood count",
    measures: "Measures hemoglobin.",
    interpretation: { low: "Low text.", high: "High text." },
    source: "Example: https://example.org/hb",
    reviewed: true,
  },
});

const validRow = { id: "r1", testName: "Hemoglobin", rawValue: "11.1", value: 11.1, unit: "g/dL", printedRange: "13.0 - 17.0" };

describe("POST /api/analyze", () => {
  let logs: string[] = [];
  const originals = { log: console.log, error: console.error, warn: console.warn };
  beforeEach(() => {
    logs = [];
    for (const k of ["log", "error", "warn"] as const) console[k] = (...args: unknown[]) => logs.push(args.join(" "));
  });
  afterEach(() => Object.assign(console, originals));

  async function post(body: unknown) {
    const { baseUrl, close } = await startTestServer({ explanations });
    try {
      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    } finally {
      await close();
    }
  }

  test("flags a row, explains it, and adds the fixed disclaimer", async () => {
    const res = await post({ language: "en", rows: [validRow] });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      results: [
        {
          id: "r1",
          testName: "Hemoglobin",
          canonicalKey: "hemoglobin",
          value: 11.1,
          unit: "g/dL",
          status: "low",
          range: { low: 13, high: 17 },
          reason: "Below printed range",
          explanation: { text: "Measures hemoglobin. Low text.", language: "en", origin: "curated" },
        },
      ],
      warnings: [],
      disclaimer: DISCLAIMER,
    });
  });

  test("the server recomputes value from rawValue and ignores a sent value (D10)", async () => {
    // The user edited the result to 14.8 in the browser, but a stale value 11.1 was sent.
    const edited = await post({ language: "en", rows: [{ ...validRow, rawValue: "14.8", value: 11.1 }] });
    const r1 = (edited.body.results as Array<Record<string, unknown>>)[0]!;
    assert.equal(r1.value, 14.8);
    assert.equal(r1.status, "normal");

    // value may be left out entirely.
    const { value: _omit, ...noValue } = validRow;
    const res = await post({ language: "en", rows: [noValue] });
    assert.equal(res.status, 200);
    assert.equal((res.body.results as Array<Record<string, unknown>>)[0]!.status, "low");

    // A non-numeric result is unchecked even if a number is sent with it.
    const text = await post({ language: "en", rows: [{ ...validRow, rawValue: "Positive", value: 11.1 }] });
    assert.equal((text.body.results as Array<Record<string, unknown>>)[0]!.status, "unchecked");
  });

  test("invalid requests → 400 with { error }", async () => {
    const tooMany = Array.from({ length: 61 }, (_, i) => ({ ...validRow, id: `r${i}` }));
    for (const bad of [
      {},
      { rows: [validRow] }, // no language
      { language: "fr", rows: [validRow] },
      { language: "en", rows: [] },
      { language: "en", rows: tooMany },
      { language: "en", rows: [{ ...validRow, value: "11.1" }] }, // value must be a number
      { language: "en", rows: [{ ...validRow, patientName: "Test Person" }] }, // unknown field
      { language: "en", rows: [validRow], extra: true },
      { language: "en", rows: [{ ...validRow, testName: "x".repeat(500) }] },
    ]) {
      const res = await post(bad);
      assert.equal(res.status, 400, JSON.stringify(bad).slice(0, 80));
      assert.equal(typeof res.body.error, "string");
    }
  });

  test("values and test names are never logged or echoed in errors", async () => {
    await post({ language: "en", rows: [validRow] });
    const bad = await post({ language: "en", rows: [{ ...validRow, value: "SECRET-11.1" }] });
    const all = logs.join("\n") + JSON.stringify(bad.body);
    for (const secret of ["SECRET-11.1", "Hemoglobin", "13.0 - 17.0"]) {
      assert.equal(all.includes(secret), false, `"${secret}" leaked`);
    }
  });
});
