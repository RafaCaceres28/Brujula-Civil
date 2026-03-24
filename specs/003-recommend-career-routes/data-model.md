# Phase 1 Data Model - 003-recommend-career-routes

## Scope

Modelo de datos incremental para recomendacion de rutas civiles y su trazabilidad hasta traduccion, preview y exportacion PDF, reutilizando `user_wizard_state.aggregated_draft_jsonb`.

## Canonical Entities

### 1) RecommendationInputSnapshot

- **Source**: `onboardingDraftSchema` (`militar`, `experiencia`, `competencias`, `objetivos`).
- **Purpose**: entrada normalizada para scoring de rutas por reglas.
- **Fields (minimos)**:
  - `userId: string`
  - `profileSnapshotId: string`
  - `militar: { branch, corps, rank, specialty, serviceYears, leadershipLevel, ... }`
  - `experiencia: { responsibilityAreas[], missionTypes[], functionTypes[], ... }`
  - `competencias: { technicalSkills[], softSkills[], certifications[], ... }`
  - `objetivos: { targetRoles[], targetSectors[], preferredLocations[], workModel, seniority }`

### 2) RecommendedCareerRoute

- **Purpose**: ruta civil sugerida individual.
- **Fields**:
  - `routeId: string` (estable, derivado de role+sector+seniority)
  - `targetRoleSlug: string`
  - `targetRoleLabel: string`
  - `targetSector: string`
  - `seniority: 'junior' | 'mid' | 'senior' | 'manager' | null`
  - `workModel: 'onsite' | 'hybrid' | 'remote' | null`
  - `locationHints: string[]`
  - `score: number`
  - `reasonCodes: string[]` (explicabilidad auditable)
  - `reasonSummary: string` (texto user-facing seguro)

### 3) RecommendationShortlist

- **Storage**: `aggregated_draft_jsonb.employabilityFlow.recommendations`.
- **Purpose**: conjunto limitado y ordenado para decision del usuario.
- **Fields**:
  - `recommendationSetId: string`
  - `generatedAt: string (ISO)`
  - `algorithmVersion: string` (ej. `rules-v1`)
  - `routes: RecommendedCareerRoute[]` (min 3, max 5)

### 4) SelectedCareerRoute

- **Storage**: `aggregated_draft_jsonb.employabilityFlow.selectedRoute`.
- **Purpose**: eleccion explicita que orienta el pipeline posterior.
- **Fields**:
  - `recommendationSetId: string`
  - `routeId: string`
  - `selectedAt: string (ISO)`
  - `selectionSource: 'user_manual'`

### 5) EmployabilityTraceEnvelope (extended)

- **Storage**: `aggregated_draft_jsonb.employabilityFlow`.
- **Purpose**: encapsular estado de recomendacion + pipeline existente.
- **Fields relevantes**:
  - `flowState`
  - `profileSnapshotId`
  - `recommendations?: RecommendationShortlist`
  - `selectedRoute?: SelectedCareerRoute`
  - `translation?`
  - `cvPreview?`
  - `export?`
  - `cvPreviewDraft?`
  - `lastUpdatedAt`

## Invariants

1. `recommendations.routes.length` SIEMPRE entre 3 y 5 cuando exista shortlist.
2. `selectedRoute.recommendationSetId` DEBE existir y coincidir con `recommendations.recommendationSetId`.
3. `selectedRoute.routeId` DEBE corresponder a un `routeId` presente en `recommendations.routes`.
4. El pipeline translation/cv/pdf no debe perder `selectedRoute` al persistir `cvPreviewDraft` o `export`.
5. Si existe `selectedRoute`, `translation` debe incluir referencia de trazabilidad a `selectedRoute.routeId` (metadata o map equivalente).
6. Recovery con parseo invalido debe degradar a estado seguro (`empty/error`) sin borrar bloques validos de draft.

## State Model (extended)

- `idle`: sin recomendaciones.
- `profile_ready`: hay señal estructurada minima para recomendar.
- `recommendations_ready`: shortlist calculada y visible.
- `route_selected`: ruta elegida y persistida.
- `translation_ready`: traduccion disponible bajo ruta elegida.
- `preview_editing`: preview editable activo.
- `preview_confirmed`: checkpoint confirmado.
- `export_queued`: exportacion solicitada.
- `export_generated`: PDF disponible.
- `export_failed`: error recuperable.

## Persistence Envelope Proposal (JSONB)

```json
{
  "employabilityFlow": {
    "flowState": "route_selected",
    "profileSnapshotId": "profile-snapshot-user-123",
    "recommendations": {
      "recommendationSetId": "rec-set-20260324-01",
      "generatedAt": "2026-03-24T20:00:00.000Z",
      "algorithmVersion": "rules-v1",
      "routes": [
        {
          "routeId": "operations-coordinator-logistics-mid",
          "targetRoleSlug": "operations-coordinator",
          "targetRoleLabel": "Coordinador de Operaciones y Logistica",
          "targetSector": "logistics",
          "seniority": "mid",
          "workModel": "onsite",
          "locationHints": ["madrid"],
          "score": 92,
          "reasonCodes": ["LEADERSHIP_MATCH", "LOGISTICS_EXPERIENCE"],
          "reasonSummary": "Tu experiencia en coordinacion y logistica militar encaja con operaciones civiles."
        }
      ]
    },
    "selectedRoute": {
      "recommendationSetId": "rec-set-20260324-01",
      "routeId": "operations-coordinator-logistics-mid",
      "selectedAt": "2026-03-24T20:02:00.000Z",
      "selectionSource": "user_manual"
    },
    "translation": {
      "blocks": [],
      "sourceRefMap": {},
      "qualityFlags": [],
      "generatedAt": "2026-03-24T20:03:00.000Z"
    },
    "lastUpdatedAt": "2026-03-24T20:03:00.000Z"
  }
}
```

## Non-Goals for this Slice

- Ranking probabilistico o ML-based.
- Multi-shortlist historica por usuario (solo set activo).
- Infraestructura nueva de almacenamiento para recomendaciones.
