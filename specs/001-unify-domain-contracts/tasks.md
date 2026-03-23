# Tasks: Iniciativa de Contratos de Dominio Unificados

**Input**: Design documents from `/home/svens/dev/brujula-civil/specs/001-unify-domain-contracts/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Every task includes an exact file path.

## Phase 1: Setup

**Purpose**: Preparar estructura minima y convenciones para ejecutar el refactor sin drift.

- [x] T001 Crear modulo base de contratos compartidos en `src/lib/contracts/index.ts`.
- [x] T002 [P] Crear convenciones de uso de contratos en `src/lib/contracts/README.md`.
- [x] T003 [P] Crear utilidades base de parse seguro en `src/lib/contracts/zod-helpers.ts`.
- [x] T004 Crear carpeta de pruebas de contrato shared en `src/lib/contracts/__tests__/shared-contract.test.ts`.

---

## Phase 2: Foundational (Blocking)

**Purpose**: Definir nucleo de contratos (shared + taxonomia de errores + validacion Zod) antes de adopcion por dominio.

- [x] T005 Implementar `DomainResult` discriminado en `src/lib/contracts/domain-result.ts`.
- [x] T006 [P] Implementar taxonomia `DomainErrorCode` en `src/lib/contracts/domain-error-codes.ts`.
- [x] T007 [P] Implementar `DomainError` seguro y helpers en `src/lib/contracts/domain-error.ts`.
- [x] T008 [P] Implementar `DomainMeta` y metadata comun en `src/lib/contracts/domain-meta.ts`.
- [x] T009 Integrar exports del kernel compartido en `src/lib/contracts/index.ts`.
- [x] T010 [P] Definir schemas Zod shared (id, locale, metadata) en `src/lib/contracts/shared.schema.ts`.
- [x] T011 [P] Agregar tests de taxonomia de errores en `src/lib/contracts/__tests__/domain-error.test.ts`.
- [x] T012 [P] Agregar tests de validacion Zod shared en `src/lib/contracts/__tests__/shared.schema.test.ts`.

**Checkpoint**: Foundation complete, user stories can proceed.

---

## Phase 3: User Story 1 - Definir base comun y contratos minimos por dominio (Priority: P1)

**Goal**: Publicar contratos compartidos y contratos minimos para Translation, CV, LinkedIn y Documents con convencion uniforme.
**Independent Test**: Correr tests de tipos/schemas por dominio y verificar que cada dominio expone `input`, `output`, `DomainResult` y `DomainError`.

- [x] T055 [US1] Definir validaciones Zod de Documents en `src/features/documents/schemas/document.schema.ts`.

### Tests for User Story 1

- [x] T013 [P] [US1] Crear test de contrato Translation en `src/features/translation/types/translation.types.test.ts`.
- [x] T014 [P] [US1] Crear test de schema Translation con Zod en `src/features/translation/schemas/translation.schema.test.ts`.
- [x] T015 [P] [US1] Crear test de contrato CV en `src/features/cv/types/cv.types.test.ts`.
- [x] T016 [P] [US1] Crear test de contrato LinkedIn en `src/features/linkedin/types/linkedin.types.test.ts`.
- [x] T017 [P] [US1] Crear test de contrato Documents en `src/features/documents/types/document.types.test.ts`.
- [x] T056 [P] [US1] Crear test de schema CV con Zod en `src/features/cv/schemas/cv.schema.test.ts`.
- [x] T057 [P] [US1] Crear test de schema LinkedIn con Zod en `src/features/linkedin/schemas/linkedin.schema.test.ts`.
- [x] T058 [P] [US1] Crear test de schema Documents con Zod en `src/features/documents/schemas/document.schema.test.ts`.

### Implementation for User Story 1

- [x] T018 [P] [US1] Definir contratos de Translation (`input/output/result`) en `src/features/translation/types/translation.types.ts`.
- [x] T019 [P] [US1] Definir validaciones Zod de Translation en `src/features/translation/schemas/translation.schema.ts`.
- [x] T020 [P] [US1] Definir contratos de CV (`input/output/result`) en `src/features/cv/types/cv.types.ts`.
- [x] T021 [P] [US1] Definir validaciones Zod de CV en `src/features/cv/schemas/cv.schema.ts`.
- [x] T022 [P] [US1] Definir contratos de LinkedIn (`input/output/result`) en `src/features/linkedin/types/linkedin.types.ts`.
- [x] T023 [P] [US1] Definir validaciones Zod de LinkedIn en `src/features/linkedin/schemas/linkedin.schema.ts`.
- [x] T024 [P] [US1] Definir contratos de Documents (`input/output/result`) en `src/features/documents/types/document.types.ts`.
- [x] T025 [US1] Integrar tipado shared de errores/resultados en los cuatro dominios desde `src/lib/contracts/index.ts`.

---

## Phase 4: User Story 2 - Alinear consumo en Route Handlers y Server Actions (Priority: P2)

**Goal**: Alinear frontend/backend para consumir contratos uniformes en fronteras (`route handlers`, `server actions`, `server/services`).
**Independent Test**: Validar por dominio que handlers y actions parsean con Zod y retornan `DomainResult` con errores taxonomicos.

### Tests for User Story 2

- [x] T026 [P] [US2] Agregar test de handler Translation alineado a contratos en `src/app/api/translation/route.test.ts`.
- [x] T027 [P] [US2] Agregar test de handler LinkedIn alineado a contratos en `src/app/api/linkedin/generate/route.test.ts`.
- [x] T028 [P] [US2] Agregar test de handler CV generate alineado a contratos en `src/app/api/cv/generate/route.test.ts`.
- [x] T029 [P] [US2] Agregar test de handler CV PDF alineado a contratos en `src/app/api/cv/pdf/route.test.ts`.
- [x] T030 [P] [US2] Ajustar test de server action profile submit para `DomainResult` en `src/features/profile/actions/submit-profile-action.test.ts`.
- [x] T031 [P] [US2] Ajustar test de server action profile save para `DomainResult` en `src/features/profile/actions/save-profile-action.test.ts`.
- [x] T063 [P] [US2] Agregar test de validacion de frontera UI para preview editable en `src/app/(app)/cv/preview/page.test.tsx`.

### Implementation for User Story 2

- [x] T032 [P] [US2] Adoptar parse Zod + `DomainResult` en route handler `src/app/api/translation/route.ts`.
- [x] T033 [P] [US2] Adoptar parse Zod + `DomainResult` en route handler `src/app/api/linkedin/generate/route.ts`.
- [x] T034 [P] [US2] Adoptar parse Zod + `DomainResult` en route handler `src/app/api/cv/generate/route.ts`.
- [x] T035 [P] [US2] Adoptar parse Zod + `DomainResult` en route handler `src/app/api/cv/pdf/route.ts`.
- [x] T036 [P] [US2] Adaptar server action submit a contrato unificado en `src/features/profile/actions/submit-profile-action.ts`.
- [x] T037 [P] [US2] Adaptar server action save a contrato unificado en `src/features/profile/actions/save-profile-action.ts`.
- [x] T038 [P] [US2] Alinear servicio Translation al contrato unificado en `src/features/translation/server/generate-translation.ts`.
- [x] T039 [P] [US2] Alinear servicio CV al contrato unificado en `src/features/cv/server/generate-cv.ts`.
- [x] T040 [P] [US2] Alinear servicio LinkedIn al contrato unificado en `src/features/linkedin/server/generate-linkedin-profile.ts`.
- [x] T041 [P] [US2] Alinear interfaz del servicio Documents/PDF al contrato unificado (input/output/result/error) en `src/features/documents/server/generate-pdf.ts`.
- [x] T042 [US2] Centralizar mapeo de errores hacia respuestas HTTP en `src/lib/contracts/http-error-mapper.ts`.
- [x] T059 [US2] Implementar estado/flujo de edicion previa en preview CV en `src/app/(app)/cv/preview/page.tsx`.
- [x] T060 [P] [US2] Ajustar contrato de salida de preview para soportar contenido editable en `src/features/cv/types/cv.types.ts`.
- [x] T064 [P] [US2] Integrar validacion de frontera UI (normalizacion/parse previo al envio) para preview editable en `src/features/cv/services/cv.mapper.ts`.

---

## Phase 5: User Story 3 - Pruebas de contrato e integracion del vertical slice (Priority: P3)

**Goal**: Garantizar evolucion segura con pruebas de contrato independientes e integracion perfil -> translation -> cv -> pdf.
**Independent Test**: Ejecutar suite node de contratos y una prueba de integracion del slice sin dependencias externas reales.

### Tests for User Story 3

- [x] T043 [P] [US3] Crear test de contrato cross-domain del slice en `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts`.
- [x] T044 [P] [US3] Crear fixtures tipados compartidos para contratos en `src/features/translation/server/__fixtures__/contract-fixtures.ts`.
- [x] T045 [P] [US3] Agregar prueba de errores tipados transversales en `src/lib/contracts/__tests__/cross-domain-errors.test.ts`.
- [x] T046 [P] [US3] Agregar prueba de compatibilidad Zod input/output entre pasos en `src/features/cv/server/cv-contract-compatibility.test.ts`.
- [x] T061 [P] [US3] Crear test de contrato de editabilidad previa a PDF en `src/features/cv/server/cv-editability.contract.test.ts`.

### Implementation for User Story 3

- [x] T047 [P] [US3] Implementar adaptador ProfileSnapshot para translation en `src/features/profile/services/profile.mapper.ts`.
- [x] T048 [P] [US3] Implementar adaptador TranslationOutput para CV en `src/features/cv/services/cv.mapper.ts`.
- [x] T049 [P] [US3] Implementar adaptador de transformacion `CvPreviewModel -> PdfGenerationInput` y su orquestacion en `src/features/documents/server/generate-pdf.ts`.
- [x] T050 [US3] Documentar trazabilidad del slice en `specs/001-unify-domain-contracts/contracts/profile-translation-cv-pdf-slice.md`.
- [x] T062 [US3] Documentar matriz de alineacion contractual en `specs/001-unify-domain-contracts/contracts/alignment-matrix.md`.

---

## Final Phase: Final Polish

- [x] T051 Ejecutar `pnpm lint` y resolver issues del alcance en `/home/svens/dev/brujula-civil`.
- [x] T052 Ejecutar `pnpm typecheck` y resolver issues del alcance en `/home/svens/dev/brujula-civil`.
- [x] T053 Ejecutar `pnpm test:run` y resolver fallos del alcance en `/home/svens/dev/brujula-civil`.
- [x] T054 Actualizar documentacion tecnica de adopcion de contratos en `specs/001-unify-domain-contracts/quickstart.md`.
- [x] T065 Verificar impacto neutro de performance (baseline vs post-adopcion contractual) y registrar resultados en `specs/001-unify-domain-contracts/contracts/performance-neutrality-check.md`.

---

## Dependencies and Execution Order

- Phase 1 -> Phase 2 -> US1 -> US2 -> US3 -> Final Phase.
- US1 depende del kernel shared (T005-T012).
- US2 depende de contratos minimos de US1 (T018-T025).
- US3 depende de adopcion completa en fronteras de US2 (T032-T042, T059-T060, T063-T064).
- Final Phase depende de completar todas las historias y sus pruebas.

## Parallel Execution Examples

- **US1**: ejecutar en paralelo T018, T020, T022, T024 (tipos por dominio independientes).
- **US1**: ejecutar en paralelo T019, T021, T023 (schemas Zod por dominio independientes).
- **US2**: ejecutar en paralelo T032-T035 (route handlers separados por endpoint).
- **US2**: ejecutar en paralelo T036-T041 (actions/services separados por dominio).
- **US3**: ejecutar en paralelo T043-T046 (tests de contrato por foco diferente).

## Independent Test Criteria by Story

- **US1**: cada dominio compila y pasa su test de contrato/types/schemas sin depender de rutas o actions.
- **US2**: cada handler/action retorna `DomainResult` y mapea errores taxonomicos con pruebas aisladas por frontera.
- **US3**: el test del slice valida compatibilidad input/output entre pasos y cobertura de errores transversales.

## Implementation Strategy (MVP First)

1. MVP: completar kernel shared + Translation (T005-T012, T013-T014, T018-T019, T032, T038).
2. Expandir MVP a CV y Documents para cerrar flujo preview -> PDF (T020-T021, T024, T034-T035, T039, T041).
3. Incorporar LinkedIn y hardening cross-domain (T016, T022-T023, T027, T033, T040, T045).
4. Cerrar con pruebas del vertical slice, docs tecnicas, quality gates y verificacion de performance neutra (T043-T065).
