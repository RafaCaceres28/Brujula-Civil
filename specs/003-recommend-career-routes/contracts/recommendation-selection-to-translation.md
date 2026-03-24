# Contract: Recommendation Selection -> Translation Context

## Boundary

- **Producer**: UI/Action de seleccion de ruta (en flujo traduccion)
- **Consumer**: `src/features/translation/server/generate-translation.ts` y `src/app/api/translation/route.ts`
- **Persistence anchor**: `user_wizard_state.aggregated_draft_jsonb.employabilityFlow.selectedRoute`

## Input Contract

`SelectedCareerRoute`:

- `recommendationSetId: domainId`
- `routeId: string`
- `selectedAt: timestamp`
- `selectionSource: 'user_manual'`

`TranslationInput` (extended minimally):

- Contrato actual de traduccion + `selectedRouteId?: string`

## Output Contract

`DomainResult<TranslationOutput, DomainError>` sin romper contrato actual:

- Success:
  - `blocks[]`
  - `sourceRefMap`
  - `qualityFlags[]`
  - metadata trazable de ruta (`selectedRouteId`) en envelope de flujo/persistencia
- Failure:
  - `VALIDATION_ERROR` cuando seleccion no corresponde al set activo
  - `INTERNAL_ERROR` fallback

## Rules

1. `routeId` seleccionado DEBE existir en shortlist activa.
2. No se inicia traduccion orientada a ruta si la seleccion requerida no existe.
3. La extension de contrato DEBE ser backward-compatible (campo opcional al inicio).
4. Errores al usuario DEBEN ser accionables y seguros.

## Traceability Tag

- `recommendationSetId -> selectedRouteId -> translation.blocks[*].sourceRefMap`.
