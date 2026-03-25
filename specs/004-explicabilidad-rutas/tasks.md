# Tasks: 004-explicabilidad-rutas

**Input**: Design documents from `/home/svens/dev/brujula-civil/specs/004-explicabilidad-rutas/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by phase and user story priority so each story can be implemented and tested independently with MVP-first rollout.

## Format: `- [ ] T### [P?] [US#?] Descripcion con path exacto`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencia directa)
- **[US#]**: Etiqueta de historia (`US1`, `US2`, `US3`) en fases de historias
- Toda tarea incluye al menos un path exacto

## Phase 1 Setup

**Purpose**: Alinear alcance, contratos y limites de 004 antes de tocar implementacion.

- [x] T001 Consolidar alcance FR/NFR de explicabilidad y no-alcance en `specs/004-explicabilidad-rutas/spec.md`.
- [x] T002 Mapear secuencia MVP-first y dependencias de entrega en `specs/004-explicabilidad-rutas/plan.md`.
- [x] T003 [P] Validar invariantes de `selectedRouteContext` y compatibilidad legacy en `specs/004-explicabilidad-rutas/data-model.md`.
- [x] T004 [P] Validar frontera recommendations->UI explicable en `specs/004-explicabilidad-rutas/contracts/recommendations-to-explanation-ui.md`.
- [x] T005 [P] Validar frontera seleccion->trazabilidad en `specs/004-explicabilidad-rutas/contracts/explanation-selection-to-traceability.md`.
- [x] T006 [P] Validar frontera de recuperacion de reingreso en `specs/004-explicabilidad-rutas/contracts/reentry-explanation-recovery.md`.

---

## Phase 2 Foundational (Blocking)

**Purpose**: Definir cimientos contract-first y persistencia base que bloquean el resto de historias.

- [x] T007 Extender tipos de explicabilidad de ruta en `src/features/recommendations/types/recommendation.types.ts`.
- [x] T008 [P] Extender schema de explicabilidad (`fitLabel`, `fitScore`, `explanationKeywords`, `decisionGuidance`) en `src/features/recommendations/schemas/recommendation.schema.ts`.
- [ ] T009 [P] Extender tipos de `selectedRouteContext` en `src/features/wizard/types/wizard-state.types.ts`.
- [ ] T010 Extender `employabilityFlowDraftSchema` con `selectedRouteContext` en `src/features/wizard/schemas/wizard-state.schema.ts`.
- [x] T011 [P] Agregar pruebas de tipos de metadata explicativa en `src/features/recommendations/types/recommendation.types.test.ts`.
- [x] T012 [P] Agregar pruebas de schema para metadata explicativa y labels permitidos en `src/features/recommendations/schemas/recommendation.schema.test.ts`.
- [ ] T013 [P] Agregar pruebas de schema para `selectedRouteContext` y compatibilidad legacy en `src/features/wizard/schemas/wizard-state.schema.test.ts`.
- [x] T014 Implementar servicio de explicabilidad basado en reason codes/senales en `src/features/recommendations/services/route-recommendation-rules.ts`.
- [x] T015 Agregar pruebas del servicio de explicabilidad por reason codes y desempate en `src/features/recommendations/services/route-recommendation-rules.test.ts`.

**Checkpoint**: Foundation complete; US1/US2/US3 pueden avanzar por prioridad.

---

## Phase 3 US1 - Explicacion clara por ruta (Priority: P1)

**Goal**: Mostrar explicaciones comprensibles por ruta con resumen, nivel de ajuste y fortalezas, sin lenguaje tecnico.
**Independent Test**: Con shortlist valida (3-5), cada ruta muestra `reasonSummary`, badge `fitLabel`, strengths derivadas de `explanationKeywords` y estado seguro en `loading/empty/error`.

### Tests for US1

- [x] T016 [P] [US1] Extender test de generacion para exigir metadata explicativa completa por ruta en `src/features/recommendations/server/generate-career-routes.test.ts`.
- [x] T017 [P] [US1] Extender test de action de shortlist para contrato explicable en `src/features/recommendations/actions/get-career-routes-action.test.ts`.
- [x] T018 [P] [US1] Extender test UI de shortlist para `reasonSummary`, `fitLabel` y strengths en `src/features/recommendations/components/career-route-shortlist.test.tsx`.
- [x] T019 [P] [US1] Extender test de pagina traduccion para estados explicables user-safe en `src/app/(app)/traduccion/page.test.tsx`.

### Implementation for US1

- [x] T020 [US1] Generar `explanation` por ruta desde senales/rules en `src/features/recommendations/server/generate-career-routes.ts`.
- [x] T021 [US1] Ajustar normalizacion de input para exponer senales explicativas en `src/features/recommendations/services/build-recommendation-input.ts`.
- [x] T022 [US1] Ajustar contrato de action de shortlist para metadata explicable en `src/features/recommendations/actions/get-career-routes-action.ts`.
- [x] T023 [US1] Renderizar summary/fit/strengths por ruta en `src/features/recommendations/components/career-route-shortlist.tsx`.
- [x] T024 [US1] Integrar render explicable y fallback seguro en `src/app/(app)/traduccion/page.tsx`.
- [x] T025 [US1] Anadir copy de fallback no tecnico para explicabilidad incompleta en `src/features/translation/components/translation-preview.tsx`.
- [x] T026 [US1] Validar mensajes user-safe de explicabilidad en handler de traduccion en `src/app/api/translation/route.ts`.
- [x] T027 [US1] Extender test del handler de traduccion para fallback seguro de explicabilidad en `src/app/api/translation/route.test.ts`.

---

## Phase 4 US2 - Guia de eleccion y continuidad a pipeline (Priority: P1/P2)

**Goal**: Permitir seleccion guiada de ruta y reutilizarla de forma trazable en translation, preview y exportacion.
**Independent Test**: El usuario selecciona ruta con guidance visible, avanza sin repetir pasos y el pipeline conserva `selectedRouteId` + metadata explicativa minima.

### Tests for US2

- [x] T028 [P] [US2] Extender test de seleccion para snapshot explicativo persistido en `src/features/recommendations/server/select-career-route.test.ts`.
- [x] T029 [P] [US2] Crear test de action de seleccion con validacion de frontera explicable en `src/features/recommendations/actions/select-career-route-action.test.ts`.
- [x] T030 [P] [US2] Extender test de handler translation para trazabilidad `selectedRouteId` + explanation meta en `src/app/api/translation/route.test.ts`.
- [x] T031 [P] [US2] Extender test de handler CV generate para metadatos explicativos minimos en `src/app/api/cv/generate/route.test.ts`.

### Implementation for US2

- [x] T032 [US2] Persistir `selectedRouteContext` (summary/fit/guidance snapshot) en `src/features/recommendations/server/select-career-route.ts`.
- [x] T033 [US2] Validar y normalizar input de seleccion explicable en `src/features/recommendations/actions/select-career-route-action.ts`.
- [x] T034 [US2] Mostrar guidance de decision y confirmacion de eleccion activa en `src/features/recommendations/components/career-route-shortlist.tsx`.
- [x] T035 [US2] Reusar contexto de ruta elegida al generar traduccion en `src/features/translation/server/generate-translation.ts`.
- [x] T036 [US2] Propagar metadata explicativa minima hacia preview CV en `src/features/cv/server/generate-cv.ts`.
- [x] T037 [US2] Propagar metadata explicativa minima hacia exportacion PDF en `src/features/cv/server/export-cv-pdf.ts`.
- [x] T038 [US2] Incluir metadata explicativa en payload de documento exportable en `src/features/documents/server/generate-pdf.ts`.
- [x] T039 [US2] Asegurar trazabilidad explanation->translation en handler API en `src/app/api/translation/route.ts`.

---

## Phase 5 US3 - Reingreso con contexto explicable (Priority: P2)

**Goal**: Recuperar seleccion y contexto explicativo en nuevas sesiones, degradando de forma segura cuando falte snapshot.
**Independent Test**: Tras reingreso, se recupera `selectedRoute` + `selectedRouteContext` cuando existe; si falta contexto, el flujo sigue con fallback seguro sin perder la seleccion.

### Tests for US3

- [ ] T040 [P] [US3] Extender test de overview para recovery de `selectedRouteContext` valido en `src/features/wizard/server/get-onboarding-overview.test.ts`.
- [ ] T041 [P] [US3] Extender test de merge defensivo para no perder `selectedRouteContext` en `src/features/wizard/server/save-onboarding-step.test.ts`.
- [ ] T042 [P] [US3] Extender test UI de reingreso con contexto explicable en `src/app/(app)/traduccion/page.test.tsx`.

### Implementation for US3

- [ ] T043 [US3] Recuperar `selectedRouteContext` con fallback seguro en `src/features/wizard/server/get-onboarding-overview.ts`.
- [ ] T044 [US3] Conservar `selectedRouteContext` en merge de draft al guardar onboarding en `src/features/wizard/server/save-onboarding-step.ts`.
- [ ] T045 [US3] Rehidratar estado de seleccion explicable al cargar traduccion en `src/features/translation/server/get-translation.ts`.
- [ ] T046 [US3] Mostrar resumen de contexto recuperado y aviso de fallback en `src/app/(app)/traduccion/page.tsx`.
- [ ] T047 [US3] Cubrir compatibilidad con puente `selectedRecommendation` legado en `src/features/wizard/server/get-onboarding-overview.ts`.

---

## Phase 6 Hardening

**Purpose**: Cubrir edge cases y reforzar trazabilidad sin ampliar alcance fuera de 004.

- [ ] T048 [P] Validar caso de context snapshot desactualizado por cambio de `recommendationSetId` en `src/features/recommendations/server/select-career-route.test.ts`.
- [ ] T049 [P] Validar caso de explicabilidad parcial en pipeline contractual en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.
- [ ] T050 [P] Validar continuidad de trace en PDF handler (`selectedRouteId` + explanation meta) en `src/app/api/cv/pdf/route.test.ts`.
- [ ] T051 Implementar marcador de contexto explicativo stale y accion de reproceso en `src/features/recommendations/server/select-career-route.ts`.
- [ ] T052 Implementar trazabilidad explanation->translation->preview->pdf en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.
- [ ] T053 Actualizar no-alcance explicitos (sin LinkedIn/job-board/matching externo/scoring complejo/coaching/rediseno wizard) en `specs/004-explicabilidad-rutas/quickstart.md`.

---

## Final Phase Polish

- [ ] T054 Ejecutar `pnpm lint` y corregir issues del alcance en `/home/svens/dev/brujula-civil`.
- [ ] T055 Ejecutar `pnpm typecheck` y corregir issues del alcance en `/home/svens/dev/brujula-civil`.
- [ ] T056 Ejecutar `pnpm test:run` y corregir fallas del alcance en `/home/svens/dev/brujula-civil`.
- [ ] T057 Actualizar estrategia de rollout/cierre y checklist final de 004 en `specs/004-explicabilidad-rutas/tasks.md`.

---

## Dependencies and Execution Order

- Fase secuencial: Phase 1 -> Phase 2 -> Phase 3 (US1) -> Phase 4 (US2) -> Phase 5 (US3) -> Phase 6 (Hardening) -> Final Phase Polish.
- US2 depende de US1 porque requiere metadata explicable ya establecida en shortlist/contratos.
- US3 depende de US2 porque reingreso necesita `selectedRouteContext` persistido.
- Hardening depende de US1-US3 para validar edge cases sobre comportamiento integrado.

## Parallel Execution Examples

- **US1**: ejecutar en paralelo `T016`, `T017`, `T018`, `T019` (tests en archivos distintos).
- **US1**: ejecutar en paralelo `T025` y `T026` (component/handler sin archivo compartido).
- **US2**: ejecutar en paralelo `T028`, `T029`, `T030`, `T031` (tests por boundary independiente).
- **US2**: ejecutar en paralelo `T035`, `T036`, `T038` (servidores distintos: translation/cv/documents).
- **US3**: ejecutar en paralelo `T040`, `T041`, `T042` (tests de reingreso por capa).

## Independent Test Criteria by Story

- **US1**: shortlist de 3-5 rutas con explanation summary/fit/strengths en UI, y estados `loading/empty/error` seguros en `/traduccion`.
- **US2**: seleccion guiada persiste `selectedRouteContext`, y la cadena explanation->translation->preview->pdf mantiene ancla `selectedRouteId`.
- **US3**: reingreso recupera seleccion + contexto explicable; si snapshot falta o es invalido, se mantiene continuidad con fallback user-safe.

## MVP-First Strategy

1. **MVP inicial (US1)**: explicabilidad visible y comprensible por ruta en shortlist.
2. **MVP usable (US2)**: seleccion guiada y continuidad trazable hacia translation/preview/pdf.
3. **MVP robusto (US3)**: reingreso confiable con contexto explicable y degradacion segura.
4. **Cierre tecnico (Hardening + Polish)**: edge cases, no-scope guards y quality gates finales.

## Rollout and Closure Order

1. Liberar primero US1 (valor visible inmediato para comprension de recomendaciones).
2. Liberar US2 (decision guiada y continuidad del pipeline existente).
3. Liberar US3 (continuidad de sesion/reingreso sin perdida de contexto).
4. Ejecutar Hardening y luego Final Phase Polish para cierre operacional.

## Scope Guardrails (Must Keep)

- Sin expansion funcional de LinkedIn en `src/features/linkedin/**`.
- Sin job board, marketplace laboral ni matching externo en `src/app/**`.
- Sin scoring probabilistico/ML complejo fuera de reglas deterministicas en `src/features/recommendations/services/route-recommendation-rules.ts`.
- Sin coaching extendido ni rediseño transversal del wizard en `src/features/wizard/**`.
- Sin refactorizacion grande: solo extension incremental/reversible sobre paths impactados por 003/004.
