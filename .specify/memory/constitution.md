<!--
Sync Impact Report
- Version change: N/A -> 1.0.0
- Version bump rationale: MAJOR because this is the first project-specific constitution replacing the placeholder template with enforceable governance rules.
- Principles modified: Added five enforceable core principles (Verify-First Engineering, Contract-First Boundaries, Mandatory Quality Gates, Security by Default, Reversible Incremental Delivery).
- Sections added: Operational Constraints and Workflow & Review Gates.
- Sections removed: None.
- Templates updated: .specify/templates/plan-template.md ✅, .specify/templates/spec-template.md ✅, .specify/templates/tasks-template.md ✅, .specify/templates/commands/*.md ⚠ (directory not present).
- TODOs deferred: TODO(RATIFICATION_DATE): original adoption date is not recorded in repository history.
-->

# Brujula Civil Constitution

## Core Principles

### I. Verify-First Engineering

All technical claims MUST be verified against repository evidence before implementation. Claims about third-party frameworks, libraries, or APIs MUST be validated against current official documentation. Rationale: preventing assumption-driven regressions is cheaper than fixing production defects caused by stale or guessed behavior.

### II. Contract-First Boundaries

Changes that cross system boundaries MUST start by defining or updating domain contracts (`types/`) and input validation (`schemas/`) before business logic is implemented. Business rules MUST live in `server/` or `services/`; UI layers MUST stay focused on presentation and interaction. Rationale: stable contracts reduce coupling and make features independently testable.

### III. Mandatory Quality Gates

Before a task is considered done, the branch MUST pass `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` in that order (or `pnpm verify`). `pnpm build` SHOULD NOT be used as default validation unless explicitly required. `pnpm test:coverage` MUST run when coverage thresholds or test-governance rules are modified. Rationale: deterministic, fast gates protect delivery quality without unnecessary build cost.

### IV. Security by Default

Secrets, tokens, and credentials MUST NOT be committed. Environment variables MUST be used for sensitive configuration. User-facing errors SHOULD be domain-safe and MUST NOT expose raw provider internals. Redirect and callback flows MUST enforce safe internal destinations. Rationale: security defects have asymmetric impact and must be prevented at design time.

### V. Reversible Incremental Delivery

Work MUST be sliced into independently testable increments aligned to user stories and reversible commits. Any complexity that violates a principle SHOULD include explicit justification and a simpler rejected alternative. Rationale: small reversible steps reduce deployment risk and improve reviewability.

### VI. Domain Safety and Product Integrity

All domain outputs MUST use typed result contracts (e.g., success/error discriminated unions) with consistent error codes across actions, route handlers, and server services. Generated employability content MUST remain user-editable before publication, and military-to-civil translation flows MUST preserve traceability from source evidence to civilian output.

## Operational Constraints

- Runtime stack MUST remain aligned with repository constraints: Next.js App Router, React, TypeScript strict mode, Supabase client/SSR, Zod validation, Vitest for automated tests.
- Source organization SHOULD follow feature boundaries under `src/features/<feature>/` and route boundaries under `src/app/`.
- Imports SHOULD prefer `@/` alias for cross-feature code and use relative imports only inside the same module boundary.
- Naming conventions MUST follow project standards: files in kebab-case, React components in PascalCase, variables/functions in camelCase, constants in UPPER_SNAKE_CASE.
- Row Level Security (RLS) MUST be enabled and policy-protected for every user-scoped table and storage path in Supabase.
- Supabase service_role credentials MUST NEVER be exposed to client bundles, browser runtime, or public environment variables.
- Next.js Server Components MUST be the default rendering mode; Client Components SHOULD be introduced only when interaction/state requirements justify them.
- Refactors MUST be incremental and reversible; full rewrites SHOULD be rejected unless a documented architectural decision proves no viable incremental path.

## Workflow & Review Gates

1. Plan work from user scenarios with clear acceptance outcomes and edge-case handling.
2. Define or update contracts and schemas before implementing feature logic.
3. Implement in small increments with explicit file paths and dependency order.
4. Run mandatory verification gates before closure.
5. Record security, architecture, or governance-impacting decisions in project documentation.

## Governance

- This constitution supersedes ad-hoc practices for engineering execution in this repository.
- Every pull request and code review MUST check constitution compliance, including quality gates and security hygiene.
- Amendments MUST include: (a) semver bump rationale, (b) Sync Impact Report updates, and (c) propagation to impacted templates/docs.
- Versioning policy for this constitution:
  - MAJOR: removes or redefines a core principle, or introduces breaking governance requirements.
  - MINOR: adds a new principle or materially expands an existing section with new mandatory behavior.
  - PATCH: clarifies wording, examples, or non-normative guidance without changing obligations.
- Runtime guidance remains in `AGENTS.md`; this constitution defines the mandatory policy baseline.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date is not recorded in repository history. | **Last Amended**: 2026-03-23
