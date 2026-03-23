---
description: 'Task list template for feature implementation'
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Every task MUST include an exact file path.

## Path Conventions

- Next.js routes/layouts: `src/app/**`
- Feature modules: `src/features/<feature>/**`
- Shared test setup: `test/setup.ts`
- Node tests: `src/**/*.test.ts` (excluding `*.dom.test.ts`)
- JSDOM tests: `src/**/*.dom.test.ts` and `src/**/*.test.tsx`

## Phase 1: Constitution and Setup

**Purpose**: Ensure work starts aligned with governance and repository conventions.

- [ ] T001 Validate assumptions with repository evidence and required docs.
- [ ] T002 Map impacted `types` and `schemas` before implementation.
- [ ] T003 Identify security-sensitive inputs, redirects, and secret handling.

---

## Phase 2: Foundational (Blocking)

**Purpose**: Core changes that MUST be complete before user story work.

- [ ] T004 Implement or update shared contracts in `src/features/[feature]/types/`.
- [ ] T005 [P] Implement or update validation schemas in `src/features/[feature]/schemas/`.
- [ ] T006 [P] Add supporting server/service primitives in `src/features/[feature]/server/` or `src/features/[feature]/services/`.

**Checkpoint**: Foundation complete, user stories can proceed.

---

## Phase 3: User Story 1 - [Title] (Priority: P1)

**Goal**: [What this story delivers]
**Independent Test**: [How to validate in isolation]

### Tests for User Story 1

- [ ] T007 [P] [US1] Add/adjust node test in `src/features/[feature]/server/[name].test.ts`.
- [ ] T008 [P] [US1] Add/adjust jsdom test in `src/features/[feature]/components/[name].test.tsx` (if UI impact).

### Implementation for User Story 1

- [ ] T009 [P] [US1] Implement logic in `src/features/[feature]/services/[name].ts`.
- [ ] T010 [US1] Integrate server/action boundary in `src/features/[feature]/actions/[name].ts`.
- [ ] T011 [US1] Integrate route/component behavior in `src/app/[segment]/[file].tsx` or `src/features/[feature]/components/[name].tsx`.

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [What this story delivers]
**Independent Test**: [How to validate in isolation]

- [ ] T012 [P] [US2] Add/adjust tests for US2.
- [ ] T013 [P] [US2] Implement service/server logic for US2.
- [ ] T014 [US2] Implement UI/route integration for US2.

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [What this story delivers]
**Independent Test**: [How to validate in isolation]

- [ ] T015 [P] [US3] Add/adjust tests for US3.
- [ ] T016 [P] [US3] Implement service/server logic for US3.
- [ ] T017 [US3] Implement UI/route integration for US3.

---

## Final Phase: Verification and Hardening

- [ ] T018 Run `pnpm lint` and fix issues.
- [ ] T019 Run `pnpm typecheck` and fix issues.
- [ ] T020 Run `pnpm test:run` and fix failing tests.
- [ ] T021 Run `pnpm test:coverage` when coverage thresholds/tests governance changed.
- [ ] T022 Review docs impacted by behavior, security, or workflow changes.

---

## Dependencies and Execution Order

- Phase 1 -> Phase 2 -> User Stories -> Final Phase.
- User stories may run in parallel after Phase 2 when files do not conflict.
- Within each story: tests SHOULD fail before implementation and pass after implementation.
- Do not mark done until mandatory quality gates pass.
