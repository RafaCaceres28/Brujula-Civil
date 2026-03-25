# Phase 0 Research - 004-explicabilidad-rutas

## Objective

Resolver decisiones de diseno para agregar explicabilidad util sobre `003-recommend-career-routes` sin aumentar complejidad ni abrir refactor global.

## Decision 1: Reuso de base 003 en lugar de modulo nuevo

- **Question**: Crear otro feature de recomendacion o extender el existente.
- **Decision**: Extender `src/features/recommendations/*` y `employabilityFlow` ya existente.
- **Rationale**:
  - Ya hay motor, shortlist, seleccion y contratos minimos en produccion de repo.
  - Reduce riesgo de drift y de duplicacion de reglas.
  - Cumple FR-010 y NFR-003 de la especificacion.
- **Alternative considered**: Modulo separado `explanations`.
- **Why rejected now**: Introduce acoplamiento cruzado y mayor costo de sincronizacion de estado.

## Decision 2: Donde guardar metadatos de explicabilidad para reingreso

- **Question**: Persistir explicabilidad en tabla nueva o dentro del draft.
- **Decision**: Persistir snapshot minimo dentro de `aggregated_draft_jsonb.employabilityFlow` junto a `selectedRoute`.
- **Rationale**:
  - `select-career-route.ts` ya guarda en esa estructura y valida pertenencia al set activo.
  - `save-onboarding-step.ts` ya hace merge defensivo de `employabilityFlow`.
  - Evita migraciones para MVP.
- **Alternative considered**: Tabla dedicada de decisiones explicativas.
- **Why rejected now**: Aumenta alcance operativo y no es necesario para el objetivo de 004.

## Decision 3: Superficie UI para explicaciones

- **Question**: Nueva pantalla de decisiones o ampliar shortlist actual.
- **Decision**: Ampliar `CareerRouteShortlist` dentro de `/traduccion`.
- **Rationale**:
  - Ya existe render condicional de shortlist en `src/app/(app)/traduccion/page.tsx`.
  - `reasonSummary` ya se muestra; falta agregar fit/guidance, no rehacer flujo.
  - Mantiene continuidad hacia preview con menor friccion.
- **Alternative considered**: Ruta dedicada `/(app)/recomendaciones`.
- **Why rejected now**: Cambios de navegacion y estado no justifican valor adicional MVP.

## Decision 4: Modelo de explicabilidad inicial

- **Question**: Exponer scoring tecnico detallado o mensajes user-friendly.
- **Decision**: Exponer `fitLabel` + `reasonSummary` + `decisionGuidance`; dejar `fitScore` para orden interno y auditoria.
- **Rationale**:
  - FR-001/FR-002/FR-003 piden legibilidad no tecnica y comparacion clara.
  - Minimiza riesgo de UX confusa por puntajes crudos.
- **Alternative considered**: Mostrar solo score numerico.
- **Why rejected**: No cumple claridad para usuarios no tecnicos y dificulta toma de decision.

## Decision 5: Trazabilidad incremental sin romper contratos actuales

- **Question**: Propagar todo el contexto explicativo por cada contrato del pipeline o solo anclas minimas.
- **Decision**: Mantener `selectedRouteId` como ancla obligatoria y agregar snapshots explicativos solo donde aporte continuidad de reingreso.
- **Rationale**:
  - `translation.schema.ts` y `route.ts` ya soportan `selectedRouteId` opcional/backward compatible.
  - `export-cv-pdf.ts` ya propaga `selectedRouteId` en meta de trazabilidad.
  - Evita fan-out de cambios en todos los contratos de CV/PDF.
- **Alternative considered**: Agregar payload explicativo completo a translation/cv/pdf.
- **Why rejected now**: Sobredimensiona cambios y riesgo de regresion.

## Decision 6: Testing incremental sin complejidad innecesaria

- **Question**: Crear nueva suite end-to-end o extender pruebas existentes por capa.
- **Decision**: Extender suites existentes (`node` + `jsdom` + contract tests actuales).
- **Rationale**:
  - Ya existe cobertura relevante en recommendations, wizard, traduccion, cv y contracts.
  - Menor costo de mantenimiento y feedback rapido.
- **Alternative considered**: Nueva suite E2E completa con harness dedicado.
- **Why rejected now**: No necesaria para validar objetivos de 004.

## Clarifications Status

- Performance objetivos: **RESUELTO** (server <= 350 ms, UI <= 2.0 s, persist <= 700 ms percibidos).
- Persistencia explicativa: **RESUELTO** (extension de `employabilityFlow`).
- Punto de UI: **RESUELTO** (shortlist en `/traduccion`).
- Trazabilidad/reingreso: **RESUELTO** (selectedRoute + snapshot explicativo minimo).

No quedan marcadores `[NEEDS CLARIFICATION]` para avanzar a Phase 1.
