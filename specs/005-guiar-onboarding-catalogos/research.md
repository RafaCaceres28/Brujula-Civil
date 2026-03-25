# Phase 0 Research - 005-guiar-onboarding-catalogos

## Objective

Definir como pasar de onboarding con texto libre a onboarding guiado por catalogos existentes, manteniendo compatibilidad de reingreso y continuidad con recomendaciones/traduccion sin refactor grande.

## Decision 1: Reusar wizard actual en lugar de crear flujo paralelo

- **Question**: Crear un wizard nuevo guiado o endurecer el wizard existente.
- **Decision**: Extender rutas actuales `/onboarding/*` y acciones `save-*-step-action.ts`.
- **Rationale**:
  - Ya existe secuencia y guardas de pasos en `/home/svens/dev/brujula-civil/src/features/wizard/config/wizard-steps.ts`.
  - `save-onboarding-step.ts` y `get-onboarding-overview.ts` ya manejan persistencia/reingreso.
  - Cumple FR-009/FR-012 de evitar refactor grande y wizard paralelo.
- **Alternative considered**: nuevo set de rutas `onboarding-v2`.
- **Why rejected now**: duplicaria estado, elevaria costo de migracion y rompe incrementalidad.

## Decision 2: Separar campos estructurados vs narrativos por contrato explicito

- **Question**: Que campos deben seguir texto libre y cuales deben cerrarse por catalogo.
- **Decision**: Estructurados por catalogo; libres solo narrativos/complementarios.
- **Rationale**:
  - UI actual usa `Input`/`Textarea` libre en casi todos los campos (`militar/page.tsx`, `experiencia/page.tsx`, `competencias/page.tsx`, `objetivos/page.tsx`).
  - Catalogos disponibles en `wizard-catalogs.ts` cubren la mayoria de campos estructurados.
  - `wizard.schema.ts` hoy acepta strings libres para campos que ya tienen catalogo.
- **Alternative considered**: mantener texto libre y normalizar solo downstream.
- **Why rejected**: conserva ambiguedad en origen y contradice objetivo principal.

## Decision 3: Endurecer validacion en mapper + schema (no solo en UI)

- **Question**: Alcanzaria con cambiar componentes visuales.
- **Decision**: NO. Endurecer `wizard-form.mapper.ts` y `wizard.schema.ts`.
- **Rationale**:
  - `parse*FormData` hoy convierte textareas en arrays por salto de linea y acepta texto arbitrario.
  - `save-onboarding-step.ts` persiste payload ya parseado; si frontera no valida, entra basura estructural.
  - FR-005/FR-006 requieren rechazo server-side de valores fuera de catalogo.
- **Alternative considered**: validacion solo cliente.
- **Why rejected**: no protege contra entradas manipuladas fuera de UI.

## Decision 4: Compatibilidad de reingreso por fallback incremental

- **Question**: Como manejar drafts antiguos con texto libre en campos ahora guiados.
- **Decision**: parse tolerante en lectura + normalizacion incremental en guardado.
- **Rationale**:
  - `get-onboarding-overview.ts` ya aplica parse tolerante de `employabilityFlow` y compatibilidad legacy.
  - `save-onboarding-step.ts` hace merge defensivo y preserva `employabilityFlow`.
  - Edge cases de spec exigen continuidad con drafts previos.
- **Alternative considered**: migracion masiva de JSONB.
- **Why rejected now**: alta complejidad operativa y riesgo para alcance MVP.

## Decision 5: Componentes reutilizables de seleccion en feature wizard

- **Question**: Repetir `select` y checkboxes por pagina o crear componentes reutilizables.
- **Decision**: crear componentes reutilizables en `src/features/wizard/components/`.
- **Rationale**:
  - Hoy no existe un `Select` UI compartido en `src/components/ui/*`.
  - Repeticion ad hoc por pagina aumenta drift.
  - Permite evolucion incremental del wizard sin rediseño global.
- **Alternative considered**: usar controles inline por cada page.
- **Why rejected**: mayor deuda y riesgo de inconsistencias de accesibilidad/UX.

## Decision 6: Impacto downstream controlado

- **Question**: Cambiar contratos de recommendations/translation/profile o mantenerlos.
- **Decision**: mantener contratos de consumo y mejorar calidad de inputs en origen.
- **Rationale**:
  - `build-recommendation-input.ts` ya consume ids/strings y normaliza tokens.
  - `project-wizard-to-profiles.ts` proyecta desde draft; no requiere cambiar pipeline.
  - `generate-translation.ts` ya soporta contexto estructurado sin depender de UI onboarding.
- **Alternative considered**: refactor de contratos cross-feature.
- **Why rejected now**: fuera de alcance y contrario a iniciativa incremental.

## Mandatory Evidence Snapshot

1. **Pantallas con texto libre en campos estructurados**
   - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/militar/page.tsx`
   - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/experiencia/page.tsx`
   - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/competencias/page.tsx`
   - `/home/svens/dev/brujula-civil/src/app/(app)/onboarding/objetivos/page.tsx`

2. **Schemas/types/server que hoy aceptan texto libre**
   - `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/types/wizard.types.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`

3. **Catalogos ya disponibles para migrar a controles guiados**
   - `/home/svens/dev/brujula-civil/src/features/wizard/config/wizard-catalogs.ts`

4. **Compatibilidad de persistencia/reingreso existente**
   - `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard-state.schema.ts`

5. **Tests base para extender**
   - `/home/svens/dev/brujula-civil/src/features/wizard/schemas/wizard.schema.test.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/services/wizard-form.mapper.test.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/server/save-onboarding-step.test.ts`
   - `/home/svens/dev/brujula-civil/src/features/wizard/server/get-onboarding-overview.test.ts`

## Clarifications Status

- Performance/escala: **RESUELTO** con objetivos incrementales y sin cambios de infraestructura.
- Campo a campo (catalogo vs narrativo): **RESUELTO** con auditoria completa en `plan.md`.
- Persistencia/reingreso legacy: **RESUELTO** con estrategia de fallback incremental.

No quedan marcadores `[NEEDS CLARIFICATION]` para pasar a Phase 1.
