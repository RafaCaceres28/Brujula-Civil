# Feature Specification: Recomendacion Guiada de Rutas Laborales Civiles

**Feature Branch**: `003-recommend-career-routes`
**Created**: 2026-03-24
**Status**: Draft
**Input**: User description: "Permitir que el sistema analice la informacion militar estructurada del wizard para proponer una shortlist de salidas laborales civiles plausibles, que el usuario pueda elegir y reutilizar dentro del flujo existente hasta exportacion PDF."

## Constitution Alignment (mandatory)

- **Verify-First Evidence**: Revision de `AGENTS.md`, `.specify/memory/constitution.md`, `specs/001-unify-domain-contracts/{spec.md,plan.md,tasks.md,quickstart.md}`, `specs/002-employability-e2e-flow/{spec.md,plan.md,tasks.md,quickstart.md}` y verificacion del contexto funcional existente en `src/features/wizard/config/wizard-catalogs.ts` y `src/features/wizard/schemas/wizard.schema.ts`.
- **Contract Impact**: Se requiere extender contratos de dominio para representar recomendacion generada, recomendacion elegida y su trazabilidad con borrador activo, manteniendo compatibilidad con contratos compartidos y validaciones de frontera ya vigentes.
- **Security Impact**: La iniciativa debe conservar aislamiento por usuario, mensajes de error seguros y no exponer detalles internos en estados de falla de recomendacion, traduccion o exportacion.
- **Quality Gate Plan**: En implementacion se validara el alcance impactado con `pnpm lint`, `pnpm typecheck` y `pnpm test:run`, cubriendo historia principal, reingreso, trazabilidad y estados loading/empty/error.

## User Scenarios & Testing (mandatory)

User stories MUST be prioritized and independently testable.

### User Story 1 - Recibir rutas recomendadas comprensibles (Priority: P1)

Como persona que termina o esta por terminar su compromiso con las FFAA, quiero recibir una shortlist guiada de rutas laborales civiles plausibles basada en mis datos estructurados para identificar con claridad un siguiente paso realista.

**Why this priority**: Es el nucleo de valor de la iniciativa y evita que el usuario tenga que redactar o definir objetivos civiles desde cero.
**Independent Test**: Con un perfil militar estructurado completo, validar que el sistema entrega entre 3 y 5 rutas recomendadas claras y explicables, priorizadas para toma de decision.

**Acceptance Scenarios**:

1. **Given** un usuario con datos estructurados suficientes del wizard, **When** solicita recomendaciones de salida civil, **Then** recibe una shortlist de 3 a 5 rutas plausibles y comprensibles.
2. **Given** una ruta recomendada mostrada al usuario, **When** revisa el motivo de recomendacion, **Then** entiende que atributos de su perfil sustentan esa sugerencia.

---

### User Story 2 - Elegir una ruta y reutilizarla en el flujo actual (Priority: P2)

Como usuario, quiero seleccionar una ruta sugerida y que esa eleccion se reutilice en el flujo de traduccion, preview, edicion y exportacion para mantener coherencia en mi posicionamiento laboral civil.

**Why this priority**: Convierte la recomendacion en accion concreta dentro del pipeline ya usable, sin introducir un flujo paralelo desconectado.
**Independent Test**: Seleccionar una ruta sugerida y validar que la traduccion, el preview editable y la exportacion mantienen consistencia con la ruta elegida.

**Acceptance Scenarios**:

1. **Given** que el usuario eligio una ruta recomendada, **When** avanza al flujo de traduccion y preview CV, **Then** el contenido generado se alinea con esa ruta como orientacion base.
2. **Given** un usuario que edita manualmente el contenido antes de exportar, **When** confirma su preview y exporta PDF, **Then** el resultado conserva trazabilidad con la ruta elegida y mantiene editabilidad previa.

---

### User Story 3 - Reingresar sin perder contexto de recomendacion (Priority: P3)

Como usuario que interrumpe el proceso, quiero reingresar y recuperar la recomendacion elegida junto con mi borrador activo para continuar sin rehacer decisiones previas.

**Why this priority**: Reduce abandono del flujo y protege el trabajo acumulado en un proceso que puede completarse en mas de una sesion.
**Independent Test**: Interrumpir una sesion luego de seleccionar ruta y editar borrador; al reingresar, validar recuperacion de eleccion, estado del flujo y borrador activo.

**Acceptance Scenarios**:

1. **Given** un usuario con recomendacion elegida y borrador activo, **When** vuelve a ingresar al flujo, **Then** recupera su contexto sin perdida material de informacion.
2. **Given** una falla temporal al cargar recomendaciones o estado previo, **When** el sistema presenta el error, **Then** muestra mensaje comprensible y accion segura de recuperacion sin exponer detalles internos.

## Edge Cases

- El usuario tiene datos militares incompletos o poco consistentes y no alcanza calidad minima para sugerir rutas confiables.
- El perfil contiene señales validas para mas de una salida civil cercana y se requiere desempate explicable sin arbitrariedad opaca.
- El usuario intenta avanzar sin elegir una ruta recomendada cuando el flujo exige una decision para continuar.
- El usuario cambia su ruta elegida tras haber generado traduccion o preview y se debe preservar coherencia sin borrar trabajo editable no confirmado.
- El usuario reingresa con datos parcialmente persistidos (por ejemplo, recomendacion guardada pero borrador desactualizado).
- Se produce error en recomendacion o recuperacion de estado y el sistema debe ofrecer fallback seguro sin perder trazabilidad historica minima.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: El sistema MUST usar como entrada principal la informacion estructurada ya capturada en el wizard del usuario para construir recomendaciones.
- **FR-002**: El sistema MUST generar una shortlist de 3 a 5 rutas laborales civiles plausibles y comprensibles, evitando experiencias de buscador abierto.
- **FR-003**: El sistema MUST priorizar recomendaciones usando reglas explicables y mantenibles basadas en catalogos y atributos estructurados del perfil.
- **FR-004**: El sistema MUST usar como base de recomendacion las opciones de rol y sector objetivo definidas por negocio, complementadas por seniority, modalidad y ubicacion.
- **FR-005**: El sistema MUST considerar en la recomendacion los atributos militares estructurados relevantes del usuario, incluyendo trayectoria, liderazgo, responsabilidades, habilidades y certificaciones.
- **FR-006**: El sistema MUST permitir al usuario seleccionar una ruta sugerida como decision explicita de avance.
- **FR-007**: El sistema MUST reutilizar la ruta elegida dentro del flujo existente de traduccion, preview CV, edicion y exportacion PDF.
- **FR-008**: El sistema MUST mantener la editabilidad del contenido generado antes de exportar, aun cuando exista una ruta recomendada seleccionada.
- **FR-009**: El sistema MUST preservar trazabilidad minima entre perfil estructurado, recomendacion generada, recomendacion elegida, traduccion, preview confirmado y PDF exportado.
- **FR-010**: El sistema MUST soportar reingreso con recuperacion de recomendacion elegida y borrador activo del usuario.
- **FR-011**: El sistema MUST mostrar estados loading, empty y error con mensajes claros, accionables y seguros para usuario final.
- **FR-012**: El sistema MUST validar entradas no confiables en fronteras del flujo antes de procesar o persistir informacion.
- **FR-013**: El sistema MUST evitar en esta iniciativa alcance de plataforma laboral completa, matching estadistico avanzado e integraciones externas.
- **FR-014**: El sistema MUST preservar compatibilidad con el pipeline actual de profile, translation, cv y documents sin abrir reescritura interna amplia.

### Non-Functional Requirements

- **NFR-001**: La experiencia de recomendacion y seleccion de ruta MUST mantener tiempos de respuesta percibidos como fluidos para no degradar el flujo principal de empleabilidad.
- **NFR-002**: La logica de recomendacion MUST ser auditable por producto y negocio, permitiendo explicar por que una ruta fue sugerida.
- **NFR-003**: La solucion MUST ser mantenible mediante reglas de negocio acotadas y evolucion incremental, evitando complejidad algoritimica innecesaria.
- **NFR-004**: La iniciativa MUST mantener seguridad de datos por usuario y mensajes de error sin fuga de detalles internos.
- **NFR-005**: La implementacion MUST conservar compatibilidad con la arquitectura feature-first y contratos base ya cerrados, minimizando riesgo de regresion.

### Key Entities (include if feature involves data)

- **PerfilMilitarEstructurado**: Representa la informacion ya capturada en wizard sobre trayectoria militar, responsabilidades, habilidades y contexto de transicion del usuario.
- **RutaLaboralSugerida**: Representa una opcion laboral civil propuesta por el sistema con rol objetivo, sector objetivo y razon explicable de recomendacion.
- **ShortlistRecomendaciones**: Representa el conjunto limitado de rutas sugeridas (3 a 5) para que el usuario compare y decida.
- **RutaLaboralElegida**: Representa la recomendacion seleccionada por el usuario como orientacion activa para el flujo de traduccion a CV.
- **TrazaEmpleabilidad**: Representa la vinculacion minima entre origen estructurado, recomendaciones, eleccion, traduccion, preview confirmado y exportacion final.

### Dependencies & Assumptions

- Se asume que los catalogos de wizard existentes son la fuente oficial de opciones de rol y sector para la primera version.
- Se asume que el flujo actual de traduccion, preview editable y exportacion ya esta disponible y debe ser reutilizado.
- Se asume un unico flujo activo por usuario para esta iniciativa, con recuperacion de estado al reingresar.
- Se asume que la primera version prioriza recomendaciones basadas en rol y sector, sin ampliar alcance a expansion completa de LinkedIn.
- Se asume que la iniciativa debe entregar valor incremental sin abrir una refactorizacion grande de contratos base.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: Al menos 90% de usuarios con datos estructurados suficientes reciben una shortlist valida de 3 a 5 rutas civiles en su primer intento.
- **SC-002**: Al menos 80% de usuarios que reciben recomendaciones seleccionan una ruta sugerida y continúan al flujo de traduccion sin abandono inmediato.
- **SC-003**: En validaciones funcionales, 100% de los casos aprobados mantienen trazabilidad minima completa entre perfil estructurado, recomendacion, eleccion, preview confirmado y PDF exportado.
- **SC-004**: En pruebas de reingreso, al menos 95% de sesiones recuperan correctamente la ruta elegida y el borrador activo sin perdida material.
- **SC-005**: En pruebas de usabilidad controlada, al menos 85% de usuarios reportan comprender por que recibieron sus rutas sugeridas.
- **SC-006**: La iniciativa habilita liberacion incremental con al menos una historia prioritaria desplegable de forma independiente sin requerir reescritura amplia.
