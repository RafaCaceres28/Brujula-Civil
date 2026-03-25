# Tasks: 005-guiar-onboarding-catalogos

**Input**: Design documents from `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by phase and user story priority so each story can be implemented and tested independently with MVP-first rollout.

## Format: `- [ ] T### [P?] [US#?] Descripcion con path exacto`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencia directa)
- **[US#]**: Etiqueta de historia (`US1`, `US2`, `US3`) solo en fases de historias
- Toda tarea incluye al menos un path exacto

## Phase 1 Setup

**Purpose**: Alinear alcance de 005, guardrails y contratos base antes de tocar implementacion.

- [x] T001 Consolidar guardrails de alcance (sin wizard nuevo, sin recommendation nueva, sin job board, sin LinkedIn expansion, sin matching externo) en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/spec.md`.
- [x] T002 Definir secuencia MVP-first y orden de rollout/cierre por historias en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/plan.md`.
- [x] T003 [P] Validar matriz estructurado vs narrativo y estrategia incremental reversible en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/data-model.md`.
- [x] T004 [P] Validar mapeo campo estructurado -> control catalogo (single/multi/checkbox/radio/compound) en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/contracts/onboarding-field-control-map.md`.
- [x] T005 [P] Validar frontera de guardado con rechazo de valores fuera de catalogo en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/contracts/onboarding-save-boundary-catalog-validation.md`.
- [x] T006 [P] Validar compatibilidad de reingreso para drafts legacy mixtos en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/contracts/onboarding-draft-reentry-compatibility.md`.

---

## Phase 2 Foundational (Blocking)

**Purpose**: Definir bases contract-first (types/schemas/mapper/components) que bloquean US1-US3.

- [x] T007 Extender tipos de onboarding guiado para distinguir campos estructurados y narrativos en `/home/svens/dev/brujula-civil/src/features/wizard/types/wizard.types.ts`.
- [x] T008 [P] Extender schema de onboarding con restricciones de catalogo para campos estructurados en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`.
- [x] T009 [P] Extender schema de estado para compatibilidad legacy + guided draft en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.ts`.
- [x] T010 Ajustar mapper base para parsear ids catalogados (single/multi/compound) sin romper narrativos en `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.ts`.
- [x] T011 [P] Crear componente reutilizable de single-select de catalogo para onboarding en `/home/svens/dev/brujula-civil/src/features/wizard/components/catalog-single-select.tsx`.
- [x] T012 [P] Crear componente reutilizable de multi-select de catalogo para onboarding en `/home/svens/dev/brujula-civil/src/features/wizard/components/catalog-multi-select.tsx`.
- [x] T013 [P] Crear componente reutilizable de checkbox/radio de catalogo para onboarding en `/home/svens/dev/brujula-civil/src/features/wizard/components/catalog-choice-group.tsx`.
- [x] T014 Agregar pruebas de tipos/schema para base guided + legacy en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.test.ts`.

**Checkpoint**: Foundation complete; US1-US3 pueden avanzar por prioridad.

---

## Phase 3 US1 - Completar onboarding estructurado con controles acotados (Priority: P1)

**Goal**: Sustituir textboxes/textarea estructurados por controles de catalogo en los 4 pasos y validar frontera de guardado.
**Independent Test**: Usuario autenticado completa militar/experiencia/competencias/objetivos solo con controles guiados en campos estructurados, el guardado acepta catalogos validos y rechaza texto libre manipulado en frontera.

### Tests for US1

- [x] T015 [P] [US1] Extender test de schema para rechazo de valores estructurados fuera de catalogo en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.test.ts`.
- [x] T016 [P] [US1] Extender test de mapper para parseo canonico de ids catalogados en `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.test.ts`.
- [x] T017 [P] [US1] Extender test de guardado para validacion de frontera y merge seguro en `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts`.
- [x] T018 [P] [US1] Agregar test UI de controles guiados para paso militar en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.test.tsx`.
- [x] T019 [P] [US1] Agregar test UI de controles guiados para paso experiencia en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.test.tsx`.
- [x] T020 [P] [US1] Agregar test UI de controles guiados para paso competencias en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.test.tsx`.
- [x] T021 [P] [US1] Agregar test UI de controles guiados para paso objetivos en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.test.tsx`.

### Implementation for US1

- [x] T022 [US1] Implementar mapeo explicito campo estructurado -> opciones/control usando catalogos en `/home/svens/dev/brujula-civil/src/features/wizard/config/wizard-catalogs.ts`.
- [x] T023 [US1] Reemplazar inputs de campos estructurados por controles catalogados en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.tsx`.
- [x] T024 [US1] Reemplazar textareas estructurados por multiselect catalogado en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.tsx`.
- [x] T025 [US1] Reemplazar textareas/inputs estructurados por controles catalogados (incluyendo languages compound) en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.tsx`.
- [x] T026 [US1] Reemplazar textareas/inputs estructurados por controles catalogados (incluyendo seniority/roles) en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.tsx`.
- [x] T027 [US1] Endurecer parse y normalizacion de payload guiado por catalogo en `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.ts`.
- [x] T028 [US1] Endurecer validacion final de payload guiado por catalogo en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`.
- [x] T029 [US1] Reforzar validacion de frontera en guardado de pasos onboarding en `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`.

---

## Phase 4 US2 - Mantener texto libre solo en campos narrativos (Priority: P1/P2)

**Goal**: Asegurar que textarea/input libre permanezca unicamente en campos narrativos/complementarios y no en estructurados.
**Independent Test**: Formulario mixto acepta texto libre solo en `notes`, `additionalContext`, `achievements`, `extraTraining`, `preferencesNotes`, `unitName`; cualquier texto libre en campos estructurados se rechaza.

### Tests for US2

- [x] T030 [P] [US2] Extender test UI de militar para confirmar textarea/input libre solo en `unitName` y `notes` en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.test.tsx`.
- [x] T031 [P] [US2] Extender test UI de experiencia para confirmar narrativos (`achievements`, `additionalContext`) y estructurados guiados en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.test.tsx`.
- [x] T032 [P] [US2] Extender test UI de competencias para confirmar `extraTraining` libre y resto guiado en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.test.tsx`.
- [x] T033 [P] [US2] Extender test UI de objetivos para confirmar `preferencesNotes` libre y resto guiado en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.test.tsx`.
- [x] T034 [P] [US2] Extender test de mapper para preservar narrativos sin reintroducir texto libre estructurado en `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.test.ts`.

### Implementation for US2

- [x] T035 [US2] Mantener textarea/input libre solo para narrativos permitidos del paso militar en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.tsx`.
- [x] T036 [US2] Mantener textarea libre solo para narrativos permitidos del paso experiencia en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.tsx`.
- [x] T037 [US2] Mantener textarea libre solo para narrativos permitidos del paso competencias en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.tsx`.
- [x] T038 [US2] Mantener textarea libre solo para narrativos permitidos del paso objetivos en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.tsx`.
- [x] T039 [US2] Ajustar schema para reglas explicitas de texto libre unicamente en campos narrativos en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`.
- [x] T040 [US2] Ajustar tipos de draft para separar explicitamente payload estructurado y narrativo en `/home/svens/dev/brujula-civil/src/features/wizard/types/wizard.types.ts`.

---

## Phase 5 US3 - Compatibilidad de reingreso y continuidad downstream (Priority: P2)

**Goal**: Recuperar drafts legacy sin perdida material y mantener continuidad con recommendations/explainability/translation sin refactor global.
**Independent Test**: Con draft legacy mixto, reingreso conserva progreso util, degrada valores invalidos de catalogo de forma segura y mantiene pipeline recommendation/explainability/translation operativo con shape compatible.

### Tests for US3

- [x] T041 [P] [US3] Extender test de reingreso para draft legacy + guided con fallback seguro en `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.test.ts`.
- [x] T042 [P] [US3] Extender test de guardado para merge defensivo con `employabilityFlow` intacto en `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts`.
- [x] T043 [P] [US3] Extender test de schema de estado para compatibilidad de formato legacy/guided en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.test.ts`.
- [x] T044 [P] [US3] Agregar test de consistencia downstream con inputs catalogados en `/home/svens/dev/brujula-civil/src/features/recommendations/services/build-recommendation-input.test.ts`.
- [x] T045 [P] [US3] Agregar test de integracion recommendation/explainability/translation con draft guiado reingresado en `/home/svens/dev/brujula-civil/src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.

### Implementation for US3

- [x] T046 [US3] Implementar recuperacion tolerante de drafts legacy con degradacion segura de campos estructurados invalidos en `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.ts`.
- [x] T047 [US3] Adaptar persistencia para merge incremental reversible del draft guiado sin perder `employabilityFlow` en `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`.
- [x] T048 [US3] Endurecer parser de estado para reingreso mixto legacy/guided en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.ts`.
- [x] T049 [US3] Ajustar normalizacion downstream para consumir ids catalogados sin refactor global en `/home/svens/dev/brujula-civil/src/features/recommendations/services/build-recommendation-input.ts`.
- [x] T050 [US3] Verificar continuidad de proyeccion de wizard hacia perfiles con shape compatible en `/home/svens/dev/brujula-civil/src/features/profile/server/project-wizard-to-profiles.ts`.

---

## Phase 6 Hardening

**Purpose**: Cubrir edge cases de seguridad/compatibilidad y blindar reingreso sin expandir alcance.

- [x] T051 [P] Agregar caso de valor legacy fuera de catalogo con fallback narrativo seguro en `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.test.ts`.
- [x] T052 [P] Agregar caso de payload manipulado con texto libre en campo estructurado y rechazo user-safe en `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts`.
- [x] T053 [P] Agregar caso de catalogo actualizado entre sesiones (opcion obsoleta) en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.test.ts`.
- [x] T054 [P] Agregar caso de UI para opciones obsoletas/invalidas con mensaje accionable en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.test.tsx`.
- [x] T055 Implementar manejo robusto de opciones legacy/obsoletas en reingreso de onboarding en `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.ts`.
- [x] T056 Implementar mensajes de error de frontera seguros y accionables en `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`.

---

## Final Phase Polish

- [ ] T057 Ejecutar `pnpm lint` y corregir issues del alcance 005 en `/home/svens/dev/brujula-civil`.
- [ ] T058 Ejecutar `pnpm typecheck` y corregir issues del alcance 005 en `/home/svens/dev/brujula-civil`.
- [ ] T059 Ejecutar `pnpm test:run` y corregir fallas del alcance 005 en `/home/svens/dev/brujula-civil`.
- [ ] T060 Actualizar checklist final de rollout/cierre y cumplimiento de no-alcance en `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/quickstart.md`.

---

## Dependencies and Execution Order

- Secuencia obligatoria: Phase 1 -> Phase 2 -> Phase 3 (US1) -> Phase 4 (US2) -> Phase 5 (US3) -> Phase 6 (Hardening) -> Final Phase Polish.
- US1 depende de foundations contract-first (`T007-T014`) para evitar drift de UI y frontera.
- US2 depende de US1 porque la distincion narrativo/estructurado se valida sobre controles ya migrados.
- US3 depende de US1-US2 porque reingreso y continuidad downstream requieren shape guiado estable.
- Hardening depende de US1-US3 para cubrir edge cases reales del flujo integrado.

## Parallel Execution Examples

- **US1**: ejecutar en paralelo `T018`, `T019`, `T020`, `T021` (tests UI en archivos de pagina distintos).
- **US1**: ejecutar en paralelo `T015`, `T016`, `T017` (tests schema/mapper/server en capas separadas).
- **US2**: ejecutar en paralelo `T030`, `T031`, `T032`, `T033` (tests UI por paso sin archivo compartido).
- **US3**: ejecutar en paralelo `T041`, `T042`, `T043`, `T044`, `T045` (tests de reingreso/downstream por boundary distinto).
- **Hardening**: ejecutar en paralelo `T051`, `T052`, `T053`, `T054` (edge cases en test files independientes).

## Independent Test Criteria by Story

- **US1**: los cuatro pasos (`militar`, `experiencia`, `competencias`, `objetivos`) usan controles guiados para campos estructurados y el servidor rechaza valores fuera de catalogo.
- **US2**: solo campos narrativos (`notes`, `additionalContext`, `achievements`, `extraTraining`, `preferencesNotes`, `unitName`) aceptan texto libre; estructurados siguen acotados.
- **US3**: draft legacy/guided reingresa sin perdida material, preserva `employabilityFlow`, y recommendation/explainability/translation opera con shape compatible.

## MVP-First Strategy

1. **MVP funcional (US1)**: migrar captura estructurada a catalogos + validacion de frontera para eliminar ambiguedad en origen.
2. **MVP usable (US2)**: proteger expresividad solo en narrativos sin reabrir texto libre estructurado.
3. **MVP robusto (US3)**: asegurar compatibilidad legacy/reingreso y continuidad downstream sin refactor global.
4. **Cierre operativo**: ejecutar Hardening y luego quality gates finales (`lint`, `typecheck`, `test:run`).

## Rollout and Closure Order

1. Liberar primero US1 (valor inmediato sobre consistencia de captura estructurada).
2. Liberar US2 (equilibrio entre estructura y narrativos permitidos).
3. Liberar US3 (continuidad de reingreso y pipeline downstream).
4. Ejecutar Phase 6 Hardening y Final Phase Polish antes de marcar cierre.

## Scope Focus (Must Keep)

- Sin rediseño completo del wizard en `/home/svens/dev/brujula-civil/src/features/wizard/**`.
- Sin refactor global de profile fuera de `/home/svens/dev/brujula-civil/src/features/profile/server/project-wizard-to-profiles.ts`.
- Sin recommendation nueva ni expansion funcional fuera de continuidad en `/home/svens/dev/brujula-civil/src/features/recommendations/**`.
- Sin job board, matching externo ni integraciones adicionales en `/home/svens/dev/brujula-civil/src/app/**`.
- Sin expansion de LinkedIn fuera de compatibilidad existente en `/home/svens/dev/brujula-civil/src/features/linkedin/**`.
