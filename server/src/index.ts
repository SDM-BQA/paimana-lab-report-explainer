import { ConfigError, loadConfig, type Config } from "./config.js";
import { createApp } from "./app.js";
import { createGeminiClient } from "./services/llm.js";

// Fail fast: refuse to start with a readable message instead of crashing mid-request later.
let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

const app = createApp({ ...config, llm: createGeminiClient(config) });
app.listen(config.PORT, () => {
  // Settings only, never secrets or the model key.
  console.log(`Paimana API listening on port ${config.PORT} (trust proxy hops: ${config.TRUST_PROXY})`);
  if (config.DEBUG_CLIENT_IP) console.log("DEBUG_CLIENT_IP is on: GET /api/debug/ip is enabled. Turn it off after checking.");
});
