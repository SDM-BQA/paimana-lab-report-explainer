import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluate, REASONS } from "../src/services/rangeEngine.js";
import { FIXTURES, type FixtureRow } from "../scripts/fixtureSpec.js";

// Reads the COMMITTED truth files (not the spec), so a stale or hand-edited file is caught.
const ROOT = fileURLToPath(new URL("../../fixtures/", import.meta.url));

interface TruthFile {
  id: string;
  case: string;
  file: string;
  rows: FixtureRow[];
  injectedText?: string;
}

const truthFiles: TruthFile[] = readdirSync(`${ROOT}truth`)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(`${ROOT}truth/${f}`, "utf8")) as TruthFile);

describe("synthetic fixtures", () => {
  test("there are exactly 10 truth files, 01 to 10, each with its PDF", () => {
    assert.deepEqual(
      truthFiles.map((t) => t.id),
      ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"],
    );
    for (const t of truthFiles) assert.ok(existsSync(`${ROOT}${t.file}`), `missing ${t.file}`);
  });

  test("committed truth files match the spec (run `npm run fixtures` after editing it)", () => {
    for (const fixture of FIXTURES) {
      const truth = truthFiles.find((t) => t.id === fixture.id);
      assert.deepEqual(truth?.rows, fixture.rows, `fixture ${fixture.id}`);
    }
  });

  test("hand-written reasons match the engine's reason text", () => {
    const allowed = new Set<string>(Object.values(REASONS));
    for (const t of truthFiles) {
      for (const row of t.rows) {
        if (row.expected.reason !== undefined) assert.ok(allowed.has(row.expected.reason), row.expected.reason);
      }
    }
  });

  for (const t of truthFiles) {
    test(`engine gives the expected status for every row of fixture ${t.id} (${t.case})`, () => {
      for (const row of t.rows) {
        const result = evaluate(row);
        assert.equal(result.status, row.expected.status, `${t.id} ${row.testName}`);
        if (row.expected.reason !== undefined) assert.equal(result.reason, row.expected.reason);
      }
    });
  }

  test("fixtures cover every status", () => {
    const seen = new Set(truthFiles.flatMap((t) => t.rows.map((r) => r.expected.status)));
    assert.deepEqual([...seen].sort(), ["high", "low", "normal", "unchecked"]);
  });

  test("only fixture 10 contains injected text", () => {
    assert.deepEqual(truthFiles.filter((t) => t.injectedText).map((t) => t.id), ["10"]);
  });

  test("no patient details in any truth file", () => {
    const patientWords = /\b(name|age|sex|gender|dob|date of birth|patient id|mrn|doctor|address|phone)\b/i;
    for (const t of truthFiles) {
      for (const row of t.rows) assert.doesNotMatch(row.testName, patientWords, `${t.id} ${row.testName}`);
    }
  });
});
