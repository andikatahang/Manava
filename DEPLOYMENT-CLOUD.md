# Manava — Cloud Deployment Guide (Vercel + Render + Neon)

**Frontend**: Vercel (`manava-app`)
**Backend**: Render Web Service (`manava-api`)
**Database**: Neon (managed Postgres)
**Docker**: local dev/testing only — `docker-compose*.yml` files are not used in this deployment path.

---

## 0. Order of operations

Provision in this order because each step feeds a value into the next:

1. Neon → get `DATABASE_URL`
2. Render → deploy API using that `DATABASE_URL`, get the API's public URL
3. Vercel → deploy frontend using the API's public URL as `VITE_API_BASE_URL`
4. Render → update `CORS_ORIGIN`/`APP_URL` with the final Vercel URL (circular dependency, fixed in step 4)

---

## 1. Neon (Database)

1. Create a project at [neon.tech](https://neon.tech) (region close to your Render region, e.g. Singapore/`ap-southeast-1` if available, else US).
2. In the Neon dashboard, copy the **pooled connection string** (uses PgBouncer, needed for serverless-style connection churn from Render's free/small instances). It looks like:
   ```
   postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
   ```
3. This full string is your `DATABASE_URL`. Prisma's schema already requires `sslmode` via the URL (Neon includes it by default) — no schema changes needed since `manava-api/prisma/schema.prisma` just reads `env("DATABASE_URL")`.
4. Neon databases suspend on idle (free tier) and cold-start on the next query — expect occasional first-request latency after inactivity. Not an issue for HRIS usage patterns, but worth knowing.

---

## 2. Render (Backend API)

`manava-api` already has a `Dockerfile`, but Render can also build natively from `package.json` — either works. **Recommended: use the Dockerfile** since it already pins `prisma migrate deploy` into the boot command and handles multi-arch Prisma binary targets (`linux-musl-openssl-3.0.x` etc., see `manava-api/prisma/schema.prisma:6-9`).

### Steps

1. Push this repo to GitHub (if not already).
2. In Render dashboard → **New → Web Service** → connect the repo.
3. Configure:
   - **Root Directory**: `manava-api`
   - **Environment**: `Docker` (Render auto-detects `manava-api/Dockerfile`)
   - **Region**: pick one close to your Neon DB region to minimize latency
   - **Instance type**: Starter is fine to begin
4. **Environment variables** (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | pooled connection string from Neon |
   | `JWT_ACCESS_SECRET` | `openssl rand -base64 32` |
   | `JWT_REFRESH_SECRET` | `openssl rand -base64 32` |
   | `CORS_ORIGIN` | your Vercel URL, e.g. `https://manava-app.vercel.app` (update after step 3) |
   | `APP_URL` | same as `CORS_ORIGIN` — used in credential emails |
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` (Render sets its own `$PORT` too — see note below) |
   | `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | optional, for email notifications |
   | `OPENAI_API_KEY` | optional, for AI CV screening/KPI insights |

   > **Port note**: Render injects its own `PORT` env var and expects the app to bind to it. Check `manava-api/src/index.ts` — if it does `app.listen(env.PORT)`, Render's injected `PORT` will simply override whatever you set, so it works out of the box. No action needed unless the server hardcodes `4000`.

5. **Health check path**: set to `/api/v1/health` in Render's service settings (matches the endpoint at `manava-api/src/index.ts:33`).
6. Deploy. Render builds the Docker image; the container's `CMD` runs `npx prisma migrate deploy && node dist/index.js` — migrations apply automatically on every deploy.
7. Once live, note the public URL, e.g. `https://manava-api.onrender.com`.

### Seeding production data (one-time, optional)

Render's shell (dashboard → Shell tab) lets you run one-off commands against the deployed container:
```bash
npm run prisma:seed
```
Only do this once, and only if you want the seed superadmin/HR/AM/editor accounts in production — otherwise skip and create the first superadmin manually.

---

## 3. Vercel (Frontend)

`manava-app/vercel.json` already has the correct config (SPA rewrite, `npm run build`, `dist` output).

### Steps

1. In Vercel dashboard → **Add New → Project** → import the repo.
2. **Root Directory**: `manava-app`
3. Framework preset: Vite (auto-detected)
4. **Environment variables**:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://manava-api.onrender.com` (your Render URL from step 2) |

   Set this for **Production**, **Preview**, and **Development** environments in Vercel as appropriate — if you want preview deploys to hit a staging API, use a separate value for Preview.
5. Deploy. Vercel builds with `npm run build` (`tsc -b && vite build`) and serves `dist/`.
6. Note the resulting URL, e.g. `https://manava-app.vercel.app` (or your custom domain if attached).

---

## 4. Close the loop: update CORS on Render

Go back to Render → `manava-api` → Environment → update:
- `CORS_ORIGIN` = your real Vercel URL (from step 3)
- `APP_URL` = same

Redeploy the Render service (env var changes trigger an automatic redeploy, or trigger manually).

---

## 5. Custom domains (optional)

- **Vercel**: Project → Settings → Domains → add your domain, follow DNS instructions (usually a `CNAME` to `cname.vercel-dns.com`).
- **Render**: Service → Settings → Custom Domains → add `api.yourdomain.com`, follow the `CNAME`/`A` instructions Render provides.
- After attaching custom domains, update `VITE_API_BASE_URL` (Vercel) and `CORS_ORIGIN`/`APP_URL` (Render) to the final domains and redeploy both.

---

## 6. Verifying the deployment

1. `curl https://manava-api.onrender.com/api/v1/health` → expect `{"success":true,"data":{"status":"ok",...}}`.
2. Open the Vercel URL, confirm login page loads and hits the API (check Network tab for `manava-api.onrender.com` calls, not `localhost`).
3. Log in with a seeded account (if you ran the seed) and click through a couple of pages that hit the DB (e.g. dashboard, editor list) to confirm the Neon connection works end-to-end.

---

## 7. Ongoing deploys

- **Frontend**: every push to the connected branch auto-deploys on Vercel; PRs get preview URLs automatically.
- **Backend**: every push to the connected branch auto-deploys on Render; migrations run automatically via the Docker `CMD` on each boot.
- **Database**: schema changes go through `prisma migrate dev` locally (generates a migration file), commit it, push — Render applies it via `prisma migrate deploy` on next deploy. Never run `migrate dev` against the Neon production database directly.

---

## Relationship to `DEPLOYMENT.md` (Docker + Cloudflare Tunnel)

That guide describes a **self-hosted Docker Compose** deployment (used for local/on-prem or VPS setups). This guide (`DEPLOYMENT-CLOUD.md`) describes the **managed cloud stack** (Vercel/Render/Neon) requested for the current deployment target. The `Dockerfile` in `manava-api/` and `manava-app/` remain useful for local parity testing (`docker-compose.dev.yml`) but are not what Render/Vercel run in this path for the frontend — only `manava-api` uses its Dockerfile on Render.
