import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/config.js";
import { startTestServer, TEST_ORIGIN } from "./helpers.js";

const base = { GEMINI_API_KEY: "test-key-not-real", GEMINI_MODEL: "test-model", CORS_ORIGIN: TEST_ORIGIN };

describe("deploy config", () => {
  test("CORS_ORIGIN loses trailing slashes, so a pasted Vercel URL still matches", () => {
    assert.equal(parseConfig({ ...base, CORS_ORIGIN: "https://paimana.vercel.app/" }).CORS_ORIGIN, "https://paimana.vercel.app");
    assert.equal(parseConfig({ ...base, CORS_ORIGIN: "https://paimana.vercel.app" }).CORS_ORIGIN, "https://paimana.vercel.app");
  });

  test("TRUST_PROXY defaults to 0 and DEBUG_CLIENT_IP to off", () => {
    const c = parseConfig(base);
    assert.equal(c.TRUST_PROXY, 0);
    assert.equal(c.DEBUG_CLIENT_IP, false);
  });

  test("TRUST_PROXY and DEBUG_CLIENT_IP are parsed and validated", () => {
    const c = parseConfig({ ...base, TRUST_PROXY: "1", DEBUG_CLIENT_IP: "true" });
    assert.equal(c.TRUST_PROXY, 1);
    assert.equal(c.DEBUG_CLIENT_IP, true);
    assert.throws(() => parseConfig({ ...base, TRUST_PROXY: "true" }));
    assert.throws(() => parseConfig({ ...base, DEBUG_CLIENT_IP: "yes" }));
  });

  test("the browser sees the allowed origin without a slash after the config strips it", async () => {
    const origin = parseConfig({ ...base, CORS_ORIGIN: `${TEST_ORIGIN}/` }).CORS_ORIGIN;
    const { baseUrl, close } = await startTestServer({ CORS_ORIGIN: origin });
    try {
      const res = await fetch(`${baseUrl}/api/health`, { headers: { origin: TEST_ORIGIN } });
      assert.equal(res.headers.get("access-control-allow-origin"), TEST_ORIGIN);
    } finally {
      await close();
    }
  });
});

describe("trust proxy and client IP", () => {
  async function ipSeen(options: { TRUST_PROXY: number }, forwardedFor?: string) {
    const { baseUrl, close } = await startTestServer({ ...options, DEBUG_CLIENT_IP: true });
    try {
      const res = await fetch(`${baseUrl}/api/debug/ip`, { headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {} });
      return ((await res.json()) as { ip: string }).ip;
    } finally {
      await close();
    }
  }

  test("debug route is absent unless DEBUG_CLIENT_IP is on", async () => {
    const { baseUrl, close } = await startTestServer();
    try {
      assert.equal((await fetch(`${baseUrl}/api/debug/ip`)).status, 404);
    } finally {
      await close();
    }
  });

  test("with TRUST_PROXY=1 the client IP comes from the proxy's X-Forwarded-For", async () => {
    assert.equal(await ipSeen({ TRUST_PROXY: 1 }, "203.0.113.7"), "203.0.113.7");
  });

  test("with TRUST_PROXY=0 a faked X-Forwarded-For is ignored", async () => {
    const ip = await ipSeen({ TRUST_PROXY: 0 }, "203.0.113.7");
    assert.notEqual(ip, "203.0.113.7");
  });

  test("with TRUST_PROXY=1, one hop only: a client cannot prepend a fake IP", async () => {
    // The client sends "6.6.6.6"; Render's proxy appends the real IP. Only the last hop is trusted.
    assert.equal(await ipSeen({ TRUST_PROXY: 1 }, "6.6.6.6, 203.0.113.7"), "203.0.113.7");
  });

  test("behind a proxy, different users get separate rate-limit counters", async () => {
    const { baseUrl, close } = await startTestServer({ TRUST_PROXY: 1, rateLimitPerWindow: 1 });
    const hit = (ip: string) => fetch(`${baseUrl}/api/health`, { headers: { "x-forwarded-for": ip } }).then((r) => r.status);
    try {
      assert.equal(await hit("203.0.113.1"), 200);
      assert.equal(await hit("203.0.113.1"), 429); // same user hits the limit
      assert.equal(await hit("203.0.113.2"), 200); // another user is not blocked
    } finally {
      await close();
    }
  });
});
