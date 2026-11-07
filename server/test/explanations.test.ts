import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  createExplanationIndex,
  explanationFile,
  normalizeName,
  parseExplanations,
  type ExplanationFile,
} from "../src/services/explanations.js";

// Synthetic entries so these tests do not depend on what the developer has reviewed.
const fake: ExplanationFile = {
  hemoglobin: {
    displayName: "Hemoglobin",
    aliases: ["hb", "hgb", "haemoglobin"],
    measures: "Test text.",
    low: "Low test text.",
    high: "High test text.",
    source: "Example: https://example.org/hb",
    reviewed: true,
  },
  hdl: {
    displayName: "HDL cholesterol",
    aliases: ["hdl", "hdl c"],
    measures: "Test text.",
    low: "Low test text.",
    high: null,
    source: "Example: https://example.org/hdl",
    reviewed: true,
  },
  tsh: {
    displayName: "TSH",
    aliases: ["thyroid stimulating hormone"],
    measures: "Test text.",
    low: "Low test text.",
    high: "High test text.",
    source: "Example: https://example.org/tsh",
    reviewed: false,
  },
};

describe("explanation index: lookup", () => {
  const index = createExplanationIndex(fake);

  test("finds by key, display name, and alias", () => {
    for (const name of ["hemoglobin", "Hemoglobin", "Hb", "HGB", "Haemoglobin"]) {
      assert.equal(index.find(name)?.key, "hemoglobin", name);
    }
  });

  test("lookup ignores case, punctuation, and extra spaces", () => {
    for (const name of ["HDL-C", "hdl c", "  HDL   C ", "HDL Cholesterol"]) {
      assert.equal(index.find(name)?.key, "hdl", name);
    }
  });

  test("uses the name inside or outside brackets", () => {
    assert.equal(index.find("Haemoglobin (Hb)")?.key, "hemoglobin");
    assert.equal(index.find("Blood count (HGB)")?.key, "hemoglobin");
  });

  test("unknown or partial names return null, never a guess", () => {
    for (const name of ["Ferritin", "Hemo", "Hb1", "", "   "]) {
      assert.equal(index.find(name), null, name);
    }
  });

  test("returns the entry text with its key", () => {
    const found = index.find("hb");
    assert.equal(found?.low, "Low test text.");
    assert.equal(found?.source, "Example: https://example.org/hb");
  });
});

describe("explanation index: review gate", () => {
  const index = createExplanationIndex(fake);

  test("unreviewed entries are never returned, by key or by alias", () => {
    assert.equal(index.find("TSH"), null);
    assert.equal(index.find("Thyroid Stimulating Hormone"), null);
  });

  test("reviewedCount counts only reviewed entries", () => {
    assert.equal(index.reviewedCount, 2);
  });

  test("an index where nothing is reviewed returns nothing", () => {
    const none = createExplanationIndex({ tsh: fake.tsh! });
    assert.equal(none.find("tsh"), null);
    assert.equal(none.reviewedCount, 0);
  });
});

describe("explanation file validation", () => {
  test("rejects an entry without a source URL", () => {
    assert.throws(() => parseExplanations({ hb: { ...fake.hemoglobin, source: "My memory" } }));
  });

  test("rejects unknown fields (for example a numeric range sneaking in)", () => {
    assert.throws(() => parseExplanations({ hb: { ...fake.hemoglobin, range: "13 - 17" } }));
  });

  test("rejects an entry without the reviewed flag", () => {
    const { reviewed: _omit, ...withoutFlag } = fake.hemoglobin!;
    assert.throws(() => parseExplanations({ hb: withoutFlag }));
  });

  test("rejects two entries sharing an alias", () => {
    const clash = { a: { ...fake.hemoglobin! }, b: { ...fake.hdl!, aliases: ["HB"] } };
    assert.throws(() => createExplanationIndex(parseExplanations(clash)), /maps to both/);
  });
});

describe("normalizeName", () => {
  test("collapses punctuation and case", () => {
    assert.equal(normalizeName("  Glucose, Fasting (FBS) "), "glucose fasting fbs");
    assert.equal(normalizeName("S. Creatinine"), "s creatinine");
  });
});

describe("the real explanations.json", () => {
  const entries = Object.entries(explanationFile);

  test("is valid and has 8 to 10 entries", () => {
    assert.ok(entries.length >= 8 && entries.length <= 10, `has ${entries.length}`);
  });

  test("builds an index with no alias clashes", () => {
    assert.doesNotThrow(() => createExplanationIndex(explanationFile));
  });

  test("every entry names a source with a URL", () => {
    for (const [key, entry] of entries) {
      assert.match(entry.source, /https:\/\/\S+/, key);
    }
  });

  test("every entry explains at least one direction", () => {
    for (const [key, entry] of entries) {
      assert.ok(entry.low !== null || entry.high !== null, key);
    }
  });

  test("no numbers in the explanation text (ranges come only from the report)", () => {
    for (const [key, entry] of entries) {
      for (const text of [entry.measures, entry.low, entry.high]) {
        if (text !== null) assert.doesNotMatch(text, /\d/, `${key}: ${text}`);
      }
    }
  });

  test("no medicine, dose, treatment, or 'you have' wording", () => {
    // A small guard for now; the full safety lint and denylist arrive in Step 7.
    const banned = /\b(you have|diagnos\w*|treat\w*|medicin\w*|medication\w*|drug\w*|dose\w*|dosage|tablet\w*|supplement\w*|prescri\w*|mg\b|take\b)/i;
    for (const [key, entry] of entries) {
      for (const text of [entry.measures, entry.low, entry.high]) {
        if (text !== null) assert.doesNotMatch(text, banned, `${key}: ${text}`);
      }
    }
  });
});
