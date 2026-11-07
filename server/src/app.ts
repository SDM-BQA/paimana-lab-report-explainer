import express from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import type { Config } from "./config.js";
import { healthRouter } from "./routes/health.js";
import { extractRouter } from "./routes/extract.js";
import { analyzeRouter } from "./routes/analyze.js";
import { errorHandler, notFound } from "./errors.js";
import type { LlmClient } from "./services/llm.js";
import { explanations as defaultExplanations, type ExplanationIndex } from "./services/explanations.js";
import { safetyLint } from "./services/safetyLint.js";

export type AppOptions = Pick<Config, "CORS_ORIGIN"> &
  Partial<Pick<Config, "TRUST_PROXY" | "DEBUG_CLIENT_IP">> & {
  /** Injected so tests can use a fake; index.ts passes the real Gemini client. */
  llm: LlmClient;
  /** Requests allowed per client per window. Overridable so tests can hit the limit quickly. */
  rateLimitPerWindow?: number;
  /** Stricter limit for /api/extract, because every call spends free-tier model quota. */
  extractLimitPerWindow?: number;
  /** Limit for /api/analyze (Hindi requests spend model quota). */
  analyzeLimitPerWindow?: number;
  /** Injected in tests; defaults to the reviewed entries in data/explanations.json. */
  explanations?: ExplanationIndex;
};

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Builds the app without listening, so tests can start it on a random port. */
export function createApp(options: AppOptions): express.Express {
  const app = express();
  // Behind Render's proxy every request would otherwise come from the proxy's IP, so the rate
  // limiter would treat all users as one. A hop count (never `true`) trusts only that proxy.
  app.set("trust proxy", options.TRUST_PROXY ?? 0);

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
  if (options.DEBUG_CLIENT_IP) {
    // Shows callers their own IP as Express sees it, to verify TRUST_PROXY after a deploy
    // (express-rate-limit's proxy guide). Turn DEBUG_CLIENT_IP off again afterwards.
    app.get("/api/debug/ip", (req, res) => {
      res.json({ ip: req.ip });
    });
  }
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
  app.use(
    "/api/analyze",
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: options.analyzeLimitPerWindow ?? 30,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Please wait a few minutes and try again." },
    }),
    analyzeRouter({
      llm: options.llm,
      explanations: options.explanations ?? defaultExplanations,
      lint: safetyLint,
    }),
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
