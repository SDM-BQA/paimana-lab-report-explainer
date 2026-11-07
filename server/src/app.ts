import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import type { Config } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { extractRouter } from "./routes/extract.js";
import { errorHandler, notFound } from "./errors.js";
import type { LlmClient } from "./services/llm.js";

export type AppOptions = Pick<Config, "CORS_ORIGIN"> & {
  /** Injected so tests can use a fake; index.ts passes the real Gemini client. */
  llm: LlmClient;
  /** Requests allowed per client per window. Overridable so tests can hit the limit quickly. */
  rateLimitPerWindow?: number;
  /** Stricter limit for /api/extract, because every call spends free-tier model quota. */
  extractLimitPerWindow?: number;
};

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Builds the app without listening, so tests can start it on a random port. */
export function createApp(options: AppOptions): express.Express {
  const app = express();

  app.use(helmet());
  // Exactly one allowed origin (the frontend), never "*".
  app.use(cors({ origin: options.CORS_ORIGIN, methods: ["GET", "POST"] }));
  // Small cap: analyze requests are at most 60 short rows. Uploads use multer instead (Step 6).
  app.use(express.json({ limit: "100kb" }));

  app.use(
    "/api",
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: options.rateLimitPerWindow ?? 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Please wait a few minutes and try again." },
    }),
  );

  app.use("/api/health", healthRouter);
  app.use(
    "/api/extract",
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: options.extractLimitPerWindow ?? 10,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many uploads. Please wait a few minutes, or enter values by hand." },
    }),
    extractRouter(options.llm),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
