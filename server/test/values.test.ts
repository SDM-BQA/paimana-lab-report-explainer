import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNumericValue } from "../src/services/values.js";

test("plain numbers become numbers", () => {
  assert.equal(parseNumericValue("14.2"), 14.2);
  assert.equal(parseNumericValue(" 250 "), 250);
  assert.equal(parseNumericValue("-2"), -2);
  assert.equal(parseNumericValue("7,200"), 7200);
});

test("anything else is null, never a guess", () => {
  for (const raw of ["Positive", "Negative", "< 0.5", ">1000", "13,5", "14.2 g/dL", "1e3", "", "  ", null, undefined]) {
    assert.equal(parseNumericValue(raw), null, String(raw));
  }
});
