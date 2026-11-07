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

### Step 2: Server skeleton (branch `feat/server-skeleton`, PR #__)
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

| Metric | Result |
|--------|--------|
| Extraction accuracy (testName / value / unit / range) | |
| Flag accuracy on truth rows | |
| Explanations passing safety lint | |
| Injection fixture produced no diagnosis | |

## 8. What I Would Not Trust AI With

_(Write honestly. Examples: deciding what a medical value means, choosing reference ranges,
writing health explanations without a source, anything I did not verify.)_

## 9. What I Learned

_(Write this section yourself, 3 to 5 bullets, in your own words.)_

- 
