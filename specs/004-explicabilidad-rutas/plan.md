# Implementation Plan: Explicabilidad y Guia de Recomendaciones Laborales

**Branch**: `004-explicabilidad-rutas` | **Date**: 2026-03-25 | **Spec**: `/home/svens/dev/brujula-civil/specs/004-explicabilidad-rutas/spec.md`
**Input**: Feature specification from `/home/svens/dev/brujula-civil/specs/004-explicabilidad-rutas/spec.md`

## Summary

Plan MVP-first para extender `003-recommend-career-routes` con explicabilidad visible, metadatos trazables de decision, y recuperacion de contexto al reingresar, sin reescritura global ni nueva infraestructura. El enfoque mantiene la logica de reglas y persistencia en `employabilityFlow` y agrega solo contratos minimos para mostrar fit legible, guia accionable y contexto explicativo reutilizable en translation/preview/pdf.

## Technical Context

**Language/Version**: TypeScript (^5, strict mode)
**Primary Dependencies**: Next.js (App Router), React, Supabase SSR/client, Zod
**Storage**: Supabase Postgres (`user_wizard_state.aggregated_draft_jsonb.employabilityFlow`)
**Testing**: Vitest (`node` and `jsdom` projects)
**Target Platform**: Web app (SSR + client interactions)
**Project Type**: Single Next.js application
**Performance Goals**:

- P95 de generacion de shortlist explicable <= 350 ms server para reglas deterministicas.
- Render de shortlist + guia de decision <= 2.0 s percibidos en `/traduccion`.
- Persistencia de seleccion + contexto explicativo <= 700 ms percibidos.

**Constraints**:

- Reutilizar implementacion y artefactos de `003` sin refactor transversal.
- Mantener editabilidad previa a exportacion PDF.
- Validar fronteras con Zod en acciones/server y payloads recuperados.
- Mensajes user-safe: sin detalles internos ni provider leaks.
- Verificacion de implementacion: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.

**Scale/Scope**:

- 1 shortlist activa por usuario (3 a 5 rutas), 1 seleccion activa con contexto explicativo minimo.
- Alcance limitado a explicabilidad + guia + trazabilidad/reingreso.
- Fuera de alcance: matching avanzado, marketplace, integraciones externas nuevas.

## Constitution Check (Pre-Design)

GATE: Must pass before implementation and again before merge.

| Gate                                | Result | Evidence / Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify-First Engineering            | PASS   | Evidencia revisada en `/home/svens/dev/brujula-civil/src/features/recommendations/schemas/recommendation.schema.ts`, `/home/svens/dev/brujula-civil/src/features/recommendations/server/select-career-route.ts`, `/home/svens/dev/brujula-civil/src/features/recommendations/components/career-route-shortlist.tsx`, `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.ts`, `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`, `/home/svens/dev/brujula-civil/src/app/(app)/traduccion/page.tsx`, `/home/svens/dev/brujula-civil/src/app/api/translation/route.ts`, `/home/svens/dev/brujula-civil/src/features/cv/server/export-cv-pdf.ts`. |
| Contract-First Boundaries           | PASS   | Se definen primero extensiones de `schemas/types` (recomendacion explicable + contexto seleccionado) en Phase 1 antes de cambios de UI/acciones/server.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Mandatory Quality Gates             | PASS   | Plan y quickstart fijan orden obligatorio: lint -> typecheck -> test:run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Security by Default                 | PASS   | Persistencia user-scoped en `user_wizard_state`, errores seguros y validacion de input no confiable antes de guardar/mostrar explicaciones.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Reversible Incremental Delivery     | PASS   | Implementacion dividida en incrementos independientes (contratos, UI explicable, seleccion+persistencia, reingreso, trazabilidad).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Domain Safety and Product Integrity | PASS   | Se preserva uso de `DomainResult` y editabilidad pre-export; se adiciona cadena explicativa sin romper pipeline vigente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Gates

- Gate Status: PASS
- ERROR Conditions: ninguna. No hay violaciones constitucionales ni clarificaciones criticas sin default razonable.

## Proposed Architecture

1. **Extension incremental del dominio recommendations (sin modulo nuevo)**
   - Extender `recommendationRouteSchema` y tipos asociados con metadatos de explicabilidad legibles y auditables:
     - `fitLabel` (`alto`, `medio`, `exploratorio`) para comparacion visual.
     - `fitScore` (0..100) solo para orden interno + soporte UI.
     - `explanationKeywords[]` (senales de alto nivel para producto/analitica).
     - `decisionGuidance` breve por ruta (accion concreta de comparacion/eleccion).
   - Mantener `reasonSummary` como mensaje principal para usuario final.

2. **Contexto explicativo persistido junto a selectedRoute**
   - Reusar `employabilityFlow.selectedRoute` y agregar `selectedRouteContext` minimo:
     - `recommendationSetId`, `selectedRouteId`, `selectedAt` (ya existe).
     - `reasonSummarySnapshot`, `fitLabelSnapshot`, `guidanceSnapshot`.
   - Objetivo: reingreso robusto cuando cambie shortlist o haya datos parciales.

3. **UI explicable en `/traduccion` reutilizando shortlist actual**
   - Extender `CareerRouteShortlist` para mostrar:
     - fit legible por ruta,
     - guidance de decision,
     - estado seleccionado con contexto resumido.
   - Sin pantalla nueva: mantener integracion en `src/app/(app)/traduccion/page.tsx` para evitar complejidad de routing.

4. **Trazabilidad y continuidad hacia translation/preview/pdf**
   - Mantener `selectedRouteId` como ancla principal existente.
   - Agregar metadata explicativa minima en envelopes/meta donde ya existe trazabilidad (`translation` y export meta) sin alterar contratos base de PDF.
   - Reingreso usa `getOnboardingOverview` con fallback seguro de contexto explicable.

## Project Structure

### Documentation (this feature)

```text
/home/svens/dev/brujula-civil/specs/004-explicabilidad-rutas/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- recommendations-to-explanation-ui.md
|   |-- explanation-selection-to-traceability.md
|   `-- reentry-explanation-recovery.md
`-- checklists/requirements.md
```

### Source Code (repository root)

```text
/home/svens/dev/brujula-civil/src/
|-- app/
|   |-- (app)/traduccion/page.tsx
|   |-- (app)/traduccion/page.test.tsx
|   |-- (app)/cv/preview/page.tsx
|   `-- api/
|       |-- translation/route.ts
|       |-- translation/route.test.ts
|       |-- cv/generate/route.test.ts
|       `-- cv/pdf/route.test.ts
|-- features/
|   |-- recommendations/
|   |   |-- schemas/recommendation.schema.ts
|   |   |-- types/recommendation.types.ts
|   |   |-- services/route-recommendation-rules.ts
|   |   |-- server/{generate-career-routes.ts,select-career-route.ts}
|   |   |-- actions/{get-career-routes-action.ts,select-career-route-action.ts}
|   |   `-- components/career-route-shortlist.tsx
|   |-- wizard/
|   |   |-- schemas/wizard-state.schema.ts
|   |   `-- server/{get-onboarding-overview.ts,save-onboarding-step.ts}
|   |-- translation/
|   |   |-- schemas/translation.schema.ts
|   |   `-- server/generate-translation.ts
|   `-- cv/
|       |-- schemas/cv-draft.schema.ts
|       `-- server/{get-cv.ts,export-cv-pdf.ts}
`-- lib/contracts/
```

**Structure Decision**: extender `recommendations` + `wizard-state` + superficies de integracion existentes (`traduccion`, `translation route`, `cv export`) sin crear flujo paralelo ni modificar arquitectura global.

## Evidence from Current Repo (Source of Truth)

1. **Artefactos 003 reutilizables ya implementados**
   - Motor y shortlist: `/home/svens/dev/brujula-civil/src/features/recommendations/server/generate-career-routes.ts`.
   - Seleccion persistida: `/home/svens/dev/brujula-civil/src/features/recommendations/server/select-career-route.ts`.
   - UI shortlist: `/home/svens/dev/brujula-civil/src/features/recommendations/components/career-route-shortlist.tsx`.

2. **Persistencia actual de seleccion**
   - `selectedRoute` y `recommendations` viven en `employabilityFlow`: `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.ts`.
   - Merge defensivo al guardar onboarding: `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`.

3. **Donde mostrar explicacion y guia sin nueva ruta**
   - Render condicional de shortlist en `/traduccion`: `/home/svens/dev/brujula-civil/src/app/(app)/traduccion/page.tsx`.
   - `reasonSummary` ya visible por ruta: `/home/svens/dev/brujula-civil/src/features/recommendations/components/career-route-shortlist.tsx`.

4. **Contratos/schemas minimos a extender**
   - Recommendation schema/type: `/home/svens/dev/brujula-civil/src/features/recommendations/schemas/recommendation.schema.ts`, `/home/svens/dev/brujula-civil/src/features/recommendations/types/recommendation.types.ts`.
   - Employability flow envelope: `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.ts`.
   - Translation input/output con `selectedRouteId`: `/home/svens/dev/brujula-civil/src/features/translation/schemas/translation.schema.ts`.

5. **Tests existentes que se extienden (sin suite nueva compleja)**
   - UI shortlist/traduccion: `/home/svens/dev/brujula-civil/src/app/(app)/traduccion/page.test.tsx`, `/home/svens/dev/brujula-civil/src/features/recommendations/components/career-route-shortlist.test.tsx`.
   - Persistencia/reingreso: `/home/svens/dev/brujula-civil/src/features/wizard/server/{save-onboarding-step.test.ts,get-onboarding-overview.test.ts}`.
   - Trazabilidad pipeline: `/home/svens/dev/brujula-civil/src/app/api/{translation/route.test.ts,cv/generate/route.test.ts,cv/pdf/route.test.ts}`, `/home/svens/dev/brujula-civil/src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.

## MVP-First Incremental Strategy

1. **Incremento 1 - Contratos de explicabilidad (P1)**
   - Extender schemas/types de recommendations + wizard-state para fit/guidance/context snapshots.
   - Tests de schema/tipos y reglas existentes (`node`).

2. **Incremento 2 - UI explicable y comparacion simple (P1)**
   - Extender `CareerRouteShortlist` y test de `/traduccion` para fit + guidance + estados seguros.
   - Sin cambios de routing.

3. **Incremento 3 - Seleccion con contexto explicativo persistido (P2)**
   - Ajustar `select-career-route` y action para guardar snapshot explicativo minimo.
   - Tests de pertenencia al set + persistencia merge-safe.

4. **Incremento 4 - Reingreso y fallback robusto (P3)**
   - Recuperar `selectedRouteContext` via `getOnboardingOverview` y degradar seguro si snapshot falta.
   - Tests de legacy + datos parciales sin perdida de seleccion.

5. **Incremento 5 - Trazabilidad incremental a translation/preview/pdf (P2/P3)**
   - Propagar metadata minima en boundaries ya existentes, sin romper backward compatibility.
   - Extender contract tests E2E del slice.

## Risks and Mitigations

| Risk                                                     | Impact | Mitigation                                                                                   |
| -------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| Sobrecargar UX con demasiada explicacion                 | Medio  | Limitar copy a `reasonSummary` + `fitLabel` + `decisionGuidance` corto por ruta.             |
| Drift entre snapshot explicativo y shortlist actualizada | Alto   | Persistir snapshot minimo en seleccion y marcar stale cuando cambie `recommendationSetId`.   |
| Ruptura de compatibilidad con flujo 003/legacy           | Alto   | Mantener campos nuevos opcionales y conservar `selectedRecommendation` bridge en reingreso.  |
| Complejidad innecesaria en pruebas                       | Medio  | Extender suites existentes por capa; evitar harness E2E nuevo fuera de contract test actual. |
| Fuga de detalles internos en mensajes de explicabilidad  | Alto   | Centralizar textos user-facing y validar output en tests de UI/API.                          |

## Testing Strategy

1. **Schemas/Services (`node`)**
   - Extender `recommendation.schema.test.ts`, `route-recommendation-rules.test.ts`, `generate-career-routes.test.ts` para fit/guidance/explanation fields.
2. **Server/Actions (`node`)**
   - Extender `select-career-route.test.ts`, `get-career-routes-action.test.ts` para persistencia de contexto explicativo y validaciones.
3. **Wizard persistence/reentry (`node`)**
   - Extender `save-onboarding-step.test.ts`, `get-onboarding-overview.test.ts` para merge/recovery de snapshots explicativos.
4. **UI (`jsdom`)**
   - Extender `career-route-shortlist.test.tsx` y `src/app/(app)/traduccion/page.test.tsx` para comparacion y guia accionable.
5. **Pipeline traceability (`node`)**
   - Extender `translation/route.test.ts`, `cv/generate/route.test.ts`, `cv/pdf/route.test.ts`, `profile-translation-cv-pdf.contract.test.ts` para continuidad sin romper editabilidad.

## Exit Criteria

1. Cada ruta de shortlist muestra explicacion legible + fit legible + guia breve.
2. Seleccion de ruta guarda contexto explicativo minimo en `employabilityFlow` y se recupera al reingresar.
3. Pipeline translation/preview/pdf mantiene trazabilidad de la ruta seleccionada sin degradar editabilidad.
4. Manejo loading/empty/error en explicabilidad es seguro y accionable.
5. No se introducen reescrituras globales ni infraestructura nueva.
6. Gate de calidad listo para implementacion: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.

## Constitution Check (Post-Design Re-evaluation)

| Gate                                | Result | Evidence / Action                                                                                                               |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Verify-First Engineering            | PASS   | Diseno respaldado por evidencia del repo y artefactos de fase (`research.md`, `data-model.md`, `contracts/*`, `quickstart.md`). |
| Contract-First Boundaries           | PASS   | Se definieron contratos/modelo de datos de explicabilidad antes de cambios de logica/UI.                                        |
| Mandatory Quality Gates             | PASS   | Quickstart fija gates obligatorios y suites objetivo por capa.                                                                  |
| Security by Default                 | PASS   | Se limita exposicion de detalles internos y se mantiene scope user-level en persistencia.                                       |
| Reversible Incremental Delivery     | PASS   | Estrategia en 5 incrementos aislables y reversibles.                                                                            |
| Domain Safety and Product Integrity | PASS   | Se conserva `DomainResult`, trazabilidad y editabilidad previa a exportacion PDF.                                               |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |
