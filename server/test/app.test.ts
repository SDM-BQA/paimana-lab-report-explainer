import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { startTestServer, TEST_ORIGIN } from "./helpers.js";

describe("app", () => {
  let baseUrl: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ baseUrl, close } = await startTestServer());
  });
  after(async () => {
    await close();
  });

  test("GET /api/health returns { status: 'ok' }", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok" });
  });

  test("unknown route returns 404 with { error }", async () => {
    const res = await fetch(`${baseUrl}/api/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });

  test("malformed JSON body returns 400 with { error } and no echo of the input", async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not json SECRET-VALUE",
    });
    assert.equal(res.status, 400);
    const body = await res.text();
    assert.deepEqual(JSON.parse(body), { error: "Bad request" });
    assert.ok(!body.includes("SECRET-VALUE"));
  });

  test("helmet sets security headers and hides X-Powered-By", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  test("CORS allows the configured origin", async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { origin: TEST_ORIGIN } });
    assert.equal(res.headers.get("access-control-allow-origin"), TEST_ORIGIN);
  });

  test("CORS never allows a different origin", async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { origin: "https://evil.example" } });
    const allowed = res.headers.get("access-control-allow-origin");
    assert.notEqual(allowed, "https://evil.example");
    assert.notEqual(allowed, "*");
  });
});

describe("rate limiting", () => {
  test("returns 429 with { error } after the limit is reached", async () => {
    const { baseUrl, close } = await startTestServer({ rateLimitPerWindow: 2 });
    try {
      assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
      assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 429);
      const body = (await res.json()) as { error?: unknown };
      assert.equal(typeof body.error, "string");
    } finally {
      await close();
    }
  });
});
