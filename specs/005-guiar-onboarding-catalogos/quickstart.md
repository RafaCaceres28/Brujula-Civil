# Quickstart - 005-guiar-onboarding-catalogos

## Goal

Validar de forma incremental que onboarding captura campos estructurados mediante catalogos, mantiene campos narrativos libres y conserva continuidad de reingreso/downstream sin rediseño total.

## Preconditions

1. Rama activa: `005-guiar-onboarding-catalogos`.
2. Usuario autenticado con acceso a `/onboarding/*`.
3. Catalogos cargados desde `src/features/wizard/config/wizard-catalogs.ts`.

## Manual Validation Flow

1. Abrir `/onboarding/militar`:
   - confirmar controles guiados en `branch/corps/rank/specialty/destinationContext/leadershipLevel/teamSize`.
   - confirmar texto libre solo en `unitName/notes`.
2. Abrir `/onboarding/experiencia`:
   - confirmar multi-select guiado para `responsibilityAreas/missionTypes/functionTypes/tools/leadershipScopes`.
   - confirmar `achievements/additionalContext` libres.
3. Abrir `/onboarding/competencias`:
   - confirmar controles guiados para skills/certificaciones/licencias/office/languages.
   - confirmar `extraTraining` libre.
4. Abrir `/onboarding/objetivos`:
   - confirmar controles guiados para `targetRoles/targetSectors/preferredLocations/workModel/seniority`.
   - confirmar `preferencesNotes` libre.
5. Completar resumen y guardar:
   - validar persistencia en reingreso (datos guiados recuperados correctamente).
   - validar que recomendaciones/traduccion siguen operativas.

## Required Automated Checks

Ejecutar SIEMPRE en este orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Atajo permitido: `pnpm verify`.

## Suggested Test Targets

- Wizard schemas/mappers (`node`):
  - `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.test.ts`
  - `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.test.ts`
- Wizard server persistence/reentry (`node`):
  - `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts`
  - `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.test.ts`
- Wizard state compatibility (`node`):
  - `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.test.ts`
- Downstream consistency (`node`):
  - agregar test para `/home/svens/dev/brujula-civil/src/features/recommendations/services/build-recommendation-input.ts`

## Expected Exit Criteria

1. Campos estructurados dejan de aceptar texto libre fuera de catalogo.
2. Campos narrativos definidos mantienen editabilidad.
3. Draft legacy mantiene reingreso util sin perdida material.
4. Recommendations/translation/profile reciben datos mas consistentes sin romper compatibilidad.
5. Sin refactor global ni wizard paralelo.

## Final Rollout/Cierre Checklist

- [x] US1 liberado primero (controles guiados para campos estructurados en los 4 pasos).
- [x] US2 liberado despues (texto libre solo en campos narrativos permitidos).
- [x] US3 liberado al final (reingreso legacy/guided y continuidad downstream).
- [x] Hardening ejecutado antes del cierre final de la fase.
- [x] Gates finales ejecutados en orden: `pnpm lint` -> `pnpm typecheck` -> `pnpm test:run`.

## Checklist de No-Alcance (Cumplimiento)

- [x] Sin rediseño completo de wizard en `src/features/wizard/**`.
- [x] Sin refactor global de profile fuera de `src/features/profile/server/project-wizard-to-profiles.ts`.
- [x] Sin recommendation nueva ni expansion funcional fuera de continuidad en `src/features/recommendations/**`.
- [x] Sin job board, matching externo ni integraciones adicionales en `src/app/**`.
- [x] Sin expansion de LinkedIn fuera de compatibilidad existente en `src/features/linkedin/**`.
