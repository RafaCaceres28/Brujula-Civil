SaaS focused on helping military professionals transition into civilian careers through guided workflows, profile translation, and CV generation.

## Engineering Constitution

- Governance baseline lives in `.specify/memory/constitution.md`.
- Planning artifacts under `.specify/templates/` must satisfy constitution gates (verification-first, contract-first, quality gates, security, reversible delivery).

## Verification Commands

- `pnpm lint`: lint repository files.
- `pnpm typecheck`: run TypeScript static checks.
- `pnpm test:run`: run deterministic Vitest suites once.
- `pnpm test:coverage`: run tests, enforce coverage thresholds, and emit coverage report.
- `pnpm test:coverage:negative`: assert the coverage gate fails when thresholds are intentionally set above current coverage.
- `pnpm verify`: canonical gate used by CI (`lint + typecheck + test:run`).

## Validation Policy

- Automated checks (`lint`, `typecheck`, and tests) are the source of truth for merge readiness.
- Coverage minimums are enforced by `pnpm test:coverage` (used in the PR verify workflow).
- Manual pages such as `src/app/test-db/page.tsx` are supplemental diagnostics only.

## Auth Hardening Requirements

- Required env vars: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Optional app origin vars for recovery email redirects: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, `SITE_URL`, or `VERCEL_URL`.
- If optional origin vars are missing, recovery redirect falls back to `http://localhost:3000`.

## Password Recovery Redirect Contract

- Supabase reset emails must redirect to `/callback` with `next=/recuperar-password?mode=confirm`.
- The callback route sanitizes `next` and only allows internal canonical paths.
- Invalid or external `next` values are forced to safe fallback `/dashboard`.

## Auth UI Error Copy Policy

- The UI shows safe domain messages returned by server actions.
- Provider raw messages are NEVER exposed directly to users.
- Current copy strategy is differentiated by domain error code (`INVALID_CREDENTIALS`, `EMAIL_ALREADY_REGISTERED`, `RATE_LIMITED`).
