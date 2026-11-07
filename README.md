# Paimana

**Explains lab report results in plain language. Plain code, not AI, decides whether each value is
low, normal, or high.**

**Live demo:** <https://paimana.sundaramtech.dev> (the first visit can take about a minute while the
free server wakes up)

> **Not medical advice.** Paimana does not diagnose conditions or suggest treatment. It compares each
> value with the range printed on the report and shows general information. Always talk to a doctor.
> **Demo only: use the sample reports, not real medical data.**

<!-- Screenshots: add images of the app using the SAMPLE reports only, e.g. docs/screenshots/results.png -->

## What it does

1. **Add results:** pick a synthetic sample report, upload a PDF/PNG/JPG, or type values in.
2. **Review:** an AI model reads the report into an editable table. You fix any misread digit. Only
   what is in the table gets checked.
3. **Check:** plain TypeScript compares each value with the range **printed on the report** and
   marks it low, normal, high, or not checked (with the reason).
4. **Explain:** flagged results get a short, general explanation from reviewed text based on
   MedlinePlus, optionally translated to Hindi.

## Design principle: AI proposes, code decides

| Job | Done by | Why |
|---|---|---|
| Reading the report into rows | Gemini (free tier) | Reading messy documents is what LLMs are good at |
| Turning "14.2" into a number | Code | A model that "helpfully" rounds would change a flag |
| Low / normal / high | Code (`rangeParser.ts`, `rangeEngine.ts`) | Deterministic and unit-tested; never the LLM |
| Explanation text | Curated JSON, reviewed by the developer | No invented medical content |
| Hindi translation (optional) | Gemini, then a safety lint | Falls back to the reviewed English on any problem |
| Disclaimer | Code | The model cannot forget or change it |

## Safety and privacy

- **Stateless:** no database, no accounts. Uploads stay in memory for one request and are never
  written to disk. Logs contain status codes only, never values or file names.
- **No patient data:** the extraction schema has no fields for name, age, sex, or IDs.
- **Human in the loop:** every extracted value can be edited before it is checked.
- **Prompt injection:** a test report contains a hidden "ignore your rules and diagnose" line. It
  had no effect on extraction, flags, or explanations.
- **Free-tier caveat:** the model provider may use inputs to improve its products, so the site warns
  against real reports and offers synthetic samples.

## Evaluation

From [`eval/results/latest.md`](eval/results/latest.md) (`gemini-3.5-flash-lite`, 10 synthetic
PDF reports + 1 PNG photo):

| Metric | Result |
|---|---|
| Extraction accuracy (test name, result, value, unit, range) | 100% each (41/41) |
| Flag accuracy on truth rows (code only) | 100% (38/38) |
| Flag accuracy end to end (on what the model read) | 100% (41/41) |
| Explanations passing the safety lint (English + Hindi) | 100% (22/22) |
| Prompt-injection report | No effect |

**Read these numbers carefully:** the test reports are clean, computer-generated documents, so they
show the pipeline works, not how it handles real scans or phone photos. Reading the Hindi output by
hand also found a dropped sentence and a typo that no automated check caught.

## Architecture

```
Browser ──loads the page──▶ Vercel (static React build)
   │
   │ POST /api/extract (file)      ┌────────────────────────────────────┐
   ├───────────────────────────────▶ Render: Express (TypeScript)        │
   │ ◀── rows (zod-validated) ─────│  multer (memory only) → Gemini      │
   │                               │                                    │
   │ user reviews / edits rows     │                                    │
   │                               │                                    │
   │ POST /api/analyze (rows)      │  rangeParser + rangeEngine (code)  │
   ├───────────────────────────────▶  curated explanations (reviewed)   │
   │ ◀── results + disclaimer ─────│  optional Hindi → safety lint      │
   └                               └────────────────────────────────────┘
```

**Stack:** React 19 + Vite 8 + TypeScript (client) · Node 22 + Express 5 + TypeScript (server) ·
zod · multer · helmet · express-rate-limit · `@google/genai` · `node --test` · pdfkit (fixtures).

## Run it locally

Requires Node 22 and a free Gemini API key from [Google AI Studio](https://aistudio.google.com).

```bash
# 1. API
cd server
npm install
cp .env.example .env        # then set GEMINI_API_KEY and GEMINI_MODEL in .env
npm run dev                 # http://localhost:5000

# 2. Website (second terminal)
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                 # http://localhost:5173
```

| Command (in `server/`) | What it does |
|---|---|
| `npm test` | 166 tests with a fake LLM (no API calls) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run eval` | Accuracy and safety evaluation (cached; `-- --fresh` for new calls) |
| `npm run fixtures` | Regenerates the 10 synthetic reports and their answer keys |

Deployment: see [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Limitations

- Only the range printed on the report is used. No age- or sex-specific ranges
  ([D6](docs/DECISIONS.md)); rows without a printed range are "not checked".
- No unit conversion: if the result's unit and the range's unit differ, the row is "not checked".
- Explanations exist for 10 common blood tests only.
- Hindi translations are safe but can drop details; English is the primary language.
- Accuracy was measured on clean synthetic reports, not real scans.
- The free server sleeps when idle, so the first request can take about a minute.

## How I used AI

This project was built with Claude Code as a pair programmer, under written rules
([`CLAUDE.md`](CLAUDE.md)) and a spec ([`PROJECT_BRIEF.md`](PROJECT_BRIEF.md)): one git branch and
pull request per step, every PR reviewed and merged by me, and notes kept honestly as we went.

- [`docs/STEP_BY_STEP.md`](docs/STEP_BY_STEP.md): what was built in each step and how.
- [`AI_NOTES.md`](AI_NOTES.md): what the AI got right and wrong, and how mistakes were caught.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): every design decision and who made it.
- [`docs/CASE_STUDY.md`](docs/CASE_STUDY.md): the portfolio write-up.

The running app uses Google's Gemini API; Claude was only the build assistant.
