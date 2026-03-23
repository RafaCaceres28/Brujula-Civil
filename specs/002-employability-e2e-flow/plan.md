# Implementation Plan: Flujo E2E de Empleabilidad a CV Exportable

**Branch**: `002-employability-e2e-flow` | **Date**: 2026-03-23 | **Spec**: `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/spec.md`
**Input**: Feature specification from `/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/spec.md`

## Summary

Entregar un vertical slice usable en App Router que conecte perfil -> traducción -> preview editable de CV -> exportación PDF, reutilizando contratos unificados existentes (`src/lib/contracts/*`, Translation/CV/LinkedIn/Documents) y extendiendo de forma incremental handlers, servicios y UI ya presentes sin reescrituras completas.

## Technical Context

**Language/Version**: TypeScript (^5, strict mode)
**Primary Dependencies**: Next.js (App Router), React, Supabase SSR/client, Zod
**Storage**: Supabase Postgres (persistencia mínima en `user_wizard_state.aggregated_draft_jsonb` + metadatos trazables)
**Testing**: Vitest (`node` y `jsdom`) + pruebas contractuales E2E del flujo
**Target Platform**: Web app (Server Components por defecto + Client Components solo para edición)
**Project Type**: Single Next.js application (feature-first)
**Performance Goals**:

- P95 de carga de cada paso del flujo <= 2.0 s con datos existentes.
- Guardado de edición (draft) con feedback UI <= 700 ms percibidos.
- Inicio de exportación PDF con confirmación de estado en <= 1.0 s.
  **Constraints**:
- Next.js App Router.
- TypeScript estricto.
- Supabase SSR para acceso autenticado en server.
- Reutilización obligatoria del kernel contractual shared y contratos unificados Translation/CV/LinkedIn/Documents.
- Edición previa obligatoria antes de exportar.
- Consistencia semántica preview/PDF y trazabilidad perfil->traducción->preview->PDF.
- Estados loading/empty/error claros.
- Cambios incrementales; no reescrituras completas si hay extensión viable.
- Verificación obligatoria: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.
  **Scale/Scope**:
- 1 CV activo por usuario en este slice.
- Persistencia de último borrador editable + referencias de versiones por usuario.
- Cobertura inicial: flujo principal y degradaciones controladas (empty/error/retry).

## Constitution Check (Pre-Design)

GATE: Must pass before implementation and again before merge.

| Gate                                | Result | Evidence / Action                                                                                                                  |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Verify-First Engineering            | PASS   | Evidencia directa en `spec.md`, contratos/schemas actuales de Translation/CV/Documents/Profile y handlers API existentes del repo. |
| Contract-First Boundaries           | PASS   | Plan define contratos/schemas en Phase 1 antes de implementación (`contracts/*`, `data-model.md`) y separación UI/server/services. |
| Mandatory Quality Gates             | PASS   | Estrategia explícita incluye `pnpm lint`, `pnpm typecheck`, `pnpm test:run` y pruebas por capa + E2E contractual.                  |
| Security by Default                 | PASS   | Errores seguros para usuario, observabilidad interna, Supabase SSR y aislamiento por `userId`; sin secretos en cliente.            |
| Reversible Incremental Delivery     | PASS   | Secuencia en cortes pequeños (perfil/traducción/preview/export) con extensión incremental de módulos existentes.                   |
| Domain Safety and Product Integrity | PASS   | Se mantiene `DomainResult`/`DomainError` y trazabilidad obligatoria source->translation->preview->pdf.                             |

## Proposed Architecture

1. **Orquestación por pasos (feature-first)**
   - `src/app/(app)/perfil/*` mantiene origen de datos de perfil.
   - `src/app/(app)/traduccion/page.tsx` extiende para ejecutar traducción y mostrar estado.
   - `src/app/(app)/cv/preview/page.tsx` se consolida como editor obligatorio antes de PDF.
   - `src/app/api/translation/route.ts`, `src/app/api/cv/generate/route.ts`, `src/app/api/cv/pdf/route.ts` se endurecen para flujo real e incremental.

2. **Pipeline contractual reutilizado**
   - Perfil -> snapshot (`mapProfileToTranslationSnapshot`) -> `translationInputSchema`/`translationOutputSchema`.
   - Translation -> CV preview (`mapTranslationOutputToCvInput`, `cvPreviewInputSchema`/`cvPreviewOutputSchema`).
   - Preview validado -> PDF (`mapCvPreviewToPdfGenerationInput`, `pdfGenerationInputSchema`).
   - Resultado uniforme con `DomainResult` + `DomainErrorCode` shared.

3. **Persistencia mínima y trazabilidad**
   - Guardar draft editable y metadatos de trazabilidad en `user_wizard_state.aggregated_draft_jsonb` bajo clave dedicada del flujo.
   - Asociar referencias: `profileSnapshotId`, `translationBlockIds/sourceRefMap`, `cvPreviewVersion`, `pdfDocumentId`.
   - Evitar nueva migración en este slice inicial; diseñar estructura versionable.

## Routes and Modules Affected (Planned)

### App Routes

- `src/app/(app)/traduccion/page.tsx`
- `src/app/(app)/cv/preview/page.tsx`
- `src/app/(app)/cv/page.tsx`
- `src/app/(app)/cv/editor/page.tsx` (si se mantiene, redirigir/reusar preview editable)

### API Routes

- `src/app/api/translation/route.ts`
- `src/app/api/cv/generate/route.ts`
- `src/app/api/cv/pdf/route.ts`

### Feature Modules

- `src/features/profile/services/profile.mapper.ts`
- `src/features/translation/server/generate-translation.ts`
- `src/features/translation/components/translation-preview.tsx`
- `src/features/cv/server/generate-cv.ts`
- `src/features/cv/server/save-cv.ts`
- `src/features/cv/server/get-cv.ts`
- `src/features/cv/server/export-cv-pdf.ts`
- `src/features/cv/components/cv-preview.tsx`
- `src/features/cv/components/cv-section-editor.tsx`
- `src/features/documents/server/generate-pdf.ts`

### Shared and Infra

- `src/lib/contracts/*` (REUSE, no fork)
- `src/lib/supabase/server.ts` (REUSE para SSR auth context)
- `src/types/database.types.ts` (tipado de persistencia mínima si aplica)

## Reused Contracts and Services

- Kernel shared: `DomainResult`, `DomainError`, `DomainErrorCode`, helpers de validación Zod.
- Translation: `translationInputSchema`, `translationOutputSchema`, `generateTranslation`.
- CV: `cvPreviewInputSchema`, `cvPreviewOutputSchema`, `mapTranslationOutputToCvInput`, `parseEditableCvPreviewBoundary`.
- LinkedIn: contratos se mantienen compatibles como fuente alternativa futura; no se reescriben.
- Documents: `pdfGenerationInputSchema`, `generatePdf`, `mapCvPreviewToPdfGenerationInput`.

## UI and State Changes

- **Perfil**: mostrar CTA claro para continuar a traducción cuando hay datos mínimos.
- **Traducción**: estados `loading`, `empty` (perfil insuficiente), `error` (seguro), `ready`.
- **Preview CV editable**: edición obligatoria previa a exportación con validación de borrador.
- **Exportación PDF**: bloquear doble submit, mostrar estado en cola/listo/error con retry.
- **Trazabilidad UI**: timeline/resumen del flujo mostrando origen y versión actual usada.

## Minimal Persistence Strategy

- Persistir en `user_wizard_state.aggregated_draft_jsonb`:
  - `employabilityFlow.profileSnapshotId`
  - `employabilityFlow.translation` (ids y map de referencia)
  - `employabilityFlow.cvPreviewDraft` (secciones editables y `updatedAt`)
  - `employabilityFlow.export` (`documentId`, `status`, `requestedAt`)
- Guardar en eventos críticos: traducción completada, edición de sección, solicitud de PDF.
- Recuperación al reingresar: cargar draft y versiones para continuar sin pérdida relevante.

## Error Strategy

- **Usuario**: mensajes accionables y no técnicos (ej. "No pudimos exportar tu PDF, reintenta en unos minutos").
- **Interno**: `DomainErrorCode` + `details` observables en logs server-side.
- **Seguridad**: no exponer stack traces, tokens ni detalles de proveedor externo.
- **Recuperación**: retry explícito por etapa sin borrar draft persistido.

## Testing Strategy

1. **UI (`jsdom`)**
   - Estados loading/empty/error por pantalla.
   - Edición obligatoria previa a exportación.
   - Bloqueo de exportación simultánea y feedback de progreso.
2. **Handlers/API (`node`)**
   - Validación Zod en límites (`route.ts`) con respuestas `DomainResult`.
   - Mapeo de errores a HTTP sin fuga de detalles internos.
3. **Services/Server (`node`)**
   - `generateTranslation`, `generateCv`, `generatePdfFromCvPreview`, save/get draft.
   - Trazabilidad y consistencia semántica entre preview y payload PDF.
4. **Flujo E2E contractual (`node`)**
   - Extender `profile-translation-cv-pdf.contract.test.ts` para incluir edición previa y persistencia/reanudación.

## Risks and Mitigations

| Risk                                   | Impact | Mitigation                                                                                 |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Inconsistencia semántica preview/PDF   | Alto   | Snapshot versionado de preview previo a export y validación contractual previa al enqueue. |
| Pérdida de trabajo por interrupción    | Alto   | Persistencia incremental por etapa + recuperación en carga inicial.                        |
| Flujo acoplado a placeholders actuales | Medio  | Extensión incremental de handlers/services existentes, sin rewrite masivo.                 |
| Errores técnicos expuestos al usuario  | Alto   | Centralizar normalización `DomainError` y mensajes seguros en frontera UI/API.             |
| Deriva entre contratos de features     | Medio  | Reusar schemas existentes y agregar pruebas de compatibilidad cruzada.                     |

## Recommended Sequence (Phase 2 Planning Stop Point)

1. Definir/ajustar contratos de persistencia y trazabilidad del draft (sin lógica de negocio aún).
2. Ajustar handlers API para aceptar y devolver payloads contractuales del flujo completo.
3. Implementar servicios server incrementales de guardado/recuperación draft + export orchestrator.
4. Integrar UI de traducción y preview editable con estados claros y edición obligatoria.
5. Integrar exportación PDF con bloqueo de doble submit y trazabilidad de versión.
6. Ejecutar suite de pruebas por capas + contrato E2E del flujo.

## Project Structure

### Documentation (this feature)

```text
/home/svens/dev/brujula-civil/specs/002-employability-e2e-flow/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- profile-to-translation.md
|   |-- translation-to-cv-preview.md
|   |-- cv-preview-to-pdf.md
|   `-- performance-neutrality-check.md
`-- tasks.md
```

### Source Code (repository root)

```text
/home/svens/dev/brujula-civil/src/
|-- app/
|   |-- (app)/traduccion/page.tsx
|   |-- (app)/cv/preview/page.tsx
|   `-- api/
|       |-- translation/route.ts
|       |-- cv/generate/route.ts
|       `-- cv/pdf/route.ts
|-- features/
|   |-- profile/
|   |-- translation/
|   |-- cv/
|   `-- documents/
|-- lib/contracts/
|-- lib/supabase/server.ts
`-- types/database.types.ts
```

**Structure Decision**: Mantener arquitectura feature-first y App Router existentes, extendiendo módulos ya creados para el flujo E2E sin reescritura completa.

## Constitution Check (Post-Design Re-evaluation)

| Gate                                | Result | Evidence / Action                                                                                                  |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| Verify-First Engineering            | PASS   | Diseño vinculado a artefactos reales (`research.md`, `data-model.md`, `contracts/*`) y evidencia de código actual. |
| Contract-First Boundaries           | PASS   | Phase 1 entrega contratos y modelo de datos antes de cualquier implementación de producto.                         |
| Mandatory Quality Gates             | PASS   | Quickstart y estrategia de testing definen el orden de gates obligatorio.                                          |
| Security by Default                 | PASS   | Estrategia de errores seguros + observabilidad interna + SSR auth + aislamiento por usuario.                       |
| Reversible Incremental Delivery     | PASS   | Secuencia por incrementos funcionales reversibles, cada uno testeable.                                             |
| Domain Safety and Product Integrity | PASS   | Trazabilidad end-to-end formalizada y edición previa obligatoria incluida en contratos.                            |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |

## Final Phase Closure (T053-T059)

### Final quality gates

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test:run`: PASS (`69` test files, `268` tests).
- Correcciones funcionales en fase final: **ninguna** (no se detectaron fallos bloqueantes de lint/typecheck/tests).

### Closure documentation updates

- `plan.md`: consolidado con evidencia de gates y cierre operativo.
- `quickstart.md`: actualizado con procedimiento final reproducible y criterios de salida.
- `tasks.md`: estrategia de rollout/cierre documentada y checkboxes finales marcados para T053-T059.
- `contracts/performance-neutrality-check.md`: agregado con metodo baseline vs post y conclusion.

### Formal readiness

- La iniciativa queda en estado **lista para cierre formal**: sin deuda tecnica abierta dentro del alcance de `002-employability-e2e-flow`.
