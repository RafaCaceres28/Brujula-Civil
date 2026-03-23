# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Summary

[Primary requirement, technical approach, and delivery slice]

## Technical Context

**Language/Version**: TypeScript (^5, strict mode)
**Primary Dependencies**: Next.js (App Router), React, Supabase SSR/client, Zod
**Storage**: Supabase Postgres
**Testing**: Vitest (`node` and `jsdom` projects)
**Target Platform**: Web app (SSR + client interactions)
**Project Type**: Single Next.js application
**Performance Goals**: [NEEDS CLARIFICATION: feature-specific latency/UX targets]
**Constraints**: Must pass `pnpm lint`, `pnpm typecheck`, `pnpm test:run`; no default build validation
**Scale/Scope**: [NEEDS CLARIFICATION: expected traffic/data volume]

## Constitution Check

GATE: Must pass before implementation and again before merge.

- [ ] Verify-First: assumptions validated with repo evidence and current docs.
- [ ] Contract-First: `types`/`schemas` changes defined before logic changes.
- [ ] Quality Gates: plan includes `lint`, `typecheck`, `test:run` verification.
- [ ] Security by Default: secrets/env/error-safety/redirect risks addressed.
- [ ] Reversible Delivery: work is sliced into independently testable increments.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
`-- tasks.md
```

### Source Code (repository root)

```text
src/
|-- app/
|   |-- (app)/
|   |-- (auth)/
|   |-- (marketing)/
|   `-- api/
|-- features/
|   `-- [feature]/
|       |-- actions/
|       |-- components/
|       |-- schemas/
|       |-- server/
|       |-- services/
|       `-- types/
`-- [shared-modules]

test/
`-- setup.ts
```

**Structure Decision**: [Reference concrete paths touched by this feature]

## Complexity Tracking

Fill only for constitution violations that require explicit approval.

| Violation                            | Why Needed     | Simpler Alternative Rejected Because         |
| ------------------------------------ | -------------- | -------------------------------------------- |
| [e.g., cross-feature shared service] | [current need] | [why feature-local service was insufficient] |
