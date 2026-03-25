# Tasks: 003-recommend-career-routes

**Input**: Design documents from `/home/svens/dev/brujula-civil/specs/003-recommend-career-routes/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by phase and user story priority so each story can be implemented and tested independently with MVP-first rollout.

## Format: `- [ ] T### [P?] [US?] Descripcion con path exacto`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencia directa).
- **[USx]**: Etiqueta de historia (`US1`, `US2`, `US3`) solo en fases de historias.
- Todas las tareas incluyen al menos un path exacto.

## Phase 1: Setup

**Purpose**: Preparar el esqueleto tecnico de recomendaciones sin tocar aun integraciones de producto.

- [x] T001 Crear modulo base de feature recommendations en `src/features/recommendations/index.ts`.
- [x] T002 Crear contratos iniciales de recomendacion en `src/features/recommendations/types/recommendation.types.ts`.
- [x] T003 Crear schemas Zod iniciales de recomendacion en `src/features/recommendations/schemas/recommendation.schema.ts`.
- [x] T004 Crear fixtures base para escenarios de recomendacion en `src/features/recommendations/server/__fixtures__/recommendation-fixtures.ts`.
- [x] T005 Crear cobertura inicial de tipos/schemas de recomendaciones en `src/features/recommendations/types/recommendation.types.test.ts`.

---

## Phase 2: Foundational (Blocking)

**Purpose**: Definir cimientos contract-first y persistencia minima compartida antes de historias.

- [x] T006 Extender estado de flujo con shortlist y ruta elegida en `src/features/wizard/types/wizard-state.types.ts`.
- [x] T007 Extender validacion de flujo con shortlist y ruta elegida en `src/features/wizard/schemas/wizard-state.schema.ts`.
- [x] T008 Exportar contratos/schemas de recommendations en `src/lib/contracts/index.ts`.
- [x] T009 Implementar servicio de reglas deterministicas y reason codes en `src/features/recommendations/services/route-recommendation-rules.ts`.
- [x] T010 Implementar orchestrator server para generar shortlist con `DomainResult` en `src/features/recommendations/server/generate-career-routes.ts`.
- [x] T011 Implementar persistencia de seleccion de ruta en draft de usuario en `src/features/recommendations/server/select-career-route.ts`.
- [x] T012 Ajustar merge defensivo de `employabilityFlow` al guardar wizard en `src/features/wizard/server/save-onboarding-step.ts`.
- [x] T013 Ajustar recuperacion de `recommendations/selectedRoute` al leer overview en `src/features/wizard/server/get-onboarding-overview.ts`.
- [x] T014 Validar compatibilidad de schema extendido con draft existente en `src/features/wizard/schemas/wizard-state.schema.test.ts`.

**Checkpoint**: Foundation complete; user stories can proceed.

---

## Phase 3: User Story 1 - Shortlist de 3-5 rutas por reglas explicables (Priority: P1)

**Goal**: Entregar generacion de shortlist 3-5 por reglas auditables, incluyendo manejo de datos insuficientes.
**Independent Test**: Con perfil estructurado suficiente se obtiene shortlist 3-5 ordenada y explicable; con perfil insuficiente retorna error validable y seguro.

### Tests for User Story 1

- [x] T015 [P] [US1] Crear test de ranking y desempate de reglas en `src/features/recommendations/services/route-recommendation-rules.test.ts`.
- [x] T016 [P] [US1] Crear test de borde por datos insuficientes en `src/features/recommendations/server/generate-career-routes.test.ts`.
- [x] T017 [P] [US1] Crear test de validacion de shortlist 3-5 y reasonSummary en `src/features/recommendations/schemas/recommendation.schema.test.ts`.

### Implementation for User Story 1

- [x] T018 [US1] Implementar scoring por rol/sector/seniority/workModel sobre catalogos en `src/features/recommendations/services/route-recommendation-rules.ts`.
- [x] T019 [US1] Implementar armado de `RecommendationInputSnapshot` desde wizard en `src/features/recommendations/services/build-recommendation-input.ts`.
- [x] T020 [US1] Integrar generacion de shortlist con validacion y errores seguros en `src/features/recommendations/server/generate-career-routes.ts`.
- [x] T021 [US1] Exponer action de obtencion de shortlist para UI en `src/features/recommendations/actions/get-career-routes-action.ts`.
- [x] T022 [US1] Validar contrato de action de shortlist en `src/features/recommendations/actions/get-career-routes-action.test.ts`.

---

## Phase 4: User Story 2 - Shortlist visible, seleccion persistida y reingreso (Priority: P1/P2)

**Goal**: Mostrar shortlist en UI, permitir seleccion explicita, persistirla y recuperarla al reingresar con estados loading/empty/error.
**Independent Test**: Usuario visualiza shortlist, elige ruta, recarga/reingresa y mantiene seleccion con mensajes seguros en loading/empty/error.

### Tests for User Story 2

- [x] T023 [P] [US2] Extender pruebas de UI para loading/empty/error y render de shortlist en `src/app/(app)/traduccion/page.test.tsx`.
- [x] T024 [P] [US2] Crear pruebas de seleccion y persistencia de ruta en `src/features/recommendations/server/select-career-route.test.ts`.
- [x] T025 [P] [US2] Extender pruebas de reingreso con `selectedRoute` en `src/features/wizard/server/get-onboarding-overview.test.ts`.
- [x] T026 [P] [US2] Crear pruebas de interaccion de shortlist (seleccion/cambio) en `src/features/recommendations/components/career-route-shortlist.test.tsx`.

### Implementation for User Story 2

- [x] T027 [US2] Implementar componente de shortlist con razones y seleccion en `src/features/recommendations/components/career-route-shortlist.tsx`.
- [x] T028 [US2] Implementar action de seleccion de ruta y validacion de frontera en `src/features/recommendations/actions/select-career-route-action.ts`.
- [x] T029 [US2] Integrar shortlist + seleccion + estados loading/empty/error en `src/app/(app)/traduccion/page.tsx`.
- [x] T030 [US2] Persistir `selectedRoute` y `recommendationSetId` en flujo activo en `src/features/recommendations/server/select-career-route.ts`.
- [x] T031 [US2] Recuperar contexto de seleccion al cargar traduccion en `src/features/translation/server/get-translation.ts`.
- [x] T032 [US2] Aplicar guard de avance cuando falta seleccion requerida en `src/app/api/translation/route.ts`.
- [x] T033 [US2] Validar mapeo de error de seleccion faltante en `src/app/api/translation/route.test.ts`.

---

## Phase 5: User Story 3 - Integracion recommendation -> translation -> preview -> PDF (Priority: P2)

**Goal**: Propagar la ruta elegida con trazabilidad minima end-to-end sin romper editabilidad previa a exportacion.
**Independent Test**: Con ruta seleccionada, translation/cv/preview/pdf mantienen `selectedRouteId` trazable y el usuario sigue pudiendo editar antes del PDF.

### Tests for User Story 3

- [x] T034 [P] [US3] Extender contrato translation con `selectedRouteId` en `src/features/translation/server/profile-to-translation.contract.test.ts`.
- [x] T035 [P] [US3] Extender test de integracion de slice con cadena completa de trazabilidad en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.
- [x] T036 [P] [US3] Extender test de handler CV generate para metadata de ruta elegida en `src/app/api/cv/generate/route.test.ts`.
- [x] T037 [P] [US3] Extender test de handler PDF para checkpoint + route traceability en `src/app/api/cv/pdf/route.test.ts`.
- [x] T038 [P] [US3] Extender regresion de editabilidad con ruta elegida en `src/app/(app)/cv/preview/page.test.tsx`.

### Implementation for User Story 3

- [x] T039 [US3] Inyectar contexto de ruta elegida en generacion de traduccion en `src/features/translation/server/generate-translation.ts`.
- [x] T040 [US3] Propagar metadata de ruta elegida al preview CV en `src/features/cv/server/generate-cv.ts`.
- [x] T041 [US3] Persistir traza `selectedRouteId -> previewVersionId -> documentId` en `src/features/cv/server/export-cv-pdf.ts`.
- [x] T042 [US3] Incluir metadata de ruta elegida en payload de PDF en `src/features/documents/server/generate-pdf.ts`.
- [x] T043 [US3] Mostrar trazabilidad de ruta en preview sin bloquear edicion en `src/features/cv/components/cv-preview.tsx`.

---

## Phase 6: Hardening (Edge Cases)

**Purpose**: Cubrir casos limite del MVP sin expandir alcance fuera de recomendaciones por reglas.

- [x] T044 [P] Agregar caso de perfil insuficiente con fallback seguro en `src/features/recommendations/server/generate-career-routes.test.ts`.
- [x] T045 [P] Agregar caso de shortlist vacia con UX accionable en `src/app/(app)/traduccion/page.test.tsx`.
- [x] T046 [P] Agregar caso de recomendacion invalida/no perteneciente al set en `src/features/recommendations/server/select-career-route.test.ts`.
- [x] T047 [P] Agregar caso de draft con translation/cv pero sin recomendacion en `src/features/cv/server/get-cv.test.ts`.
- [x] T048 [P] Agregar caso de compatibilidad del flujo previo sin seleccion en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.
- [x] T049 Implementar fallback seguro para perfil insuficiente o shortlist vacia en `src/features/recommendations/server/generate-career-routes.ts`.
- [x] T050 Implementar rechazo seguro de `routeId` invalido en `src/features/recommendations/server/select-career-route.ts`.
- [x] T051 Implementar recovery de draft parcial sin perder editabilidad en `src/features/cv/server/get-cv.ts`.
- [x] T052 Mantener compatibilidad backward del handler de traduccion sin seleccion en `src/app/api/translation/route.ts`.

---

## Final Phase: Verification and Documentation

- [ ] T053 Ejecutar `pnpm lint` y corregir issues del alcance en `/home/svens/dev/brujula-civil`.
- [ ] T054 Ejecutar `pnpm typecheck` y corregir issues del alcance en `/home/svens/dev/brujula-civil`.
- [ ] T055 Ejecutar `pnpm test:run` y corregir fallas del alcance en `/home/svens/dev/brujula-civil`.
- [ ] T056 Actualizar guia operativa y criterios de validacion final en `specs/003-recommend-career-routes/quickstart.md`.

---

## Dependencies and Execution Order

- Phase 1 -> Phase 2 -> Phase 3 (US1) -> Phase 4 (US2) -> Phase 5 (US3) -> Phase 6 (Hardening) -> Final Phase.
- US2 depende de US1 (la UI requiere shortlist estable y contratos validados).
- US3 depende de US2 (la trazabilidad exige `selectedRoute` persistida y recuperable).
- Hardening depende de US1-US3 para validar edge cases sobre comportamiento real integrado.

## Parallel Execution Opportunities

- US1 tests en paralelo: `T015`, `T016`, `T017`.
- US2 tests en paralelo: `T023`, `T024`, `T025`, `T026`.
- US3 tests en paralelo: `T034`, `T035`, `T036`, `T037`, `T038`.
- Hardening tests en paralelo: `T044`, `T045`, `T046`, `T047`, `T048`.

## Independent Test Criteria by Story

- **US1**: evidencia shortlist 3-5 explicable + control de datos insuficientes desde servicio de reglas.
- **US2**: evidencia UI shortlist/seleccion/reingreso con persistencia real y estados loading/empty/error.
- **US3**: evidencia trazabilidad recommendation->translation->preview->pdf sin romper edicion previa a exportacion.

## MVP-First Suggested Delivery

1. MVP funcional inicial: completar US1 (reglas + shortlist explicable + tests de servicio).
2. MVP usable para usuario final: completar US2 (UI seleccionable + persistencia/reingreso + estados UX).
3. MVP end-to-end con integridad de producto: completar US3 (propagacion y trazabilidad hasta PDF).
4. Robustez antes de cierre: ejecutar Hardening y luego quality gates finales.

## Out of Scope Guardrails

- Sin expansion de LinkedIn en esta iniciativa.
- Sin job board ni integraciones externas de matching.
- Sin scoring complejo/IA abierta.
- Sin refactor global fuera de paths impactados.
- Cambios incrementales y reversibles por fase.
