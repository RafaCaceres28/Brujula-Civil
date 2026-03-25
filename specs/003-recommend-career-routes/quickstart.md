# Quickstart - Career Route Recommendations MVP

## Goal

Validar de forma reproducible el flujo: perfil estructurado wizard -> shortlist recomendada -> seleccion de ruta -> traduccion -> preview editable -> exportacion PDF con reingreso y trazabilidad minima.

## Preconditions

1. Usuario autenticado con pasos de wizard suficientes (`militar`, `experiencia`, `competencias`, `objetivos`).
2. Draft de usuario disponible en `user_wizard_state`.
3. Rama activa: `003-recommend-career-routes`.

## Manual Validation Flow

1. Completar/confirmar datos del wizard con señales de trayectoria, habilidades y objetivos.
2. Abrir traduccion y verificar recomendacion:
   - Estado `loading` al calcular.
   - Shortlist visible de 3-5 rutas con razones legibles.
   - Estado `empty` accionable si faltan datos.
3. Seleccionar una ruta:
   - Confirmar persistencia de `selectedRoute`.
   - Reingresar y verificar recuperacion de seleccion.
4. Continuar a preview CV:
   - Confirmar que el contexto conserva trazabilidad de ruta elegida.
   - Editar al menos una seccion (regla obligatoria).
5. Exportar PDF:
   - Confirmar checkpoint de preview.
   - Validar estado `queued/generated/failed` con retry seguro.
6. Revisar trazabilidad final:
   - `profileSnapshotId -> recommendationSetId/selectedRouteId -> previewVersionId -> documentId`.

## Required Automated Checks

Ejecutar SIEMPRE en este orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Atajo permitido: `pnpm verify`.

## Final Polish (Fase G)

Checklist obligatorio de cierre para esta iniciativa:

1. Ejecutar `pnpm lint`, `pnpm typecheck`, `pnpm test:run` en ese orden (sin build).
2. Si aparece una falla, corregir solo archivos del alcance `003-recommend-career-routes`.
3. Confirmar que `specs/003-recommend-career-routes/tasks.md` refleja unicamente tareas realmente completadas.
4. Registrar evidencia del cierre con estado por gate (pass/fail) y commit final de fase.

## Final Validation Criteria

Para considerar el cierre de la fase, deben cumplirse todos:

1. Gates obligatorios en PASS: lint, typecheck y test:run.
2. Sin cambios fuera del alcance funcional de recomendaciones y su trazabilidad acordada.
3. `tasks.md` con T053-T056 marcadas como completadas solo cuando exista evidencia.
4. Commit final en formato Conventional Commits, reversible y sin AI attribution.

## Suggested Test Targets (to extend)

- Reglas y recomendacion (`node`):
  - `src/features/recommendations/server/*.test.ts` (nuevo)
- Wizard/persistencia (`node`):
  - `src/features/wizard/server/save-onboarding-step.test.ts`
  - `src/features/wizard/server/get-onboarding-overview.test.ts`
- Translation/CV/PDF boundaries (`node`):
  - `src/app/api/translation/route.test.ts`
  - `src/app/api/cv/generate/route.test.ts`
  - `src/app/api/cv/pdf/route.test.ts`
- UI (`jsdom`):
  - `src/app/(app)/traduccion/page.test.tsx`
  - `src/app/(app)/cv/preview/page.test.tsx`
- Slice contractual (`node`):
  - `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`

## Expected Exit Criteria

1. Shortlist de 3-5 rutas disponible para perfiles elegibles.
2. Seleccion de ruta persistida y recuperable al reingresar.
3. Integracion de ruta elegida en traduccion/preview/PDF con trazabilidad minima.
4. Editabilidad previa a exportacion no se rompe.
5. Estados loading/empty/error seguros y comprensibles.
