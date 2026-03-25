# Contract: Explanation Selection -> Traceability Persistence

## Boundary

- **Producer**: `src/features/recommendations/actions/select-career-route-action.ts`
- **Consumer**: `src/features/recommendations/server/select-career-route.ts` and `employabilityFlow`
- **Persistence anchor**: `user_wizard_state.aggregated_draft_jsonb.employabilityFlow`

## Input Contract

`SelectCareerRouteActionInput`:

- `recommendationSetId: string`
- `selectedRouteId: string`
- optional `requestId`

Derived source (must exist in active set):

- matching route from `employabilityFlow.recommendations.routes`
- route explanation metadata used to snapshot selected context

## Output Contract

`RecommendationSelection` (existing) + persisted `selectedRouteContext` snapshot:

- `selectedRoute.recommendationSetId`
- `selectedRoute.selectedRouteId`
- `selectedRoute.selectedAt`
- `selectedRouteContext.reasonSummarySnapshot`
- `selectedRouteContext.fitLabelSnapshot`
- `selectedRouteContext.guidanceSnapshot`
- `selectedRouteContext.capturedAt`

## Rules

1. Selected route must belong to active recommendation set.
2. Snapshot must be derived from active route explanation at selection time.
3. Persist with merge-safe update; do not drop unrelated `cvPreviewDraft` or export traces.
4. Keep backward compatibility with legacy `selectedRecommendation` bridge.

## Traceability Tag

- `recommendationSetId -> selectedRouteId -> selectedRouteContext`.
