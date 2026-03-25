# Implementation Plan: Recomendacion Guiada de Rutas Laborales Civiles

**Branch**: `003-recommend-career-routes` | **Date**: 2026-03-24 | **Spec**: `/home/svens/dev/brujula-civil/specs/003-recommend-career-routes/spec.md`
**Input**: Feature specification from `/home/svens/dev/brujula-civil/specs/003-recommend-career-routes/spec.md`

## Summary

Plan MVP-first, incremental y reversible para agregar recomendacion por reglas sobre el wizard estructurado, exponer shortlist visible y seleccionable, persistir la eleccion en el draft existente (`user_wizard_state.aggregated_draft_jsonb.employabilityFlow`) y propagar esa ruta elegida hacia traduccion, preview CV y exportacion PDF con trazabilidad minima comprobable. La implementacion evita infraestructura nueva y mantiene la logica de recomendacion en capa de negocio testeable (`server/services`) fuera de UI.

## Technical Context

**Language/Version**: TypeScript (^5, strict mode)
**Primary Dependencies**: Next.js (App Router), React, Supabase SSR/client, Zod
**Storage**: Supabase Postgres (`user_wizard_state.aggregated_draft_jsonb`)
**Testing**: Vitest (`node` y `jsdom`) + tests contractuales del flujo
**Target Platform**: Web app (SSR + client interactions)
**Project Type**: Single Next.js application
**Performance Goals**:

- P95 de calculo de shortlist de recomendacion <= 300 ms en server (reglas deterministicas in-memory).
- Carga de pantalla con shortlist + estado de eleccion <= 2.0 s percibidos en flujo principal.
- Persistencia de seleccion de ruta <= 700 ms percibidos (alineado a draft save actual).

**Constraints**:

- Sin infraestructura nueva (sin tabla nueva ni servicio externo de matching).
- Reutilizar pipeline actual profile -> translation -> cv preview -> pdf.
- Logica de recomendacion fuera de UI y con cobertura de tests de negocio.
- Extensiones contractuales minimas y backward-compatible.
- Verificacion obligatoria en implementacion: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.

**Scale/Scope**:

- 1 shortlist activa por usuario/sesion de flujo, con 3-5 rutas sugeridas.
- 1 ruta elegida activa por usuario para orientar traduccion/preview/export.
- Alcance inicial por reglas; fuera de alcance matching estadistico o marketplace laboral.

## Constitution Check (Pre-Design)

GATE: Must pass before implementation and again before merge.

| Gate                                | Result | Evidence / Action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Verify-First Engineering            | PASS   | Evidencia real revisada en `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`, `/home/svens/dev/brujula-civil/src/features/wizard/config/wizard-catalogs.ts`, `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`, `/home/svens/dev/brujula-civil/src/features/cv/server/{save-cv.ts,get-cv.ts,export-cv-pdf.ts}`, `/home/svens/dev/brujula-civil/src/app/(app)/traduccion/page.tsx`, `/home/svens/dev/brujula-civil/src/app/(app)/cv/preview/page.tsx` y tests contractuales existentes. |
| Contract-First Boundaries           | PASS   | Phase 1 define extensiones de `schemas/types/contracts` (recomendaciones + seleccion + trazabilidad) antes de planear logica de reglas y adaptaciones UI/API.                                                                                                                                                                                                                                                                                                                                                                                      |
| Mandatory Quality Gates             | PASS   | Estrategia de testing y quickstart exigen `pnpm lint`, `pnpm typecheck`, `pnpm test:run` en orden.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Security by Default                 | PASS   | Persistencia user-scoped en `user_wizard_state`, errores seguros sin fuga de internals, sin secretos ni credenciales embebidas.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Reversible Incremental Delivery     | PASS   | Plan en 6 incrementos independientes (reglas, shortlist UI, seleccion, persistencia, reingreso, integracion preview/pdf) con rollback por modulo.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Domain Safety and Product Integrity | PASS   | Se preserva `DomainResult` y cadena de trazabilidad minima de perfil estructurado a PDF exportado con eleccion explícita.                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Gates

- Gate Status: PASS
- ERROR Conditions: ninguna. No quedan clarificaciones abiertas ni violaciones de constitucion sin mitigacion.

## Proposed Architecture

1. **Motor de recomendacion por reglas (negocio testeable)**
   - Nuevo modulo feature-local (ej. `src/features/recommendations`) con:
     - `services/route-recommendation-rules.ts` para scoring deterministico.
     - `server/generate-career-routes.ts` para orchestration y `DomainResult`.
   - Entrada: draft estructurado de wizard (`militar`, `experiencia`, `competencias`, `objetivos`) + catalogos oficiales.
   - Salida: shortlist ordenada (3-5) con racional explicable por ruta.

2. **Persistencia minima extendiendo draft existente**
   - Reusar `user_wizard_state.aggregated_draft_jsonb.employabilityFlow` ya usado por CV draft.
   - Extender `employabilityFlowDraftSchema` con:
     - `recommendations.shortlist[]`
     - `recommendations.generatedAt`
     - `selectedRoute` (id + metadatos de version/confirmacion)
   - Sin migracion de infraestructura en MVP.

3. **Integracion UI/flujo existente sin refactor global**
   - Shortlist visible + seleccion en pantalla integrada del flujo actual (`/traduccion` como opcion por costo/beneficio inicial).
   - Traduccion/CV/PDF consumen `selectedRoute` como contexto preferente y conservan editabilidad manual.
   - Estados `loading/empty/error` y reintento seguro se mantienen consistentes con patrones ya existentes.

4. **Trazabilidad minima end-to-end**
   - Cadena objetivo:
     - `profileSnapshotId`
     - `recommendationSetId` + `selectedRouteId`
     - `translation.block/sourceRefMap`
     - `previewVersionId`
     - `documentId`
   - Se documenta y valida en tests contractuales extendidos del slice E2E.

## Project Structure

### Documentation (this feature)

```text
/home/svens/dev/brujula-civil/specs/003-recommend-career-routes/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- wizard-to-recommendations.md
|   |-- recommendation-selection-to-translation.md
|   `-- translation-preview-pdf-traceability.md
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
|   |-- wizard/
|   |   |-- schemas/wizard-state.schema.ts
|   |   |-- types/wizard-state.types.ts
|   |   `-- server/{save-onboarding-step.ts,get-onboarding-overview.ts}
|   |-- translation/
|   |   `-- server/generate-translation.ts
|   |-- cv/
|   |   `-- server/{save-cv.ts,get-cv.ts,generate-cv.ts,export-cv-pdf.ts}
|   `-- recommendations/ (nuevo feature acotado)
|       |-- schemas/
|       |-- types/
|       |-- services/
|       `-- server/
`-- lib/contracts/
```

**Structure Decision**: mantener arquitectura feature-first y extender puntos existentes de wizard + translation/cv/documents; introducir `recommendations` como modulo aislado para evitar embebido de reglas en UI o refactor transversal.

## Incremental Strategy (MVP-first)

1. **Incremento 1 - Reglas y shortlist contractual (P1)**
   - Definir contratos/schemas de entrada/salida de recomendacion.
   - Implementar scoring por reglas con explicabilidad y top 3-5.
   - Pruebas `node` de motor de reglas y boundary parsing.

2. **Incremento 2 - Shortlist visible en flujo actual (P1)**
   - Mostrar shortlist + racional en UI de flujo existente.
   - Estados loading/empty/error con copy seguro.
   - Pruebas `jsdom` de renderizado y estados.

3. **Incremento 3 - Seleccion de ruta (P2)**
   - Capturar seleccion explicita de ruta y validarla en frontera.
   - Bloquear avance cuando la decision sea requerida por flujo.
   - Pruebas de accion y restricciones de avance.

4. **Incremento 4 - Persistencia minima de eleccion (P2)**
   - Guardar shortlist/seleccion en `aggregated_draft_jsonb.employabilityFlow`.
   - Mantener compatibilidad con `cvPreviewDraft` existente.
   - Pruebas de merge/recovery en server.

5. **Incremento 5 - Reingreso y recuperacion (P3)**
   - Recuperar `selectedRoute` + draft activo al reingresar.
   - Fallback seguro ante datos parciales/corruptos.
   - Pruebas de reingreso y recuperación controlada.

6. **Incremento 6 - Integracion a traduccion/preview/PDF (P2/P3)**
   - Inyectar contexto de ruta elegida en traduccion y metadatos de preview/pdf.
   - Mantener editabilidad previa y consistencia semantica exportada.
   - Extender contract tests E2E actuales para cadena completa.

## Risks and Mitigations

| Risk                                                        | Impact | Mitigation                                                                                     |
| ----------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Reglas acopladas a UI                                       | Alto   | Motor en `services/server` con contratos tipados y tests de negocio.                           |
| Drift entre shortlist elegida y pipeline translation/cv/pdf | Alto   | Metadatos de trazabilidad obligatorios + tests contractuales end-to-end.                       |
| Sobrescritura accidental de `employabilityFlow` existente   | Alto   | Merge defensivo sobre schema actual + pruebas de persistencia incremental.                     |
| Reingreso con draft parcial                                 | Medio  | Parser tolerante + fallback seguro + acciones de recuperación en UI.                           |
| Alcance se expande a plataforma laboral completa            | Medio  | Limitar MVP a reglas deterministicas sobre catalogos actuales; registrar non-goals explícitos. |

## Testing Strategy

1. **Negocio y contratos (`node`)**
   - Motor de recomendacion: ranking, desempate, explicabilidad, top 3-5.
   - Schemas de entrada/salida y errores de frontera.
2. **Persistencia y reingreso (`node`)**
   - Extender patrones de `save-onboarding-step.test.ts` y `get-cv.test.ts` para shortlist/seleccion.
   - Validar merge sin perder `cvPreviewDraft` ni trazas previas.
3. **Integracion de rutas/API (`node`)**
   - Extender `src/app/api/translation/route.test.ts`, `src/app/api/cv/generate/route.test.ts`, `src/app/api/cv/pdf/route.test.ts` con metadatos de ruta elegida.
4. **UI (`jsdom`)**
   - Extender `src/app/(app)/traduccion/page.test.tsx` y `src/app/(app)/cv/preview/page.test.tsx` para shortlist/seleccion/recovery/error.
5. **Contrato E2E de slice (`node`)**
   - Extender `src/features/translation/server/profile-translation-cv-pdf.contract.test.ts` para incluir `selectedRoute` y trazabilidad completa.

## Exit Criteria

1. Shortlist de 3-5 rutas visible y explicable para perfiles suficientes.
2. Seleccion de ruta persistida en draft existente sin infraestructura nueva.
3. Reingreso recupera `selectedRoute` y borrador activo sin perdida material.
4. Traduccion, preview y PDF incluyen trazabilidad de ruta elegida.
5. Todos los incrementos del MVP son reversibles y testeables de forma independiente.
6. Gate de calidad listo para implementacion: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.

## Constitution Check (Post-Design Re-evaluation)

| Gate                                | Result | Evidence / Action                                                                                                          |
| ----------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| Verify-First Engineering            | PASS   | Diseño respaldado por evidencia real del repo + artefactos `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`. |
| Contract-First Boundaries           | PASS   | Se definieron contratos y modelo de datos antes de planear implementacion de negocio/UI.                                   |
| Mandatory Quality Gates             | PASS   | Quickstart establece orden obligatorio de validacion y pruebas objetivo por capa.                                          |
| Security by Default                 | PASS   | Persistencia user-scoped, mensajes seguros y sin exponer internals en errores de pipeline.                                 |
| Reversible Incremental Delivery     | PASS   | 6 incrementos independientes, con rollback por modulo y sin refactor global.                                               |
| Domain Safety and Product Integrity | PASS   | Trazabilidad perfil->recomendacion->traduccion->preview->PDF formalizada y manteniendo editabilidad previa.                |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       | N/A        | N/A                                  |
