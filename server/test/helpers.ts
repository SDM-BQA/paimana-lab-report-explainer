import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp, type AppOptions } from "../src/app.js";

export const TEST_ORIGIN = "http://localhost:5173";

/** Starts the app on a random free port and returns its base URL plus a close function. */
export async function startTestServer(
  options: Partial<AppOptions> = {},
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const app = createApp({ CORS_ORIGIN: TEST_ORIGIN, ...options });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
