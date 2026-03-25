# Implementation Plan: Onboarding Guiado por Catalogos Reutilizables

**Branch**: `005-guiar-onboarding-catalogos` | **Date**: 2026-03-25 | **Spec**: `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/spec.md`
**Input**: Feature specification from `/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/spec.md`

## Summary

Estandarizar el onboarding actual para que los campos estructurados de `militar`, `experiencia`, `competencias` y `objetivos` usen catalogos existentes en lugar de texto libre, manteniendo texto libre solo en campos narrativos (`notes`, `additionalContext`, `extraTraining`, `preferencesNotes`) y preservando compatibilidad de reingreso en `user_wizard_state.aggregated_draft_jsonb`. La estrategia es incremental sobre pantallas actuales (`/onboarding/*`), contratos (`wizard.types.ts` + `wizard.schema.ts` + `wizard-form.mapper.ts`) y puntos de consumo downstream (`recommendations`, `translation`, `profile`), sin rediseño total ni refactor grande.

## Technical Context

**Language/Version**: TypeScript (^5, strict mode)
**Primary Dependencies**: Next.js (App Router), React, Supabase SSR/client, Zod
**Storage**: Supabase Postgres (`user_wizard_state`, `wizard_step_states`, perfiles proyectados)
**Testing**: Vitest (`node` y `jsdom`)
**Target Platform**: Web app (Server Components por defecto + formularios interactivos)
**Project Type**: Single Next.js application
**Performance Goals**:

- Mantener guardado de paso onboarding en <= 700 ms percibidos (mismo envelope actual).
- Mantener navegacion entre pasos sin latencia adicional material por controles de catalogo.
- Evitar degradacion en tiempos de `buildRecommendationInput` y traduccion al reducir normalizacion de texto libre.

**Constraints**:

- Reusar `src/features/wizard/config/wizard-catalogs.ts` como fuente de opciones.
- NO crear wizard nuevo ni rehacer routing `/onboarding/*`.
- NO introducir migracion destructiva de drafts previos; solo compatibilidad incremental.
- Verificacion obligatoria en implementacion: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.

**Scale/Scope**:

- Alcance sobre 4 pasos de captura + resumen de onboarding existente.
- Un flujo activo por usuario persistido en `aggregated_draft_jsonb`.
- Sin cambios de infraestructura ni tablas nuevas para MVP de esta iniciativa.

## Constitution Check (Pre-Design)

GATE: Must pass before implementation and again before merge.

| Gate                                | Result | Evidence / Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify-First Engineering            | PASS   | Evidencia en `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/{militar,experiencia,competencias,objetivos}/page.tsx`, `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.ts`, `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`, `/home/svens/dev/brujula-civil/src/features/wizard/config/wizard-catalogs.ts`, `/home/svens/dev/brujula-civil/src/features/wizard/server/{save-onboarding-step.ts,get-onboarding-overview.ts}`. |
| Contract-First Boundaries           | PASS   | Fase de diseno define primero tipado y validacion de campos guiados (`types/schemas/contracts`) antes de tocar acciones/server/UI.                                                                                                                                                                                                                                                                                                                                                             |
| Mandatory Quality Gates             | PASS   | Plan exige `pnpm lint`, `pnpm typecheck`, `pnpm test:run`; no build como gate por defecto.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Security by Default                 | PASS   | Validacion de frontera en parser + schema; rechazo de valores fuera de catalogo sin exponer internals; persistencia user-scoped intacta.                                                                                                                                                                                                                                                                                                                                                       |
| Reversible Incremental Delivery     | PASS   | Migracion por campo y por paso con fallback para valores legacy y rollback por modulo.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Domain Safety and Product Integrity | PASS   | Se preserva continuidad `wizard -> recommendations -> translation -> cv/pdf` y trazabilidad de datos estructurados.                                                                                                                                                                                                                                                                                                                                                                            |

## Gates

- Gate Status: PASS
- ERROR Conditions: ninguna; no hay clarificaciones bloqueantes ni violaciones de constitucion injustificadas.

## Proposed Architecture

1. **UI guiada por catalogos en onboarding actual**
   - Reemplazar `Input`/`Textarea` libres en campos estructurados por controles acotados (single-select/multi-select) dentro de:
     - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.tsx`
     - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.tsx`
     - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.tsx`
     - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.tsx`
   - Introducir componentes reutilizables de seleccion en `src/features/wizard/components/` para evitar duplicacion y no tocar diseno global.

2. **Mapeo controlado por campo (contract-first)**
   - `wizard-form.mapper.ts` deja de parsear listas libres por salto de linea para campos estructurados y pasa a parsear ids de catalogo conocidos.
   - `wizard.schema.ts` endurece campos estructurados hacia enums/unions de opciones permitidas.
   - Campos narrativos conservan string libre con limites: `notes`, `additionalContext`, `extraTraining`, `preferencesNotes`.

3. **Compatibilidad de persistencia y reingreso**
   - `save-onboarding-step.ts` mantiene merge defensivo actual de `aggregated_draft_jsonb` + `employabilityFlow`.
   - `get-onboarding-overview.ts` conserva parse tolerante de draft legacy.
   - Se agrega normalizacion de valores legacy fuera de catalogo a fallback seguro (null/[] + preservacion opcional en campo narrativo complementario segun paso).

4. **Continuidad downstream sin refactor grande**
   - `build-recommendation-input.ts` ya normaliza tokens sobre arrays; con ids catalogados reduce ambiguedad semantica.
   - `project-wizard-to-profiles.ts` sigue recibiendo el mismo draft shape funcional, cambiando solo calidad de origen.
   - `generate-translation.ts` y flujo CV/PDF no requieren rediseño, solo validaciones de compatibilidad en tests.

## Field Audit and Control Mapping (Evidence)

| Step         | Field                    | Current UI/Input            | Catalog Ready                                          | Target Control             | Notes                               |
| ------------ | ------------------------ | --------------------------- | ------------------------------------------------------ | -------------------------- | ----------------------------------- |
| militar      | `branch`                 | `Input` text libre          | YES (`BRANCH_OPTIONS`)                                 | single-select              | estructurado                        |
| militar      | `corps`                  | `Input` text libre          | YES (`CORPS_OPTIONS`)                                  | single-select              | estructurado                        |
| militar      | `rank.code`              | `Input` text libre          | YES (`RANK_OPTIONS`)                                   | single-select              | estructurado                        |
| militar      | `specialty.code`         | `Input` text libre          | YES (`SPECIALTY_OPTIONS`)                              | single-select              | estructurado                        |
| militar      | `destinationContext`     | `Input` text libre          | YES (`DESTINATION_CONTEXT_OPTIONS`)                    | single-select              | estructurado                        |
| militar      | `leadershipLevel`        | `Input` text libre          | YES (`LEADERSHIP_LEVEL_OPTIONS`)                       | single-select              | estructurado                        |
| militar      | `teamSize`               | `Input` text libre          | YES (`TEAM_SIZE_OPTIONS`)                              | single-select              | estructurado                        |
| militar      | `serviceYears`           | `Input` numeric             | N/A                                                    | number input               | estructurado numerico (se mantiene) |
| militar      | `unitName`               | `Input` text libre          | NO                                                     | text input                 | narrativo/complementario            |
| militar      | `notes`                  | `Input` text libre          | NO                                                     | textarea                   | narrativo/complementario            |
| experiencia  | `responsibilityAreas`    | `Textarea` line-split       | YES (`RESPONSIBILITY_AREA_OPTIONS`)                    | multi-select               | estructurado                        |
| experiencia  | `missionTypes`           | `Textarea` line-split       | YES (`MISSION_TYPE_OPTIONS`)                           | multi-select               | estructurado                        |
| experiencia  | `functionTypes`          | `Textarea` line-split       | YES (`FUNCTION_TYPE_OPTIONS`)                          | multi-select               | estructurado                        |
| experiencia  | `tools`                  | `Textarea` line-split       | YES (`TOOL_OPTIONS`)                                   | multi-select               | estructurado                        |
| experiencia  | `leadershipScopes`       | `Textarea` line-split       | YES (`LEADERSHIP_SCOPE_OPTIONS`)                       | multi-select               | estructurado                        |
| experiencia  | `achievements`           | `Textarea` line-split       | NO                                                     | textarea list              | narrativo/complementario            |
| experiencia  | `additionalContext`      | `Textarea` libre            | NO                                                     | textarea                   | narrativo/complementario            |
| competencias | `technicalSkills`        | `Textarea` line-split       | YES (`TECHNICAL_SKILL_OPTIONS`)                        | multi-select               | estructurado                        |
| competencias | `softSkills`             | `Textarea` line-split       | YES (`SOFT_SKILL_OPTIONS`)                             | multi-select               | estructurado                        |
| competencias | `certifications`         | `Textarea` line-split       | YES (`CERTIFICATION_OPTIONS`)                          | multi-select               | estructurado                        |
| competencias | `drivingLicenses`        | parser soporta lista        | YES (`DRIVING_LICENSE_OPTIONS`)                        | multi-select               | estructurado (UI pendiente)         |
| competencias | `officeTools`            | parser soporta lista        | YES (`OFFICE_TOOL_OPTIONS`)                            | multi-select               | estructurado (UI pendiente)         |
| competencias | `languages[].name/level` | `Textarea` con `name:level` | PARTIAL (`LANGUAGE_OPTIONS`, `LANGUAGE_LEVEL_OPTIONS`) | repeater de doble select   | mixto estructurado                  |
| competencias | `extraTraining`          | parser soporta texto        | NO                                                     | textarea                   | narrativo/complementario            |
| objetivos    | `targetRoles`            | `Textarea` line-split       | PARTIAL (`TARGET_ROLE_OPTIONS`)                        | multi-select con slug fijo | estructurado                        |
| objetivos    | `targetSectors`          | `Textarea` line-split       | YES (`TARGET_SECTOR_OPTIONS`)                          | multi-select               | estructurado                        |
| objetivos    | `preferredLocations`     | `Textarea` line-split       | YES (`LOCATION_OPTIONS`)                               | multi-select               | estructurado                        |
| objetivos    | `workModel`              | `select` enum               | YES (`WORK_MODEL_OPTIONS`)                             | single-select              | ya guiado                           |
| objetivos    | `seniority`              | parser enum (sin UI actual) | YES (`SENIORITY_OPTIONS`)                              | single-select              | estructurado (UI pendiente)         |
| objetivos    | `preferencesNotes`       | parser soporta texto        | NO                                                     | textarea                   | narrativo/complementario            |

## Project Structure

### Documentation (this feature)

```text
/home/svens/dev/brujula-civil/specs/005-guiar-onboarding-catalogos/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- onboarding-field-control-map.md
|   |-- onboarding-save-boundary-catalog-validation.md
|   `-- onboarding-draft-reentry-compatibility.md
`-- tasks.md
```

### Source Code (repository root)

```text
/home/svens/dev/brujula-civil/src/
|-- app/
|   `-- (app)/onboarding/
|       |-- militar/page.tsx
|       |-- experiencia/page.tsx
|       |-- competencias/page.tsx
|       |-- objetivos/page.tsx
|       `-- resumen/page.tsx
|-- features/
|   |-- wizard/
|   |   |-- actions/save-*-step-action.ts
|   |   |-- components/
|   |   |-- config/wizard-catalogs.ts
|   |   |-- schemas/{wizard.schema.ts,wizard-state.schema.ts}
|   |   |-- server/{save-onboarding-step.ts,get-onboarding-overview.ts}
|   |   |-- services/wizard-form.mapper.ts
|   |   `-- types/{wizard.types.ts,wizard-state.types.ts}
|   |-- recommendations/
|   |   |-- services/build-recommendation-input.ts
|   |   `-- schemas/recommendation.schema.ts
|   `-- profile/server/project-wizard-to-profiles.ts
`-- lib/contracts/
```

**Structure Decision**: extender `wizard` feature actual con componentes reutilizables de seleccion y endurecimiento de contracts/schemas, manteniendo `recommendations` y `profile` como consumidores sin rediseño transversal.

## Testing Strategy

1. **UI onboarding (`jsdom`)**
   - Agregar cobertura para render y envio de controles guiados en nuevos tests de `/onboarding/*` o componentes de seleccion en `src/features/wizard/components/*.test.tsx`.
   - Validar que campos estructurados NO aceptan texto arbitrario.

2. **Schemas y mapper (`node`)**
   - Extender `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.test.ts` para rechazar valores fuera de catalogo.
   - Extender `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.test.ts` para parseo canonico de ids de catalogo y campos narrativos.

3. **Server/persistencia (`node`)**
   - Extender `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts` para merge de draft con datos guiados + compatibilidad legacy.
   - Extender `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.test.ts` para reingreso con combinacion de formato viejo/nuevo.

4. **Downstream continuity (`node`)**
   - Agregar/ajustar pruebas de `/home/svens/dev/brujula-civil/src/features/recommendations/services/build-recommendation-input.ts` (o nuevo test) para asegurar normalizacion estable con ids catalogados.
   - Mantener cobertura contractual existente en translation/cv/pdf sin cambios de arquitectura.

## Incremental Migration Strategy

1. Campo a campo: introducir control guiado sin romper shape de payload persistido.
2. Endurecer schema para ids de catalogo con fallback temporal de parse legacy.
3. Migrar UI de cada paso (militar -> experiencia -> competencias -> objetivos).
4. Habilitar componentes reutilizables para evitar divergencia entre pasos.
5. Endurecer validacion de frontera en actions/mapper cuando la UI ya produzca ids catalogados.
6. Retirar fallback legacy de campos estructurados cuando pruebas de reingreso confirmen continuidad.

## Constitution Check (Post-Design Re-evaluation)

| Gate                                | Result | Evidence / Action                                                                                      |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| Verify-First Engineering            | PASS   | Decisiones sustentadas por evidencia en `research.md` y paths reales del repo.                         |
| Contract-First Boundaries           | PASS   | `data-model.md` + `contracts/*` definen tipos/schemas/validacion antes de implementacion.              |
| Mandatory Quality Gates             | PASS   | `quickstart.md` fija orden obligatorio de verificacion y pruebas por capa.                             |
| Security by Default                 | PASS   | Contratos de frontera exigen rechazo de valores fuera de catalogo y mensajes user-safe.                |
| Reversible Incremental Delivery     | PASS   | Plan define migracion incremental compatible y reversible por fase/campo.                              |
| Domain Safety and Product Integrity | PASS   | Se preserva pipeline existente y trazabilidad de datos estructurados hacia recomendaciones/traduccion. |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
