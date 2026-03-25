# Feature Specification: Onboarding Guiado por Catalogos Reutilizables

**Feature Branch**: `005-guiar-onboarding-catalogos`
**Created**: 2026-03-25
**Status**: Draft
**Input**: User description: "Quiero definir una nueva iniciativa para brujula-civil enfocada en convertir el onboarding en experiencia guiada por catalogos existentes, reemplazando texto libre en campos estructurados por controles acotados, manteniendo texto libre solo en campos narrativos/complementarios, con impacto en consistencia para recommendation/explainability/translation y sin refactorizacion grande."

## Constitution Alignment (mandatory)

- **Verify-First Evidence**: Revision de `AGENTS.md`, `.specify/memory/constitution.md`, `.specify/templates/spec-template.md`, `specs/001-unify-domain-contracts/{spec.md,plan.md,tasks.md,quickstart.md}`, `specs/002-employability-e2e-flow/{spec.md,plan.md,tasks.md,quickstart.md}`, `specs/003-recommend-career-routes/{spec.md,plan.md,tasks.md,quickstart.md}`, `specs/004-explicabilidad-rutas/{spec.md,plan.md,tasks.md,quickstart.md}`, y evidencia funcional en `src/features/wizard/config/wizard-catalogs.ts`.
- **Contract Impact**: Se requiere alinear los contratos de onboarding para distinguir campos estructurados guiados por catalogos frente a campos narrativos de texto libre, manteniendo compatibilidad con los contratos y trazas ya utilizados por recommendation, explainability y translation.
- **Security Impact**: La iniciativa debe mantener validacion de entradas no confiables en fronteras de guardado/recuperacion del flujo, evitar fugas de errores tecnicos y preservar aislamiento por usuario en persistencia de draft.
- **Quality Gate Plan**: En implementacion se validara el alcance impactado con `pnpm lint`, `pnpm typecheck` y `pnpm test:run`, incluyendo casos de completitud de onboarding, compatibilidad de reingreso y continuidad de consistencia hacia recommendation/explainability/translation.

## User Scenarios & Testing (mandatory)

User stories MUST be prioritized and independently testable.

### User Story 1 - Completar onboarding estructurado con controles acotados (Priority: P1)

Como usuario en transicion, quiero responder el onboarding estructurado usando opciones guiadas por catalogos para evitar ambiguedad y llegar a recomendaciones consistentes sin depender de redaccion libre en cada campo.

**Why this priority**: Es el cambio de mayor valor inmediato porque reduce deriva de datos en el origen del flujo y mejora la calidad de las recomendaciones desde el primer paso.
**Independent Test**: Con usuario autenticado, completar los pasos estructurados del onboarding usando solo controles acotados y verificar que el flujo queda guardado sin requerir texto libre en campos estructurados.

**Acceptance Scenarios**:

1. **Given** un usuario con onboarding no completado, **When** responde campos estructurados, **Then** el sistema solo permite seleccionar opciones validas de catalogos predefinidos.
2. **Given** un usuario que intenta ingresar texto libre en un campo estructurado, **When** confirma el paso, **Then** el sistema rechaza esa entrada y mantiene una alternativa guiada por catalogo.

---

### User Story 2 - Mantener texto libre solo en campos narrativos (Priority: P2)

Como usuario, quiero conservar espacios de texto libre donde necesito matices personales o contexto complementario para no perder expresividad en mi perfil.

**Why this priority**: Evita sobre-restriccion de la experiencia; protege calidad narrativa sin sacrificar consistencia en datos estructurados.
**Independent Test**: Completar onboarding mezclando seleccion guiada en campos estructurados y texto libre en campos narrativos, verificando que ambos tipos de entrada se aceptan donde corresponde.

**Acceptance Scenarios**:

1. **Given** un paso con campos narrativos y estructurados, **When** el usuario completa el formulario, **Then** solo los campos narrativos aceptan texto libre y los estructurados mantienen seleccion acotada.
2. **Given** un usuario que deja vacio un campo narrativo opcional, **When** avanza al siguiente paso, **Then** el sistema permite continuar sin romper validaciones estructurales.

---

### User Story 3 - Propagar consistencia a recommendation/explainability/translation (Priority: P3)

Como producto, quiero que la salida del onboarding guiado alimente de forma consistente recommendation, explainability y translation para reducir incoherencias y mantener continuidad del flujo sin refactorizacion grande.

**Why this priority**: Convierte la mejora de captura en impacto real aguas abajo y protege inversiones de iniciativas 003/004.
**Independent Test**: Con onboarding completado bajo el nuevo criterio, validar que recommendation/explainability/translation consumen datos consistentes y mantienen compatibilidad de reingreso.

**Acceptance Scenarios**:

1. **Given** un onboarding completado con controles acotados, **When** se genera la shortlist y su explicabilidad, **Then** los resultados usan datos estructurados consistentes sin requerir normalizaciones ambiguas adicionales.
2. **Given** un usuario con draft previo basado en el flujo actual, **When** reingresa tras habilitar el onboarding guiado, **Then** conserva continuidad funcional sin perdida material de datos.

## Edge Cases

- Un valor historico libre no coincide con ninguna opcion actual de catalogo y requiere fallback seguro sin bloquear reingreso.
- Un catalogo cambia entre sesiones y la seleccion previa queda obsoleta o no disponible.
- El usuario necesita describir una situacion valida no cubierta por opciones estructuradas y usa un campo narrativo complementario.
- La misma sesion combina datos guardados antiguos y nuevos, generando mezcla parcial entre formato libre y formato acotado.
- Entradas manipuladas fuera de UI intentan persistir texto libre en campos estructurados.
- Recommendation/explainability/translation reciben datos incompletos de campos estructurados y deben degradar con mensajes accionables.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: El sistema MUST usar catalogos existentes como mecanismo primario para capturar campos estructurados del onboarding.
- **FR-002**: El sistema MUST reemplazar entrada de texto libre en campos estructurados por controles acotados de seleccion.
- **FR-003**: El sistema MUST mantener texto libre unicamente en campos narrativos o complementarios definidos por negocio.
- **FR-004**: El sistema MUST distinguir de forma explicita que campos son estructurados y que campos son narrativos dentro del flujo de onboarding.
- **FR-005**: El sistema MUST validar en frontera que campos estructurados solo acepten valores permitidos por catalogo.
- **FR-006**: El sistema MUST rechazar entradas no confiables o fuera de catalogo para campos estructurados con mensajes seguros para usuario final.
- **FR-007**: El sistema MUST preservar compatibilidad de reingreso para drafts previos del wizard, incluyendo casos parciales heredados.
- **FR-008**: El sistema MUST mantener continuidad funcional con recommendation, explainability y translation sobre la base de datos estructurados consistentes.
- **FR-009**: El sistema MUST permitir una estrategia incremental que reutilice el wizard actual y catalogos existentes sin refactorizacion grande.
- **FR-010**: El sistema MUST mantener trazabilidad minima entre datos capturados en onboarding y su consumo posterior en recommendation/explainability/translation.
- **FR-011**: El sistema MUST mantener la experiencia de usuario comprensible en estados loading, empty y error durante captura y reingreso del onboarding.
- **FR-012**: El sistema MUST definir no-alcance explicito de esta iniciativa: no crear un nuevo wizard paralelo, no introducir matching avanzado y no abrir rediseño transversal del pipeline actual.

### Non-Functional Requirements

- **NFR-001**: La captura guiada MUST reducir variabilidad semantica en campos estructurados respecto al baseline de texto libre.
- **NFR-002**: La iniciativa MUST mantenerse incremental y reversible, priorizando extension de artefactos existentes.
- **NFR-003**: La experiencia MUST conservar fluidez percibida en el onboarding y no aumentar friccion de completitud de forma material.
- **NFR-004**: Los mensajes visibles MUST ser seguros y comprensibles, sin exponer detalles internos.
- **NFR-005**: La definicion funcional MUST ser auditable por negocio y producto para evolucion de catalogos sin ambiguedad.

### Key Entities (include if feature involves data)

- **CatalogFieldDefinition**: Define un campo estructurado del onboarding, su lista de opciones validas y reglas de seleccion permitidas.
- **NarrativeFieldDefinition**: Define un campo abierto destinado a matices narrativos o contexto complementario del usuario.
- **GuidedOnboardingDraft**: Representa el estado persistido del onboarding con separacion explicita entre respuestas estructuradas y narrativas.
- **CatalogSelectionSnapshot**: Representa la seleccion de catalogos vigente al momento de guardar, para continuidad y trazabilidad en reingreso.
- **DownstreamConsistencyContext**: Representa el subconjunto estructurado de datos del onboarding reutilizado por recommendation, explainability y translation.

### Dependencies & Assumptions

- Se asume que `src/features/wizard/config/wizard-catalogs.ts` es la fuente de catalogos base para esta iniciativa.
- Se asume que la integracion de recommendation/explainability/translation existente se reutiliza y solo requiere alineacion de entradas.
- Se asume un flujo activo por usuario con persistencia en estado de wizard ya existente.
- Se asume que cuando no exista opcion exacta en un catalogo, el negocio permitira captura complementaria en campos narrativos definidos.
- Se asume alcance acotado: mejora de captura y consistencia, sin refactorizacion grande de arquitectura.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Al menos 90% de campos estructurados del onboarding dentro del alcance quedan capturados mediante controles acotados en lugar de texto libre.
- **SC-002**: En validaciones funcionales, 100% de entradas fuera de catalogo para campos estructurados son rechazadas con respuesta segura y accionable.
- **SC-003**: Al menos una historia prioritaria (US1) puede liberarse de forma independiente reutilizando wizard actual y catalogos existentes.
- **SC-004**: En pruebas de continuidad, al menos 95% de sesiones de reingreso con drafts previos mantienen progreso util sin perdida material.
- **SC-005**: En pruebas de consistencia aguas abajo, recommendation/explainability/translation muestran reduccion medible de ambiguedad atribuida a campos estructurados libres frente al baseline.
- **SC-006**: La iniciativa se ejecuta sin requerir refactorizacion grande fuera de los modulos de onboarding y sus puntos de integracion directa.
