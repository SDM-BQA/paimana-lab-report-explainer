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

## D5. Explanation entries get a category and a nested interpretation (Step 4)
- **Decided by:** developer.
- **What:** each entry in `explanations.json` has a `category` from a fixed list (Blood count,
  Blood sugar, Lipids, Kidney, Thyroid) and its `low`/`high` text moves under `interpretation`.
- **Why:** the UI can group results by category; the nested shape reads more clearly.
- **Not adopted from the same proposal (yet):** a per-test `unit` list and sex-based
  `referenceRange`. Units vary by lab, and v1 has no unit conversion (D4). Sex-based ranges are an
  open scope question; see the Step 4 notes for what the sources contain.

## D6. Sex-based fallback ranges: investigated, deferred to v2 (Step 4)
- **Decided by:** developer, after reviewing what the sources contain.
- **Proposal:** store reference ranges per sex in `explanations.json` and use them when a report
  has no printed range.
- **What the sources showed** (MedlinePlus pages fetched in Step 4):
  - No numeric range at all for hemoglobin, WBC, platelets, glucose, creatinine, or TSH. The
    hemoglobin page says ranges "may vary, based on the laboratory used and your age, race, and sex".
  - Numbers exist only for HbA1c (below 5.7%), total cholesterol (under 200 mg/dL for adults,
    under 170 for ages 19 and under), triglycerides (under 150 mg/dL for adults), and HDL, where
    the same page gives two different thresholds ("low" vs "best").
  - None of the 10 tests had a clear sex-specific range; where numbers exist they depend on age.
- **Decision:** v1 keeps the printed range as the only source of truth (D4). No sex or age is
  collected. Rows without a printed range stay `unchecked`.
- **Why:** picking between conflicting thresholds would be a medical judgment by the code or AI;
  sex and age would add patient data; the sources themselves point to the lab's own range.
- **v2 idea:** a fallback range only when the report has none, with the user choosing sex (and
  age group) in the UI, never stored, results labelled "general range, not your lab's", every
  range sourced and reviewed by the developer.

## D7. The model copies text; code converts it to numbers (Step 6)
- **Decided by:** Claude's design, following the brief's "AI proposes, code decides" rule.
- **What:** the extraction schema asks Gemini only for text: `testName`, `rawValue`, `unit`,
  `printedRange`. It has no numeric `value` field and no patient fields. Code then turns `rawValue`
  into `value` with `parseNumericValue` (same thousands rule as the range parser). Anything that
  is not a plain number (`Positive`, `< 0.5`, `13,5`) becomes `null`, and the row is unchecked.
- **Why:** a model that "helpfully" converts or rounds a number would silently change a flag.
  Copying text is easier to verify, and the user still reviews every row before analysis.

## D8. Model: gemini-3.5-flash-lite (Step 6)
- **Decided by:** developer, from the options Claude listed.
- **How it was chosen:** the current Gemini pricing page (fetched in Step 6) lists it as free tier,
  stable (not preview, not deprecated), with image input. Gemini 2.5 Flash/Pro were avoided
  because the page marks them deprecated from December 1, 2026. PDF input was not stated on the
  page, so it was tested for real before any code was built.
- **Result so far:** fixtures 01, 04, 06, and 10 extracted with every field correct; about 2 s
  and 800 tokens per report. Switching models is a one-line `GEMINI_MODEL` change.
- **Caveat:** every free-tier model is marked "Used to improve our products: Yes", so the UI must
  warn users not to upload real reports. Requests set `store: false`, but that does not change
  the free-tier terms.
