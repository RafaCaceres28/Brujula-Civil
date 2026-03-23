# Phase 0 Research - 002-employability-e2e-flow

## Objective

Resolver decisiones técnicas críticas para planificar el vertical slice perfil -> traducción -> preview editable -> PDF sin bloquear Phase 1.

## Decision 1: Punto de persistencia mínima del borrador

- **Question**: ¿Dónde persistir progreso sin introducir migraciones en este slice?
- **Decision**: Reutilizar `user_wizard_state.aggregated_draft_jsonb` con un namespace dedicado `employabilityFlow`.
- **Rationale**:
  - Ya existe patrón de guardado incremental en `src/features/wizard/server/save-onboarding-step.ts`.
  - Permite persistencia rápida para no perder trabajo sin ampliar schema en fase inicial.
  - Mantiene reversibilidad: si luego se requiere tabla dedicada, se migra desde un único nodo JSON.
- **Alternative considered**: Nueva tabla `cv_drafts` + migración inmediata.
- **Why rejected now**: Incremento mayor en alcance/tiempo; no es necesario para validar vertical slice usable.

## Decision 2: Edición obligatoria antes de exportar PDF

- **Question**: ¿Cómo forzar edición previa sin romper la UX actual?
- **Decision**: La ruta de preview (`/cv/preview`) actúa como checkpoint obligatorio con validación de borrador editable antes de habilitar exportación.
- **Rationale**:
  - Ya existe validación de frontera con `parseEditableCvPreviewBoundary`.
  - Evita exportar payload sin revisión humana y cumple requisito explícito del negocio.
- **Alternative considered**: Exportar directo desde traducción con edición opcional.
- **Why rejected**: Incumple requisito de edición previa obligatoria y reduce control de calidad del usuario.

## Decision 3: Consistencia semántica preview/PDF

- **Question**: ¿Cómo garantizar que el PDF representa el preview aprobado?
- **Decision**: Introducir `previewVersionId` y snapshot de secciones al momento de exportar; PDF solo se genera desde ese snapshot validado.
- **Rationale**:
  - Evita drift entre cambios en UI y contenido exportado.
  - Encaja con contratos existentes CV/Documents y pruebas contractuales actuales.
- **Alternative considered**: Regenerar PDF desde estado vivo del editor al vuelo.
- **Why rejected**: Riesgo alto de carrera y discrepancias semánticas.

## Decision 4: Estrategia de errores seguros + observabilidad

- **Question**: ¿Cómo exponer errores útiles sin filtrar detalles internos?
- **Decision**: Mantener `DomainResult`/`DomainErrorCode` en boundaries y mapear mensajes user-safe en UI; detalles técnicos solo en logs server.
- **Rationale**:
  - El kernel shared ya estandariza la taxonomía de errores.
  - Cumple constitución de seguridad por defecto.
- **Alternative considered**: Devolver error técnico completo al cliente.
- **Why rejected**: Riesgo de exposición de internals y mala UX.

## Decision 5: Alcance de testing del vertical slice

- **Question**: ¿Qué cobertura mínima valida el valor del slice sin sobrecosto?
- **Decision**: Cobertura por capas: UI (`jsdom`), route handlers (`node`), services (`node`) y prueba E2E contractual del pipeline.
- **Rationale**:
  - Reutiliza infraestructura Vitest actual y tests contractuales existentes.
  - Detecta drift de contratos y regresiones de estados UX críticos.
- **Alternative considered**: Solo tests unitarios de servicios.
- **Why rejected**: No cubre reglas de frontera, estados UI ni trazabilidad end-to-end.

## Clarifications Status

- Performance goals: **RESUELTO** (P95 <= 2s por etapa, guardado <= 700ms, confirmación export <= 1s).
- Scale/scope: **RESUELTO** (1 CV activo por usuario; persistencia mínima por namespace).
- Estrategia de persistencia: **RESUELTO** (JSONB incremental en estado wizard).
- Enfoque de trazabilidad: **RESUELTO** (snapshot/versionado por etapa).

No quedan marcadores `[NEEDS CLARIFICATION]` para avanzar a Phase 1.
