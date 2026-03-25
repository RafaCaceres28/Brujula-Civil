# Contract: Wizard Structured Profile -> Career Recommendations

## Boundary

- **Producer**: `src/features/wizard/server/get-onboarding-overview.ts` + `src/features/wizard/schemas/wizard.schema.ts`
- **Consumer**: `src/features/recommendations/server/generate-career-routes.ts` (nuevo)
- **Entry points (planned)**:
  - `src/app/(app)/traduccion/page.tsx`
  - `src/features/recommendations/actions/*` (si se define action dedicada)

## Input Contract

`RecommendationInputSnapshot`:

- `userId: domainId`
- `profileSnapshotId: domainId`
- `wizardDraft.militar`
- `wizardDraft.experiencia`
- `wizardDraft.competencias`
- `wizardDraft.objetivos`

## Output Contract

`DomainResult<RecommendationShortlist, DomainError>`:

- Success:
  - `recommendationSetId`
  - `generatedAt`
  - `algorithmVersion`
  - `routes[3..5]` ordenadas por score descendente
- Failure:
  - `VALIDATION_ERROR` si input estructurado no es suficiente
  - `INTERNAL_ERROR` fallback seguro

## Rules

1. Shortlist DEBE contener entre 3 y 5 rutas si hay datos suficientes.
2. Cada ruta DEBE incluir `reasonCodes` + `reasonSummary` explicables.
3. La recomendacion DEBE usar catalogos de negocio existentes (`TARGET_ROLE_OPTIONS`, `TARGET_SECTOR_OPTIONS`).
4. No se permite devolver detalles tecnicos internos al usuario en `error.message`.

## Traceability Tag

- `profileSnapshotId -> recommendationSetId`.
