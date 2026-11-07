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

## D4. Range and flag rules (Step 3)
- **Decided by:** the brief (Section 6). One point is flagged for the developer below.
- **Rules, as implemented in `rangeParser.ts` and `rangeEngine.ts`:**
  - Limits are **inclusive**: a value equal to a printed limit is `normal`.
  - One-sided ranges are supported: `< 200`, `<= 200`, `≤ 200`, `Up to 5.0` set only a high limit;
    `> 40`, `>= 40`, `≥ 40` set only a low limit. An upper-only range can never give `low`.
  - Accepted separators: hyphen, en dash, em dash, minus sign, and the word "to".
    Thousands separators (`11,000`) are accepted. A decimal comma (`13,5`) is rejected as ambiguous.
  - A unit may follow the range (`13 - 17 g/dL`). If both the range and the row have a unit and
    they differ, the row is `unchecked` ("Unit mismatch"). Differences in case, spaces, and µ/μ/u
    are not mismatches. There is **no unit conversion**: mg/dL vs mmol/L is a mismatch.
  - A unit on only one side is not a contradiction, so the row is still checked.
  - Missing range, unrecognised text (labels like `Desirable: < 200`, notes in brackets,
    several ranges in one cell, reversed ranges), or a missing/non-finite value give `unchecked`
    with a reason. The parser never guesses.
- **Flagged for the developer:** strictly read, `< 200` means 200 itself is above the range. The
  brief's "limits are inclusive" rule is applied to one-sided ranges too, so a value of exactly
  200 against `< 200` is `normal`. Change this if you prefer the strict reading; the test
  "value equal to a one-sided limit is normal" pins the current behaviour.
