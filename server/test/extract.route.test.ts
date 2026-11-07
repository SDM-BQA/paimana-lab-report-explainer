import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { startTestServer } from "./helpers.js";
import { LlmQuotaError, LlmUnavailableError, type LlmClient, type UploadedFile } from "../src/services/llm.js";
import { MAX_UPLOAD_BYTES } from "../src/routes/extract.js";

const PDF = readFileSync(fileURLToPath(new URL("../../fixtures/reports/01.pdf", import.meta.url)));
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const SECRET_NAME = "Private-Report-Name.pdf";
const MODEL_JSON = JSON.stringify({ rows: [{ testName: "Hemoglobin", rawValue: "14.2", unit: "g/dL", printedRange: "13.0 - 17.0" }] });

function form(buffer: Buffer, type: string, name = SECRET_NAME, field = "report"): FormData {
  const body = new FormData();
  body.append(field, new Blob([new Uint8Array(buffer)], { type }), name);
  return body;
}

/** Records what the LLM received, and every console line written during a test. */
function harness(answer: (file: UploadedFile) => Promise<string>) {
  const received: UploadedFile[] = [];
  const llm: LlmClient = {
    extractRowsJson: (file) => {
      received.push(file);
      return answer(file);
    },
    rephraseJson: async () => "{}",
  };
  return { llm, received };
}

describe("POST /api/extract", () => {
  let logs: string[] = [];
  const originals = { log: console.log, error: console.error, warn: console.warn };
  beforeEach(() => {
    logs = [];
    for (const k of ["log", "error", "warn"] as const) console[k] = (...args: unknown[]) => logs.push(args.join(" "));
  });
  afterEach(() => Object.assign(console, originals));

  async function post(llm: LlmClient, body: FormData | string, headers: Record<string, string> = {}) {
    const { baseUrl, close } = await startTestServer({ llm });
    try {
      const res = await fetch(`${baseUrl}/api/extract`, { method: "POST", body, headers });
      return { status: res.status, text: await res.text() };
    } finally {
      await close();
    }
  }

  test("a PDF is read from memory and rows come back with ids and values", async () => {
    const { llm, received } = harness(async () => MODEL_JSON);
    const res = await post(llm, form(PDF, "application/pdf"));
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(res.text), {
      rows: [{ id: "r1", testName: "Hemoglobin", rawValue: "14.2", value: 14.2, unit: "g/dL", printedRange: "13.0 - 17.0" }],
      warnings: [],
    });
    // Memory storage: the LLM got the bytes; there is no disk path anywhere.
    assert.ok(received[0]!.buffer.equals(PDF));
    assert.equal("path" in received[0]!, false);
  });

  test("PNG and JPG are accepted", async () => {
    const { llm, received } = harness(async () => '{"rows":[]}');
    assert.equal((await post(llm, form(PNG, "image/png", "a.png"))).status, 200);
    assert.equal((await post(llm, form(JPG, "image/jpeg", "a.jpg"))).status, 200);
    assert.deepEqual(received.map((f) => f.mimeType), ["image/png", "image/jpeg"]);
  });

  test("no file → 400", async () => {
    const res = await post(harness(async () => MODEL_JSON).llm, new FormData());
    assert.equal(res.status, 400);
    assert.match(JSON.parse(res.text).error, /PDF, PNG, or JPG/);
  });

  test("wrong declared type → 400, and the LLM is never called", async () => {
    const h = harness(async () => MODEL_JSON);
    const res = await post(h.llm, form(Buffer.from("hello"), "text/plain", "notes.txt"));
    assert.equal(res.status, 400);
    assert.equal(h.received.length, 0);
  });

  test("a text file pretending to be a PDF is rejected by its signature", async () => {
    const h = harness(async () => MODEL_JSON);
    const res = await post(h.llm, form(Buffer.from("not really a pdf"), "application/pdf"));
    assert.equal(res.status, 400);
    assert.match(JSON.parse(res.text).error, /does not look like/);
    assert.equal(h.received.length, 0);
  });

  test("a PNG declared as a PDF is rejected", async () => {
    const res = await post(harness(async () => MODEL_JSON).llm, form(PNG, "application/pdf"));
    assert.equal(res.status, 400);
  });

  test("a file over 5 MB → 400", async () => {
    const big = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(MAX_UPLOAD_BYTES)]);
    const h = harness(async () => MODEL_JSON);
    const res = await post(h.llm, form(big, "application/pdf"));
    assert.equal(res.status, 400);
    assert.match(JSON.parse(res.text).error, /5 MB/);
    assert.equal(h.received.length, 0);
  });

  test("a file in the wrong field name → 400", async () => {
    const res = await post(harness(async () => MODEL_JSON).llm, form(PDF, "application/pdf", "a.pdf", "file"));
    assert.equal(res.status, 400);
  });

  test("LLM quota exhausted → 429 with a friendly message", async () => {
    const res = await post(harness(() => Promise.reject(new LlmQuotaError("x"))).llm, form(PDF, "application/pdf"));
    assert.equal(res.status, 429);
    assert.match(JSON.parse(res.text).error, /enter values by hand/);
  });

  test("LLM down → 502", async () => {
    const res = await post(harness(() => Promise.reject(new LlmUnavailableError("x"))).llm, form(PDF, "application/pdf"));
    assert.equal(res.status, 502);
  });

  test("LLM returns garbage → 502", async () => {
    const res = await post(harness(async () => "I cannot help with that").llm, form(PDF, "application/pdf"));
    assert.equal(res.status, 502);
  });

  test("nothing about the file or its values is logged or echoed in errors", async () => {
    await post(harness(async () => MODEL_JSON).llm, form(PDF, "application/pdf"));
    await post(harness(async () => MODEL_JSON).llm, form(Buffer.from("x"), "text/plain"));
    await post(harness(() => Promise.reject(new LlmUnavailableError("x"))).llm, form(PDF, "application/pdf"));
    const big = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(MAX_UPLOAD_BYTES)]);
    const tooBig = await post(harness(async () => MODEL_JSON).llm, form(big, "application/pdf"));
    const all = logs.join("\n") + tooBig.text;
    for (const secret of [SECRET_NAME, "Hemoglobin", "14.2", "13.0 - 17.0"]) {
      assert.equal(all.includes(secret), false, `"${secret}" leaked`);
    }
  });

  test("uploads have their own stricter rate limit", async () => {
    const { baseUrl, close } = await startTestServer({ llm: harness(async () => MODEL_JSON).llm, extractLimitPerWindow: 1 });
    try {
      const first = await fetch(`${baseUrl}/api/extract`, { method: "POST", body: form(PDF, "application/pdf") });
      const second = await fetch(`${baseUrl}/api/extract`, { method: "POST", body: form(PDF, "application/pdf") });
      assert.equal(first.status, 200);
      assert.equal(second.status, 429);
      assert.equal(typeof ((await second.json()) as { error?: unknown }).error, "string");
    } finally {
      await close();
    }
  });
});
