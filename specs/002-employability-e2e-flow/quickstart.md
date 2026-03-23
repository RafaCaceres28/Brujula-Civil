# Quickstart - Vertical Slice Employability E2E

## Goal

Validar de forma reproducible el flujo perfil -> traducción -> preview CV editable -> exportación PDF con trazabilidad y estados claros.

## Preconditions

1. Usuario autenticado con perfil mínimo cargado.
2. Variables públicas de Supabase configuradas para SSR.
3. Rama activa: `002-employability-e2e-flow`.

## Manual Validation Flow

1. Abrir perfil y confirmar que existe información mínima utilizable.
2. Ir a traducción y ejecutar generación:
   - Esperar estado `loading`.
   - Verificar `ready` o `empty` accionable si faltan datos.
3. Ir a preview CV:
   - Editar al menos una sección (regla obligatoria).
   - Confirmar que cambios persisten al recargar.
4. Solicitar exportación PDF:
   - Verificar bloqueo de doble submit.
   - Confirmar transición de estado `queued` -> `generated` o `failed`.
5. Validar consistencia:
   - Contenido semántico del PDF coincide con snapshot de preview confirmado.
   - Trazabilidad visible entre perfil/traducción/preview/PDF.

## Required Automated Checks

Ejecutar SIEMPRE en este orden:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test:run`

Atajo permitido: `pnpm verify`.

## Final Validation Evidence (T053-T055)

Ultima corrida de gates en `002-employability-e2e-flow`:

1. `pnpm lint` -> PASS.
2. `pnpm typecheck` -> PASS.
3. `pnpm test:run` -> PASS (`69` test files, `268` tests, `29.83s`).

Nota operativa: durante `pnpm test:run` aparece warning no bloqueante de React `act(...)` en `src/app/(app)/cv/preview/page.test.tsx`; la suite finaliza en verde y sin fallo funcional.

## SC Measurement Method (SC-001 / SC-002 / SC-005)

- **Fuente de evidencia**: resultados de pruebas contractuales E2E + pruebas de integración/UI del flujo en esta iniciativa (`src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`, handlers `route.test.ts`, y UI `page.test.tsx`).
- **Entorno**: ejecución local reproducible en rama `002-employability-e2e-flow` con `pnpm test:run` y datos/fixtures controlados del slice.
- **Criterio mínimo de validación**: todos los casos definidos para completion E2E, edición previa reflejada en exportación, y reingreso con recuperación de borrador deben finalizar en PASS para considerar SC-001/SC-002/SC-005 cumplidos en el cierre de la iniciativa.

## Suggested Test Targets

- UI (`jsdom`):
  - `src/app/(app)/traduccion/page.*`
  - `src/app/(app)/cv/preview/page.*`
- API handlers (`node`):
  - `src/app/api/translation/route.test.ts`
  - `src/app/api/cv/generate/route.test.ts`
  - `src/app/api/cv/pdf/route.test.ts`
- Services/contracts (`node`):
  - `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`
  - `src/features/cv/server/cv-contract-compatibility.test.ts`

## Expected Slice Exit Criteria

1. Usuario completa flujo de punta a punta sin salir de la app.
2. Edición previa se aplica y persiste.
3. Exportación PDF conserva semántica del preview confirmado.
4. Estados loading/empty/error son claros y seguros.

## Closure Checklist

1. Gates finales ejecutados y en verde (`lint`, `typecheck`, `test:run`).
2. Evidencia de neutralidad de performance registrada en `contracts/performance-neutrality-check.md`.
3. `tasks.md` actualizado con rollout/cierre y T053-T059 en `[x]`.
4. Iniciativa declarada lista para cierre formal y commit final.
