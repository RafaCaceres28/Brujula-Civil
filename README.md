SaaS focused on helping military professionals transition into civilian careers through guided workflows, profile translation, and CV generation.

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
