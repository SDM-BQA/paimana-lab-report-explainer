# Paimana

Explains lab-report results in plain language. Upload a lab report (PDF or photo) or type the
values in. **Plain code, not AI, flags each value as low, normal, or high** against the range
printed on the report, and shows a short, general explanation for flagged values.

> **Not medical advice.** Paimana does not diagnose or suggest treatment. Always talk to a doctor
> about your results. **Demo only: use the sample reports, not real medical data.**

**Status:** work in progress. See [`docs/STEP_BY_STEP.md`](docs/STEP_BY_STEP.md) for progress.

- Stack: React (Vite) + Node/Express, TypeScript. No database: nothing is stored.
- AI: the Gemini API (free tier) reads reports. It never decides a flag.
- Spec: [`PROJECT_BRIEF.md`](PROJECT_BRIEF.md) · Rules for the AI assistant: [`CLAUDE.md`](CLAUDE.md)
  · How AI was used: [`AI_NOTES.md`](AI_NOTES.md) · Decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)

Setup instructions, screenshots, and limitations come in the final step.
