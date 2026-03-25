# Contract: Recommendations Domain -> Explanation UI

## Boundary

- **Producer**: `src/features/recommendations/server/generate-career-routes.ts`
- **Consumer**: `src/features/recommendations/components/career-route-shortlist.tsx`
- **Entry point**: `src/app/(app)/traduccion/page.tsx`

## Input Contract

`RecommendationOutput` (extended):

- `recommendationSetId`
- `generatedAt`
- `sourceSnapshotId`
- `routes[3..5]` where each route includes:
  - base routing fields (`routeId`, `roleId`, `sectorId`, optional hints)
  - `matchedSignals[]`
  - `explanation.reasonSummary`
  - `explanation.fitLabel`
  - `explanation.fitScore`
  - `explanation.explanationKeywords[]`
  - `explanation.decisionGuidance`

## Output Contract

UI-ready render model with safe copy:

- Always show `reasonSummary`.
- Show `fitLabel` badge per route.
- Show short `decisionGuidance`.
- Never expose raw internal rule details beyond curated strings.

## Rules

1. `reasonSummary` must be human-readable and non-technical.
2. `fitLabel` must be present for every route.
3. Empty shortlist must render actionable fallback (no crash).
4. Error state in page must remain user-safe.

## Traceability Tag

- `sourceSnapshotId -> recommendationSetId -> selectedRouteId`.
