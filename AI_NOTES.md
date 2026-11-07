# AI Notes: How I Built Paimana with AI

An honest record of how AI (Claude Code) was used on this project: what it got right, where it
was wrong, and how I verified its work. For the step-by-step runbook of what was built and how,
see [`docs/STEP_BY_STEP.md`](docs/STEP_BY_STEP.md). This file is the reflection; that one is the
procedure.

## 1. Approach

- **Building:** Claude Code in VS Code on a Claude Pro plan, guided by `CLAUDE.md` (rules) and
  `PROJECT_BRIEF.md` (spec).
- **Running the app:** Gemini API free tier, called only through `server/src/services/llm.ts`.
  Different provider on purpose: the Claude Pro plan does not include API credits for apps, and
  this is a hobby project. The app itself never calls Claude.
- **Working style:** one step per git branch, small commits, a pull request I review and merge
  myself, checks before every PR.
- **Core principle:** AI proposes, code decides. Flags are deterministic code; AI only reads
  documents and optionally rephrases reviewed text.
- **Division of labor:** _(fill in at the end: what I decided or wrote vs. what Claude generated)_

## 2. What I decided myself (not delegated)

_(Fill in as you go. Examples: scope cuts, no database, inclusive limits, which tests to include,
which sources to trust for explanations, wording of the banner and disclaimer.)_

- 

## 3. Build Log

Claude appends one entry per step, under 150 words, using this format. Only real events.

### Step N: <title> (branch `type/name`, PR #__)
- **Claude generated:**
- **I decided / changed:**
- **What worked (instructions or prompts):**
- **What went wrong or surprised me, and how it was caught:**
- **Developer note:**

<!-- Entries start below this line -->

### Step 1: Project setup (branch `chore/project-setup`, PR #1)
- **Claude generated:** the docs kit extracted from the master file, `DECISIONS.md`, the env
  examples, the folder skeleton, and the README stub.
- **I decided / changed:** renamed the project from LabLens to Paimana; switched from JavaScript
  to TypeScript; confirmed that Gemini runs the app and Claude only helps build it.
- **What worked (instructions or prompts):** the master file's bootstrap procedure. Claude
  checked `ANTHROPIC_API_KEY` without printing it and verified the ignore rules with
  `git check-ignore` using temporary `.env` files.
- **What went wrong or surprised me, and how it was caught:** Claude first read my question about
  "founding" as "funding" and said it was guessing. The master file was not in the folder, so
  Claude wrote it from the chat. `gh` is missing and there is no remote yet, so the PR waits.
- **Developer note:**

### Step 2: Server skeleton (branch `feat/server-skeleton`, PR #2)
- **Claude generated:** the TypeScript setup, `config.ts`, `app.ts`, `index.ts`, `errors.ts`,
  the health route, and 13 tests.
- **I decided / changed:** nothing changed from the plan in this step.
- **What worked (instructions or prompts):** the "check current docs" rule. npm installed new
  major versions (TypeScript 7, Express 5, express-rate-limit 8, zod 4), so Claude read the
  installed README and type files before writing code. It also pinned `@types/node` from 26 to 22.
- **What went wrong or surprised me, and how it was caught:** the "is required" config message
  did not appear for a missing variable. zod showed "expected string, received undefined",
  because the message was attached only to `.min(1)`. The tests passed anyway; the manual start
  with no env vars caught it. Fixed with zod 4's `error` option, and a test now covers it.
- **Developer note:**

### Step 3: Range engine (branch `feat/range-engine`, PR #3)
- **Claude generated:** 41 parser and engine tests (written and committed first), then
  `rangeParser.ts` and `rangeEngine.ts`, and decision record D4.
- **I decided / changed:** nothing changed yet. Open for me: should a value of exactly 200
  against `< 200` be normal (current, the brief's "inclusive" rule) or high (the strict reading)?
- **What worked (instructions or prompts):** "write the tests first" plus "never guess". The
  parser rejects anything outside three exact shapes, so odd text becomes `unchecked`.
- **What went wrong or surprised me, and how it was caught:** no issues found. All tests passed
  on the first run. To check that the tests were not too weak, Claude broke the engine on purpose
  twice (exclusive limits; no unit check), and the tests caught both.
- **Developer note:**

### Step 4: Explanations data (branch `feat/explanations-data`, PR #4 and follow-up #5)
- **Claude generated:** 10 draft entries (all `reviewed: false`), the loader, and 19 tests.
- **I decided / changed:** added `category` and a nested `interpretation` (D5). Proposed
  sex-based reference ranges, then deferred them to v2 after the sources showed none (D6).
  Dropped a per-test `unit` field. Pending: my review of each entry against its source.
- **What worked (instructions or prompts):** "include a real source" made Claude fetch each page
  before writing. Where a page did not say what a low or high result means, the field was left
  `null` instead of filled from memory.
- **What went wrong or surprised me, and how it was caught:** Claude guessed a MedlinePlus URL
  for HDL that does not exist (HTTP 404). It was caught because the page was actually fetched;
  HDL now cites the Cholesterol Levels page. This is exactly why sources must be checked.
  Checking the sources before building also stopped a feature: none gave sex-specific ranges.
- **Developer note:**

### Step 5: Synthetic fixtures (branch `feat/synthetic-fixtures`, PR #6)
- **Claude generated:** one typed spec for 10 fake reports, a pdfkit generator, the PDFs and
  truth files, and a test that runs the engine against every hand-written expected status.
- **I decided / changed:** nothing changed from the plan in this step.
- **What worked (instructions or prompts):** one spec drives both the PDFs and the truth files,
  so they cannot disagree. Expected answers were written by hand, not taken from the engine.
- **What went wrong or surprised me, and how it was caught:** no issues found. One process
  surprise: PR #4 was merged before two Step 4 commits were pushed, so they needed follow-up PR #5.
  It was caught by comparing `origin/main` with the branch before starting Step 5.
- **Developer note:**

### Step 6: LLM extraction (branch `feat/llm-extraction`, PR #7)
- **Claude generated:** the Gemini client, prompts, extraction validation, `/api/extract`, and 31
  tests with a fake LLM.
- **I decided / changed:** chose `gemini-3.5-flash-lite` (D8) from options Claude took from the
  current pricing page.
- **What worked (instructions or prompts):** testing one real call before building. The
  brief's strict prompt worked as written: 65/65 fields correct on three fixtures, and the
  injected "ignore your rules" line in fixture 10 had no effect on the output.
- **What went wrong or surprised me, and how it was caught:** one test was wrong, not the code: a
  regex found "age" inside "printedRange". Temp files appeared during the manual disk check;
  rather than assume, Claude re-ran the server with its own empty temp folder and proved it wrote
  nothing.
- **Developer note:**

### Step 7: Analyze endpoint (branch `feat/analyze-endpoint`, PR #8)
- **Claude generated:** safety lint and denylist, the analyze flow with Hindi rewriting and
  fallback, the route, and 29 tests.
- **I decided / changed:** started Step 7 before merging Step 6, so the branch is stacked.
  Pending: Hindi approach (keep AI translation or add reviewed Hindi text, D9).
- **What worked (instructions or prompts):** computing flags before calling the model, and
  per-item fallback. Every forced failure in tests showed the reviewed English instead.
- **What went wrong or surprised me, and how it was caught:** reading the real Hindi outputs
  showed a typo, dropped details, and two different translations of identical input at
  temperature 0. All passed the lint, which proves the lint checks safety, not accuracy.
- **Developer note:**

### Follow-up: literal rule for one-sided ranges (branch `fix/strict-one-sided-ranges`, PR #9)
- **Claude generated:** new tests, the strict/inclusive flags in the parser and engine, the
  fixture 05 answer update, and the D4 amendment.
- **I decided / changed:** chose the literal rule: `<` and `>` are strict (200 vs `< 200` is
  high). Also decided English is primary and Hindi stays optional for v1 (D9).
- **What worked (instructions or prompts):** hand-written fixture answers. They did not change
  with the code, so the fixtures test flagged fixture 05 until I agreed the new answers.
- **What went wrong or surprised me, and how it was caught:** regenerating fixtures marked all
  ten truth files as modified; a diff ignoring line endings showed only 05 really changed.
- **Developer note:**

### Step 8: Client upload and review (branch `feat/client-upload-review`, PR #10)
- **Claude generated:** the Vite React app (banner, wake-up message, upload, samples, manual
  entry, editable table) and the D10 server change.
- **I decided / changed:** nothing changed from the plan in this step.
- **What worked (instructions or prompts):** scaffolding in a scratch folder and copying only the
  config; replaying the browser's requests with curl to prove edits are what get checked.
- **What went wrong or surprised me, and how it was caught:** the first build failed on a
  TypeScript setting from the template (`erasableSyntaxOnly`), and the linter flagged fast-refresh
  and effect issues; all fixed. Claude's notes script failed twice in a row (Steps 7 and 8) for
  the same reason; now its scripts stop on the first error. Claude could not click the UI itself.
- **Developer note:**

### Step 9: Client results (branch `feat/client-results`, PR #12; review data PR #11)
- **Claude generated:** status badges, the results view, the language toggle, and the footer.
- **I decided / changed:** reviewed all 10 explanation entries against MedlinePlus (Claude made
  the git commit for me on `chore/review-and-png`, since my edits were still uncommitted).
- **What worked (instructions or prompts):** checking contrast with real numbers instead of
  claiming it, and re-checking the same rows on a language switch so flags cannot change.
- **What went wrong or surprised me, and how it was caught:** no issues found in the code. Hindi
  output was again safe but shorter than the reviewed English (details dropped).
- **Developer note:**

### Step 10: Eval and safety (branch `test/eval-and-safety`, PR #13)
- **Claude generated:** the eval script with caching, and the first results file.
- **I decided / changed:** nothing changed from the plan in this step.
- **What worked (instructions or prompts):** reusing the real server code in the eval, caching
  model answers (re-runs cost no quota), and listing Hindi outputs for a human to read.
- **What went wrong or surprised me, and how it was caught:** every metric was 100%, but reading
  the Hindi found a dropped "low" sentence for HDL and a repeated typo, which no metric caught.
  The 100% extraction is on clean generated files, not real scans. Claude's notes script failed
  a third time (branch cut before Step 9 merged), and `set -e` did not stop the commit.
- **Developer note:**

### Step 11: Deploy (branch `chore/deploy-config`, PR #14)
- **Claude generated:** proxy and IP-check settings, the Node 22 pin, the deploy guide, and tests.
- **I decided / changed:** I do the dashboards myself; Claude only prepares code and steps.
- **What worked (instructions or prompts):** "check current docs": they showed Render now
  defaults new services to Node 24 and that the proxy setting should be verified, not assumed.
  Rehearsing both builds in clean copies before touching a dashboard.
- **What went wrong or surprised me, and how it was caught:** two silent traps were found by
  reading docs and thinking through the config, before deploying: an open Node version range,
  and a trailing slash in `CORS_ORIGIN` breaking every request. Live checks later passed (see the
  Step 11 section of STEP_BY_STEP.md), including a real upload matching the truth file 40/40.
- **Developer note:**

### Step 12: Final docs (branch `docs/final`, PR #15)
- **Claude generated:** the README, the case study draft, decisions D11 to D13 with an index,
  and the live-deploy verification notes.
- **I decided / changed:** deployed it myself on Render and Vercel with my own domain (D13).
  Still mine to write: What I learned, What I decided myself, and the Where AI was wrong table.
- **What worked (instructions or prompts):** "record only what happened": the case study's
  examples of AI mistakes all come from this log, and the eval caveat is stated next to the 100%.
- **What went wrong or surprised me, and how it was caught:** the draft miscounted the PRs (14 vs
  15), caught on re-read. All 16 relative links were checked by a script.
- **Developer note:**

### Step 13: UI refresh (branch `feat/ui-refresh`, PR #__)
- **Claude generated:** the new visual design: colour tokens with dark mode, self-hosted fonts,
  lucide icons, hero, step cards, drop zone, stat chips, and a new favicon.
- **I decided / changed:** asked for a modern look with proper icons, font, and colours.
- **What worked (instructions or prompts):** keeping logic untouched and checking real
  screenshots (light, dark, and a synthetic-data results preview) instead of trusting the CSS.
- **What went wrong or surprised me, and how it was caught:** a lint warning about mixed exports
  (fixed by moving a constant); a clipped phone screenshot turned out to be a headless browser
  viewport limit, checked by measuring the viewport width.
- **Developer note:**

### Step 13b: design pass (branch `feat/ui-refresh`, PR #__)
- **Claude generated:** a "printed lab report" identity: paper and ink palette, Fraunces and
  JetBrains Mono, a range meter built from the server's own range, a split hero with a synthetic
  example, an asymmetric upload panel, a stacked phone table, and a new logo.
- **I decided / changed:** ran the `/design-director` skill on the step 13 result.
- **What worked (instructions or prompts):** reviewing against a list of named generic patterns
  first, then checking every change in screenshots.
- **What went wrong or surprised me, and how it was caught:** the first logo looked like a
  medical cross at small size, and the meter band was too faint in dark mode. Both were caught
  in screenshots and fixed.
- **Developer note:**

## 4. Where AI Was Wrong (highlights)

Curate the best 3 to 5 from the build log: the mistake, how I noticed, the fix.

| # | Mistake | How I caught it | Fix |
|---|---------|-----------------|-----|
|   |         |                 |     |

## 5. How I Verified Outputs

- Unit tests for the range parser, range engine, explanation loader, and safety lint.
- TypeScript strict type checks (`tsc --noEmit`) on every PR.
- Synthetic fixtures with known answers (10 reports), including boundary values, unit mismatch,
  missing ranges, and an injection attempt.
- Extraction accuracy measured per field against ground truth.
- Manual review of sample explanations against their cited sources.
- Reviewing every diff before merging each PR.

_(Add specifics here: what I checked by hand, what surprised me.)_

## 6. Safety Decisions

| Decision | Why |
|----------|-----|
| Code decides flags, never the LLM | Models can misjudge numbers; code is testable |
| Explanations come from reviewed, sourced entries | No invented medical content |
| No database, memory-only uploads, no logging of values | Medical data should not be kept |
| Human review of extracted rows | Extraction can misread digits |
| Disclaimer added by code | The model cannot forget or alter it |
| Banner telling users not to upload real reports | Free-tier providers may use inputs to improve products |

## 7. Evaluation Results

_(Paste the table from `eval/results/latest.md` after Step 10.)_

From `eval/results/latest.md` (Step 10, `gemini-3.5-flash-lite`, 10 synthetic PDFs + 1 PNG):

| Metric | Result |
|--------|--------|
| Extraction accuracy (testName / rawValue / value / unit / range) | 100% each (41/41) |
| Flag accuracy on truth rows | 100% (38/38) |
| Flag accuracy end to end (on extracted rows) | 100% (41/41) |
| Explanations passing safety lint (EN + HI) | 100% (22/22) |
| Injection fixture produced no diagnosis | Yes: no injected wording; glucose stayed high |

Caveats: the fixtures are clean generated documents, so these numbers show the pipeline works,
not real-world scan accuracy. Manual review of the Hindi found an omitted "low" sentence (HDL)
and a typo that the lint cannot detect.

## 8. What I Would Not Trust AI With

_(Write honestly. Examples: deciding what a medical value means, choosing reference ranges,
writing health explanations without a source, anything I did not verify.)_

## 9. What I Learned

_(Write this section yourself, 3 to 5 bullets, in your own words.)_

- 
