# Branch Protection Baseline for main

This document defines the mandatory merge contract for `main`.

## Required Status Checks

Branch protection MUST require these exact checks from `.github/workflows/verify.yml`:

- `verify (ubuntu-latest)`
- `verify (windows-latest)`

Both checks must finish in `SUCCESS` before merge is allowed.

## Required Pull Request Rules

Apply these settings for `main`:

- Minimum approvals: `1`.
- Require review from code owners: `disabled` (not required in free baseline).
- Dismiss stale approvals when new commits are pushed: `enabled`.
- Require conversation resolution before merge: `enabled`.
- Enforce rules for administrators (`enforce_admins`): `enabled`.
- Bypass permissions: `none` by default; any exception must be documented.

### Free Baseline Review Model

- Use at least 1 approval from collaborators with write access.
- Define 1-2 human maintainers as mandatory reviewers by team convention (PR template + reviewer assignment), not via paid enforcement.
- Keep branch protection focused on PR + required checks + conversation resolution.

## Ownership and Change Control

- Ownership MAY be defined in `.github/CODEOWNERS` when plan supports code-owner enforcement.
- Any change to required checks, review rules, or bypass policy is a SECURITY-AFFECTING change.
- Every governance change must include:
  - rationale,
  - accountable owner,
  - rollback plan,
  - PR reference.

Policy-as-code source files for this control:

- `.github/policies/main-branch-ruleset.json`
- `scripts/governance/check-main-branch-protection.mjs`
- `scripts/governance/apply-main-branch-protection.mjs`

Any governance change MUST update policy artifact and workflow contract atomically in the same PR.

## Policy-as-Code Operations

The canonical source of truth is `.github/policies/main-branch-ruleset.json`.

- Drift check (read-only, CI-safe): `pnpm governance:check`
- Apply reconciliation (state-changing, operator-only): `pnpm governance:apply -- --confirm`

`governance:check` MUST be used in automation contexts because it never mutates repository settings.
`governance:apply` is an operator command and uses `--confirm` to explicitly acknowledge mutation.

### Operator Usage and Inputs

Required inputs for safe execution:

- GitHub CLI authenticated (`gh auth status`).
- Repository slug from `GITHUB_REPOSITORY` or explicit `--repo owner/name`.
- Token with `admin` or `maintain` repository permission for apply mode.

Expected command outputs:

- `PASS` when live ruleset matches canonical policy.
- `FAIL` with normalized desired/live payload diff when drift exists.
- `APPLIED` when reconciliation succeeds and readback converges.
- `ERROR` with actionable diagnostics on auth/API/contract failures.

## Rollback and Exception Procedure

Use this only for production-critical incidents.

1. Open an emergency PR documenting why temporary relaxation is required.
2. Repository admin applies minimal temporary relaxation in branch protection.
3. Record exact changes and timestamp in the incident PR.
4. Restore this baseline immediately after the incident is mitigated.
5. Add post-incident notes with preventive actions.

Never leave temporary relaxations active after the incident window.

## Enforcement Mapping Evidence

Record final enforcement mapping after GitHub settings are applied:

- Repository: `brujula-civil`
- Branch: `main`
- Required checks configured in GitHub:
  - `verify (ubuntu-latest)`
  - `verify (windows-latest)`
- Policy change owners:
  - Primary: `@rcaceresm28`

Evidence log template (fill per change):

- Timestamp (UTC):
- Drift check command: `pnpm governance:check`
- Drift check result summary:
- Apply command: `pnpm governance:apply -- --confirm --repo owner/repo` (if needed)
- Apply/readback summary:
- Governance PR reference:

Update this section with PR links or screenshots when ruleset configuration is changed.
