import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp, type AppOptions } from "../src/app.js";
import type { LlmClient } from "../src/services/llm.js";

export const TEST_ORIGIN = "http://localhost:5173";

/** Default fake: tests that never reach the LLM should fail loudly if they do. */
export const unusedLlm: LlmClient = {
  extractRowsJson: () => Promise.reject(new Error("LLM should not be called in this test")),
  rephraseJson: () => Promise.reject(new Error("LLM should not be called in this test")),
};

/** Starts the app on a random free port and returns its base URL plus a close function. */
export async function startTestServer(
  options: Partial<AppOptions> = {},
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createApp({ CORS_ORIGIN: TEST_ORIGIN, llm: unusedLlm, ...options });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
