# Deploying Paimana (Render + Vercel)

Written for the developer of this repo. You click through the dashboards; nothing here needs a
paid plan. Facts below were checked against the Render, Vercel, and express-rate-limit docs in
Step 11 (November 2026). Free tiers change, so re-check the linked pages if something differs.

## How the pieces fit

```
Browser ──loads the page──▶ Vercel   (static files: HTML, JS, CSS, sample PDFs)
   │
   └──API calls (fetch)───▶ Render   (Express server; holds GEMINI_API_KEY; calls Gemini)
```

- **Vercel** only serves files. It runs no server code and never sees the API key.
- **Render** runs `server/` and is the only place the Gemini key lives.
- The browser calls Render directly. That is why Render must allow the Vercel address (CORS),
  and Vercel must know the Render address (`VITE_API_URL`).

**Order matters, because each side needs the other's URL:**
1. Render first → you get the API URL.
2. Vercel second, with `VITE_API_URL` = the Render URL → you get the site URL.
3. Back to Render: set `CORS_ORIGIN` = the Vercel URL.

---

## 1. Render: the API

1. Go to <https://dashboard.render.com> → **New** → **Web Service** → connect GitHub and pick
   `paimana-lab-report-explainer`.
2. Fill in:

   | Field | Value |
   |---|---|
   | Name | `paimana-api` (any name; it becomes part of the URL) |
   | Branch | `main` |
   | Root Directory | `server` |
   | Runtime / Language | Node |
   | Build Command | `npm ci --include=dev && npm run build` |
   | Start Command | `node dist/index.js` |
   | Instance Type | **Free** |

   `--include=dev` makes sure TypeScript (a dev dependency) is installed for the build, whatever
   `NODE_ENV` Render uses.

3. **Environment Variables** (Add Environment Variable; type the key yourself, never paste it into chat):

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key from Google AI Studio |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
   | `CORS_ORIGIN` | `http://localhost:5173` for now (replaced in step 3) |
   | `TRUST_PROXY` | `1` |
   | `NODE_VERSION` | `22` |

   - Do **not** set `PORT`: Render sets it, and the server reads it.
   - `NODE_VERSION` has the highest priority on Render. New Render services otherwise default to
     Node 24, but this project is built and tested on Node 22.
   - `TRUST_PROXY=1`: Render's proxy sits in front of the app. Without it, every visitor looks like
     the same IP and the rate limit would block everyone at once.

4. **Advanced** → **Health Check Path**: `/api/health`.
5. **Create Web Service** and wait for "Live". Copy the URL, e.g. `https://paimana-api.onrender.com`.
6. Check it in a browser: `https://<your-render-url>/api/health` → `{"status":"ok"}`.
   The deploy log should show `Paimana API listening on port … (trust proxy hops: 1)`.

## 2. Vercel: the website

1. Go to <https://vercel.com/new> → import the same GitHub repo.
2. Fill in:

   | Field | Value |
   |---|---|
   | Root Directory | `client` (click **Edit** next to it) |
   | Framework Preset | Vite (detected automatically) |
   | Build Command | `npm run build` (default) |
   | Output Directory | `dist` (default) |

3. **Environment Variables**: `VITE_API_URL` = your Render URL from step 1, **without** a trailing
   slash, e.g. `https://paimana-api.onrender.com`.
   - Anything starting with `VITE_` is copied into the public JavaScript. It is an address, not a
     secret. Never put the Gemini key here.
   - Vite bakes it in **at build time**: if you change it later, **redeploy** the site.
4. **Deploy**. Copy the site URL, e.g. `https://paimana.vercel.app`.

## 3. Render again: allow the website

1. Render → `paimana-api` → **Environment** → set `CORS_ORIGIN` to the Vercel URL from step 2,
   e.g. `https://paimana.vercel.app` (a trailing slash is stripped automatically).
2. Save. Render redeploys. Wait for "Live".

Only that one address can call the API from a browser. Vercel **preview** deployments (the
URLs made for each pull request) have different addresses, so they will show CORS errors. That
is expected: only the production site is allowed.

## 4. Check the live site

Tell Claude the two URLs (not the key); it can run the API checks. You do the browser checks.

- [ ] `https://<render-url>/api/health` returns `{"status":"ok"}`.
- [ ] The Vercel site loads, shows the yellow banner, and **Mixed results** → **Check these
      values** shows results with explanations.
- [ ] A request from another origin is blocked (Claude checks with curl).
- [ ] After 15+ minutes with no traffic, reload the site: the "Waking up the server" message
      appears, and the app works after about a minute.
- [ ] **Proxy check (once):** on Render set `DEBUG_CLIENT_IP=true`, wait for the redeploy, open
      `https://<render-url>/api/debug/ip`, and compare the IP with <https://api.ipify.org>.
      If they match, `TRUST_PROXY=1` is right. If you see an internal address instead, try
      `TRUST_PROXY=2` and check again. **Then set `DEBUG_CLIENT_IP=false` again.**

## Troubleshooting

| You see | Likely cause | Fix |
|---|---|---|
| "Could not reach the server" on the site | `VITE_API_URL` wrong or missing, or Render still waking | Check the Vercel env var, redeploy Vercel; wait a minute |
| Browser console: "blocked by CORS policy" | `CORS_ORIGIN` on Render is not exactly the site URL | Fix `CORS_ORIGIN`, let Render redeploy |
| Render deploy log: "Invalid server configuration" | A required env var is missing | Add it in Render → Environment |
| "The report reader is busy" (429) | Gemini free-tier quota reached | Wait, or use manual entry; check limits at <https://aistudio.google.com/rate-limit> |
| "Too many uploads" | Paimana's own limit: 10 uploads per 15 minutes per visitor | Wait 15 minutes |

## Free-tier facts (as checked in Step 11)

- **Render Free**: spins down after 15 minutes without traffic; waking takes about a minute;
  750 free instance hours per month per workspace; the disk is temporary (fine: Paimana writes
  nothing to disk); Render says free instances are for hobby and testing, not production.
  Source: <https://render.com/docs/free>.
- **Render Node version**: `NODE_VERSION` env var > `.node-version` > `.nvmrc` > `engines`.
  Source: <https://render.com/docs/node-version>.
- **Vercel Hobby**: for personal, non-commercial use, which fits this demo.
- **Gemini free tier**: inputs may be used to improve Google's products, which is why the site
  says not to upload real reports.
