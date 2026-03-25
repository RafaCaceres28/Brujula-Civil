# Phase 1 Data Model - 004-explicabilidad-rutas

## Scope

Extender el modelo de `003` para incluir explicabilidad legible, guia de decision y snapshots minimos de contexto seleccionado, manteniendo persistencia en `user_wizard_state.aggregated_draft_jsonb.employabilityFlow`.

## Canonical Entities

### 1) RouteExplanation

- **Purpose**: contenido explicativo user-facing por cada ruta sugerida.
- **Fields**:
  - `reasonSummary: string` (8..240)
  - `fitLabel: 'alto' | 'medio' | 'exploratorio'`
  - `fitScore: number` (0..100, uso principal interno/auditoria)
  - `explanationKeywords: string[]` (1..6)
  - `decisionGuidance: string` (mensaje accionable corto)

### 2) ExplainableRecommendedRoute

- **Base**: `recommendationRouteSchema` actual.
- **Fields clave**:
  - `routeId`, `roleId`, `sectorId`, `seniorityId?`, `workModelId?`, `locationId?`
  - `matchedSignals[]`
  - `explanation: RouteExplanation`

### 3) ExplainableRecommendationSet

- **Storage**: `employabilityFlow.recommendations`.
- **Fields**:
  - `recommendationSetId: string`
  - `generatedAt: string`
  - `sourceSnapshotId: string`
  - `routes: ExplainableRecommendedRoute[]` (3..5)

### 4) SelectedRouteContextSnapshot

- **Storage**: `employabilityFlow.selectedRouteContext` (nuevo, opcional).
- **Purpose**: conservar la razon principal de decision al reingresar.
- **Fields**:
  - `recommendationSetId: string`
  - `selectedRouteId: string`
  - `reasonSummarySnapshot: string`
  - `fitLabelSnapshot: 'alto' | 'medio' | 'exploratorio'`
  - `guidanceSnapshot: string`
  - `capturedAt: string`

### 5) EmployabilityFlowDraft (extended)

- **Storage**: `aggregated_draft_jsonb.employabilityFlow`.
- **Relevant fields**:
  - `recommendations?: ExplainableRecommendationSet`
  - `selectedRoute?: { recommendationSetId, selectedRouteId, selectedAt }`
  - `selectedRouteContext?: SelectedRouteContextSnapshot`
  - `translation?`, `cvPreview?`, `export?`, `cvPreviewDraft?`
  - `lastUpdatedAt`, `lastOnboardingStep`

## Invariants

1. Si existe `recommendations`, `routes.length` DEBE estar entre 3 y 5.
2. Si existe `selectedRoute`, su `selectedRouteId` DEBE existir en `recommendations.routes` del mismo `recommendationSetId`.
3. Si existe `selectedRouteContext`, su `recommendationSetId` y `selectedRouteId` DEBEN coincidir con `selectedRoute`.
4. `selectedRouteContext` no puede reemplazar `selectedRoute`; es complemento de explicabilidad/reingreso.
5. Cambios de onboarding no deben borrar `selectedRoute` ni `selectedRouteContext` cuando el merge del draft sea valido.
6. Pipeline translation/cv/pdf mantiene `selectedRouteId` trazable aunque falte `selectedRouteContext`.

## State Model (incremental)

- `idle`
- `profile_ready`
- `recommendations_ready`
- `route_selected`
- `translation_ready`
- `preview_editing`
- `preview_confirmed`
- `export_queued`
- `export_generated`
- `export_failed`

Nota: no se agrega un estado nuevo solo para explicabilidad; se modela en metadata para evitar complejidad.

## Persistence Envelope Proposal (JSONB)

```json
{
  "employabilityFlow": {
    "flowState": "route_selected",
    "profileSnapshotId": "snapshot-1",
    "recommendations": {
      "recommendationSetId": "recset-snapshot-1-20260325010101",
      "generatedAt": "2026-03-25T01:01:01.000Z",
      "sourceSnapshotId": "snapshot-1",
      "routes": [
        {
          "routeId": "route-operations-coordinator-logistics-mid",
          "roleId": "operations-coordinator",
          "sectorId": "logistics",
          "seniorityId": "mid",
          "matchedSignals": ["TARGET_ROLE_HINT"],
          "explanation": {
            "reasonSummary": "Se recomienda por coincidencias de coordinacion y logistica.",
            "fitLabel": "alto",
            "fitScore": 91,
            "explanationKeywords": ["coordinacion", "logistica", "liderazgo"],
            "decisionGuidance": "Elige esta ruta si quieres continuidad operativa inmediata."
          }
        }
      ]
    },
    "selectedRoute": {
      "recommendationSetId": "recset-snapshot-1-20260325010101",
      "selectedRouteId": "route-operations-coordinator-logistics-mid",
      "selectedAt": "2026-03-25T01:03:00.000Z"
    },
    "selectedRouteContext": {
      "recommendationSetId": "recset-snapshot-1-20260325010101",
      "selectedRouteId": "route-operations-coordinator-logistics-mid",
      "reasonSummarySnapshot": "Se recomienda por coincidencias de coordinacion y logistica.",
      "fitLabelSnapshot": "alto",
      "guidanceSnapshot": "Elige esta ruta si quieres continuidad operativa inmediata.",
      "capturedAt": "2026-03-25T01:03:00.000Z"
    }
  }
}
```

## Non-Goals

- Modelado probabilistico avanzado de confianza.
- Historial de multiples selecciones/versiones por usuario.
- Nueva tabla o migracion de infraestructura para explicabilidad.
