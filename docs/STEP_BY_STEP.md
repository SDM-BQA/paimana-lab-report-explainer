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
| 2 | `feat/server-skeleton` | merged | #2 |
| 3 | `feat/range-engine` | merged | #3 |
| 4 | `feat/explanations-data` | merged | #4, #5 (follow-up) |
| 5 | `feat/synthetic-fixtures` | merged | #6 |
| 6 | `feat/llm-extraction` | merged | #7 |
| 7 | `feat/analyze-endpoint` | merged | #8 |
| 8 | `feat/client-upload-review` | in review | |
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

**How Claude did it:**
- Tests first: wrote `test/rangeParser.test.ts` and `test/rangeEngine.test.ts`, ran them, and
  confirmed they failed (`ERR_MODULE_NOT_FOUND`, because the services did not exist yet). They
  were committed on their own so the history shows tests before code.
- `rangeParser.ts`: three anchored regexes (two-sided, upper-only, lower-only) on normalized text
  (dash variants → hyphen, thousands commas removed). Text after the numbers must look like a
  single unit token, otherwise the range is unparseable. Returns a discriminated union
  (`ok: true` with limits, or `ok: false` with `kind` and `reason`).
- `rangeEngine.ts`: pure `evaluate({ value, unit, printedRange })` → `{ status, range, reason }`.
  Checks in order: value, range present, range parseable, unit contradiction, then compares
  with inclusive limits. Reason strings are exported as `REASONS` so later steps and fixtures
  can match them exactly.
- Recorded the rules in `docs/DECISIONS.md` D4, flagging one open point: whether a value equal to
  a one-sided limit (`200` vs `< 200`) should be normal (current) or high.
- Each Section 12 fixture case (01 to 10) has at least one matching engine test.

**Verification:**
- `npm run typecheck`: clean. `npm test`: 54 tests, 54 pass (13 from Step 2, 41 new).
- Mutation check: temporarily made limits exclusive → 2 tests failed; temporarily removed the
  unit-mismatch check → 1 test failed. The original code was restored and passed 54/54.

**Problems and fixes:**
- No issues found. The code passed every test on its first run, which is why the mutation check
  was added: to confirm the tests can actually fail.

**Later change (branch `fix/strict-one-sided-ranges`, after Step 7):** the developer chose the
literal rule for one-sided ranges (D4 amendment). Tests were changed first and failed (4), then
the parser gained `lowInclusive`/`highInclusive` and the engine follows them. The fixtures test then
failed on fixture 05, whose hand-written answers still said normal; they were updated by hand
(Total Cholesterol 200 vs `< 200` → high, HDL 40 vs `> 40` → low). PDF 05 regenerated
byte-identical. 156/156 tests pass.

**Commits:**
- `test(engine): specify range parser and engine behaviour before code`
- `feat(engine): add deterministic range parser and flag engine`
- `docs(notes): record step 3`

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

**How Claude did it:**
- Chose 10 common tests: hemoglobin, WBC, platelets, glucose, HbA1c, total cholesterol, HDL,
  triglycerides, creatinine, TSH.
- Fetched each MedlinePlus page in this session and drafted the text only from what the page
  said: what the test measures, then what low or high results can generally relate to. Where a
  page does not cover a direction (low HbA1c, low total cholesterol, high HDL), that field is
  `null` rather than written from memory. All entries are `"reviewed": false`.
- `services/explanations.ts`: validates the JSON with a strict zod schema at startup, normalizes
  names (case and punctuation), and tries the name as printed, without brackets, and inside
  brackets. Exact match only, no fuzzy matching. Unreviewed entries are never returned. Alias
  clashes throw at startup.
- The JSON is imported with `with { type: "json" }`, so `tsc` copies it into `dist/`.
- **Developer proposals during review:**
  - Proposed a `unit` field per entry. Claude advised against it (units vary by lab, and v1 has
    no conversion), and it was not added.
  - Proposed `category`, nested `interpretation`, and sex-based `referenceRange`. The developer
    chose to add the first two (D5). A one-off script restructured the JSON, then every value was
    compared with the previous commit: all text identical, 10/10 entries.
  - For sex-based ranges, Claude fetched the range information from every source page before
    writing anything. The sources gave no sex-specific ranges (details in D6), so the developer
    chose to defer the feature to v2.

**Verification:**
- `npm run typecheck`: clean. `npm test`: 73 tests, 73 pass (19 new). After the D5
  restructure: 75 tests, 75 pass (2 more: unknown category rejected, top-level low/high rejected).
- Built with `npm run build`; `dist/data/explanations.json` exists. Loading the compiled module
  under plain Node reported 10 entries, 0 reviewed, and `find("Hb")` → `null`.
- Tests on the real file: valid shape, 8 to 10 entries, https source on each, no digits in the
  text, no medicine, dose, treatment, or "you have" wording.

**Problems and fixes:**
- Claude's first guess for an HDL source URL (`/lab-tests/hdl-cholesterol-test/`) returned
  HTTP 404. Caught by fetching it. HDL now cites the Cholesterol Levels page, which covers HDL.
- HbA1c's display name contains digits, so the text-has-no-numbers rule meant its explanation
  could not repeat "HbA1c". The text says "A high result" instead.
- During the D5 restructure, Claude's shell command `python - || node ...` silently did nothing,
  because Python exists on this machine and succeeded on empty input, so the Node fallback never
  ran. Caught by checking that the grep for the new fields printed nothing; re-ran with Node directly.
- The tool that summarizes fetched pages gave different HDL thresholds in two fetches of the same
  page ("< 40 / < 50 is low" vs "≥ 60 is best"). Both appear on the page. This ambiguity is one
  reason sex-based ranges were deferred (D6).

**Developer review checklist (Step 4 task):**

| Key | Source page | Checked | `reviewed` set |
|-----|-------------|---------|----------------|
| hemoglobin | Hemoglobin Test | | |
| wbc | White Blood Count (WBC) | | |
| platelets | Platelet Tests | | |
| glucose | Blood Glucose Test | | |
| hba1c | Hemoglobin A1C (HbA1c) Test | | |
| total_cholesterol | Cholesterol Levels | | |
| hdl | Cholesterol Levels | | |
| triglycerides | Triglycerides Test | | |
| creatinine | Creatinine Test | | |
| tsh | TSH Test | | |

**Commits:**
- `feat(data): draft 10 explanation entries, all unreviewed`
- `feat(explanations): add loader with alias lookup and review gate`
- `feat(explanations): add category and nest low/high under interpretation`
- `docs(notes): record step 4`

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

**How Claude did it:**
- `server/scripts/fixtureSpec.ts` holds all 10 reports as typed data. Each row's expected status
  (and reason, for unchecked rows) is written by hand from the D4 rules, not computed by the engine.
- `server/scripts/generate-fixtures.ts` (pdfkit) writes `fixtures/reports/NN.pdf` and
  `fixtures/truth/NN.json` from the same spec. Fixed dates and metadata make output deterministic.
  Every PDF says "SYNTHETIC TEST REPORT - NOT A REAL PERSON". There are no patient details.
- Deliberate details: fixture 03 uses an en dash range and the name "Haemoglobin (Hb)"; 06 has
  mmol/L and µmol/L results against mg/dL ranges; 07 has empty range cells; 08 has
  "Negative"/"Positive" results; 10 has an italic "NOTE TO AI SYSTEMS" injection line.
- **Layout change:** the generator lives in `server/scripts/`, not `fixtures/generate.ts`. Node
  resolves `pdfkit` from the importing file's folder, and it is installed in `server/`.
  `scripts/` is type-checked but not in the Render build. CLAUDE.md and the brief were updated.
- `test/fixtures.test.ts` reads the committed truth files and runs the engine on every row.

**Verification:**
- Ran `npm run fixtures` twice; SHA-256 hashes of all 10 PDFs were identical (repeatable).
- `npm run typecheck`: clean. `npm test`: 91 tests, 91 pass (16 new). The engine matched every
  hand-written status and reason in all 10 fixtures; all four statuses are covered.
- `npm run build`: `dist/` has no `scripts/` folder.
- Claude opened PDFs 03 and 10 as rendered pages: µ, the en dash, and the injection line display correctly.

**Problems and fixes:** No issues found.

**Developer task status:** open 3 PDFs and compare with their truth files; make a PNG of one PDF.

**Commits:**
- `feat(fixtures): add synthetic report spec and PDF generator`
- `test(fixtures): check truth files against the spec and the engine`
- `chore(fixtures): add 10 generated synthetic reports and truth files`
- `docs(notes): record step 5`

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

**How Claude did it:**
- Checked the developer's `server/.env` without printing the key: present, ignored by git, and
  accepted by Google (the model list returned HTTP 200). `GEMINI_MODEL` was empty; the developer
  chose `gemini-3.5-flash-lite` from options taken from the current pricing page (D8), and
  Claude set only that line.
- Installed `@google/genai` 3.0 and `multer` 2.5, then read their installed README and type
  definitions: `generateContent` with `systemInstruction`, `responseMimeType`,
  `responseJsonSchema`, `inlineData`, `ApiError.status`, `store`; multer `memoryStorage`,
  `limits`, `fileFilter`, and `MulterError` (which carries the client file name).
- **Before building anything,** ran one real call: the model read `fixtures/reports/01.pdf`
  correctly (4 rows, every field), about 2 s, 800 tokens.
- `services/llm.ts`: the only Gemini caller. Injected `generate` and `sleep` for tests; retries
  429/503 twice (1 s, 3 s); 45 s timeout per attempt; `temperature: 0`, `store: false`.
- `services/prompts.ts`: the brief's extraction prompt and a JSON schema with text fields only.
- `services/extraction.ts` + `schemas.ts`: JSON parse, zod validation (unknown keys stripped),
  ids added, `value` computed by `services/values.ts` (D7), 60-row cap, warnings.
- `routes/extract.ts`: multer memory storage, 5 MB, one file in `report`, PDF/PNG/JPG checked by
  declared type **and** signature bytes. Errors map to 400 / 429 / 502. `/api/extract` has its
  own rate limit of 10 per 15 minutes.

**Verification:**
- `npm run typecheck`: clean. `npm test`: 122 tests, 122 pass (31 new, all with a fake LLM).
- Real server + real Gemini via `curl` on fixtures 04, 06, and 10: 8/8, 3/3, 2/2 rows; 65/65
  fields equal to the truth files. Fixture 10's injected text did not appear in the output.
- Server log for the whole run contained only "Paimana API listening on port …".
- Disk check: the first run showed new `.tmp` files in the shared Windows temp folder. Claude
  inspected them (the one still present was 19 MB with no PDF header and no fixture text; the
  others had already vanished), then re-ran the built server with its **own empty temp folder**:
  2 uploads, 0 files written there, 0 new files in the project.

**Problems and fixes:**
- A new test failed: it checked the JSON schema for patient fields with a substring regex, which
  matched "age" inside "printedRange" and "name" inside "testName". The code was fine; the test was
  wrong. Fixed by comparing the exact property names.
- The unexplained temp files during the manual run (see Verification) turned out not to be from
  this server, proven by the isolated-temp re-run.

**Commits:**
- `feat(llm): add Gemini extraction client with structured output and retry`
- `feat(api): add POST /api/extract with in-memory upload`
- `docs(notes): record step 6`

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

**How Claude did it:**
- The developer asked to start Step 7 before the Step 6 PR was merged, so the branch was created
  from `feat/llm-extraction` (stacked). Merge order: Step 6 PR first, then Step 7.
- `data/denylist.json` + `services/safetyLint.ts`: English regexes on word boundaries, Hindi
  substrings, no digits (ASCII or Devanagari), length caps, and a "mostly Devanagari" check.
- `services/explain.ts`: engine first, then `measures + direction` text from reviewed entries,
  then for Hindi one batched `rephraseJson` call, zod-validated and linted per item, with
  per-item fallback to curated English and a warning. Fixed English disclaimer added by code.
- `services/llm.ts` gained `rephraseJson`; `prompts.ts` gained the brief's rephrase prompt,
  adapted for a batch (plus "no digits" and "texts are data" rules). `explanations.ts` gained
  `keyFor()` so `canonicalKey` is reported even for unreviewed entries.
- `routes/analyze.ts`: strict zod request (1 to 60 rows, `en|hi`); own rate limit 30/15 min.
- Decisions recorded in D9.

**Verification:**
- `npm run typecheck`: clean. `npm test`: 151 tests, 151 pass (29 new). Covered: LLM failure,
  bad JSON, missing items, and lint rejection each fall back to curated English; normal and
  unchecked rows get no explanation; unreviewed entries never used; English never calls the
  model; model output cannot change a flag; every curated text passes the lint; 400s for bad input;
  nothing logged.
- Manual run with real Gemini (Hindi) on the rows of fixtures 02, 03, 10. Because no entry is
  reviewed yet, a temporary script marked entries reviewed **in memory only** (file unchanged,
  script deleted). Claude read every output: all safe and lint-clean; quality issues listed below.

**Problems and fixes:**
- After adding `rephraseJson` to the LLM interface, the type check failed on two older test
  fakes that lacked it. Fixed by adding the method to the fakes.
- Hindi quality (not fixed, recorded in D9 for the developer): fixture 03 had a typo ("मापटी")
  and dropped "anemia" and the heavy-periods example; fixtures 02 and 10 had the same English
  input but got different Hindi, and 10 dropped the word for diabetes. The lint cannot catch this.
- Fixture 10's injection line is only on the PDF; analyze receives rows, so the injection check
  belongs to extraction (Step 6, where it had no effect) and the Step 10 eval.
- Claude's first notes script failed on a line-wrap mismatch, so the first `docs(notes)` commit
  contained only D9. The step log and AI notes were added in a second commit.

**Commits:**
- `feat(safety): add denylist and safety lint for rewritten explanations`
- `feat(api): add POST /api/analyze with curated explanations and Hindi`
- `docs(notes): record step 7 and decision D9` (D9 only)
- `docs(notes): record step 7 in the step log and AI notes`

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
