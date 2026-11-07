import { ConfigError, loadConfig, type Config } from "./config.js";
import { createApp } from "./app.js";

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

const app = createApp(config);
app.listen(config.PORT, () => {
  console.log(`Paimana API listening on port ${config.PORT}`);
});
