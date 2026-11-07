import { Router } from "express";
import { HttpError } from "../errors.js";
import { AnalyzeRequestSchema } from "../schemas.js";
import { analyzeRows, type ExplainDeps } from "../services/explain.js";

export function analyzeRouter(deps: ExplainDeps): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const parsed = AnalyzeRequestSchema.safeParse(req.body);
    // The message names the problem, never the submitted values.
    if (!parsed.success) {
      throw new HttpError(400, "Invalid request: send { language: 'en' | 'hi', rows: [...] } with 1 to 60 rows.");
    }
    res.json(await analyzeRows(parsed.data, deps));
  });

  return router;
}
