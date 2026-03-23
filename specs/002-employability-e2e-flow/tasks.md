# Tasks: 002-employability-e2e-flow

**Input**: Design documents from `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by phase and by user story priority so each story can be implemented and tested independently.

## Format: `- [ ] T### [P?] [US?] Description with exact path`

- **[P]**: Can run in parallel (different files, no direct dependency)
- **[USx]**: User story label (`US1`, `US2`, `US3`)
- Every task includes at least one exact file path.

## Phase 1: Setup

**Purpose**: Prepare contracts, boundaries, and technical baseline without implementing product behavior.

- [x] T001 Consolidar alcance y criterios de independencia de historias en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/spec.md`.
- [x] T002 Mapear dependencias y secuencia incremental MVP-first en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/plan.md`.
- [x] T003 [P] Verificar que el modelo de persistencia mínima y trazabilidad esté alineado en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/data-model.md`.
- [x] T004 [P] Validar contratos de frontera perfil->traducción en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/contracts/profile-to-translation.md`.
- [x] T005 [P] Validar contratos de frontera traducción->preview en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/contracts/translation-to-cv-preview.md`.
- [x] T006 [P] Validar contratos de frontera preview->PDF en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/contracts/cv-preview-to-pdf.md`.

---

## Phase 2: Foundational (Blocking)

**Purpose**: Define blocking cross-cutting foundations reused by all stories.

- [x] T007 Definir shape final de `EmployabilityFlowDraft` y estados de flujo en `src/features/wizard/types/wizard-state.types.ts`.
- [x] T008 [P] Definir esquema Zod de persistencia mínima y trazabilidad en `src/features/wizard/schemas/wizard-state.schema.ts`.
- [x] T009 [P] Definir mapeo profile->translation reutilizando contratos existentes en `src/features/profile/services/profile.mapper.ts`.
- [x] T010 [P] Extender mapeo translation->cv preview reutilizando contratos existentes en `src/features/cv/services/cv.mapper.ts`.
- [x] T011 [P] Extender mapeo cv preview->pdf reutilizando contratos existentes en `src/features/documents/server/generate-pdf.ts`.
- [x] T012 Diseñar orquestación server para trazabilidad completa en `src/features/cv/server/export-cv-pdf.ts`.
- [x] T013 [P] Diseñar boundary de acciones para flujo E2E en `src/features/cv/actions/cv-flow.actions.ts`.
- [x] T014 [P] Diseñar contrato de respuesta homogénea (`DomainResult`) para handlers en `src/app/api/translation/route.ts`.
- [x] T015 [P] Diseñar contrato de respuesta homogénea (`DomainResult`) para handlers en `src/app/api/cv/generate/route.ts`.
- [x] T016 [P] Diseñar contrato de respuesta homogénea (`DomainResult`) para handlers en `src/app/api/cv/pdf/route.ts`.

**Checkpoint**: Foundation complete; user stories can proceed in priority order.

---

## Phase 3: User Story 1 - Completar flujo principal hasta PDF (Priority: P1)

**Goal**: Entregar el slice funcional perfil->traducción->preview->edición mínima->exportación PDF con trazabilidad verificable.
**Independent Test**: Usuario con perfil completo recorre todo el flujo y obtiene PDF consistente con el preview confirmado.

### Tests for User Story 1

- [x] T017 [P] [US1] Crear test de contrato perfil->traducción en `src/features/translation/server/profile-to-translation.contract.test.ts`.
- [x] T018 [P] [US1] Crear test de contrato traducción->preview en `src/features/cv/server/translation-to-cv-preview.contract.test.ts`.
- [x] T019 [P] [US1] Crear test de contrato preview->PDF en `src/features/documents/server/cv-preview-to-pdf.contract.test.ts`.
- [x] T020 [P] [US1] Extender test existente de handler de traducción en `src/app/api/translation/route.test.ts`.
- [x] T021 [P] [US1] Extender test existente de handler de generación de preview CV en `src/app/api/cv/generate/route.test.ts`.
- [x] T022 [P] [US1] Extender test existente de handler de exportación PDF en `src/app/api/cv/pdf/route.test.ts`.
- [x] T023 [P] [US1] Extender test existente de UI de flujo principal en `src/app/(app)/cv/preview/page.test.tsx`.
- [x] T024 [US1] Extender test contractual end-to-end del slice en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.

### Implementation for User Story 1

- [x] T025 [P] [US1] Implementar carga de perfil fuente para flujo de traducción en `src/app/(app)/traduccion/page.tsx`.
- [x] T026 [P] [US1] Implementar servicio de generación de traducción profesional en `src/features/translation/server/generate-translation.ts`.
- [x] T027 [P] [US1] Implementar composición de preview de CV desde traducción en `src/features/cv/server/generate-cv.ts`.
- [x] T028 [P] [US1] Implementar action orchestration perfil->traducción->preview en `src/features/cv/actions/cv-flow.actions.ts`.
- [x] T029 [US1] Integrar handler de traducción con contrato y trazabilidad en `src/app/api/translation/route.ts`.
- [x] T030 [US1] Integrar handler de preview CV con contrato y trazabilidad en `src/app/api/cv/generate/route.ts`.
- [x] T031 [US1] Integrar handler de exportación PDF con contrato y trazabilidad en `src/app/api/cv/pdf/route.ts`.
- [x] T032 [US1] Integrar UI del preview como checkpoint obligatorio previo a PDF en `src/app/(app)/cv/preview/page.tsx`.
- [x] T033 [US1] Integrar exportación PDF consistente con snapshot confirmado en `src/features/cv/server/export-cv-pdf.ts`.

---

## Phase 4: User Story 2 - Editar contenido antes de exportar (Priority: P2)

**Goal**: Garantizar edición manual obligatoria, persistencia de borrador y reanudación de trabajo sin pérdida material.
**Independent Test**: Ediciones de usuario impactan preview y PDF, persisten tras recarga y bloquean exportación si no hay edición confirmada.

### Tests for User Story 2

- [x] T034 [P] [US2] Crear test de UI de editor de secciones en `src/features/cv/components/cv-section-editor.test.tsx`.
- [x] T035 [P] [US2] Crear test de persistencia/reanudación de borrador en `src/features/cv/server/save-cv.test.ts`.
- [x] T036 [P] [US2] Crear test de bloqueo de exportación sin edición confirmada en `src/features/cv/server/export-cv-pdf.test.ts`.
- [x] T037 [US2] Ajustar test E2E contractual existente con escenario de edición y reingreso en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.

### Implementation for User Story 2

- [x] T038 [P] [US2] Implementar edición manual previa a exportación en `src/features/cv/components/cv-section-editor.tsx`.
- [x] T039 [P] [US2] Implementar persistencia mínima del trabajo en curso en `src/features/cv/server/save-cv.ts`.
- [x] T040 [P] [US2] Implementar recuperación de draft y versión activa en `src/features/cv/server/get-cv.ts`.
- [x] T041 [P] [US2] Implementar guardado incremental de trazabilidad en `src/features/wizard/server/save-onboarding-step.ts`.
- [x] T042 [US2] Integrar rehidratación de draft en pantalla de preview en `src/app/(app)/cv/preview/page.tsx`.
- [x] T043 [US2] Integrar validación de edición obligatoria antes de exportar en `src/features/cv/server/export-cv-pdf.ts`.

---

## Phase 5: User Story 3 - Comprender estados y errores del flujo (Priority: P3)

**Goal**: Entregar estados UI loading/empty/error claros, con mensajes seguros y acciones de recuperación sin pérdida del draft.
**Independent Test**: Simulación de faltantes, latencia y fallos controlados muestra mensajes comprensibles y permite retry seguro.

### Tests for User Story 3

- [x] T044 [P] [US3] Crear test de estado loading/empty/error en traducción en `src/app/(app)/traduccion/page.test.tsx`.
- [x] T045 [P] [US3] Crear test de estado loading/empty/error en preview CV en `src/app/(app)/cv/preview/page.test.tsx`.
- [x] T046 [P] [US3] Crear test de normalización de errores en handlers en `src/app/api/cv/pdf/route.test.ts`.
- [x] T047 [US3] Ajustar test E2E contractual existente con escenarios de error y retry en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.

### Implementation for User Story 3

- [x] T048 [P] [US3] Implementar estados loading/empty/error en traducción en `src/app/(app)/traduccion/page.tsx`.
- [x] T049 [P] [US3] Implementar estados loading/empty/error en preview y exportación en `src/app/(app)/cv/preview/page.tsx`.
- [x] T050 [P] [US3] Implementar mapeo de mensajes user-safe y retry en `src/features/translation/components/translation-preview.tsx`.
- [x] T051 [P] [US3] Implementar normalización de errores `DomainError` en handler de PDF en `src/app/api/cv/pdf/route.ts`.
- [x] T052 [US3] Implementar trazabilidad visible perfil->traducción->preview->PDF en `src/features/cv/components/cv-preview.tsx`.

---

## Final Phase: Final Polish

- [x] T053 Ejecutar `pnpm lint` y corregir issues del slice en `/home/svens/dev/brujula-civil`.
- [x] T054 Ejecutar `pnpm typecheck` y corregir issues del slice en `/home/svens/dev/brujula-civil`.
- [x] T055 Ejecutar `pnpm test:run` y corregir fallas del slice en `/home/svens/dev/brujula-civil`.
- [x] T059 Verificar impacto neutro de performance (baseline vs post) y registrar evidencia en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/contracts/performance-neutrality-check.md`.
- [x] T056 [P] Actualizar guía técnica del flujo en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/plan.md`.
- [x] T057 [P] Actualizar quickstart operativo del flujo en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/quickstart.md`.
- [x] T058 Documentar estrategia incremental MVP-first y orden de rollout en `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/tasks.md`.

---

## Dependencies and Execution Order

- Setup (T001-T006) -> Foundational (T007-T016) -> US1 (T017-T033) -> US2 (T034-T043) -> US3 (T044-T052) -> Final Polish (T053-T059).
- US2 depende de US1 por reuso de preview/export base y trazabilidad inicial.
- US3 depende de US1 para estados base y de US2 para no perder draft en retry.
- Dentro de cada historia: primero tests, luego implementación, luego integración de handlers/UI.
- No cerrar ninguna historia sin pasar su prueba independiente.

## Parallel Execution Examples

- Contratos de base en paralelo: `T008`, `T009`, `T010`, `T011`.
- Tests de contratos/handlers US1 en paralelo: `T017`, `T018`, `T019`, `T020`, `T021`, `T022`.
- Implementaciones de servicios US1 en paralelo: `T025`, `T026`, `T027`, `T028`.
- Persistencia y editor US2 en paralelo: `T038`, `T039`, `T040`, `T041`.
- Estados UI y normalización de errores US3 en paralelo: `T048`, `T049`, `T050`, `T051`.

## MVP-First Incremental Strategy

1. **MVP Slice (US1)**: entregar flujo mínimo usable con perfil->traducción->preview->exportación PDF y trazabilidad mínima validada.
2. **Hard Requirement (US2)**: agregar edición obligatoria y persistencia/reanudación para evitar pérdida de trabajo.
3. **Robustness (US3)**: completar estados UX y manejo seguro de errores con retry.
4. **Polish**: ejecutar gates de calidad y cerrar documentación técnica/quickstart.

## Rollout and Closure Strategy (Final)

1. **Rollout Order (MVP-first)**: liberar primero US1 (flujo funcional), luego US2 (edición+persistencia obligatoria), y finalmente US3 (resiliencia UX/error handling).
2. **Release Gate**: NO promover cierre sin `pnpm lint`, `pnpm typecheck` y `pnpm test:run` en verde sobre la rama `002-employability-e2e-flow`.
3. **Performance Neutrality Gate**: validar NFR-001 contra baseline de iniciativa y documentar evidencia en `contracts/performance-neutrality-check.md`.
4. **Formal Close-out**: actualizar `plan.md` y `quickstart.md`, marcar T053-T059 en `[x]`, y dejar la iniciativa lista para commit final de cierre.
