# Feature Specification: Explicabilidad y Guia de Recomendaciones Laborales

**Feature Branch**: `004-explicabilidad-rutas`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "iniciativa nueva para explicabilidad de recomendaciones"

## Constitution Alignment (mandatory)

- **Verify-First Evidence**: Revision de `AGENTS.md`, `.specify/memory/constitution.md`, `.specify/templates/spec-template.md`, `specs/001-unify-domain-contracts/{spec.md,plan.md,tasks.md,quickstart.md}`, `specs/002-employability-e2e-flow/{spec.md,plan.md,tasks.md,quickstart.md}`, `specs/003-recommend-career-routes/{spec.md,plan.md,tasks.md,quickstart.md}`.
- **Contract Impact**: Se requiere extender contratos de recomendaciones para incluir factores explicativos, nivel de confianza legible, y mensajes de guia accionable para decision del usuario, manteniendo compatibilidad con `selectedRoute` y trazabilidad existente.
- **Security Impact**: Las explicaciones deben ser seguras para usuario final, sin revelar reglas internas sensibles, datos de otros usuarios ni detalles de proveedor; se mantiene aislamiento por usuario y manejo de errores user-safe.
- **Quality Gate Plan**: En implementacion se validara alcance impactado con `pnpm lint`, `pnpm typecheck` y `pnpm test:run`, cubriendo recomendacion explicable, seleccion guiada, reingreso y consistencia con flujo de traduccion/preview/pdf.

## User Scenarios & Testing (mandatory)

User stories MUST be prioritized and independently testable.

### User Story 1 - Entender por que una ruta fue sugerida (Priority: P1)

Como usuario en transicion laboral, quiero ver explicaciones claras y concretas de cada ruta sugerida para confiar en la recomendacion y decidir con criterio.

**Why this priority**: Sin explicabilidad, la shortlist pierde credibilidad y baja conversion a seleccion de ruta.
**Independent Test**: Con datos estructurados suficientes, validar que cada ruta sugerida muestra razones comprensibles y un nivel de ajuste legible sin lenguaje tecnico.

**Acceptance Scenarios**:

1. **Given** un usuario con shortlist generada, **When** visualiza una ruta recomendada, **Then** ve una explicacion resumida de por que esa ruta aplica a su perfil.
2. **Given** varias rutas sugeridas, **When** compara opciones, **Then** puede distinguir con claridad cual se ajusta mejor segun razones y nivel de ajuste mostrado.

---

### User Story 2 - Recibir guia para elegir y avanzar (Priority: P2)

Como usuario, quiero una guia de decision simple dentro de la shortlist para elegir ruta con menor friccion y continuar al flujo de traduccion sin bloqueo confuso.

**Why this priority**: Convierte explicabilidad en accion concreta y reduce abandono antes de entrar al pipeline principal.
**Independent Test**: Validar que el usuario puede seleccionar ruta con apoyo de guia contextual y que el flujo permite avanzar de forma comprensible.

**Acceptance Scenarios**:

1. **Given** una shortlist explicable disponible, **When** el usuario pide ayuda para decidir, **Then** recibe una guia breve y accionable para comparar y confirmar su ruta.
2. **Given** una ruta seleccionada, **When** el usuario avanza hacia traduccion, **Then** el sistema confirma la decision activa sin requerir repetir pasos.

---

### User Story 3 - Reingresar manteniendo contexto explicable (Priority: P3)

Como usuario que vuelve en otra sesion, quiero recuperar mi ruta elegida y la explicacion asociada para retomar rapido y mantener coherencia de decision.

**Why this priority**: Preserva continuidad del proceso y evita que el usuario vuelva a analizar desde cero.
**Independent Test**: Interrumpir despues de seleccionar ruta y reingresar para verificar recuperacion de eleccion, explicacion visible y continuidad del flujo.

**Acceptance Scenarios**:

1. **Given** un usuario con ruta elegida previamente, **When** reingresa al flujo, **Then** recupera su seleccion y la explicacion principal que justifico esa decision.
2. **Given** una falla temporal al cargar explicaciones, **When** ocurre el error, **Then** el usuario recibe mensaje seguro y accion de recuperacion sin perder su ruta elegida.

## Edge Cases

- El perfil alcanza para sugerir rutas, pero la explicacion resulta debil o demasiado generica para tomar decision.
- Dos rutas tienen ajuste similar y el usuario necesita criterio de desempate comprensible.
- El usuario cambia su ruta elegida despues de haber avanzado a traduccion o preview y requiere mantener consistencia sin borrar trabajo editable.
- Existen datos parciales en reingreso (ruta elegida persistida, pero resumen explicativo faltante o desactualizado).
- Una recomendacion queda obsoleta por cambio de datos del wizard y se debe mostrar estado de desactualizacion con guia de reproceso.
- Falla la carga de explicaciones o guia y el sistema debe degradar a fallback seguro sin romper el avance del flujo.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: El sistema MUST mostrar para cada ruta sugerida una explicacion resumida basada en atributos estructurados del perfil del usuario.
- **FR-002**: El sistema MUST exponer un indicador legible de nivel de ajuste por ruta sugerida para facilitar comparacion.
- **FR-003**: El sistema MUST incluir una guia accionable de decision que ayude al usuario a elegir entre rutas sugeridas sin lenguaje tecnico.
- **FR-004**: El sistema MUST permitir seleccion explicita de ruta manteniendo el contexto de explicacion asociado a la decision.
- **FR-005**: El sistema MUST reutilizar la ruta seleccionada y su contexto explicable en el flujo existente de traduccion, preview editable y exportacion PDF.
- **FR-006**: El sistema MUST recuperar en reingreso la ruta elegida junto con su contexto explicable minimo para retomar decision.
- **FR-007**: El sistema MUST manejar estados loading, empty y error de explicabilidad con mensajes claros, accionables y seguros.
- **FR-008**: El sistema MUST validar entradas no confiables en fronteras de recomendacion/seleccion/recuperacion antes de procesar o persistir.
- **FR-009**: El sistema MUST preservar trazabilidad minima entre datos estructurados, recomendacion generada, explicacion presentada, ruta elegida, traduccion, preview y PDF.
- **FR-010**: El sistema MUST mantener compatibilidad con `003-recommend-career-routes` sin exigir refactorizacion grande ni rediseño transversal del pipeline.
- **FR-011**: El sistema MUST mantener editabilidad previa a exportacion PDF aunque exista una ruta seleccionada con guia explicativa.
- **FR-012**: El sistema MUST acotar el alcance de esta iniciativa a explicabilidad y guia de recomendaciones, excluyendo matching avanzado, marketplace laboral e integraciones externas nuevas.

### Non-Functional Requirements

- **NFR-001**: La experiencia de explicabilidad y guia MUST mantener fluidez percibida del flujo y no degradar el tiempo de decision de forma material.
- **NFR-002**: Las explicaciones MUST ser auditables por negocio y producto, con criterios consistentes y mantenibles.
- **NFR-003**: La solucion MUST ser incremental y reversible, priorizando extension de artefactos de `003` en lugar de refactor amplio.
- **NFR-004**: Los mensajes visibles MUST evitar fuga de detalles internos, credenciales o informacion sensible.
- **NFR-005**: El contenido explicativo MUST ser comprensible para usuarios no tecnicos y mantenerse estable ante reingreso.

### Key Entities (include if feature involves data)

- **RecommendationExplanation**: Representa la explicacion resumida y legible que justifica cada ruta sugerida para un usuario.
- **RouteFitIndicator**: Representa el nivel de ajuste mostrado al usuario para comparar rutas de la shortlist.
- **DecisionGuidance**: Representa la guia contextual de decision para apoyar seleccion y siguiente paso.
- **SelectedRouteContext**: Representa la ruta elegida junto a su explicacion minima persistida para reingreso y trazabilidad.
- **RecommendationTraceRecord**: Representa la cadena de evidencia entre perfil estructurado, recomendacion explicada, eleccion y artefactos posteriores del flujo.

### Dependencies & Assumptions

- Se asume que `003-recommend-career-routes` ya provee shortlist y seleccion base reutilizable.
- Se asume que la fuente oficial de entrada sigue siendo el wizard estructurado y catalogos de negocio vigentes.
- Se asume un unico flujo activo por usuario para preservar continuidad de decision.
- Se asume que la explicabilidad inicial es reglas legibles y mensajes guiados; no incluye modelos probabilisticos complejos.
- Se asume que la iniciativa debe entregar valor incremental en cortes testeables sin abrir refactorizacion grande.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Al menos 90% de usuarios con shortlist disponible reportan comprender por que recibieron sus rutas sugeridas en validaciones de usabilidad controlada.
- **SC-002**: Al menos 80% de usuarios que reciben guia de decision seleccionan una ruta y avanzan a traduccion sin abandono inmediato.
- **SC-003**: En pruebas funcionales, 100% de casos aprobados mantienen trazabilidad entre recomendacion explicada, ruta elegida, preview confirmado y PDF exportado.
- **SC-004**: En pruebas de reingreso, al menos 95% de sesiones recuperan ruta elegida y contexto explicable minimo sin perdida material.
- **SC-005**: En pruebas de calidad de especificacion y alcance, 0 cambios requieren refactorizacion grande fuera del dominio de recomendaciones y su integracion ya existente.
- **SC-006**: La iniciativa permite liberar al menos una historia prioritaria (P1) de forma independiente sobre la base de `003`.
