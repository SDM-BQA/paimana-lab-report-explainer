import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { safetyLint } from "../src/services/safetyLint.js";
import { explanationFile } from "../src/services/explanations.js";

describe("safetyLint: English", () => {
  test("every curated explanation passes, so the fallback text is always safe to show", () => {
    for (const [key, e] of Object.entries(explanationFile)) {
      for (const text of [e.measures, e.interpretation.low, e.interpretation.high]) {
        if (text !== null) assert.ok(safetyLint(text, "en").ok, `${key}: ${safetyLint(text, "en").problems.join(", ")}`);
      }
    }
  });

  test("rejects diagnosis, treatment, medicine, and dose wording", () => {
    for (const bad of [
      "You have diabetes.",
      "You may have anemia.",
      "This confirms a diagnosis of thyroid disease.",
      "Treatment is usually simple.",
      "Your doctor may prescribe something.",
      "Take an iron supplement daily.",
      "Metformin can help.",
      "A common medication for this is a statin.",
      "One tablet a day.",
    ]) {
      assert.equal(safetyLint(bad, "en").ok, false, bad);
    }
  });

  test("rejects any digit, because numbers could be doses or ranges", () => {
    assert.equal(safetyLint("Levels above 200 are high.", "en").ok, false);
  });

  test("rejects empty and overly long text", () => {
    assert.equal(safetyLint("   ", "en").ok, false);
    assert.equal(safetyLint("word ".repeat(100), "en").ok, false);
  });

  test("does not trip on harmless words that contain banned stems elsewhere", () => {
    // "take" is banned as a whole word only; "mistake" and "intake" are not "take".
    assert.ok(safetyLint("This test measures the level of glucose in your blood.", "en").ok);
  });
});

describe("safetyLint: Hindi", () => {
  test("accepts a plain Hindi sentence", () => {
    const result = safetyLint("यह जांच खून में हीमोग्लोबिन का स्तर मापती है।", "hi");
    assert.ok(result.ok, result.problems.join(", "));
  });

  test("rejects Hindi medicine, dose, diagnosis, and 'you have' wording", () => {
    for (const bad of ["इसके लिए दवा जरूरी है।", "रोज एक गोली।", "यह निदान है।", "आपको मधुमेह है।", "खुराक बढ़ाएं।"]) {
      assert.equal(safetyLint(bad, "hi").ok, false, bad);
    }
  });

  test("rejects Devanagari digits too", () => {
    assert.equal(safetyLint("स्तर २०० से ऊपर है।", "hi").ok, false);
  });

  test("rejects an answer left in English when Hindi was requested", () => {
    const result = safetyLint("This test measures the level of hemoglobin in your blood.", "hi");
    assert.equal(result.ok, false);
    assert.ok(result.problems.includes("not in Hindi"));
  });

  test("English patterns still apply to mixed-language Hindi output", () => {
    assert.equal(safetyLint("यह जांच है। metformin लें।", "hi").ok, false);
  });
});
