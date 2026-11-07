# Decisions

Short records of decisions that shape Paimana. Newest at the bottom. Each one says what was
decided, why, and what it costs.

## D1. Name: Paimana (Step 1)
- **Decided by:** developer.
- **What:** the project is called Paimana (Hindi: a measure or yardstick), replacing the working
  name "LabLens" used in `LABLENS_MASTER_INSTRUCTIONS.md`. The master file keeps its original name
  because it is the unedited original record.
- **Still to do:** check GitHub and the web for name clashes before publishing.

## D2. TypeScript instead of JavaScript (Step 1)
- **Decided by:** developer. The master file specified plain JavaScript.
- **What:** server, client, fixtures, and eval are written in strict TypeScript (ES modules).
  `tsx` runs `.ts` directly for dev, tests, and scripts. `tsc --noEmit` is the type check.
  `tsc` compiles the server to `dist/` for Render. The client uses Vite's `react-ts` template.
- **Why:** type safety across the API boundary, and `zod` schemas can produce types with
  `z.infer`, so validation and types stay in sync.
- **Cost:** a build step for the server, and `tsx` does not type-check, so `npm run typecheck`
  is a separate required check on every PR.

## D3. Gemini runs the app; Claude only builds it (Step 1)
- **Decided by:** developer (confirming the master plan).
- **What:** every AI call in the running app goes to the Gemini API free tier through
  `services/llm.ts`. Claude Code is the coding assistant only and is never called by the app.
- **Why:** free to run; the Claude Pro plan does not include API credits for apps.
