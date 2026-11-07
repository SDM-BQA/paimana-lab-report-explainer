# Step-by-Step Build Guide: how each step was done, and what Claude did

This is the **runbook** for Paimana. Each step has its own git branch and pull request. The top
half of every step (goal, branch, prompt, checks) is written in advance. The bottom half
(**How Claude did it**, **Verification**, **Problems and fixes**, **Commits**) is filled in by
Claude at the end of the step, using only what actually happened. For reflection on decisions
and mistakes, see [`../AI_NOTES.md`](../AI_NOTES.md).

**How to use it:** paste the "Ask Claude" prompt for the current step into Claude Code. When the
step is done, review the PR diff yourself, merge it with a merge commit, then move on.

## Progress

| # | Branch | Status | PR |
|---|--------|--------|----|
| 1 | `chore/project-setup` | merged | #1 |
| 2 | `feat/server-skeleton` | in review | |
| 3 | `feat/range-engine` | not started | |
| 4 | `feat/explanations-data` | not started | |
| 5 | `feat/synthetic-fixtures` | not started | |
| 6 | `feat/llm-extraction` | not started | |
| 7 | `feat/analyze-endpoint` | not started | |
| 8 | `feat/client-upload-review` | not started | |
| 9 | `feat/client-results` | not started | |
| 10 | `test/eval-and-safety` | not started | |
| 11 | `chore/deploy-config` | not started | |
| 12 | `docs/final` | not started | |

Status values: `not started`, `in progress`, `in review`, `merged`.

## Kickoff prompt (paste once, at the start)

> Read PROJECT_BRIEF.md and CLAUDE.md fully. We will build one step per git branch and I will
> merge each PR myself. Start with Step 1 from docs/STEP_BY_STEP.md. Before each step, tell me
> in 2 to 3 sentences what you will do and why, and explain new concepts briefly. At the end of
> each step update docs/STEP_BY_STEP.md and AI_NOTES.md with what really happened, then open a PR
> and stop.

---

## Step 1: Project setup
**Branch:** `chore/project-setup`

**Goal:** A clean repo foundation: ignore rules that protect secrets, env examples, folder
skeleton, and the docs kit committed. No application code yet.

**Ask Claude:**
> Step 1. Extract the docs files from LABLENS_MASTER_INSTRUCTIONS.md (Parts 1 to 5), check the
> existing `.gitignore` already committed to main (extend it only if needed),
> create `server/.env.example` and `client/.env.example` from the brief, the empty folder skeleton from
> Section 8, and a short README stub. Confirm `.env` is ignored before the first commit.

**Checks:** `git status` shows no secrets. A test file named `server/.env` is ignored by
`git check-ignore`. Docs kit files are present.

**How Claude did it:**
- Bootstrap (on `main`, before this branch): checked that `ANTHROPIC_API_KEY` was not set
  (printed only "not set"), ran `git init -b main`, created `.gitignore` from Part 6, saved the
  master file, and made the single allowed commit on `main`.
- The developer then asked for two changes: rename the project to **Paimana** and use
  **TypeScript** instead of JavaScript. They also confirmed that the app uses Gemini, not Claude.
- On `chore/project-setup`, extracted Parts 1 to 5 into `PROJECT_BRIEF.md`, `CLAUDE.md`,
  `AI_NOTES.md`, `docs/STEP_BY_STEP.md`, and `.github/pull_request_template.md`, adapting them:
  name changed, `.js` file names changed to `.ts`, a TypeScript row and `tsx`/`tsc` tooling added
  to the stack, `npm run typecheck` added to the checks and the PR template, and the Render
  build/start changed to `npm run build` / `node dist/index.js`.
- Created `docs/DECISIONS.md` with D1 (name), D2 (TypeScript), D3 (Gemini runs the app).
- Created both `.env.example` files from Part 7, a README stub, and the Section 8 folder skeleton
  with `.gitkeep` files. Extended `.gitignore` with `*.tsbuildinfo`.
- Left the unrelated empty `test.ts` in the root uncommitted; awaiting the developer's decision.

**Verification:**
- Created temporary `server/.env` and `client/.env`; `git check-ignore -v` showed both ignored by
  the `.env` rule, plus `eval/cache/`, `server/dist/`, and `*.tsbuildinfo`. Deleted the temp files.
- `git check-ignore` on both `.env.example` files returned exit 1 (not ignored), as intended.
- Reviewed `git diff --staged` before each commit: the env examples contain empty placeholders only.

**Problems and fixes:**
- The master file was attached in chat rather than saved in the folder, so Claude wrote it into
  the repo from the chat content before the bootstrap commit.
- `gh` (GitHub CLI) is not installed and the repo has no remote yet, so the branch cannot be
  pushed or a PR opened until the developer adds the remote.
- Git prints "LF will be replaced by CRLF" warnings on Windows. These are harmless and left as is.

**Commits:**
- `docs: add docs kit adapted for Paimana and TypeScript`
- `chore: add env examples, folder skeleton, and README stub`
- `docs(notes): record step 1`

---

## Step 2: Server skeleton
**Branch:** `feat/server-skeleton`

**Goal:** A running Express server in TypeScript that is safe by default: validated config,
security headers, single-origin CORS, rate limiting, health route, consistent error shape. The
app is built in `app.ts` and started in `index.ts` so tests can import it.

**Ask Claude:**
> Step 2. Set up the server as a strict TypeScript ES-module project (`tsconfig.json`, `tsx` for
> dev and tests, `tsc` for typecheck and build). Build the Express skeleton from the brief:
> `config.ts` with zod validation that exits with a clear message when env vars are missing,
> `app.ts`, `index.ts`, helmet, CORS limited to `CORS_ORIGIN`, express-rate-limit,
> `GET /api/health`, and a JSON error handler returning `{ error }`. Add a test for the health
> route using node --test. Check current docs for express-rate-limit before using it.

**Checks:** `curl localhost:5000/api/health` returns `{"status":"ok"}`. Starting without env vars
exits with a readable error. `npm test`, `npm run typecheck`, and `npm run build` pass.

**How Claude did it:**
- Installed `express`, `helmet`, `cors`, `express-rate-limit`, `zod`, plus dev `typescript`,
  `tsx`, and type packages. npm resolved TypeScript 7.0, Express 5.3, express-rate-limit 8.7, and
  zod 4.6. Claude checked the installed packages' own README and `.d.ts` files instead of relying
  on memory: `limit`, `standardHeaders: "draft-8"`, `legacyHeaders`, and a JSON `message` for
  express-rate-limit; `z.url()`, `z.prettifyError`, and the `error` option for zod 4.
- Pinned `@types/node` to 22 (npm first installed 26) to match the Node 22 runtime.
- Two tsconfigs: `tsconfig.json` (strict, `nodenext`, `noEmit`, covers `src` and `test`) and
  `tsconfig.build.json` (emits `src` to `dist/`).
- `config.ts`: `parseConfig(env)` is pure; `loadConfig()` is the only `process.env` read.
- `app.ts` builds the app; `index.ts` only loads config and listens. Added `errors.ts`
  (`HttpError`, 404 handler, JSON error handler), a file not listed in the brief's structure.
- Tests start the real app on port 0 and use Node's built-in `fetch`, so no `supertest`.
- The dev script loads `server/.env` with Node's `--env-file-if-exists`, so no `dotenv`.
- `trust proxy` is left for Step 11 as planned.

**Verification:**
- `npm run typecheck`: clean. `npm test`: 13 tests, 13 pass (health, 404, malformed JSON,
  helmet headers, CORS allow/deny, 429 after limit, config validation, no secret in errors).
- `npm run build` produced `dist/`. Started `node dist/index.js` with fake inline env values:
  `curl /api/health` returned `200 {"status":"ok"}` with `RateLimit` and `nosniff` headers;
  `/nope` returned `{"error":"Not found"}`.
- Started with no env vars: exited with code 1 and listed each missing variable by name.
- `npm run dev` (tsx) ran and showed the same fail-fast message when no `.env` exists.

**Problems and fixes:**
- The first fail-fast message for a *missing* variable was zod's generic "Invalid input: expected
  string, received undefined". Claude had put the friendly message only on `.min(1)`, which never
  runs when the value is absent. Caught by the manual no-env start, not by the tests. Fixed by
  passing the message as zod 4's `error` option on the base schema, and added test assertions.

**Commits:**
- `chore(server): set up strict TypeScript project with tsx and tsc`
- `feat(server): add Express skeleton with fail-fast config and health route`
- `docs(notes): record step 2`

---

## Step 3: Range engine (the core)
**Branch:** `feat/range-engine`

**Goal:** Deterministic flagging. `rangeParser` converts printed range text such as
`13.0 - 17.0`, `< 200`, `> 40` into limits. `rangeEngine` returns `low | normal | high |
unchecked` with a reason. Limits are inclusive. Unit mismatch, missing, unparseable, and
non-numeric all return `unchecked`.

**Ask Claude:**
> Step 3. Write `rangeParser.ts` and `rangeEngine.ts` with thorough `node --test` tests. Cover:
> normal range, one-sided ranges, values exactly on limits (inclusive), decimals, en dash and
> hyphen separators, spaces, a unit written inside the range text that differs from the row unit,
> missing range, garbage range text, and null values. Write the tests first, then the code. Do not
> guess when parsing fails; return unchecked with a reason. Model the status as a TypeScript
> union type.

**Checks:** `npm test` and `npm run typecheck` pass; every status and every edge case in
Section 12 of the brief has a test.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 4: Explanations data
**Branch:** `feat/explanations-data`

**Goal:** Curated, sourced explanation text for 8 to 10 common tests, a loader that ignores
unreviewed entries, and alias normalization (for example "Hb" and "Haemoglobin" both map to one key).

**Ask Claude:**
> Step 4. Create `explanations.json` for 8 to 10 common blood tests using the shape in the brief.
> Draft general, non-diagnostic text only, include a real `source` for each, and set
> `"reviewed": false` on all of them. Write the loader with alias normalization (validate the JSON
> with zod on load) and tests: unreviewed entries are ignored, every entry has a source, alias
> lookup is case-insensitive. Do not include numeric reference ranges or any medicine,
> supplement, or dosage text.

**Developer task (not Claude's):** Open each entry, check it against its cited source, edit the
wording if needed, then set `"reviewed": true` yourself. Entries you have not checked stay `false`.

**Checks:** Tests and typecheck pass. App ignores `reviewed: false` entries. You have reviewed at
least the entries you plan to use in the demo.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 5: Synthetic fixtures
**Branch:** `feat/synthetic-fixtures`

**Goal:** Ten fake lab reports with ground truth, covering the cases in Section 12 of the brief.
These drive the eval and the demo. No real patient data, ever.

**Ask Claude:**
> Step 5. Add `pdfkit` as a dev dependency and write `fixtures/generate.ts` that produces ten
> synthetic report PDFs and a matching `fixtures/truth/NN.json` for each (rows plus expected
> statuses). Use obviously fake values and no patient details. Cover the ten cases in the brief,
> including the injection line in report 10.

**Developer task:** Open three PDFs and check them against their truth files. Screenshot one PDF
to make a PNG for the image-reading test.

**Checks:** Generation is repeatable. Truth files match the PDFs. Feeding truth rows to the
engine produces the expected statuses (a quick script or test).

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 6: LLM extraction
**Branch:** `feat/llm-extraction`

**Goal:** `POST /api/extract` accepts a PDF or image in memory, asks Gemini for structured rows,
validates them with `zod`, and returns them. No file touches disk. Nothing is logged.

**Ask Claude:**
> Step 6. Check the current Gemini JS/TS SDK docs and Google AI Studio for a free-tier model, then
> build `services/llm.ts` with structured JSON output, the extraction prompt from the brief,
> zod validation (unknown keys dropped, no patient fields), retry with backoff on 429, and
> `/api/extract` using multer memory storage with a 5 MB cap and PDF/PNG/JPG only. Mock the LLM
> in tests. Do not log bodies, file names, or values.

**Developer task:** Put your key in `server/.env` (never in chat). Choose the model name.

**Checks:** Mocked tests and typecheck pass. Manual run on three fixtures shows sensible rows.
Confirm no uploaded file is written to disk and no values appear in server logs.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 7: Analyze endpoint
**Branch:** `feat/analyze-endpoint`

**Goal:** `POST /api/analyze` runs the engine, attaches curated explanations to low/high rows,
optionally rephrases or translates to Hindi with Gemini, lints the result, falls back to curated
English text on any failure, and appends the fixed disclaimer in code.

**Ask Claude:**
> Step 7. Build `/api/analyze` and `services/explain.ts` and `services/safetyLint.ts` with a
> denylist file. Flow: engine, curated lookup, optional rephrase for Hindi, lint, fallback. The
> disclaimer is added by code. Normal rows get no explanation. Validate input with zod (max 60
> rows). Tests: LLM failure falls back, lint rejects diagnosis or medicine wording, normal rows
> get no explanation, unreviewed entries are never used.

**Checks:** Tests and typecheck pass. Manual run on fixtures 02, 03, and 10. Read each generated
explanation yourself.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 8: Client upload and review
**Branch:** `feat/client-upload-review`

**Goal:** A React + TypeScript UI to upload a report or type values, then review and edit the
extracted rows before analysis. Includes sample-report buttons and the privacy banner.

**Ask Claude:**
> Step 8. Scaffold the Vite React client with the `react-ts` template. Build: file upload, manual
> entry form, an editable rows table, sample-report buttons, and a banner saying "Demo only. Use
> the sample reports, not real medical data." Read `VITE_API_URL` from env. Show clear errors. On
> page load, call `/api/health` to wake the server and show a "waking up the server" message if
> it is slow.

**Checks:** Works against the local server. `npm run build` in `client/` passes (it type-checks).
Errors show readable messages. Edited values are what get sent next.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 9: Client results
**Branch:** `feat/client-results`

**Goal:** Results view with flag badges, explanations for flagged rows, English/Hindi toggle,
and the disclaimer visible on the page.

**Ask Claude:**
> Step 9. Build the results view: a table with low/normal/high/unchecked badges that do not rely
> on color alone, explanations for flagged rows, an EN/HI toggle, the disclaimer from the server,
> and a permanent "not medical advice" notice. Show the reason for any unchecked row.

**Checks:** End to end locally: sample report in, results out, language toggle works, unchecked
rows explain why.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 10: Eval and safety
**Branch:** `test/eval-and-safety`

**Goal:** Measure it. Extraction accuracy per field, flag accuracy, safety-lint pass rate, and the
injection check, saved to `eval/results/latest.md`.

**Ask Claude:**
> Step 10. Write `eval/run-eval.ts`: for each fixture, run extraction (cached by file hash in
> `eval/cache`, gitignored, with delays and 429 backoff), compare to truth per field, run the
> engine on truth rows, run analyze on flagged rows and lint the explanations, and check fixture
> 10 for diagnosis or treatment text. Write a markdown summary to `eval/results/latest.md`.

**Checks:** The script runs end to end within free-tier limits and prints the table. You manually
read the explanation outputs for fixtures 02, 03, and 10.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 11: Deploy
**Branch:** `chore/deploy-config`

**Goal:** Backend live on Render, frontend live on Vercel, CORS restricted to the Vercel origin.

**Ask Claude:**
> Step 11. Prepare deployment per Section 13 of the brief: `trust proxy`, port from
> `process.env.PORT`, CORS origin from env, the TypeScript build for Render (`npm run build`,
> start `node dist/index.js`), and a short `docs/DEPLOY.md` with the exact Render and Vercel
> settings. Do not touch my dashboards; give me the steps and I will do them.

**Developer task:** Follow the order: Render first, then Vercel with `VITE_API_URL`, then set
`CORS_ORIGIN` on Render and redeploy. Never paste keys into chat.

**Checks:** Live `/api/health` works. A sample report works end to end on the live site. A request
from another origin is blocked by CORS. The first request after idle shows the wake-up message.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_

---

## Step 12: Final docs
**Branch:** `docs/final`

**Goal:** README, decisions, case study, and finished notes. Tag `v1.0.0`.

**Ask Claude:**
> Step 12. Write `README.md` (what it is, GIF or screenshots of synthetic data only, setup,
> architecture, limitations, "How I used AI"), finish `docs/DECISIONS.md` (inclusive limits, no
> unit conversion, no DB, curated explanations, Gemini free tier, TypeScript), and a
> `docs/CASE_STUDY.md` draft from the brief outline. Do not write my "What I learned" section.
> Fill in the eval table from `eval/results/latest.md`.

**Developer task:** Write "What I learned" and the "What I decided myself" sections in
`AI_NOTES.md`. Curate the "Where AI was wrong" table. Tag `v1.0.0` after merging.

**Checks:** Links work. README setup works from a fresh clone if time allows. No real medical data
in any screenshot.

**How Claude did it:** _(fill in)_

**Verification:** _(fill in)_

**Problems and fixes:** _(fill in)_

**Commits:** _(fill in)_
