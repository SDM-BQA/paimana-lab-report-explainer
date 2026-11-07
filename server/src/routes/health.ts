import { Router } from "express";

// The client calls this on page load so a sleeping Render instance starts waking early.
export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok" });
});
