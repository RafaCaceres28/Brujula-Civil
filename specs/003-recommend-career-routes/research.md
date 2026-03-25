# Phase 0 Research - 003-recommend-career-routes

## Objective

Resolver decisiones tecnicas y de alcance para planificar una recomendacion guiada de rutas civiles integrada al flujo existente sin infraestructura nueva ni refactor global.

## Decision 1: Donde ubicar la logica de recomendacion por reglas

- **Question**: ¿La recomendacion debe vivir en UI o en una capa de negocio testeable?
- **Decision**: Implementar recomendacion en `server/services` feature-local (nuevo modulo `recommendations`) y consumirla desde UI.
- **Rationale**:
  - Cumple preferencia explicita de diseno: logica fuera de UI.
  - Facilita tests `node` deterministas para ranking y explicabilidad.
  - Respeta principio de boundaries (`Contract-First`) de la constitucion.
- **Alternative considered**: Calcular shortlist en componente React de `/traduccion`.
- **Why rejected now**: Acopla negocio y presentacion, dificulta testing y aumenta riesgo de regresion.

## Decision 2: Persistencia de shortlist y ruta elegida

- **Question**: ¿Nueva tabla o extension del draft existente?
- **Decision**: Extender `user_wizard_state.aggregated_draft_jsonb.employabilityFlow`.
- **Rationale**:
  - Evidencia de reutilizacion existente en `src/features/cv/server/save-cv.ts` y `src/features/wizard/server/save-onboarding-step.ts`.
  - Evita migraciones y reduce riesgo operativo para MVP.
  - Permite recuperacion en reingreso manteniendo consistencia con el flujo actual.
- **Alternative considered**: Crear tabla dedicada `career_route_recommendations`.
- **Why rejected now**: Incremento de alcance no requerido para validar valor inicial.

## Decision 3: Entrada oficial del motor de reglas

- **Question**: ¿De donde sale la data canonica para recomendar rutas?
- **Decision**: Usar `onboardingDraftSchema` (pasos `militar`, `experiencia`, `competencias`, `objetivos`) y catalogos de `wizard-catalogs.ts` como fuente oficial.
- **Rationale**:
  - FR-001/FR-004/FR-005 piden input estructurado del wizard.
  - El repo ya estandariza esos campos y enums en Zod.
  - Evita dependencia de texto libre o heuristicas opacas.
- **Alternative considered**: Basarse en profile mapper simplificado (`mapProfileToTranslationSnapshot`).
- **Why rejected**: Ese mapper colapsa demasiada señal y pierde granularidad util para recomendacion explicable.

## Decision 4: Ubicacion del shortlist en UX inicial

- **Question**: ¿Nueva ruta dedicada o integracion en pantalla actual?
- **Decision**: Integrar shortlist y seleccion en flujo actual de traduccion como MVP.
- **Rationale**:
  - Ya existe estado `loading/empty/error/ready` en `src/app/(app)/traduccion/page.tsx`.
  - Menor costo de integracion y rollout reversible.
  - Mantiene continuidad hacia preview CV sin ramificar navegacion.
- **Alternative considered**: Nueva pantalla completa para recomendaciones.
- **Why rejected now**: Mayor costo de routing/estado para valor inicial similar.

## Decision 5: Trazabilidad minima obligatoria

- **Question**: ¿Como garantizar cadena perfil -> recomendacion -> traduccion -> preview -> PDF?
- **Decision**: Introducir metadatos estables (`recommendationSetId`, `selectedRouteId`) en draft y propagarlos a boundaries de translation/cv/pdf.
- **Rationale**:
  - El flujo actual ya usa `profileSnapshotId` y `previewVersionId` como anchors trazables.
  - Tests contractuales existentes (`profile-translation-cv-pdf.contract.test.ts`) son base natural para extender trazabilidad.
- **Alternative considered**: Trazabilidad solo implícita por timestamps.
- **Why rejected**: No permite verificabilidad determinista ni auditoria funcional.

## Decision 6: Recovery y fallback de reingreso

- **Question**: ¿Que hacer con datos parciales/corruptos en draft?
- **Decision**: Parseo defensivo con Zod, fallback a `empty` + reintento seguro sin borrar datos validos no relacionados.
- **Rationale**:
  - Patrón similar ya existe en `src/app/(app)/cv/preview/page.tsx` para recovery de draft.
  - Evita perdida de trabajo y mantiene mensajes seguros.
- **Alternative considered**: Reset completo del draft ante cualquier inconsistencia.
- **Why rejected**: Riesgo alto de perdida de contexto del usuario.

## Clarifications Status

- Performance y UX: **RESUELTO** (reglas <= 300 ms server; UX <= 2.0 s por pantalla clave; persistencia <= 700 ms percibidos).
- Modelo de persistencia: **RESUELTO** (extension de `aggregated_draft_jsonb.employabilityFlow`).
- Punto de integracion MVP: **RESUELTO** (flujo de traduccion existente).
- Alcance MVP: **RESUELTO** (reglas deterministicas + shortlist + seleccion + trazabilidad + reingreso).

No quedan marcadores `[NEEDS CLARIFICATION]` para avanzar a Phase 1.
