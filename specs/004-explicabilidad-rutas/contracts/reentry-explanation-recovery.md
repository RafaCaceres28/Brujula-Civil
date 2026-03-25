# Contract: Re-entry Recovery of Selected Explanation Context

## Boundary

- **Producer**: persisted `employabilityFlow` state in `user_wizard_state`
- **Consumer**: `src/features/wizard/server/get-onboarding-overview.ts` and `/traduccion` page
- **Downstream compatibility**: translation/cv/pdf pipeline keeps using `selectedRouteId`

## Input Contract

`aggregated_draft_jsonb.employabilityFlow` may include:

- `recommendations?`
- `selectedRoute?`
- `selectedRecommendation?` (legacy)
- `selectedRouteContext?` (new)

## Output Contract

`OnboardingOverview.employabilityFlow` for re-entry:

- Prefer `selectedRoute` if available.
- If only `selectedRecommendation` exists, map into `selectedRoute`.
- Preserve `selectedRouteContext` when valid.
- If context is invalid/missing but `selectedRoute` is valid, return route selection and degrade explanation gracefully.

## Rules

1. Re-entry must not fail hard because explanation context is missing.
2. Route selection continuity has priority over explanation richness.
3. User-visible fallback copy must be actionable and safe.
4. Do not mutate persisted data in read path.

## Traceability Tag

- `selectedRouteId` remains canonical anchor for downstream translation/preview/pdf.
