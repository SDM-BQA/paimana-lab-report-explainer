import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, parseConfig } from "../src/config.js";

const valid = {
  GEMINI_API_KEY: "test-key-not-real",
  GEMINI_MODEL: "test-model",
  CORS_ORIGIN: "http://localhost:5173",
  PORT: "5000",
};

describe("parseConfig", () => {
  test("accepts a complete env and coerces PORT to a number", () => {
    const config = parseConfig(valid);
    assert.equal(config.PORT, 5000);
    assert.equal(config.CORS_ORIGIN, "http://localhost:5173");
  });

  test("defaults PORT to 5000 when absent", () => {
    const { PORT: _omit, ...rest } = valid;
    assert.equal(parseConfig(rest).PORT, 5000);
  });

  test("rejects a missing or blank API key with a readable message", () => {
    assert.throws(() => parseConfig({ ...valid, GEMINI_API_KEY: undefined }), (err: unknown) => {
      assert.ok(err instanceof ConfigError);
      assert.match(err.message, /GEMINI_API_KEY/);
      return true;
    });
    assert.throws(() => parseConfig({ ...valid, GEMINI_API_KEY: "   " }), ConfigError);
  });

  test("lists every problem at once", () => {
    assert.throws(() => parseConfig({}), (err: unknown) => {
      assert.ok(err instanceof ConfigError);
      for (const name of ["GEMINI_API_KEY", "GEMINI_MODEL", "CORS_ORIGIN"]) {
        assert.match(err.message, new RegExp(name));
      }
      // Missing variables get the friendly hint, not zod's generic "expected string".
      assert.match(err.message, /GEMINI_API_KEY is required/);
      assert.match(err.message, /GEMINI_MODEL is required/);
      assert.doesNotMatch(err.message, /expected string/);
      return true;
    });
  });

  test("rejects a CORS origin that is not a URL", () => {
    assert.throws(() => parseConfig({ ...valid, CORS_ORIGIN: "*" }), ConfigError);
  });

  test("never puts secret values in the error message", () => {
    assert.throws(() => parseConfig({ ...valid, CORS_ORIGIN: "not a url", GEMINI_API_KEY: "sk-SHOULD-NOT-LEAK" }), (err: unknown) => {
      assert.ok(err instanceof ConfigError);
      assert.ok(!err.message.includes("sk-SHOULD-NOT-LEAK"));
      return true;
    });
  });
});
