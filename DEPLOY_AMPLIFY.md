# Deploying to AWS Amplify (Neon + Firebase)

This document shows the exact steps to deploy this Next.js app (`repomate2`) to AWS Amplify using your existing Neon DB and Firebase storage bucket. No EC2 instances required.

---

## Quick checklist (what you already have)
- Neon Postgres database (pgvector enabled).
- Firebase project + Storage bucket.
- Git repository connected to your Git provider (GitHub, GitLab, etc.).

## Files added to the repo
- `amplify.yml` — Amplify build spec (root).

## Required environment variables (set these in Amplify Console → App settings → Environment variables)
- `DATABASE_URL` — Neon Postgres connection string (make sure it includes the correct role/connection info).
- `NODE_ENV` — `production`
- `NEXT_PUBLIC_URL` — the public app URL (e.g. `https://app.example.com`) used for Stripe redirect URLs.

Firebase (client-side; prefix with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

Third-party/secret keys (server-side):
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLIC_KEY` (client-side can also be set as `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`)
- `OPENAI_API_KEY` (or other LLM keys like `GOOGLE_API_KEY` / Gemini keys)
- `ASSEMBLYAI_API_KEY` (if used)
- `GITHUB_TOKEN` (if your repo integrates with GitHub APIs; replace any hard-coded tokens)
- `PRISMA_DATA_PROXY_URL` (optional — only if you use Prisma Data Proxy)

Other (optional):
- `SKIP_ENV_VALIDATION` — set to `1` during builds only if you intentionally want to skip server-side env checks (not recommended for production).

## Important notes about Prisma + Neon
- Neon is serverless and provides connection pooling suited for serverless hosts. That makes it a good match for Amplify serverless functions.
- During build, `npx prisma generate` must run so the server-side lambdas have a generated client available.
- The `amplify.yml` runs `npx prisma migrate deploy`. If you'd rather not run migrations automatically on every deploy, remove that line and run migrations manually using `npx prisma migrate deploy` from a CI job or from a developer machine.
- If you expect very high concurrency, consider Prisma Data Proxy as an alternative to reduce DB connection pressure — set `PRISMA_DATA_PROXY_URL` and update your datasource accordingly.

## Amplify setup steps (console)
1. Go to the AWS Amplify Console → Hosting → Get started.
2. Connect your Git provider and pick the `main` branch of this repo.
3. When asked for a build spec, Amplify will detect Next.js — you can replace the default with the `amplify.yml` in this repo or paste its contents.
4. Add the environment variables listed above in the Amplify App settings before the first build (especially `DATABASE_URL`).
5. Start the first build.
6. Watch the build logs:
   - `npm ci` installs dependencies
   - `npx prisma generate` should succeed
   - `npx prisma migrate deploy` should either apply migrations or be skipped if you returned `true` on failure
   - `npm run build` builds Next.js
7. Once deployment completes, configure a custom domain if needed and optionally enable branch previews.

## Common issues and troubleshooting
- "Cannot connect to database" during build:
  - Ensure `DATABASE_URL` uses the correct connection string and is reachable from Amplify (Neon is usually accessible).
  - If your DB is private behind a VPC, you'll need to configure Amplify with VPC access or expose a reachable endpoint.
- Connection exhaustion under concurrency:
  - Neon helps, but you can also use Prisma Data Proxy or RDS Proxy for RDS.
- Prisma migrate errors:
  - If you do not want migrations to run automatically on deploy, remove `npx prisma migrate deploy` from `amplify.yml`, and run migrations manually.

## Post-deploy checks
- Sign in flows and callbacks (if using Clerk or OAuth) work with your domain.
- File upload flows: try uploading a small file — Firebase storage should return a URL (ensure Firebase env vars are correct).
- API routes / TRPC: trigger typical API endpoints and confirm DB writes/reads succeed.

## Security
- Move any hard-coded tokens in the repo to Amplify env vars (we updated Firebase to use env vars; search for any other secrets and replace them with env references).
- Keep server-only secrets without `NEXT_PUBLIC_` prefix so they are not exposed to the client.

---

If you want, I can:
- Replace any other hard-coded secrets with env var references (I already migrated Firebase to env vars).
- Add a short GitHub Actions workflow to run migrations as a separate job before allowing Amplify to deploy.
- Walk you step-by-step through connecting the repo in Amplify Console (I will give exact click-by-click guidance).

Tell me which of these you'd like next (I can make changes in the repo now).