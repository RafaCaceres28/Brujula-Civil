# Quickstart - Explicabilidad de Rutas (MVP incremental)

## Goal

Validar de forma reproducible: shortlist explicable -> seleccion guiada -> persistencia de contexto explicativo -> reingreso coherente -> continuidad a translation/preview/pdf sin romper editabilidad.

## Preconditions

1. Usuario autenticado con datos estructurados suficientes de wizard.
2. Estado en `user_wizard_state` disponible.
3. Rama activa: `004-explicabilidad-rutas`.

## Manual Validation Flow

1. Abrir `/traduccion` con perfil elegible.
2. Confirmar shortlist:
   - 3 a 5 rutas.
   - cada ruta con `reasonSummary`, `fitLabel` y `decisionGuidance`.
   - estados `loading/empty/error` seguros.
3. Seleccionar ruta:
   - verificar badge/estado seleccionado en UI.
   - confirmar persistencia de `selectedRoute` y `selectedRouteContext`.
4. Reingresar al flujo:
   - recuperar ruta seleccionada.
   - recuperar contexto explicativo minimo o fallback seguro.
5. Continuar a preview y exportacion:
   - mantener `selectedRouteId` trazable.
   - confirmar que editabilidad previa sigue obligatoria antes de exportar.

## Incremental Automated Checks

Ejecutar siempre en este orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Atajo permitido: `pnpm verify`.

## Suggested Test Targets (extend only)

- Recommendations (`node`):
  - `/home/svens/dev/brujula-civil/src/features/recommendations/schemas/recommendation.schema.test.ts`
  - `/home/svens/dev/brujula-civil/src/features/recommendations/services/route-recommendation-rules.test.ts`
  - `/home/svens/dev/brujula-civil/src/features/recommendations/server/{generate-career-routes.test.ts,select-career-route.test.ts}`
- Wizard re-entry/persistence (`node`):
  - `/home/svens/dev/brujula-civil/src/features/wizard/server/{get-onboarding-overview.test.ts,save-onboarding-step.test.ts}`
- UI (`jsdom`):
  - `/home/svens/dev/brujula-civil/src/features/recommendations/components/career-route-shortlist.test.tsx`
  - `/home/svens/dev/brujula-civil/src/app/(app)/traduccion/page.test.tsx`
- Pipeline traceability (`node`):
  - `/home/svens/dev/brujula-civil/src/app/api/{translation/route.test.ts,cv/generate/route.test.ts,cv/pdf/route.test.ts}`
  - `/home/svens/dev/brujula-civil/src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`

## Exit Criteria

1. Explicabilidad visible y comprensible por ruta sin lenguaje tecnico.
2. Seleccion persistida con contexto explicativo minimo para reingreso.
3. Continuidad de trazabilidad en pipeline sin romper backward compatibility.
4. Sin refactor global ni nueva infraestructura.
5. Gates obligatorios de calidad en PASS para cerrar implementacion.
