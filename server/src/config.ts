import { z } from "zod";

// The single place that reads process.env (CLAUDE.md architecture rule).
// Everything else receives a typed Config object, which also keeps tests free of env setup.

// `error` on the base schema covers both "missing" and "blank"; a message passed only to
// .min() would not fire when the variable is absent (caught during Step 2 manual check).
const required = (hint: string) => z.string({ error: `is required (${hint})` }).trim().min(1, `is required (${hint})`);

const ConfigSchema = z.object({
  GEMINI_API_KEY: required("get one from Google AI Studio"),
  GEMINI_MODEL: required("a free-tier model name from Google AI Studio"),
  // A browser's Origin header never ends in "/", so a pasted "https://x.vercel.app/" would never
  // match and every request would fail CORS. Strip trailing slashes.
  CORS_ORIGIN: z
    .url({ error: "must be a full URL such as http://localhost:5173" })
    .transform((url) => url.replace(/\/+$/, "")),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  // Number of proxies in front of the app (1 on Render). 0 locally: with no proxy, trusting
  // X-Forwarded-For would let anyone fake their IP and dodge the rate limit.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  // Temporarily "true" after deploying to check TRUST_PROXY via GET /api/debug/ip. Off by default.
  DEBUG_CLIENT_IP: z.enum(["true", "false"], { error: "must be true or false" }).default("false").transform((v) => v === "true"),
});

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigError extends Error {
  override name = "ConfigError";
}

/** Pure: validates a plain env object. Never includes values in the error, only variable names. */
export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".")} ${issue.message}`);
    throw new ConfigError(
      `Invalid server configuration:\n${problems.join("\n")}\nCopy server/.env.example to server/.env and fill it in.`,
    );
  }
  return result.data;
}

export function loadConfig(): Config {
  return parseConfig(process.env);
}
